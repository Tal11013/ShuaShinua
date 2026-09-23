import { RoomStatus, type CatalogueItem, type Room } from "../../types";

export const VEHICLE_NUMBER_REGEX = /^\d{7,8}$/;
export const VEHICLE_NUMBER_MESSAGE = "מספר רכב חייב להכיל 7 או 8 ספרות.";

export const IDENTITY_NUMBER_REGEX = /^\d{9}$/;
export const IDENTITY_NUMBER_MESSAGE = "מספר זהות חייב להכיל 9 ספרות.";

export const blockedRoomStatuses = new Set<RoomStatus>([
  RoomStatus.CLOSED_ROOM,
  RoomStatus.WAITING_GRITA,
]);

// A room can be packed from / into once it has a location assigned.
export function isSelectableRoom(room: Room) {
  return room.location_id !== null && !blockedRoomStatuses.has(room.room_status);
}

export function validateVehicleNumber(vehicleNumber: string) {
  return VEHICLE_NUMBER_REGEX.test(vehicleNumber);
}

export function validateVehicleDetails(details: string) {
  return details.trim().length > 0;
}

export function validateCatalogueQuantities(
  items: Array<{ catalog_id: unknown; quantity: unknown }>,
  catalogue: CatalogueItem[],
) {
  const catalogueIds = new Set(catalogue.map((item) => item.catalog_id));
  const seen = new Set<unknown>();

  return items.every((item) => {
    const valid =
      catalogueIds.has(item.catalog_id as number) &&
      !seen.has(item.catalog_id) &&
      Number.isInteger(item.quantity) &&
      Number(item.quantity) > 0;
    seen.add(item.catalog_id);
    return valid;
  });
}

export function searchItemCatalogue(catalogue: CatalogueItem[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return catalogue;
  }

  return catalogue.filter(
    (item) =>
      item.description.toLowerCase().includes(normalizedQuery) ||
      item.category.toLowerCase().includes(normalizedQuery) ||
      String(item.catalog_id) === normalizedQuery,
  );
}
