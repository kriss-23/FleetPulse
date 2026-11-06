revoke all on public.profiles, public.user_roles, public.vehicles, public.inspections,
  public.daily_reports, public.maintenance_logs from anon, authenticated, public;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert on public.inspections to authenticated;
grant select, insert on public.daily_reports to authenticated;
grant select, insert, update, delete on public.maintenance_logs to authenticated;
