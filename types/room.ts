// Stored in rooms.move_status (rooms.status belongs to the mapping process).
export enum RoomStatus {
  WAITING_FOR_STATUS = "WAITING_FOR_STATUS",
  PACKING_PROCESS = "PACKING_PROCESS",
  CLOSED_ROOM = "CLOSED_ROOM",
  WAITING_GRITA = "WAITING_GRITA",
}

export interface Location {
  location_id: number;
  description: string;
}

// A row of groups. Group ids are a group code followed by a 3-digit running
// number (1234001 -> code "1234"); the code identifies the unit.
export interface IdfGroup {
  id: number;
  unit_id: string;
  contact_name: string | null;
}

export interface Room {
  room_id: number;
  group_id: IdfGroup["id"];
  location_id: Location["location_id"] | null;
  description: string | null;
  room_status: RoomStatus;
}
