create extension if not exists btree_gist;

alter table public.inspections
  add column if not exists inspection_date date not null default current_date;

alter table public.daily_reports
  add column if not exists shift_date date not null default current_date,
  add column if not exists shift_started_at timestamptz,
  add column if not exists shift_ended_at timestamptz;

create table if not exists public.vehicle_assignments (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id),
  driver_id uuid not null references public.profiles(id),
  shift_date date not null,
  shift_started_at timestamptz not null,
  shift_ended_at timestamptz not null,
  status text not null default 'active'
    check (status in ('reserved', 'active', 'completed', 'cancelled')),
  request_id uuid not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  check (shift_ended_at > shift_started_at)
);

alter table public.vehicle_assignments
  add constraint vehicle_assignments_active_vehicle_no_overlap
  exclude using gist (
    vehicle_id with =,
    tstzrange(shift_started_at, shift_ended_at, '[)') with &&
  )
  where (status in ('reserved', 'active'));

create index if not exists vehicle_assignments_driver_date_idx
  on public.vehicle_assignments (driver_id, shift_date);

create index if not exists vehicle_assignments_vehicle_date_idx
  on public.vehicle_assignments (vehicle_id, shift_date);

create table if not exists private.request_idempotency (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null,
  request_id uuid not null,
  payload_hash text not null,
  response jsonb not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, operation, request_id)
);

create table if not exists public.vehicle_status_audits (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id),
  changed_by uuid not null references public.profiles(id),
  previous_status text,
  new_status text not null
    check (new_status in ('active', 'maintenance', 'out_of_service')),
  request_id uuid not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists vehicle_status_audits_vehicle_created_idx
  on public.vehicle_status_audits (vehicle_id, created_at desc);

create table if not exists public.fuel_consumption_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id),
  driver_id uuid not null references public.profiles(id),
  report_id uuid not null references public.daily_reports(id),
  shift_date date not null,
  starting_level numeric(7, 3) not null check (starting_level between 0 and 100),
  ending_level numeric(7, 3) not null check (ending_level between 0 and 100),
  consumed_level numeric(12, 4) not null check (consumed_level >= 0),
  unit_cost numeric(12, 4) not null default 0 check (unit_cost >= 0),
  total_cost numeric(18, 4) generated always as (consumed_level * unit_cost) stored,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists fuel_consumption_logs_vehicle_date_idx
  on public.fuel_consumption_logs (vehicle_id, shift_date);

alter table public.vehicle_assignments enable row level security;
alter table public.vehicle_status_audits enable row level security;
alter table public.fuel_consumption_logs enable row level security;

revoke all on public.vehicle_assignments, public.vehicle_status_audits,
  public.fuel_consumption_logs from anon, authenticated, public;

grant select on public.vehicle_assignments to authenticated;
grant select on public.vehicle_status_audits to authenticated;
grant select on public.fuel_consumption_logs to authenticated;

create policy vehicle_assignments_select_own_or_manager
on public.vehicle_assignments for select to authenticated
using (
  driver_id = (select auth.uid())
  or (select private.current_app_role()) = 'manager'
);

create policy vehicle_status_audits_select_manager
on public.vehicle_status_audits for select to authenticated
using ((select private.current_app_role()) = 'manager');

create policy fuel_consumption_logs_select_accountant_or_manager
on public.fuel_consumption_logs for select to authenticated
using ((select private.current_app_role()) in ('accountant', 'manager'));

create or replace view public.fleet_status_summary
with (security_invoker = false)
as
select
  v.status,
  case v.status
    when 'active' then 'Active'
    when 'maintenance' then 'Maintenance'
    when 'out_of_service' then 'Out of Service'
  end as status_label,
  count(*)::integer as vehicle_count,
  count(*) filter (where v.status = 'active')::integer as available_count
from public.vehicles v
group by v.status;

