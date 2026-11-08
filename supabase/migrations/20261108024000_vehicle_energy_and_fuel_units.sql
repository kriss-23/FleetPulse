alter table public.vehicles
  add column if not exists energy_type text not null default 'combustion'
  check (energy_type in ('combustion', 'electric'));

update public.vehicles
set energy_type = 'electric'
where brand_model ilike '%E-Tech%';

create or replace function public.get_monthly_fleet_expense_summary(
  p_month_start date,
  p_month_end date
)
returns jsonb
language plpgsql
security definer
set search_path = private, pg_catalog, public
as $$
declare
  maintenance_total numeric;
  fuel_cost numeric;
  fuel_litres numeric;
  caller uuid := (select auth.uid());
begin
  if caller is null or private.current_app_role() not in ('accountant', 'manager') then
    raise exception using errcode = '42501', message = 'Accountant or manager access is required';
  end if;
  if p_month_start is null or p_month_end is null or p_month_end <= p_month_start then
    raise exception using errcode = '22023', message = 'A valid monthly date range is required';
  end if;

  select coalesce(sum(service_cost), 0)
    into maintenance_total
    from public.maintenance_logs
   where created_at >= p_month_start::timestamptz
     and created_at < p_month_end::timestamptz;

  select coalesce(sum(total_cost), 0), coalesce(sum(consumed_level), 0)
    into fuel_cost, fuel_litres
    from public.fuel_consumption_logs
   where shift_date >= p_month_start
     and shift_date < p_month_end;

  return jsonb_build_object(
    'month_start', p_month_start,
    'month_end', p_month_end,
    'maintenance_total', to_char(maintenance_total, 'FM999999999999990.0000'),
    'fuel_cost', to_char(fuel_cost, 'FM999999999999990.0000'),
    'fuel_litres', to_char(fuel_litres, 'FM999999999999990.0000'),
    'combined_total', to_char(maintenance_total + fuel_cost, 'FM999999999999990.0000')
  );
end;
$$;
