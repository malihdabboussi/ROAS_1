# Repository Overview

**Repo:** `/Users/malihdabboussi/Desktop/projects/ROS/ROAS-X-1DSLABS`
**Package name at root:** `vibey-v2` (private)
**Product name in use:** ROAS Platform (formerly / internally "Vibey")
**Branch mapped:** `main` @ `f4757c2b`

> **Naming warning.** The repository is mid-rebrand. The npm scope is `@vibey/*`, the root package is
> `vibey-v2`, the DB tables use `ns_*` (NeuralSnap) and `vb_*` prefixes, and the product is called ROAS.
> All three names refer to the same system. See `18-glossary.md`.

---

## Repository Type

**Monorepo** (pnpm workspaces + Turborepo) containing a **hybrid architecture**:

- a **modular monolith backend** (`apps/api` — one NestJS app with 57 feature modules, deployed as a
  single Vercel serverless function),
- a **second backend service** (`apps/agent-api` — a separate NestJS app for the agent runtime),
- a **vendored third-party runtime** (`apps/openclaw` — an in-tree copy of the open-source OpenClaw
  agent gateway, 673k LOC, MIT),
- **two BullMQ worker services** (`apps/mission-worker`, `apps/queue-worker`),
- **five Next.js frontends** (`web`, `admin`, `website`, `funnels`, `docs`),
- **one edge worker** (`workers/apps-proxy`, Cloudflare),
- a browser extension, a CLI tool, and 7 shared packages.

It is **not** a clean microservice system: the services share one Supabase database directly, and
`apps/api` reaches into most domains itself. It is best described as **a monolith plus an agent
runtime plus workers, all sharing one Postgres**.

### Scale

| Metric                                   | Value                                                      |
| ---------------------------------------- | ---------------------------------------------------------- |
| Workspaces (`pnpm-workspace.yaml`)       | 20 declared + `workers/apps-proxy` (not in workspace file) |
| Total TS/TSX lines                       | **~2.1 million**                                           |
| Lines excluding vendored `apps/openclaw` | **~1.4 million**                                           |
| Supabase migration files                 | **937**                                                    |
| NestJS controllers in `apps/api`         | **336** (1,632 routes)                                     |
| Next.js page routes in `apps/web`        | **57**                                                     |
| Test files across the repo               | **~3,540**                                                 |
| CI workflows                             | **0** (only `.github/pull_request_template.md` exists)     |

---

## Technology Stack

| Layer               | Technology                                                                                                 | Evidence                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Language            | TypeScript 5.7                                                                                             | `tsconfig.base.json`, all workspaces                                   |
| Runtime             | Node — `engines` says `>=20` at root, `22.x` in apps                                                       | root `package.json`, `apps/*/package.json`                             |
| Package manager     | pnpm **9.15.4** (pinned via `packageManager`)                                                              | root `package.json`                                                    |
| Build orchestration | Turborepo 2.x                                                                                              | `turbo.json`                                                           |
| Frontend            | Next.js 16 (web/admin), Next.js 15 (website/funnels/docs), React 19, Tailwind                              | `apps/*/next.config.*`                                                 |
| Frontend state      | **Zustand 5** (20+ stores) + React Context. **No react-query anywhere.**                                   | `apps/web/src/**/use-*-store.ts`                                       |
| Backend             | NestJS 11 on Express                                                                                       | `apps/api/src/main.ts`, `apps/agent-api/src/main.ts`                   |
| Validation          | Zod via a custom `ZodValidationPipe` (opt-in, ~120 of ~336 controllers)                                    | `packages/api-shared`                                                  |
| Database            | Supabase Postgres + **pgvector** (768-dim) + Supabase Auth (GoTrue) + Supabase Realtime + Supabase Storage | `supabase/`, `packages/api-shared`                                     |
| ORM                 | **None.** `@supabase/supabase-js` client + raw `pg` pool for transactions                                  | no Prisma/TypeORM in the repo                                          |
| Queues              | BullMQ + ioredis                                                                                           | `apps/mission-worker`, `apps/queue-worker`                             |
| Async trigger       | Postgres **outbox tables + LISTEN/NOTIFY**                                                                 | `mission_outbox`, `brain_ops_outbox`, `dream_ops_outbox`               |
| Agent runtime       | OpenClaw gateway (WebSocket + OpenAI-compatible HTTP)                                                      | `apps/openclaw`, `docker/openclaw.json`                                |
| LLM routing         | OpenRouter (primary), Anthropic, OpenAI Codex, Google Gemini                                               | `docker/openclaw.json`, `apps/agent-api/.../openclaw-model-routing.ts` |
| Testing             | Vitest (everywhere) + Playwright (web E2E only)                                                            | `apps/*/vitest.config.ts`, `playwright.config.ts`                      |
| Linting             | ESLint flat config with custom architecture rules                                                          | `eslint.config.mjs`                                                    |
| Architecture gate   | Custom LOC + import checker with an allowlist                                                              | `scripts/arch/check-loc.mjs`, `scripts/arch/loc-allowlist.json`        |
| Error tracking      | Sentry (`@sentry/nestjs`, `@sentry/node`, `@sentry/nextjs`)                                                | app `package.json` files                                               |
| Git hooks           | Husky + lint-staged (pre-commit runs the arch gate)                                                        | `.husky/pre-commit`                                                    |

