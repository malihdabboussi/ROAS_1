# Configuration Map

> Scope: read-only reverse-engineering pass over `ROAS-X-1DSLABS` (internal `vibey-v2`, product ROAS).
> **No secret values appear in this document — key NAMES only.**
> Confidence markers: **CONFIRMED** (read directly from a file), **LIKELY** (strong inference from evidence), **UNKNOWN**.

## Executive Summary

- **13 env-shaped files** exist on disk. Only **2 contain real secrets** (`apps/api/.env`, `apps/web/.env`) and both are gitignored. The rest are `.env.example` / template files tracked in git. **CONFIRMED**
- `apps/web/.env` is a **byte-identical copy** of `apps/api/.env` (`cmp -s` → identical, 4321 bytes, 91 keys). The entire backend secret set — Stripe, SendGrid, Supabase service role, OAuth client secrets, vault key — sits inside the Next.js app directory. **CONFIRMED** — this is risk #1.
- **~683 distinct env vars are read across the repo**; **344** outside the vendored `apps/openclaw` runtime; **299** in first-party `src/` production code (tests/scripts excluded). **CONFIRMED**
- **~200 vars read by production code appear in no example file.** Most are tuning knobs with safe defaults, but a meaningful subset (`STRIPE_SECRET_KEY`, `TURNSTILE_SECRET_KEY`, `UNSUBSCRIBE_TOKEN_SECRET`, `PREVIEW_TOKEN_SECRET`, `CRON_SECRET`, `SUPABASE_DIRECT_DB_URL`, `VIBEY_AGENT_TOKEN`) are required for real features and undocumented. **CONFIRMED**
- **`turbo.json` has no `globalEnv` and no `passThroughEnv`**, and its single `build.env` list of 15 vars omits **15+ `NEXT_PUBLIC_*` vars that are inlined into browser bundles at build time**. That is a live cache-poisoning bug class: change `NEXT_PUBLIC_WAITLIST_MODE` and Turbo can serve a stale `.next` build. **CONFIRMED**
- **There is no env validation anywhere** — no zod schema, no Joi `validationSchema` on any `ConfigModule.forRoot`. Misconfiguration surfaces as a runtime `throw` deep in a service, or silently as a wrong default. **CONFIRMED**
- Feature flags are **100% env-string-based** (`=== 'true'` / `!== 'false'` comparisons). No LaunchDarkly / PostHog / Statsig / DB-backed flag table. **CONFIRMED**
- `pnpm` overrides and patches **are** applied (they are materialised in `pnpm-lock.yaml`); the `apps/openclaw/package.json` `pnpm` field is **ignored** by pnpm 9.15.4. **CONFIRMED**
- There is **no `.nvmrc`** anywhere, and root `engines.node` says `>=20` while the documented target is Node 22. **CONFIRMED**

---

## Environment File Inventory

| File                                           | App                     | Tracked in git? | Gitignored? | Key count | Purpose                                                                 |
| ---------------------------------------------- | ----------------------- | --------------- | ----------- | --------- | ----------------------------------------------------------------------- |
| `apps/api/.env`                                | api                     | No              | **Yes**     | 91        | Real local secrets for the NestJS platform API                          |
| `apps/web/.env`                                | web                     | No              | **Yes**     | 91        | **Byte-identical copy of `apps/api/.env`** — see Drift section          |
| `apps/api/.env.example`                        | api                     | Yes             | No          | 82        | Documented API config                                                   |
| `apps/agent-api/.env.example`                  | agent-api               | Yes             | No          | 35        | Documented agent backend config                                         |
| `apps/web/.env.example`                        | web                     | Yes             | No          | 13        | Documented web config                                                   |
| `apps/web/.env.local.example`                  | web                     | Yes             | No          | 10        | Older/parallel web example — overlaps and conflicts with `.env.example` |
| `apps/mission-worker/.env.example`             | mission-worker          | Yes             | No          | 22        | Mission worker + Redis + missions tuning                                |
| `apps/website/.env.example`                    | website                 | Yes             | No          | 2         | Marketing site                                                          |
| `apps/chrome-extension/.env.example`           | chrome-extension        | Yes             | No          | 6         | Vite `VITE_*` origins                                                   |
| `apps/openclaw/.env.example`                   | openclaw                | Yes             | No          | 1         | Gateway token only                                                      |
| `apps/openclaw/openclaw.podman.env`            | openclaw                | Yes             | No          | 4         | Podman sandbox bind/ports                                               |
| `apps/openclaw/apps/ios/fastlane/.env.example` | openclaw (vendored iOS) | Yes             | No          | —         | Vendored upstream; not used by ROAS                                     |
| `scripts/roas/roas-secrets.env.template`       | ops                     | Yes             | No          | 111       | **The real superset** — deploy secret template for Vercel/Fly/Railway   |
| `scripts/roas/.env.example`                    | ops                     | Yes             | No          | 0         | Empty placeholder (comments only)                                       |

**No `.env` exists for `apps/agent-api`, `apps/queue-worker`, `apps/mission-worker`, `apps/admin`, `apps/funnels`, `apps/docs`.** `apps/agent-api` survives this by falling back to `apps/api/.env` (see Precedence). **CONFIRMED**

`.gitignore` covers `.env`, `.env.local`, `.env*.local`, `.env.staging`, `scripts/roas/roas-secrets.env`, and a broad `.env*` at line 143. `git check-ignore` confirms `apps/api/.env` and `apps/web/.env` are ignored and all `*.example` files are not. **CONFIRMED**

---

## Environment Variables by Domain

Representative rows — the full read set is 683 vars. "In example?" = present in any `.env.example` **or** `roas-secrets.env.template`.

### Supabase / database

| Variable                                                           | Read by (app)                     | Required?            | Purpose                             | Read at (file)                                                                     | In example?         | Public? |
| ------------------------------------------------------------------ | --------------------------------- | -------------------- | ----------------------------------- | ---------------------------------------------------------------------------------- | ------------------- | ------- |
| `SUPABASE_URL`                                                     | api, agent-api, workers, packages | **REQUIRED**         | Project URL                         | `packages/api-shared/src/services/supabase-client.factory.ts:22` (throws)          | Yes                 | No      |
| `SUPABASE_SERVICE_ROLE_KEY`                                        | api, agent-api, workers, website  | **REQUIRED**         | Service-role writes                 | `packages/api-shared/src/services/supabase-service-client.provider.ts:19` (throws) | Yes                 | No      |
| `SUPABASE_ANON_KEY`                                                | api, agent-api                    | **REQUIRED**         | Anon/JWT verification               | `packages/api-shared/src/guards/auth.guard.ts:85` (throws)                         | Yes                 | No      |
| `SUPABASE_JWT_SECRET`                                              | api                               | REQUIRED (auth)      | JWT verification                    | api src                                                                            | Yes                 | No      |
| `NEXT_PUBLIC_SUPABASE_URL`                                         | web, admin, website, funnels      | **REQUIRED for web** | Browser client                      | `apps/web/src/middleware.ts:42` (`!` assertion)                                    | Yes                 | **Yes** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                                    | web, admin, website, funnels      | **REQUIRED for web** | Browser client                      | `apps/web/src/middleware.ts:43` (`!` assertion)                                    | Yes                 | **Yes** |
| `SUPABASE_DIRECT_DB_URL`                                           | api, workers                      | OPTIONAL→REQUIRED    | Direct PG pool                      | `packages/api-shared/src/services/postgres-direct.service.ts:19` (throws)          | **No**              | No      |
| `SUPABASE_DB_URL` / `DATABASE_URL`                                 | api, workers                      | OPTIONAL             | Direct-PG fallbacks                 | same file                                                                          | `DATABASE_URL` only | No      |
| `SUPABASE_DIRECT_DB_POOL_MAX` / `_IDLE_MS` / `_CONNECT_TIMEOUT_MS` | api                               | OPTIONAL             | Pool tuning                         | api src                                                                            | **No**              | No      |
| `EXPECTED_SUPABASE_HOST`                                           | scripts                           | OPTIONAL             | Guards against wrong-project writes | `scripts/roas/verify-local-env-alignment.sh`                                       | **No**              | No      |

