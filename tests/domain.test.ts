import assert from "node:assert/strict";
import { PackingUnitStatus, RoomStatus, UserRole } from "../types";
import { buildBranchReport } from "../src/domain/report";
import { buildSeedState } from "../src/domain/seed";
import {
  canAccessUnit,
  getPermittedGroups,
  getPermittedRooms,
} from "../src/domain/scope";
import { getUserByPersonalNumber, USERS } from "../src/domain/users";
import {
  isSelectableRoom,
  searchItemCatalogue,
  validateCatalogueQuantities,
  validateVehicleNumber,
} from "../src/domain/validation";

const data = buildSeedState();
const worker = USERS.find((user) => user.role === UserRole.WORKER)!;
const unitManager = USERS.find((user) => user.role === UserRole.UNIT_MANAGER)!;
const globalManager = USERS.find((user) => user.role === UserRole.GLOBAL_MANAGER)!;

assert.equal(worker.role, UserRole.WORKER);
assert.equal(getUserByPersonalNumber("1111111")?.user_id, "user-worker-infra");
assert.equal(getUserByPersonalNumber("2222222")?.role, UserRole.UNIT_MANAGER);
assert.equal(getUserByPersonalNumber("3333333")?.role, UserRole.GLOBAL_MANAGER);
assert.equal(getUserByPersonalNumber("1234567"), undefined);
assert.equal(canAccessUnit(data.groups, unitManager, "unit-logistics"), false);
assert.equal(canAccessUnit(data.groups, unitManager, "unit-tech"), true);
assert.equal(canAccessUnit(data.groups, globalManager, "unit-logistics"), true);

assert.deepEqual(
  new Set(getPermittedGroups(data.groups, unitManager).map((group) => group.unit_id)),
  new Set(["unit-tech"]),
);
assert.deepEqual(
  new Set(getPermittedGroups(data.groups, globalManager).map((group) => group.unit_id)),
  new Set(["unit-tech", "unit-logistics"]),
);

const selectableRooms = getPermittedRooms(data.rooms, data.groups, globalManager, {
  selectableOnly: true,
});
assert.equal(
  selectableRooms.some((room) => room.room_status === RoomStatus.CLOSED_ROOM),
  false,
);
assert.equal(
  selectableRooms.some((room) => room.room_status === RoomStatus.WAITING_GRITA),
  false,
);
assert.equal(
  isSelectableRoom(data.rooms.find((room) => room.room_id === "room-102")!),
  false,
);

assert.equal(validateVehicleNumber("1234567"), true);
assert.equal(validateVehicleNumber("12345678"), true);
assert.equal(validateVehicleNumber("123456"), false);
assert.equal(validateVehicleNumber("123456789"), false);
assert.equal(validateVehicleNumber("12-345-67"), false);

assert.equal(searchItemCatalogue(data.itemCatalogue, "מסך").length, 1);
assert.equal(searchItemCatalogue(data.itemCatalogue, "cat-1002")[0]?.catalog_id, "CAT-1002");

const quantities = { "CAT-1001": 2, "CAT-1002": 0 };
const filtered = searchItemCatalogue(data.itemCatalogue, "שרת");
assert.equal(quantities["CAT-1001"], 2);
assert.equal(filtered.length, 1);
assert.equal(
  validateCatalogueQuantities([{ catalog_id: "CAT-1001", quantity: 2 }], data.itemCatalogue),
  true,
);
assert.equal(
  validateCatalogueQuantities([{ catalog_id: "CAT-1001", quantity: 0 }], data.itemCatalogue),
  false,
);
assert.equal(
  validateCatalogueQuantities([{ catalog_id: "CAT-1001", quantity: 1.5 }], data.itemCatalogue),
  false,
);
assert.equal(
  validateCatalogueQuantities([{ catalog_id: "BAD", quantity: 1 }], data.itemCatalogue),
  false,
);

const closedUnit = data.units.find(
  (unit) => unit.packing_status === PackingUnitStatus.PACKING_CLOSED,
)!;
assert.ok(closedUnit.source_room_id);
assert.ok(closedUnit.destination_room_id);
assert.equal(
  data.transports.find((transport) => transport.moving_id === "move-501")?.vehicle_number,
  "12345678",
);

const report = buildBranchReport(data);
assert.ok(report.some((row) => row.status === "MOVING"));
assert.ok(report.some((row) => row.status === "MOVED"));

console.log("domain tests passed");
