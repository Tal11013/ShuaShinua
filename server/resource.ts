import { Router } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "./supabase.js";
import { fromPostgrest, parsePagination } from "./http.js";
import { parseId, readBody, readQueryValue, type FieldSpecs, type FieldType } from "./validate.js";
import type { Database } from "../types/supabase.js";

export const OPS_SCHEMA = "moving_south_operation";
type OpsTable = keyof Database[typeof OPS_SCHEMA]["Tables"];

// The factory builds queries from runtime config (table names, select strings),
// which the typed client can't check statically. Request bodies are validated
// against FieldSpecs instead; route modules that know their table use the
// typed client directly.
function opsDb() {
  return (getSupabaseAdmin() as unknown as SupabaseClient).schema(OPS_SCHEMA);
}

export type ResourceConfig = {
  table: OpsTable;
  // Writable columns and their validation rules (from the DDL).
  fields: FieldSpecs;
  // Query-string filters for GET /, matched with equality.
  filters?: Record<string, FieldType>;
  order: { column: string; ascending?: boolean };
  listSelect?: string;
  detailSelect?: string;
  // Embedded relations in detailSelect whose soft-deleted rows should be hidden.
  detailHideUnavailable?: string[];
  // Tables with is_available use soft delete; others are hard-deleted.
  softDelete: boolean;
  // Set false to register a custom POST / instead.
  create?: boolean;
};

// Standard REST routes for one table:
//   GET    /        list (?limit, ?offset, filters, ?include_unavailable=true)
//   GET    /:id     one row with detailSelect embeds
//   POST   /        create
//   PATCH  /:id     partial update
//   DELETE /:id     soft delete (is_available = false) or hard delete
export function resourceRouter(config: ResourceConfig): Router {
  const router = Router();
  const listSelect = config.listSelect ?? "*";
  const detailSelect = config.detailSelect ?? listSelect;

  router.get("/", async (request, response) => {
    const { limit, offset } = parsePagination(request.query);
    let query = opsDb()
      .from(config.table)
      .select(listSelect, { count: "exact" })
      .order(config.order.column, { ascending: config.order.ascending ?? true })
      .range(offset, offset + limit - 1);

    for (const [name, type] of Object.entries(config.filters ?? {})) {
      if (request.query[name] !== undefined) {
        query = query.eq(name, readQueryValue(name, request.query[name], type));
      }
    }
    // `not is false` keeps rows where is_available is NULL (nullable on some tables).
    if (config.softDelete && request.query.include_unavailable !== "true") {
      query = query.not("is_available", "is", false);
    }

    const { data, count, error } = await query;
    if (error) throw fromPostgrest(error);
    response.json({ data, count, limit, offset });
  });

  router.get("/:id", async (request, response) => {
    let query = opsDb()
      .from(config.table)
      .select(detailSelect)
      .eq("id", parseId(request.params.id));
    for (const relation of config.detailHideUnavailable ?? []) {
      query = query.not(`${relation}.is_available`, "is", false);
    }
    const { data, error } = await query.single();
    if (error) throw fromPostgrest(error);
    response.json(data);
  });

  if (config.create !== false) {
    router.post("/", async (request, response) => {
      const row = readBody(request.body, config.fields, "insert");
      const { data, error } = await opsDb()
        .from(config.table)
        .insert(row)
        .select(detailSelect)
        .single();
      if (error) throw fromPostgrest(error);
      response.status(201).json(data);
    });
  }

  router.patch("/:id", async (request, response) => {
    const changes = readBody(request.body, config.fields, "update");
    const { data, error } = await opsDb()
      .from(config.table)
      .update(changes)
      .eq("id", parseId(request.params.id))
      .select(detailSelect)
      .single();
    if (error) throw fromPostgrest(error);
    response.json(data);
  });

  router.delete("/:id", async (request, response) => {
    const id = parseId(request.params.id);
    const table = opsDb().from(config.table);
    const query = config.softDelete
      ? table.update({ is_available: false }).eq("id", id)
      : table.delete().eq("id", id);
    const { data, error } = await query.select().single();
    if (error) throw fromPostgrest(error);
    response.json(data);
  });

  return router;
}