### Redis / queues

| Variable                                       | Read by                           | Required?    | Purpose                     | Read at                                                         | In example?    | Public? |
| ---------------------------------------------- | --------------------------------- | ------------ | --------------------------- | --------------------------------------------------------------- | -------------- | ------- |
| `REDIS_URL`                                    | api, queue-worker, mission-worker | **REQUIRED** | BullMQ connection           | `apps/mission-worker/src/config/configuration.ts:5` (`\|\| ''`) | Yes            | No      |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | workers                           | OPTIONAL     | Discrete alternative to URL | `apps/queue-worker/src/config/configuration.ts`                 | Yes            | No      |
| `REDIS_QUEUE_PREFIX`                           | workers                           | OPTIONAL     | Queue namespacing           | worker configuration.ts                                         | Yes            | No      |
| `REDIS_URL_MISSIONS`                           | mission-worker                    | OPTIONAL     | Dedicated missions Redis    | mission-worker src                                              | Yes            | No      |
| `REDIS_URL_AGENT_STREAM`, `REDIS_URL_EMAIL`    | api, workers                      | OPTIONAL     | Split Redis instances       | api/worker src                                                  | **No**         | No      |
| `REDIS_PUBLIC_URL`                             | —                                 | dead         | —                           | —                                                               | Yes (template) | No      |

### LLM / AI providers

| Variable                                                      | Read by                  | Required?                  | Purpose                        | Read at                                               | In example?   | Public? |
| ------------------------------------------------------------- | ------------------------ | -------------------------- | ------------------------------ | ----------------------------------------------------- | ------------- | ------- |
| `OPENROUTER_API_KEY`                                          | api, agent-api, openclaw | **REQUIRED** (agent stack) | Primary LLM gateway            | root `package.json:9` reads it out of `apps/api/.env` | Yes           | No      |
| `OPENROUTER_INTERACTIVE_API_KEY` / `_BACKGROUND_` / `_MEDIA_` | agent-api                | OPTIONAL                   | Per-lane keys                  | agent-api src                                         | Template only | No      |
| `GEMINI_API_KEY`                                              | api, agent-api           | OPTIONAL                   | Gemini                         | api/agent-api src                                     | Yes           | No      |
| `GEMINI_API_KEY_FALLBACK`, `_FALLBACK_2`                      | —                        | dead                       | Declared, never read           | —                                                     | Yes           | No      |
| `GOOGLE_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`              | agent-api                | OPTIONAL                   | Google SDK auth                | agent-api src                                         | **No**        | No      |
| `GOOGLE_AI_API_KEY`                                           | —                        | dead                       | In turbo + example, never read | —                                                     | Yes           | No      |
| `DEEPGRAM_API_KEY`                                            | api                      | OPTIONAL                   | Transcription                  | api ConfigService                                     | `.env` only   | No      |
| `ELEVENLABS_API_KEY`, `REPLICATE_API_TOKEN`                   | api                      | OPTIONAL                   | Media generation               | api src                                               | `.env` only   | No      |
| `EMBEDDING_MODEL`, `DOCS_EMBEDDING_MODEL`, `DOCS_ASK_MODEL`   | api, docs                | OPTIONAL                   | Model selection                | api/docs src                                          | **No**        | No      |

### Email / messaging

`SENDGRID_API_KEY` (REQUIRED for email, in examples), `SENDGRID_WEBHOOK_VERIFICATION_KEY` (**not in examples**), `UNSUBSCRIBE_TOKEN_SECRET` (**not in examples**, gates unsubscribe-link signing), `MEETING_FOLLOW_UP_SLACK_DM_EMAIL` (**not in examples**), `SLACK_CLIENT_ID` / `_SECRET` / `_SIGNING_SECRET` / `_OAUTH_REDIRECT_URI` / `_OAUTH_STATE_SECRET` (in examples).

### Integrations / OAuth

Present in `apps/api/.env.example` and read by api: `COMPOSIO_API_KEY`, `COMPOSIO_BASE_URL`, `FIRECRAWL_API_KEY`, `SCRAPECREATORS_API_KEY`, `SEARCHAPI_API_KEY`, `MODAL_TOKEN_ID` / `_SECRET` / `MODAL_APP_NAME`.
Read but **not** in any example: `COMPOSIO_WEBHOOK_SECRET`.
In examples but **never read** (dead — see dead-config section): all `CALENDLY_*`, all `FATHOM_*`, all `GITHUB_APP_*` / `GITHUB_OAUTH_STATE_SECRET`, all `META_*`, all `HIGGSFIELD_*`, all `STRIPE_CONNECT_*`, all `SUPABASE_OAUTH_*`, `OPENAI_CODEX_OAUTH_STATE_SECRET`.
In `apps/api/.env` only (real secrets, no example row): `BRAVE_API_KEY`, `PERPLEXITY_API_KEY`, `DATAFORSEO_LOGIN` / `_PASSWORD`, `DROPBOX_*`, `PAYPAL_*`, `WORDPRESS_COM_*`.

### Security / vault / internal auth

| Variable                                                         | Read by                             | Required?                  | Purpose                                                                     | Read at                                                                                                                                         | In example?             |
| ---------------------------------------------------------------- | ----------------------------------- | -------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `VAULT_ENCRYPTION_KEY`                                           | api, agent-api, queue-worker        | **REQUIRED**               | AES key for stored OAuth tokens; **must be byte-identical across services** | `apps/api/src/modules/vault/services/vault.service.ts:27`; `apps/queue-worker/src/lib/services/vault-decrypt.ts:9` (throws unless 64 hex chars) | Yes                     |
| `INTERNAL_API_TOKEN`                                             | api, agent-api, workers, cf worker  | **REQUIRED**               | Service-to-service auth                                                     | `apps/mission-worker/.../agent-runtime-brain-import.processor.ts:135` (throws)                                                                  | Yes                     |
| `BROWSER_SESSION_ENCRYPTION_KEY`                                 | api                                 | OPTIONAL                   | Browser-session crypto; falls back to `VAULT_ENCRYPTION_KEY`                | `apps/api/src/modules/browser-sessions/services/browser-sessions-crypto.service.ts:25`                                                          | **No**                  |
| `OPENCLAW_GATEWAY_TOKEN`                                         | agent-api, openclaw, mission-worker | **REQUIRED** (agent stack) | Gateway auth                                                                | agent-api/openclaw src                                                                                                                          | Yes                     |
| `CRON_SECRET`                                                    | api                                 | REQUIRED (Vercel crons)    | Protects cron endpoints                                                     | api src                                                                                                                                         | **No**                  |
| `PREVIEW_TOKEN_SECRET`                                           | api/funnels                         | OPTIONAL                   | Signed preview links                                                        | src                                                                                                                                             | **No**                  |
| `WORKER_SECRET`                                                  | web, cf worker                      | REQUIRED (proxy)           | Worker↔web auth                                                             | web src                                                                                                                                         | Yes                     |
| `VIBEY_AGENT_TOKEN`, `VIBEY_INTERNAL_TOKEN`, `VIBEY_SESSION_KEY` | api, agent-api                      | OPTIONAL/UNKNOWN           | Agent session auth                                                          | src                                                                                                                                             | partial                 |
| `TURNSTILE_SECRET_KEY`                                           | api                                 | OPTIONAL                   | Captcha verify                                                              | api src                                                                                                                                         | **No** (only in `.env`) |

