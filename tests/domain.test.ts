import assert from "node:assert/strict";
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
  type MovingUnit,
  type PackingUnit,
  type Room,
} from "../types";
import {
  getDistributableUnits,
  getReceivableTransports,
  getTransportableUnits,
} from "../src/domain/flows";
import { buildGroupReport } from "../src/domain/report";
import {
  getPermittedGroups,
  getPermittedRooms,
  unitIdForGroup,
} from "../src/domain/scope";
import { canAccessManagementReport } from "../src/domain/users";
import {
  isSelectableRoom,
  searchItemCatalogue,
  validateCatalogueQuantities,
  validateVehicleNumber,
} from "../src/domain/validation";

// Fixtures shaped like the rows in the live database.
const groups: IdfGroup[] = [
  { id: 1234001, unit_id: "1234", contact_name: "סמל דוד כהן" },
  { id: 1234002, unit_id: "1234", contact_name: null },
  { id: 101001, unit_id: "0101", contact_name: "סרן יעל מזרחי" },
];

const rooms: Room[] = [
  { room_id: 1, group_id: 1234001, location_id: 1, description: "נשקייה", room_status: RoomStatus.PACKING_PROCESS },
  { room_id: 2, group_id: 1234001, location_id: 2, description: null, room_status: RoomStatus.WAITING_FOR_STATUS },
  { room_id: 3, group_id: 1234002, location_id: 4, description: "מחשוב", room_status: RoomStatus.CLOSED_ROOM },
  { room_id: 4, group_id: 1234002, location_id: null, description: "ללא מיקום", room_status: RoomStatus.WAITING_FOR_STATUS },
  { room_id: 5, group_id: 101001, location_id: 6, description: "מרפאה", room_status: RoomStatus.WAITING_GRITA },
];

const catalogue: CatalogueItem[] = [
  { catalog_id: 1, description: "אפוד קרמי", category: "נשק וציוד לחימה", is_balmas: false },
  { catalog_id: 4, description: "מכשיר קשר יד", category: "ציוד קשר", is_balmas: true },
  { catalog_id: 7, description: "מסך מחשב", category: "ציוד מחשוב", is_balmas: false },
];

const user = (role: UserRole, managed_unit_ids: string[] = []): AuthenticatedUser => ({
  user_id: "300000022",
  name: "בדיקה",
  role,
  managed_unit_ids,
});

// ---- units ----
assert.equal(unitIdForGroup(1234001), "1234");
assert.equal(unitIdForGroup(101001), "0101");

// ---- scope ----
const members = new Set([1234002]);
const ids = (list: IdfGroup[]) => list.map((group) => group.id);

assert.deepEqual(ids(getPermittedGroups(groups, user(UserRole.WORKER), members)), [1234002]);
assert.deepEqual(
  ids(getPermittedGroups(groups, user(UserRole.UNIT_MANAGER, ["1234"]), new Set())),
  [1234001, 1234002],
);
assert.deepEqual(
  ids(getPermittedGroups(groups, user(UserRole.UNIT_MANAGER, ["0101"]), members)),
  [1234002, 101001],
);
assert.deepEqual(ids(getPermittedGroups(groups, user(UserRole.GLOBAL_MANAGER), new Set())), ids(groups));
// A worker's group codes don't grant unit-wide access.
assert.deepEqual(ids(getPermittedGroups(groups, user(UserRole.WORKER, ["1234"]), new Set())), []);

assert.equal(canAccessManagementReport(user(UserRole.WORKER)), false);
assert.equal(canAccessManagementReport(user(UserRole.UNIT_MANAGER)), true);
assert.equal(canAccessManagementReport(user(UserRole.GLOBAL_MANAGER)), true);

// ---- room selection ----
assert.equal(isSelectableRoom(rooms[0]!), true);
assert.equal(isSelectableRoom(rooms[2]!), false, "closed rooms are blocked");
assert.equal(isSelectableRoom(rooms[3]!), false, "rooms need a location");
assert.equal(isSelectableRoom(rooms[4]!), false, "rooms waiting for grita are blocked");
assert.deepEqual(
  getPermittedRooms(rooms, [groups[0]!, groups[1]!], { selectableOnly: true }).map((room) => room.room_id),
  [1, 2],
);

