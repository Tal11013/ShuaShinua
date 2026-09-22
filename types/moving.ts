import type { UUID } from "./common.js";

export enum MovingType {
  TRACK = "TRACK",
  CAR = "CAR",
}

export enum MovingUnitStatus {
  WAITING_FOR_MOVING = "WAITING_FOR_MOVING",
  LOADING_PROCESS = "LOADING_PROCESS",
  ON_WAY = "ON_WAY",
  UNLOADED_AT_DESTINATION = "UNLOADED_AT_DESTINATION",
  CLOSED = "CLOSED",
}

export interface MovingUnit {
  moving_id: UUID;
  moving_type: MovingType;
  moving_status: MovingUnitStatus;
  moving_date: Date;
  vehicle_number?: string;
  packing_unit_ids?: UUID[];
}