### URLs / ports / topology

`PORT`, `BACKEND_URL`, `NEXT_PUBLIC_BACKEND_URL`, `AGENT_BACKEND_URL`, `MAIN_API_URL`, `API_URL`, `APP_URL`, `PUBLIC_APP_URL`, `PUBLIC_API_URL`, `PLATFORM_API_URL`, `APPS_API_URL`, `API_BASE_URL`, `VIBEY_API_URL`, `QUEUE_WORKER_URL`, `MISSION_CALLBACK_URL`, `APPS_DOMAIN_SUFFIX`, `CLOUDFLARE_BASE_DOMAIN`, `CORS_ORIGIN`, `MCP_OAUTH_ISSUER_URL`, `MCP_RESOURCE_URL`, `MCP_WEB_CONSENT_URL`, `VIBEY_DOCS_BASE_URL`. See Drift section — this cluster is the worst offender.

### Observability

`SENTRY_DSN` (api, agent-api), `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_AI_RECORD_INPUTS` / `_OUTPUTS` (agent-api example), `SENTRY_ORG` / `SENTRY_PROJECT` (web example, never read), `NEXT_PUBLIC_SENTRY_DSN` (**declared in `apps/web/.env.example` and `apps/web/.env`, but grep finds zero `SENTRY` references anywhere in `apps/web` source — the web app has no Sentry wiring**). `VIBEY_UPLOAD_SOURCE_MAPS`, `VIBEY_RELEASE_ID`, `VIBEY_BUILD_ID`, `VIBEY_COMMIT_SHA`. **CONFIRMED**

### Platform-injected (never set by you)

`NODE_ENV`, `HOME`, `HOSTNAME`, `VERCEL`, `VERCEL_ENV`, `VERCEL_DEPLOYMENT_ID`, `VERCEL_GIT_COMMIT_SHA` / `_REF`, `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `FLY_APP_NAME`, `FLY_MACHINE_ID`, `FLY_REGION`, `RAILWAY_DEPLOYMENT_ID`, `RAILWAY_REPLICA_ID`, `RAILWAY_SERVICE_NAME`, `RAILWAY_GIT_COMMIT_SHA`, `SOURCE_VERSION`, `GITHUB_SHA`, `CI`. These appear in the "missing from examples" diff but are **not actionable**.

---

## Variables Read By Code But Missing From Every Example File

**~200 vars** in `src/` production code appear in no `.env.example` and no `roas-secrets.env.template`. Grouped by whether they actually block you.

### Tier 1 — will break a real feature if unset (fix these first)

| Variable                                                                                                                                                                                                              | App            | Consequence                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`                                                                                                                                                                                                   | api            | Billing dead. **In `turbo.json` but in no env example at all.**            |
| `SUPABASE_DIRECT_DB_URL`                                                                                                                                                                                              | api, workers   | `postgres-direct.service.ts:19` throws; direct-PG paths dead               |
| `TURNSTILE_SECRET_KEY`                                                                                                                                                                                                | api            | Captcha verification fails (present in `.env`, absent from `.env.example`) |
| `UNSUBSCRIBE_TOKEN_SECRET`                                                                                                                                                                                            | api            | Unsubscribe links unsignable                                               |
| `SENDGRID_WEBHOOK_VERIFICATION_KEY`                                                                                                                                                                                   | api            | Email event webhooks unverifiable                                          |
| `COMPOSIO_WEBHOOK_SECRET`                                                                                                                                                                                             | api            | Composio webhooks unverifiable                                             |
| `CRON_SECRET`                                                                                                                                                                                                         | api            | Vercel cron endpoints unprotected/rejecting                                |
| `PREVIEW_TOKEN_SECRET`                                                                                                                                                                                                | api/funnels    | Preview links broken                                                       |
| `BROWSER_SESSION_ENCRYPTION_KEY`                                                                                                                                                                                      | api            | Falls back to `VAULT_ENCRYPTION_KEY`; logs "session sync disabled"         |
| `VIBEY_AGENT_TOKEN`, `VIBEY_INTERNAL_TOKEN`                                                                                                                                                                           | api, agent-api | Agent auth paths                                                           |
| `GOOGLE_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`                                                                                                                                                                      | agent-api      | Google model calls                                                         |
| `FLY_MACHINE_READ_TOKEN`, `RAILWAY_API_TOKEN`, `RAILWAY_PROJECT_TOKEN`                                                                                                                                                | api            | Machine/autoscaler control plane                                           |
| `REDIS_URL_AGENT_STREAM`, `REDIS_URL_EMAIL`                                                                                                                                                                           | api, workers   | Fall back to `REDIS_URL`; silent single-instance contention                |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APPS_DOMAIN_SUFFIX`, `NEXT_PUBLIC_GOVIBEY_URL`, `NEXT_PUBLIC_PUBLIC_AGENT_HOST_SUFFIX`, `NEXT_PUBLIC_VIBEY_PLATFORM_URL` | web/admin      | Browser-side URLs silently `undefined` → broken links                      |

### Tier 2 — undocumented tuning knobs with defaults (won't block boot)

~150 vars, all with inline defaults. Families: `AGENT_RUNTIME_AUTOSCALER_*` (16), `AGENT_RUNTIME_*_CONCURRENCY` (8), `BRAIN_*` (~20), `CHAT_PREWARM_*` / `CHAT_RUN_*` / `CHAT_*_TIMING_LOGS` (~18), `MISSIONS_*` (~20 beyond the 8 documented), `SPACE_*` / `SPACE_BACKFILL_*` (10), `DREAM_OPS_*` / `BRAIN_OPS_*` (6), `CUSTOMER_SIGNAL_*` (3), `PROVIDER_BILLING_RECONCILE*` (3), `MACHINE_*` extras, `IG_STORY_*` font/script paths, `STATIC_AD_CHROMIUM_PATH`, `LINK_PREVIEW_INTERNAL_HOSTS`, `RUNTIME_IDENTITY_CACHE_PATH`, `SANDBOX_IDLE_THRESHOLD_MS`.

### Tier 3 — test/smoke-harness only (ignore)

All `MCP_SMOKE_*` (18), all `VIBEY_SMOKE_*` (16), `SMOKE_*`, `LIVE_EXPENSIVE_CONTEXT_TEST`, `ALLOW_NON_ROAS_SEED`, `GROUND_TRUTH_DB_*`, `ARCH_LOC_BASE_REF`, `TARGET_PACKAGE_JSON`, `PAGE_GRADER_*`, `BRAIN_EVAL_*`, `*_BACKFILL_*`.

---

## Variables In Example Files But Never Read

**65 keys.** These are pure noise for a newcomer — copying `.env.example` and filling these in accomplishes nothing.

- **Integration OAuth suites, fully dead:** `CALENDLY_CLIENT_ID`, `CALENDLY_CLIENT_SECRET`, `CALENDLY_OAUTH_STATE_SECRET`, `CALENDLY_REDIRECT_URI`, `CALENDLY_WEBHOOK_SIGNING_KEY`, `FATHOM_CLIENT_ID`, `FATHOM_CLIENT_SECRET`, `FATHOM_OAUTH_STATE_SECRET`, `FATHOM_REDIRECT_URI`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_SLUG`, `GITHUB_APP_WEBHOOK_SECRET`, `GITHUB_OAUTH_STATE_SECRET`, `HIGGSFIELD_OAUTH_CLIENT_ID`, `HIGGSFIELD_OAUTH_REDIRECT_URI`, `HIGGSFIELD_OAUTH_STATE_SECRET`, `META_APP_ID`, `META_APP_SECRET`, `META_OAUTH_REDIRECT_URI`, `META_OAUTH_STATE_SECRET`, `META_WEBHOOK_CALLBACK_URL`, `META_WEBHOOK_VERIFY_TOKEN`, `STRIPE_CONNECT_CLIENT_ID`, `STRIPE_CONNECT_REDIRECT_URI`, `STRIPE_CONNECT_SECRET_KEY`, `STRIPE_CONNECT_STATE_SECRET`, `SUPABASE_OAUTH_CLIENT_ID`, `SUPABASE_OAUTH_CLIENT_SECRET`, `SUPABASE_OAUTH_REDIRECT_URI`, `SUPABASE_OAUTH_STATE_SECRET`, `OPENAI_CODEX_OAUTH_STATE_SECRET`
- **MCP TTLs:** `MCP_ACCESS_TOKEN_TTL_SECONDS`, `MCP_AUTH_CODE_TTL_SECONDS`, `MCP_REFRESH_TOKEN_TTL_SECONDS`, `MCP_DEV_SUPABASE_JWT_AUTH`, `NEXT_PUBLIC_MCP_CONSENT_PATH`
- **Deploy tooling:** `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_APPS_TOKEN`, `VERCEL_APPS_TEAM_ID`, `VERCEL_APPS_PROJECT_PREFIX`, `RAILWAY_TOKEN`, `RAILWAY_PROJECT_ID`
- **Other:** `CORS_ORIGIN`, `DEFAULT_MODEL`, `GOOGLE_AI_API_KEY`, `GEMINI_API_KEY_FALLBACK`, `GEMINI_API_KEY_FALLBACK_2`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `OPENCLAW_AGENT_ID`, `PROJECTS_BASE_DIR`, `REDIS_PUBLIC_URL`, `WIDGET_GENERATE_VIA_AGENT`
- **Chrome extension `VITE_*` (6):** read via `import.meta.env`, so the `process.env` grep misses them — **these are alive, not dead**. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VIBEY_API_ORIGIN`, `VITE_VIBEY_AGENT_API_ORIGIN`, `VITE_VIBEY_APP_ORIGIN`, `VITE_VIBEY_WEB_ORIGIN`. **CONFIRMED**

> **Caveat:** `CORS_ORIGIN` and `OPENCLAW_AGENT_ID` show as unread by `process.env` grep but appear in Fly/Docker env blocks — they may be consumed by the vendored openclaw runtime through a config-object path rather than `process.env`. **LIKELY alive.**

---

## Variables Missing From `turbo.json`

`turbo.json` declares **no `globalEnv`, no `passThroughEnv`, no `globalDependencies`**. The only env list is `tasks.build.env` (15 entries) plus `tasks.test.env: ["APP_URL"]`. **CONFIRMED**

**Browser-inlined vars absent from `build.env` (highest risk — these are baked into `.next` output):**
`NEXT_PUBLIC_ALLOW_FREE_ONBOARDING`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_WS_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APPS_DOMAIN_SUFFIX`, `NEXT_PUBLIC_CONTEXT_BREAKDOWN_PANEL_ENABLED`, `NEXT_PUBLIC_CROSS_CONTEXT_MOVE_ENABLED`, `NEXT_PUBLIC_GOVIBEY_URL`, `NEXT_PUBLIC_PUBLIC_AGENT_HOST_SUFFIX`, `NEXT_PUBLIC_REQUIRE_ADMIN`, `NEXT_PUBLIC_SHOW_MISSION_TECHNICAL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_VIBEY_PLATFORM_URL`, `NEXT_PUBLIC_VIBEY_RELEASE_ID`, `NEXT_PUBLIC_WAITLIST_MODE`, `NEXT_PUBLIC_SENTRY_DSN`.

