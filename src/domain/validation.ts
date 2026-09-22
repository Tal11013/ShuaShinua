import {
  RoomStatus,
  type IdfGroup,
  type Item,
  type Room,
} from "../../types";

export const VEHICLE_NUMBER_REGEX = /^\d{7,8}$/;
export const VEHICLE_NUMBER_MESSAGE = "מספר רכב חייב להכיל 7 או 8 ספרות.";

export const blockedRoomStatuses = new Set<RoomStatus>([
  RoomStatus.CLOSED_ROOM,
  RoomStatus.WAITING_GRITA,
]);

export function isSelectableRoom(room: Room) {
  return room.is_mapped && !blockedRoomStatuses.has(room.room_status);
}

export function validateVehicleNumber(vehicleNumber: string) {
  return VEHICLE_NUMBER_REGEX.test(vehicleNumber);
}

export function validateVehicleDetails(details: string) {
  return details.trim().length > 0;
}

export function validateCatalogueQuantities(
  items: Array<{ catalog_id: string; quantity: unknown }>,
  catalogue: Item[],
) {
  const catalogueIds = new Set(catalogue.map((item) => item.catalog_id));

  return items.every(
    (item) =>
      catalogueIds.has(item.catalog_id) &&
      Number.isInteger(item.quantity) &&
      Number(item.quantity) > 0,
  );
}

export function searchItemCatalogue(catalogue: Item[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return catalogue;
  }

  return catalogue.filter(
    (item) =>
      item.description.toLowerCase().includes(normalizedQuery) ||
      item.catalog_id.toLowerCase().includes(normalizedQuery),
  );
}

export function getGroupForRoom(groups: IdfGroup[], room: Room) {
  return groups.find((group) => group.id === room.group_id);
}
