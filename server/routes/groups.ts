import { Router } from "express";
import { getSupabaseAdmin } from "../supabase.js";
import { HttpError, fromPostgrest } from "../http.js";
import { OPS_SCHEMA, resourceRouter } from "../resource.js";
import { parseId, readBody, type FieldSpecs } from "../validate.js";
import type { TablesInsert } from "../../types/supabase.js";

export const groupsRouter = Router();

const ops = () => getSupabaseAdmin().schema(OPS_SCHEMA);

const GROUP_FIELDS: FieldSpecs = {
  contact_name: { type: "string", nullable: true, max: 255 },
  contact_phone: { type: "string", nullable: true, max: 10 },
  created_by: { type: "string", nullable: true, max: 10 },
  is_available: { type: "boolean" },
};

// POST /api/groups  { code: "1234", contact_name?, contact_phone?, created_by? }
// Group ids are app-assigned: 4-digit group code + 3-digit running number
// (code 1234 -> 1234001, 1234002, ...). The identity sequence is never used.
groupsRouter.post("/", async (request, response) => {
  const { code, ...rest } = (request.body ?? {}) as Record<string, unknown>;
  if (typeof code !== "string" || !/^\d{4}$/.test(code)) {
    throw new HttpError(400, "code is required and must be exactly 4 digits");
  }
  const fields = readBody(rest, GROUP_FIELDS, "insert");

  const base = Number(code) * 1000;
  const { data: last, error: lastError } = await ops()
    .from("groups")
    .select("id")
    .gt("id", base)
    .lt("id", base + 1000)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw fromPostgrest(lastError);

  const id = (last?.id ?? base) + 1;
  if (id >= base + 1000) throw new HttpError(409, `Group code ${code} has no free ids left`);

  const row: TablesInsert<{ schema: typeof OPS_SCHEMA }, "groups"> = { ...fields, id };
  const { data, error } = await ops().from("groups").insert(row).select().single();
  if (error) throw fromPostgrest(error);
  response.status(201).json(data);
});

// GET /api/groups/:id/members -> active user_group rows with the user's full_name.
// users lives in the public schema with no FK, so the join is done here.
groupsRouter.get("/:id/members", async (request, response) => {
  const groupId = parseId(request.params.id);
  const { data: members, error } = await ops()
    .from("user_group")
    .select("*")
    .eq("group_id", groupId)
    .eq("is_available", true)
    .order("assigned_on");
  if (error) throw fromPostgrest(error);

  const ids = members.map((member) => member.identity_num);
  const { data: users, error: usersError } = ids.length
    ? await getSupabaseAdmin().from("users").select("*").in("identity_num", ids)
    : { data: [], error: null };
  if (usersError) throw fromPostgrest(usersError);

  const names = new Map(users.map((user) => [user.identity_num, user.full_name]));
  response.json(
    members.map((member) => ({ ...member, full_name: names.get(member.identity_num) ?? null })),
  );
});

// POST /api/groups/:id/members  { identity_num, assigned_by? }
// Re-adding a previously removed member reactivates the existing row.
groupsRouter.post("/:id/members", async (request, response) => {
  const groupId = parseId(request.params.id);
  const fields = readBody(
    request.body,
    {
      identity_num: { type: "string", required: true, max: 10 },
      assigned_by: { type: "string", nullable: true, max: 10 },
    },
    "insert",
  ) as { identity_num: string; assigned_by?: string | null };

  const row: TablesInsert<{ schema: typeof OPS_SCHEMA }, "user_group"> = {
    ...fields,
    group_id: groupId,
    is_available: true,
  };
  const { data, error } = await ops()
    .from("user_group")
    .upsert(row, { onConflict: "identity_num,group_id" })
    .select()
    .single();
  if (error) throw fromPostgrest(error);
  response.status(201).json(data);
});

// DELETE /api/groups/:id/members/:identityNum -> soft delete
groupsRouter.delete("/:id/members/:identityNum", async (request, response) => {
  const { data, error } = await ops()
    .from("user_group")
    .update({ is_available: false })
    .eq("group_id", parseId(request.params.id))
    .eq("identity_num", request.params.identityNum)
    .select()
    .single();
  if (error) throw fromPostgrest(error);
  response.json(data);
});

groupsRouter.use(
  resourceRouter({
    table: "groups",
    fields: GROUP_FIELDS,
    order: { column: "id" },
    detailSelect: "*, rooms(*, locations(id, description))",
    detailHideUnavailable: ["rooms"],
    softDelete: true,
    create: false, // custom POST above assigns the id
  }),
);
