import type { Item } from "./item.js";
import type { Room } from "./room.js";

export enum BoxType {
  PROF_BOX = "PROF_BOX",
  PERSONAL_BOX = "PERSONAL_BOX",
  DOLEV = "DOLEV",
  SUITCASE = "SUITCASE",
}

export enum PackingUnitStatus {
  WAITING_FOR_PACKING = "WAITING_FOR_PACKING",
  PACKING_RECEIVED = "PACKING_RECEIVED",
  PACKING_PROCESS = "PACKING_PROCESS",
  PACKING_CLOSED = "PACKING_CLOSED",
  PACKING_ON_WAY = "PACKING_ON_WAY",
  MISSING = "MISSING",
}

export interface PackingUnit {
  packing_id: number;
  box_type: BoxType;
  packing_status: PackingUnitStatus;
  source_room_id: Room["room_id"];
  destination_room_id: Room["room_id"];
  transport_id: number | null;
  items: Item[];
}
