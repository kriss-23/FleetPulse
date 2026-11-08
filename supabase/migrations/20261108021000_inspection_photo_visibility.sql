drop policy if exists fleet_uploads_driver_select on storage.objects;

create policy fleet_uploads_inspection_select_authorized
on storage.objects for select to authenticated
using (
  bucket_id = 'fleet-uploads'
  and (
    (
      (select private.current_app_role()) = 'driver'
      and (storage.foldername(name))[1] = (select auth.uid())::text
    )
    or (select private.current_app_role()) in ('manager', 'warehouse', 'accountant')
  )
);
