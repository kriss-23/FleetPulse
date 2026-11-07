# Render deployment

FleetPulse is a Vite multi-page static site. Render should build the project
and publish the generated `dist` directory.

## Render settings

The repository includes [render.yaml](../render.yaml), which defines:

- Environment: Static Site
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- SPA fallback: disabled; each HTML page is a real entry point

If configuring the service manually, use the same values.

## Environment variables

Set these variables in the Render service dashboard:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `VITE_DEMO_PASSWORD` | Optional evaluator-only quick-login password |

Do not set `SUPABASE_SERVICE_ROLE_KEY`, database passwords, or other
privileged credentials on a static frontend service. Those belong only in the
local server-side seed `.env` file.

## Verification checklist

1. Apply and verify all committed Supabase migrations.
2. Confirm the five demo roles and Storage policies in the intended project.
3. Run `npm run build` locally.
4. Deploy the Render service.
5. Test `/index.html`, `/driver.html`, `/report.html`, `/admin.html`,
   `/accountant.html`, `/privacy.html`, `/legal_notice.html`, and `/faq.html`.
6. Verify that direct access to manager/accountant pages without the correct
   role shows an access error and exposes no protected data.
7. Test a driver image upload and an accountant signed invoice link.
