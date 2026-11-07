# FleetPulse Access Model

This document defines the application and database role model for FleetPulse.
The committed Supabase migrations implement the listed role checks, grants,
RLS policies, RPC authorization, and Storage policies.

## Role Matrix

| Role | Application access | Vehicle and fleet data | Reports and inspections | Financial data | Administrative actions |
|---|---|---|---|---|---|
| Visitor (unauthenticated) | Public landing, login, and registration pages | No access | No access | No access | No access |
| Driver (`driver`) | Driver Dashboard and Daily Report | View assigned vehicle details and status | Perform pre-trip inspections; upload odometer and inspection photos; submit end-of-shift driving hours and issue reports with photos | No access | No access |
| Warehouse Specialist (`warehouse`) | Fleet availability workspace | View vehicle availability and fleet status overview | Inspect cargo weights and types; mark shipping goods loaded or unloaded when the warehouse workflow is enabled | No access | No access |
| Fleet Manager (`manager`) | Manager Admin Panel and system-wide fleet oversight | Full CRUD for vehicles, driver assignments, and route scheduling | Review and approve or deny maintenance requests and vehicle status changes | No default access unless explicitly granted | Manage user roles and fleet operations |
| Accountant (`accountant`) | Accountant Invoice and Expense Portal | Read-only context needed for expense records | No operational write access | Read and download maintenance invoices, fuel receipts, and expense logs | No fleet administration |

## Navigation Rules

- Visitors see only public landing, login, and registration navigation.
- Authenticated users see only navigation permitted by their resolved role.
- Manager and Accountant links remain hidden until the role is resolved through Supabase Auth and the secured `user_roles` source.
- Role checks in the client are for presentation only; database and Storage policies must enforce access.
- Direct navigation to a page must not grant access to protected data.

## Data Protection Requirements

- Use Supabase Auth for identity and session management.
- Store authorization data in a server-controlled role source, not editable user metadata.
- Enforce row-level access with restrictive Supabase policies for every exposed application table.
- Enforce Storage object access with bucket policies and ownership or role predicates.
- Keep all privileged development and migration tools separate from browser application access.
- Never expose service-role keys, secret keys, database passwords, or other privileged credentials in frontend code or `VITE_` environment variables.

## Current Project State

The configured Supabase project reference is `skfnptxtjmsjehikrlma`. The
initial schema, grant-hardening, server-engine, cargo, storage, reassignment,
and accountant migrations are applied and tracked remotely. They create the
operational tables described in
[docs/database-schema.md](./database-schema.md) with RLS enabled. Future
schema changes must use committed migrations and preserve these role
boundaries.
