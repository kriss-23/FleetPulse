alter extension btree_gist set schema extensions;

drop view if exists public.fleet_status_summary;

create table if not exists public.fleet_status_summary (
  status text primary key
    check (status in ('active', 'maintenance', 'out_of_service')),
  status_label text not null,
  vehicle_count integer not null default 0 check (vehicle_count >= 0),
  available_count integer not null default 0 check (available_count >= 0)
);

insert into public.fleet_status_summary (status, status_label, vehicle_count, available_count)
values
  ('active', 'Active', 0, 0),
  ('maintenance', 'Maintenance', 0, 0),
  ('out_of_service', 'Out of Service', 0, 0)
on conflict (status) do nothing;

update public.fleet_status_summary s
set vehicle_count = source.vehicle_count,
    available_count = source.available_count
from (
  select
    status,
    count(*)::integer as vehicle_count,
    count(*) filter (where status = 'active')::integer as available_count
  from public.vehicles
  group by status
) source
where s.status = source.status;

revoke all on public.fleet_status_summary from anon, authenticated, public;
grant select on public.fleet_status_summary to anon, authenticated;

create or replace function private.refresh_fleet_status_summary()
returns trigger
language plpgsql
security definer
set search_path = private, pg_catalog, public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and (tg_op = 'DELETE' or old.status is distinct from new.status) then
    update public.fleet_status_summary
       set vehicle_count = greatest(vehicle_count - 1, 0),
           available_count = greatest(
             available_count - case when old.status = 'active' then 1 else 0 end,
             0
           )
     where status = old.status;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    update public.fleet_status_summary
       set vehicle_count = vehicle_count + 1,
           available_count = available_count + case when new.status = 'active' then 1 else 0 end
     where status = new.status;
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function private.refresh_fleet_status_summary() from public;

drop trigger if exists vehicles_refresh_fleet_status_summary on public.vehicles;
create trigger vehicles_refresh_fleet_status_summary
after insert or update of status or delete on public.vehicles
for each row execute function private.refresh_fleet_status_summary();

create or replace function private.guard_vehicle_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if current_user <> 'postgres'
     and (old.status is distinct from new.status
          or old.assigned_driver_id is distinct from new.assigned_driver_id) then
    raise exception using
      errcode = '42501',
      message = 'Vehicle status and assignment changes must use FleetPulse RPCs';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_vehicle_mutation() from public;

drop trigger if exists vehicles_guard_controlled_fields on public.vehicles;
create trigger vehicles_guard_controlled_fields
before update on public.vehicles
for each row execute function private.guard_vehicle_mutation();

create or replace function private.guard_maintenance_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if current_user <> 'postgres' then
    raise exception using
      errcode = '42501',
      message = 'Maintenance records must use FleetPulse RPCs';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_maintenance_mutation() from public;

drop trigger if exists maintenance_logs_guard_mutation on public.maintenance_logs;
create trigger maintenance_logs_guard_mutation
before update on public.maintenance_logs
for each row execute function private.guard_maintenance_mutation();

revoke insert, update, delete on public.maintenance_logs from authenticated;
grant select on public.maintenance_logs to authenticated;

