create or replace function public.reassign_vehicle(
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
    raise exception using errcode = '42501', message = 'Only fleet managers can reassign vehicles';
  end if;
  if p_vehicle_id is null or p_driver_id is null or p_shift_date is null
     or p_shift_started_at is null or p_shift_ended_at is null or p_request_id is null
     or p_shift_ended_at <= p_shift_started_at then
    raise exception using errcode = '22023', message = 'Valid vehicle, driver, shift, and request values are required';
  end if;
  if not exists (
    select 1 from public.user_roles where user_id = p_driver_id and role = 'driver'
  ) then
    raise exception using errcode = '42501', message = 'The selected user is not a driver';
  end if;

  payload := jsonb_build_object(
    'vehicle_id', p_vehicle_id, 'driver_id', p_driver_id,
    'shift_date', p_shift_date, 'shift_started_at', p_shift_started_at,
    'shift_ended_at', p_shift_ended_at
  );
  previous := private.get_idempotent_response('reassign_vehicle', p_request_id, payload);
  if previous is not null then return previous; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_vehicle_id::text, 0));
  select * into vehicle from public.vehicles where id = p_vehicle_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Vehicle was not found'; end if;
  if vehicle.status <> 'active' then
    raise exception using errcode = 'P0001', message = 'Only active vehicles can receive assignments';
  end if;

  for attempt in 1..3 loop
    begin
      insert into public.vehicle_assignments (
        vehicle_id, driver_id, shift_date, shift_started_at, shift_ended_at, request_id
      ) values (
        p_vehicle_id, p_driver_id, p_shift_date, p_shift_started_at, p_shift_ended_at, p_request_id
      ) returning id into assignment_id;
      exit;
    exception when exclusion_violation then
      if attempt = 3 then
        raise exception using errcode = 'P0001', message = 'Vehicle is already assigned during this shift';
      end if;
      perform pg_sleep(0.01 * attempt);
    end;
  end loop;

  update public.vehicles set assigned_driver_id = p_driver_id where id = p_vehicle_id;
  return private.save_idempotent_response(
    'reassign_vehicle', p_request_id, payload,
    jsonb_build_object('assignment_id', assignment_id, 'vehicle_id', p_vehicle_id, 'driver_id', p_driver_id)
  );
end;
$$;

revoke all on function public.reassign_vehicle(uuid, uuid, date, timestamptz, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.reassign_vehicle(uuid, uuid, date, timestamptz, timestamptz, uuid) to authenticated;
