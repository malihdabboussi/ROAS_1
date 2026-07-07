# Changelog - July 07, 2026

## [2026-07-07 01:15] - [ARCH]

What: Applied the full VibeyV2 SQL migration set (`supabase/schema.sql` + ~745 migration files) to the standalone ROAS production Supabase DB (`roas-production`, ref `lhfgtsjetcardinpgouq`). Built a chronological order file (`scripts/roas/migration-order.txt`) keyed on UTC filename timestamps (falling back to git-add date for `NNN_`-style files) and a fault-tolerant runner (`scripts/roas/apply-migrations-resilient.sh`) that applies each file statement-by-statement so a single missing dependency does not abort the whole file.
Why: ROAS needs the Vibey schema on its own DB. The migration corpus mixes two numbering schemes (`NNN_` legacy + 14-digit timestamped) that do not lexically sort into their true chronological/dependency order, and several early files have forward-reference bugs that only worked historically because the objects already existed in Vibey's live DB.
Impact: Converged at **285 tables, 276 functions, 809 RLS policies**. All core app tables present (profiles, organizations, org_members, campaigns, spaces, space_items, brains, ns_memories, funnels, missions, presentations, contacts, agent_definitions, agents_registry, user_integrations, forms). Fixed a real forward-reference bug in `20260327100000_create_organizations_foundation.sql` (moved the "Org members can read org" policy to after `org_members` is created). Added `000_enable_extensions.sql` + `000a_uuid_public_wrappers.sql` bootstrap (uuid-ossp/vector in `extensions` schema + `public.uuid_generate_v4/v1` wrappers for legacy migrations).
Files: `scripts/roas/apply-migrations-resilient.sh` (new), `scripts/roas/migration-order.txt` (new), `supabase/migrations/000_enable_extensions.sql` (new), `supabase/migrations/000a_uuid_public_wrappers.sql` (new), `supabase/migrations/20260327100000_create_organizations_foundation.sql` (forward-ref fix), `scripts/roas/.applied.log` + `.failed-final.log` + `.drift-and-real-failures.txt` (gitignored logs)

## [2026-07-07 01:15] - [ARCH]

What: Documented remaining schema drift: 10 tables referenced by migrations but never created by any migration file — they were created directly in Vibey's live DB (dashboard/ad-hoc SQL) and never captured as migrations.
Why: These cannot be reconstructed faithfully from the repo without read access to Vibey's live DB (`qfrvykscoymiwwgysvsr`), which is under a different org and not accessible from this machine.
Impact: The following remain MISSING on `roas-production` and block their dependent migrations (indexes, RLS, org_id backfills, realtime membership): `social_posts`, `social_post_schedules`, `agent_channels`, `user_notifications`, `app_errors`, `template_skill_assignments`, `skill_library`, `billing_health_log`, `brain_belief_patterns`, `brain_emotional_responses`. Full non-benign failure list captured in `scripts/roas/.drift-and-real-failures.txt` (95 lines incl. cascades). Resolve by obtaining a schema-only dump from Vibey live, or by authoring reconstruction migrations once the exact column shapes are confirmed.
Files: `scripts/roas/.drift-and-real-failures.txt`

## [2026-07-07 06:36] - [ARCH]

What: Authored and applied ROAS drift recovery for 10 tables that existed only on Vibey live (never in migration files): `skill_library`, `skill_library_resources`, `template_skill_assignments`, `user_notifications`, `social_posts`, `social_post_schedules`, `agent_channels`, `app_errors`, `billing_health_log`, `billing_health_checks`. Added `scripts/roas/roas-drift-recovery.sql` (DDL reconstructed from app contracts + dependent ALTER/seed migrations) and `scripts/roas/apply-drift-recovery.sh` (apply + retry drift-dependent migrations).
Why: ROAS production DB could not run skill seeds, notifications, social scheduling, agent channel routing, or admin observability without these tables.
Impact: All 10 drift tables now exist on `roas-production`. Table count **285 → 295**. Retried migrations succeeded for social posts/schedules, agent channels, user notification type allowlists, SEO/presentation skill seeds, and app_errors observability columns. Legacy `brain_belief_patterns` / `brain_emotional_responses` intentionally skipped — modern equivalents `ns_belief_patterns` / `ns_emotional_responses` already present. Remaining migration failures are unrelated drift (e.g. `user_workspaces`, duplicate seed rows, stale perf migrations targeting dropped legacy brain tables).
Files: `scripts/roas/roas-drift-recovery.sql` (new), `scripts/roas/apply-drift-recovery.sh` (new), `scripts/roas/.drift-retry.log` (gitignored), `.docs/plans/roas-lovable-rebuild-provisioning.md`

