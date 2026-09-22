import type { UUID } from "./common";
import type { Item } from "./item";


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
  packing_id: UUID;
  box_type: BoxType;
  packing_status: PackingUnitStatus;
  items: Item[];
}

