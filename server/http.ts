import type { ErrorRequestHandler } from "express";
import type { PostgrestError } from "@supabase/supabase-js";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

// Map PostgREST / Postgres error codes to HTTP statuses.
const POSTGRES_STATUS: Record<string, number> = {
  PGRST116: 404, // .single() matched no rows
  "23505": 409, // unique_violation
  "23503": 409, // foreign_key_violation
  "23502": 400, // not_null_violation
  "22P02": 400, // invalid_text_representation
  "22001": 400, // string_data_right_truncation (value too long)
};

export function fromPostgrest(error: PostgrestError): HttpError {
  const status = POSTGRES_STATUS[error.code] ?? 500;
  const message = status === 404 ? "Not found" : error.message;
  return new HttpError(status, message, { code: error.code, hint: error.hint });
}

export function parsePagination(query: Record<string, unknown>) {
  const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 200);
  const offset = Math.max(Number(query.offset) || 0, 0);
  return { limit, offset };
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: error.message, details: error.details });
    return;
  }
  // express.json() parse failures carry a status (e.g. 400 for malformed JSON).
  if (typeof error?.status === "number" && error.status < 500) {
    response.status(error.status).json({ error: error.message });
    return;
  }
  console.error(error);
  response.status(500).json({ error: "Internal server error" });
};
