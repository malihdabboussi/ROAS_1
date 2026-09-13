# How to Run the Project

> **Verification date:** 2026-09-05
> **Verified on:** macOS (darwin 23.6.0), x64
> **Result:** `apps/api` and `apps/web` were **successfully booted and served real HTTP traffic** during this mapping session. See [Commands Verified](#commands-verified) for the exact evidence.

---

## TL;DR for a new developer

You do **not** need the whole platform to be productive. There are three useful levels:

| Level                   | What you get                        | What you need                                                      |
| ----------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| **1. Frontend only**    | UI renders, `/login` works, no data | Node 22, `apps/web/.env.local` with 5 placeholder vars             |
| **2. Frontend + API**   | Real data, auth, most CRUD          | Level 1 + a Supabase project + `apps/api/.env`                     |
| **3. Full agent stack** | AI chat, agents, tools              | Level 2 + Redis + `apps/agent-api` + OpenClaw gateway + an LLM key |

Most feature work only needs Level 2.

---

## Prerequisites

### Runtime versions

| Tool    | Required   | Where declared                                             | Notes                                                    |
| ------- | ---------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| Node.js | **22.x**   | `package.json` → `engines`, and every app's `package.json` | **This is a hard requirement, not advisory.** See below. |
| pnpm    | **9.15.4** | `package.json` → `packageManager`                          | Enforced by corepack                                     |
| Redis   | any recent | `apps/queue-worker`, `apps/mission-worker`, BullMQ         | Only needed for Level 3                                  |
| Docker  | optional   | `docker/`                                                  | Not required for local dev; used for Fly.io images       |

**CONFIRMED — Node 22 is genuinely mandatory.** This was tested empirically across four Node versions:

| Node version | Result                                                                                  |
| ------------ | --------------------------------------------------------------------------------------- |
| 20.11.0      | ❌ `apps/web` vitest config fails to load — `ERR_REQUIRE_ESM` on `@vitejs/plugin-react` |
| 21.x         | ❌ same failure                                                                         |
| **22.23.2**  | ✅ `apps/api` boots, `apps/web` boots and serves pages                                  |
| 23.11.1      | ⚠️ apps boot, but every workspace emits `Unsupported engine: wanted {"node":"22.x"}`    |

Note the root `package.json` says `"engines": { "node": ">=20" }` while every individual app says `"node": "22.x"`. **The root declaration is wrong** — Node 20 cannot run this repo. Treat the per-app value as authoritative.

Recommended setup:

```bash
nvm install 22
nvm use 22
corepack enable
```

### Known environment warnings (harmless but noisy)

Every pnpm command in this repo prints:

```text
[WARN] The "pnpm" field in package.json is no longer read by pnpm. The following keys were ignored:
       "pnpm.neverBuiltDependencies", "pnpm.patchedDependencies", "pnpm.overrides"
```

This is **not cosmetic** — see [Known Startup Problems](#known-startup-problems). `apps/openclaw/package.json` triggers the same warning for its own `pnpm.overrides`, `pnpm.minimumReleaseAge`, and `pnpm.onlyBuiltDependencies`.

---

## Required Services

| Service                                               | Needed for                                      | Local default                                           | If missing                             |
| ----------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------- | -------------------------------------- |
| **Supabase (Postgres + GoTrue + Storage + Realtime)** | everything above Level 1                        | hosted project (no local `supabase/config.toml` exists) | API boots, but every data call fails   |
| **Redis**                                             | BullMQ queues, `queue-worker`, `mission-worker` | `localhost:6379`                                        | Background jobs silently never run     |
| **OpenClaw gateway**                                  | agent/chat execution                            | `localhost:18789`                                       | Chat UI loads, messages never complete |
| **LLM provider (OpenRouter)**                         | agent responses                                 | —                                                       | Agent runs fail                        |

> **There is no local Supabase.** The repo has a `supabase/migrations/` folder but **no `supabase/config.toml`**, so `supabase start` is not wired up. You must point at a hosted project.

### ⚠️ Which Supabase project does local dev point at?

**UNRESOLVED — read this before running anything that writes.**

- `CLAUDE.md` states the only production project is `lhfgtsjetcardinpgouq`, and that the legacy project is `qfrvykscoymiwwgysvsr`.
- The actual on-disk `apps/api/.env` and `apps/web/.env` point at a **third project: `sicxiwyukxtqicevlwuc`** — which is documented nowhere.

Until someone confirms whether `sicxiwyukxtqicevlwuc` is a staging project or a forgotten production one, **treat the local `.env` as pointing at real data**. Tracked in `17-open-questions.md`.

---

## Required Environment Variables

Full inventory is in [`11-configuration.md`](./11-configuration.md). This section covers only what you need to _boot_.

Secret values are never reproduced in this documentation — only variable names.

### Minimum for `apps/web` to not 500 on every request

`apps/web/src/middleware.ts` reads these with **non-null assertions** (`!`), so if they are undefined the middleware throws on every single request:

| Variable                        | Used by       | Required?         | Purpose                  | Read at                                         |
| ------------------------------- | ------------- | ----------------- | ------------------------ | ----------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | web           | **REQUIRED**      | Supabase project URL     | `apps/web/src/middleware.ts:42`                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web           | **REQUIRED**      | Supabase anon key        | `apps/web/src/middleware.ts:43`                 |
| `BACKEND_URL`                   | web (server)  | REQUIRED for data | Where the proxy forwards | `apps/web/src/app/api/proxy/[...path]/route.ts` |
| `NEXT_PUBLIC_BACKEND_URL`       | web (browser) | REQUIRED for data | Direct browser→API calls | various                                         |
| `AGENT_BACKEND_URL`             | web           | Level 3           | agent-api base URL       | various                                         |

With placeholder values, the middleware's 4-second timeout guard (`SUPABASE_TIMEOUT_MS`) degrades gracefully and public pages render.

### Additional for `apps/api`

| Variable                    | Required?                 | Purpose                                                                                                                                                                                                        |
| --------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`              | REQUIRED                  | project URL                                                                                                                                                                                                    |
| `SUPABASE_SERVICE_ROLE_KEY` | REQUIRED                  | server-side DB access (bypasses RLS)                                                                                                                                                                           |
| `SUPABASE_JWT_SECRET`       | **probably NOT required** | Present in `.env.example` and `AGENTS.md`, but no live TypeScript path reads it — the auth guard verifies JWTs against the Supabase JWKS endpoint instead. See [`08-auth-security.md`](./08-auth-security.md). |
| `VAULT_ENCRYPTION_KEY`      | REQUIRED                  | AES-256-GCM key for stored integration tokens                                                                                                                                                                  |
| `REDIS_URL`                 | Level 3                   | BullMQ connection                                                                                                                                                                                              |
| `OPENROUTER_API_KEY`        | Level 3                   | LLM routing                                                                                                                                                                                                    |
| `PORT`                      | optional                  | defaults to `3001` (`apps/api/src/main.ts:96`)                                                                                                                                                                 |

> **`VAULT_ENCRYPTION_KEY` must be byte-identical in `apps/api/.env` and `apps/agent-api/.env`** or every stored integration token fails to decrypt. This is documented in `apps/agent-api/.env.example` and is a real, previously-hit failure mode.

### Optional integrations (degrade gracefully)

**CONFIRMED at runtime** — the API logs a warning and disables the feature rather than crashing:

```text
WARN [DeepgramIntegration]  DEEPGRAM_API_KEY not configured - transcription will fail
WARN [FirecrawlIntegration] FIRECRAWL_API_KEY not configured — website branding extraction disabled
WARN [SendGridIntegration]  SENDGRID_API_KEY not configured - email sending will fail
WARN [StripeService]        STRIPE_SECRET_KEY not configured -- billing Stripe disabled
WARN [OrgStripeService]     STRIPE_SECRET_KEY not configured -- org Stripe disabled
```

This is good design and worth preserving: you can boot the whole API with only Supabase credentials.

---

## Install Dependencies

```bash
nvm use 22
corepack enable
pnpm install
```

`pnpm install` resolves 20 workspace projects. **VERIFIED** — the lockfile is current ("Lockfile is up to date, resolution step is skipped").

---

## Database Setup, Migrations, Seed Data

### Migrations

**There is no migration runner wired into the repo.** There is:

- `supabase/migrations/` — ~937 `.sql` files
- No `supabase/config.toml`
- No `migrate` script in any `package.json`

**CONFIRMED:** migrations are applied out-of-band, via the Supabase dashboard or the Supabase CLI pointed at a hosted project. A newcomer cannot reconstruct the database from this repo with a single command.

Migration history also shows a renumbering event — both `supabase/migrations/007_user_roles.sql` and `supabase/migrations/20260214210819_user_roles.sql` exist, creating the same table. See [`06-database-map.md`](./06-database-map.md).

### Seed scripts

| Command                        | What it does                                                                               | Safe?                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------ | -------------------------------------- |
| `pnpm seed:system-agents`      | `scripts/seed-system-agents.ts`                                                            | ⚠️ writes to whatever `.env` points at |
| `pnpm seed:yc-demo`            | `scripts/seed-yc-demo/index.ts` — a large multi-phase demo fixture (~20k lines of content) | ⚠️ writes a lot of data                |
| `pnpm import:user-brain`       | `scripts/import-user-brain/index.ts`                                                       | ⚠️ writes                              |
| `pnpm import:brain-embeddings` | backfills pgvector embeddings                                                              | ⚠️ writes + costs LLM spend            |

**None of these were run during this mapping**, because the configured project may be production. Verify the target project before running any of them.

---

## ⚠️ CRITICAL: Running `apps/api` locally starts production cron jobs

This is the single most dangerous thing about this repo's local setup.

`apps/api/src/app.module.ts:85`:

```ts
...(shouldEnableInProcessScheduling() ? [ScheduleModule.forRoot()] : []),
```

and `apps/api/src/cron-runtime-policy.ts`:

```ts
export function shouldEnableInProcessScheduling(
  vercel: string | undefined = process.env.VERCEL,
): boolean {
  return vercel !== '1'
}
```

In production on Vercel, `VERCEL=1`, so in-process scheduling is **off** and crons run via `vercel.json`. **Locally, `VERCEL` is unset, so in-process scheduling is ON.** `apps/api/src/cron.service.ts` registers 10 jobs including `EVERY_30_SECONDS` and three `EVERY_MINUTE` jobs, plus `mcp-oauth-cleanup.service.ts` at 3 AM daily.

Because `apps/api/.env` points at a live Supabase project, **simply starting the API on your laptop begins mutating that database within 30 seconds.**

**Mitigation used during this mapping** — boot with scheduling disabled:

```bash
VERCEL=1 PORT=3001 pnpm --filter @vibey/api run dev
```

This is a read-only-safe way to inspect the API. It is a workaround, not a fix — the design flaw is that the safety switch is an inverted production-detection flag rather than an explicit opt-in.

---

## Startup

### Backend — `apps/api` (port 3001)

```bash
nvm use 22
VERCEL=1 PORT=3001 pnpm --filter @vibey/api run dev
```

- Entry point: `apps/api/src/main.ts` → `bootstrap()` → `createNestApp()`
- Global prefix `/api` (`main.ts:54`), except `/.well-known/oauth-authorization-server` and `/.well-known/openid-configuration`
- Express adapter with `enforceApiSurface` middleware applied _before_ Nest (`apps/api/src/middleware/external-surface.middleware.ts`)
- Body limit 15 MB; CORS `origin: true` with credentials
- **Cold boot takes ~3.5 minutes** on first run (TypeScript watch build of a very large project). Subsequent restarts are faster.

### Frontend — `apps/web` (port 3000)

```bash
nvm use 22
BACKEND_URL=http://localhost:3001 NEXT_PUBLIC_BACKEND_URL=http://localhost:3001 \
  pnpm --filter @vibey/web run dev
```

- Next.js 16 with **Turbopack** by default (`next dev --turbopack --hostname 127.0.0.1`)
- Webpack fallback available: `pnpm --filter @vibey/web run dev:webpack`
- `Ready in` ~40 s, but **individual routes compile on first request** and are slow: `/forgot-password` took 22 s, `/a/[agentKey]` took 43 s. This is dev-mode only.

### Agent API — `apps/agent-api` (port 3003)

```bash
pnpm dev:agentapi
```

This root script injects a lot of environment inline (see `package.json`). Notably it **reads `OPENROUTER_API_KEY` by regex out of `apps/api/.env`**:

```bash
OPENROUTER_API_KEY=$(node -p "require('fs').readFileSync('apps/api/.env','utf8').match(/^OPENROUTER_API_KEY=(.*)$/m)[1].trim()")
```

If `apps/api/.env` is missing or lacks that key, the script crashes with a null-dereference before anything starts. This is a hidden cross-app coupling — `apps/agent-api` cannot start without `apps/api`'s env file.

`apps/agent-api/src/main.ts:44` also hard-requires `OPENCLAW_CONFIG_PATH` or it throws at boot.

### OpenClaw agent runtime gateway (port 18789)

```bash
pnpm dev:agent
```

Runs `pnpm exec tsdown --no-clean && node dist/gateway-headless.js` inside `apps/openclaw` with a large inline env block. **CONFIRMED working** — a prior session's terminal shows it booting, migrating session `.jsonl` files, and running a `gmail-watcher` before being interrupted with Ctrl-C.

### Workers

```bash
pnpm --filter @vibey/queue-worker run dev     # BullMQ consumers
pnpm --filter @vibey/mission-worker run dev   # mission execution
```

Both require Redis. See [`10-background-processes.md`](./10-background-processes.md).

### ⚠️ Do not run bare `pnpm dev`

`pnpm dev` runs `turbo dev` across **all** workspaces. `apps/admin` defaults to port 3002 and `apps/funnels` **hardcodes** 3002, so they collide. Always use the focused scripts.

---

## Complete Local Startup Sequence

```text
1. nvm use 22 && corepack enable
2. pnpm install
3. Confirm which Supabase project your .env points at        ← do not skip
4. (Level 3 only) Start Redis:  redis-server
5. Start API:      VERCEL=1 PORT=3001 pnpm --filter @vibey/api run dev
                   wait for "[vibey-api] Running on http://localhost:3001"
6. (Level 3) Start agent-api:   pnpm dev:agentapi
7. (Level 3) Start OpenClaw:    pnpm dev:agent
8. (Level 3) Start workers:     pnpm --filter @vibey/queue-worker run dev
9. Start web:      pnpm --filter @vibey/web run dev
10. Open http://localhost:3000  → redirects to /login
```

---

## Expected Ports

| Port  | App                                 | Confirmed                 |
| ----- | ----------------------------------- | ------------------------- |
| 3000  | `apps/web` (Next.js)                | ✅ verified serving       |
| 3001  | `apps/api` (NestJS)                 | ✅ verified serving       |
| 3002  | `apps/admin` **and** `apps/funnels` | ⚠️ collision              |
| 3003  | `apps/agent-api` (NestJS)           | not booted this session   |
| 18789 | `apps/openclaw` gateway             | booted in a prior session |

---

## Health Checks

| Check                 | Command                                                             | Verified result                                                  |
| --------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| API alive             | `curl http://localhost:3001/api`                                    | ✅ `{"status":"ok","service":"vibey-api","version":"0.1.0",...}` |
| API auth guard active | `curl http://localhost:3001/api/users/me`                           | ✅ `401 {"message":"Missing or invalid Authorization header"}`   |
| OAuth discovery       | `curl http://localhost:3001/.well-known/oauth-authorization-server` | ✅ 200, full MCP OAuth metadata with 20 scopes                   |
| Web alive             | `curl http://localhost:3000/login`                                  | ✅ 200, `<title>Account \| ROAS</title>`                         |
| Web auth redirect     | `curl http://localhost:3000/`                                       | ✅ 307 → `/login?redirect=%2F`                                   |

---

## Known Startup Problems

| #   | Problem                                                                                                                                             | Severity     | Evidence                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------- |
| 1   | **Local API boot starts in-process crons against a live DB**                                                                                        | **CRITICAL** | `cron-runtime-policy.ts`, `cron.service.ts` (10 jobs, one every 30 s)  |
| 2   | Local `.env` points at undocumented Supabase project `sicxiwyukxtqicevlwuc`                                                                         | **HIGH**     | `apps/api/.env`, `apps/web/.env` vs `CLAUDE.md`                        |
| 3   | pnpm 9.15.4 ignores the root `pnpm` field, so `patchedDependencies` for `@mariozechner/pi-ai` and `@mariozechner/pi-agent-core` are **not applied** | **HIGH**     | pnpm warning on every command; patches are for the OpenClaw agent loop |
| 4   | `pnpm dev:agentapi` / `dev:agent` regex-scrape `apps/api/.env`; crash if absent                                                                     | MEDIUM       | root `package.json`                                                    |
| 5   | Root `engines.node: ">=20"` is false — Node 20 cannot run the repo                                                                                  | MEDIUM       | tested; vitest config fails to load                                    |
| 6   | `pnpm dev` port collision (admin vs funnels on 3002)                                                                                                | MEDIUM       | `apps/funnels` hardcodes 3002                                          |
| 7   | No migration runner and no `supabase/config.toml` — DB cannot be built from the repo                                                                | MEDIUM       | absence of both                                                        |
| 8   | `apps/web` test suite cannot run at all on any installed Node version                                                                               | HIGH         | see [`12-existing-tests.md`](./12-existing-tests.md)                   |
| 9   | First-request route compiles take 20–45 s in dev                                                                                                    | LOW          | measured                                                               |

---

## Missing Configuration

- No `supabase/config.toml` → no local database story.
- No CI workflow files → nothing enforces that any of this keeps working.
- No `docker-compose.yml` for local infra (Redis, Postgres) → each developer sets up their own.

---

## Commands Verified

| Command                                               | Status                      | Notes                                                                                      |
| ----------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------ |
| `pnpm install`                                        | ✅ VERIFIED                 | lockfile current, 20 workspaces                                                            |
| `VERCEL=1 PORT=3001 pnpm --filter @vibey/api run dev` | ✅ VERIFIED                 | booted, **1,632 routes mapped**, `Found 0 errors` from tsc                                 |
| `curl http://localhost:3001/api`                      | ✅ VERIFIED                 | 200 OK                                                                                     |
| `pnpm --filter @vibey/web run dev`                    | ✅ VERIFIED                 | `Ready in` ~40 s, pages render                                                             |
| `curl http://localhost:3000/login`                    | ✅ VERIFIED                 | 200, correct title                                                                         |
| `pnpm architecture:check`                             | ❌ FAILED                   | 25 violations (24 LOC, 1 cross-feature import)                                             |
| `pnpm security:openclaw-workspaces:check`             | ✅ VERIFIED                 | passed                                                                                     |
| `pnpm --filter @vibey/agent-policy test`              | ✅ VERIFIED                 | passed                                                                                     |
| `pnpm --filter @vibey/api-shared test`                | ❌ FAILED                   | 2/119 failed (`programmaticTsxRepair is not a function`)                                   |
| `pnpm --filter @vibey/api test`                       | ❌ FAILED                   | 36 files / 27 tests failed — NestJS DI error resolving `ErrorReporter` in `MachinesModule` |
| `pnpm --filter @vibey/web test`                       | ❌ FAILED                   | **all 981 files** fail in `tests/setup.ts`                                                 |
| `pnpm dev:agent` (OpenClaw)                           | ✅ VERIFIED (prior session) | gateway booted, gmail-watcher ran                                                          |
| `pnpm dev:agentapi`                                   | ⬜ NOT TESTED               | requires `OPENCLAW_CONFIG_PATH` + agent stack                                              |
| `pnpm --filter @vibey/queue-worker run dev`           | ⬜ NOT TESTED               | no local Redis                                                                             |
| `pnpm build`                                          | ⬜ NOT RUN                  | repo policy forbids unprompted builds                                                      |
| `pnpm seed:*`                                         | ⬜ NOT RUN                  | writes to a possibly-production database                                                   |
