import type { IdfGroup, Location, Room } from "../../types";

export function getLocationLabel(locations: Location[], room: Room | undefined) {
  const location = locations.find(
    (candidate) => candidate.location_id === room?.location,
  );

  if (!room || !location) {
    return "לא ידוע";
  }

  return `בניין ${location.building}, קומה ${location.floor}, חדר ${location.room_number}`;
}

export function getRoomOrgLabel(groups: IdfGroup[], room: Room | undefined) {
  const group = groups.find((candidate) => candidate.id === room?.group_id);

  if (!room || !group) {
    return "לא ידוע";
  }

  return `${group.unit} · ${group.branch} · ${group.section}`;
}