revoke all on public.fleet_status_summary from anon, authenticated, public;
grant select on public.fleet_status_summary to anon, authenticated;

create or replace function private.request_hash(p_payload jsonb)
returns text
language sql
immutable
set search_path = pg_catalog, public
as $$
  select encode(extensions.digest(convert_to(p_payload::text, 'utf8'), 'sha256'), 'hex');
$$;

revoke all on function private.request_hash(jsonb) from public;

create or replace function private.get_idempotent_response(
  p_operation text,
  p_request_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = private, pg_catalog, public
as $$
declare
  existing private.request_idempotency%rowtype;
  payload_hash text;
begin
  payload_hash := private.request_hash(p_payload);

  select *
    into existing
    from private.request_idempotency
   where user_id = (select auth.uid())
     and operation = p_operation
     and request_id = p_request_id
   for update;

  if found then
    if existing.payload_hash <> payload_hash then
      raise exception using
        errcode = 'P0001',
        message = 'Request ID was already used with a different payload';
    end if;
    return existing.response;
  end if;

  return null;
end;
$$;

revoke all on function private.get_idempotent_response(text, uuid, jsonb) from public;

create or replace function private.save_idempotent_response(
  p_operation text,
  p_request_id uuid,
  p_payload jsonb,
  p_response jsonb
)
returns jsonb
language sql
security definer
set search_path = private, pg_catalog, public
as $$
  insert into private.request_idempotency (user_id, operation, request_id, payload_hash, response)
  values (
    (select auth.uid()),
    p_operation,
    p_request_id,
    private.request_hash(p_payload),
    p_response
  )
  on conflict (user_id, operation, request_id) do update
    set response = excluded.response,
        payload_hash = excluded.payload_hash
  returning response;
$$;

revoke all on function private.save_idempotent_response(text, uuid, jsonb, jsonb) from public;

create or replace function public.submit_inspection(
  p_vehicle_id uuid,
  p_passes_check boolean,
  p_odometer_reading integer,
  p_odometer_photo_url text default null,
  p_inspection_date date default current_date,
  p_request_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = private, pg_catalog, public
as $$
declare
  caller uuid := (select auth.uid());
  vehicle public.vehicles%rowtype;
  inspection_id uuid;
  payload jsonb;
  previous jsonb;
begin
  if caller is null or private.current_app_role() <> 'driver' then
    raise exception using errcode = '42501', message = 'Only drivers can submit inspections';
  end if;
  if p_vehicle_id is null or p_request_id is null then
    raise exception using errcode = '22023', message = 'Vehicle ID and request ID are required';
  end if;
  if p_odometer_reading is null or p_odometer_reading < 0 then
    raise exception using errcode = '22023', message = 'Odometer reading must be zero or greater';
  end if;
  if p_inspection_date is null then
    raise exception using errcode = '22023', message = 'Inspection date is required';
  end if;

  payload := jsonb_build_object(
    'vehicle_id', p_vehicle_id,
    'passes_check', p_passes_check,
    'odometer_reading', p_odometer_reading,
    'odometer_photo_url', p_odometer_photo_url,
    'inspection_date', p_inspection_date
  );
  previous := private.get_idempotent_response('submit_inspection', p_request_id, payload);
  if previous is not null then
    return previous;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_vehicle_id::text, 0));
  select * into vehicle from public.vehicles where id = p_vehicle_id for update;
  if not found or vehicle.assigned_driver_id <> caller then
    raise exception using errcode = '42501', message = 'Vehicle is not assigned to the current driver';
  end if;
  if vehicle.status <> 'active' then
    raise exception using errcode = 'P0001', message = 'Only active vehicles can be inspected for a route';
  end if;

  insert into public.inspections (
    vehicle_id, driver_id, passes_check, odometer_reading, odometer_photo_url, inspection_date
  )
  values (
    p_vehicle_id, caller, p_passes_check, p_odometer_reading, p_odometer_photo_url, p_inspection_date
  )
  returning id into inspection_id;

  return private.save_idempotent_response(
    'submit_inspection',
    p_request_id,
    payload,
    jsonb_build_object('inspection_id', inspection_id, 'vehicle_id', p_vehicle_id, 'inspection_date', p_inspection_date)
  );
