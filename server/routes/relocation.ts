import { Router, type NextFunction, type Request, type Response } from "express";
import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "../supabase.js";
import { HttpError, fromPostgrest } from "../http.js";
import { OPS_SCHEMA } from "../resource.js";
import {
  BoxType,
  ItemStatus,
  MovingType,
  MovingUnitStatus,
  PackingUnitStatus,
  RoomStatus,
  UserRole,
  type AuthenticatedUser,
  type CatalogueItem,
  type IdfGroup,
  type Location,
  type MovingUnit,
  type PackingUnit,
  type Room,
} from "../../types/index.js";
import { buildGroupReport } from "../../src/domain/report.js";
import {
  getPermittedGroups,
  getPermittedRooms,
  getRoomUnitId,
  unitIdForGroup,
} from "../../src/domain/scope.js";
import { canAccessManagementReport } from "../../src/domain/users.js";
import {
  IDENTITY_NUMBER_MESSAGE,
  IDENTITY_NUMBER_REGEX,
  VEHICLE_NUMBER_MESSAGE,
  validateCatalogueQuantities,
  validateVehicleDetails,
  validateVehicleNumber,
} from "../../src/domain/validation.js";

// The relocation flows used by the app: login, scoped state, packing,
// transport, receiving, distribution and the management report.
//
// Identification is by identity_num in the x-user-id header (no password),
// matching the login screen. Every request re-reads the user's role and group
// memberships, so permission changes apply immediately.

export const relocationRouter = Router();

const ops = () => getSupabaseAdmin().schema(OPS_SCHEMA);

type Access = {
  user: AuthenticatedUser;
  memberGroupIds: Set<number>;
};

type AuthedRequest = Request & { access?: Access };

function check<T>(result: { data: T | null; error: PostgrestError | null }): T {
  if (result.error) throw fromPostgrest(result.error);
  return result.data as T;
}

// For maybeSingle(): no row is a valid answer.
function checkMaybe<T>(result: { data: T | null; error: PostgrestError | null }): T | null {
  if (result.error) throw fromPostgrest(result.error);
  return result.data;
}

// State-transition failures raised by the flow functions (errcode P0001)
// mean someone else changed the rows first.
function checkRpc<T>(
  result: { data: T | null; error: PostgrestError | null },
  conflictMessage: string,
): T {
  if (result.error?.code === "P0001") throw new HttpError(409, conflictMessage);
  return check(result);
}

function readId(value: unknown, message: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new HttpError(400, message);
  }
  return value;
}

function readIdList(value: unknown, message: string): number[] {
  if (!Array.isArray(value) || value.length === 0) throw new HttpError(400, message);
  return Array.from(new Set(value.map((id) => readId(id, message))));
}

function readEnum<T extends string>(values: Record<string, T>, value: unknown, message: string): T {
  if (!Object.values(values).includes(value as T)) throw new HttpError(400, message);
  return value as T;
}

// ---- loading ----

async function loadUser(identityNum: string): Promise<AuthenticatedUser | null> {
  const [user, role, codes] = await Promise.all([
    getSupabaseAdmin()
      .from("users")
      .select("identity_num, full_name")
      .eq("identity_num", identityNum)
      .maybeSingle(),
    ops().from("user_roles").select("role").eq("identity_num", identityNum).maybeSingle(),
    ops()
      .from("group_codes")
      .select("code")
      .eq("identity_num", identityNum)
      .eq("is_available", true),
  ]);
  const userRow = checkMaybe(user);
  if (!userRow) return null;

  return {
    user_id: userRow.identity_num,
    name: userRow.full_name ?? userRow.identity_num,
    role: (checkMaybe(role)?.role as UserRole | undefined) ?? UserRole.WORKER,
    managed_unit_ids: check(codes).map((row) => row.code.padStart(4, "0")),
  };
}

async function loadMemberGroupIds(identityNum: string) {
  const rows = check(
    await ops()
      .from("user_group")
      .select("group_id")
      .eq("identity_num", identityNum)
      .eq("is_available", true),
  );
  return new Set(rows.map((row) => row.group_id));
}

async function loadGroups(): Promise<IdfGroup[]> {
  const rows = check(
    await ops().from("groups").select("id, contact_name").eq("is_available", true).order("id"),
  );
  return rows.map((row) => ({
    id: row.id,
    unit_id: unitIdForGroup(row.id),
    contact_name: row.contact_name,
  }));
}

async function loadRooms(groupIds: number[]): Promise<Room[]> {
  if (groupIds.length === 0) return [];
  const rows = check(
    await ops()
      .from("rooms")
      .select("id, group_id, location_id, description, move_status")
      .in("group_id", groupIds)
      .eq("is_available", true)
      .order("id"),
  );
  return rows.map((row) => ({
    room_id: row.id,
    group_id: row.group_id,
    location_id: row.location_id,
    description: row.description,
    room_status: row.move_status as RoomStatus,
  }));
}

