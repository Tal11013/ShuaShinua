import { UserRole, type AuthenticatedUser, type IdfGroup, type Room } from "../../types";
import { getGroupForRoom, isSelectableRoom } from "./validation";

export function getPermittedGroups(groups: IdfGroup[], user: AuthenticatedUser) {
  if (user.role === UserRole.GLOBAL_MANAGER) {
    return groups;
  }

  return groups.filter((group) => {
    if (user.scope.unit_id && group.unit_id !== user.scope.unit_id) {
      return false;
    }

    if (user.scope.branch && group.branch !== user.scope.branch) {
      return false;
    }

    if (user.scope.section && group.section !== user.scope.section) {
      return false;
    }

    return true;
  });
}

export function canAccessUnit(
  groups: IdfGroup[],
  user: AuthenticatedUser,
  unitId: string | undefined,
) {
  if (!unitId) {
    return false;
  }

  if (user.role === UserRole.GLOBAL_MANAGER) {
    return groups.some((group) => group.unit_id === unitId);
  }

  return user.scope.unit_id === unitId;
}

export function isGroupPermitted(
  groups: IdfGroup[],
  user: AuthenticatedUser,
  groupId: string,
) {
  return getPermittedGroups(groups, user).some((group) => group.id === groupId);
}

export function getPermittedRooms(
  rooms: Room[],
  groups: IdfGroup[],
  user: AuthenticatedUser,
  options: { selectableOnly?: boolean } = {},
) {
  const permittedGroupIds = new Set(
    getPermittedGroups(groups, user).map((group) => group.id),
  );

  return rooms.filter((room) => {
    if (!permittedGroupIds.has(room.group_id)) {
      return false;
    }

    return options.selectableOnly ? isSelectableRoom(room) : true;
  });
}

export function isRoomPermitted(
  rooms: Room[],
  groups: IdfGroup[],
  user: AuthenticatedUser,
  roomId: string,
  options: { selectableOnly?: boolean } = {},
) {
  return getPermittedRooms(rooms, groups, user, options).some(
    (room) => room.room_id === roomId,
  );
}

export function getRoomUnitId(
  rooms: Room[],
  groups: IdfGroup[],
  roomId: string,
) {
  const room = rooms.find((candidate) => candidate.room_id === roomId);

  if (!room) {
    return undefined;
  }

  return getGroupForRoom(groups, room)?.unit_id;
}
