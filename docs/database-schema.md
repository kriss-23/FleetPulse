# FleetPulse database schema

FleetPulse uses Supabase PostgreSQL with foreign keys, checks, indexes,
triggers, Row-Level Security, and server-side RPCs.

## Relationship overview

```text
auth.users
    │ 1:1
    ├── profiles
    │     └──< vehicles.assigned_driver_id
    │
    └──< user_roles

vehicles
    ├──< inspections >── profiles
    ├──< daily_reports >── profiles
    │       └──< maintenance_logs
    ├──< maintenance_logs
    ├──< vehicle_assignments >── profiles
    ├──< vehicle_status_audits >── profiles
    └──< fuel_consumption_logs >── profiles
```

## Main tables

| Table | Purpose | Important protection |
|---|---|---|
| `profiles` | User-facing profile details linked to `auth.users` | Users can view their own profile; managers can view operational profiles |
| `user_roles` | Server-controlled role assignment | Role helper reads this table; editable signup metadata is never trusted |
| `vehicles` | Fleet identity, energy type, readiness, mileage, and fuel/battery snapshot | Status and assignment changes use manager RPCs |
| `inspections` | Driver pre-trip check-in and odometer evidence | Driver submissions use `submit_inspection` |
| `daily_reports` | End-of-shift metrics and issue reports | Driver submissions use `submit_daily_report`; nine-hour limit is enforced server-side |
| `maintenance_logs` | Service costs, invoice references, and approval state | Accountants/managers read; managers update through `approve_maintenance` |
| `vehicle_assignments` | Time-bounded driver/vehicle assignments | GiST exclusion constraint prevents overlapping active assignments |
| `fuel_consumption_logs` | Exact numeric fuel consumption, litre volume, and euro costs | Accountant and manager read access |

## Server-side integrity

- Vehicle status is restricted to `active`, `maintenance`, or
  `out_of_service`.
- Maintenance and out-of-service vehicles cannot receive new route
  assignments.
- Assignment RPCs lock the vehicle and retry bounded exclusion conflicts.
- A passed inspection for the same driver, vehicle, and shift date is required
  before a daily report.
- Daily driving hours are aggregated by driver and shift date and cannot
  exceed nine hours.
- Mutation RPCs use request IDs for idempotency and reject payload reuse.
- Maintenance and fuel calculations use PostgreSQL numeric arithmetic.
- Maintenance service costs, fuel costs, and combined expenses are reported in
  euros; fuel volume is reported in litres.
- The demo fleet uses an `energy_type` value of `combustion` or `electric` so
  fuel and battery labels remain accurate.
- Status changes create audit records.

## Storage

`fleet-uploads` is private. Drivers can upload and access their own
inspection/issue objects under their user-id folder. The `invoices` bucket is
readable only to accountant and manager roles through Storage policies.
Invoice access in the browser uses five-minute signed URLs.

## Migrations

All schema and policy changes are committed under
[supabase/migrations](../supabase/migrations). The local migration filenames and hosted migration history should be checked
after each deployment; the committed SQL remains the source of truth for
reprovisioning the project.