Flipping `NEXT_PUBLIC_WAITLIST_MODE` or `NEXT_PUBLIC_REQUIRE_ADMIN` and rebuilding can produce a **cache hit on a stale bundle that still has the old value compiled in**. This is a correctness bug, not a performance nit.

**Server-side build/test-time vars also absent:** `SUPABASE_JWT_SECRET`, `SUPABASE_DIRECT_DB_URL`, `OPENROUTER_API_KEY`, `SENDGRID_API_KEY`, `VAULT_ENCRYPTION_KEY`, `INTERNAL_API_TOKEN`, `REDIS_URL`, `SENTRY_DSN`.

**Stale entry in `turbo.json`:** `CRM_INGEST_SECRET` is declared but read by zero source files (only `turbo.json` and a study doc reference it). **CONFIRMED**

---

## Browser-Exposed Variables

17 `NEXT_PUBLIC_*` vars are read by code and therefore inlined into client bundles:

`NEXT_PUBLIC_ALLOW_FREE_ONBOARDING`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_WS_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APPS_DOMAIN_SUFFIX`, `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_CONTEXT_BREAKDOWN_PANEL_ENABLED`, `NEXT_PUBLIC_CROSS_CONTEXT_MOVE_ENABLED`, `NEXT_PUBLIC_GOVIBEY_URL`, `NEXT_PUBLIC_PUBLIC_AGENT_HOST_SUFFIX`, `NEXT_PUBLIC_REQUIRE_ADMIN`, `NEXT_PUBLIC_SHOW_MISSION_TECHNICAL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_VIBEY_PLATFORM_URL`, `NEXT_PUBLIC_WAITLIST_MODE` (+ `NEXT_PUBLIC_VIBEY_RELEASE_ID`, `NEXT_PUBLIC_SENTRY_DSN` declared).

**Assessment: no true secret is exposed.** Names to be aware of, none of which are actual leaks:

| Variable                                                                                      | Verdict                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                                                               | **Correct.** Anon key is designed to be public; RLS is the boundary.                                                                                                                                                                 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`                                                              | **Correct.** Site key is public; `TURNSTILE_SECRET_KEY` is correctly server-only.                                                                                                                                                    |
| `NEXT_PUBLIC_SENTRY_DSN`                                                                      | **Correct** (DSNs are public) — but also unused in `apps/web`.                                                                                                                                                                       |
| `NEXT_PUBLIC_REQUIRE_ADMIN`, `NEXT_PUBLIC_WAITLIST_MODE`, `NEXT_PUBLIC_ALLOW_FREE_ONBOARDING` | **Not secrets, but security-relevant.** These gate access in `apps/web/src/middleware.ts:94,181`. Client-visible auth gates are advisory only — the server must re-check. **UNKNOWN whether every gate is re-enforced server-side.** |

The genuine exposure risk is not `NEXT_PUBLIC_*` — it is `apps/web/.env` containing the full backend secret set. Next.js will not ship non-`NEXT_PUBLIC_` values to the browser, so this is not a live leak, but it is a large blast radius for one misplaced `NEXT_PUBLIC_` prefix or one careless `git add -f`.

---

## Non-Env Configuration Files

