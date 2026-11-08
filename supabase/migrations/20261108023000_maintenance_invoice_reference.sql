create or replace function public.set_maintenance_invoice_reference(
  p_maintenance_log_id uuid,
  p_invoice_pdf_url text,
  p_request_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = private, pg_catalog, public
as $$
declare
  maintenance_id uuid;
begin
  if auth.uid() is null or private.current_app_role() <> 'manager' then
    raise exception using errcode = '42501', message = 'Only fleet managers can update invoice references';
  end if;
  if p_maintenance_log_id is null or p_request_id is null
     or p_invoice_pdf_url is null
     or p_invoice_pdf_url !~ '^invoices/demo/[A-Za-z0-9._-]+\.pdf$' then
    raise exception using errcode = '22023', message = 'A valid demo invoice reference is required';
  end if;

  update public.maintenance_logs
     set invoice_pdf_url = p_invoice_pdf_url
   where id = p_maintenance_log_id
  returning id into maintenance_id;

  if maintenance_id is null then
    raise exception using errcode = 'P0002', message = 'Maintenance log was not found';
  end if;

  return jsonb_build_object('maintenance_log_id', maintenance_id, 'invoice_pdf_url', p_invoice_pdf_url);
end;
$$;

revoke all on function public.set_maintenance_invoice_reference(uuid, text, uuid) from public, anon;
grant execute on function public.set_maintenance_invoice_reference(uuid, text, uuid) to authenticated;
