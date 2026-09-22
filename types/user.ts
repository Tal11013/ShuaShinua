import type { UUID } from "./common.js";

export enum UserRole {
  WORKER = "WORKER",
  UNIT_MANAGER = "UNIT_MANAGER",
  GLOBAL_MANAGER = "GLOBAL_MANAGER",
}

export interface UserScope {
  unit_id?: UUID;
  branch?: string;
  section?: string;
}

export interface AuthenticatedUser {
  user_id: UUID;
  personal_number: string;
  name: string;
  role: UserRole;
  scope: UserScope;
}
