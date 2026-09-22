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

export type RelocationData = {
  groups: IdfGroup[];
  locations: Location[];
  rooms: Room[];
  units: PackingUnit[];
  transports: MovingUnit[];
  itemCatalogue: Item[];
};

export const itemCatalogue: Item[] = [
  {
    catalog_id: "CAT-1001",
    description: "מסך מחשב",
    price: 780,
    item_status: ItemStatus.NOT_PACKED,
    is_balmas: false,
  },
  {
    catalog_id: "CAT-1002",
    description: "תחנת עגינה",
    price: 430,
    item_status: ItemStatus.NOT_PACKED,
    is_balmas: false,
  },
  {
    catalog_id: "CAT-1003",
    description: "מדפסת משרדית",
    price: 1200,
    item_status: ItemStatus.NOT_PACKED,
    is_balmas: false,
  },
  {
    catalog_id: "CAT-2001",
    description: "מחשב נייד",
    price: 4200,
    item_status: ItemStatus.NOT_PACKED,
    is_balmas: false,
  },
  {
    catalog_id: "CAT-3001",
    description: "שרת בדיקות",
    price: 9800,
    item_status: ItemStatus.NOT_PACKED,
    is_balmas: true,
  },
];

const createPackedCatalogueItem = (catalogId: string, quantity: number): Item => {
  const catalogueItem = itemCatalogue.find((item) => item.catalog_id === catalogId);

  if (!catalogueItem) {
    throw new Error(`Unknown catalogue item: ${catalogId}`);
  }

  return {
    ...catalogueItem,
    item_status: ItemStatus.PACKED,
    quantity,
  };
};

export function buildSeedState(): RelocationData {
  const groups: IdfGroup[] = [
    {
      id: "group-infra",
      unit_id: "unit-tech",
      unit: "יחידת תקשוב",
      branch: "ענף תשתיות",
      section: "מדור רשת",
      team: "צוות צפון",
    },
    {
      id: "group-support",
      unit_id: "unit-tech",
      unit: "יחידת תקשוב",
      branch: "ענף תמיכה",
      section: "מדור משתמשים",
      team: "צוות מוקד",
    },
    {
      id: "group-logistics",
      unit_id: "unit-logistics",
      unit: "יחידת לוגיסטיקה",
      branch: "ענף ציוד",
      section: "מדור מלאי",
      team: "צוות מחסן",
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
      items: [],
      location: "loc-101",
      group_id: "group-infra",
      room_status: RoomStatus.PACKING_PROCESS,
    },
    {
      room_id: "room-102",
      is_mapped: true,
      people_size: 3,
      items: [],
      location: "loc-102",
      group_id: "group-infra",
      room_status: RoomStatus.CLOSED_ROOM,
    },
    {
      room_id: "room-203",
      is_mapped: true,
      people_size: 4,
      items: [],
      location: "loc-203",
      group_id: "group-support",
      room_status: RoomStatus.WAITING_FOR_STATUS,
    },
    {
      room_id: "room-204",
      is_mapped: true,
      people_size: 2,
      items: [],
      location: "loc-204",
      group_id: "group-support",
      room_status: RoomStatus.WAITING_GRITA,
    },
    {
      room_id: "room-305",
      is_mapped: true,
      people_size: 6,
      items: [],
      location: "loc-305",
      group_id: "group-logistics",
      room_status: RoomStatus.PACKING_PROCESS,
    },
    {
      room_id: "room-306",
      is_mapped: true,
      people_size: 1,
      items: [],
      location: "loc-306",
      group_id: "group-logistics",
      room_status: RoomStatus.WAITING_FOR_STATUS,
    },
  ];

  const units: PackingUnit[] = [
    {
      packing_id: "pack-1001",
      box_type: BoxType.PROF_BOX,
      packing_status: PackingUnitStatus.PACKING_CLOSED,
      source_room_id: "room-101",
      destination_room_id: "room-203",
      items: [createPackedCatalogueItem("CAT-1003", 2)],
    },
    {
      packing_id: "pack-2001",
      box_type: BoxType.PERSONAL_BOX,
      packing_status: PackingUnitStatus.PACKING_RECEIVED,
      source_room_id: "room-203",
      destination_room_id: "room-101",
      transport_id: "move-501",
      items: [createPackedCatalogueItem("CAT-1002", 1)],
    },
    {
      packing_id: "pack-3001",
      box_type: BoxType.DOLEV,
      packing_status: PackingUnitStatus.PACKING_ON_WAY,
      source_room_id: "room-305",
      destination_room_id: "room-306",
      transport_id: "move-501",
      items: [createPackedCatalogueItem("CAT-3001", 1)],
    },
  ];

  const transports: MovingUnit[] = [
    {
      moving_id: "move-501",
      moving_type: MovingType.TRACK,
      moving_status: MovingUnitStatus.ON_WAY,
      moving_date: new Date("2026-09-22T09:30:00"),
      vehicle_number: "12345678",
      packing_unit_ids: ["pack-2001", "pack-3001"],
    },
  ];

  return { groups, locations, rooms, units, transports, itemCatalogue };
}

