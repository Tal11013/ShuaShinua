import {
  BoxType,
  ItemStatus,
  MovingType,
  MovingUnitStatus,
  PackingUnitStatus,
  RoomStatus,
  type IdfGroup,
  type Item,
  type Location,
  type MovingUnit,
  type PackingUnit,
  type Room,
} from "../../types";

const createItem = (
  catalog_id: string,
  description: string,
  price: number,
  item_status = ItemStatus.NOT_PACKED,
  is_balmas = false,
): Item => ({
  catalog_id,
  description,
  price,
  item_status,
  is_balmas,
});

export const buildSeedState = () => {
  const groups: IdfGroup[] = [
    {
      id: "group-infra",
      unit: "אגף תקשוב",
      branch: "ענף תשתיות",
      section: "מדור רשת",
      team: "צוות צפון",
    },
    {
      id: "group-support",
      unit: "אגף תקשוב",
      branch: "ענף תמיכה",
      section: "מדור משתמשים",
      team: "צוות מוקד",
    },
    {
      id: "group-systems",
      unit: "אגף תקשוב",
      branch: "ענף מערכות",
      section: "מדור אפליקציות",
      team: "צוות פיתוח",
    },
  ];

  const locations: Location[] = [
    { location_id: "loc-101", building: 4, floor: 1, room_number: 101 },
    { location_id: "loc-102", building: 4, floor: 1, room_number: 102 },
    { location_id: "loc-203", building: 4, floor: 2, room_number: 203 },
    { location_id: "loc-204", building: 4, floor: 2, room_number: 204 },
    { location_id: "loc-305", building: 7, floor: 3, room_number: 305 },
    { location_id: "loc-306", building: 7, floor: 3, room_number: 306 },
  ];

  const rooms: Room[] = [
    {
      room_id: "room-101",
      is_mapped: true,
      people_size: 5,
      items: [
        createItem("item-1001", "מסך מחשב", 780),
        createItem("item-1002", "תחנת עגינה", 430, ItemStatus.PACKED),
      ],
      location: "loc-101",
      group_id: "group-infra",
      room_status: RoomStatus.PACKING_PROCESS,
    },
    {
      room_id: "room-102",
      is_mapped: true,
      people_size: 3,
      items: [
        createItem("item-1003", "מדפסת משרדית", 1200, ItemStatus.PACKED),
        createItem("item-1004", "ארון תקשורת קטן", 2400, ItemStatus.PACKED, true),
      ],
      location: "loc-102",
      group_id: "group-infra",
      room_status: RoomStatus.CLOSED_ROOM,
    },
    {
      room_id: "room-203",
      is_mapped: true,
      people_size: 4,
      items: [
        createItem("item-2001", "מחשב נייד", 4200),
        createItem("item-2002", "טלפון IP", 350),
      ],
      location: "loc-203",
      group_id: "group-support",
      room_status: RoomStatus.WAITING_FOR_STATUS,
    },
    {
      room_id: "room-204",
      is_mapped: true,
      people_size: 2,
      items: [
        createItem("item-2003", "מסך רחב", 990),
        createItem("item-2004", "כסא עבודה", 650),
      ],
      location: "loc-204",
      group_id: "group-support",
      room_status: RoomStatus.WAITING_GRITA,
    },
    {
      room_id: "room-305",
      is_mapped: true,
      people_size: 6,
      items: [
        createItem("item-3001", "שרת בדיקות", 9800, ItemStatus.PACKED, true),
        createItem("item-3002", "מסך ניהול", 870, ItemStatus.PACKED),
      ],
      location: "loc-305",
      group_id: "group-systems",
      room_status: RoomStatus.PACKING_PROCESS,
    },
    {
      room_id: "room-306",
      is_mapped: false,
      people_size: 1,
      items: [createItem("item-3003", "עמדת עבודה", 3100)],
      location: "loc-306",
      group_id: "group-systems",
      room_status: RoomStatus.WAITING_FOR_STATUS,
    },
  ];

  const units: PackingUnit[] = [
    {
      packing_id: "pack-1001",
      box_type: BoxType.PROF_BOX,
      packing_status: PackingUnitStatus.PACKING_CLOSED,
      items: [createItem("item-1003", "מדפסת משרדית", 1200, ItemStatus.PACKED)],
    },
    {
      packing_id: "pack-2001",
      box_type: BoxType.PERSONAL_BOX,
      packing_status: PackingUnitStatus.PACKING_RECEIVED,
      items: [createItem("item-2005", "ציוד אישי", 300, ItemStatus.RECEIVED)],
    },
    {
      packing_id: "pack-3001",
      box_type: BoxType.DOLEV,
      packing_status: PackingUnitStatus.PACKING_ON_WAY,
      items: [createItem("item-3001", "שרת בדיקות", 9800, ItemStatus.PACKED, true)],
    },
  ];

  const transports: MovingUnit[] = [
    {
      moving_id: "move-501",
      moving_type: MovingType.TRACK,
      moving_status: MovingUnitStatus.ON_WAY,
      moving_date: new Date("2026-09-22T09:30:00"),
    },
  ];

  return { groups, locations, rooms, units, transports };
};

