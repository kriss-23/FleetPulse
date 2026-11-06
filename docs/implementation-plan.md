# FleetPulse Implementation Plan

## Purpose

FleetPulse is a multi-page logistics dashboard for managing company vehicles, service logs, driver assignments, inspection checklists, daily reports, and invoices. This plan defines the implementation sequence for the capstone project.

## Technology Baseline

- HTML, CSS, and vanilla JavaScript ES modules
- Bootstrap for responsive layout and accessible UI primitives
- Node.js, npm, and Vite
- Supabase Database, Auth, and Storage
- Render Static Site deployment
- No TypeScript, React, or Vue

## Architecture

The application will use a genuine multi-page structure with separate Vite HTML entry files. Shared JavaScript modules will provide reusable components, Supabase services, validation, status formatting, authorization helpers, and safe rendering utilities. Database authorization and booking integrity will be enforced with Supabase Row Level Security policies and database constraints.

Planned screens:

1. Login/Register
2. Driver Dashboard
3. Daily Report/Check-in
4. Manager Admin Panel
5. Accountant Invoice Portal

## Milestones

### Milestone 0: Project foundation

- Establish the Vite project structure and npm scripts.
- Add the five HTML entry files and shared asset/module directories.
- Document environment-variable expectations without adding credentials.
- Define the migration workflow and local validation commands.
- Confirm Render Static Site build and publish settings without inventing deployment URLs.

**Exit criteria:** The project builds with the intended multi-page entry points, contains no privileged browser credentials, and has documented local setup.

### Milestone 1: Database and access control

- Define the five application tables and their relationships.
- Add committed SQL migrations for schema, constraints, indexes, and RLS policies.
- Define role-aware access for Fleet Manager, Accountant, Warehouse Specialist, and Driver.
- Synchronize local migration files with remote migration history.

**Exit criteria:** Required roles can access only permitted records, booking integrity is database-enforced, and migrations can be applied reproducibly.

### Milestone 2: Authentication and shared UI foundation

- Implement Supabase Auth for login, registration, session restoration, and sign-out.
- Add shared navigation, layout, loading, empty, error, and form-validation states.
- Add safe user-content rendering and accessible responsive patterns.

**Exit criteria:** Authenticated users reach the correct role-appropriate screen and unauthenticated users cannot access protected screens.

### Milestone 3: Vehicle and service management

- Implement vehicle records, service logs, assignments, and inspection checklist data flows.
- Apply the Green/Yellow/Red traffic-light status system consistently.
- Add Manager Admin Panel workflows for authorized users.

**Exit criteria:** Managers can manage the permitted fleet data and status changes persist through authorized database operations.

### Milestone 4: Driver check-in and daily reporting

- Implement pre-trip odometer and inspection check-in.
- Upload inspection photos to Supabase Storage with safe file validation.
- Implement end-of-shift reports for driving hours, mileage, fuel/battery level, and issues.
- Calculate and display alerts when daily driving exceeds nine hours.

**Exit criteria:** Driver submissions are validated, stored under the correct access policies, and produce accurate legal-limit alerts.

### Milestone 5: Accountant invoice portal

- Implement invoice-related views and workflows for Accountant users.
- Restrict financial records through database policies and role checks.
- Add clear loading, error, and empty states.

**Exit criteria:** Accountants can perform only permitted invoice operations and other roles cannot access protected financial data.

### Milestone 6: Verification and deployment

- Run targeted checks, linting, and the production build.
- Verify all multi-page routes, role boundaries, RLS behavior, storage rules, and responsive accessibility.
- Configure Render Static Site deployment using documented environment variables.
- Review the final diff and commit only milestone-related changes.

**Exit criteria:** The production build succeeds, deployment configuration is documented, and all reported checks are reproducible.

## Non-Negotiable Constraints

- Implement only the active milestone.
- Do not invent credentials, deployment URLs, or remote migration history.
- Never expose privileged Supabase keys in browser code.
- Treat all user content as untrusted.
- Preserve unrelated working code and changes.
- Report validation results honestly.