---

## Top-Level Folder Map

| Path                                      | Purpose                                                                                                            | Runtime Importance             | Notes                                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `apps/`                                   | All deployable applications (12)                                                                                   | **CRITICAL**                   | See "Applications" table below                                                                                                      |
| `packages/`                               | Shared libraries (7)                                                                                               | **HIGH** for 3, **NONE** for 4 | `api-shared`, `agent-policy`, `context-breakdown` are live. `ui`, `db`, `widget-catalog`, `vibey-sdk` are unused by the build graph |
| `workers/apps-proxy/`                     | Cloudflare Worker for `*.agents.roas.io` edge routing                                                              | **MEDIUM**                     | Not listed in `pnpm-workspace.yaml`; deployed via `scripts/roas/deploy-apps-proxy.sh`                                               |
| `supabase/`                               | 937 migrations, a partial `schema.sql`, 1 edge function, verification SQL                                          | **CRITICAL**                   | The real schema source of truth. See `06-database-map.md`                                                                           |
| `docker/`                                 | Fly.io Dockerfile, `openclaw.json` (6,897 lines), supervisord config, agent workspaces, the `vibey-backend` plugin | **CRITICAL**                   | This is where the agent runtime is actually configured                                                                              |
| `scripts/`                                | Deploy, seed, smoke, eval, security, architecture scripts                                                          | **HIGH** (deploy + arch gate)  | Some are destructive — see `12-existing-tests.md` for the safe/unsafe split                                                         |
| `plugins/roas-missions/`                  | A Claude Code plugin (MCP mission ops)                                                                             | **NONE** (dev tooling)         | Active; wired via `.claude-plugin/marketplace.json`                                                                                 |
| `product-video/`                          | A Remotion promo-video project                                                                                     | **NONE**                       | Standalone; not in the pnpm workspace                                                                                               |
| `documentation/`                          | Canonical feature + utility docs                                                                                   | **NONE** (docs)                | Actively maintained (last touched 2026-09-03)                                                                                       |
| `.docs/`                                  | Internal plans, guidelines, changelogs, architecture notes                                                         | **NONE** (docs)                | Actively maintained. Contains `.docs/plans/agent-follow-up-work.md` — **40,325 lines / 2,944 tracked debt entries**                 |
| `.documentation/`                         | Deep-dive architecture notes                                                                                       | **NONE** (docs)                | Stale since the initial snapshot                                                                                                    |
| `docs/`                                   | Legacy integration notes                                                                                           | **NONE** (docs)                | Superseded by `documentation/` and `apps/docs/content/`                                                                             |
| `references/`                             | Two blog/SEO reference markdown files                                                                              | **NONE**                       | Unmaintained                                                                                                                        |
| `.agents/`, `.claude/`, `.claude-plugin/` | AI-agent operating instructions, skills, hooks, commands                                                           | **NONE** (agent tooling)       | Active                                                                                                                              |
| `.worktrees/`                             | Local git worktrees for parallel agent sessions                                                                    | **NONE**                       | Ephemeral, local-only                                                                                                               |
| `logs/`                                   | MCP Puppeteer logs from June 2026                                                                                  | **NONE**                       | **Debris** — should not be in the repo                                                                                              |
| `public/` (root)                          | A static architecture-diagram HTML + images                                                                        | **NONE**                       | Not served by any app; each app has its own `public/`                                                                               |
| `patches/`                                | pnpm patches for `@mariozechner/pi-ai` and `pi-agent-core`                                                         | **HIGH**                       | Required for the OpenClaw agent loop to build correctly                                                                             |
| `node_modules/`, `.turbo/`                | Install + cache artifacts                                                                                          | —                              | Generated                                                                                                                           |