| File                                                                            | Scope         | What it controls                                                                                                      | Notes                                                                                                                     |
| ------------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `turbo.json`                                                                    | monorepo      | Task graph, caching, `build.env`                                                                                      | No `globalEnv`/`passThroughEnv`; `dev` and `clean` uncached                                                               |
| `pnpm-workspace.yaml`                                                           | monorepo      | 12 explicit app paths + `packages/*`                                                                                  | `workers/*` and `product-video` **not** workspace members                                                                 |
| `.npmrc`                                                                        | monorepo      | `strict-peer-dependencies=false`, `auto-install-peers=true`, `allow-non-applied-patches=true`                         | Last flag means a broken patch fails silently                                                                             |
| `tsconfig.base.json`                                                            | monorepo      | Strict TS baseline (`strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`)                                           | `apps/api` and `apps/queue-worker` **opt out** (`strict: false`)                                                          |
| `eslint.config.mjs` (160 lines)                                                 | monorepo      | LOC caps + architecture rules                                                                                         | See below                                                                                                                 |
| `scripts/arch/loc-allowlist.json`                                               | monorepo      | Escape hatch disabling `max-lines` / controller-Supabase rules per file                                               | Read at lint time by `eslint.config.mjs:8-16`                                                                             |
| `apps/web/next.config.js`                                                       | web           | Turbopack + webpack aliases, `transpilePackages`, image `remotePatterns`                                              | Allows **two** Supabase hostnames: `lhfgtsjetcardinpgouq` and `mjaxhuehopzbsuhmseeg`                                      |
| `apps/{admin,website}/next.config.js`, `apps/{docs,funnels}/next.config.ts`     | per-app       | Per-app Next config                                                                                                   | —                                                                                                                         |
| `apps/{web,admin,website,docs}/tailwind.config.ts`                              | per-app       | Design tokens                                                                                                         | `funnels` has no Tailwind config                                                                                          |
| `apps/{web,api,agent-api,funnels,mission-worker,queue-worker}/vitest.config.ts` | per-app       | Unit tests                                                                                                            | `apps/web` forces `NODE_ENV=test` via `define`                                                                            |
| `playwright.config.ts`                                                          | root          | E2E against `apps/web/e2e`                                                                                            | Hardcoded `baseURL: http://localhost:3000`, boots `pnpm --filter @vibey/web dev`                                          |
| `apps/web/vercel.json`                                                          | web           | `installCommand` + `bash scripts/vercel-build.sh`                                                                     | —                                                                                                                         |
| `apps/api/vercel.json`                                                          | api           | Serverless functions (`maxDuration: 300`), rewrites, **8 cron entries**                                               | Catch-all rewrite `/(.*)` → `/api`                                                                                        |
| `docker/fly.roas.runtime.toml`                                                  | agent runtime | Fly app `roas-runtimes`, port 3003, `min_machines_running=1`                                                          | `[env]` hardcodes `AGENT_RUNTIME_MODE=shared`, `OPENCLAW_GATEWAY_URL`, `BRAIN_LLM_RERANKER*`                              |
| `docker/fly.runtime.toml`, `docker/fly.runtime.staging.toml`                    | agent runtime | Alternate/staging Fly configs                                                                                         | Three Fly configs coexist                                                                                                 |
| `apps/openclaw/fly.toml`, `fly.private.toml`                                    | openclaw      | Vendored upstream Fly configs                                                                                         | Not the ROAS deploy path                                                                                                  |
| `apps/{api,agent-api,mission-worker,queue-worker}/railway.json`                 | workers       | Railway build/deploy                                                                                                  | api+agent-api use `DOCKERFILE`; workers use `RAILPACK`. Per `CLAUDE.md`, api/agent-api railway.json are **legacy/unused** |
| `workers/apps-proxy/wrangler.toml`                                              | CF worker     | Routes `*.agents.roas.io`, KV `SLUG_CACHE`, `[vars]` with prod URLs                                                   | Secrets listed as comments only                                                                                           |
| `docker/Dockerfile`                                                             | agent runtime | Multi-stage build, `EXPOSE 3003`, sets `OPENCLAW_CONFIG_PATH`, `AGENTS_BASE_DIR`, plugin paths                        | —                                                                                                                         |
| `apps/api/Dockerfile`, `apps/mission-worker/Dockerfile`                         | per-app       | Container builds                                                                                                      | —                                                                                                                         |
| `docker/openclaw.json` (6896 lines)                                             | agent runtime | Openclaw runtime config: `models`, `agents`, `tools`, `bindings`, `channels`, `gateway`, `skills`, `plugins`, `hooks` | **Largest single config artifact in the repo.** 5 `.bak` siblings tracked alongside it                                    |
| `docker/supervisord.conf`, `docker-compose.local.yml`                           | agent runtime | Process supervision, local compose                                                                                    | —                                                                                                                         |
| **`.nvmrc`**                                                                    | —             | **Does not exist** anywhere in the repo                                                                               | Root `engines.node: ">=20"` vs documented Node 22                                                                         |

### ESLint architecture rules (`eslint.config.mjs`) — **CONFIRMED**

- `max-lines`: controllers 200 · services 600 · repositories 400 · `apps/web` containers 600 · other `apps/web` feature/component `.tsx` 400.
- `no-restricted-imports`: generated per feature directory under `apps/web/src/features/` — each feature is forbidden from importing any other feature. Message: _"Features may not import other features. Move shared code to @/lib or @/components."_
- `no-restricted-syntax` in `apps/web`: direct `supabase.from(...)` banned; must use `backendGet/backendPost/backendPatch`. Exempt: `middleware.ts`, `(auth)/callback/route.ts`, `api/proxy/[...path]/route.ts`, `lib/supabase/**`.
- `no-restricted-syntax` in `apps/{api,agent-api}/src/**/*.controller.ts`: controllers may not call `supabase.from` or `request.supabase.from`.
- All of the above are individually disableable per file via `scripts/arch/loc-allowlist.json`.

---

## TypeScript Path Aliases

| Alias                              | Resolves to                                       | Declared in                                                           |
| ---------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------- |
| `@/*`                              | `./src/*`                                         | `apps/{web,admin,website,funnels,docs}/tsconfig.json`                 |
| `@vibey/api-shared`                | `packages/api-shared/src`                         | web, agent-api, mission-worker                                        |
| `@vibey/api-shared/*`              | `packages/api-shared/src/*`                       | web, agent-api, mission-worker                                        |
| `@vibey/api-shared/observability`  | `packages/api-shared/src/observability/public.ts` | `apps/funnels` (**narrow, single-entry alias — deliberate boundary**) |
| `@vibey/agent-policy` (+`/*`)      | `packages/agent-policy/src`                       | agent-api, mission-worker                                             |
| `@vibey/context-breakdown` (+`/*`) | `packages/context-breakdown/src`                  | agent-api, mission-worker                                             |
| `@vibey/*`                         | `packages/*/src`                                  | **`apps/web` only** — catch-all wildcard                              |

Notes: `apps/api` and `apps/queue-worker` declare `baseUrl: "./"` with **no `paths`** — they reach shared code through package resolution, not aliases. `apps/web`'s `@vibey/*` wildcard is broad enough to resolve any package's `src/`, bypassing the intent of the specific aliases. `apps/api`/`apps/queue-worker` also set `strict: false`, `noUnusedLocals: false`, `noUnusedParameters: false`, opting out of the `tsconfig.base.json` baseline. **CONFIRMED**

---

## Feature Flags

**Mechanism: env strings only.** No LaunchDarkly, PostHog, Statsig, or `feature_flags` DB table exists — greps for all of those return zero hits in first-party code. **CONFIRMED**

Two idioms, and they behave oppositely:

- **Opt-out (default ON):** `(process.env.X ?? 'true').toLowerCase() !== 'false'` — e.g. `AGENT_ACCESS_SUMMARY_IN_CONTEXT` (`apps/agent-api/src/modules/task-agent/services/task-agent.service.ts:215`), `AGENT_TEAMS_ENFORCE` (`chat-prewarm-context.service.ts:232`), `MISSIONS_USE_OUTBOX_DISPATCH`, `MISSIONS_WATCHDOG_ENABLED`, `PROVIDER_BILLING_RECONCILER_ENABLED`.
- **Opt-in (default OFF):** `process.env.X === 'true'` — e.g. `NEXT_PUBLIC_REQUIRE_ADMIN` (`apps/web/src/middleware.ts:181`).

**Trap:** `NEXT_PUBLIC_WAITLIST_MODE` uses `!== 'false'` (`middleware.ts:94`), so **public signups are closed unless the var is explicitly the string `"false"`**. Unset ≠ off.