## [2026-07-07 06:40] - [ARCH]

What: Completed ROAS social scheduling DB setup via `scripts/roas/roas-social-scheduling-complete.sql` + `scripts/roas/apply-social-scheduling.sh`. Added `social_posts` to `supabase_realtime`, org member + campaign-scoped RLS on `social_posts`, consolidated org-aware policies on `social_post_schedules`, and hardened `update_social_posts_timestamp()` search_path.
Why: Social scheduling migrations failed originally because `social_posts` was missing; calendar/schedule UI and org campaign scheduling need realtime + org RLS.
Impact: Both `social_posts` and `social_post_schedules` are in realtime publication with full personal + org + campaign access policies. Scheduling API paths (`POST /api/social-posts/:id/schedule`, campaign schedule list) can persist and read rows under org context. Actual publish-at-time still requires `queue-worker` on Railway with Redis + Composio/X or LinkedIn integrations connected.
Files: `scripts/roas/roas-social-scheduling-complete.sql` (new), `scripts/roas/apply-social-scheduling.sh` (new), `scripts/roas/apply-drift-recovery.sh` (calls social scheduling step at end)

## [2026-07-07 06:43] - [ARCH]

What: Added Supabase Management API migration runners (`scripts/roas/apply-via-supabase-api.sh`, `scripts/roas/apply-roas-recovery-via-api.sh`) and switched `apply-drift-recovery.sh` to use the API by default (macOS Supabase CLI keychain token → `POST /v1/projects/lhfgtsjetcardinpgouq/database/query`). Re-applied drift recovery + social scheduling SQL and 10 dependent migrations through the API — all OK.
Why: User requested migrations via MCP/API instead of direct psql; Supabase MCP is not wired in this Cursor session, but the Management API is the same backend.
Impact: `roas-production` verified via API: drift tables present, `social_posts` + `social_post_schedules` in realtime, 2 skill_library seeds. Use `./scripts/roas/apply-drift-recovery.sh` (API) or `USE_PSQL=1 ./scripts/roas/apply-drift-recovery.sh` (legacy psql). Lovable `query_database` MCP still targets Studio 2's separate Cloud DB (26 tables) until external Supabase integration is connected in Lovable UI.
Files: `scripts/roas/apply-via-supabase-api.sh` (new), `scripts/roas/apply-roas-recovery-via-api.sh` (new), `scripts/roas/apply-drift-recovery.sh`, `scripts/roas/.drift-retry-api.log` (gitignored)

## [2026-07-07 06:47] - [ARCH]

What: Wired ROAS Studio 2 Lovable project (`b01b0b5d-d47b-471c-a9d0-98b7b0603dc2`) to external Supabase via Lovable chat (`send_message`). Agent updated `.env` with `lhfgtsjetcardinpgouq` URL + anon key, added `src/lib/verify-supabase-env.ts` dev probe for `social_posts`, and updated project knowledge.
Why: User asked to connect Supabase through Lovable chat/MCP instead of manual dashboard-only path.
Impact: Preview app now reads roas-production via env vars. Lovable Integrations OAuth still requires Dylan (3 clicks: Integrations → Supabase → Connect → DVTEST → roas-production). Lovable `query_database` MCP still hits sandbox Cloud DB until OAuth link completes.
Files: Lovable project `b01b0b5d-d47b-471c-a9d0-98b7b0603dc2` (commit a50b38ee)

## [2026-07-07 07:00] - [DOCS]

