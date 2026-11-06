# FleetPulse Access Model

This document defines the intended application-level role model for FleetPulse. It is a design reference for future Supabase Auth, database, Storage, and Row Level Security implementation. It does not create tables, policies, or permissions.

## Role Matrix

| Role | Application access | Vehicle and fleet data | Reports and inspections | Financial data | Administrative actions |
|---|---|---|---|---|---|
| Visitor (unauthenticated) | Public landing, login, and registration pages | No access | No access | No access | No access |
| Driver (`driver`) | Driver Dashboard and Daily Report | View assigned vehicle details and status | Perform pre-trip inspections; upload odometer and inspection photos; submit end-of-shift driving hours and issue reports with photos | No access | No access |
| Warehouse Specialist (`warehouse`) | Fleet availability workspace | View vehicle availability and fleet status overview | Inspect cargo weights and types; mark shipping goods loaded or unloaded | No access | No access |
| Fleet Manager (`manager`) | Manager Admin Panel and system-wide fleet oversight | Full CRUD for vehicles, driver assignments, and route scheduling | Review and approve or deny maintenance requests and vehicle status changes | No default access unless explicitly granted | Manage user roles and fleet operations |
| Accountant (`accountant`) | Accountant Invoice and Expense Portal | Read-only context needed for expense records | No operational write access | Read and download maintenance invoices, fuel receipts, and expense logs | No fleet administration |

## Navigation Rules

- Visitors see only public landing, login, and registration navigation.
- Authenticated users see only navigation permitted by their resolved role.
- Manager and Accountant links must remain hidden until role checking is implemented through Supabase Auth and a secured role source.
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

The configured Supabase project reference is `skfnptxtjmsjehikrlma`. The project currently has no reported public tables and no reported migrations through the configured Supabase MCP. Schema, policies, and migrations are intentionally deferred to the database milestone.
