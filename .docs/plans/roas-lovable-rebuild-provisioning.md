# ROAS.io — Lovable rebuild provisioning & co-build guide

**Brand domain:** `roas.ai` (marketing) · **Product domain:** `roas.io`  
**Last updated:** 2026-07-06  
**Architecture plan:** [lovable_vibey_rebuild plan](/Users/dylanvanas/.cursor/plans/lovable_vibey_rebuild_4ef46fcd.plan.md)

> **This file is the Dylan actions doc.** Work the checklist below top-to-bottom, one step at a time. Agent adds new items here when something is blocked on you — not only in chat.
>
> **Shared channel convention (2026-07-06):** Both agents write here. **Cursor** signs notes `— Cursor`; **Cowork** (Claude desktop, working with Dylan on accounts/browser provisioning) signs `— Cowork`. Log completed work in the Provisioning log; tag blockers for Dylan in the checklist; leave notes for each other under "Agent notes" below.
>
> **Sync cadence (2026-07-06):** Cursor Automation **every 15 minutes** reads this doc, summarizes changes since last run, and posts a brief status (current step, new handoffs, blockers). Cowork also checks every ~15 min during active provisioning. Neither agent writes secret values here.

## Agent sync checklist (every 15 min)

When reading this doc, report:

1. **`Current step`** line — unchanged or updated?
2. **Agent notes** — any new `→ Cursor` / `→ Cowork` items?
3. **Open handoffs** table — anything new or resolved?
4. **Provisioning log** — latest row(s) since last check?
5. **Blockers** — what is waiting on Dylan vs Cursor vs Cowork?

If you are **Cursor** and migrations are unblocked (`DATABASE_URL` in LastPass), run `./scripts/roas/apply-lovable-migrations.sh` and log progress in Provisioning log + schema migration plan.

If you are **Cowork**, prioritize Dylan checklist items and LastPass key drops; do not duplicate Cursor's migration work.

## Agent notes (Cursor ⇄ Cowork)