async function loadLocations(): Promise<Location[]> {
  const rows = check(
    await ops()
      .from("locations")
      .select("id, description")
      .not("is_available", "is", false)
      .order("id"),
  );
  return rows.map((row) => ({ location_id: row.id, description: row.description }));
}

async function loadCatalogue(): Promise<CatalogueItem[]> {
  const rows = check(
    await ops()
      .from("sub_categories")
      .select("id, description, categories(description, is_special, is_available)")
      .not("is_available", "is", false)
      .order("category_id")
      .order("id"),
  );
  return rows
    .filter((row) => row.categories && row.categories.is_available !== false)
    .map((row) => ({
      catalog_id: row.id,
      description: row.description,
      category: row.categories!.description,
      is_balmas: row.categories!.is_special ?? false,
    }));
}

const UNIT_SELECT =
  "id, box_type, status, source_room_id, destination_room_id, transport_id, " +
  "packing_items(id, sub_category_id, quantity, status, sub_categories(description))";

type UnitRow = {
  id: number;
  box_type: string;
  status: string;
  source_room_id: number;
  destination_room_id: number;
  transport_id: number | null;
  packing_items: Array<{
    id: number;
    sub_category_id: number;
    quantity: number;
    status: string;
    sub_categories: { description: string } | null;
  }>;
};

function toPackingUnit(row: UnitRow): PackingUnit {
  return {
    packing_id: row.id,
    box_type: row.box_type as BoxType,
    packing_status: row.status as PackingUnitStatus,
    source_room_id: row.source_room_id,
    destination_room_id: row.destination_room_id,
    transport_id: row.transport_id,
    items: row.packing_items
      .map((item) => ({
        item_id: item.id,
        catalog_id: item.sub_category_id,
        description: item.sub_categories?.description ?? String(item.sub_category_id),
        item_status: item.status as ItemStatus,
        quantity: item.quantity,
      }))
      .sort((a, b) => a.item_id - b.item_id),
  };
}

// Units packed from or into any of the given rooms.
async function loadUnitsForRooms(roomIds: number[]): Promise<PackingUnit[]> {
  if (roomIds.length === 0) return [];
  const ids = roomIds.join(",");
  const rows = check(
    await ops()
      .from("packing_units")
      .select(UNIT_SELECT)
      .or(`source_room_id.in.(${ids}),destination_room_id.in.(${ids})`)
      .order("id")
      .overrideTypes<UnitRow[], { merge: false }>(),
  );
  return rows.map(toPackingUnit);
}

async function loadUnits(packingIds: number[]): Promise<PackingUnit[]> {
  const rows = check(
    await ops()
      .from("packing_units")
      .select(UNIT_SELECT)
      .in("id", packingIds)
      .overrideTypes<UnitRow[], { merge: false }>(),
  );
  return rows.map(toPackingUnit);
}

async function loadTransports(transportIds: number[]): Promise<MovingUnit[]> {
  if (transportIds.length === 0) return [];
  const rows = check(
    await ops()
      .from("transports")
      .select("id, moving_type, status, moving_date, vehicle_number, vehicle_details")
      .in("id", transportIds)
      .order("moving_date", { ascending: false }),
  );
  return rows.map((row) => ({
    moving_id: row.id,
    moving_type: row.moving_type as MovingType,
    moving_status: row.status as MovingUnitStatus,
    moving_date: new Date(row.moving_date),
    vehicle_number: row.vehicle_number,
    vehicle_details: row.vehicle_details,
  }));
}

// Groups and rooms the user may see, optionally narrowed to one unit.
async function loadScope(access: Access, unitId?: string) {
  const groups = getPermittedGroups(await loadGroups(), access.user, access.memberGroupIds)
    .filter((group) => !unitId || group.unit_id === unitId);
  const rooms = await loadRooms(groups.map((group) => group.id));
  return { groups, rooms };
}

// ---- auth ----

async function authenticate(request: AuthedRequest, _response: Response, next: NextFunction) {
  const identityNum = request.header("x-user-id") ?? "";
  const user = IDENTITY_NUMBER_REGEX.test(identityNum) ? await loadUser(identityNum) : null;
  if (!user) throw new HttpError(401, "יש להתחבר מחדש.");

  request.access = { user, memberGroupIds: await loadMemberGroupIds(identityNum) };
  next();
}

function getAccess(request: AuthedRequest) {
  if (!request.access) throw new Error("authenticate middleware missing");
  return request.access;
}

// ---- routes ----

