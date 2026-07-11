# Changelog - July 11, 2026

## [2026-07-11 08:52] - [FIX]

What: Made Home dashboard v4 responsive — template picker switches to a 2-column grid on mobile and a scrollable row on tablet; composer footer, recommendation banner, card grid, and column padding adapt at mobile/tablet breakpoints.
Why: The original mockup layout used fixed-width fan cards and desktop-only spacing that overflowed on narrow viewports.
Impact: `/home` fits phone and tablet widths without horizontal scroll; desktop fan layout is unchanged at 960px+.
Files: `apps/web/src/components/home-dashboard-v4/HomeTemplateFan.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Shell.tsx`, `apps/web/src/app/(dashboard)/home/home-dashboard-content.tsx`, `apps/web/src/app/globals.css`, `.docs/logs/changelog2026-07-11.md`

## [2026-07-11 09:01] - [FIX]

What: Fixed HQ sidebar navigation — rail clicks now call `router.push` explicitly for Home/Team/Spaces/Brain/Flows/Projects; hover flyouts are anchored to the 72px rail column so they no longer block rail clicks; Projects only prevents default when toggling an already-open panel.
Why: Flyout panels were positioned from a wider flex container and could intercept rail clicks; some panel handlers never routed to the section page.
Impact: Sidebar icons navigate to the correct section again; section clicks also expand the global chat rail where intended.
Files: `apps/web/src/components/layout/sidebar/SidebarHqRail.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqSection.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqFlyouts.tsx`, `.docs/logs/changelog2026-07-11.md`

## [2026-07-11 09:15] - [FEATURE]

What: Added Gemini dual-key support — `GEMINI_API_KEY` (primary) with optional `GEMINI_API_KEY_FALLBACK` for 401/403 failures. Wired into brain embedding services (api + agent-api), import backfill script, ROAS secrets template, and sync script. ROAS secrets now use the working key as primary and the previously denied project key as fallback.
Why: ROAS Gemini project returned 403 PERMISSION_DENIED after billing; a second API key from another project works.
Impact: Embedding backfill and runtime brain embeddings try primary first, then fallback on key-level auth errors. ~726 memories still need vectors once backfill runs.
Files: `packages/api-shared/src/services/gemini-api-keys.ts`, `apps/api/src/modules/brain/services/embedding.service.ts`, `apps/agent-api/src/modules/brain/services/embedding.service.ts`, `scripts/import-user-brain/backfill-embeddings.ts`, `scripts/roas/roas-secrets.env.template`, `scripts/roas/sync-roas-secrets-sections.py`, `apps/agent-api/.env.example`, `.docs/logs/changelog2026-07-11.md`

## [2026-07-11 09:25] - [FIX]

What: Corrected ROAS Gemini key chain to use only ROAS-owned keys in order Key 3 → Key 2 → Key 1 (`GEMINI_API_KEY`, `GEMINI_API_KEY_FALLBACK`, `GEMINI_API_KEY_FALLBACK_2`). Removed mistaken Vibey dev key from `roas-secrets.env`.
Why: Previous agent incorrectly copied `apps/api/.env` (Vibey dev) into ROAS secrets; user provided ROAS keys for dylanvanas@gmail.com and dylan@dylanvanas.com accounts.
Impact: ROAS embedding/runtime tries Key 3 first, falls back to Key 2 (working), then Key 1. Vibey dev key no longer used for ROAS.
Files: `packages/api-shared/src/services/gemini-api-keys.ts`, `scripts/roas/roas-secrets.env`, `scripts/roas/roas-secrets.env.template`, `scripts/roas/sync-roas-secrets-sections.py`, `apps/api/src/modules/brain/services/embedding.service.ts`, `apps/agent-api/src/modules/brain/services/embedding.service.ts`, `.docs/logs/changelog2026-07-11.md`

## [2026-07-11 09:26] - [FIX]

What: Set dylanvanas@gmail.com ROAS Gemini key (Key 2) as sole active `GEMINI_API_KEY`; cleared parked fallbacks for dylan@dylanvanas.com keys (Key 3 + original Key 1) until billing/access is fixed.
Why: dylan@dylanvanas.com project keys return 403/billing errors; Key 2 is the only working ROAS key.
Impact: ROAS local scripts and secrets use one active key only; fallback chain dormant until keys are re-added.
Files: `scripts/roas/roas-secrets.env`, `scripts/roas/roas-secrets.env.template`, `.docs/logs/changelog2026-07-11.md`

## [2026-07-11 09:41] - [FIX]

What: ROAS runtime infrastructure drift remediation — migration backfills `profiles.agent_runtime_url` from Vibey Railway to `https://roas-runtimes.fly.dev`, updates `fly_runtime_app` / `machine_pool` defaults, and patches `acquire_provision_lock` to default production to `roas-runtimes`. Added `FLY_RUNTIME_APP=roas-runtimes` to ROAS secrets template/sync; changed code fallbacks from `vibey-runtimes` to `roas-runtimes` in machines services and web chat proxy.
Why: Chat failed with `temporary_unavailable` / "couldn't get your agent ready" because DB defaults and code fallbacks still routed to Vibey Railway and `vibey-runtimes` despite ROAS Fly/Vercel secrets being correct.
Impact: Production Supabase now has 1/1 `shared_railway` profiles on `roas-runtimes.fly.dev`; new signups inherit ROAS Fly URL; machine provisioning defaults to `roas-runtimes` when env/row is empty. Paste `FLY_RUNTIME_APP=roas-runtimes` into Vercel `roas-api` to complete env layer.
Files: `supabase/migrations/20260711164000_roas_runtime_infrastructure_defaults.sql`, `scripts/roas/migration-order.txt`, `scripts/roas/roas-secrets.env.template`, `scripts/roas/sync-roas-secrets-sections.py`, `scripts/roas/verify-roas-runtime-profiles.sql`, `apps/api/src/modules/machines/services/machines-service-01.base.ts`, `apps/api/src/modules/machines/services/machine-reconciliation.service.ts`, `apps/web/src/app/api/proxy/[...path]/route.ts`, `.docs/logs/changelog2026-07-11.md`
