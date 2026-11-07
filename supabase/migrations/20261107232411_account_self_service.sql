alter table public.inspections
  alter column driver_id drop not null;
alter table public.inspections
  drop constraint if exists inspections_driver_id_fkey;
alter table public.inspections
  add constraint inspections_driver_id_fkey
  foreign key (driver_id) references public.profiles(id) on delete set null;

alter table public.daily_reports
  alter column driver_id drop not null;
alter table public.daily_reports
  drop constraint if exists daily_reports_driver_id_fkey;
alter table public.daily_reports
  add constraint daily_reports_driver_id_fkey
  foreign key (driver_id) references public.profiles(id) on delete set null;

alter table public.vehicle_assignments
  alter column driver_id drop not null;
alter table public.vehicle_assignments
  drop constraint if exists vehicle_assignments_driver_id_fkey;
alter table public.vehicle_assignments
  add constraint vehicle_assignments_driver_id_fkey
  foreign key (driver_id) references public.profiles(id) on delete set null;

alter table public.vehicle_status_audits
  alter column changed_by drop not null;
alter table public.vehicle_status_audits
  drop constraint if exists vehicle_status_audits_changed_by_fkey;
alter table public.vehicle_status_audits
  add constraint vehicle_status_audits_changed_by_fkey
  foreign key (changed_by) references public.profiles(id) on delete set null;

alter table public.fuel_consumption_logs
  alter column driver_id drop not null;
alter table public.fuel_consumption_logs
  drop constraint if exists fuel_consumption_logs_driver_id_fkey;
alter table public.fuel_consumption_logs
  add constraint fuel_consumption_logs_driver_id_fkey
  foreign key (driver_id) references public.profiles(id) on delete set null;

create or replace function private.delete_current_account()
returns jsonb
language plpgsql
security definer
set search_path = private, pg_catalog, public
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception using errcode = '42501', message = 'You must be signed in to delete your account';
  end if;

  delete from storage.objects
   where bucket_id = 'fleet-uploads'
     and name like caller::text || '/%';

  delete from auth.users where id = caller;
  if not found then
    raise exception using errcode = 'P0002', message = 'Account was not found';
  end if;

  return jsonb_build_object('deleted', true);
end;
$$;

revoke all on function private.delete_current_account() from public, anon, authenticated;
grant execute on function private.delete_current_account() to authenticated;

create or replace function public.delete_current_account()
returns jsonb
language sql
security invoker
set search_path = public, pg_catalog
as $$
  select private.delete_current_account();
$$;

revoke all on function public.delete_current_account() from public, anon, authenticated;
grant execute on function public.delete_current_account() to authenticated;
