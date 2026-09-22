import { UserRole, type AuthenticatedUser, type IdfGroup, type Room } from "../../types";
import { isSelectableRoom } from "./validation";

// Group ids are a 4-digit group code followed by a 3-digit running number
// (see server/routes/groups.ts), so the code — the unit — is id / 1000.
// Codes may start with 0 ("0101" -> group 101001), hence the padding.
export function unitIdForGroup(groupId: number) {
  return String(Math.floor(groupId / 1000)).padStart(4, "0");
}

// Workers see the groups they belong to (user_group); unit managers also see
// every group of the units they manage; global managers see everything.
export function getPermittedGroups(
  groups: IdfGroup[],
  user: AuthenticatedUser,
  memberGroupIds: ReadonlySet<number>,
) {
  if (user.role === UserRole.GLOBAL_MANAGER) {
    return groups;
  }

  return groups.filter(
    (group) =>
      memberGroupIds.has(group.id) ||
      (user.role === UserRole.UNIT_MANAGER &&
        user.managed_unit_ids.includes(group.unit_id)),
  );
}

export function getPermittedRooms(
  rooms: Room[],
  permittedGroups: IdfGroup[],
  options: { selectableOnly?: boolean } = {},
) {
  const permittedGroupIds = new Set(permittedGroups.map((group) => group.id));

  return rooms.filter(
    (room) =>
      permittedGroupIds.has(room.group_id) &&
      (!options.selectableOnly || isSelectableRoom(room)),
  );
}

export function getRoomUnitId(room: Room) {
  return unitIdForGroup(room.group_id);
}