### Root loose files

| File                                                          | Verdict                                                                                                                      |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md` (21 KB), `CLAUDE.md`                              | **Meaningful** — the operating protocol for AI agents; also the best existing deploy documentation                           |
| `README.md`                                                   | **Outdated** — says "Next.js 14", "Single VM (Sprint 1)". Reality is Next.js 16 + Vercel + Fly + Railway. Use as a clue only |
| `Roas-Repo-study.md` (6.4 MB)                                 | **Debris** — untracked local Codex conversation export                                                                       |
| `SIDEBAR-AUDIT.md`                                            | Documentation — a Feb-2026 sidebar gap analysis                                                                              |
| `team-invite-layer2.patch` (28 KB) + `team-invite-restore.md` | **Meaningful WIP** — a stashed team-invite feature awaiting restore                                                          |
| `Untitled`                                                    | **Debris** — contains one bare UUID                                                                                          |
| `embed-form-test.html`                                        | **Debris** — a manual iframe test pointing at the legacy `vibeyfunnels.com` domain                                           |
| `deno.lock`                                                   | **Debris** — the monorepo uses pnpm; likely a leftover from the Supabase edge function                                       |
| `skills-lock.json`                                            | Meaningful tooling — pins an agent skill hash                                                                                |
| `.vercel-env`                                                 | Contains the single word `staging`. Purpose unclear — see `17-open-questions.md`                                             |
| `playwright.config.ts`                                        | **Meaningful** — the single Playwright config, used by `apps/web`                                                            |

---

## Applications / Services Found

| Application                         | Path                          | Technology                                | Entry Point                                            | Port                 | Status                                                                                                                |
| ----------------------------------- | ----------------------------- | ----------------------------------------- | ------------------------------------------------------ | -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Web app** (main product)          | `apps/web`                    | Next.js 16 App Router                     | `src/app/layout.tsx`; gate at `src/middleware.ts`      | 3000                 | **ACTIVE — primary surface.** 682k LOC, 4,883 files                                                                   |
| **Platform API**                    | `apps/api`                    | NestJS 11                                 | `src/main.ts` (local) / `api/index.ts` (Vercel)        | 3001                 | **ACTIVE — core backend.** 365k LOC, 336 controllers                                                                  |
| **Agent API**                       | `apps/agent-api`              | NestJS 11 + `ws`                          | `src/main.ts`                                          | 3003                 | **ACTIVE — agent backend.** 206k LOC                                                                                  |
| **OpenClaw gateway**                | `apps/openclaw`               | Vendored MIT project `openclaw@2026.2.16` | `src/gateway-headless.ts` → `dist/gateway-headless.js` | 18789 (loopback)     | **ACTIVE but third-party.** 673k LOC — ~32% of the whole repo                                                         |
| **Mission worker**                  | `apps/mission-worker`         | NestJS 11 + BullMQ                        | `src/main.ts`                                          | 3005                 | **ACTIVE.** Bull Board at `/admin/queues`                                                                             |
| **Queue worker**                    | `apps/queue-worker`           | NestJS 11 + BullMQ                        | `src/main.ts`                                          | 3004                 | **ACTIVE.** Bull Board at `/admin/queues`                                                                             |
| **Apps proxy**                      | `workers/apps-proxy`          | Cloudflare Worker                         | `src/index.ts`                                         | edge                 | **ACTIVE (partially).** Only the `*.agents.roas.io` route is enabled; `*-app.roas.io` routes are deliberately dormant |
| **Funnels renderer**                | `apps/funnels`                | Next.js 15                                | `src/app/`                                             | **3002 (hardcoded)** | **DEPLOYED but source is stale** (last commit 2026-07-28). Serves `sites.roas.io`                                     |
| **Admin dashboard**                 | `apps/admin`                  | Next.js 16                                | `src/app/layout.tsx`                                   | **3002 (default)**   | **STALE** (last commit 2026-07-28). **Not in the deploy map** — appears local-only                                    |
| **Marketing website**               | `apps/website`                | Next.js 15                                | `src/app/page.tsx`                                     | 3010                 | **ACTIVE** (last commit 2026-08-31). Serves `roas.io`. Not in the deploy map                                          |
| **Docs site**                       | `apps/docs`                   | Next.js 15 + MDX                          | `src/app/[[...slug]]/page.tsx`                         | 3011                 | **ACTIVE** (last commit 2026-08-24). Serves `docs.roas.io`. Not in the deploy map                                     |
| **Chrome extension** ("Vibey Mini") | `apps/chrome-extension`       | Vite 7 + React 19, MV3                    | `public/manifest.json` + 4 Vite entries                | n/a                  | **STALE** (last commit 2026-07-10). Manual `pnpm pack` → sideload                                                     |
| **OpenRouter model scout**          | `apps/openrouter-model-scout` | CLI (`tsx`)                               | `src/cli.ts`                                           | n/a                  | **DEV TOOL.** No other workspace references it                                                                        |

### Port collision (confirmed)

`apps/admin` defaults to **3002** and `apps/funnels` hardcodes **3002**. Running root `pnpm dev`
starts both and one will fail to bind. This is acknowledged in `AGENTS.md`.

---

## Package Managers

- **pnpm 9.15.4**, pinned via the root `packageManager` field, with `pnpm-workspace.yaml`.
- `.npmrc` sets `strict-peer-dependencies=false`, `auto-install-peers=true`, `allow-non-applied-patches=true`.
- Two patched dependencies in `patches/`: `@mariozechner/pi-ai@0.52.12` and `@mariozechner/pi-agent-core@0.52.12`.
- `deno.lock` at the root is a leftover, almost certainly from the Supabase edge function.
- **Known friction:** pnpm 9 emits `The "pnpm" field in package.json is no longer read by pnpm` on every
  command, ignoring `neverBuiltDependencies`, `patchedDependencies`, and `overrides`. That means the two
  patches above may **not** be applied under the currently installed pnpm. Flagged in `17-open-questions.md`.

## Build Systems

- **Turborepo** (`turbo.json`) with tasks `dev`, `build`, `test`, `test:e2e`, `typecheck`, `lint`, `clean`.
  `build` depends on `^build`, so package builds cascade.
- Per-app builds: `next build` (Next apps), `nest build` / `tsc` (Nest apps), `tsdown` (OpenClaw), `vite build` (extension).
- `packages/api-shared` compiles with plain `tsc` and **its `dist/` is deliberately committed to git**
  (294 tracked files; `.gitignore` line un-ignores it with `!packages/api-shared/dist/`) so that Vercel
  builds resolve the prebuilt output without a package build step. This creates a real
  **source/dist drift risk**.
- **Per repo policy, builds are never run automatically.** This mapping did not run any build.

## Deployment Technologies

| Surface                                    | Provider                                                                                                                                                | Trigger                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `apps/web`                                 | Vercel                                                                                                                                                  | git push → preview; merge to `main` → production (`app.roas.io`)          |
| `apps/api`                                 | Vercel project `roas-api` (`api.roas.io`) — a **single serverless function** with a catch-all rewrite `/(.*)` → `/api`, plus 4 dedicated cron functions | same as web                                                               |
| `apps/agent-api` + OpenClaw                | **Fly.io** app `roas-runtimes`, one image running 3 processes under supervisord                                                                         | Manual: `bash scripts/roas/deploy-fly-runtimes.sh`                        |
| `apps/mission-worker`, `apps/queue-worker` | **Railway** project `roas-workers` (mission-worker is confusingly the service named `roas-platform`)                                                    | auto-deploy on merge to `main`                                            |
| `workers/apps-proxy`                       | **Cloudflare Workers**                                                                                                                                  | Manual: `scripts/roas/deploy-apps-proxy.sh`                               |
| `apps/funnels`                             | Vercel project `roas-funnels` (`sites.roas.io`)                                                                                                         | not documented in the deploy map                                          |
| `apps/website`, `apps/docs`, `apps/admin`  | **Not in the documented deploy map**                                                                                                                    | `roas.io` / `docs.roas.io` referenced elsewhere; admin appears local-only |

**There is no CI.** `.github/` contains only `pull_request_template.md` — no workflows, no test gate,
no lint gate on PRs. The only automated quality gate is the local Husky pre-commit hook.

## Database Technologies

- **Supabase Postgres** — single project. Production is **`lhfgtsjetcardinpgouq`** only.
  A legacy project `qfrvykscoymiwwgysvsr` exists and is explicitly forbidden for production use.
- **pgvector** — 768-dimension embeddings (Gemini `text-embedding-004` convention) on ~12 tables.
- **Supabase Auth (GoTrue)** — the only identity provider.
- **Supabase Realtime** — heavily used by `apps/web` (~30 tables subscribed).
- **Supabase Storage** — media bucket.
- **Row Level Security** — enabled on most user-facing tables; org-scoped and user-scoped policy patterns.
- **Direct Postgres (`pg` pool)** — used where transactions or `LISTEN/NOTIFY` are needed (missions, outboxes).
- **No local database setup exists.** There is no `supabase/config.toml`, so `supabase start` is not wired.

## External Services Detected

~45 distinct third-party services. Full detail in `09-integrations.md`. Headline groups:

- **LLM / AI:** OpenRouter, Anthropic, OpenAI Codex, Google Gemini, Deepgram, ElevenLabs (via Composio)
- **Payments:** Stripe (platform billing **and** a separate Stripe Connect integration), PayPal, Fanbasis
- **Infrastructure:** Fly.io (per-user agent machines), Modal (sandboxes), Vercel API, Cloudflare (DNS + Turnstile + Workers), Railway
- **Comms:** SendGrid, Slack (12k-LOC native module), Telegram
- **CRM / marketing:** GoHighLevel, ActiveCampaign, Meta/Facebook Ads (8.4k LOC — the deepest integration), Page Grader (6.5k LOC)
- **Meetings:** Fathom, Fireflies, Calendly, Zoom (via Composio)
- **Files / productivity:** Google Drive, Google Workspace, Dropbox, WordPress, GitHub, Canva, Notion/Airtable/HubSpot/Salesforce (all via Composio)
- **Data / research:** ScrapeCreators, SearchApi, DataForSEO, Firecrawl
- **Aggregator:** Composio (fronts ~15 of the toolkits above)
- **Observability:** Sentry, Microsoft Clarity (website only)

---

## Initial Observations

1. **A third of the repo is vendored third-party code.** `apps/openclaw` is 673k LOC of an MIT-licensed
   upstream project copied in-tree (not a submodule). Any "how big is this codebase" answer must
   subtract it. The ROAS-specific deltas are a handful of files: `gateway-headless.ts`,
   `docker/openclaw.json`, and `docker/tools/vibey-backend`.

2. **The architecture is documented far better than it is enforced.** `AGENTS.md` is 190 lines of strict
   rules; the architecture gate has an allowlist with **145 LOC violations and 184 files with
   cross-feature imports** already grandfathered in, and the gate **currently fails** on the working tree.

3. **A LOC-limit workaround has become an architectural pattern.** 66 files named `*-NN.base.ts` form
   abstract-class inheritance chains — `SpaceAutomationService` is split across **19 files** totalling
   ~10.5k LOC. The gate only inspects `*.service.ts`, so the chain is invisible to it. See `07-dependency-map.md`.

4. **Auth is opt-in, not global.** There is no `APP_GUARD` in `apps/api`. Every controller must remember
   `@UseGuards(AuthGuard, ...)`. 316 of 336 do; 20 do not. A new endpoint ships unprotected by default.

5. **The database has no reliable schema source.** `supabase/schema.sql` is a hand-written early design
   doc covering 26 tables, not a dump. Core tables (`campaigns`, `conversations`, `contacts`, `funnels`)
   have **no `CREATE TABLE` anywhere** — they predate the migration history. A fresh database cannot be
   built from this repo.

6. **`packages/db` — the "typed database client" — is dead.** Nothing imports it, and its types were
   hand-written against the stale `schema.sql`.

7. **The product has real depth.** This is not a thin CRUD app. There is a genuine agent runtime with a
   policy engine, a tool-error contract, a workflow circuit breaker, a pgvector knowledge system with
   multiple retrieval lanes, an outbox-driven mission engine, and 45 integrations. The mess is in the
   organisation, not the ambition.

8. **Frontend and backend concerns are cleanly separated at the transport layer** (everything goes
   through `/api/proxy`), but **badly mixed within the frontend** — 429 cross-feature import statements,
   and hooks that query Supabase directly with `eslint-disable` comments.
