import express, { type Request, type Response } from "express";
import {
  BoxType,
  ItemStatus,
  MovingType,
  MovingUnitStatus,
  PackingUnitStatus,
  RoomStatus,
  UserRole,
  type AuthenticatedUser,
  type Item,
  type MovingUnit,
  type PackingUnit,
} from "../types";
import { buildBranchReport } from "../src/domain/report";
import { buildSeedState, type RelocationData } from "../src/domain/seed";
import {
  getPermittedGroups,
  getPermittedRooms,
  getRoomUnitId,
  canAccessUnit,
  isRoomPermitted,
} from "../src/domain/scope";
import {
  canAccessManagementReport,
  getUserById,
  getUserByPersonalNumber,
  USERS,
} from "../src/domain/users";
import {
  validateCatalogueQuantities,
  validateVehicleDetails,
  validateVehicleNumber,
  VEHICLE_NUMBER_MESSAGE,
} from "../src/domain/validation";

type ApiRequest = Request & {
  user?: AuthenticatedUser;
};

const app = express();
const port = Number(process.env.PORT ?? 3001);
let data: RelocationData = buildSeedState();

app.use(express.json());
app.use((request: ApiRequest, _response, next) => {
  request.user = getUserById(request.header("x-user-id"));
  next();
});

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

const forbidden = (response: Response, message = "Forbidden") =>
  response.status(403).json({ error: message });

const badRequest = (response: Response, message: string) =>
  response.status(400).json({ error: message });

function requireUser(request: ApiRequest) {
  if (!request.user) {
    throw new Error("Missing authenticated user");
  }

  return request.user;
}

function normalizeDates(state: RelocationData): RelocationData {
  return {
    ...state,
    transports: state.transports.map((transport) => ({
      ...transport,
      moving_date: new Date(transport.moving_date),
    })),
  };
}

function getScopedState(user: AuthenticatedUser, unitId?: string) {
  const groups =
    user.role === UserRole.GLOBAL_MANAGER && unitId
      ? data.groups.filter((group) => group.unit_id === unitId)
      : getPermittedGroups(data.groups, user);
  const groupIds = new Set(groups.map((group) => group.id));
  const roomIds = new Set(
    data.rooms
      .filter((room) => groupIds.has(room.group_id))
      .map((room) => room.room_id),
  );
  const units = data.units.filter(
    (unit) =>
      (unit.source_room_id && roomIds.has(unit.source_room_id)) ||
      (unit.destination_room_id && roomIds.has(unit.destination_room_id)),
  );
  const unitTransportIds = new Set(
    units.map((unit) => unit.transport_id).filter(Boolean),
  );
  const transports = data.transports.filter(
    (transport) =>
      unitTransportIds.has(transport.moving_id) ||
      transport.packing_unit_ids?.some((packingId) =>
        units.some((unit) => unit.packing_id === packingId),
      ),
  );

  return {
    groups,
    locations: data.locations,
    rooms: data.rooms.filter((room) => groupIds.has(room.group_id)),
    units,
    transports,
    itemCatalogue: data.itemCatalogue,
  };
}

function validateUnitAccess(user: AuthenticatedUser, unitId: string | undefined) {
  return canAccessUnit(data.groups, user, unitId);
}

function toPackedItems(
  items: Array<{ catalog_id: string; quantity: number }>,
): Item[] {
  return items.map((submittedItem) => {
    const catalogueItem = data.itemCatalogue.find(
      (item) => item.catalog_id === submittedItem.catalog_id,
    );

    return {
      ...catalogueItem!,
      item_status: ItemStatus.PACKED,
      quantity: submittedItem.quantity,
    };
  });
}

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "ShuaShinua API",
  });
});

app.get("/api/me", (request: ApiRequest, response) => {
  response.json({ user: requireUser(request), users: USERS });
});

app.post("/api/login", (request, response) => {
  const { personal_number } = request.body as { personal_number?: string };

  if (!personal_number || !/^\d{7}$/.test(personal_number)) {
    return badRequest(response, "מספר אישי חייב להכיל 7 ספרות.");
  }

  const user = getUserByPersonalNumber(personal_number);

  if (!user) {
    return response.status(401).json({ error: "מספר אישי לא נמצא במערכת." });
  }

  response.json({ user });
});

app.get("/api/state", (request: ApiRequest, response) => {
  const user = requireUser(request);
  const unitId = String(request.query.unit_id ?? "");

  if (unitId && !validateUnitAccess(user, unitId)) {
    return forbidden(response, "אין הרשאה ליחידה המבוקשת.");
  }

  response.json(normalizeDates(getScopedState(user, unitId || undefined)));
});

