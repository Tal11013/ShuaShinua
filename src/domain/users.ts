import { UserRole, type AuthenticatedUser } from "../../types";

export const USERS: AuthenticatedUser[] = [
  {
    user_id: "user-worker-infra",
    personal_number: "1111111",
    name: "עובד תשתיות",
    role: UserRole.WORKER,
    scope: {
      unit_id: "unit-tech",
      branch: "ענף תשתיות",
      section: "מדור רשת",
    },
  },
  {
    user_id: "user-manager-tech",
    personal_number: "2222222",
    name: "מנהל יחידה תקשוב",
    role: UserRole.UNIT_MANAGER,
    scope: {
      unit_id: "unit-tech",
    },
  },
  {
    user_id: "user-global",
    personal_number: "3333333",
    name: "מנהל גלובלי",
    role: UserRole.GLOBAL_MANAGER,
    scope: {},
  },
];

export const DEFAULT_USER_ID = USERS[0]!.user_id;

export function getUserById(userId: string | undefined) {
  return USERS.find((user) => user.user_id === userId) ?? USERS[0]!;
}

export function getUserByPersonalNumber(personalNumber: string) {
  return USERS.find((user) => user.personal_number === personalNumber);
}

export function canAccessManagementReport(user: AuthenticatedUser) {
  return (
    user.role === UserRole.UNIT_MANAGER || user.role === UserRole.GLOBAL_MANAGER
  );
}