Full env-flag inventory: `AGENT_RUNTIME_AUTOMATION_QUEUE_ENABLED` / `_DISABLED` (both exist — resolution order unverified), `AGENT_RUNTIME_AUTOSCALER_ENABLED`, `AGENT_RUNTIME_AUTOSCALER_MODE`, `AGENT_RUNTIME_MODE`, `ALLOW_FREE_ONBOARDING` + `NEXT_PUBLIC_ALLOW_FREE_ONBOARDING`, `ARTIFACT_RESOLVER_V1`, `AWARENESS_LOOP_ENABLED`, `BRAIN_EVAL_PROBE_ENABLED`, `CHAT_RUN_CHECKPOINTS_ENABLED`, `HUMAN_SUBTASKS_ENABLED`, `INTEGRATION_SCOPE_RESOLVER_V2`, `MACHINE_POOL_REPLENISH_ENABLED`, `MACHINE_POOL_RUNTIME_BIND_ENABLED`, `MEDIA_JOBS_SWEEPER_DISABLED`, `MISSION_MANAGER_SCOPE_AMEND_ENABLED`, `NEXT_PUBLIC_CONTEXT_BREAKDOWN_PANEL_ENABLED`, `NEXT_PUBLIC_CROSS_CONTEXT_MOVE_ENABLED`, `NEXT_PUBLIC_SHOW_MISSION_TECHNICAL`, `SCOPE_V2_DEFAULTS`, `SPACE_ASSET_INDEXING`, `SPACE_AUTOMATION_IN_PROCESS_CRON_ENABLED`, `SPACE_SEMANTIC_RETRIEVAL`, `TRANSFER_SPACE_VIEW_ENABLED`.

**Only 5 of these appear in any example file.** A newcomer cannot discover the other ~19 without grepping.

---

## Configuration Precedence

**There is no unified precedence — each app resolves differently.** **CONFIRMED**

### `apps/web`, `apps/admin`, `apps/website`, `apps/funnels`, `apps/docs` (Next.js default)

```
1. Real process env (shell / Vercel dashboard)   ← always wins
2. .env.$(NODE_ENV).local
3. .env.local                                    ← not present; only .env.local.example
4. .env.$(NODE_ENV)
5. .env                                          ← apps/web/.env exists (copy of api's)
6. Inline code default (?? / ||)
```

### `apps/api` — `ConfigModule.forRoot` at `apps/api/src/app.module.ts:78-84`

```
1. Real process env
2. join(process.cwd(), '.env')
3. join(process.cwd(), '..', 'mission-worker', '.env')   ← reaches into a sibling app
4. Inline default
```

### `apps/agent-api` — `resolveAgentApiEnvFilePaths()` at `apps/agent-api/src/lib/agent-api-env.ts`

```
1. Real process env
2. <cwd>/.env
3. <cwd>/../api/.env                 ← borrows the API's secrets
4. <cwd>/apps/agent-api/.env
5. <cwd>/apps/api/.env               ← borrows again, from repo root
6. Inline default
```

This is why there is **no `apps/agent-api/.env`** and the app still boots: it silently reads `apps/api/.env`. Dotenv's first-wins semantics mean `apps/agent-api/.env` — if you ever create one — takes priority over `apps/api/.env`, so a partial file there will shadow nothing but a full one can diverge invisibly.

### `apps/queue-worker` (`app.module.ts:23`) and `apps/mission-worker` (`app.module.ts:18-22`)

`queue-worker` uses `envFilePath: '.env'` (cwd-relative, no fallback). `mission-worker` declares **no `envFilePath` at all** — only `load: [configuration]` with `cache: true`, so it depends entirely on real process env plus the inline defaults in `src/config/configuration.ts`. **This is why the workers are Railway-dashboard-configured, not file-configured.**

### Root dev scripts (`package.json:9-10`)

`dev:agentapi` and `dev:agent` **parse `apps/api/.env` with a regex in a `node -p` subshell** to extract `OPENROUTER_API_KEY`, then inject it plus `OPENCLAW_CONFIG_PATH`, `AGENTS_BASE_DIR`, `PROJECTS_BASE_DIR`, and a literal `OPENCLAW_GATEWAY_TOKEN=local-dev-gateway-token`. If `apps/api/.env` lacks that key, the regex match is `null` and the script crashes with a TypeError rather than a useful message. **CONFIRMED**

---

## Hardcoded Defaults & Dangerous Fallbacks

| Location                                                                                                                                        | Setting                                                     | Default                                      | Risk                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/agent-api/src/modules/artifacts/services/artifact-north-star.service.ts:10`                                                               | `APP_URL` / `PUBLIC_APP_URL`                                | `'https://app.roas.io'`                      | **HIGH** — local/staging agent artifacts silently link to production                                                                       |
| `apps/admin/src/features/waitlist/components/InviteCodesTab.tsx:74`                                                                             | `NEXT_PUBLIC_APP_URL`                                       | `'https://app.roas.io'`                      | **HIGH** — invite codes generated in dev point at production                                                                               |
| `apps/web/src/lib/supabase/client.ts:3-4`, `server.ts:4-5`                                                                                      | Supabase URL/key                                            | `'http://localhost:54321'` / `'placeholder'` | **HIGH** — app boots and silently fails every query instead of erroring loudly. Contradicts `middleware.ts:42-43`, which uses `!` and 500s |
| `apps/web/src/middleware.ts:94`                                                                                                                 | `NEXT_PUBLIC_WAITLIST_MODE`                                 | closed unless `'false'`                      | **MEDIUM** — unset locks out signups                                                                                                       |
| `apps/agent-api/.../task-agent.service.ts:215` etc. (4 sites)                                                                                   | `AGENT_ACCESS_SUMMARY_IN_CONTEXT`                           | `'true'`                                     | MEDIUM — permissive-by-default context inclusion                                                                                           |
| `apps/agent-api/.../chat-prewarm-context.service.ts:232`, `chat-stable-turn-context.service.ts:232`, `artifact-composio-runtime.service.ts:325` | `AGENT_TEAMS_ENFORCE`                                       | `'true'` (enforce)                           | LOW — fails safe                                                                                                                           |
| `apps/mission-worker/src/config/configuration.ts:23`                                                                                            | `OPENCLAW_GATEWAY_URL`                                      | `'http://127.0.0.1:18789'`                   | MEDIUM — in prod, silently targets localhost instead of erroring                                                                           |
| `apps/mission-worker/src/config/configuration.ts:45`, `missions.scheduler.ts:24,74`                                                             | `MISSIONS_USE_OUTBOX_DISPATCH`, `MISSIONS_WATCHDOG_ENABLED` | `'true'`                                     | LOW                                                                                                                                        |
| `apps/mission-worker/src/config/configuration.ts:131`                                                                                           | `PROVIDER_BILLING_RECONCILER_ENABLED`                       | `'true'`                                     | **MEDIUM** — billing reconciliation runs by default in any environment with credentials                                                    |
| `apps/{mission,queue}-worker/src/config/configuration.ts:5`                                                                                     | `REDIS_URL`                                                 | `''`                                         | MEDIUM — empty string, not a throw; BullMQ fails opaquely                                                                                  |
| `apps/api/.../email-provider-directory.service.ts:40`, `email-orchestrator.service.ts:204`                                                      | `MAIN_API_URL`                                              | `http://localhost:${PORT \|\| '3001'}`       | MEDIUM — self-call assumes localhost; wrong on Vercel                                                                                      |
| `apps/api/src/test/integration/test-helpers.ts:19`                                                                                              | `SUPABASE_URL`                                              | `'https://test.supabase.co'`                 | LOW (test-only)                                                                                                                            |
| `apps/web/src/app/api/proxy/[...path]/route.ts:26-28,299-368`                                                                                   | `AGENT_BACKEND_URL`                                         | `'http://localhost:3003'`                    | MEDIUM — 5 separate fallback branches to the unpinned agent URL                                                                            |
| `apps/admin/src/app/api/proxy/[...path]/route.ts:3`, `(protected)/layout.tsx:24`, `apps/web/src/app/unsubscribe/[token]/page.tsx:17`            | `BACKEND_URL` / `NEXT_PUBLIC_BACKEND_URL`                   | `'http://localhost:3001'`                    | LOW-MEDIUM                                                                                                                                 |
| `.npmrc`                                                                                                                                        | `allow-non-applied-patches=true`                            | —                                            | **MEDIUM** — a patch that no longer applies is skipped **silently**                                                                        |
| `apps/web/next.config.js`                                                                                                                       | image `remotePatterns`                                      | 2 Supabase hostnames                         | LOW — `mjaxhuehopzbsuhmseeg` is neither the production nor the documented legacy project. **UNKNOWN provenance**                           |

