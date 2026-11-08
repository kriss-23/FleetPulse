drop policy if exists inspections_select_own_or_manager on public.inspections;

create policy inspections_select_authorized_roles
on public.inspections for select to authenticated
using (
  driver_id = (select auth.uid())
  or (select private.current_app_role()) in ('manager', 'warehouse', 'accountant')
);
