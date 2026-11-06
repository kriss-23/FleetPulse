create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

alter function public.current_app_role() set schema private;
alter function public.handle_new_user() set schema private;

revoke all on function private.current_app_role() from public;
grant execute on function private.current_app_role() to authenticated;
revoke all on function private.handle_new_user() from public;