// POST /api/login  { identity_num }
relocationRouter.post("/login", async (request, response) => {
  const { identity_num } = (request.body ?? {}) as { identity_num?: unknown };
  if (typeof identity_num !== "string" || !IDENTITY_NUMBER_REGEX.test(identity_num)) {
    throw new HttpError(400, IDENTITY_NUMBER_MESSAGE);
  }

  const user = await loadUser(identity_num);
  if (!user) throw new HttpError(401, "מספר הזהות לא נמצא במערכת.");
  response.json({ user });
});

relocationRouter.get("/me", authenticate, (request: AuthedRequest, response) => {
  response.json({ user: getAccess(request).user });
});

// GET /api/state -> everything the flow screens need, scoped to the user.
relocationRouter.get("/state", authenticate, async (request: AuthedRequest, response) => {
  const { groups, rooms } = await loadScope(getAccess(request));
  const [locations, itemCatalogue, units] = await Promise.all([
    loadLocations(),
    loadCatalogue(),
    loadUnitsForRooms(rooms.map((room) => room.room_id)),
  ]);
  const transportIds = new Set(
    units.map((unit) => unit.transport_id).filter((id): id is number => id !== null),
  );
  const transports = await loadTransports([...transportIds]);

  response.json({ groups, locations, rooms, units, transports, itemCatalogue });
});

// GET /api/management-report?unit_id=1234
relocationRouter.get(
  "/management-report",
  authenticate,
  async (request: AuthedRequest, response) => {
    const access = getAccess(request);
    if (!canAccessManagementReport(access.user)) {
      throw new HttpError(403, "אין הרשאה לדו״ח מנהלים.");
    }

    const unitId = typeof request.query.unit_id === "string" ? request.query.unit_id : "";
    const { groups, rooms } = await loadScope(access, unitId || undefined);
    if (unitId && groups.length === 0) {
      throw new HttpError(403, "אין הרשאה ליחידה המבוקשת.");
    }
    const units = await loadUnitsForRooms(rooms.map((room) => room.room_id));

    response.json({ rows: buildGroupReport({ groups, rooms, units }) });
  },
);

// POST /api/packing
//   { source_room_id, destination_room_id, box_type, items: [{ catalog_id, quantity }] }
relocationRouter.post("/packing", authenticate, async (request: AuthedRequest, response) => {
  const access = getAccess(request);
  const body = (request.body ?? {}) as Record<string, unknown>;
  const boxType = readEnum(BoxType, body.box_type, "יש לבחור סוג אריזה.");
  const sourceRoomId = readId(body.source_room_id, "יש לבחור חדר מקור.");
  const destinationRoomId = readId(body.destination_room_id, "יש לבחור חדר יעד.");
  const items = body.items;

  const { groups, rooms } = await loadScope(access);
  const selectable = getPermittedRooms(rooms, groups, { selectableOnly: true });
  const source = selectable.find((room) => room.room_id === sourceRoomId);
  const destination = selectable.find((room) => room.room_id === destinationRoomId);

  if (!source) throw new HttpError(400, "חדר המקור אינו זמין לבחירה.");
  if (!destination) throw new HttpError(400, "חדר היעד אינו זמין לבחירה.");
  if (getRoomUnitId(source) !== getRoomUnitId(destination)) {
    throw new HttpError(403, "חדרי המקור והיעד חייבים להיות באותה יחידה מורשית.");
  }

  const catalogue = await loadCatalogue();
  // Personal boxes carry no tracked items — skip item validation for that type.
  const requiresItems = boxType !== BoxType.PERSONAL_BOX;
  if (
    requiresItems &&
    (!Array.isArray(items) ||
      items.length === 0 ||
      !validateCatalogueQuantities(items, catalogue))
  ) {
    throw new HttpError(400, "יש לבחור פריטים תקינים עם כמות גדולה מאפס.");
  }

  const packingId = check(
    await ops().rpc("create_packing", {
      p_created_by: access.user.user_id,
      p_box_type: boxType,
      p_source_room_id: source.room_id,
      p_destination_room_id: destination.room_id,
      p_items: (items as Array<{ catalog_id: number; quantity: number }>).map((item) => ({
        sub_category_id: item.catalog_id,
        quantity: item.quantity,
      })),
    }),
  );

  const [unit] = await loadUnits([packingId]);
  response.status(201).json({ unit });
});