What: Major update to `.docs/plans/roas-lovable-rebuild-provisioning.md` — **Deploy gate — Cowork** checklist (Vercel team + 3 projects, platform tokens, shared secrets, member invites), **Minimum keys for Phase 2** env matrix, JWT verification decision, Lovable dual-database section, updated phases/handoffs after migrations + Studio 2 Supabase connect.
Why: Dylan asked what Cowork must do vs Cursor to get APIs running; doc had stale migration-blocked state.
Impact: Cowork has a single ~45 min gate before Cursor can deploy `api.roas.io` / `app.roas.io` / Fly / workers.
Files: `.docs/plans/roas-lovable-rebuild-provisioning.md`

## [2026-07-07 07:05] - [DOCS]

What: Added copy-paste **Message for Cowork** block in provisioning doc Agent notes (Deploy gate handoff + doc path).
Why: Dylan asked for a message to send Cowork with the canonical doc location.
Impact: Cowork can start Deploy gate without re-explaining context in chat.
Files: `.docs/plans/roas-lovable-rebuild-provisioning.md`

## [2026-07-07 07:10] - [DOCS]

What: Added **LastPass → env vars** flow section to provisioning doc (manual paste into Vercel/Fly/Railway; no auto-sync).
Why: Dylan asked how LastPass keys reach deployed env.
Impact: Clear handoff: LastPass = vault; platform env UIs = runtime; Cursor sends paste checklist after Deploy gate.
Files: `.docs/plans/roas-lovable-rebuild-provisioning.md`

## [2026-07-07 07:15] - [DOCS]

What: Added **Dylan refresh** + **Env structure — three layers** + local vs production `.env` file table to provisioning doc.
Why: Dylan asked for updated doc on what's needed now and how env files are organized.
Impact: Clarifies local `.env` is optional; production = Vercel/Fly/Railway paste from LastPass.
Files: `.docs/plans/roas-lovable-rebuild-provisioning.md`

## [2026-07-07 07:20] - [UTIL]

What: Added `scripts/roas/roas-secrets.env.template` — master ROAS env fill-in file (Supabase, shared secrets, platform tokens, provider keys, per-target sections for Vercel/Fly/Railway). Gitignored `scripts/roas/roas-secrets.env` for Dylan's local copy.
Why: Dylan asked for one structured file listing all keys and where to put them.
Impact: Fill `roas-secrets.env` once → paste sections into Vercel/Fly/Railway; template committed, secrets never committed.
Files: `scripts/roas/roas-secrets.env.template`, `scripts/roas/.env.example`, `.gitignore`, `.docs/plans/roas-lovable-rebuild-provisioning.md`

## [2026-07-07 07:25] - [UTIL]

What: Filled local gitignored `scripts/roas/roas-secrets.env` Supabase fields available from the ROAS Supabase CLI/API context (URL, anon/publishable key, service/secret key, and `DATABASE_URL`) without printing values in chat.
Why: Dylan asked to prefill the Supabase section of the master env file.
Impact: Supabase runtime keys are staged in the local master env file for later Vercel/Fly/Railway paste. `SUPABASE_JWT_SECRET` still needs manual copy from LastPass because Supabase CLI API-key listing does not expose it.
Files: `scripts/roas/roas-secrets.env` (gitignored local secrets file)

## [2026-07-07 08:05] - [UTIL]

What: Synced `roas-secrets.env` sections 6–10 from master sections 1–5 (self-contained Vercel/Fly/Railway paste blocks). Added `scripts/roas/sync-roas-secrets-sections.py` to re-run after filling sections 1–5.
Why: Dylan asked not to copy keys back and forth between duplicate sections.
Impact: Paste section 6→api, 7→web, 8→funnels, 9→Fly, 10→Railway directly; fill 1–5 only going forward.
Files: `scripts/roas/roas-secrets.env`, `scripts/roas/sync-roas-secrets-sections.py`

## [2026-07-07 09:00] - [DOCS]

What: Answered Cowork 4-item handoff in provisioning doc — JWT decision (a) JWKS locked (already in code; no SUPABASE_JWT_SECRET on API), REDIS_URL via Cowork/Railway, Brave/Perplexity deferred, shared secrets done in roas-secrets.env.
Why: Cowork blocked on Dylan/Cursor calls before Vercel env paste.
Impact: API/web/funnels deploy unblocked without JWT secret or search API keys.
Files: `.docs/plans/roas-lovable-rebuild-provisioning.md`

