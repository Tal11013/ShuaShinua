import {
  BoxType,
  MovingType,
  type IdfGroup,
  type Location,
  type PackingUnit,
  type Room,
} from "../../types";

export const boxTypeLabels: Record<BoxType, string> = {
  [BoxType.PERSONAL_BOX]: "קרטון אישי",
  [BoxType.PROF_BOX]: "קרטון מקצועי",
  [BoxType.DOLEV]: "דולב",
  [BoxType.SUITCASE]: "מזוודה",
};

export const movingTypeLabels: Record<MovingType, string> = {
  [MovingType.TRACK]: "משאית",
  [MovingType.CAR]: "אחר",
};

export function getPackingLabel(unit: PackingUnit) {
  return `אריזה #${unit.packing_id}`;
}

export function getGroupLabel(group: IdfGroup) {
  return group.contact_name ? `${group.id}` : `קבוצה ${group.id}`;
}

export function getRoomLabel(locations: Location[], room: Room | undefined) {
  if (!room) {
    return "לא ידוע";
  }

  const location = locations.find(
    (candidate) => candidate.location_id === room.location_id,
  );
  const name = room.description ?? `חדר ${room.room_id}`;

  return location ? `${name} · ${location.description}` : name;
}

export function getRoomOrgLabel(groups: IdfGroup[], room: Room | undefined) {
  const group = groups.find((candidate) => candidate.id === room?.group_id);

  if (!room || !group) {
    return "לא ידוע";
  }

  return `יחידה ${group.unit_id} · ${getGroupLabel(group)}`;
}