// POST /api/transports
//   { moving_type, vehicle_number? | vehicle_details?, packing_ids: number[] }
relocationRouter.post("/transports", authenticate, async (request: AuthedRequest, response) => {
  const access = getAccess(request);
  const body = (request.body ?? {}) as Record<string, unknown>;
  const movingType = readEnum(MovingType, body.moving_type, "יש לבחור סוג רכב.");
  const isCar = movingType === MovingType.CAR;
  const vehicleNumber = typeof body.vehicle_number === "string" ? body.vehicle_number : "";
  const vehicleDetails =
    typeof body.vehicle_details === "string" ? body.vehicle_details.trim() : "";

  if (!isCar && !validateVehicleNumber(vehicleNumber)) {
    throw new HttpError(400, VEHICLE_NUMBER_MESSAGE);
  }
  if (isCar && !validateVehicleDetails(vehicleDetails)) {
    throw new HttpError(400, "יש להזין פירוט.");
  }

  const packingIds = readIdList(body.packing_ids, "יש לבחור לפחות אריזה אחת.");
  const [{ groups, rooms }, units] = await Promise.all([
    loadScope(access),
    loadUnits(packingIds),
  ]);
  const permittedRoomIds = new Set(
    getPermittedRooms(rooms, groups).map((room) => room.room_id),
  );

  if (
    units.length !== packingIds.length ||
    units.some(
      (unit) =>
        unit.packing_status !== PackingUnitStatus.PACKING_CLOSED ||
        !permittedRoomIds.has(unit.source_room_id),
    )
  ) {
    throw new HttpError(403, "אין הרשאה או זמינות לאחת האריזות.");
  }

  const movingId = checkRpc(
    await ops().rpc("create_transport", {
      p_created_by: access.user.user_id,
      p_moving_type: movingType,
      p_vehicle_number: isCar ? null : vehicleNumber,
      p_vehicle_details: isCar ? vehicleDetails : null,
      p_packing_ids: packingIds,
    }),
    "אחת האריזות כבר שובצה להובלה אחרת.",
  );

  const [transport] = await loadTransports([movingId]);
  response.status(201).json({ transport });
});

// POST /api/receiving  { moving_id, packing_ids: number[] }
relocationRouter.post("/receiving", authenticate, async (request: AuthedRequest, response) => {
  const access = getAccess(request);
  const body = (request.body ?? {}) as Record<string, unknown>;
  const movingId = readId(body.moving_id, "יש לבחור הובלה.");
  const packingIds = readIdList(body.packing_ids, "יש לבחור לפחות אריזה אחת.");

  const [{ groups, rooms }, units, [transport]] = await Promise.all([
    loadScope(access),
    loadUnits(packingIds),
    loadTransports([movingId]),
  ]);

  if (!transport || transport.moving_status !== MovingUnitStatus.ON_WAY) {
    throw new HttpError(400, "ההובלה אינה זמינה לקבלה.");
  }

  const permittedRoomIds = new Set(
    getPermittedRooms(rooms, groups).map((room) => room.room_id),
  );
  if (
    units.length !== packingIds.length ||
    units.some(
      (unit) =>
        unit.transport_id !== movingId ||
        unit.packing_status !== PackingUnitStatus.PACKING_ON_WAY ||
        !permittedRoomIds.has(unit.source_room_id),
    )
  ) {
    throw new HttpError(403, "אין הרשאה לקבל אחת מהאריזות.");
  }

  checkRpc(
    await ops().rpc("receive_transport", {
      p_transport_id: movingId,
      p_packing_ids: packingIds,
    }),
    "ההובלה עודכנה בינתיים. יש לרענן ולנסות שוב.",
  );
  response.json({ ok: true });
});

// POST /api/distribution  { packing_id, item_ids: number[] }
relocationRouter.post("/distribution", authenticate, async (request: AuthedRequest, response) => {
  const access = getAccess(request);
  const body = (request.body ?? {}) as Record<string, unknown>;
  const packingId = readId(body.packing_id, "יש לבחור אריזה.");
  const itemIds = readIdList(body.item_ids, "יש לבחור פריטים תקינים לפיזור.");

  const [{ groups, rooms }, [unit]] = await Promise.all([
    loadScope(access),
    loadUnits([packingId]),
  ]);

  if (!unit || unit.packing_status !== PackingUnitStatus.PACKING_RECEIVED) {
    throw new HttpError(400, "האריזה אינה זמינה לפיזור.");
  }
  if (!getPermittedRooms(rooms, groups).some((room) => room.room_id === unit.destination_room_id)) {
    throw new HttpError(403, "אין הרשאה לפזר אריזה זו.");
  }

  const receivedItemIds = new Set(
    unit.items
      .filter((item) => item.item_status === ItemStatus.RECEIVED)
      .map((item) => item.item_id),
  );
  if (itemIds.some((itemId) => !receivedItemIds.has(itemId))) {
    throw new HttpError(400, "יש לבחור פריטים תקינים לפיזור.");
  }

  checkRpc(
    await ops().rpc("distribute_items", { p_packing_id: packingId, p_item_ids: itemIds }),
    "האריזה עודכנה בינתיים. יש לרענן ולנסות שוב.",
  );
  response.json({ ok: true });
});