end;
$$;

revoke all on function public.submit_inspection(uuid, boolean, integer, text, date, uuid) from public, anon, authenticated;
grant execute on function public.submit_inspection(uuid, boolean, integer, text, date, uuid) to authenticated;

create or replace function public.submit_daily_report(
  p_vehicle_id uuid,
  p_shift_date date,
  p_shift_started_at timestamptz,
  p_shift_ended_at timestamptz,
  p_driving_hours numeric,
  p_end_mileage integer,
  p_fuel_battery_remaining integer,
  p_issue_description text default null,
  p_issue_urgency text default 'none',
  p_issue_photo_url text default null,
  p_request_id uuid default gen_random_uuid(),
  p_fuel_unit_cost numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = private, pg_catalog, public
as $$
declare
  caller uuid := (select auth.uid());
  vehicle public.vehicles%rowtype;
  report_id uuid;
  assignment_id uuid;
  consumed numeric(12, 4);
  payload jsonb;
  previous jsonb;
  attempt integer;
  total_hours numeric;
begin
  if caller is null or private.current_app_role() <> 'driver' then
    raise exception using errcode = '42501', message = 'Only drivers can submit daily reports';
  end if;
  if p_request_id is null or p_vehicle_id is null or p_shift_date is null
     or p_shift_started_at is null or p_shift_ended_at is null then
    raise exception using errcode = '22023', message = 'Vehicle, shift date, times, and request ID are required';
  end if;
  if p_shift_ended_at <= p_shift_started_at then
    raise exception using errcode = '22023', message = 'Shift end must be after shift start';
  end if;
  if p_driving_hours is null or p_driving_hours < 0 or p_driving_hours > 9 then
    raise exception using errcode = '22023', message = 'Driving hours must be between zero and nine';
  end if;
  if p_end_mileage is not null and p_end_mileage < 0 then
    raise exception using errcode = '22023', message = 'End mileage must be zero or greater';
  end if;
  if p_fuel_battery_remaining is not null and p_fuel_battery_remaining not between 0 and 100 then
    raise exception using errcode = '22023', message = 'Fuel or battery level must be between zero and one hundred';
  end if;
  if p_issue_urgency not in ('none', 'low', 'urgent') then
    raise exception using errcode = '22023', message = 'Invalid issue urgency';
  end if;
  if p_fuel_unit_cost is null or p_fuel_unit_cost < 0 then
    raise exception using errcode = '22023', message = 'Fuel unit cost must be zero or greater';
  end if;

  payload := jsonb_build_object(
    'vehicle_id', p_vehicle_id,
    'shift_date', p_shift_date,
    'shift_started_at', p_shift_started_at,
    'shift_ended_at', p_shift_ended_at,
    'driving_hours', p_driving_hours,
    'end_mileage', p_end_mileage,
    'fuel_battery_remaining', p_fuel_battery_remaining,
    'issue_description', p_issue_description,
    'issue_urgency', p_issue_urgency,
    'issue_photo_url', p_issue_photo_url,
    'fuel_unit_cost', p_fuel_unit_cost
  );
  previous := private.get_idempotent_response('submit_daily_report', p_request_id, payload);
  if previous is not null then
    return previous;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(caller::text || ':' || p_shift_date::text, 0));
  perform pg_advisory_xact_lock(hashtextextended(p_vehicle_id::text, 0));

  select * into vehicle from public.vehicles where id = p_vehicle_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Vehicle was not found';
  end if;
  if vehicle.status <> 'active' then
    raise exception using errcode = 'P0001', message = 'Maintenance or out-of-service vehicles cannot receive new routes';
  end if;
  if vehicle.assigned_driver_id is null then
    update public.vehicles
       set assigned_driver_id = caller
     where id = p_vehicle_id
     returning * into vehicle;
  elsif vehicle.assigned_driver_id <> caller then
    raise exception using errcode = '42501', message = 'Vehicle is assigned to another driver';
  end if;

  if not exists (
    select 1
      from public.inspections i
     where i.vehicle_id = p_vehicle_id
       and i.driver_id = caller
       and i.inspection_date = p_shift_date
       and i.passes_check
  ) then
    raise exception using errcode = 'P0001', message = 'A passed pre-trip inspection is required before reporting a shift';
  end if;

  select coalesce(sum(driving_hours), 0) + p_driving_hours
    into total_hours
    from public.daily_reports
   where driver_id = caller
     and shift_date = p_shift_date;
  if total_hours > 9 then
    raise exception using errcode = 'P0001', message = 'Daily driving limit of nine hours would be exceeded';
  end if;

  for attempt in 1..3 loop
    begin
      insert into public.vehicle_assignments (
        vehicle_id, driver_id, shift_date, shift_started_at, shift_ended_at, request_id
      )
      values (
        p_vehicle_id, caller, p_shift_date, p_shift_started_at, p_shift_ended_at, p_request_id
      )
      returning id into assignment_id;
      exit;
    exception when exclusion_violation then
      if attempt = 3 then
        raise exception using errcode = 'P0001', message = 'Vehicle is already assigned during this shift';
      end if;
      perform pg_sleep(0.01 * attempt);
    end;
  end loop;

  insert into public.daily_reports (
    vehicle_id, driver_id, shift_date, shift_started_at, shift_ended_at,
    driving_hours, end_mileage, fuel_battery_remaining,
    issue_description, issue_urgency, issue_photo_url
  )
  values (
    p_vehicle_id, caller, p_shift_date, p_shift_started_at, p_shift_ended_at,
    p_driving_hours, p_end_mileage, p_fuel_battery_remaining,
    p_issue_description, p_issue_urgency, p_issue_photo_url
  )
  returning id into report_id;

  if p_fuel_battery_remaining is not null then
    consumed := greatest(vehicle.fuel_battery_level::numeric - p_fuel_battery_remaining::numeric, 0);
    insert into public.fuel_consumption_logs (
      vehicle_id, driver_id, report_id, shift_date,
      starting_level, ending_level, consumed_level, unit_cost
    )
    values (
      p_vehicle_id, caller, report_id, p_shift_date,
      vehicle.fuel_battery_level, p_fuel_battery_remaining, consumed, p_fuel_unit_cost
    );
    update public.vehicles
       set mileage = coalesce(p_end_mileage, mileage),
           fuel_battery_level = p_fuel_battery_remaining
     where id = p_vehicle_id;
  elsif p_end_mileage is not null then
    update public.vehicles
       set mileage = p_end_mileage
     where id = p_vehicle_id;
  end if;

  return private.save_idempotent_response(
    'submit_daily_report',
    p_request_id,
    payload,
    jsonb_build_object('report_id', report_id, 'assignment_id', assignment_id, 'vehicle_id', p_vehicle_id, 'shift_date', p_shift_date)
  );
