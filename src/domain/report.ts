import {
  PackingUnitStatus,
  type IdfGroup,
  type PackingUnit,
  type Room,
} from "../../types";
import { getGroupLabel } from "./display";

export type GroupMoveStatus = "NOT_MOVED" | "MOVING" | "MOVED";

export type GroupReportRow = {
  group_id: number;
  unit_id: string;
  label: string;
  status: GroupMoveStatus;
  totalRooms: number;
  movingUnits: number;
  movedUnits: number;
};

export function buildGroupReport({
  groups,
  rooms,
  units,
}: {
  groups: IdfGroup[];
  rooms: Room[];
  units: PackingUnit[];
}): GroupReportRow[] {
  return groups.map((group) => {
    const groupRooms = rooms.filter((room) => room.group_id === group.id);
    const groupRoomIds = new Set(groupRooms.map((room) => room.room_id));
    const groupUnits = units.filter(
      (unit) =>
        groupRoomIds.has(unit.source_room_id) ||
        groupRoomIds.has(unit.destination_room_id),
    );
    const movingUnits = groupUnits.filter(
      (unit) => unit.packing_status === PackingUnitStatus.PACKING_ON_WAY,
    ).length;
    const movedUnits = groupUnits.filter(
      (unit) => unit.packing_status === PackingUnitStatus.PACKING_RECEIVED,
    ).length;

    return {
      group_id: group.id,
      unit_id: group.unit_id,
      label: getGroupLabel(group),
      status: movingUnits > 0 ? "MOVING" : movedUnits > 0 ? "MOVED" : "NOT_MOVED",
      totalRooms: groupRooms.length,
      movingUnits,
      movedUnits,
    };
  });
}
