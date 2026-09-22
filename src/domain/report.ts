import {
  MovingUnitStatus,
  PackingUnitStatus,
  type IdfGroup,
  type MovingUnit,
  type PackingUnit,
  type Room,
} from "../../types";

export type BranchMoveStatus = "NOT_MOVED" | "MOVING" | "MOVED";

export type BranchReportRow = {
  unit_id: string;
  unit: string;
  branch: string;
  status: BranchMoveStatus;
  totalRooms: number;
  movingUnits: number;
  movedUnits: number;
};

export function buildBranchReport({
  groups,
  rooms,
  units,
  transports,
}: {
  groups: IdfGroup[];
  rooms: Room[];
  units: PackingUnit[];
  transports: MovingUnit[];
}): BranchReportRow[] {
  return groups.map((group) => {
    const groupRooms = rooms.filter((room) => room.group_id === group.id);
    const groupRoomIds = new Set(groupRooms.map((room) => room.room_id));
    const branchUnits = units.filter(
      (unit) =>
        (unit.source_room_id && groupRoomIds.has(unit.source_room_id)) ||
        (unit.destination_room_id && groupRoomIds.has(unit.destination_room_id)),
    );
    const transportIds = new Set(
      branchUnits.map((unit) => unit.transport_id).filter(Boolean),
    );
    const branchTransports = transports.filter((transport) =>
      transportIds.has(transport.moving_id),
    );
    const movingUnits = branchUnits.filter(
      (unit) => unit.packing_status === PackingUnitStatus.PACKING_ON_WAY,
    ).length;
    const movedUnits =
      branchUnits.filter(
        (unit) => unit.packing_status === PackingUnitStatus.PACKING_RECEIVED,
      ).length +
      branchTransports.filter(
        (transport) =>
          transport.moving_status === MovingUnitStatus.UNLOADED_AT_DESTINATION ||
          transport.moving_status === MovingUnitStatus.CLOSED,
      ).length;

    return {
      unit_id: group.unit_id,
      unit: group.unit,
      branch: group.branch,
      status: movingUnits > 0 ? "MOVING" : movedUnits > 0 ? "MOVED" : "NOT_MOVED",
      totalRooms: groupRooms.length,
      movingUnits,
      movedUnits,
    };
  });
}

