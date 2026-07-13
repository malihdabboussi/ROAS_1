# ROAS Standalone Migration — Legacy Vibey Removal Thread

**Period covered:** July 6–11, 2026  
**Purpose:** Sanitized record of separating ROAS from legacy Vibey infrastructure, domains, credentials, defaults, and repositories  
**Status:** Production routing cleanup substantially complete; remaining naming and deferred infrastructure work listed below

> Sanitized: no API keys, passwords, service-role tokens, or database connection strings are included.

---

## 1. Goal

Create ROAS as a standalone product using the existing monorepo as a starting point, while removing operational dependence on:

- Vibey production and development Supabase projects
- Vibey domains and URL fallbacks
- Vibey Fly and Railway runtimes
- Vibey provider accounts and credentials
- The original `GoVibey/VibeyV2` repository
- Hidden defaults that could silently route ROAS traffic back to Vibey

The migration was not intended to rename every internal package immediately. The priority was runtime isolation: ROAS traffic, data, authentication, deployments, workers, and credentials must use ROAS-owned infrastructure.

---

## 2. Locked constraints and decisions

### Repository isolation

- A separate private `roas-platform` repository and local workspace were created.
- No rebuild changes were to be pushed back to `GoVibey/VibeyV2`.
- The working tree was copied without its original `.git` directory.
- Existing local work was preserved during the copy.

### Production architecture

| Layer | ROAS target |
|---|---|
| Dashboard | Vercel `apps/web` → `app.roas.io` |
| Platform API | Vercel `apps/api` → `api.roas.io` |
| Funnels | Vercel `apps/funnels` → `sites.roas.io` |
| Database/Auth | Standalone Supabase `roas-production` |
| Agent runtime | Fly `roas-runtimes` |
| Workers | Railway ROAS worker services and Redis |
| Public agent domains | Cloudflare Worker → `*.agents.roas.io` |
| Marketing | `roas.io` / `roas.ai` |
| Lovable | UI sandbox and co-building surface, not the privileged production backend |

### Why Lovable Cloud was not the production database

Lovable Cloud could provide application-facing database functionality, but did not expose the privileged credentials required by the existing NestJS backend and migration workflow. The final architecture therefore kept:

- Vercel for the dashboard, API, and funnels
- A standalone Supabase project for production data and auth
- Fly for the agent runtime
- Railway for workers and Redis
- Lovable as a UI sandbox rather than the source of truth for production data

### Credentials and authentication

- New ROAS-owned credentials were required.
- Legacy or shared Vibey provider accounts were not to be reused.
- Supabase authentication uses JWKS with ECC P-256.
- Secrets are managed through a gitignored ROAS secrets file and sync tooling.
- Committed documentation contains placeholders only.

---

## 3. Legacy Vibey surfaces discovered

### Domains and URL fallbacks

The copied code contained defaults for:

- `govibey.com`
- `api.govibey.com`
- `app.vibey.im`
- `vibey.im`
- `mcp.vibey.im`
- `vibeyfunnels.com`
- `-app.govibey.com`

These appeared in platform links, billing/legal links, publishing URLs, integrations, widget embeds, public-agent routing, MCP URLs, link-preview allowlists, and server-side fallbacks.

ROAS replacements include:

- `app.roas.io`
- `api.roas.io`
- `sites.roas.io`
- `mcp.roas.io`
- `*.agents.roas.io`
- `-app.roas.io`

### Supabase projects

Four project contexts appeared during the rebuild:

| Project | Purpose |
|---|---|
| ROAS production | Canonical production DB/Auth |
| Legacy Vibey project | Incorrectly remained in copied local `.env` files |
| Lovable Studio v1 Cloud | Early sandbox |
| Lovable Studio 2 Cloud | Current Lovable sandbox |

The key risk was the dual-database trap: Lovable database tooling addressed its sandbox, not ROAS production. Production migrations and runtime checks therefore had to target standalone Supabase explicitly.

### Runtime routing

Legacy runtime references included:

- Railway Vibey runtime URLs in database profile defaults
- `vibey-runtimes` as a Fly app fallback in API and web code
- `machine_pool.fly_app` defaults
- Provisioning RPC defaults
- Worker trust rules that only recognized Vibey hosts
- A `shared_railway` runtime type whose database URL could override environment variables

This mattered because correcting only environment variables was insufficient: database profile rows and code fallbacks could still send traffic to Vibey.

### Local environment files

Gitignored local environments had not been included in the production cleanup. Remaining legacy values caused:

- ROAS web sessions to be verified against Vibey JWKS
- `JWKSNoMatchingKey` and `token_invalid`
- Vibey service-role credentials being used against ROAS
- Agent definition sync failures
- `runtime_not_ready` errors

This exposed an important migration gap: deployed infrastructure had been remediated, but copied local `.env` files had not been audited.

### Provider credentials

The migration found or guarded against:

- A legacy Gemini development key briefly entering the ROAS secret chain
- Risk of using a shared Vibey OpenRouter workspace
- Missing ROAS-specific Sentry DSNs
- Missing worker and runtime routing secrets

