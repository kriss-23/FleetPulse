# FleetPulse

FleetPulse is a multi-page logistics dashboard for managing company vehicles,
driver assignments, pre-trip inspections, daily shift reports, maintenance
records, invoices, and fleet expenses. It was developed for SoftUni's
"Software Technologies with AI" capstone project.

## Project information

| Item | Value |
|---|---|
| Author | Kristiyan Ivanov |
| Email | kriss.ivanov@yahoo.com |
| GitHub repository | https://github.com/kriss-23/FleetPulse |
| Live project URL | https://fleetpulse-t4yf.onrender.com |
| Supabase project | FleetPulse demo project |

Do not commit passwords, service-role keys, database passwords, or private
deployment values to this repository.

## Roles and screens

- **Visitor:** landing page, login, and registration.
- **Driver:** assigned vehicle dashboard, pre-trip inspection upload, and daily
  shift report with issue photo upload.
- **Fleet Manager:** vehicle status, driver assignment/reassignment, and
  maintenance approval/completion.
- **Accountant:** read-only maintenance invoices and exact monthly maintenance
  and fuel expense totals.
- **Warehouse Specialist:** role is supported in the access model and demo
  seed; warehouse workflows are intentionally limited to the current
  milestone scope.

The application uses separate HTML entry points:

`index.html`, `driver.html`, `report.html`, `admin.html`, `accountant.html`,
`privacy.html`, `legal_notice.html`, and `faq.html`.

## Technology and architecture

- Vanilla JavaScript ES modules, HTML, and CSS
- Bootstrap 5 and Bootstrap Icons
- Vite multi-page build
- Supabase Auth, PostgreSQL, Row-Level Security, and private Storage
- Render Static Site deployment
- Shared UI components in `src/components`
- Page modules in `src/pages`
- Supabase access isolated in `src/services`
- Committed SQL migrations in `supabase/migrations`

Server-side policies and RPCs are the authorization source of truth. Client
role checks only control presentation and provide an early user-friendly
error. The browser only reads `VITE_SUPABASE_URL` and a publishable/anon key.

## Database overview

The core schema includes `profiles`, `user_roles`, `vehicles`, `inspections`,
`daily_reports`, and `maintenance_logs`. The reporting engine also uses
`vehicle_assignments`, `vehicle_status_audits`, `fuel_consumption_logs`, and
request-idempotency records. See
[docs/database-schema.md](./docs/database-schema.md) for relationships,
constraints, indexes, and RLS boundaries.

## Local development

Requirements: Node.js 20+ and npm.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Set the frontend values in `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Never put `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` or any `VITE_` variable.
The server-only demo seed uses a separate root `.env` file; see
[docs/seed-guide.md](./docs/seed-guide.md).

Useful commands:

```powershell
npm run build
npm run preview
node scripts/seed-demo.mjs --dry-run
```

## Demo accounts

The seed creates these confirmed demo email addresses:

- `manager.demo@fleetpulse.local`
- `accountant.demo@fleetpulse.local`
- `warehouse.demo@fleetpulse.local`
- `driver.one.demo@fleetpulse.local`
- `driver.two.demo@fleetpulse.local`

The password is chosen through the server-only `FLEETPULSE_DEMO_PASSWORD`
environment variable and is intentionally not committed. Configure the same
value as `VITE_DEMO_PASSWORD` only when enabling the optional quick-login
helper for a local or Render demo environment.

## Deployment

The committed [render.yaml](./render.yaml) defines the Render Static Site
build (`npm ci && npm run build`) and publishes `dist`. In Render, set the
following frontend environment variables on the service:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- optionally `VITE_DEMO_PASSWORD` for the evaluator quick-login helper

Use the Supabase project URL and publishable key only. Never add a
service-role key to Render frontend environment variables. See
[docs/deployment.md](./docs/deployment.md) for the deployment checklist.

## Documentation

- [Implementation plan](./docs/implementation-plan.md)
- [Access model and RBAC](./docs/access-model.md)
- [Database schema](./docs/database-schema.md)
- [Deployment guide](./docs/deployment.md)
- [Demo seed guide](./docs/seed-guide.md)
- [Agent instructions](./.github/copilot-instructions.md)