---

## Configuration Drift & Duplication

| Setting                | Defined in                                                                                                                                                                                                                                                                     | Conflict?                                                                                                                                                                                                                   | Risk                                                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Full secret set**    | `apps/api/.env` **and** `apps/web/.env` — **byte-identical, `cmp -s` confirms**                                                                                                                                                                                                | Identical today, will diverge                                                                                                                                                                                               | **CRITICAL.** Backend secrets (Stripe, SendGrid, service role, vault key, all OAuth secrets) live in the Next.js app dir. One `NEXT_PUBLIC_` typo or one `git add -f` exposes everything. Nothing keeps the two in sync |
| `VAULT_ENCRYPTION_KEY` | `apps/api/.env`, `apps/agent-api` (via fallback to `apps/api/.env`), `apps/queue-worker`, Fly, Railway                                                                                                                                                                         | Must be byte-identical across all                                                                                                                                                                                           | **HIGH.** `vault-decrypt.ts:9` throws only on wrong _length_; a valid-length but _different_ key decrypts to garbage. Locally masked because agent-api reads api's file                                                 |
| Port 3002              | `apps/admin/package.json:6` (`${PORT:-3002}`, env-driven) vs `apps/funnels/package.json:9,11` (`-p 3002`, hardcoded)                                                                                                                                                           | **Yes**                                                                                                                                                                                                                     | **HIGH.** `pnpm dev` (root `turbo dev`) collides. Documented in `CLAUDE.md`; not fixed                                                                                                                                  |
| Backend URL            | `BACKEND_URL`, `NEXT_PUBLIC_BACKEND_URL`, `AGENT_BACKEND_URL`, `MAIN_API_URL`, `API_URL`, `API_BASE_URL`, `APPS_API_URL`, `PLATFORM_API_URL`, `PUBLIC_API_URL`, `VIBEY_API_URL` — **10 names for ~2 endpoints**, plus `wrangler.toml [vars]` and `fly.roas.runtime.toml [env]` | **Yes**                                                                                                                                                                                                                     | **HIGH.** No single source of truth; each has its own fallback                                                                                                                                                          |
| App URL                | `APP_URL`, `PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_VIBEY_PLATFORM_URL`, `NEXT_PUBLIC_GOVIBEY_URL`                                                                                                                                                                | **Yes**                                                                                                                                                                                                                     | MEDIUM                                                                                                                                                                                                                  |
| `OPENCLAW_GATEWAY_URL` | `docker/fly.roas.runtime.toml [env]`, `apps/mission-worker/src/config/configuration.ts:23`, `.env.example`, `roas-secrets.env.template`                                                                                                                                        | Same value today                                                                                                                                                                                                            | MEDIUM — Fly `[env]` silently overrides any secret of the same name                                                                                                                                                     |
| Web env examples       | `apps/web/.env.example` (13 keys) **and** `apps/web/.env.local.example` (10 keys)                                                                                                                                                                                              | **Yes** — only 2 keys overlap; `.env.local.example` uniquely names `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`, `DEFAULT_MODEL`, `WIDGET_GENERATE_VIA_AGENT`, `NEXT_PUBLIC_API_WS_URL`, `APP_URL`, `SUPABASE_SERVICE_ROLE_KEY` | **HIGH.** Two contradictory "start here" files; the `.env.local` one looks stale (its unique keys are mostly dead)                                                                                                      |
| Env documentation      | 12 `.env.example` files vs `scripts/roas/roas-secrets.env.template` (111 keys, the actual superset)                                                                                                                                                                            | **Yes**                                                                                                                                                                                                                     | **HIGH.** The real answer lives in `scripts/roas/`, which a newcomer will never look at                                                                                                                                 |
| Node version           | Root `engines.node: ">=20"`; `CLAUDE.md` says Node 22; **no `.nvmrc`**                                                                                                                                                                                                         | **Yes**                                                                                                                                                                                                                     | MEDIUM                                                                                                                                                                                                                  |
| Fly config             | `docker/fly.roas.runtime.toml`, `docker/fly.runtime.toml`, `docker/fly.runtime.staging.toml`, `apps/openclaw/fly.toml`, `apps/openclaw/fly.private.toml`                                                                                                                       | 5 files                                                                                                                                                                                                                     | MEDIUM — only the first is the documented deploy path                                                                                                                                                                   |
| Railway config         | `apps/api/railway.json`, `apps/agent-api/railway.json` marked **legacy/unused** in `CLAUDE.md`, yet still present and valid-looking                                                                                                                                            | **Yes**                                                                                                                                                                                                                     | MEDIUM — an agent could deploy the wrong way                                                                                                                                                                            |
| `docker/openclaw.json` | Plus `.bak`, `.bak.1`…`.bak.4` and `openclaw-full.json`, all tracked                                                                                                                                                                                                           | 7 variants                                                                                                                                                                                                                  | MEDIUM — unclear which is authoritative; `openclaw.json` is currently modified in the working tree                                                                                                                      |
| `PORT` defaults        | api 3001, agent-api 3003, queue-worker 3004, mission-worker 3005, web 3000, admin 3002, funnels 3002, website 3010, docs 3011, openclaw gateway 18789                                                                                                                          | Only the 3002 pair conflicts                                                                                                                                                                                                | See above                                                                                                                                                                                                               |

---

## Package Manager Configuration Issues

**Declared at root `package.json:68-83`:** **CONFIRMED**

- `neverBuiltDependencies`: `node-llama-cpp`
- `patchedDependencies`: `@mariozechner/pi-ai@0.52.12`, `@mariozechner/pi-agent-core@0.52.12`
- `allowNonAppliedPatches: true`
- `overrides`: `@nestjs/common` `11.1.14`, `@nestjs/core` `11.1.14`, `@nestjs/platform-express` `11.1.14`, `@supabase/supabase-js` `2.49.4`
- `packageManager: "pnpm@9.15.4"`, `engines.node: ">=20"`

**Declared at `apps/openclaw/package.json`:**

- `minimumReleaseAge: 2880`
- `overrides`: `fast-xml-parser` `5.3.4`, `form-data` `2.5.4`, `qs` `6.14.2`, `@sinclair/typebox` `0.34.48`, `tar` `7.5.9`, `tough-cookie` `4.1.3`
- `onlyBuiltDependencies`: 9 native packages including `@lydell/node-pty`, `@napi-rs/canvas`, `sharp`, `esbuild`, `node-llama-cpp`

### Are they applied?

**Root patches and overrides: YES — applied. CONFIRMED.** `pnpm-lock.yaml` lines 7-19 materialise all four `overrides` and both `patchedDependencies` with resolved hashes (`2ab6infoksbjdn33hqdpdlmthi`, `ob6pta5vob6ove5dnu745u7lly`). Both `.patch` files exist in `patches/`. pnpm only writes these into the lockfile when it honours them.

