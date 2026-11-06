alter table public.fleet_status_summary enable row level security;

create policy fleet_status_summary_public_select
on public.fleet_status_summary
for select
to anon, authenticated
using (true);