The policy became: ROAS must use ROAS-owned accounts and keys, even when a Vibey key would make development work temporarily.

### Repository and generated artifacts

The copied tree required attention for:

- Root and app-level `.env` files
- Temporary MCP/command artifacts
- Patch files
- Inherited CI workflows
- Generated build output
- Internal `@vibey/*` package names

Internal package names were treated as naming debt unless they affected runtime isolation. Operational routing and credentials were prioritized first.

---

## 4. Migration phases

### Phase A — Planning and provisioning

Completed:

- Mapped external dependencies and hosting requirements.
- Selected the hybrid architecture: Vercel + Supabase + Fly + Railway + Cloudflare.
- Created the shared provisioning document.
- Established the ROAS domain map.
- Created Lovable ROAS projects and consolidated work into Studio 2.
- Confirmed Lovable Cloud could not replace the privileged backend database workflow.

Canonical coordination document:

- `.docs/plans/roas-lovable-rebuild-provisioning.md`

### Phase B — Repository isolation

Completed:

- Created the standalone private ROAS repository.
- Copied the working tree without original Git history.
- Moved the Cursor workspace to `roas-platform`.
- Preserved uncommitted local product work.
- Kept the original Vibey repository untouched.

### Phase C — Standalone database

Completed:

- Created the ROAS production Supabase project.
- Replayed the migration corpus in chronological order.
- Added extension/bootstrap compatibility.
- Added a fault-tolerant migration runner and explicit migration ordering.
- Recovered tables missing from the migration corpus.
- Reached approximately 295 tables after drift recovery.
- Wired Studio 2 to external ROAS Supabase while documenting the Lovable sandbox boundary.

Representative files:

- `scripts/roas/migration-order.txt`
- `scripts/roas/apply-migrations-resilient.sh`
- `scripts/roas/apply-lovable-migrations.sh`
- `scripts/roas/roas-drift-recovery.sql`
- `scripts/roas/apply-drift-recovery.sh`

### Phase D — ROAS deployments

Completed:

- Created Vercel projects for web, API, and funnels.
- Connected `app.roas.io`, `api.roas.io`, and `sites.roas.io`.
- Deployed `roas-runtimes` to Fly.
- Provisioned Railway workers and Redis.
- Created ROAS secret synchronization tooling.
- Fixed monorepo/serverless bundling needed by the Vercel API.
- Authenticated the ROAS sending domain.

Representative files:

- `scripts/roas/roas-secrets.env.template`
- `scripts/roas/sync-roas-secrets-sections.py`
- `scripts/roas/deploy-fly-runtimes.sh`
- `scripts/roas/deploy-railway-workers.sh`
- `docker/fly.roas.runtime.toml`

### Phase E — Runtime and domain drift remediation

This was the main legacy-removal phase.

#### E1 — Runtime defaults

Completed:

- Added a migration to replace legacy runtime profile defaults.
- Changed code fallbacks from `vibey-runtimes` to `roas-runtimes`.
- Added `FLY_RUNTIME_APP` to the secret template and sync workflow.
- Added runtime-profile audit SQL.
- Applied the migration to production.

Key migration:

- `supabase/migrations/20260711164000_roas_runtime_infrastructure_defaults.sql`

#### E2 — Domain defaults

Completed:

- Added centralized platform URL/default helpers.
- Replaced operational Vibey domain fallbacks across web, API, and funnels.
- Set the app-domain suffix to `-app.roas.io`.
- Updated billing, project publishing, integrations, and widget embed surfaces.

Key files:

- `apps/web/src/lib/platform/platform-urls.ts`
- `apps/api/src/lib/platform-defaults.ts`
- `apps/funnels/src/lib/platform-urls.ts`

#### E3 — Public agent proxy

Completed:

- Updated the apps proxy to route ROAS public-agent domains.
- Added trust for the ROAS Fly runtime.
- Added ROAS-specific Wrangler configuration.
- Added a deployment script.
- Synced the worker secret to the web deployment.
- Added Cloudflare DNS and route configuration for `*.agents.roas.io`.

Key files:

- `workers/apps-proxy/src/index.ts`
- `workers/apps-proxy/src/index.test.ts`
- `workers/apps-proxy/wrangler.roas.toml`
- `scripts/roas/deploy-apps-proxy.sh`

#### E4 — Regression guardrails

Completed:

- Extended runtime drift SQL with an explicit verdict.
- Added a Vercel environment freshness check.
- Hardened deployment smoke tests.
- Added fail-loud handling for empty critical routing values.

Key files:

- `scripts/roas/verify-roas-runtime-profiles.sql`
- `scripts/roas/verify-vercel-env-freshness.sh`
- `scripts/roas/smoke-deploy.sh`

#### E5 — Production hardening

Completed:

- Diagnosed all Fly machines being stopped despite corrected routing.
- Started a runtime and set one minimum running machine.
- Reduced the shared runtime pool from seven machines to one.
- Added proxy retries for Fly cold-start responses.
- Brought both Railway workers online.
- Removed the mistaken legacy Gemini key from the ROAS credential chain.

### Phase F — Local environment cleanup

Completed:

