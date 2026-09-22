import { UserRole, type AuthenticatedUser } from "../../types";

export function canAccessManagementReport(user: AuthenticatedUser) {
  return (
    user.role === UserRole.UNIT_MANAGER || user.role === UserRole.GLOBAL_MANAGER
  );
}