// ---- validation ----
assert.equal(validateVehicleNumber("1234567"), true);
assert.equal(validateVehicleNumber("12345678"), true);
assert.equal(validateVehicleNumber("123456"), false);
assert.equal(validateVehicleNumber("123456789"), false);
assert.equal(validateVehicleNumber("12-345-67"), false);

assert.equal(searchItemCatalogue(catalogue, "מסך").length, 1);
assert.equal(searchItemCatalogue(catalogue, "ציוד קשר")[0]?.catalog_id, 4);
assert.equal(searchItemCatalogue(catalogue, "7")[0]?.catalog_id, 7);
assert.equal(searchItemCatalogue(catalogue, "").length, 3);

assert.equal(validateCatalogueQuantities([{ catalog_id: 1, quantity: 2 }], catalogue), true);
assert.equal(validateCatalogueQuantities([{ catalog_id: 1, quantity: 0 }], catalogue), false);
assert.equal(validateCatalogueQuantities([{ catalog_id: 1, quantity: 1.5 }], catalogue), false);
assert.equal(validateCatalogueQuantities([{ catalog_id: 99, quantity: 1 }], catalogue), false);
assert.equal(validateCatalogueQuantities([{ catalog_id: "1", quantity: 1 }], catalogue), false);
assert.equal(
  validateCatalogueQuantities(
    [
      { catalog_id: 1, quantity: 1 },
      { catalog_id: 1, quantity: 2 },
    ],
    catalogue,
  ),
  false,
  "duplicate catalogue items are rejected",
);

// ---- flows ----
const item = (item_id: number, item_status: ItemStatus) => ({
  item_id,
  catalog_id: 1,
  description: "אפוד קרמי",
  item_status,
  quantity: 1,
});
const unit = (
  packing_id: number,
  packing_status: PackingUnitStatus,
  source_room_id: number,
  destination_room_id: number,
  transport_id: number | null,
  items = [item(packing_id * 10, ItemStatus.PACKED)],
): PackingUnit => ({
  packing_id,
  box_type: BoxType.PROF_BOX,
  packing_status,
  source_room_id,
  destination_room_id,
  transport_id,
  items,
});
const transport = (moving_id: number, moving_status: MovingUnitStatus): MovingUnit => ({
  moving_id,
  moving_type: MovingType.TRACK,
  moving_status,
  moving_date: new Date("2026-09-22T09:30:00Z"),
  vehicle_number: "12345678",
  vehicle_details: null,
});

const units: PackingUnit[] = [
  unit(1, PackingUnitStatus.PACKING_CLOSED, 1, 2, null),
  unit(2, PackingUnitStatus.PACKING_CLOSED, 5, 1, null), // source out of scope
  unit(3, PackingUnitStatus.PACKING_ON_WAY, 2, 1, 10),
  unit(4, PackingUnitStatus.PACKING_RECEIVED, 2, 1, 11, [item(40, ItemStatus.RECEIVED)]),
  unit(5, PackingUnitStatus.PACKING_RECEIVED, 2, 1, 11, [item(50, ItemStatus.DISTRIBUTED)]),
];
const transports = [
  transport(10, MovingUnitStatus.ON_WAY),
  transport(11, MovingUnitStatus.UNLOADED_AT_DESTINATION),
];
const scopedRooms = rooms.filter((room) => room.group_id === 1234001);

assert.deepEqual(getTransportableUnits(units, scopedRooms).map((u) => u.packing_id), [1]);
assert.deepEqual(getReceivableTransports(transports, units, scopedRooms).map((t) => t.moving_id), [10]);
assert.deepEqual(
  getDistributableUnits(units, scopedRooms).map((u) => u.packing_id),
  [4],
  "fully distributed units drop off the list",
);

// ---- report ----
const report = buildGroupReport({ groups, rooms, units });
const row = (groupId: number) => report.find((candidate) => candidate.group_id === groupId)!;

assert.equal(row(1234001).status, "MOVING");
assert.equal(row(1234001).totalRooms, 2);
assert.equal(row(1234001).movingUnits, 1);
assert.equal(row(1234001).movedUnits, 2);
assert.equal(row(1234002).status, "NOT_MOVED");
assert.equal(row(1234002).label, "קבוצה 1234002");

console.log("domain tests passed");
