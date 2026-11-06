---
description: "Project-wide FleetPulse instructions for vanilla JavaScript, Vite, Bootstrap, Supabase, multi-page architecture, security, accessibility, milestone scope, and validation."
---

# FleetPulse Project Guidelines

## Project Scope

- FleetPulse is a logistics dashboard for company vehicles, service logs, driver assignments, and inspection checklists.
- Implement only the current milestone. Do not add application features unless they are explicitly included in that milestone.
- Preserve existing working code and unrelated changes.
- Keep the implementation aligned with [docs/implementation-plan.md](../docs/implementation-plan.md).

## Technology and Architecture

- Use HTML, CSS, and vanilla JavaScript ES modules only.
- Use Bootstrap for shared responsive UI primitives.
- Use Node.js, npm, and Vite for local development and builds.
- Use Supabase Database, Auth, and Storage through browser-safe client configuration only.
- Use a genuine multi-page application with separate HTML entry files for the five application screens:
  Login/Register, Driver Dashboard, Daily Report/Check-in, Manager Admin Panel, and Accountant Invoice Portal.
- Organize reusable code into shared components, services, and utilities.
- Keep authorization and booking integrity enforced by Supabase database policies and constraints, not only by client-side checks.
- Keep committed SQL migrations synchronized with the remote migration history.

## Security and Data Handling

- Never invent credentials or deployment URLs.
- Never expose Supabase service-role or other privileged keys in browser code.
- Render user-controlled content safely; do not inject untrusted strings as raw HTML.
- Define and maintain Row Level Security policies for the five application tables.
- Surface validation, authentication, storage, and database errors explicitly using the project’s established UI and logging patterns.

## Product Rules

- Roles are Fleet Manager, Accountant, Warehouse Specialist, and Driver.
- Use the traffic-light status system consistently:
  - Green: Active/Ready
  - Yellow: Scheduled Maintenance
  - Red: Urgent Repair / Out of Service
- Enforce the maximum nine daily driving hours by calculating alerts from shift logs.
- Support driver pre-trip odometer readings and inspection photo uploads to Supabase Storage.
- Support end-of-shift driving hours, mileage, fuel/battery level, and issue reporting.
- Build accessible, responsive interfaces with clear labels, keyboard support, and useful validation feedback.

## Validation and Delivery

- After each successful milestone, run the relevant checks and the build when available.
- Review the diff before committing and commit only changes belonging to that milestone.
- Push to the configured remote when one is available.
- Never force-push, backdate commits, or manufacture Git history.
- Report checks honestly, including checks that could not be run.
