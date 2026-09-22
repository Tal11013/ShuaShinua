-- Relocation flows: roles, packing units, packed items, transports.
--
-- Status columns use text + CHECK (matching the existing tables' style) with
-- the enum values from types/*.ts. Multi-row writes go through the functions
-- at the bottom so each flow step is a single transaction.

set search_path = moving_south_operation;

-- ---- roles ----
-- Users without a row are workers. Unit managers manage the group codes they
-- hold in group_codes. No FK to public.users (cross-schema, like user_group).
create table user_roles (
  identity_num varchar(9) primary key,
  role text not null check (role in ('WORKER', 'UNIT_MANAGER', 'GLOBAL_MANAGER')),
  assigned_on timestamptz not null default now(),
  assigned_by varchar(9)
);

-- ---- rooms ----
-- Separate from rooms.status, which belongs to the mapping process.
alter table rooms
  add column move_status text not null default 'WAITING_FOR_STATUS'
    check (move_status in ('WAITING_FOR_STATUS', 'PACKING_PROCESS', 'CLOSED_ROOM', 'WAITING_GRITA'));

-- ---- transports ----
create table transports (
  id bigint generated always as identity primary key,
  moving_type text not null check (moving_type in ('TRACK', 'CAR')),
  status text not null default 'ON_WAY'
    check (status in ('WAITING_FOR_MOVING', 'LOADING_PROCESS', 'ON_WAY', 'UNLOADED_AT_DESTINATION', 'CLOSED')),
  moving_date timestamptz not null default now(),
  vehicle_number varchar(8) check (vehicle_number ~ '^\d{7,8}$'),
  vehicle_details text check (btrim(vehicle_details) <> ''),
  created_by varchar(9) not null,
  -- Trucks carry a vehicle number; other vehicles a free-text description.
  check (
    (moving_type = 'CAR' and vehicle_details is not null and vehicle_number is null)
    or (moving_type <> 'CAR' and vehicle_number is not null and vehicle_details is null)
  )
);

-- ---- packing units ----
create table packing_units (
  id bigint generated always as identity primary key,
  box_type text not null check (box_type in ('PROF_BOX', 'PERSONAL_BOX', 'DOLEV', 'SUITCASE')),
  status text not null default 'PACKING_CLOSED'
    check (status in ('WAITING_FOR_PACKING', 'PACKING_RECEIVED', 'PACKING_PROCESS', 'PACKING_CLOSED', 'PACKING_ON_WAY', 'MISSING')),
  source_room_id bigint not null references rooms (id),
  destination_room_id bigint not null references rooms (id),
  transport_id bigint references transports (id),
  created_by varchar(9) not null,
  created_on timestamptz not null default now()
);

create index packing_units_source_room_idx on packing_units (source_room_id);
create index packing_units_destination_room_idx on packing_units (destination_room_id);
create index packing_units_transport_idx on packing_units (transport_id);

-- ---- packed items ----
-- The catalogue is sub_categories.
create table packing_items (
  id bigint generated always as identity primary key,
  packing_unit_id bigint not null references packing_units (id) on delete cascade,
  sub_category_id bigint not null references sub_categories (id),
  quantity integer not null check (quantity > 0),
  status text not null default 'PACKED'
    check (status in ('NOT_PACKED', 'PACKED', 'RECEIVED', 'MISSING', 'DISTRIBUTED')),
  unique (packing_unit_id, sub_category_id)
);

-- The API uses the service role; nothing is exposed to anon/authenticated.
alter table user_roles enable row level security;
alter table transports enable row level security;
alter table packing_units enable row level security;
alter table packing_items enable row level security;

-- ---- flow functions ----
-- Permission checks happen in the API; these enforce state transitions and
-- keep each step atomic. Rows are locked so concurrent requests can't both
-- move the same unit.

create function create_packing(
  p_created_by varchar,
  p_box_type text,
  p_source_room_id bigint,
  p_destination_room_id bigint,
  p_items jsonb -- [{ "sub_category_id": 1, "quantity": 2 }]
) returns bigint
language plpgsql
set search_path = moving_south_operation
as $$
declare
  v_id bigint;
begin
  insert into packing_units (box_type, source_room_id, destination_room_id, created_by)
  values (p_box_type, p_source_room_id, p_destination_room_id, p_created_by)
  returning id into v_id;

  insert into packing_items (packing_unit_id, sub_category_id, quantity)
  select v_id, (item ->> 'sub_category_id')::bigint, (item ->> 'quantity')::integer
  from jsonb_array_elements(p_items) as item;

  update rooms set move_status = 'PACKING_PROCESS'
  where id = p_source_room_id and move_status = 'WAITING_FOR_STATUS';

  return v_id;
end;
$$;

create function create_transport(
  p_created_by varchar,
  p_moving_type text,
  p_vehicle_number varchar,
  p_vehicle_details text,
  p_packing_ids bigint[]
) returns bigint
language plpgsql
set search_path = moving_south_operation
as $$
declare
  v_id bigint;
  v_updated integer;
begin
  insert into transports (moving_type, vehicle_number, vehicle_details, created_by)
  values (p_moving_type, p_vehicle_number, p_vehicle_details, p_created_by)
  returning id into v_id;

  update packing_units
  set transport_id = v_id, status = 'PACKING_ON_WAY'
  where id = any (p_packing_ids) and status = 'PACKING_CLOSED' and transport_id is null;

  get diagnostics v_updated = row_count;
  if v_updated <> cardinality(p_packing_ids) then
    raise exception 'packing units are no longer available for transport'
      using errcode = 'P0001';
  end if;

  return v_id;
end;
$$;

create function receive_transport(
  p_transport_id bigint,
  p_packing_ids bigint[]
) returns void
language plpgsql
set search_path = moving_south_operation
as $$
declare
  v_updated integer;
begin
  perform 1 from transports
  where id = p_transport_id and status = 'ON_WAY'
  for update;
  if not found then
    raise exception 'transport is not on the way' using errcode = 'P0001';
  end if;

  update packing_units
  set status = 'PACKING_RECEIVED'
  where id = any (p_packing_ids) and transport_id = p_transport_id and status = 'PACKING_ON_WAY';

  get diagnostics v_updated = row_count;
  if v_updated <> cardinality(p_packing_ids) then
    raise exception 'packing units are not on this transport' using errcode = 'P0001';
  end if;

  update packing_items set status = 'RECEIVED'
  where packing_unit_id = any (p_packing_ids) and status = 'PACKED';

  -- The transport is unloaded once nothing on it is still on the way.
  update transports set status = 'UNLOADED_AT_DESTINATION'
  where id = p_transport_id
    and not exists (
      select 1 from packing_units
      where transport_id = p_transport_id and status = 'PACKING_ON_WAY'
    );
end;
$$;

create function distribute_items(
  p_packing_id bigint,
  p_item_ids bigint[]
) returns void
language plpgsql
set search_path = moving_south_operation
as $$
declare
  v_updated integer;
begin
  perform 1 from packing_units
  where id = p_packing_id and status = 'PACKING_RECEIVED'
  for update;
  if not found then
    raise exception 'packing unit is not received' using errcode = 'P0001';
  end if;

  update packing_items set status = 'DISTRIBUTED'
  where id = any (p_item_ids) and packing_unit_id = p_packing_id and status = 'RECEIVED';

  get diagnostics v_updated = row_count;
  if v_updated <> cardinality(p_item_ids) then
    raise exception 'items are not available for distribution' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function
  create_packing(varchar, text, bigint, bigint, jsonb),
  create_transport(varchar, text, varchar, text, bigint[]),
  receive_transport(bigint, bigint[]),
  distribute_items(bigint, bigint[])
from public, anon, authenticated;

grant all on user_roles, transports, packing_units, packing_items to service_role;
grant execute on function
  create_packing(varchar, text, bigint, bigint, jsonb),
  create_transport(varchar, text, varchar, text, bigint[]),
  receive_transport(bigint, bigint[]),
  distribute_items(bigint, bigint[])
to service_role;

-- ---- demo roles for the existing seed users ----
-- 300000011 holds group code 1234 in group_codes; 300000033 sees everything.
-- Everyone else is a worker.
insert into user_roles (identity_num, role) values
  ('300000011', 'UNIT_MANAGER'),
  ('300000033', 'GLOBAL_MANAGER')
on conflict (identity_num) do nothing;
