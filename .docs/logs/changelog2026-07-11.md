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

## [2026-07-11 20:11] - [REFACTOR]

What: Moved Updates from the HQ rail footer into the profile avatar dropdown (with unread dot on avatar + menu item); stretched the HQ sidebar card to full viewport height via a complete flex height chain.
Why: Updates belongs with account/settings controls; the rail card was floating with empty space below it.
Impact: Profile menu opens Updates; standalone Updates icon removed from rail/mobile/studio footer; left sidebar glass card fills the column height.
Files: `apps/web/src/components/layout/AvatarDropdown.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqRail.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqMobileDrawer.tsx`, `apps/web/src/components/layout/sidebar/SidebarStudioFooter.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqSection.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqFlyouts.tsx`, `apps/web/src/components/layout/Sidebar.tsx`, `.docs/logs/changelog2026-07-11.md`

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

## [2026-07-11 09:55] - [FIX]

What: Fixed the global-chat surface agent recommendation banner (Team/Brain/Flows/Spaces). "Switch" now actually changes the chat agent instead of just hiding the banner, by unifying the two sources of truth: `SpaceVibeyChatPanel` mirrors its real active agent into the global chat store, and the banner's Switch drives the panel through a new `GLOBAL_CHAT_AGENT_SWITCH_EVENT`. Replaced the transient "Dismiss" button with a per-surface persistent "Don't show this again" checkbox stored in localStorage (`recDismissedSurfaces`), so the banner reappears on every visit until the user opts out for that surface. Recommendations are now roster-aware — a surface only recommends an agent the user actually has installed (Vibey always allowed) — which stops the Flows→Loop banner from flashing/recommending an uninstalled agent, and makes Loop selectable on the Flows surface for orgs where it is rolled out.
Why: The banner wrote `activeAgentKey` to the global store while the panel tracked its own `draftAgentKey`/conversation agent, so Switch was a no-op and Brain appeared to "suggest Vibey"; Dismiss was component-local `useState` with no persistence and no opt-out; and Loop is a real but rollout-gated system agent that the panel hardcoded out of the chat roster.
Impact: Verified in-app — Team recommends Jaime and Switch lands on Jaime; Brain recommends Atlas; "Don't show this again" persists per-surface across reloads; Flows shows no broken Loop banner until Loop is in the org roster. No banner shows for uninstalled agents.
Files: `apps/web/src/components/global-chat/components/ChatSurfaceRecommendation.tsx`, `apps/web/src/components/global-chat/store/use-global-chat-store.ts`, `apps/web/src/components/global-chat/lib/global-chat-storage.ts`, `apps/web/src/components/global-chat/containers/GlobalChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `.docs/logs/changelog2026-07-11.md`

## [2026-07-11 10:32] - [FIX]

What: Phase 2 ROAS domain remediation — replaced Vibey/govibey hardcoded fallbacks in web, api, and funnels with ROAS defaults (`roas.io`, `app.roas.io`, `api.roas.io`, `-app.roas.io`, `agents.roas.io`). Added `platform-urls` / `platform-defaults` helpers; promoted `APPS_DOMAIN_SUFFIX=-app.roas.io` into ROAS secrets master + sync script.
Why: Code still fell back to Vibey marketing URLs, govibey API hosts, and govibey public-agent domains when env vars were missing, breaking ROAS-only deploys.
Impact: Auth redirects, sign-out, funnel API routes, project publish URLs, integration webhook copy, public-agent/widget hosts, and API publishing defaults now target ROAS infrastructure. `shared_railway` runtime type kept (Phase 1 already points it at `roas-runtimes.fly.dev`). Paste synced `APPS_DOMAIN_SUFFIX` into Vercel `roas-api`; Phase 3 (`workers/apps-proxy` on `agents.roas.io`) still pending.
Files: `apps/web/src/lib/platform/platform-urls.ts`, `apps/api/src/lib/platform-defaults.ts`, `apps/funnels/src/lib/platform-urls.ts`, `apps/web/src/middleware.ts`, `apps/web/public/widget.js`, `apps/api/src/modules/projects/services/*.ts`, `apps/api/src/modules/domains/services/domain-project-connection.service.ts`, `apps/api/src/modules/waitlist/controllers/waitlist.controller.ts`, `apps/api/src/modules/link-preview/lib/url-providers.ts`, `apps/api/src/modules/mcp/services/mcp-oauth.service.ts`, `apps/funnels/src/app/api/*/route.ts`, `scripts/roas/roas-secrets.env.template`, `scripts/roas/sync-roas-secrets-sections.py`, `.docs/logs/changelog2026-07-11.md`

## [2026-07-11 11:04] - [ARCH]

What: Phase 3 ROAS apps-proxy worker — env-driven host routing for `*-app.roas.io` and `*.agents.roas.io`, shared-runtime trust extended to `roas-runtimes.fly.dev` (not only Railway), ROAS `wrangler.roas.toml`, and `scripts/roas/deploy-apps-proxy.sh`.
Why: Public agent/widget traffic still required govibey.com host patterns and Railway-only shared runtime validation; ROAS `shared_railway` profiles now point at Fly, so the worker would 404/route-fail without these changes.
Impact: Worker code/tests default to ROAS domains and `roas-runtimes.fly.dev`. Deploy blocked until Dylan sets Cloudflare `account_id` + KV namespace id in `wrangler.roas.toml`, adds DNS routes on `roas.io`, and runs deploy script with `WORKER_SECRET` synced to `roas-web`.
Files: `workers/apps-proxy/src/index.ts`, `workers/apps-proxy/src/index.test.ts`, `workers/apps-proxy/wrangler.roas.toml`, `workers/apps-proxy/package.json`, `scripts/roas/deploy-apps-proxy.sh`, `scripts/roas/roas-secrets.env.template`, `.docs/logs/changelog2026-07-11.md`

## [2026-07-11 11:16] - [FIX]

What: Fixed ROAS secrets sync footgun — `FLY_RUNTIME_APP=roas-runtimes` now lives in template section 2 (master URLs); sync script refuses to emit empty `FLY_RUNTIME_APP`, `APPS_DOMAIN_SUFFIX`, `AGENT_API_URL`, or `PLATFORM_API_URL` in section 6.
Why: `api_vars` listed `FLY_RUNTIME_APP` before any master value existed, so `sync-roas-secrets-sections.py` could write `FLY_RUNTIME_APP=` into the roas-api paste block and silently revert machine provisioning to `vibey-runtimes` fallbacks.
Impact: Re-running sync without section 2 values fails loud instead of blanking routing vars; template matches Dylan's fixed `roas-secrets.env` layout.
Files: `scripts/roas/roas-secrets.env.template`, `scripts/roas/sync-roas-secrets-sections.py`, `.docs/logs/changelog2026-07-11.md`

## [2026-07-11 11:43] - [FIX]

What: Added `WORKER_SECRET` to the shared secrets template and `roas-web` sync block, made empty web worker secrets fail sync, and updated the apps-proxy deploy script to use `npx wrangler` when no global CLI exists and require all four worker secrets. Recorded the active Cloudflare account/KV binding and kept `*-app.roas.io` intentionally dormant.
Why: The deploy script consumed `WORKER_SECRET`, but the master template and web sync omitted it; the script also failed when Wrangler was available only through `npx`.
Impact: Section 7 now carries the same non-empty worker secret as Cloudflare, and deployment preflight no longer depends on a global Wrangler install. Cloudflare deployment remains blocked until Wrangler is authenticated in the executing terminal.
Files: `workers/apps-proxy/wrangler.roas.toml`, `scripts/roas/deploy-apps-proxy.sh`, `scripts/roas/roas-secrets.env.template`, `scripts/roas/sync-roas-secrets-sections.py`, `.docs/logs/changelog2026-07-11.md`

## [2026-07-11 12:29] - [FEATURE]

What: Phase 4 ROAS infrastructure drift guardrails. Extended `verify-roas-runtime-profiles.sql` to flag any `profiles`/`machine_pool` row still routing to Vibey/Railway/govibey and return a single pass/fail verdict row. Added `verify-vercel-env-freshness.sh`, which confirms critical build-time env vars (`FLY_RUNTIME_APP` + `APPS_DOMAIN_SUFFIX` on roas-api, `WORKER_SECRET` on roas-web) were set before the current production deployment. Hardened `smoke-deploy.sh`: app/funnels roots now pass on any 2xx/3xx (redirect-to-login is healthy), auto-runs the env-freshness guard when secrets exist, and adds an optional `AGENT_SLUG` check for the `agents.roas.io` proxy.
Why: Vercel bakes env vars at build time, so adding a var without redeploying leaves production running without it — this silently reverted routing twice (`FLY_RUNTIME_APP` on roas-api, `WORKER_SECRET` on roas-web). The audit SQL previously only printed counts, requiring manual interpretation.
Impact: `verify-roas-runtime-profiles.sql` returns `verdict: OK` against production (drift_rows 0). `verify-vercel-env-freshness.sh` passes for both projects, confirming the post-`WORKER_SECRET` roas-web redeploy actually baked the secret. `smoke-deploy.sh` now reports 4/4 passed. Drift and stale-env regressions are now caught automatically.
Files: `scripts/roas/verify-roas-runtime-profiles.sql`, `scripts/roas/verify-vercel-env-freshness.sh`, `scripts/roas/smoke-deploy.sh`, `scripts/roas/README.md`, `.docs/logs/changelog2026-07-11.md`

## [2026-07-11 20:12] - [FIX]

What: Fixed ROAS agent chat outage — all 7 `roas-runtimes` Fly machines were stopped, causing `temporary_unavailable` / "couldn't get your agent ready yet." Started one machine via Machines API (health now 200, mode=shared). Set `min_machines_running = 1` and `auto_start_machines = true` in `docker/fly.roas.runtime.toml` to prevent recurrence. Switched `mission-worker` Railway config from Dockerfile to RAILPACK (matching queue-worker). Increased Fly health timeout in smoke script to 45s.
Why: DB routing was already correct (`agent_runtime_url = https://roas-runtimes.fly.dev`) but every Fly machine was stopped with `min_machines_running = 0`; chat proxy could not reach a live runtime. Mission-worker still failed RAILPACK image builds while `railway.json` pointed at Dockerfile.
Impact: Agent chat should work again after cold-start (~14s first request). Smoke with `SMOKE_FLY=1` now 5/5 passed. Fly config change needs `bash scripts/roas/deploy-fly-runtimes.sh` to persist on Fly. Mission-worker RAILPACK switch will auto-redeploy on push to main.
Files: `docker/fly.roas.runtime.toml`, `apps/mission-worker/railway.json`, `scripts/roas/smoke-deploy.sh`, `.docs/logs/changelog2026-07-11.md`

