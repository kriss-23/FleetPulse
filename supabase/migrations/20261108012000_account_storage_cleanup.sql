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
