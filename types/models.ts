// App-facing model types, derived from the database schema in ./supabase.ts
// so they can never drift from the real tables.
import type { Tables, TablesInsert, TablesUpdate } from "./supabase.js";

type Ops = { schema: "moving_south_operation" };

// ---- public schema ----
export type User = Tables<"users">;
export type UserInsert = TablesInsert<"users">;
export type UserUpdate = TablesUpdate<"users">;

// ---- moving_south_operation: catalog ----
export type ItemType = Tables<Ops, "item_types">;
export type ItemTypeInsert = TablesInsert<Ops, "item_types">;
export type ItemTypeUpdate = TablesUpdate<Ops, "item_types">;

export type Category = Tables<Ops, "categories">;
export type CategoryInsert = TablesInsert<Ops, "categories">;
export type CategoryUpdate = TablesUpdate<Ops, "categories">;

export type SubCategory = Tables<Ops, "sub_categories">;
export type SubCategoryInsert = TablesInsert<Ops, "sub_categories">;
export type SubCategoryUpdate = TablesUpdate<Ops, "sub_categories">;

// ---- moving_south_operation: groups & access ----
// groups.id is supplied by the app (group code prefix + 3-digit running number).
export type Group = Tables<Ops, "groups">;
export type GroupInsert = TablesInsert<Ops, "groups">;
export type GroupUpdate = TablesUpdate<Ops, "groups">;

// No FK to users.identity_num (cross-schema); linked in app code only.
export type UserGroup = Tables<Ops, "user_group">;
export type UserGroupInsert = TablesInsert<Ops, "user_group">;
export type UserGroupUpdate = TablesUpdate<Ops, "user_group">;

// No FK to groups; matched to groups.id by prefix in app code. code is not unique.
export type GroupCode = Tables<Ops, "group_codes">;
export type GroupCodeInsert = TablesInsert<Ops, "group_codes">;
export type GroupCodeUpdate = TablesUpdate<Ops, "group_codes">;

// ---- moving_south_operation: rooms & mapping ----
export type Location = Tables<Ops, "locations">;
export type LocationInsert = TablesInsert<Ops, "locations">;
export type LocationUpdate = TablesUpdate<Ops, "locations">;

// status is free text in the DB (no enum/check).
export type Room = Tables<Ops, "rooms">;
export type RoomInsert = TablesInsert<Ops, "rooms">;
export type RoomUpdate = TablesUpdate<Ops, "rooms">;

// status is varchar(30); sub_category_id is NOT NULL in the DB.
export type MappingReport = Tables<Ops, "mapping_reports">;
export type MappingReportInsert = TablesInsert<Ops, "mapping_reports">;
export type MappingReportUpdate = TablesUpdate<Ops, "mapping_reports">;
