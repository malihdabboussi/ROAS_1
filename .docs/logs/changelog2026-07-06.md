# Changelog - July 06, 2026




## [2026-07-06 23:30] - [FIX]

What: Removed committed fork tmp artifacts (`tmp-wb-mcp-part*.json`, `.tmp_exec_*.json`), added `.gitignore` patterns, and rewrote git history + force-pushed to `origin/main`.
Why: Cowork handoff flagged fork crumbs on remote; `.env` was never in git but tmp SQL/MCP payloads were on `origin/main`.
Impact: Private repo history no longer contains tmp artifacts; local `.env` files remain gitignored on disk only.
Files: `.gitignore`, deleted tmp JSON files, `origin/main` history rewrite

## [2026-07-06 20:18] - [DOCS]

What: Added 15-min agent sync checklist to ROAS provisioning doc; opened Cursor Automation draft (cron */15 * * * *) to read doc and report changes.
Why: Keep Cursor and Cowork aligned on provisioning state without manual chat pings.
Impact: Automation editor prefilled; enable/save in Glass Automations UI. Note: doc must be committed for cloud runs to see latest (local-only until then).
Files: `.docs/plans/roas-lovable-rebuild-provisioning.md`

## [2026-07-06 20:12] - [ARCH]

What: Created ROAS Studio 2 Lovable project; retargeted migrations to standalone Supabase roas-production (lhfgtsjetcardinpgouq); pg_cron enabled on standalone migration script.
Why: Production DB on Dylan-owned Supabase; Studio 2 wired to external Supabase via Integrations.
Impact: Migrations blocked until DATABASE_URL in LastPass; Dylan connects Supabase in Studio 2 UI.
Files: `.docs/plans/roas-lovable-rebuild-provisioning.md`, `.docs/plans/roas-schema-migration-plan.md`, `scripts/roas/apply-lovable-migrations.sh`, Lovable `b01b0b5d-d47b-471c-a9d0-98b7b0603dc2`

## [2026-07-06 20:06] - [ARCH]

What: Answered Cowork architecture flag — Lovable Cloud does not export service_role/JWT/DB URL; locked production DB to standalone Supabase; paused Lovable Cloud bulk migrations; added step #2b.
Why: NestJS API requires SUPABASE_SERVICE_ROLE_KEY; Lovable only injects privileged keys into Edge Functions.
Impact: Cowork creates Supabase project + LastPass keys; Cursor migrates there instead of Lovable Cloud ref sweraoyotxgojtjrgcon.
Files: `.docs/plans/roas-lovable-rebuild-provisioning.md`

## [2026-07-06 19:30] - [DOCS]

What: Added Cursor↔Cowork coordination section to ROAS provisioning doc — handoff protocol (`> COWORK:` / `> CURSOR:` notes), no-secrets rule, and a shared records table for resource IDs/locations.
Why: Doc is the shared source of truth between Cursor and Claude Cowork; needed an explicit way to hand off tasks and record keys/records as we go.
Impact: Both agents write handoffs and IDs in one place; secret values stay in 1Password.
Files: `.docs/plans/roas-lovable-rebuild-provisioning.md`

## [2026-07-06 19:26] - [DOCS]

What: Added top-level "Dylan actions — work in order" checklist to ROAS provisioning doc; DATABASE_URL is current step #2.
Why: Dylan-side blockers should live in the actions file, not only chat.
Impact: Single source for sequential ROAS setup tasks.
Files: `.docs/plans/roas-lovable-rebuild-provisioning.md`

## [2026-07-06 19:20] - [ARCH]

What: Locked hybrid architecture (Lovable Cloud DB + Vercel apps/web dashboard); started ROAS schema migration Batch 0 + base bootstrap (26 tables); added `scripts/roas/apply-lovable-migrations.sh`.
Why: Avoid rebuilding 3k+ Next files in Lovable; keep parity via Vercel while Lovable owns Postgres/auth.
Impact: Prod dashboard targets Vercel; ~734 migrations remain via DATABASE_URL bulk script. Lovable project is sandbox only.
Files: `.docs/plans/roas-lovable-rebuild-provisioning.md`, `.docs/plans/roas-schema-migration-plan.md`, `scripts/roas/apply-lovable-migrations.sh`

## [2026-07-06 19:13] - [DOCS]

What: Marked Lovable remix duplicate (`766f239e`) with in-app delete banner and project knowledge; updated provisioning doc with keep/delete comparison table.
Why: Both projects share the name "ROAS Studio"; user needs a clear signal which to delete. Lovable MCP has no project rename/delete API.
Impact: Remix preview shows red "DUPLICATE PROJECT" banner; canonical `64a600e9` unchanged. User renames remix in UI then deletes.
Files: `.docs/plans/roas-lovable-rebuild-provisioning.md`, Lovable project `766f239e-4ecb-4db6-94d0-f8ca4a0446d9`
