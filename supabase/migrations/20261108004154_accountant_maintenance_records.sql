create or replace function public.get_accountant_maintenance_records(
  p_invoice_id uuid default null,
  p_vehicle_id uuid default null
)
returns table (
  id uuid,
  vehicle_id uuid,
  report_id uuid,
  service_cost numeric,
  invoice_pdf_url text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  license_plate text,
  brand_model text
)
language plpgsql
security definer
set search_path = private, pg_catalog, public
as $$
begin
  if auth.uid() is null or private.current_app_role() not in ('accountant', 'manager') then
    raise exception using errcode = '42501', message = 'Accountant or manager access is required';
  end if;

  return query
    select
      maintenance.id,
      maintenance.vehicle_id,
      maintenance.report_id,
      maintenance.service_cost,
      maintenance.invoice_pdf_url,
      maintenance.status,
      maintenance.created_at,
      maintenance.updated_at,
      vehicle.license_plate,
      vehicle.brand_model
    from public.maintenance_logs as maintenance
    join public.vehicles as vehicle on vehicle.id = maintenance.vehicle_id
    where (p_invoice_id is null or maintenance.id = p_invoice_id)
      and (p_vehicle_id is null or maintenance.vehicle_id = p_vehicle_id)
    order by maintenance.created_at desc;
end;
$$;

revoke all on function public.get_accountant_maintenance_records(uuid, uuid) from public, anon;
grant execute on function public.get_accountant_maintenance_records(uuid, uuid) to authenticated;
