// REST resources for the moving_south_operation schema. Field limits mirror the DDL
// (e.g. mapping_reports.status is varchar(30), reported_by is varchar(10)).
import { resourceRouter } from "../resource.js";

export const itemTypesRouter = resourceRouter({
  table: "item_types",
  fields: { description: { type: "string", required: true, max: 255 } },
  order: { column: "id" },
  softDelete: false, // item_types has no is_available column
});

export const categoriesRouter = resourceRouter({
  table: "categories",
  fields: {
    description: { type: "string", required: true, max: 255 },
    item_type_id: { type: "integer", nullable: true },
    is_special: { type: "boolean" },
    is_available: { type: "boolean" },
  },
  filters: { item_type_id: "integer", is_special: "boolean" },
  order: { column: "id" },
  listSelect: "*, item_types(id, description)",
  detailSelect: "*, item_types(id, description), sub_categories(*)",
  detailHideUnavailable: ["sub_categories"],
  softDelete: true,
});

export const subCategoriesRouter = resourceRouter({
  table: "sub_categories",
  fields: {
    category_id: { type: "integer", required: true },
    description: { type: "string", required: true, max: 255 },
    is_available: { type: "boolean" },
  },
  filters: { category_id: "integer" },
  order: { column: "id" },
  listSelect: "*, categories(id, description)",
  softDelete: true,
});

export const locationsRouter = resourceRouter({
  table: "locations",
  fields: {
    description: { type: "string", required: true, max: 255 },
    is_available: { type: "boolean" },
  },
  order: { column: "id" },
  softDelete: true,
});

export const roomsRouter = resourceRouter({
  table: "rooms",
  fields: {
    group_id: { type: "integer", required: true },
    location_id: { type: "integer", nullable: true },
    description: { type: "string", nullable: true, max: 255 },
    status: { type: "string", nullable: true, max: 255 },
    room_manager: { type: "string", nullable: true, max: 255 },
    start_mapping_time: { type: "timestamp", nullable: true },
    end_mapping_time: { type: "timestamp", nullable: true },
    is_available: { type: "boolean" },
  },
  filters: { group_id: "integer", location_id: "integer", status: "string" },
  order: { column: "id" },
  listSelect: "*, groups(id, contact_name), locations(id, description)",
  detailSelect:
    "*, groups(*), locations(*), mapping_reports(*, sub_categories(id, description, categories(id, description)))",
  detailHideUnavailable: ["mapping_reports"],
  softDelete: true,
});

export const mappingReportsRouter = resourceRouter({
  table: "mapping_reports",
  fields: {
    room_id: { type: "integer", required: true },
    sub_category_id: { type: "integer", required: true },
    reported_by: { type: "string", required: true, max: 10 },
    reported_on: { type: "timestamp" },
    status: { type: "string", required: true, max: 30 },
    description: { type: "string", nullable: true, max: 255 },
    quantity: { type: "number", min: 0 },
    serial: { type: "string", nullable: true, max: 255 },
    item_purpose: { type: "string", nullable: true, max: 255 },
    item_target: { type: "string", nullable: true, max: 255 },
    expiration_date: { type: "timestamp", nullable: true },
    is_available: { type: "boolean" },
  },
  filters: {
    room_id: "integer",
    sub_category_id: "integer",
    status: "string",
    reported_by: "string",
  },
  order: { column: "reported_on", ascending: false },
  listSelect:
    "*, rooms(id, description), sub_categories(id, description, categories(id, description))",
  softDelete: true,
});

export const groupCodesRouter = resourceRouter({
  table: "group_codes",
  fields: {
    code: { type: "string", required: true, max: 4 },
    identity_num: { type: "string", nullable: true, max: 10 },
    is_available: { type: "boolean" },
  },
  filters: { code: "string", identity_num: "string" },
  order: { column: "id" },
  softDelete: true,
});