- Aligned local agent API Supabase configuration with ROAS production.
- Added a script to sync local agent environment values from the ROAS secrets source.
- Added a fail-fast alignment verifier.
- Preserved the intended hybrid local setup:
  - web → production `api.roas.io`
  - agent API → local port 3003
  - OpenClaw → local port 18789
- Fixed the Docker-only OpenClaw plugin path for local development.

Key files:

- `scripts/roas/sync-local-agent-env.sh`
- `scripts/roas/verify-local-env-alignment.sh`
- `apps/agent-api/.env.example`
- `docker/openclaw.json`
- `package.json`

---

## 5. Verification evidence

As of the thread:

| Check | Result |
|---|---|
| Runtime profile drift SQL | `verdict: OK`, zero drift rows |
| Vercel environment freshness | Passed for critical routing values |
| Base deployment smoke | 4/4 |
| Smoke including Fly | 5/5 |
| `api.roas.io/api` | HTTP 200 |
| Fly runtime health | HTTP 200; gateway reachable |
| Vercel projects | Web, API, and funnels ready |
| Railway | Mission and queue workers online |
| Cloudflare | Public-agent wildcard route installed |

Important lesson: changing Vercel environment variables is not enough. Build-time values require a redeploy, so freshness checks and smoke tests are part of the migration guardrail.

---

## 6. What is complete

- ROAS has a separate repository and workspace.
- Production DB/Auth use standalone ROAS Supabase.
- Production web, API, and funnels use ROAS Vercel projects/domains.
- Agent runtime routing points to `roas-runtimes`.
- Railway workers use ROAS infrastructure.
- Core operational domain fallbacks now use ROAS domains.
- Public agent routing uses `*.agents.roas.io`.
- ROAS secrets and deployment guardrails exist.
- Runtime profile drift is checked explicitly.
- Local agent development has ROAS env sync and verification scripts.
- The known legacy Gemini key was removed from the ROAS chain.

---

## 7. Remaining legacy work

### Operational gaps

- **Sentry:** ROAS projects and DSNs still need to be created and wired.
- **`*-app.roas.io`:** deferred until catch-all DNS and publishing routing are implemented.
- **Public-agent end-to-end test:** infrastructure exists, but a real slug smoke test remains.
- **Brain embeddings:** a separate data backfill remains; not a Vibey routing issue, but it can affect chat behavior.
- **Local env discipline:** scripts exist, but developers must run sync/verify after credential changes.
- **Repository secret/history audit:** local copied artifacts and any committed-history exposure need a dedicated scrub if not already performed.

### Naming and branding debt

Remaining names may include:

- `@vibey/*` internal package scopes
- Health payload text such as `vibey-api`
- Component names such as `SpaceVibeyChatPanel`
- UI labels or assets such as `PoweredByVibey`

These should be audited separately. They are not all proof of an operational dependency, and broad renaming should not be mixed with runtime migration without usage and compatibility analysis.

### Ongoing risks

1. Database runtime profile URLs can override environment values.
2. Vercel build-time env changes can remain stale until redeploy.
3. Empty sync values can erase critical routing configuration.
4. Lovable database tools can accidentally target the sandbox instead of production.
5. Copied local `.env` files can silently reintroduce legacy Supabase or provider credentials.
6. Fly autoscaling settings can leave all runtime machines stopped.

---

## 8. Representative files and scripts

```text
.docs/plans/roas-lovable-rebuild-provisioning.md
.docs/plans/agent-follow-up-work.md

apps/web/src/lib/platform/platform-urls.ts
apps/api/src/lib/platform-defaults.ts
apps/funnels/src/lib/platform-urls.ts

apps/web/src/app/api/proxy/[...path]/route.ts
apps/api/src/modules/machines/services/machines-service-01.base.ts
apps/api/src/modules/machines/services/machine-reconciliation.service.ts

workers/apps-proxy/src/index.ts
workers/apps-proxy/src/index.test.ts
workers/apps-proxy/wrangler.roas.toml

supabase/migrations/20260711164000_roas_runtime_infrastructure_defaults.sql

scripts/roas/roas-secrets.env.template
scripts/roas/sync-roas-secrets-sections.py
scripts/roas/verify-roas-runtime-profiles.sql
scripts/roas/verify-vercel-env-freshness.sh
scripts/roas/smoke-deploy.sh
scripts/roas/deploy-fly-runtimes.sh
scripts/roas/deploy-apps-proxy.sh
scripts/roas/deploy-railway-workers.sh
scripts/roas/sync-local-agent-env.sh
scripts/roas/verify-local-env-alignment.sh

docker/fly.roas.runtime.toml
docker/openclaw.json
```

---

## 9. Executive conclusion

The migration successfully removed the main production dependencies on Vibey infrastructure:

- traffic no longer intentionally routes to Vibey runtime hosts;
- authentication and production data use ROAS Supabase;
- operational domain defaults use ROAS domains;
- deployments and workers use ROAS-owned services;
- guardrails now detect common routing and environment regressions.

The remaining work is mostly monitoring setup, deferred publishing surfaces, local/repository hygiene, and cosmetic/internal naming. Those items should be handled as explicit follow-up phases rather than assumed complete.