app.get("/api/management-report", (request: ApiRequest, response) => {
  const user = requireUser(request);
  const requestedUnitId = String(request.query.unit_id ?? "");

  if (!canAccessManagementReport(user)) {
    return forbidden(response, "אין הרשאה לדו״ח מנהלים.");
  }

  if (requestedUnitId && !validateUnitAccess(user, requestedUnitId)) {
    return forbidden(response, "אין הרשאה ליחידה המבוקשת.");
  }

  const scopedState = getScopedState(
    user,
    requestedUnitId || (user.role === UserRole.UNIT_MANAGER ? user.scope.unit_id : undefined),
  );

  response.json({
    rows: buildBranchReport(scopedState),
    units: Array.from(
      new Map(scopedState.groups.map((group) => [group.unit_id, group.unit])).entries(),
    ).map(([unit_id, unit]) => ({ unit_id, unit })),
  });
});

app.post("/api/packing", (request: ApiRequest, response) => {
  const user = requireUser(request);
  const {
    unit_id,
    source_room_id,
    destination_room_id,
    box_type,
    items,
  } = request.body as {
    unit_id?: string;
    source_room_id?: string;
    destination_room_id?: string;
    box_type?: BoxType;
    items?: Array<{ catalog_id: string; quantity: number }>;
  };

  if (!validateUnitAccess(user, unit_id)) {
    return forbidden(response, "אין הרשאה ליצור אריזה ביחידה זו.");
  }

  if (!Object.values(BoxType).includes(box_type as BoxType)) {
    return badRequest(response, "יש לבחור סוג אריזה.");
  }
  const selectedBoxType = box_type as BoxType;

  if (
    !source_room_id ||
    !isRoomPermitted(data.rooms, data.groups, user, source_room_id, {
      selectableOnly: true,
    })
  ) {
    return badRequest(response, "חדר המקור אינו זמין לבחירה.");
  }

  if (
    !destination_room_id ||
    !isRoomPermitted(data.rooms, data.groups, user, destination_room_id, {
      selectableOnly: true,
    })
  ) {
    return badRequest(response, "חדר היעד אינו זמין לבחירה.");
  }

  if (
    getRoomUnitId(data.rooms, data.groups, source_room_id) !== unit_id ||
    getRoomUnitId(data.rooms, data.groups, destination_room_id) !== unit_id
  ) {
    return forbidden(response, "חדרי המקור והיעד חייבים להיות באותה יחידה מורשית.");
  }

  if (!items?.length || !validateCatalogueQuantities(items, data.itemCatalogue)) {
    return badRequest(response, "יש לבחור פריטים תקינים עם כמות גדולה מאפס.");
  }

  const packingUnit: PackingUnit = {
    packing_id: createId("pack"),
    box_type: selectedBoxType,
    packing_status: PackingUnitStatus.PACKING_CLOSED,
    source_room_id,
    destination_room_id,
    items: toPackedItems(items),
  };

  data = {
    ...data,
    units: [...data.units, packingUnit],
    rooms: data.rooms.map((room) =>
      room.room_id === source_room_id
        ? { ...room, room_status: RoomStatus.PACKING_PROCESS }
        : room,
    ),
  };

  response.status(201).json({ unit: packingUnit });
});

app.post("/api/transports", (request: ApiRequest, response) => {
  const user = requireUser(request);
  const {
    moving_type,
    vehicle_number,
    vehicle_details,
    packing_ids,
  } = request.body as {
    moving_type?: MovingType;
    vehicle_number?: string;
    vehicle_details?: string;
    packing_ids?: string[];
  };

  if (!Object.values(MovingType).includes(moving_type as MovingType)) {
    return badRequest(response, "יש לבחור סוג רכב.");
  }
  const selectedMovingType = moving_type as MovingType;

  if (
    selectedMovingType !== MovingType.CAR &&
    (!vehicle_number || !validateVehicleNumber(vehicle_number))
  ) {
    return badRequest(response, VEHICLE_NUMBER_MESSAGE);
  }

  if (
    selectedMovingType === MovingType.CAR &&
    (!vehicle_details || !validateVehicleDetails(vehicle_details))
  ) {
    return badRequest(response, "יש להזין פירוט.");
  }

  const selectedUnits = data.units.filter((unit) =>
    packing_ids?.includes(unit.packing_id),
  );

  if (!selectedUnits.length) {
    return badRequest(response, "יש לבחור לפחות אריזה אחת.");
  }

  const hasForbiddenUnit = selectedUnits.some((unit) => {
    if (unit.packing_status !== PackingUnitStatus.PACKING_CLOSED) {
      return true;
    }

    return (
      !unit.source_room_id ||
      !isRoomPermitted(data.rooms, data.groups, user, unit.source_room_id)
    );
  });

  if (hasForbiddenUnit) {
    return forbidden(response, "אין הרשאה או זמינות לאחת האריזות.");
  }

  const movingId = createId("move");
  const packingUnitIds = selectedUnits.map((unit) => unit.packing_id);
  const transport: MovingUnit = {
    moving_id: movingId,
    moving_type: selectedMovingType,
    moving_status: MovingUnitStatus.ON_WAY,
    moving_date: new Date(),
    ...(selectedMovingType === MovingType.CAR
      ? { vehicle_details: vehicle_details!.trim() }
      : { vehicle_number: vehicle_number! }),
    packing_unit_ids: packingUnitIds,
  };

  data = {
    ...data,
    transports: [...data.transports, transport],
    units: data.units.map((unit) =>
      packingUnitIds.includes(unit.packing_id)
        ? {
            ...unit,
            transport_id: movingId,
            packing_status: PackingUnitStatus.PACKING_ON_WAY,
          }
        : unit,
    ),
  };

  response.status(201).json({ transport });
});