create or replace function public.assign_vehicle(
  p_vehicle_id uuid,
  p_driver_id uuid,
  p_shift_date date,
  p_shift_started_at timestamptz,
  p_shift_ended_at timestamptz,
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
  assignment_id uuid;
  payload jsonb;
  previous jsonb;
  attempt integer;
begin
  if caller is null or private.current_app_role() <> 'manager' then
    raise exception using errcode = '42501', message = 'Only fleet managers can assign vehicles';
  end if;
  if p_vehicle_id is null or p_driver_id is null or p_shift_date is null
     or p_shift_started_at is null or p_shift_ended_at is null or p_request_id is null
     or p_shift_ended_at <= p_shift_started_at then
    raise exception using errcode = '22023', message = 'Valid vehicle, driver, shift, and request values are required';
  end if;
  if not exists (
    select 1 from public.user_roles
     where user_id = p_driver_id and role = 'driver'
  ) then
    raise exception using errcode = '42501', message = 'The selected user is not a driver';
  end if;

  payload := jsonb_build_object(
    'vehicle_id', p_vehicle_id,
    'driver_id', p_driver_id,
    'shift_date', p_shift_date,
    'shift_started_at', p_shift_started_at,
    'shift_ended_at', p_shift_ended_at
  );
  previous := private.get_idempotent_response('assign_vehicle', p_request_id, payload);
  if previous is not null then
    return previous;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_vehicle_id::text, 0));
  select * into vehicle from public.vehicles where id = p_vehicle_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Vehicle was not found';
  end if;
  if vehicle.status <> 'active' then
    raise exception using errcode = 'P0001', message = 'Only active vehicles can receive new assignments';
  end if;
  if vehicle.assigned_driver_id is not null and vehicle.assigned_driver_id <> p_driver_id then
    raise exception using errcode = 'P0001', message = 'Vehicle is already assigned to another driver';
  end if;

  update public.vehicles
     set assigned_driver_id = p_driver_id
   where id = p_vehicle_id;

  for attempt in 1..3 loop
    begin
      insert into public.vehicle_assignments (
        vehicle_id, driver_id, shift_date, shift_started_at, shift_ended_at, request_id
      )
      values (
        p_vehicle_id, p_driver_id, p_shift_date, p_shift_started_at, p_shift_ended_at, p_request_id
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

  return private.save_idempotent_response(
    'assign_vehicle',
    p_request_id,
    payload,
    jsonb_build_object('assignment_id', assignment_id, 'vehicle_id', p_vehicle_id, 'driver_id', p_driver_id)
  );
end;
$$;

revoke all on function public.assign_vehicle(uuid, uuid, date, timestamptz, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.assign_vehicle(uuid, uuid, date, timestamptz, timestamptz, uuid) to authenticated;

create or replace function public.create_maintenance_log(
  p_vehicle_id uuid,
  p_report_id uuid,
  p_invoice_pdf_url text,
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
  maintenance_id uuid;
  payload jsonb;
  previous jsonb;
  total_cost numeric;
begin
  if caller is null or private.current_app_role() <> 'manager' then
    raise exception using errcode = '42501', message = 'Only fleet managers can create maintenance logs';
  end if;
  if p_vehicle_id is null or p_request_id is null
     or nullif(trim(p_invoice_pdf_url), '') is null
     or p_parts_cost is null or p_parts_cost < 0
     or p_labor_cost is null or p_labor_cost < 0 then
    raise exception using errcode = '22023', message = 'Valid vehicle, invoice, costs, and request ID are required';
  end if;
  if p_report_id is not null and not exists (
    select 1 from public.daily_reports
     where id = p_report_id and vehicle_id = p_vehicle_id
  ) then
    raise exception using errcode = '22023', message = 'Maintenance report does not belong to the vehicle';
  end if;

  payload := jsonb_build_object(
    'vehicle_id', p_vehicle_id,
    'report_id', p_report_id,
    'invoice_pdf_url', p_invoice_pdf_url,
    'parts_cost', p_parts_cost,
    'labor_cost', p_labor_cost
  );
  previous := private.get_idempotent_response('create_maintenance_log', p_request_id, payload);
  if previous is not null then
    return previous;
  end if;

  total_cost := p_parts_cost + p_labor_cost;
  insert into public.maintenance_logs (
    vehicle_id, report_id, service_cost, invoice_pdf_url, status
  )
  values (
    p_vehicle_id, p_report_id, total_cost, p_invoice_pdf_url, 'pending'
  )
  returning id into maintenance_id;

  return private.save_idempotent_response(
    'create_maintenance_log',
    p_request_id,
    payload,
    jsonb_build_object('maintenance_log_id', maintenance_id, 'service_cost', total_cost, 'status', 'pending')
  );
end;
$$;

revoke all on function public.create_maintenance_log(uuid, uuid, text, numeric, numeric, uuid) from public, anon, authenticated;
grant execute on function public.create_maintenance_log(uuid, uuid, text, numeric, numeric, uuid) to authenticated;
