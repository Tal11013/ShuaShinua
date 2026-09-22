import type { UUID } from "./common";
import type { Item } from "./item";

export enum RoomStatus {
  WAITING_FOR_STATUS = "WAITING_FOR_STATUS",
  PACKING_PROCESS = "PACKING_PROCESS",
  CLOSED_ROOM = "CLOSED_ROOM",
  WAITING_GRITA = "WAITING_GRITA",
}

export interface Location {
  location_id: UUID;
  building: number;
  floor: number;
  room_number: number;
}

export interface IdfGroup {
  id: UUID;
  unit: string;
  branch: string;
  section: string;
  team: string;
}

export interface Room {
  room_id: UUID;
  is_mapped: boolean;
  people_size: number;
  items: Item[];
  location: Location["location_id"];
  group_id: IdfGroup["id"];
  room_status: RoomStatus;
}

export interface RoomMapping {
  mapping_id: UUID;
  old_room_id: Room["room_id"];
  new_room_id: Room["room_id"];
}