## [2026-07-07 09:32] - [FIX]

What: Restored the missing Vercel serverless entrypoint `apps/api/api/index.ts` (imports `createNestApp` from compiled `dist/main` and caches the Express instance). Guarded `apps/api/src/main.ts` bootstrap so `node dist/main` still listens locally but importing the module for serverless does not call `listen()`.
Why: roas-api Vercel builds failed with `The pattern "api/index.ts" defined in functions doesn't match any Serverless Functions` — `vercel.json` referenced a handler file dropped during the VibeyV2 → Railway migration fork snapshot.
Impact: roas-api should pass Vercel function discovery and build; redeploy after push. roas-web / roas-funnels are unaffected (no root `vercel.json`; Next.js auto-detect only).
Files: `apps/api/api/index.ts` (new), `apps/api/src/main.ts`

## [2026-07-07 09:42] - [FIX]

What: Extended `apps/api/scripts/vercel-build.sh` to build and materialize `@vibey/agent-policy` alongside `@vibey/api-shared` (matching `apps/api/Dockerfile` order). Added agent-policy to `vercel.json` `includeFiles` for serverless bundling.
Why: roas-api Vercel build passed serverless config then failed with 6× `TS2307: Cannot find module '@vibey/agent-policy'` — the workspace package was never compiled before `nest build`.
Impact: roas-api compile should resolve `@vibey/agent-policy` on Vercel; redeploy after push.
Files: `apps/api/scripts/vercel-build.sh`, `apps/api/vercel.json`

## [2026-07-07 11:00] - [FIX]

What: roas-api runtime — fixed `includeFiles` globs (`node_modules/@vibey/*` + repo-root copies, not wrong `../node_modules` path), materialize workspace packages into `apps/api/node_modules`, repo `node_modules/@vibey`, and `packages/@vibey`; added NODE_PATH init + dynamic import in `api/index.ts` before loading `dist/main`. roas-web OOM — added `apps/web/vercel.json` + `scripts/vercel-build.sh` (build workspace deps first, `NODE_OPTIONS=--max-old-space-size=8192`, `NEXT_BUILD_WORKERS=1`); disabled Vercel production client source maps in `next.config.js`.
Why: API build green but runtime `Cannot find module '@vibey/api-shared'`; web killed at 4m50s on 4GB build memory.
Impact: API health check should resolve workspace imports; web should complete build on standard Vercel machines without Elastic Build.
Files: `apps/api/api/index.ts`, `apps/api/scripts/vercel-build.sh`, `apps/api/vercel.json`, `apps/web/vercel.json`, `apps/web/scripts/vercel-build.sh`, `apps/web/next.config.js`

## [2026-07-07 11:07] - [FIX]

What: Shortened `apps/api/vercel.json` `includeFiles` to `@vibey/**` wildcard globs (121 chars) — same three materialization targets, under Vercel's 256-char schema limit.
Why: `7b5626a9` failed instant schema validation; build never ran.
Impact: roas-api redeploy can proceed with runtime bundling fix from `7b5626a9`.
Files: `apps/api/vercel.json`

## [2026-07-07 11:14] - [FIX]

What: Direct Vercel log triage via `scripts/roas/vercel-status.sh` (uses local `VERCEL_TOKEN`). roas-api: restructured `vercel-build.sh` (function at top, step logging, `pnpm exec nest build`, 6GB heap) while keeping triple-path workspace materialization. roas-web: fixed `ChatMarkdownView.tsx` TS error (`window.setTimeout` return type vs Node `Timeout`).
Why: `81e108b7` api build failed silently after reinstall (no nest output); web failed TypeScript check after webpack compile succeeded.
Impact: Cursor can poll Vercel directly without Cowork relay; next deploy should build both projects.
Files: `apps/api/scripts/vercel-build.sh`, `apps/web/src/components/chat/ChatMarkdownView.tsx`, `scripts/roas/vercel-status.sh`

## [2026-07-07 11:29] - [UTIL]