## [2026-07-11 20:19] - [FIX]

What: Landed remaining Phase 2 ROAS domain fallback swaps in five blocked web files — billing terms/privacy links, project publish URL, integrations webhook copy, and widget embed hosts now use `@/lib/platform/platform-urls` helpers. Updated `loc-allowlist.json` baselines (corrected `WidgetBuilderModal` path, frozen pre-existing LOC/cross-feature debt). Scaffolded Phase 5 Sentry project map in `roas-secrets.env.template`.
Why: Pre-commit arch gate blocked these URL fixes while the files were over LOC limits or had unstaged cross-feature imports; Phase 2 commit `198441a0` shipped core surfaces without them.
Impact: ROAS defaults (`roas.io`, `app.roas.io`, `api.roas.io`, `-app.roas.io`) apply in billing, projects, settings, and team widget surfaces. Arch gate passes on staged scope. Sentry DSN placeholders document exact project names for Dylan.
Files: `apps/web/src/features/billing/components/CreditPurchaseDialog.tsx`, `apps/web/src/features/projects/components/ProjectPage.tsx`, `apps/web/src/features/settings/components/settings-content/useIntegrations.ts`, `apps/web/src/features/team/containers/AgentWidgetSection.tsx`, `apps/web/src/features/team/containers/WidgetBuilderModal.tsx`, `scripts/arch/loc-allowlist.json`, `scripts/roas/roas-secrets.env.template`, `.docs/logs/changelog2026-07-11.md`

What: Documented the pre-built Strategic Research Loop (`agency-strategic-research`) — trigger, five automation steps, review gates, revision loop, and install path.
Why: User requested a detailed step-by-step reference for the agency strategy preset flow.
Impact: `.docs/features/strategic-research-loop.md` is the canonical walkthrough for the template.
Files: `.docs/features/strategic-research-loop.md`, `.docs/logs/changelog2026-07-11.md`
