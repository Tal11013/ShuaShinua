// Stored in moving_south_operation.user_roles; users without a row are workers.
export enum UserRole {
  WORKER = "WORKER",
  UNIT_MANAGER = "UNIT_MANAGER",
  GLOBAL_MANAGER = "GLOBAL_MANAGER",
}

// A public.users row plus its role and the units (group codes) it manages.
export interface AuthenticatedUser {
  user_id: string; // users.identity_num
  name: string;
  role: UserRole;
  managed_unit_ids: string[];
}
