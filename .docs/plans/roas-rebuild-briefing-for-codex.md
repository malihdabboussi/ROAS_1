# ROAS Rebuild — Context Briefing (for Codex / any debugging agent)

> **Purpose of this doc:** onboard a coding agent (Codex) that's joining to debug bugs in the running app. It explains *what we're building, why, how the pieces fit, what's already done, and where the current failures are.* Read this first, then `AGENTS.md` (the coding protocol), then the live status in `.docs/plans/roas-lovable-rebuild-provisioning.md`.
>
> **Author:** Cowork (Claude desktop agent handling accounts/DNS/dashboards/browser provisioning). Last updated 2026-07-07.

---

## 1. TL;DR

We are **re-launching an existing product ("Vibey") as "ROAS"** on the domain **`roas.io`**, on **fresh infrastructure owned entirely by Dylan** (`dylan@dylanvanas.com`). The **code is a monorepo** forked from the old Vibey repo into **`dylanvanas1/roas-platform`** (private). Most of the platform is wired and deploying; the app now boots but has bugs. Your job is to debug those bugs. Nothing here is "greenfield" — it's a mature codebase being re-homed onto new accounts/services, so **most bugs are integration/wiring/environment issues, not missing features.**

---

## 2. Why this exists (the business context)

Dylan and his business partner (Sefy) are amicably splitting. Dylan is rebuilding Vibey as **ROAS** on his own accounts so the two businesses are cleanly separated. Practical consequences that matter for debugging:

- **Everything must run under Dylan's identity** (`dylan@dylanvanas.com`), on his billing, with his API keys. Do **not** reuse or assume any old Vibey/Sefy shared credentials, workspaces, or keys. If you find a credential that looks carried over from the fork, flag it.
- The repo was **forked from `VibeyV2`**, so stale artifacts may exist (old `.env`, tmp files, references to old infra). Treat carried-over config with suspicion.
- This is a **research/testing phase**, not hardened production — the goal right now is "get it running end-to-end on the new stack," then fix bugs.

---

## 3. Who's working on this (multi-agent co-build)

Three agents coordinate through **one shared doc**: `.docs/plans/roas-lovable-rebuild-provisioning.md` (the "provisioning doc"). Each signs its notes.

| Agent | Owns |
|---|---|
| **Cowork** (Claude desktop) | Accounts, signups, DNS/Cloudflare, domain verification, platform dashboards, browser automation, the accounts registry sheet. Does **not** write app code or run migrations. |
| **Cursor** | Repo code, build/deploy fixes, migrations, env wiring on the platforms (has a `VERCEL_TOKEN` for API-driven deploy monitoring). |
| **Codex (you)** | Joining now to debug application bugs. |

**Coordination protocol:** read the provisioning doc's **"Agent notes (Cursor ⇄ Cowork)"** section for the latest handoffs and blockers. Leave your own notes signed `— Codex`. Don't duplicate work already logged there.

**Secrets rule (all agents):** never write secret *values* into git, chat, or any doc — only variable *names*, IDs, and locations. Secret values live in a gitignored local file (see §6).

---

## 4. Repo layout (monorepo — pnpm workspaces + turbo)

Root: `dylanvanas1/roas-platform` (private). Package manager **pnpm** (`pnpm-workspace.yaml`), build orchestration **turbo** (`turbo.json`). Node 22.

**Apps (`apps/`):**

| App | Stack | Deploy target | Notes |
|---|---|---|---|
| `api` | NestJS | **Vercel** (`roas-api`) — serverless via `apps/api/api/index.ts` | The platform backend. Big: ~40+ feature modules under `src/modules`. Also has a Dockerfile + `railway.json` (legacy). |
| `web` | Next.js (webpack build) | **Vercel** (`roas-web`) | The dashboard UI → `app.roas.io`. |
| `funnels` | Next.js | **Vercel** (`roas-funnels`) | Published funnels → `sites.roas.io` + `*.sites.roas.io`. One shared app (NOT per-funnel deploys). |
| `openclaw` | Docker | **Fly** (`roas-runtimes`) | Agent gateway/runtime. `fly.toml` + Dockerfile. |
| `agent-api` | — | **Fly** (`roas-runtimes`) | Agent API runtime. `railway.json` present but target is Fly. |
| `mission-worker` | NestJS worker (BullMQ) | **Railway** (`roas-workers`) | Long-lived worker. `railway.json` + Dockerfile. |
| `queue-worker` | NestJS worker | **Railway** (`roas-workers`) | Long-lived worker. `railway.json` (RAILPACK). |
| `admin`, `website`, `chrome-extension`, `docs` | — | (not in the current deploy gate) | |

**Shared packages (`packages/`):** `@vibey/api-shared`, `@vibey/agent-policy`, `@vibey/context-breakdown`, `@vibey/db`, `@vibey/ui`, `@vibey/vibey-sdk`, `@vibey/widget-catalog`. **These `@vibey/*` workspace packages are a recurring source of deploy bugs** — they must be built *and bundled/materialized* into serverless functions and Docker images or you get `Cannot find module '@vibey/...'` at build or runtime (see §8).