What: Parallel ROAS deploy prep while Vercel builds: fixed funnels Supabase image hostname (`lhfgtsjetcardinpgouq`); added `docker/fly.roas.runtime.toml`, `scripts/roas/{smoke-deploy,apply-fly-secrets,deploy-fly-runtimes,deploy-railway-workers}.sh`; created Fly app `roas-runtimes` + imported 14 section-9 secrets.
Why: Unblock Fly/Railway/smoke work without Cowork relay; funnels still pointed at Vibey prod storage host.
Impact: Fly deploy can run via `bash scripts/roas/deploy-fly-runtimes.sh`; post-Vercel checks via `bash scripts/roas/smoke-deploy.sh`; Railway manual paste documented in deploy script.
Files: `apps/funnels/next.config.ts`, `docker/fly.roas.runtime.toml`, `scripts/roas/smoke-deploy.sh`, `scripts/roas/apply-fly-secrets.sh`, `scripts/roas/deploy-fly-runtimes.sh`, `scripts/roas/deploy-railway-workers.sh`

## [2026-07-07 11:45] - [DOCS]

What: Expanded section 10 in `roas-secrets.env.template` as a Railway Raw Editor paste block (where/how, both workers, REDIS internal vs public). Sync script now emits `REDIS_URL=${{Redis.REDIS_URL}}` for section 10 instead of copying the literal internal URL from section 4.
Why: Dylan/Cowork needed an exact paste target for Railway workers without mixing Vercel public Redis.
Impact: Open `roas-secrets.env` section 10 → copy KEY=VALUE lines → paste into mission-worker + queue-worker Raw Editor.
Files: `scripts/roas/roas-secrets.env.template`, `scripts/roas/sync-roas-secrets-sections.py`

## [2026-07-07 12:22] - [DOCS]

What: Verified Fly app `roas-runtimes` post-deploy (2 machines iad, checks passing); documented health (`/api/health` HTTP 200, JSON `degraded`) and optional search keys gap in provisioning agent notes.
Why: Close fly-deploy task; confirm no redeploy needed.
Impact: Cowork/Dylan see live Fly URL and degraded-health expectations; OpenClaw web-search smoke still blocked on Brave/Perplexity keys.
Files: `.docs/plans/roas-lovable-rebuild-provisioning.md`, `.docs/logs/changelog2026-07-07.md`

## [2026-07-07 12:32] - [FIX]

What: Added `COMPOSIO_API_KEY` to Railway section 10 (`roas-secrets.env.template` + `sync-roas-secrets-sections.py` `railway_vars`); re-synced gitignored secrets file.
Why: queue-worker inits Composio at boot and crashed with `ComposioNoAPIKeyError` when the key was missing from the §10 paste block (Dylan had added it manually as a 13th var).
Impact: Future §10 pastes include Composio for both workers; harmless extra on mission-worker.
Files: `scripts/roas/roas-secrets.env.template`, `scripts/roas/sync-roas-secrets-sections.py`

## [2026-07-07 12:45] - [FIX]

What: roas-web — fixed `ChatMarkdownView.tsx` timer typing: use `ReturnType<typeof setTimeout>` with `setTimeout()` (not `window.setTimeout`), matching the rest of the web app and avoiding DOM `number` vs Node `Timeout` mismatch under Next's typecheck. roas-api — `vercel-build.sh` now deletes `dist/` + `tsconfig.build.tsbuildinfo` for `@vibey/agent-policy` and `@vibey/api-shared` before building (stale incremental output was leaving `api-shared/dist` without `index.js`, failing materialize `test -f …/index.js`); restored `cp -r dist/.` for empty-safe copy.
Why: Deploy verification `ef8f5406` — web TS2322 on line 25; api build exited during post-`nest build` materialize when workspace package entrypoints were missing.
Impact: Local verification: `ChatMarkdownView` typecheck clean; `apps/api/scripts/vercel-build.sh` completes through materialize. Push to main to trigger Vercel redeploy (or redeploy roas-web + roas-api from dashboard).
Files: `apps/web/src/components/chat/ChatMarkdownView.tsx`, `apps/api/scripts/vercel-build.sh`
