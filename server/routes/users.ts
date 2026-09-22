import { Router } from "express";
import { getSupabaseAdmin } from "../supabase.js";
import { HttpError, fromPostgrest, parsePagination } from "../http.js";
import type { TablesInsert, TablesUpdate } from "../../types/supabase.js";

export const usersRouter = Router();

// identity_num is varchar(9): a 9-digit Israeli ID number.
const IDENTITY_NUM = /^\d{9}$/;

function readFullName(body: Record<string, unknown>): string | null | undefined {
  const { full_name } = body;
  if (full_name === undefined || full_name === null) return full_name;
  if (typeof full_name !== "string") throw new HttpError(400, "full_name must be a string");
  return full_name.trim() || null;
}

// GET /api/users?q=&limit=&offset=  -> { data, count }
usersRouter.get("/", async (request, response) => {
  const { limit, offset } = parsePagination(request.query);
  let query = getSupabaseAdmin()
    .from("users")
    .select("*", { count: "exact" })
    .order("full_name")
    .range(offset, offset + limit - 1);

  const q = typeof request.query.q === "string" ? request.query.q.trim() : "";
  if (q) {
    // Strip PostgREST filter syntax / LIKE wildcard characters before embedding in .or().
    const term = q.replace(/[,()\\%*_]/g, "");
    query = query.or(`full_name.ilike.%${term}%,identity_num.ilike.%${term}%`);
  }

  const { data, count, error } = await query;
  if (error) throw fromPostgrest(error);
  response.json({ data, count, limit, offset });
});

// GET /api/users/:identityNum
usersRouter.get("/:identityNum", async (request, response) => {
  const { data, error } = await getSupabaseAdmin()
    .from("users")
    .select("*")
    .eq("identity_num", request.params.identityNum)
    .single();
  if (error) throw fromPostgrest(error);
  response.json(data);
});

// POST /api/users  { identity_num, full_name? }
usersRouter.post("/", async (request, response) => {
  const body = (request.body ?? {}) as Record<string, unknown>;
  const identityNum = typeof body.identity_num === "string" ? body.identity_num.trim() : "";
  if (!IDENTITY_NUM.test(identityNum)) {
    throw new HttpError(400, "identity_num is required and must be exactly 9 digits");
  }

  const row: TablesInsert<"users"> = { identity_num: identityNum };
  const fullName = readFullName(body);
  if (fullName !== undefined) row.full_name = fullName;

  const { data, error } = await getSupabaseAdmin().from("users").insert(row).select().single();
  if (error) throw fromPostgrest(error);
  response.status(201).json(data);
});

// PATCH /api/users/:identityNum  { full_name }
usersRouter.patch("/:identityNum", async (request, response) => {
  const fullName = readFullName((request.body ?? {}) as Record<string, unknown>);
  if (fullName === undefined) throw new HttpError(400, "Nothing to update: send full_name");

  const changes: TablesUpdate<"users"> = { full_name: fullName };
  const { data, error } = await getSupabaseAdmin()
    .from("users")
    .update(changes)
    .eq("identity_num", request.params.identityNum)
    .select()
    .single();
  if (error) throw fromPostgrest(error);
  response.json(data);
});

// GET /api/users/:identityNum/groups -> the user's active group memberships
usersRouter.get("/:identityNum/groups", async (request, response) => {
  const { data, error } = await getSupabaseAdmin()
    .schema("moving_south_operation")
    .from("user_group")
    .select("group_id, assigned_on, assigned_by, groups(*)")
    .eq("identity_num", request.params.identityNum)
    .eq("is_available", true);
  if (error) throw fromPostgrest(error);
  response.json(data);
});

// DELETE /api/users/:identityNum
usersRouter.delete("/:identityNum", async (request, response) => {
  const { data, error } = await getSupabaseAdmin()
    .from("users")
    .delete()
    .eq("identity_num", request.params.identityNum)
    .select()
    .single();
  if (error) throw fromPostgrest(error);
  response.json(data);
});
