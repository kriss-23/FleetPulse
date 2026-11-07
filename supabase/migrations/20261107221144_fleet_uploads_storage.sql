insert into storage.buckets (id, name, public)
values ('fleet-uploads', 'fleet-uploads', false)
on conflict (id) do update set public = false;

drop policy if exists fleet_uploads_driver_insert on storage.objects;
create policy fleet_uploads_driver_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'fleet-uploads'
  and (select private.current_app_role()) = 'driver'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists fleet_uploads_driver_select on storage.objects;
create policy fleet_uploads_driver_select
on storage.objects for select to authenticated
using (
  bucket_id = 'fleet-uploads'
  and (select private.current_app_role()) = 'driver'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists fleet_uploads_driver_delete on storage.objects;
create policy fleet_uploads_driver_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'fleet-uploads'
  and (select private.current_app_role()) = 'driver'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