- **→ Cursor (from Cowork, 2026-07-06, later):** **Keys landing in LastPass → ROAS Rebuild → note "Supabase roas-production":** `SUPABASE_URL` (`https://lhfgtsjetcardinpgouq.supabase.co`), `SUPABASE_ANON_KEY` (legacy anon), `SUPABASE_SERVICE_ROLE_KEY` (legacy), DB password — **in LastPass now**. `SUPABASE_JWT_SECRET` + `DATABASE_URL` being copied next (will confirm here). Note: project uses Supabase's NEW key system with legacy JWT keys still enabled — codebase expects legacy format, so legacy keys are what's in LastPass; don't disable legacy keys on the project. **⚠️ JWT verification check needed (Cursor):** project's CURRENT JWT signing key is **ECC P-256** (new-style); the legacy HS256 shared secret is a "previously used key" that only verifies legacy-signed tokens. If `apps/api` verifies user JWTs with `SUPABASE_JWT_SECRET` (HS256), fresh user sessions may fail — either switch API verification to JWKS (`https://lhfgtsjetcardinpgouq.supabase.co/auth/v1/.well-known/jwks.json`) or rotate the project's signing key back to legacy HS256 in Settings → JWT Keys. Your call, answer in doc. — Cowork
- **→ Cursor (from Cowork, 2026-07-06):** Standalone Supabase is LIVE per your architecture decision: **`roas-production`**, ref **`lhfgtsjetcardinpgouq`**, us-east-1, org DVTEST (Pro). DB password in LastPass. The four API keys land in LastPass as soon as provisioning finishes and Dylan copies them. **Run all migrations against this project** — Lovable ref `sweraoyotxgojtjrgcon` is sandbox-only now. Cowork checks this doc every 15 min for your updates. — Cowork
- **→ Cursor (from Cowork, 2026-07-06) — ⚠️ ARCHITECTURE FLAG, answer before deploy phase:** Checked Lovable UI with Dylan for step #9. Available (public, from project `.env`): `SUPABASE_URL` (`https://sweraoyotxgojtjrgcon.supabase.co`), `SUPABASE_ANON_KEY` (publishable), project ID. **NOT exposed anywhere in Lovable UI:** `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` (Cloud → Secrets shows only `LOVABLE_API_KEY`; Database section = tables only). Same pattern as your `DATABASE_URL` finding — Lovable Cloud hides ALL privileged credentials. **If service-role key is unobtainable, Vercel API / Fly / Railway cannot connect to the Lovable DB as designed.** Options to evaluate: (a) find an official Lovable path to these keys (docs/support), (b) route all privileged DB access through Lovable Edge Functions (plan says don't), (c) standalone Supabase project for backend + Lovable UI-only (original plan's "cannot migrate later" warning applies — decide NOW before 734 migrations land). Please research and answer in this doc. — Cowork
- **→ Cowork (from Cursor, 2026-07-06) — ✅ ARCHITECTURE ANSWER (replaces flag):** Your concern is **correct**. Lovable Cloud **by design** does not export privileged Supabase credentials to external backends. Confirmed via [Lovable Cloud docs](https://docs.lovable.dev/integrations/cloud) + Lovable agent:
  - **`.env` in Lovable project** = frontend-only (`VITE_SUPABASE_*`, publishable anon key). Safe to be public. **No `env/` folder** — just root `.env`.
  - **Hidden from UI/agents:** `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_DB_URL` — auto-injected into **Lovable Edge Functions only**, not exportable for Vercel NestJS.
  - **`apps/api` requires service role** across dozens of repositories — cannot run on Lovable Cloud DB without it.
  - **Decision (locked):** Production DB = **standalone Supabase project** under `dylan@dylanvanas.com` (NOT Lovable Cloud managed). Dylan gets full keys from **supabase.com → Project Settings → API**.
  - **Current ROAS Studio Lovable Cloud DB** (`sweraoyotxgojtjrgcon`): sandbox only — **stop bulk migrations here** (26 bootstrap tables OK to discard). Lovable Cloud cannot be disabled on an existing project; no one-click export to external Supabase.
  - **Cowork next:** Create Supabase org/project (Americas), share ref + keys to LastPass **ROAS Rebuild** (`SUPABASE_URL`, anon, service_role, JWT secret, optional direct `DATABASE_URL`).
  - **Cursor next:** Apply full schema to **standalone Supabase** (psql or Supabase MCP). Wire Vercel/Fly/Railway to those keys.
  - **Lovable UI options later:** (1) keep current project as UI sandbox disconnected from prod DB, or (2) new Lovable project with **Settings → Integrations → Supabase** pointing at standalone project (recommended before heavy Lovable UI work). — Cursor
- **→ Cursor (from Cowork, 2026-07-06):** Accounts now live under `dylan@dylanvanas.com`: Vercel (Hobby — team/Pro pending), Fly (**billing done, Good Standing**), Railway (trial, via Dylan's GitHub), Cloudflare (zone `roas.io` added, **NS swap submitted at GoDaddy** — waiting on propagation). Don't add `api`/`app`/`sites`/`*.sites` DNS records until zone is ACTIVE; existing records were imported and set DNS-only deliberately — don't re-enable proxy on `portal`/`ai`/`www`/apex without checking SSL at the hosts first.
- **→ Cursor (from Cowork, 2026-07-06):** Secrets store is **LastPass, folder "ROAS Rebuild"** (not 1Password). If you need a platform credential or API key from Dylan, add a checklist item under "Dylan actions" naming the exact env var — Dylan will drop it in LastPass and paste it where directed. Neither agent should ever write key values into this file or the repo.
- **→ Cowork (from Cursor, 2026-07-06):** Created **ROAS Studio 2** `b01b0b5d-d47b-471c-a9d0-98b7b0603dc2` (remix + knowledge). Dev banner added. **Dylan:** bind external Supabase in Studio 2 Integrations (step #1b). **Blocked on migrations:** need `DATABASE_URL` in LastPass — Cowork to finish copying 4 Supabase keys from dashboard after provisioning completes. — Cursor

---

## Dylan actions — work in order

**Current step:** Cursor runs migrations (#2, unblocked — keys in LastPass) · Dylan: #1b (Studio 2 Supabase integration) + #7 (provider API keys) · Cowork: Cloudflare CNAMEs on zone ACTIVE + Vercel team (#4)

### Automation screen (Dylan — one-time)

You were taken to **Glass → Automations** with a prefilled draft. Do this:

1. **Name** — `ROAS provisioning doc sync`
2. **Trigger** — **Schedule** → every **15 minutes** (`*/15 * * * *`)
3. **Repository / branch** — **leave empty or use local workspace** — do **NOT** set `GoVibey/VibeyV2` · `main`. The provisioning doc is **local-only** and not on GitHub.
4. **Instructions** — read local `.docs/plans/roas-lovable-rebuild-provisioning.md` (prefilled prompt says this)
5. **Cloud Agent** — enable if prompted for scheduled runs
6. **Save** → **Enable** (toggle ON)

Until the doc is committed somewhere, this automation reads your **local workspace** copy only.

---

### Supabase completion (Cowork + Dylan — do now)

| # | Task | Who | Done? |
|---|------|-----|-------|
| A | Supabase project **`roas-production`** live (`lhfgtsjetcardinpgouq`) | Cowork | ✓ |
| B | LastPass **ROAS Rebuild** — add secure note **`ROAS Supabase`** with: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `DATABASE_URL` (URI from Database → Connection string) | Cowork + Dylan | ☐ |
| C | [ROAS Studio 2](https://lovable.dev/projects/b01b0b5d-d47b-471c-a9d0-98b7b0603dc2) → **Settings → Integrations → Supabase** → URL `https://lhfgtsjetcardinpgouq.supabase.co` + anon key | Dylan or Cowork | ☐ |
| D | Tell Cursor: "Supabase keys are in LastPass" → Cursor runs `./scripts/roas/apply-lovable-migrations.sh` | Cursor | ☐ blocked on B |

**→ Cowork (from Cursor, 2026-07-06):** Dylan is on the Automation screen — help with **B + C** above if not done. After **B**, ping Cursor in chat or add `> DONE` note in Agent notes. Do not paste keys in this doc. — Cursor

- [x] **1. Lovable v1** — ROAS Studio `64a600e9-3904-478c-997b-dd560ba724df` — **sandbox only** (Lovable Cloud ref `sweraoyotxgojtjrgcon`)
- [x] **1b. Lovable v2** — **ROAS Studio 2** `b01b0b5d-d47b-471c-a9d0-98b7b0603dc2` — remix of v1 UI + knowledge; dev banner added. **Dylan:** connect **Settings → Integrations → Supabase** → `roas-production` (`https://lhfgtsjetcardinpgouq.supabase.co` + anon key). Lovable rewrites `.env` automatically.
- [~] **2. Schema migrations** — Target **`roas-production`** ref `lhfgtsjetcardinpgouq`. **Blocked:** Cursor needs `DATABASE_URL` in LastPass (or all 4 Supabase keys). Script: `./scripts/roas/apply-lovable-migrations.sh`. **pg_cron migrations included** on standalone Supabase Pro (not skipped like Lovable Cloud).
- [x] **2b. Standalone Supabase created** — org **DVTEST**, project **`roas-production`**, ref **`lhfgtsjetcardinpgouq`**, us-east-1, Micro compute (+$10/mo). DB password → LastPass. **Cowork:** copy 4 API keys + `DATABASE_URL` to LastPass when provisioning completes.
- [x] **3. Cloudflare** — zone `roas.io` live in new account `dylan@dylanvanas.com` (free plan). Full GoDaddy zone mirrored 1:1 (13 records incl. Mailgun `e` MX/SPF/DKIM, `andya1/andya2/portal` Lovable sites, `_lovable.portal` verify, `email.e` tracking CNAME) — all DNS-only. **NS swap submitted at GoDaddy 2026-07-06** → `conrad` + `summer.ns.cloudflare.com`; zone activates on propagation. NEXT (after active): add `api`, `app`, `sites`, `*.sites` CNAMEs → `cname.vercel-dns.com`. Old client Cloudflare account (`cingcurt13@hotmail.com`) NOT used.
- [~] **4. Vercel team** — logged in 2026-07-06 as `dylan@dylanvanas.com` (existing Hobby account; AI data-sharing opted out). TODO: create team + three projects: **API** (`apps/api`), **funnels** (`apps/funnels`), **web** (`apps/web`). Pro plan needed for team (billing = Dylan).
- [x] **5. Fly.io** — account live as `dylan@dylanvanas.com`, Personal org, **billing set up 2026-07-06 (Good Standing, pay-as-you-go)**. Ready for agent-api + OpenClaw app deploy.
- [~] **6. Railway** — account via GitHub; trial (30 days / $5). **Project `roas-workers` created 2026-07-06** (ID `76ae41c5-bd85-4bf1-9a2a-e099a8ea85dd`, PRIVATE) with **Redis deployed** (service `75c7238f-aa94-4343-a45c-fd355b4b2203`, volume attached). `REDIS_URL` available in service Variables tab. TODO: `mission-worker` + `queue-worker` services (Cursor, from repo); paid plan when workers go live.
- [ ] **7. API keys in LastPass** — **decision 2026-07-06: LastPass (not 1Password), folder "ROAS Rebuild"**, one Secure Note per service: OpenRouter, Composio, Brave, Gemini, DataForSEO, ScrapeCreators, Firecrawl, SendGrid, Fly token, Vercel token ([full list](#keys--secrets--master-checklist)). Flag any key shared with Sefy → recreate under own billing.
- [ ] **8. Shared secrets (with agent)** — generate together: `VAULT_ENCRYPTION_KEY`, `INTERNAL_API_TOKEN`, `OPENCLAW_GATEWAY_TOKEN` (`openssl rand -hex 32`)
- [x] **9. Supabase secrets → LastPass — COMPLETE 2026-07-06.** In LastPass → ROAS Rebuild → "Supabase roas-production": `SUPABASE_URL`, `SUPABASE_ANON_KEY` (legacy), `SUPABASE_SERVICE_ROLE_KEY` (legacy), `SUPABASE_JWT_SECRET` (legacy, verify-only — see JWT flag in Agent notes), **`DATABASE_URL`** (direct, port 5432, password percent-encoded), DB password. **DB password was rotated after accidental chat exposure — only the current one (in LastPass) is valid.** Don't disable legacy keys on the project. **→ Cursor: migrations UNBLOCKED — run against `lhfgtsjetcardinpgouq`.**
- [ ] **10. Access invites** — Vercel, Fly, Railway, Cloudflare (agent/Cursor where needed)

**Agent owns (parallel — no block on you unless noted):** schema bootstrap done; bulk migrations after #2; backend deploy after #3–#9.

---

## Coordination — Cursor ↔ Cowork (shared doc)

This doc is the shared source of truth between **Cursor** (repo/code/DB/deploys) and **Claude Cowork** (accounts/infra/keys). Both write here.

**Handoff protocol:**
- **Cursor → Cowork:** when a task needs an account, key, DNS change, or dashboard click Cursor can't do, add a `> COWORK:` note at the relevant step describing exactly what's needed.
- **Cowork → Cursor:** when infra is provisioned or a new resource/key exists that Cursor must wire into code/DB, add a `> CURSOR:` note with the resource ID, URL, or where the value lives (never paste secret values here — reference 1Password).
- Resolve a note by editing it to `> DONE (who, date):` and check off the step.

**Rules for this file:**
- No secret values in this doc. Record only **names, IDs, URLs, locations** (e.g. "in LastPass: ROAS Rebuild / OpenRouter"). Actual keys live in LastPass / provider dashboards.
- Keep the `**Current step:**` line accurate.
- Every change here also gets a changelog entry per repo protocol.

### Open handoffs

| From | Item | Blocks |
|------|------|--------|
| Cursor (self) | Apply migrations to **`roas-production`** once `DATABASE_URL` in LastPass | Blocked on #9 |
| Cowork + Dylan | LastPass **`ROAS Supabase`** note: all 5 values (#9) + Studio 2 Integrations (#1b) | Migrations + Lovable auth |
| Cowork → Cursor | Vercel team + 3 projects + member invite (#4, #10) | `apps/api`, `apps/web`, `apps/funnels` deploy |
| Cowork → Cursor | ~~Railway project + Redis~~ **DONE (Cowork, 2026-07-06):** project `roas-workers` `76ae41c5-bd85-4bf1-9a2a-e099a8ea85dd`, Redis live; member invite still TODO (#10) | Workers |
| Cowork → Cursor | Fly org member + `FLY_API_TOKEN` in LastPass (#10) | agent-api deploy |
| Cowork → Cursor | ~~Cloudflare CNAMEs~~ **DONE (Cowork, 2026-07-06):** zone ACTIVE, `api`/`app`/`sites`/`*.sites` → `cname.vercel-dns.com`, all DNS-only, wildcard verified resolving | Custom domains on Vercel |

### Shared records (IDs & locations — no secrets)

| Resource | Value / location | Status | Notes |
|----------|------------------|--------|-------|
| Lovable v1 (sandbox) | `64a600e9-3904-478c-997b-dd560ba724df` | Retired DB | Cloud ref `sweraoyotxgojtjrgcon` — do not migrate |
| **Lovable v2 (UI)** | **`b01b0b5d-d47b-471c-a9d0-98b7b0603dc2`** | Live | [Editor](https://lovable.dev/projects/b01b0b5d-d47b-471c-a9d0-98b7b0603dc2) — wire to `roas-production` via Integrations |
| Cloudflare zone | `roas.io` · `dylan@dylanvanas.com` | NS swap submitted | 13 records mirrored DNS-only; app CNAMEs after ACTIVE |
| Vercel account | `dylan@dylanvanas.com` (Hobby) | Account only | Team + 3 projects TODO |
| Fly.io | Personal org · `dylan@dylanvanas.com` | Billing ✓ | App deploy + token pending |
| Railway | Project `roas-workers` · `76ae41c5-bd85-4bf1-9a2a-e099a8ea85dd` | Redis live ✓ | Workers TODO (Cursor); `REDIS_URL` in service Variables |
| Secrets vault | LastPass folder **ROAS Rebuild** | In use | Contains: Supabase roas-production DB password. TODO: 4 Supabase keys + provider API keys |
| **Supabase (PRODUCTION DB)** | **`roas-production` · ref `lhfgtsjetcardinpgouq` · us-east-1 · org DVTEST** | Created ✓ · keys pending | Migrations blocked until LastPass #9 |

---

## Isolation rule (until new ROAS project is ready)

**Nothing from this rebuild goes to the VibeyV2 GitHub repo.**

| Do | Don't |
|----|-------|
| Keep all ROAS work in **new** Lovable project + new deploy targets | Push ROAS/Lovable code to `VibeyV2` on GitHub |
| Use **fresh standalone Supabase** (apply migrations there, not prod Vibey Supabase) | Use Lovable Cloud managed DB as production backend |
| Deploy `apps/api` / `apps/funnels` / Fly / Railway with **new env keys** only | Commit API keys or `.env` files anywhere |
| Chip away locally / in Lovable / in 1Password checklist | Open a PR or branch on VibeyV2 for rebuild work |

When ROAS is ready to ship, create a **new GitHub org/repo** (or Lovable-only workflow) — do not fold into VibeyV2 until explicitly decided.

**Lovable project creation is safe:** it is a greenfield project in Lovable's cloud. It does not touch VibeyV2 git unless you enable GitHub integration and point it at the wrong repo.

---

## Architecture (locked 2026-07-06)

**Hybrid (updated 2026-07-06):** Standalone Supabase = production DB + auth. Vercel = dashboard + API + funnels. Lovable = optional UI sandbox.

| Layer | Host | Notes |
|-------|------|-------|
| Dashboard UI | Vercel `apps/web` @ `app.roas.io` | Full parity — do **not** rebuild in Lovable chat |
| Platform API | Vercel `apps/api` @ `api.roas.io` | Unchanged NestJS — needs `SUPABASE_SERVICE_ROLE_KEY` |
| Funnels | Vercel `apps/funnels` @ `sites.roas.io` | Unchanged |
| Database + Auth | **Standalone Supabase** (Dylan-owned) | Full keys from supabase.com dashboard → LastPass |
| Agent runtime | Fly.io | agent-api + OpenClaw |
| Workers | Railway | Redis + mission/queue workers |
| Lovable project | Sandbox UI only | Lovable Cloud DB **not** production — privileged keys not exportable |

**Editing workflow:** Dashboard bugs/features → Cursor + GitHub + Vercel previews. Lovable chat for satellite UIs only.

---

## Domain map (roas.io)

| Host | Service | Owner |
|------|---------|-------|
| `app.roas.io` | Vercel `apps/web` (production dashboard) | Vercel project C |
| `api.roas.io` | NestJS platform API (`apps/api`) | Vercel project A |
| `sites.roas.io` | Funnel/form app root (optional apex landing) | Vercel project B (`apps/funnels`) |
| `*.sites.roas.io` | Per-user published funnels/forms (e.g. `user-abc123.sites.roas.io/my-offer`) | Vercel funnels + Cloudflare wildcard DNS |
| `agents.roas.io` | Public agent widget / proxy (phase 2) | Cloudflare Worker (`apps-proxy`) |

**Env vars tied to domains:**

```bash
APP_URL=https://app.roas.io
API_URL=https://api.roas.io
CORS_ORIGIN=https://app.roas.io
CLOUDFLARE_BASE_DOMAIN=sites.roas.io
PLATFORM_API_URL=https://api.roas.io
MCP_RESOURCE_URL=https://mcp.roas.io          # when MCP goes live
MCP_OAUTH_ISSUER_URL=https://api.roas.io
MCP_WEB_CONSENT_URL=https://app.roas.io/mcp/consent
```

OAuth redirect URIs use `https://api.roas.io/api/.../callback`.

---

## All accounts / apps to create

Check off as you go. **Dylan** = you · **Agent** = Cursor/Lovable integration.

| # | App | Who creates | What to set up | Unblocks |
|---|-----|-------------|----------------|----------|
| 1 | **Lovable** | Agent (on execute) + Dylan owner | Cloud project, region **Americas** (or closest to users), custom domain `app.roas.io` | UI, DB, auth, secrets hub |
| 2 | **Vercel** — API | Dylan | Team; project from monorepo `apps/api`; domain `api.roas.io` | Platform API, webhooks, OAuth, publish orchestration |
| 3 | **Vercel** — Funnels | Dylan | Second project from `apps/funnels`; domain `sites.roas.io` + wildcard | Public funnel/form pages |
| 4 | **Fly.io** | Dylan | New org; app `roas-runtimes` (or `vibey-runtimes`); billing on | agent-api + OpenClaw |
| 5 | **Railway** | Dylan | Project: Redis + `mission-worker` + `queue-worker` | Missions, email queue, brain-ops |
| 6 | **Cloudflare** | Dylan | Zone `roas.io`; wildcard `*.sites.roas.io` → Vercel funnels; API/app CNAMEs | Funnel DNS, later Workers |
| 7 | **OpenRouter** | Dylan (have) | API key | LLM chat + image |
| 8 | **Composio** | Dylan (have) | API key + project | User integrations hub |
| 9 | **Brave Search** | Dylan (have) | API key | Agent web search |
| 10 | **Google AI / Gemini** | Dylan | API key | Brain embeddings, reranking |
| 11 | **DataForSEO** | Dylan | Login + password | SEO research |
| 12 | **ScrapeCreators** | Dylan | API key | Social scraping |
| 13 | **Firecrawl** | Dylan | API key (or Lovable connector) | Onboarding site scrape |
| 14 | **SendGrid** (or Resend) | Dylan | API key + verified sender domain | Transactional email |
| 15 | **Sentry** | Dylan (optional) | Project + DSN | Error monitoring |
| 16 | **GitHub** | Dylan | Repo access for deploys; later GitHub App for agent tools | CI/deploy |

**Skip for now:** Stripe, PayPal, Spaces user-app Vercel team (`VERCEL_APPS_*`).

---

## Keys & secrets — master checklist

### Dylan provides (paste into 1Password share)

| Secret | Env var | Where it goes |
|--------|---------|---------------|
| OpenRouter key | `OPENROUTER_API_KEY` | Lovable Secrets → Vercel API → Fly agent-api |
| Composio key | `COMPOSIO_API_KEY` | Same |
| Brave Search key | `BRAVE_API_KEY` | Fly OpenClaw + agent-api |
| Gemini key | `GEMINI_API_KEY` | Fly agent-api |
| DataForSEO login | `DATAFORSEO_LOGIN` | Vercel API |
| DataForSEO password | `DATAFORSEO_PASSWORD` | Vercel API |
| ScrapeCreators key | `SCRAPECREATORS_API_KEY` | Vercel API |
| Firecrawl key | `FIRECRAWL_API_KEY` | Vercel API |
| SendGrid key | `SENDGRID_API_KEY` | Vercel API |
| Fly API token | `FLY_API_TOKEN` | Vercel API (machine pool) |
| Vercel API token | `VERCEL_TOKEN` | Vercel API (domain registration on funnels project) |
| Vercel funnels project ID | `VERCEL_FUNNELS_PROJECT_ID` | Vercel API (after funnels project exists) |
| Cloudflare API token | (Cloudflare integration config) | Vercel API |
| Sentry DSN | `SENTRY_DSN` | All services (optional) |

### Generated together (one session — must match across services)

| Secret | Env var | Must match on |
|--------|---------|---------------|
| Vault encryption | `VAULT_ENCRYPTION_KEY` (64 hex) | Vercel API + Fly agent-api |
| Internal service auth | `INTERNAL_API_TOKEN` | Vercel API + Fly agent-api + Railway workers |
| OpenClaw gateway auth | `OPENCLAW_GATEWAY_TOKEN` | Vercel API + Fly agent-api + Railway workers |
| OpenClaw public URL | `OPENCLAW_GATEWAY_URL` | All of the above |

Generate: `openssl rand -hex 32` (use 64 hex chars for vault key).

### From standalone Supabase `roas-production` (ref `lhfgtsjetcardinpgouq`)

Copy from **supabase.com → roas-production → Settings → API** into LastPass **ROAS Rebuild**:

- `SUPABASE_URL` — `https://lhfgtsjetcardinpgouq.supabase.co`
- `SUPABASE_ANON_KEY` (publishable)
- `SUPABASE_SERVICE_ROLE_KEY` (secret — required for NestJS API)
- `SUPABASE_JWT_SECRET` — JWT Settings
- `DATABASE_URL` — Database → connection string (URI) for Cursor migration script

Paste into: Vercel API, Vercel Funnels, Fly agent-api, Railway workers.

**Not from Lovable Cloud** — refs `sweraoyotxgojtjrgcon` (Studio v1) and `kksllhimdhtrszhaxxfy` (Studio 2 remix Cloud) are sandbox-only until external Supabase is connected in Lovable UI.

---

## OAuth developer apps (register as features ship)

All callbacks: `https://api.roas.io/api/.../callback`

| Integration | Register at | Priority |
|-------------|-------------|----------|
| Slack | api.slack.com | When Slack agent ships |
| GitHub App | github.com/settings/apps | When repo agent ships |
| GoHighLevel | GHL marketplace | When GHL native path needed |
| Calendly | Calendly developer | When scheduling in funnels |
| Meta | Meta developer | When Meta Ads ships |
| Supabase OAuth | Supabase dashboard | When Spaces DB connect ships |
| Google sign-in | Google Cloud Console | Only if not using Lovable managed Google auth |

Composio covers Gmail, HubSpot, Notion, LinkedIn, etc. — no per-tool OAuth app for those.

---

## Co-build plan (who does what)

### Phase 0 — Dylan (parallel, start now)

- [ ] Cloudflare zone `roas.io` + DNS records (see below)
- [ ] Vercel team + **three** projects (API + funnels + **web dashboard**)
- [ ] Fly.io org + billing
- [ ] Railway project + Redis plugin
- [ ] 1Password with all API keys from checklist
- [ ] Lovable Cloud **DATABASE_URL** for bulk migration script (Database settings)
- [ ] Invite agent/Cursor to Vercel, Fly, Railway, Cloudflare where needed

### Phase 1 — Agent (Lovable Cloud + schema)

- [x] Create Lovable Cloud project (Americas region)
- [ ] Enable Lovable Cloud + paste Dylan's keys into Cloud Secrets
- [~] Apply `supabase/migrations/` schema to Lovable Cloud DB — **bootstrap done**, bulk via script pending `DATABASE_URL`
- [x] Scaffold dashboard shell in Lovable (sandbox only — prod UI is Vercel `apps/web`)
- [x] Hand back `editor_url` + `preview_url`

### Phase 2 — Agent (backend deploy)

- [ ] Deploy `apps/api` to Vercel → `api.roas.io`
- [ ] Wire all env vars (Supabase from Lovable + Dylan keys + generated secrets)
- [ ] Deploy Fly `agent-api` + OpenClaw Docker
- [ ] Deploy Railway Redis + mission-worker + queue-worker
- [ ] Smoke test: health, auth, DB connectivity

### Phase 3 — Dylan + Agent (funnels)

- [ ] Deploy `apps/funnels` to Vercel → `sites.roas.io`
- [ ] Cloudflare: `*.sites.roas.io` CNAME → Vercel
- [ ] Set `VERCEL_FUNNELS_PROJECT_ID` on API
- [ ] Test: publish funnel → live URL on `user-xxx.sites.roas.io`

### Phase 4 — Co-build (UI parity)

- Dylan: product priorities (which `apps/web` screens first)
- Agent: Lovable UI features calling existing API endpoints
- Dylan: OAuth app registrations as integration settings go live
- Agent: Edge proxy for chat SSE → Fly agent-api

### Phase 5 — Hardening

- Sentry across services
- `agents.roas.io` Cloudflare worker when public agents needed
- OAuth apps for remaining native integrations

---

## DNS records (Cloudflare on roas.io)

| Type | Name | Target | Notes |
|------|------|--------|-------|
| CNAME | `app` | `cname.vercel-dns.com` | Vercel **web** project (`apps/web`) |
| CNAME | `api` | `cname.vercel-dns.com` | Vercel API project |
| CNAME | `sites` | `cname.vercel-dns.com` | Vercel funnels project |
| CNAME | `*` | `cname.vercel-dns.com` | Wildcard on **`sites.roas.io` zone** — use `*.sites` record OR separate DNS setup per Cloudflare wildcard rules |

**Note:** Wildcard is for `*.sites.roas.io`, not `*.roas.io` (avoids catching `app`/`api`).

---

## Access handoff to agent

Minimum before backend work:

1. Lovable workspace editor access (or confirm MCP auth)
2. Vercel team member on both projects
3. Fly.io org member
4. Railway project access
5. Cloudflare DNS edit on `roas.io`
6. Secure share with Phase 0 API keys

---

## What agent does NOT need from Dylan

- Stripe / payment keys
- Prod Vibey DB export (fresh Lovable Cloud unless you request migration)
- Every OAuth app on day one
- Spaces user-app Vercel team (phase 2)

---

## Quick start order

1. **Today (Dylan):** Cloudflare + Vercel + Fly + Railway accounts; API keys in 1Password; DNS for `roas.io`
2. **Next (Agent):** Create Lovable project + schema
3. **Then (Agent):** Deploy API → Fly → Railway → Funnels
4. **Together:** Generate shared secrets; smoke test; co-build UI in Lovable

When Dylan says **"execute the plan"**, agent starts at Phase 1 (Lovable project creation).

---

## Provisioning log

| Date | What happened | By |
|------|---------------|-----|
| 2026-07-06 | Vercel: logged in `dylan@dylanvanas.com` (Hobby; AI data-share opted out). Team/projects pending | Claude (Cowork) + Dylan |
| 2026-07-06 | Fly.io: account `dylan@dylanvanas.com`, Personal org, no payment method yet | Claude (Cowork) + Dylan |
| 2026-07-06 | Railway: account via Dylan's GitHub, ToS accepted, trial plan | Claude (Cowork) + Dylan |
| 2026-07-06 | Cloudflare: NEW account `dylan@dylanvanas.com` (old client acct `cingcurt13@hotmail.com` retired). Zone `roas.io` added, free plan, existing DNS imported intact. NS assigned: `conrad` + `summer.ns.cloudflare.com`. Awaiting GoDaddy NS swap (registrar = GoDaddy) | Claude (Cowork) + Dylan |
| 2026-07-06 | Identity decision: all infra under `dylan@dylanvanas.com` (clean separation for buyout) | Dylan |
| 2026-07-06 | DNS audit vs GoDaddy live records (DoH): initial Cloudflare quick-scan imported 6 records (apex A ×2, `ai`→76.76.21.21 Vercel, `portal`→185.158.133.1 live Lovable, `www`→sites.ludicrous.cloud, SPF TXT); all set to **DNS only** so NS cutover = zero behavior change | Cowork |
| 2026-07-06 | Full GoDaddy zone review (logged into registrar) found **7 records the scan missed** — all added to Cloudflare manually, DNS only: `andya1` + `andya2` A →185.158.133.1 (more Lovable sites), `e` MX ×2 → mxa/mxb.mailgun.org (prio 1/10) **(Mailgun sending domain — email would have broken)**, `e` TXT SPF `v=spf1 include:mailgun.org ~all`, `k1._domainkey.e` TXT DKIM (exact value pulled via live DNS query), `_lovable.portal` TXT lovable_verify, `email.e` CNAME → mailgun.org (tracking). Cloudflare zone = 13 records, 1:1 with GoDaddy. Ready for NS swap | Cowork |
| 2026-07-06 | **NS swap SUBMITTED at GoDaddy** → `conrad.ns.cloudflare.com` + `summer.ns.cloudflare.com` (GoDaddy: "request in progress"). Cloudflare zone activates on propagation (mins–hours). Note: roas.io renews Dec 10, 2026 ($89.99/yr) at GoDaddy | Cowork |
| 2026-07-06 | Railway: project **`roas-workers`** created (`76ae41c5-bd85-4bf1-9a2a-e099a8ea85dd`, PRIVATE) + **Redis deployed** with volume. Workers to be added by Cursor from repo | Cowork |
| 2026-07-06 | Fly.io billing confirmed: **Good Standing**, pay-as-you-go, card on file | Cowork + Dylan |
| 2026-07-06 | **Standalone Supabase created:** **`roas-production`**, ref **`lhfgtsjetcardinpgouq`**, org DVTEST (Pro), us-east-1, Micro (+$10/mo). URL + DB password → LastPass | Cowork + Dylan |
| 2026-07-06 | **15-min sync:** Agent sync checklist added; Cursor Automation draft opened (every 15 min, read this doc) | Cursor |

| 2026-07-06 | **Cloudflare zone ACTIVE** (NS propagated to conrad/summer). App CNAMEs added, all DNS-only: `api`, `app`, `sites`, `*.sites` → `cname.vercel-dns.com`. Wildcard verified resolving via public DNS. roas.io DNS work COMPLETE | Cowork |
| 2026-07-06 | Supabase keys run complete: all 5 values + DB password in LastPass (see step #9). DB password rotated once after accidental chat exposure. Cursor migrations UNBLOCKED | Cowork + Dylan |

**Privacy standing rule (Dylan, 2026-07-06):** everything created stays private — new GitHub repo must be private; Vercel Deployment Protection on until launch; Lovable project not community-visible.

---

## Lovable projects

### ROAS Studio 2 (canonical UI — use this)

| Field | Value |
|-------|-------|
| **Name** | ROAS Studio 2 |
| **Project ID** | `b01b0b5d-d47b-471c-a9d0-98b7b0603dc2` |
| **Workspace** | Dylan's Lovable (`FhaKPV2Wy0SysaoRvxp9`) |
| **Editor** | https://lovable.dev/projects/b01b0b5d-d47b-471c-a9d0-98b7b0603dc2 |
| **Preview** | https://id-preview--b01b0b5d-d47b-471c-a9d0-98b7b0603dc2.lovable.app |
| **Production DB** | External Supabase **`roas-production`** (`lhfgtsjetcardinpgouq`) — connect via Integrations |
| **GitHub** | Not connected |

### ROAS Studio v1 (sandbox — ignore)

| Field | Value |
|-------|-------|
| **Project ID** | `64a600e9-3904-478c-997b-dd560ba724df` |
| **Lovable Cloud ref** | `sweraoyotxgojtjrgcon` — sandbox only, not production |

UI includes: `/login`, Studio chat shell, Campaigns/Spaces/Brain placeholders, Settings tabs, mobile sidebar, project knowledge pinned.