end;
$$;

revoke all on function public.submit_daily_report(uuid, date, timestamptz, timestamptz, numeric, integer, integer, text, text, text, uuid, numeric) from public, anon, authenticated;
grant execute on function public.submit_daily_report(uuid, date, timestamptz, timestamptz, numeric, integer, integer, text, text, text, uuid, numeric) to authenticated;

create or replace function public.update_vehicle_status(
  p_vehicle_id uuid,
  p_status text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = private, pg_catalog, public
as $$
declare
  caller uuid := (select auth.uid());
  vehicle public.vehicles%rowtype;
  payload jsonb;
  previous jsonb;
  audit_id uuid;
begin
  if caller is null or private.current_app_role() <> 'manager' then
    raise exception using errcode = '42501', message = 'Only fleet managers can update vehicle status';
  end if;
  if p_vehicle_id is null or p_request_id is null
     or p_status not in ('active', 'maintenance', 'out_of_service') then
    raise exception using errcode = '22023', message = 'Valid vehicle, status, and request ID are required';
  end if;

  payload := jsonb_build_object('vehicle_id', p_vehicle_id, 'status', p_status);
  previous := private.get_idempotent_response('update_vehicle_status', p_request_id, payload);
  if previous is not null then
    return previous;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_vehicle_id::text, 0));
  select * into vehicle from public.vehicles where id = p_vehicle_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Vehicle was not found';
  end if;

  if vehicle.status <> p_status then
    update public.vehicles set status = p_status where id = p_vehicle_id;
    insert into public.vehicle_status_audits (
      vehicle_id, changed_by, previous_status, new_status, request_id
    )
    values (p_vehicle_id, caller, vehicle.status, p_status, p_request_id)
    returning id into audit_id;
  else
    select id into audit_id
      from public.vehicle_status_audits
     where vehicle_id = p_vehicle_id
       and request_id = p_request_id
     limit 1;
  end if;

  return private.save_idempotent_response(
    'update_vehicle_status',
    p_request_id,
    payload,
    jsonb_build_object('vehicle_id', p_vehicle_id, 'status', p_status, 'audit_id', audit_id)
  );
