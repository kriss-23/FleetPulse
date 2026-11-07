create table if not exists public.vehicle_cargo_profiles (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null unique references public.vehicles(id) on delete cascade,
  cargo_type text not null,
  max_cargo_kg numeric(12, 2) not null check (max_cargo_kg >= 0),
  current_cargo_kg numeric(12, 2) not null default 0
    check (current_cargo_kg >= 0 and current_cargo_kg <= max_cargo_kg),
  load_status text not null default 'unloaded'
    check (load_status in ('loaded', 'unloaded')),
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists vehicle_cargo_profiles_vehicle_id_idx
  on public.vehicle_cargo_profiles (vehicle_id);

drop trigger if exists vehicle_cargo_profiles_set_updated_at on public.vehicle_cargo_profiles;
create trigger vehicle_cargo_profiles_set_updated_at
before update on public.vehicle_cargo_profiles
for each row execute function public.set_updated_at();

alter table public.vehicle_cargo_profiles enable row level security;

revoke all on public.vehicle_cargo_profiles from anon, authenticated, public;
grant select on public.vehicle_cargo_profiles to authenticated;
grant insert, update on public.vehicle_cargo_profiles to authenticated;

create policy vehicle_cargo_profiles_select_operations
on public.vehicle_cargo_profiles for select to authenticated
using ((select private.current_app_role()) in ('manager', 'warehouse'));

create policy vehicle_cargo_profiles_insert_operations
on public.vehicle_cargo_profiles for insert to authenticated
with check ((select private.current_app_role()) in ('manager', 'warehouse'));

create policy vehicle_cargo_profiles_update_operations
on public.vehicle_cargo_profiles for update to authenticated
using ((select private.current_app_role()) in ('manager', 'warehouse'))
with check ((select private.current_app_role()) in ('manager', 'warehouse'));