app.post("/api/receiving", (request: ApiRequest, response) => {
  const user = requireUser(request);
  const { moving_id, packing_ids } = request.body as {
    moving_id?: string;
    packing_ids?: string[];
  };
  const transport = data.transports.find(
    (candidate) => candidate.moving_id === moving_id,
  );

  if (!transport || transport.moving_status !== MovingUnitStatus.ON_WAY) {
    return badRequest(response, "ההובלה אינה זמינה לקבלה.");
  }

  const selectedUnits = data.units.filter((unit) =>
    packing_ids?.includes(unit.packing_id),
  );

  if (!selectedUnits.length) {
    return badRequest(response, "יש לבחור לפחות אריזה אחת.");
  }

  const hasForbiddenUnit = selectedUnits.some(
    (unit) =>
      unit.transport_id !== moving_id ||
      !unit.source_room_id ||
      !isRoomPermitted(data.rooms, data.groups, user, unit.source_room_id),
  );

  if (hasForbiddenUnit) {
    return forbidden(response, "אין הרשאה לקבל אחת מהאריזות.");
  }

  data = {
    ...data,
    units: data.units.map((unit) =>
      selectedUnits.some((selectedUnit) => selectedUnit.packing_id === unit.packing_id)
        ? {
            ...unit,
            packing_status: PackingUnitStatus.PACKING_RECEIVED,
            items: unit.items.map((item) => ({
              ...item,
              item_status: ItemStatus.RECEIVED,
            })),
          }
        : unit,
    ),
    transports: data.transports.map((candidate) =>
      candidate.moving_id === moving_id
        ? {
            ...candidate,
            moving_status: MovingUnitStatus.UNLOADED_AT_DESTINATION,
          }
        : candidate,
    ),
  };

  response.json({ ok: true });
});

app.post("/api/distribution", (request: ApiRequest, response) => {
  const user = requireUser(request);
  const { packing_id, item_ids } = request.body as {
    packing_id?: string;
    item_ids?: string[];
  };
  const unit = data.units.find((candidate) => candidate.packing_id === packing_id);

  if (!unit || unit.packing_status !== PackingUnitStatus.PACKING_RECEIVED) {
    return badRequest(response, "האריזה אינה זמינה לפיזור.");
  }

  if (
    !unit.destination_room_id ||
    !isRoomPermitted(data.rooms, data.groups, user, unit.destination_room_id)
  ) {
    return forbidden(response, "אין הרשאה לפזר אריזה זו.");
  }

  const requestedItemIds = item_ids ?? [];

  if (
    !requestedItemIds.length ||
    requestedItemIds.some(
      (itemId) => !unit.items.some((item) => item.catalog_id === itemId),
    )
  ) {
    return badRequest(response, "יש לבחור פריטים תקינים לפיזור.");
  }

  data = {
    ...data,
    units: data.units.map((candidate) =>
      candidate.packing_id === packing_id
        ? {
            ...candidate,
            items: candidate.items.map((item) =>
              requestedItemIds.includes(item.catalog_id)
                ? { ...item, item_status: ItemStatus.DISTRIBUTED }
                : item,
            ),
          }
        : candidate,
    ),
  };

  response.json({ ok: true });
});

app.post("/api/reset", (_request, response) => {
  data = buildSeedState();
  response.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Express API running at http://localhost:${port}`);
});
