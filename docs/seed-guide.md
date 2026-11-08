# FleetPulse demo seed

`scripts/seed-demo.mjs` creates repeatable demo data for the dedicated Supabase
project. It uses the Supabase Auth Admin API and the service-role key only from
a server-side `.env` file. It never writes credentials to frontend files,
bundles, logs, or Git.

## Preparation

1. Apply the committed migrations to the intended Supabase project.
2. Apply the committed Storage migrations. The private `invoices` bucket is
   created by migration and the seed generates small demo PDF invoices when
   local invoice assets are unavailable.
3. Put local assets in `scripts/assets/` using the filenames listed by the
   script when they are unavailable.
4. Create `.env` in the repository root. Do not use `.env.local` for this
   script:

```env
SUPABASE_URL=https://skfnptxtjmsjehikrlma.supabase.co
SUPABASE_PROJECT_REF=skfnptxtjmsjehikrlma
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
FLEETPULSE_DEMO_PASSWORD=choose-a-local-demo-password
```

The script refuses to run if the URL or project reference is not the dedicated
FleetPulse project. The service-role key and demo password must never be
committed or pasted into Render frontend environment variables.

## Run

Preview the records and report missing local assets without writing anything:

```powershell
node scripts/seed-demo.mjs --dry-run
```

Seed the project:

```powershell
node scripts/seed-demo.mjs
```

Reruns are idempotent for seeded records. Existing Auth users are reused,
their passwords are not changed, and their email addresses are confirmed
without sending email. Existing unrelated records are preserved.

The seed includes active, scheduled-maintenance, and urgent-repair vehicles,
cargo profiles, historical inspections, a report over nine driving hours for
the alert UI, pending/approved maintenance records, and demo invoice PDFs.
Missing image asset filenames are reported; the script never stores fabricated
external URLs.