**Guidelines the code follows** (read the relevant one before editing — enforced by `AGENTS.md`): `.docs/guidelines/development/*` and `.docs/guidelines/architecture/*`. Styling is **strictly token-based** (`globals.css` utility classes only — no hex/inline styles; see AGENTS.md §5–5.5).

---

## 5. Infrastructure & deploy topology

| Layer | Service | Details |
|---|---|---|
| **DNS** | Cloudflare (zone `roas.io`) | `api.roas.io` → Vercel roas-api; `app.roas.io` → Vercel roas-web; `sites.roas.io` + `*.sites.roas.io` → Vercel roas-funnels. All 3 subdomains ownership-verified via `_vercel` TXT records. |
| **Database/Auth** | Supabase **`roas-production`** (ref `lhfgtsjetcardinpgouq`, us-east-1, org DVTEST, Pro) | **Standalone Supabase** (NOT Lovable Cloud). ~**745 migrations** in `supabase/migrations/`. Auth = **JWKS** (see §7). |
| **Backend API** | Vercel project `roas-api` | Serverless NestJS. |
| **Dashboard** | Vercel project `roas-web` | Next.js → `app.roas.io`. |
| **Funnels** | Vercel project `roas-funnels` | → `sites.roas.io`. |
| **Agent runtime** | Fly app `roas-runtimes` | `openclaw` + `agent-api` (Docker). **Not deployed yet.** |
| **Workers + queue** | Railway project `roas-workers` | Redis + `mission-worker` + `queue-worker`. |
| **Email** | SendGrid (via Twilio, login `dylan+1@dylanvanas.com`) | Domain auth for `roas.io` **verified** (6 DNS records live). |

Full account inventory (identities, plans, IDs — no secrets): **`ROAS-Accounts-Registry.xlsx`** in Dylan's COWORK folder.

---

## 6. Secrets architecture (important for env-related bugs)

- Master secrets live in a **gitignored** file: **`scripts/roas/roas-secrets.env`** (sections 1–12). **Never commit it. Never print values.**
- A sync script, **`scripts/roas/sync-roas-secrets-sections.py`**, reads the master values (sections 1–5) and **regenerates per-platform paste blocks**:
  - **§6** → Vercel **roas-api** env
  - **§7** → Vercel **roas-web** env
  - **§8** → Vercel **roas-funnels** env
  - **§9** → **Fly** roas-runtimes secrets
  - **§10** → **Railway** workers (both services)