**`apps/openclaw` `pnpm` field: NO — ignored. CONFIRMED by absence.** pnpm reads the `pnpm` field only from the **workspace root**. `pnpm-lock.yaml`'s `overrides:` block contains exactly the four root NestJS/Supabase entries — none of openclaw's six security overrides (`tar`, `qs`, `tough-cookie`, `form-data`, `fast-xml-parser`, `@sinclair/typebox`) appear. pnpm 9.15.4 emits `Ignoring "pnpm" settings in "apps/openclaw/package.json"`.

**Consequences:**

1. **Six security-motivated version pins are silently not enforced.** `tough-cookie@4.1.3` and `form-data@2.5.4` are classic CVE-remediation pins. **Anything relying on them for vulnerability mitigation is unprotected.** This is the most under-appreciated finding in this document.
2. `onlyBuiltDependencies` is ignored, so native build gating for openclaw's 9 packages does not apply. Root `neverBuiltDependencies: ["node-llama-cpp"]` does apply and **conflicts** with openclaw listing the same package in `onlyBuiltDependencies` — root wins, so `node-llama-cpp` is never built.
3. `minimumReleaseAge: 2880` (supply-chain cooldown) is ignored.
4. `allow-non-applied-patches=true` in `.npmrc` plus `allowNonAppliedPatches: true` in `package.json` means if either `pi-ai`/`pi-agent-core` patch stops applying after a version bump, **install succeeds with the patch silently skipped**.

**Fix (out of scope, noted only):** hoist openclaw's six `overrides` into root `package.json` `pnpm.overrides`, and its `onlyBuiltDependencies` into root.

---

## Minimum Viable Local Configuration

Names only, with placeholders. Verified against the throw-sites and `!`-assertions cited above.

### (a) `apps/web` alone — `apps/web/.env.local`

Boots and renders `/login` and `/register`. `/` redirects to `/login`. Data calls fail silently (client falls back to placeholders; middleware would 500 without these two).

```
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
AGENT_BACKEND_URL=http://localhost:3003
NEXT_PUBLIC_WAITLIST_MODE=false
```

`NEXT_PUBLIC_WAITLIST_MODE=false` is **required**, not optional — `middleware.ts:94` closes signups on any other value including unset.

### (b) web + api — the above, plus `apps/api/.env`

```
SUPABASE_URL=<supabase-url>
SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
SUPABASE_JWT_SECRET=<supabase-jwt-secret>
PORT=3001
REDIS_URL=redis://localhost:6379
VAULT_ENCRYPTION_KEY=<64-hex-chars>
INTERNAL_API_TOKEN=<shared-internal-token>
OPENROUTER_API_KEY=<openrouter-key>
CORS_ORIGIN=http://localhost:3000
MAIN_API_URL=http://localhost:3001
APP_URL=http://localhost:3000
```

`VAULT_ENCRYPTION_KEY` must be exactly 64 hex characters or `vault-decrypt.ts:9` throws. Add on demand: `SENDGRID_API_KEY`, `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`, `SUPABASE_DIRECT_DB_URL`, `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `CRON_SECRET`, `UNSUBSCRIBE_TOKEN_SECRET`.

### (c) Full agent stack — (b) plus `apps/agent-api/.env`

**Warning:** creating `apps/agent-api/.env` **overrides** the `apps/api/.env` fallback for any key it defines (`agent-api-env.ts` order). Either make it complete or omit it and let the fallback work.

```
SUPABASE_URL=<supabase-url>
SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
PORT=3003
VAULT_ENCRYPTION_KEY=<must byte-match apps/api/.env>
INTERNAL_API_TOKEN=<must match apps/api/.env>
OPENROUTER_API_KEY=<openrouter-key>
MAIN_API_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3000
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=local-dev-gateway-token
OPENCLAW_CONFIG_PATH=<repo-root>/docker/openclaw.json
AGENTS_BASE_DIR=<repo-root>/docker/agents
PROJECTS_BASE_DIR=<repo-root>/.runtime/user-projects
OPENCLAW_SESSIONS_DIR=<repo-root>/.runtime/sessions
```

`OPENCLAW_CONFIG_PATH` is hard-required — `apps/agent-api/src/main.ts:46` throws `'OPENCLAW_CONFIG_PATH is required to run agent-api'`. `OPENCLAW_GATEWAY_TOKEN=local-dev-gateway-token` is the literal value the root `dev:agent` / `dev:agentapi` scripts inject, so it must match.

**Run order:** `pnpm dev:back` → `pnpm dev:agentapi` → `pnpm dev:agent` → `pnpm dev:app`. Do **not** use bare `pnpm dev` (port 3002 collision). `dev:agentapi` and `dev:agent` regex-parse `OPENROUTER_API_KEY` out of `apps/api/.env`, so that key must be present there even if you also set it in `apps/agent-api/.env`.

### Not needed to boot

Every `MCP_SMOKE_*`, `VIBEY_SMOKE_*`, `SMOKE_*`, `*_BACKFILL_*`, `*_EVAL_*`, all `AGENT_RUNTIME_AUTOSCALER_*`, all `CHAT_PREWARM_*`, and every var in the "never read" list.

---

## Open Questions

1. **Why is `apps/web/.env` a byte-identical copy of `apps/api/.env`?** Deliberate convenience or an accidental `cp`? Nothing in `apps/web` reads more than ~6 of its 91 keys. **UNKNOWN** — this is the single highest-value question to answer, and deleting it is the likely correct fix.
2. **What is Supabase project `mjaxhuehopzbsuhmseeg`?** Allowlisted for images in `apps/web/next.config.js` but is neither the production project (`lhfgtsjetcardinpgouq`) nor the documented legacy one (`qfrvykscoymiwwgysvsr`). **UNKNOWN**
3. **Which of `docker/openclaw.json`, `openclaw-full.json`, and the 4 `.bak` files is authoritative?** `openclaw.json` is currently modified in the working tree. **UNKNOWN**
4. **Are the 34 dead OAuth keys** (Calendly, Fathom, GitHub App, Meta, Higgsfield, Stripe Connect, Supabase OAuth) removed features or unbuilt ones? Determines delete-vs-implement. **UNKNOWN**
5. **`AGENT_RUNTIME_AUTOMATION_QUEUE_ENABLED` and `_DISABLED` both exist.** Which wins if both are set? Not traced. **UNKNOWN**
6. **Are `NEXT_PUBLIC_REQUIRE_ADMIN` / `NEXT_PUBLIC_WAITLIST_MODE` / `NEXT_PUBLIC_ALLOW_FREE_ONBOARDING` re-enforced server-side?** Client flags are bypassable by definition. Not verified in this pass. **UNKNOWN**
7. **Do openclaw's six ignored security overrides matter in practice?** Requires resolving `tar` / `tough-cookie` / `form-data` / `qs` versions actually installed in the lockfile against their CVEs. **UNKNOWN**
8. **Where does `apps/openclaw` (347 distinct env reads) get its config in production?** Partly `docker/openclaw.json` and Fly `[env]`, but the full mapping was not traced — vendored code was deliberately out of scope.
9. **`CORS_ORIGIN` and `OPENCLAW_AGENT_ID`** appear in examples/deploy configs but not in any `process.env` read. Consumed by vendored openclaw via a config object, or genuinely dead? **UNKNOWN**
10. **Is `apps/web/.env.local.example` stale?** Its unique keys (`ANTHROPIC_API_KEY`, `DEFAULT_MODEL`, `WIDGET_GENERATE_VIA_AGENT`, `GOOGLE_AI_API_KEY`) are all in the never-read list. **LIKELY stale**, unconfirmed.
