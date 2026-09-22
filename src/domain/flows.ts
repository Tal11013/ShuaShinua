import {
  ItemStatus,
  MovingUnitStatus,
  PackingUnitStatus,
  type MovingUnit,
  type PackingUnit,
  type Room,
} from "../../types";

// What each flow screen can act on, given the user's scoped state. These match
// the API's permission checks, so the process counters never offer empty work.

const inRooms = (rooms: Room[], roomId: number) =>
  rooms.some((room) => room.room_id === roomId);

// Closed units packed from a room in scope.
export function getTransportableUnits(units: PackingUnit[], rooms: Room[]) {
  return units.filter(
    (unit) =>
      unit.packing_status === PackingUnitStatus.PACKING_CLOSED &&
      inRooms(rooms, unit.source_room_id),
  );
}

// Units on the way that were packed from a room in scope.
export function getReceivableUnits(units: PackingUnit[], rooms: Room[]) {
  return units.filter(
    (unit) =>
      unit.packing_status === PackingUnitStatus.PACKING_ON_WAY &&
      inRooms(rooms, unit.source_room_id),
  );
}

export function getReceivableTransports(
  transports: MovingUnit[],
  units: PackingUnit[],
  rooms: Room[],
) {
  const receivable = getReceivableUnits(units, rooms);

  return transports.filter(
    (transport) =>
      transport.moving_status === MovingUnitStatus.ON_WAY &&
      receivable.some((unit) => unit.transport_id === transport.moving_id),
  );
}

// Received units in a destination room in scope with items left to hand out.
export function getDistributableUnits(units: PackingUnit[], rooms: Room[]) {
  return units.filter(
    (unit) =>
      unit.packing_status === PackingUnitStatus.PACKING_RECEIVED &&
      inRooms(rooms, unit.destination_room_id) &&
      unit.items.some((item) => item.item_status === ItemStatus.RECEIVED),
  );
}