end;
$$;

revoke all on function public.update_vehicle_status(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.update_vehicle_status(uuid, text, uuid) to authenticated;

create or replace function public.approve_maintenance(
  p_maintenance_log_id uuid,
  p_status text,
  p_parts_cost numeric,
  p_labor_cost numeric,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = private, pg_catalog, public
as $$
declare
  caller uuid := (select auth.uid());
  maintenance public.maintenance_logs%rowtype;
  payload jsonb;
  previous jsonb;
  total_cost numeric;
begin
  if caller is null or private.current_app_role() <> 'manager' then
    raise exception using errcode = '42501', message = 'Only fleet managers can approve maintenance';
  end if;
  if p_maintenance_log_id is null or p_request_id is null
     or p_status not in ('pending', 'approved', 'completed')
     or p_parts_cost is null or p_parts_cost < 0
     or p_labor_cost is null or p_labor_cost < 0 then
    raise exception using errcode = '22023', message = 'Valid maintenance status, costs, and request ID are required';
  end if;

  payload := jsonb_build_object(
    'maintenance_log_id', p_maintenance_log_id,
    'status', p_status,
    'parts_cost', p_parts_cost,
    'labor_cost', p_labor_cost
  );
  previous := private.get_idempotent_response('approve_maintenance', p_request_id, payload);
  if previous is not null then
    return previous;
  end if;

  select * into maintenance
    from public.maintenance_logs
   where id = p_maintenance_log_id
   for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Maintenance log was not found';
  end if;
  if maintenance.status = 'completed' and p_status <> 'completed' then
    raise exception using errcode = 'P0001', message = 'Completed maintenance records cannot move backwards';
  end if;

  total_cost := p_parts_cost + p_labor_cost;
  update public.maintenance_logs
     set status = p_status,
         service_cost = total_cost
   where id = p_maintenance_log_id;

  return private.save_idempotent_response(
    'approve_maintenance',
    p_request_id,
    payload,
    jsonb_build_object('maintenance_log_id', p_maintenance_log_id, 'status', p_status, 'service_cost', total_cost)
  );
end;
$$;

revoke all on function public.approve_maintenance(uuid, text, numeric, numeric, uuid) from public, anon, authenticated;
grant execute on function public.approve_maintenance(uuid, text, numeric, numeric, uuid) to authenticated;

revoke insert on public.inspections, public.daily_reports from authenticated;
