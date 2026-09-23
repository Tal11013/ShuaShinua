import { HttpError } from "./http.js";

export type FieldType = "string" | "integer" | "number" | "boolean" | "timestamp";

export type FieldSpec = {
  type: FieldType;
  required?: boolean; // must be present on insert
  nullable?: boolean; // accepts null (and "" for strings)
  max?: number; // varchar length
  min?: number; // numeric lower bound
};

export type FieldSpecs = Record<string, FieldSpec>;

function readValue(name: string, value: unknown, spec: FieldSpec): unknown {
  if (value === null || (spec.type === "string" && value === "")) {
    if (spec.nullable) return null;
    throw new HttpError(400, `${name} cannot be empty`);
  }

  switch (spec.type) {
    case "string": {
      if (typeof value !== "string") throw new HttpError(400, `${name} must be a string`);
      const text = value.trim();
      if (!text && !spec.nullable) throw new HttpError(400, `${name} cannot be empty`);
      if (spec.max !== undefined && text.length > spec.max) {
        throw new HttpError(400, `${name} must be at most ${spec.max} characters`);
      }
      return text || null;
    }
    case "integer":
    case "number": {
      const number = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
      if (typeof number !== "number" || !Number.isFinite(number)) {
        throw new HttpError(400, `${name} must be a number`);
      }
      if (spec.type === "integer" && !Number.isSafeInteger(number)) {
        throw new HttpError(400, `${name} must be an integer`);
      }
      if (spec.min !== undefined && number < spec.min) {
        throw new HttpError(400, `${name} must be at least ${spec.min}`);
      }
      return number;
    }
    case "boolean": {
      if (value === "true") return true;
      if (value === "false") return false;
      if (typeof value !== "boolean") throw new HttpError(400, `${name} must be true or false`);
      return value;
    }
    case "timestamp": {
      const time = typeof value === "string" ? Date.parse(value) : NaN;
      if (Number.isNaN(time)) throw new HttpError(400, `${name} must be an ISO date/time string`);
      return new Date(time).toISOString();
    }
  }
}

// Validates a JSON body against the table's writable columns. Unknown keys are
// rejected so typos don't silently do nothing.
export function readBody(
  body: unknown,
  specs: FieldSpecs,
  mode: "insert" | "update",
): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "Request body must be a JSON object");
  }
  const input = body as Record<string, unknown>;

  const unknown = Object.keys(input).filter((key) => !(key in specs));
  if (unknown.length > 0) throw new HttpError(400, `Unknown fields: ${unknown.join(", ")}`);

  const row: Record<string, unknown> = {};
  for (const [name, spec] of Object.entries(specs)) {
    if (input[name] === undefined) {
      if (mode === "insert" && spec.required) throw new HttpError(400, `${name} is required`);
      continue;
    }
    row[name] = readValue(name, input[name], spec);
  }

  if (mode === "update" && Object.keys(row).length === 0) {
    throw new HttpError(400, `Nothing to update. Allowed fields: ${Object.keys(specs).join(", ")}`);
  }
  return row;
}

// Parses a query-string filter value (always a string) into the column's type.
export function readQueryValue(name: string, value: unknown, type: FieldType): unknown {
  if (typeof value !== "string") throw new HttpError(400, `${name} must be a single value`);
  return readValue(name, value, { type });
}

export function parseId(value: string | string[] | undefined, name = "id"): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new HttpError(400, `${name} must be a positive integer`);
  return id;
}