- **Gotcha:** the sync **overwrites §6–§10 from the master sections.** If you paste a value directly into a generated §6–§10 block and then someone runs the sync, your paste is wiped. Always edit the **master** section, then run the sync.
- Cross-service **handshake secrets must match everywhere they appear**: `INTERNAL_API_TOKEN`, `OPENCLAW_GATEWAY_TOKEN`, `VAULT_ENCRYPTION_KEY`. A mismatch = silent auth failures between API ⇄ workers ⇄ Fly runtime.
- `REDIS_URL`: **internal Railway reference `${{Redis.REDIS_URL}}`** for the workers; the **public** Railway URL for Vercel roas-api (Vercel can't resolve `redis.railway.internal`).

---

## 7. Auth & data specifics

- **Auth = JWKS**, not legacy HS256. The API verifies user JWTs against `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` (Supabase `roas-production` signs with ECC P-256). There is **no `SUPABASE_JWT_SECRET` on Vercel** — don't add one or "fix" auth by reintroducing the shared secret. Relevant service: `SupabaseJwtVerifierService`.
- The DB is a **fresh `roas-production`** project with the full schema migrated in (~745 migrations). A couple of migrations had non-fatal duplicate-key errors (e.g., a Perplexity pricing row) — see `scripts/roas/.failed.log`. If you see "row already exists" seed issues, check there first.
- **No data migration** from old Vibey prod — the DB starts empty of business data. If bugs look like "missing rows / empty lists," that may be expected (fresh DB), not a code bug.

---

## 8. Current state — what's green, what's broken (as of 2026-07-07)

**Working:**
- DNS + all 3 domain ownership verifications ✅
- SendGrid domain auth ✅
- Supabase `roas-production` up, schema migrated ✅
- Vercel **roas-api builds READY** ✅
- Railway **queue-worker: Online** ✅
- All provider API keys collected + synced (OpenRouter, Composio, Gemini, Firecrawl, ScrapeCreators, DataForSEO, SendGrid, **Brave**, **Perplexity**, **SearchAPI.io**) ✅

**Broken / in progress (the debugging surface):**
- **`api.roas.io/api` returns HTTP 500 `FUNCTION_INVOCATION_FAILED`.** The build is READY but the serverless function crashes at runtime. History shows this is a **`@vibey/*` workspace-package bundling/materialization problem** in the Vercel serverless output (`Cannot find module '@vibey/api-shared'` class of error). Cursor's latest commit is literally *"Fix Vercel api cold start by preserving pnpm @vibey deps, materialize only packages…"*. **Start here for API bugs.** Relevant files: `apps/api/vercel.json` (`includeFiles` globs), `apps/api/api/index.ts` (serverless entry), `scripts/vercel-build.sh`.
- **`roas-web` build ERROR** (`vercel-build.sh` exit 1); earlier failures were **OOM** during `next build` (mitigated with `NODE_OPTIONS=--max-old-space-size=8192`, `NEXT_BUILD_WORKERS=1`, source maps off). `app.roas.io` currently returns **DEPLOYMENT_NOT_FOUND** because web hasn't successfully deployed.
- **`roas-funnels`** was green earlier; `sites.roas.io` may still be finishing SSL / a deploy.
- **Railway `mission-worker`**: build was blocked by a Railway snapshot-infra issue on the **Dockerfile** path; now switched toward **RAILPACK** (root directory cleared). It gets past the snapshot stage but **fails fast at `Build › Build image`** — a real build error Cursor is iterating on. `queue-worker` (RAILPACK) is fine, so compare the two.
- **Fly `roas-runtimes`** (openclaw + agent-api): **not deployed yet.** Anything that needs the agent runtime (chat streaming, agent tool calls, web search via Brave/Perplexity) will fail until Fly is up.

**Smoke test** (Cursor, latest): **0/3** — `api.roas.io/api` 500, `app.roas.io` not found, `sites.roas.io` fail.

---

## 9. Where the bugs most likely live (debugging heuristics)

Because this is a re-homed mature app, prioritize **integration/wiring** over logic:

1. **Workspace package resolution** in serverless/Docker builds (`@vibey/*` not bundled) — the #1 recurring failure. Check `includeFiles`, the build script, and that workspace deps are built *before* the app.
2. **Env var wiring** — a var present in code but missing/renamed in the platform env, or pasted into a §6–§10 generated block and then wiped by the sync (§6). Cross-check `process.env.*` / `ConfigService.get(...)` reads against what's actually set on the platform.
3. **Cross-service handshake mismatches** — `INTERNAL_API_TOKEN` / `OPENCLAW_GATEWAY_TOKEN` / `VAULT_ENCRYPTION_KEY` differing between API, workers, and Fly.
4. **Anything that depends on the un-deployed Fly runtime** — will look like a bug but is really "runtime not up yet."
5. **Fresh-DB expectations** — empty lists / missing seed rows may be expected, not bugs.
6. **Auth** — if requests 401/403, confirm the JWKS path and that no one reintroduced HS256 (§7).
7. **Redis URL scope** — worker using the public URL or Vercel using the internal one (§6).

When you catalog a bug, note: the failing surface (URL/endpoint/screen), the exact error, the suspected layer from the list above, and the file(s) involved.

---

## 10. Hard constraints ("do NOT" list)

1. Do **not** port the NestJS API to Supabase/Lovable edge functions (breaks Slack/Telegram webhooks, MCP OAuth, machine pool, BullMQ, crons).
2. Do **not** create a second Supabase project — `roas-production` is the one DB.
3. Do **not** do per-funnel Vercel deploys — one shared `apps/funnels` app.
4. Do **not** move workers off Railway (no Inngest/Lovable Jobs).
5. Do **not** put secret values in git/chat/docs — names/IDs/locations only.
6. Do **not** reintroduce `SUPABASE_JWT_SECRET` / HS256 — auth is JWKS.
7. Follow **`AGENTS.md`**: scoped changes, root-cause fixes, replace-don't-accumulate, token-only styling, and **append a changelog entry** to `.docs/logs/changelog<YYYY-MM-DD>.md` after every change.

---

## 11. Where to look first (quick index)

- **Coding protocol:** `AGENTS.md` (repo root) — the single source of truth for agents.
- **Live status & handoffs:** `.docs/plans/roas-lovable-rebuild-provisioning.md` → "Agent notes" + "Provisioning log" + deploy-gate table.
- **Guidelines:** `.docs/guidelines/development/*`, `.docs/guidelines/architecture/*`, `.docs/guidelines/design/design-guidelines.md`.
- **Secrets (gitignored):** `scripts/roas/roas-secrets.env` + `scripts/roas/sync-roas-secrets-sections.py`.
- **API serverless wiring:** `apps/api/vercel.json`, `apps/api/api/index.ts`, `scripts/vercel-build.sh`.
- **Vercel status helper:** `scripts/roas/vercel-status.sh` (Cursor-made).
- **Account inventory:** `ROAS-Accounts-Registry.xlsx` (Dylan's COWORK folder).

---

## 12. Observed app bugs (to be filled in)

> Dylan launched the app and noticed multiple bugs. List them here as they're triaged — one block per bug: **surface**, **exact error/behavior**, **suspected layer** (from §9), **files**, **status**.

- _[bug 1 — TBD]_
- _[bug 2 — TBD]_
- _[bug 3 — TBD]_

---

*Maintained by Cowork. If you (Codex) change infra assumptions or find that something above is stale, update this doc and note it in the provisioning doc so Cursor and Cowork stay in sync.*
