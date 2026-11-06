create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null check (role in ('manager', 'accountant', 'warehouse', 'driver')),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  license_plate text not null unique,
  brand_model text not null,
  status text not null default 'active'
    check (status in ('active', 'maintenance', 'out_of_service')),
  mileage integer not null default 0 check (mileage >= 0),
  fuel_battery_level integer not null default 100
    check (fuel_battery_level between 0 and 100),
  assigned_driver_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  driver_id uuid not null references public.profiles(id),
  passes_check boolean not null,
  odometer_reading integer not null check (odometer_reading >= 0),
  odometer_photo_url text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  driver_id uuid not null references public.profiles(id),
  driving_hours numeric not null check (driving_hours >= 0),
  end_mileage integer check (end_mileage >= 0),
  fuel_battery_remaining integer check (fuel_battery_remaining between 0 and 100),
  issue_description text,
  issue_urgency text not null default 'none'
    check (issue_urgency in ('none', 'low', 'urgent')),
  issue_photo_url text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table public.maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id),
  report_id uuid references public.daily_reports(id),
  service_cost numeric not null default 0 check (service_cost >= 0),
  invoice_pdf_url text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'completed')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index vehicles_assigned_driver_id_idx on public.vehicles (assigned_driver_id);
create index inspections_vehicle_id_idx on public.inspections (vehicle_id);
create index inspections_driver_id_idx on public.inspections (driver_id);
create index daily_reports_vehicle_id_idx on public.daily_reports (vehicle_id);
create index daily_reports_driver_id_idx on public.daily_reports (driver_id);
create index maintenance_logs_vehicle_id_idx on public.maintenance_logs (vehicle_id);
create index maintenance_logs_report_id_idx on public.maintenance_logs (report_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger vehicles_set_updated_at
before update on public.vehicles
for each row execute function public.set_updated_at();

create trigger maintenance_logs_set_updated_at
before update on public.maintenance_logs
for each row execute function public.set_updated_at();

create or replace function private.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.user_roles
  where user_id = (select auth.uid())
  limit 1;
$$;

revoke all on function private.current_app_role() from public;
grant execute on function private.current_app_role() to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'driver')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
select id, 'driver'
from auth.users
on conflict (user_id) do nothing;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.vehicles enable row level security;
alter table public.inspections enable row level security;
alter table public.daily_reports enable row level security;
alter table public.maintenance_logs enable row level security;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert on public.inspections to authenticated;
grant select, insert on public.daily_reports to authenticated;
grant select, insert, update, delete on public.maintenance_logs to authenticated;

revoke all on public.profiles, public.user_roles, public.vehicles, public.inspections,
  public.daily_reports, public.maintenance_logs from anon, authenticated, public;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert on public.inspections to authenticated;
grant select, insert on public.daily_reports to authenticated;
grant select, insert, update, delete on public.maintenance_logs to authenticated;

create policy profiles_select_own_or_manager
on public.profiles for select to authenticated
using ((select auth.uid()) = id or (select private.current_app_role()) = 'manager');

create policy profiles_insert_own
on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);

create policy profiles_update_own_or_manager
on public.profiles for update to authenticated
using ((select auth.uid()) = id or (select private.current_app_role()) = 'manager')
with check ((select auth.uid()) = id or (select private.current_app_role()) = 'manager');

create policy user_roles_select_own_or_manager
on public.user_roles for select to authenticated
using ((select auth.uid()) = user_id or (select private.current_app_role()) = 'manager');

create policy user_roles_insert_manager
on public.user_roles for insert to authenticated
with check ((select private.current_app_role()) = 'manager');

create policy user_roles_update_manager
on public.user_roles for update to authenticated
using ((select private.current_app_role()) = 'manager')
with check ((select private.current_app_role()) = 'manager');

create policy user_roles_delete_manager
on public.user_roles for delete to authenticated
using ((select private.current_app_role()) = 'manager');

create policy vehicles_select_by_role
on public.vehicles for select to authenticated
using (
  (select private.current_app_role()) in ('manager', 'warehouse', 'accountant')
  or assigned_driver_id = (select auth.uid())
);

create policy vehicles_insert_manager
on public.vehicles for insert to authenticated
with check ((select private.current_app_role()) = 'manager');

create policy vehicles_update_manager
on public.vehicles for update to authenticated
using ((select private.current_app_role()) = 'manager')
with check ((select private.current_app_role()) = 'manager');

create policy vehicles_delete_manager
on public.vehicles for delete to authenticated
using ((select private.current_app_role()) = 'manager');

create policy inspections_select_own_or_manager
on public.inspections for select to authenticated
using (driver_id = (select auth.uid()) or (select private.current_app_role()) = 'manager');

create policy inspections_insert_assigned_driver
on public.inspections for insert to authenticated
with check (
  driver_id = (select auth.uid())
  and exists (
    select 1 from public.vehicles
    where vehicles.id = inspections.vehicle_id
      and vehicles.assigned_driver_id = (select auth.uid())
  )
);

create policy daily_reports_select_own_or_manager
on public.daily_reports for select to authenticated
using (driver_id = (select auth.uid()) or (select private.current_app_role()) = 'manager');

create policy daily_reports_insert_assigned_driver
on public.daily_reports for insert to authenticated
with check (
  driver_id = (select auth.uid())
  and exists (
    select 1 from public.vehicles
    where vehicles.id = daily_reports.vehicle_id
      and vehicles.assigned_driver_id = (select auth.uid())
  )
);

create policy maintenance_logs_select_accountant_or_manager
on public.maintenance_logs for select to authenticated
using ((select private.current_app_role()) in ('accountant', 'manager'));

create policy maintenance_logs_insert_manager
on public.maintenance_logs for insert to authenticated
with check ((select private.current_app_role()) = 'manager');

create policy maintenance_logs_update_manager
on public.maintenance_logs for update to authenticated
using ((select private.current_app_role()) = 'manager')
with check ((select private.current_app_role()) = 'manager');

create policy maintenance_logs_delete_manager
on public.maintenance_logs for delete to authenticated
using ((select private.current_app_role()) = 'manager');
