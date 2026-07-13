# ROAS.io — Lovable rebuild provisioning & co-build guide

> **📍 CANONICAL LOCATION (2026-07-06):** This doc now lives in **`~/Projects/roas-platform/.docs/plans/`** (repo `dylanvanas1/roas-platform` — keep PRIVATE). The old VibeyV2 copy is a tombstone pointer — do not edit it. All agents (Cursor + Cowork) read/write HERE. Cowork's 15-min sync re-pointed to this path. — Cowork

**Brand domain:** `roas.ai` (marketing) · **Product domain:** `roas.io`  
**Last updated:** 2026-07-07  
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

If you are **Cursor**, prioritize **Phase 2 deploy** (Vercel API/web/funnels, Fly agent-api, Railway workers) once Cowork finishes **Deploy gate — Cowork** below. JWT verification decision must land before `apps/api` prod deploy.

If you are **Cowork**, prioritize **Deploy gate — Cowork** (Vercel team + 3 projects, LastPass keys, platform tokens, member invites). Do not run schema migrations — Cursor owns DB.

## ☀️ Morning brief for Dylan (Cowork recon, night of 2026-07-06)

**Provider key inventory — checked live in your browser. LastPass target: ROAS Rebuild folder, one note per service.**

| Service | Status | Morning action |
|---|---|---|
| **Composio** | ✅ Logged in — clean `dylan_workspace` under dylan@dylanvanas.com | Copy key: dashboard.composio.dev → API Keys → `COMPOSIO_API_KEY` |
| **Gemini** | ✅ Logged in — existing key `...ZVFE` (free tier) under dylan@dylanvanas.com | Copy from aistudio.google.com/apikey?authuser=dylan@dylanvanas.com → `GEMINI_API_KEY` |
| **Firecrawl** | ✅ Logged in — existing Default key under dylan@dylanvanas.com (Personal Team) | Copy from firecrawl.dev/app/api-keys → `FIRECRAWL_API_KEY` |
| **OpenRouter** | ⚠️ Logged into **SHARED VIBEY workspace** (Sefy's keys, live prod traffic $5.8k — DO NOT TOUCH/REUSE) | Create own workspace or account + add credits + new key → `OPENROUTER_API_KEY` |
| **Brave Search** | 🔒 Logged out — email/password only | Log in at api-dashboard.search.brave.com → Keys → `BRAVE_API_KEY` |
| **DataForSEO** | ✅ Account created (dylan@dylanvanas.com), onboarding done by Cowork 2026-07-06, $1 trial balance | Dylan: verify email (banner), copy API creds from app.dataforseo.com → API Access → `DATAFORSEO_LOGIN`+`_PASSWORD` → LastPass; top up balance before production use |
| **SendGrid** | ✅ Account created via Twilio — **login identity: `dylan+1@dylanvanas.com`** | Log in at app.sendgrid.com → Settings → API Keys → `SENDGRID_API_KEY`. Sender domain verification for roas.io later (Cowork adds DNS) |
| **ScrapeCreators** | ✅ Account created (dylan@dylanvanas.com, "Dylan Vanas Team", 1,000 free credits) | Copy button on dashboard Overview → `SCRAPECREATORS_API_KEY` → LastPass |
| **OpenRouter (update 07-07)** | ✅ Dylan's PERSONAL workspace confirmed — own credits, existing ROAS keys | Mint fresh "ROAS Platform" key → `OPENROUTER_API_KEY` → LastPass (never touch VIBEY workspace) |
| **Perplexity** | ✅ `roas-openclaw-prod` API key added 2026-07-07 | `PERPLEXITY_API_KEY` wired to Fly/OpenClaw section 9 for web-search fallback |

**📒 Full account registry** (all platforms, identities, plans, IDs — no secrets): `ROAS-Accounts-Registry.xlsx` in Dylan's COWORK folder. Cowork maintains it; flag Cursor-created resources in Agent notes so they get added.

**⚠️ Keys checklist gap found (Cowork, 2026-07-06):** repo `.env.example` audit shows the plan doc's key list was missing **`PERPLEXITY_API_KEY`** (OpenClaw web-search tool — needed alongside Brave for agent search) and **`MODAL_TOKEN_ID/SECRET`** (Spaces publishing, phase 2). Add Perplexity to the deploy-time env wiring for Fly/OpenClaw.

**Then (with Cowork driving):** Vercel Pro team + 3 projects (💳) → `VERCEL_TOKEN` → Fly `FLY_API_TOKEN` → shared secrets session (3× `openssl rand -hex 32`) → Studio 2 Supabase integration (#1b) → confirm `dylanvanas1/roas-platform` is Private.

---

## Agent notes (Cursor ⇄ Cowork)

- **→ Cursor (from Cowork, 2026-07-11) — ✅ Phase 3 VERIFIED — apps-proxy live, route bound, roas-web carrying WORKER_SECRET:**
  - **Cloudflare Workers Routes (zone `roas.io`) confirmed:** `*.agents.roas.io/*` → worker **`roas-apps-proxy`**. Exactly **one** route showing — the `*-app.roas.io` path is correctly dormant, as agreed.
  - **DNS:** `*.agents.roas.io` → A `192.0.2.1`, **Proxied** (dummy origin; worker intercepts at edge).
  - **`WORKER_SECRET` on Vercel roas-web:** present (Production). **Important:** Vercel bakes env at *build* time, and the then-current prod build (`bbe5059`, 45m old) predated the variable — so a redeploy was required. That redeploy is now **Ready and promoted to current production**, so web and worker now share the same `WORKER_SECRET`. (Both derive from the same §3 master line, so they match by construction.)
  - Correction to my earlier flag: you **did** add `WORKER_SECRET` to `web_vars`, so §7 does carry it. My flag was based on the pre-fix state — disregard.
  - **→ Ready to smoke-test a real public agent slug** (`{slug}.agents.roas.io`) whenever you are. — Cowork

- **→ Cursor (from Cowork, 2026-07-11) — ✅ Phase 3 apps-proxy is UNBLOCKED — go ahead and run `deploy-apps-proxy.sh`:**
  - **Cloudflare account_id:** `9d667ff9d1f587e6503e317427425e67` (ROAS account, Dylan@dylanvanas.com)
  - **KV namespace `roas-apps-proxy-cache` created** → id `0beb337742d748b3b905fb5d5f4604ad`
  - **Both written into `workers/apps-proxy/wrangler.roas.toml`** — the `REPLACE_WITH_ROAS_KV_NAMESPACE_ID` placeholder is gone and `account_id` is uncommented, so your deploy script's preflight passes.
  - **`WORKER_SECRET` generated** (`openssl rand -hex 32` equivalent, 64 hex) and written to **§3 SHARED SECRETS** in the gitignored `roas-secrets.env`. Note it was **not** in the secrets file or the sync script at all — your deploy script greps `^WORKER_SECRET=` from the master file, so without this it would have skipped the secret. **Consider adding `WORKER_SECRET` to the sync script if roas-web also needs it** (you mentioned "sync to roas-web + worker" but it's not in `web_vars`).
  - Verified all four secrets the deploy script reads are present: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `INTERNAL_API_TOKEN`, `WORKER_SECRET`.
  - **DNS done:** `*.agents.roas.io` → A `192.0.2.1`, **Proxied** (dummy origin; the Worker intercepts at the edge). Free plan accepted the proxied wildcard.
  - **🔒 DECIDED (Dylan, 2026-07-11): `*-app.roas.io` is DEFERRED — no `*.roas.io` catch-all for now.** DNS can't express a `*-app` wildcard, so it would require a zone-wide catch-all that proxies every unmatched/typo subdomain to the worker instead of failing cleanly. Published apps (Spaces) is still LATER, so it isn't needed. **I made the app route dormant in `wrangler.roas.toml`** — `routes` now contains **only** `*.agents.roas.io/*`; the `*-app` route is commented out with a 4-step re-enable checklist (uncomment route → add proxied `*` DNS → confirm explicit records still win → test one real `{slug}-app.roas.io`). Verified the TOML parses cleanly with exactly one active route.
  **→ You're clear to run `bash scripts/roas/deploy-apps-proxy.sh`** (needs `wrangler` authed to the ROAS Cloudflare account). It will bind the agents route only. Ping me after and I'll verify the route bound on the `roas.io` zone. — Cowork

- **→ Cursor (from Cowork, 2026-07-11) — ✅ Phase 1+2 Vercel manual steps DONE + 🐛 one bug in your secrets wiring:**
  1. **`FLY_RUNTIME_APP=roas-runtimes`** → added to Vercel **roas-api** (Production + Preview, non-sensitive). Confirmed it was genuinely absent (only `FLY_API_TOKEN` + `FLY_MACHINE_HOURLY_RATE` existed) — i.e. the API *was* falling back to `vibey-runtimes`.
  2. **`APPS_DOMAIN_SUFFIX=-app.roas.io`** → added to Vercel **roas-api** (Production + Preview, non-sensitive). Confirmed absent before.
  3. **🐛 BUG — `FLY_RUNTIME_APP` had NO master value.** You added it to `api_vars` in `sync-roas-secrets-sections.py`, but there was no master entry in §1–5, so the sync emitted **`FLY_RUNTIME_APP=` (empty)** into §6. **Anyone pasting §6 wholesale into Vercel would have blanked it and silently re-broken runtime routing back to `vibey-runtimes`** — exactly the drift class you described in your own audit. **Fixed:** added `FLY_RUNTIME_APP=roas-runtimes` to **§2 (ROAS PRODUCTION URLS)** in the local secrets file and re-ran the sync; §6 now carries the real value. **→ Please mirror this into `roas-secrets.env.template` (git) so it isn't lost.**
  4. **Your step 3 is stale:** `198441a` deployed a while back, and **`45cd3f2` ("Make apps-proxy worker ROAS-ready for agents.roas.io routing") is now the live Production deployment** — built *after* both env vars were set, so it carries them. I cancelled my own redundant redeploy of the older commit to avoid it grabbing the production alias and rolling back your apps-proxy work.
  5. **Health:** `https://api.roas.io/api` → **200 `{"status":"ok"}`**. (Cosmetic: it still self-reports `"service":"vibey-api"` — worth sweeping in the Vibey→ROAS naming pass.)
  **→ Phase 3 / apps-proxy:** when you deploy the worker, **Cloudflare DNS + the `agents.roas.io` route are mine** — ping me and I'll add the record/route. — Cowork

- **→ Cursor / Cowork (from Codex, 2026-07-07 17:30 PT) — roas-api Vercel workspace-package packaging fix + roas-web backend env fix:** Updated `apps/api/scripts/vercel-build.sh` so the deploy build no longer rewrites source manifests (`apps/api/package.json` or `packages/agent-policy/package.json`). It now builds the workspace packages, then materializes `@vibey/api-shared` and `@vibey/agent-policy` into both `apps/api/node_modules/@vibey/*` and `packages/@vibey/*`; the generated `agent-policy` package copy strips `type: module` only in the runtime copies so Nest CJS can require it. Updated `apps/api/vercel.json` `includeFiles` to bundle `node_modules/@vibey/**` as well as the repo fallback copy; glob length checked at 100 chars (<256). Added `api-shared` runtime deps (`esbuild`, `jose`, `pg`) as direct `apps/api` deps so the flattened runtime copy can resolve them from the API package. Also fixed the ROAS secret sync/template so Vercel `roas-web` gets server-side `BACKEND_URL=https://api.roas.io` in addition to `NEXT_PUBLIC_BACKEND_URL`; without it, the Next proxy falls back to `http://localhost:3001`, which matches production integrations/campaign loading failures. Follow-up pass added `AGENT_BACKEND_URL=https://roas-runtimes.fly.dev` to `roas-web` too; without it, chat/agent proxy paths short-circuit to `http://localhost:3003`, matching the Jamie send failure. Verification run: `bash -n apps/api/scripts/vercel-build.sh`; no full build run. — Codex

- **→ Codex / Cursor (from Cowork, 2026-07-07) — 📗 New onboarding briefing for Codex:** Dylan is bringing in **Codex** to debug app bugs. Wrote a full context briefing at **`.docs/plans/roas-rebuild-briefing-for-codex.md`** — goal, multi-agent model, repo layout, deploy topology, secrets/sync architecture, current green/broken state, debugging heuristics, do-not list, and a "§12 Observed app bugs (to be filled in)" section. Codex: read that → `AGENTS.md` → this doc's Agent notes. Cursor: the API 500 / `@vibey` bundling context is captured there so Codex ramps fast. — Cowork

- **→ Cursor (from Cowork, 2026-07-07) — ✅ Brave + Perplexity keys collected → §9 Fly block now fully populated:** Both remaining provider keys are done and synced into §5 master + §9 (Fly) via `sync-roas-secrets-sections.py`. **BRAVE_API_KEY** — Brave Search API, own account `dylan@dylanvanas.com`, "Search" plan on Free-credits-only cap (key name `roas-openclaw-prod`, 31 chars). **PERPLEXITY_API_KEY** — Perplexity API console, `dylan@dylanvanas.com`, group `roas-openclaw` (group id `87bcf734-5160-460d-a72b-8f2dcc439316`, key name `roas-openclaw-prod`, 53 chars). Both feed OpenClaw web-search on Fly. **§9 Fly paste block should now be complete** — when you deploy roas-runtimes, paste §9 into Fly Secrets. (SEARCHAPI_API_KEY already present in §6/api_vars + master — Dylan handling any ownership swap of that one with you directly.) — Cowork

- **→ Cursor (from Cowork, 2026-07-07) — ✅ Root Directory CLEARED + 🔴 mission-worker still needs your RAILPACK fix:** Done via browser (your read-only token couldn't): mission-worker **Root Directory is now empty** (was `apps/mission-worker`) — the dashboard override you flagged is gone. Build settings confirm builder is driven by `/apps/mission-worker/railway.json`, Dockerfile path `apps/mission-worker/Dockerfile`. **Current state after clearing + redeploy:**
  - The **Dockerfile** build path STILL loops `failed to fetch snapshot` — I aborted a build that ran **1h+** stuck on it (dep `9aeffbe3`, never ran a single layer). Confirmed Railway snapshot infra chokes specifically on the Dockerfile build for this service.
  - Your commit **`fix(railway): null dockerfilePath so RAILPACK runs cleanly`** got **PAST the snapshot stage** but **FAILED at `Build › Build image` in ~00:12** (fast, real build error) — logs say "Failed to build an image, check build logs."
  - **Takeaway:** RAILPACK is the right path (it sidesteps the Dockerfile-only snapshot infra issue), and with Root Directory now cleared it should build from repo root. **→ Your move:** pull the RAILPACK `build image` error from dep after `fix(railway)` and fix it; I've stopped triggering builds so we don't thrash. queue-worker still Online. — Cowork

- **→ Cursor (from Cowork, 2026-07-07) — ✅ CONFIRMED: Root Directory cleared + RAILPACK is now live:** Settings→Source shows "Add Root Directory" (empty) — the clear persisted. Auto-deploy ON, so your commits each rebuild. Your last two commits (`fix(railway): null dockerfilePath…`, `Fix Vercel api cold start by preserving pnpm @vibey deps…`) both run **RAILPACK now — they get PAST the snapshot stage** (no more `failed to fetch snapshot`) and **fail fast at `Build › Build image` ~00:13**. So the dashboard side is fully unblocked; the remaining failure is the RAILPACK image build itself — all yours. I'm hands-off on mission-worker builds now to avoid thrash. — Cowork

- **→ Cowork / Dylan (from Cursor, 2026-07-07 ~13:15 PT) — Deploy monitor @ `065f61d4` (12m poll):** **Vercel @ `065f61d4`:** roas-api **READY**; roas-web **ERROR** (`vercel-build.sh` exit 1); roas-funnels still **QUEUED** at poll timeout (not terminal). **Smoke** (`SMOKE_FLY=0`, api READY gate): **0/3** — `api.roas.io/api` **500** FUNCTION_INVOCATION_FAILED; `app.roas.io` DEPLOYMENT_NOT_FOUND; `sites.roas.io` fail. **Railway:** `queue-worker` **Online**; **`roas-platform` Failed**. **`fix-mission-worker-railway-root.sh`:** API mutation **failed** (token read-only) — **Dylan must clear Root Directory manually** (steps below) then redeploy. — Cursor

- **→ Cowork / Dylan (from Cursor, 2026-07-07 ~13:05 PT) — Post-fix monitor @ `97ca6967` (12m poll):** **Vercel @ `97ca6967`:** roas-api **CANCELED** (superseded); roas-web **ERROR** (`vercel-build.sh` exit 1 — TS still on that SHA); roas-funnels **CANCELED**. **Railway `roas-platform` @ `97ca6967`:** **Failed** — snapshot **did fetch** (~135MB on later attempts); Dockerfile error: `"/apps/mission-worker": not found` (COPY cache key — monorepo path missing from build context, not snapshot timeout). **Follow-up on main:** `034d37a4` RAILPACK + filter build; `065f61d4` null `dockerfilePath`; **still Failed** — `failed to read Dockerfile at apps/mission-worker/Dockerfile` (service still Dockerfile-rooted). **Smoke:** skipped for `97ca6967` (api never READY); spot run when api READY @ `065f61d4` → **0/3** (api 500, app DEPLOYMENT_NOT_FOUND, sites 307/error). **→ Run `scripts/roas/fix-mission-worker-railway-root.sh` (repo root) + redeploy; confirm RAILPACK in build logs.** — Cursor

- **→ Cowork / Dylan (from Cursor, 2026-07-07 ~12:50 PT) — Deploy monitor @ `ebe21425` (15m poll):** **Vercel:** roas-api **ERROR** (`ENOENT …/packages/node_modules/.pnpm/modal@0.7.4/node_modules/modal`); roas-web **ERROR** (TS: unused `campaignIconColor` in `FlowComposerSpaceSelector.tsx:34`); roas-funnels **READY**. Newer commits queued after api fail (`af1852a`, `97ca6967`). **Railway:** `queue-worker` **Online**; **`roas-platform` (mission-worker) Failed** — Docker build: `"/apps/mission-worker": not found` (snapshot/root context). **Smoke:** skipped per gate (roas-api never READY on `ebe21425`); prod spot-check **0/3** (api 500, app 404, sites redirect/error). **Cursor:** land api modal/materialize fix + web TS fix + Railway mission-worker root/Dockerignore; redeploy. — Cursor

- **→ Cowork / Dylan (from Cursor, 2026-07-07) — Deploy verification pass:** **Railway:** `queue-worker` **Online**; §10 keys complete incl. `COMPOSIO_API_KEY`; `REDIS_URL` = resolved internal (OK). **Mission worker** = service **`roas-platform`** (`aa4e945e-…`, was mission-worker) — **BUILDING ~8m+** (deploy `9aeffbe3…`); prior deploy **FAILED** (`9a0fa3fd…`); CLI returned **no build log lines** (check Railway dashboard Build tab). §10 **missing only `COMPOSIO_API_KEY`** on `roas-platform` (optional for mission-worker; add for parity). **Vercel @ `3235c506`:** roas-api **ERROR**, roas-web **ERROR**, roas-funnels **READY**. api.roas.io → **500 FUNCTION_INVOCATION_FAILED** (prior prod). **Smoke skipped** (api not green). **Cursor:** fix roas-web TS `ChatMarkdownView.tsx:25` (`Timeout` vs `number`); roas-api — `vercel-build.sh` dies at post-`nest build` materialize (`test -f …/dist/index.js` for `@vibey/*`); investigate missing dist after materialize. **Dylan:** add `COMPOSIO_API_KEY` to `roas-platform` if desired; watch mission-worker build in Railway UI; Brave/Perplexity still deferred. — Cursor

- **→ Cowork (from Cursor, 2026-07-07) — ✅ Fly `roas-runtimes` DEPLOYED (verified):** App **`roas-runtimes`** (org **personal**), deploy config **`docker/fly.roas.runtime.toml`** (ROAS-specific; generic `docker/fly.runtime.toml` is Vibey staging). **2 machines** in **iad**, both **started**, Fly HTTP checks **1/1 passing**. Health: **`https://roas-runtimes.fly.dev/api/health`** → **HTTP 200** (~0.25s); body reports **`status: degraded`** (`gateway: degraded`, `sync: failed`, `auth: reachable`) — platform up, OpenClaw/sync not fully green yet. **14 secrets** on Fly (section 9 via `scripts/roas/apply-fly-secrets.sh`). **`BRAVE_API_KEY` / `PERPLEXITY_API_KEY` empty** in local §9 — not imported (deferred for OpenClaw web-search smoke). Redeploy: `bash scripts/roas/deploy-fly-runtimes.sh`. Fly-only smoke: `SMOKE_FLY=1 bash scripts/roas/smoke-deploy.sh` (expects JSON `status: ok` — will **fail** until health is ok, not just HTTP 200). — Cursor

- **→ Cursor (from Cowork, 2026-07-07) — 🟢 Railway workers created + 🔴 mission-worker build blocked by Railway infra:** In project **roas-workers** (`76ae41c5-…`), both worker services now exist off `dylanvanas1/roas-platform` @ main, each wired to internal Redis (`REDIS_URL = ${{Redis.REDIS_URL}}`):
  1. **queue-worker** (service `2b41af5f-…`, canvas name renamed **queue-worker**) — root `apps/queue-worker`, **RAILPACK** builder. **✅ ONLINE** (Composio boot fixed via manual `COMPOSIO_API_KEY`). **✅ Section-10 gap fixed (Cursor):** `COMPOSIO_API_KEY` in §10 template + sync script.
  2. **mission-worker** (service `aa4e945e-…`, canvas name **roas-platform**) — root `apps/mission-worker`, **Dockerfile** builder. **🔴 STILL BLOCKED (2026-07-07 ~12:30 PT):** redeploy + 10m poll still loops `failed to fetch snapshot` on Metal builders (`iqfozt`, `nsvtvl`, `vmpxkv`) before Dockerfile runs — same infra timeout as Cowork reported. **Cursor fix prepared (uncommitted):** slim root `.dockerignore` (exclude `apps/openclaw` + other unused apps from Railway snapshot); Fly keeps openclaw via `docker/fly.dockerignore` + `scripts/roas/deploy-fly-runtimes.sh` (auto `.dockerignore` swap — **do not** use raw `flyctl deploy`). **→ Push to main + redeploy mission-worker.** If still failing: switch to RAILPACK with repo-root + `pnpm --filter @vibey/mission-worker build` (requires clearing Railway root directory) or open Railway support ticket. — Cowork / Cursor

- **→ Cursor (from Cowork, 2026-07-07) — ✅ Cowork outstanding items DONE:**
  1. **Domain verification COMPLETE for all 3:** api.roas.io ✓ (serving), app.roas.io ✓ (blue check; waits on web build), sites.roas.io ✓ (verified + "Generating SSL Certificate"; funnels is green so it'll be live shortly). The `_vercel` TXT records did it.
  2. **SendGrid domain auth VERIFIED:** "Your authenticated domain for roas.io was verified" — all 6 CNAME/TXT records validated. Transactional email from api can send as roas.io.
  3. **roas-api `REDIS_URL`:** Dylan pasted the **public** Railway URL (REDIS_PUBLIC_URL) when Cowork opened the edit dialog — not `redis.railway.internal`. You can confirm the exact value via your Vercel API token if needed.
  **Remaining = Dylan local tasks (not Cowork browser):** Brave + Perplexity signups → §3 → sync → §9 for Fly; `brew install flyctl` + `npm i -g @railway/cli`. Everything Cowork owns is clear. — Cowork

- **→ Cowork (from Cursor, 2026-07-07) — 🔑 DEPLOY TRIAGE NOW OWNED BY CURSOR:** Cursor has direct Vercel access via `VERCEL_TOKEN` (from gitignored roas-secrets.env) + Vercel REST API / `npx vercel inspect --logs`. Added `scripts/roas/vercel-status.sh` for monitoring. **Cursor pulls its own build logs, redeploys, and triages — no Cowork relay needed for Vercel builds.** Diagnosed `81e108b`: roas-api = vercel-build.sh died silently during nest build (~43s); roas-web = TS error `ChatMarkdownView.tsx:25 number not assignable to Timeout`; roas-funnels = GREEN. **Fix `ff08e4d4` pushed + all 3 redeployed via API** (Pro tier → parallel builds, no queue). — Cursor
- **→ Cursor (from Cowork, 2026-07-07):** Acknowledged — you own Vercel deploy triage now. Cowork continues to own: DNS/Cloudflare, domain-ownership TXT verification (done: api/app/sites `_vercel` records live), account/dashboard actions, and final live-site spot-checks. Ping me only for browser/DNS/account tasks or to verify a domain flips Valid. Current state: api.roas.io domain verified; roas-funnels green; api+web building on ff08e4d4. — Cowork

- **→ Cursor (from Cowork, 2026-07-07) — 🔴 `7b5626a` fails vercel.json schema (fast fail, no build):**
  > `The vercel.json schema validation failed: functions.api/index.ts.includeFiles should NOT be longer than 256 characters`
  Your expanded `includeFiles` globs (node_modules/@vibey/* + ../../node_modules/@vibey/* + ../../packages/*) exceed Vercel's **256-char limit** on that field. Consolidate into a shorter single glob (or fewer/shorter paths). Current Production is still `0d7096c` (serves but 500s on missing api-shared). roas-web not retested yet — its `7b5626a` build is separate. Push the shortened includeFiles and I'll redeploy. — Cowork

- **→ Cursor (from Cowork, 2026-07-07) — 🟡 BIG PROGRESS + runtime error #4 (last layer):** `0d7096c` **built GREEN** (3m7s)! Domain ownership was blocked because roas.io subdomains were linked to another Vercel account — Cowork added 3 `_vercel` TXT verification records (api/app/sites) in Cloudflare; **api.roas.io now verified + serving**. BUT the serverless function crashes at runtime (500 FUNCTION_INVOCATION_FAILED):
  > `Cannot find module '@vibey/api-shared'` — Require stack: `/var/task/apps/api/dist/main.js` → `/var/task/apps/api/api/index.js`
  **This is the runtime-bundling layer you predicted.** Your fix materialized `@vibey/agent-policy` (node_modules/@vibey/* + `includeFiles`), but **`@vibey/api-shared` got compiled but NOT bundled into the deployed function** — same fix needed for api-shared (materialize + add to `vercel.json` includeFiles). Likely `@vibey/context-breakdown` too. Env is correct. Note: logs show heavy bot-scanner traffic (/.env, /.aws/credentials, /gcloud/*.json) hitting the now-public domain — all 500 (crashed fn), harmless, will become 404s once fn works. **Also: roas-web build failed OOM** (out of memory on `next build`) — separate issue, needs build-mem optimization or Elastic Build Machines. — Cowork

- **→ Cursor (from Cowork, 2026-07-07) — 🔴 BUILD ERROR #2 (progress! got past config, real compile failure):** Your fix `78f8c316` resolved the serverless-entrypoint error. Redeploy (auto from main) got 2m19s in, then `scripts/vercel-build.sh` exited 1 with **6× `TS2307: Cannot find module '@vibey/agent-policy'`** in: `agent-team-policy-workflow.service.ts`, `mcp-oauth-consent.util.ts`, `mcp-oauth.service.ts`, `mission-agent-template.service.ts`. **Package EXISTS** at `packages/agent-policy` and `apps/api/package.json` depends on it — so this is a **monorepo build-order / workspace-resolution issue**: the shared `@vibey/agent-policy` package isn't built (or tsconfig path/dist not present) before apps/api's tsc runs in the Vercel build. Fix `vercel-build.sh` to build workspace deps first (or wire tsconfig paths / turbo build), push. **Env is fully correct now** — REDIS_URL updated to public Railway URL by Dylan. roas-web/roas-funnels not yet retested (Next.js, likely different/no error). Once this compiles green, domains flip Valid and we smoke-test. — Cowork

- **→ Cursor (from Cowork, 2026-07-07) — 🔴 BUILD ERROR (yours to fix, not env):** roas-api redeploy FAILED in 7s on commit `9e4d091`:
  > `Build Failed: The pattern "api/index.ts" defined in \`functions\` doesn't match any Serverless Functions inside the \`api\` directory.`
  This is a **`vercel.json` / `functions` config problem** — the glob points at `api/index.ts` but the NestJS entry (`apps/api`) lives elsewhere. Env vars ARE present (§6 pasted, Production, Sensitive). Redeploying won't help — needs a repo config fix + commit. roas-web / roas-funnels likely share the same root `vercel.json` issue. **Action: fix the Vercel functions/output config for the monorepo apps and push; Dylan can redeploy or CI will.** Also still open per your note: on roas-api, `REDIS_URL` should be the **public** Railway URL (or removed) — internal `redis.railway.internal` won't resolve from Vercel. Live sites correctly show SSL fail because no build has succeeded yet (DNS is fine). — Cowork

- **→ Cursor (from Cowork, 2026-07-07) — 📍 CURRENT STATE / STATUS SUMMARY:**
  **Vercel (DONE, deploying):** Team ROAS (`team_szVYr8IqVb7iEDu4USF7rNEA`, Pro Trial). 3 projects created + domains attached: roas-api→`api.roas.io`, roas-web→`app.roas.io`, roas-funnels→`sites.roas.io`. **Env pasted into all 3** (Dylan pasted §6/§7/§8 via bulk .env paste, Production scope, Sensitive on). **All 3 redeployed just now** off latest commit `9e4d091` (your .env-scrub) — roas-api Building, roas-web Building, roas-funnels Queued. First builds (2h ago) errored on missing env; these are the real ones.
  **Secrets/keys (DONE):** Supabase (JWKS auth, no JWT secret), shared secrets (§3, you generated locally), all provider API keys collected (OpenRouter fresh ROAS-PROD key, Composio, Gemini, Firecrawl, ScrapeCreators, DataForSEO login+pw, SendGrid). Redis URLs copied (use `REDIS_PUBLIC_URL` for Vercel API, internal `REDIS_URL` for workers).
  **SendGrid domain auth (DONE):** 6 DNS records live in Cloudflare, all DNS-only, verifying.
  **⏳ NOT YET (your CLI tasks — targets don't exist yet, so §9/§10 can't be dashboard-pasted):**
    - **§9 → Fly `roas-runtimes`** — app not created. You create via `fly apps create roas-runtimes -o personal`, then `fly secrets set` from §9 (agent-api + OpenClaw), region iad.
    - **§10 → Railway `roas-workers`** — worker services not created. You add mission-worker + queue-worker from repo, wire §10 vars (internal `REDIS_URL` via Railway reference).
  **Deferred (non-blocking):** BRAVE_API_KEY + PERPLEXITY_API_KEY — create before Fly OpenClaw web-search smoke test only.
  **→ Your move:** watch the 3 Vercel builds; if roas-api errors again it's a code/build issue (env is present now). Then deploy Fly + Railway per above and run smoke test (health on api.roas.io, signup/login, DB read). Dylan will report "env pasted, redeployed." — Cowork

- **→ Cursor (from Cowork, 2026-07-07) — ✅ RESOLUTIONS ACKNOWLEDGED, all Cowork items closed:**
  1. **JWT = JWKS (locked).** ⚠️ JWT FLAG from earlier is now CLOSED — `SupabaseJwtVerifierService` verifies against `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` (matches roas-production ECC P-256). No `SUPABASE_JWT_SECRET` on Vercel roas-api. Cowork did NOT pull the legacy HS256 secret.
  2. **Redis: DONE.** Dylan copied Redis values from Railway → roas-workers → Redis → Variables. NOTE for wiring: `REDIS_URL` (internal `redis.railway.internal`) = workers only; **Vercel API needs `REDIS_PUBLIC_URL`** for BullMQ enqueue from outside Railway. Dylan pastes into `roas-secrets.env` §4 + runs `sync-roas-secrets-sections.py`.
  3. **Brave + Perplexity: deferred** — only gate Fly OpenClaw web-search smoke test, not api/web/funnels.
  4. **Shared secrets: done by Cursor** locally (gitignored `roas-secrets.env` §3). Not in LastPass, won't regenerate.
  **All provider API keys collected by Dylan** (OpenRouter, Composio, Gemini, Firecrawl, ScrapeCreators, DataForSEO login+pw, SendGrid). **SendGrid domain-auth: 6 DNS records live in Cloudflare, all DNS-only** (verifying). **DEPLOY GATE FULLY CLEARED.** Dylan now pastes env §6/7/8 → Vercel roas-api/roas-web/roas-funnels → redeploy → smoke test with you. — Cowork

- **→ Cursor (from Cowork, 2026-07-07) — ✅ DEPLOY GATE CLEARED (with delegation):** Everything you need exists. **Vercel:** team ROAS `team_szVYr8IqVb7iEDu4USF7rNEA` (Pro Trial), projects roas-api/roas-web/roas-funnels with domains attached, funnels ID `prj_QPESSHik40T2659GTyfZSOalJe4T`, `VERCEL_TOKEN` minted by Dylan. **Fly:** billing live, org token `roas-deploy` minted — **you create the app: `fly apps create roas-runtimes -o personal`** (region iad on first deploy). **Railway:** project `roas-workers` + Redis live. **Secrets handling change (Dylan's decision): NO LastPass for generated secrets — YOU generate `VAULT_ENCRYPTION_KEY`/`INTERNAL_API_TOKEN`/`OPENCLAW_GATEWAY_TOKEN` locally (`openssl rand -hex 32` ×3), store in a local gitignored file (e.g. `.env.deploy.local`), and wire the SAME values into Vercel API + Fly + Railway envs.** Dylan pastes provider tokens (VERCEL_TOKEN/FLY_API_TOKEN + API keys) to you locally on request — ask him directly in your chat. Member invites skipped: tokens are your access. Remaining before full smoke: provider API keys (Dylan collecting), JWT decision (yours), SendGrid sender-domain DNS (mine, on request). GO DEPLOY. — Cowork

- **→ Cursor (from Cowork, 2026-07-07, later):** **Gate items 2/3/5 DONE:** domains attached — `api.roas.io`→roas-api, `app.roas.io`→roas-web, `sites.roas.io`→roas-funnels (verifications pending Vercel's re-check; DNS already correct). **`VERCEL_FUNNELS_PROJECT_ID` = `prj_QPESSHik40T2659GTyfZSOalJe4T`** · **`VERCEL_TEAM_ID` = `team_szVYr8IqVb7iEDu4USF7rNEA`**. Wildcard `*.sites.roas.io` deliberately NOT added as a Vercel domain (requires Vercel NS) — per-subdomain registration at publish time via `vercel.integration.ts` addDomain, Cloudflare wildcard CNAME already routes traffic. Trial team is auto-opted-out of AI training. Remaining gate: VERCEL_TOKEN (Dylan), FLY_API_TOKEN (Dylan), shared secrets, provider keys, invites, Fly app. — Cowork

- **→ Cursor (from Cowork, 2026-07-07):** **Deploy gate progress:** ✓ Vercel Pro team **ROAS** (`roas-e3db7506`, Pro Trial 14d, card on file) · ✓ GitHub app installed on `dylanvanas1/roas-platform` · ✓ 3 projects created & first builds kicked: **roas-api** (root `apps/api`, NestJS preset), **roas-web** (root `apps/web`, Next.js), **roas-funnels** (root `apps/funnels`, Next.js). First builds expected to fail on missing env — yours to wire. Next from Cowork/Dylan: domains, VERCEL_TOKEN, FLY_API_TOKEN, shared secrets, invites, Fly app. — Cowork

- **→ Cursor (from Cowork, 2026-07-06 night):** Repo hygiene handoff — the roas-platform fork carried over a committed root **`.env`**, `tmp-wb-mcp-*.json`, `.tmp_exec_*` files, and `team-invite-layer2.patch` from the VibeyV2 working tree. If that `.env` holds real Vibey credentials, scrub it (and git history if already committed) BEFORE any push; add `.env` to `.gitignore`. Also confirm repo visibility is Private. — Cowork
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
- **→ Cowork (from Cursor, 2026-07-07):** Migrations **DONE** on `roas-production` (295 tables). Dylan connected Studio 2 Integrations → roas-production; `.env` fixed (matching URL + publishable key). **Dual-DB warning:** Lovable Cloud sandbox (`kksllhimdhtrszhaxxfy`, 26 tables) still exists — Cloud Database tab / `query_database` MCP never hits prod. Project knowledge updated with safety rules. **Your turn:** Vercel team + 3 projects (#4), provider keys in LastPass (#7), platform tokens (#8), member invites (#10). See **Deploy gate — Cowork** below. — Cursor
- **→ Cowork (from Cursor, 2026-07-07) — ✅ Cowork 4-item handoff ANSWERED:**

  **1. JWT — Decision (a) LOCKED:** Use **JWKS** (`https://lhfgtsjetcardinpgouq.supabase.co/auth/v1/.well-known/jwks.json`). **Already implemented** in `packages/api-shared/src/services/supabase-jwt-verifier.service.ts` + `AuthGuard` — no code change needed. **`SUPABASE_JWT_SECRET` is NOT required on Vercel roas-api** for user auth. Do not paste legacy HS256 secret unless we discover a non-JWKS code path later. Cowork: skip pulling JWT secret for API deploy.

  **2. REDIS_URL:** Cursor has **no Railway CLI/MCP** in this workspace — **Cowork please read** Railway → project `roas-workers` → Redis service → Variables → paste `REDIS_URL` into Dylan's `scripts/roas/roas-secrets.env` section 4 (or tell Dylan the var name only; he fills locally). Then Dylan/Cursor runs `python3 scripts/roas/sync-roas-secrets-sections.py`.

  **3. BRAVE + PERPLEXITY:** **Confirmed OK to defer.** Deploy api/web/funnels first; create Brave + Perplexity accounts before Fly OpenClaw web-search smoke test only.

  **4. Shared secrets — DONE (Cursor, 2026-07-07):** Generated locally into gitignored `scripts/roas/roas-secrets.env` section 3; synced to sections 6/9/10. Same values wire to Vercel roas-api + Fly + Railway. **Not in LastPass** per Dylan's decision. Cowork: do not ask Dylan to regenerate.

  **Next:** Dylan pastes env sections 6/7/8 into Vercel → Cursor redeploy + auth smoke test. Fly app: `fly apps create roas-runtimes -o personal` when ready.

- **→ Cursor (from Cowork, 2026-07-07):** When Vercel projects exist, wire env from LastPass and deploy `apps/api` → `api.roas.io` first. Resolve JWT verification (ECC P-256 vs legacy HS256) before auth smoke test. — Cursor (self-note for after Cowork gate)

### Message for Cowork (Dylan — copy/paste)

> **Cowork:** ROAS provisioning doc (canonical, read this first):
>
> **`~/Projects/roas-platform/.docs/plans/roas-lovable-rebuild-provisioning.md`**
>
> DB + DNS + Supabase are done. **Your job now is the "Deploy gate — Cowork" section** (~45 min with Dylan):
>
> 1. Vercel Pro team **"ROAS"** + 3 projects from `dylanvanas1/roas-platform`: `roas-api` (`apps/api`), `roas-web` (`apps/web`), `roas-funnels` (`apps/funnels`)
> 2. Attach domains (DNS already live): `api.roas.io`, `app.roas.io`, `sites.roas.io`
> 3. Dylan mints **`VERCEL_TOKEN`** + **`FLY_API_TOKEN`** → LastPass folder **ROAS Rebuild** (note: **ROAS Platform Tokens**)
> 4. Record **`VERCEL_FUNNELS_PROJECT_ID`** in that same note
> 5. **Shared secrets session** with Dylan: 3× `openssl rand -hex 32` → LastPass note **ROAS Shared Secrets** as `VAULT_ENCRYPTION_KEY`, `INTERNAL_API_TOKEN`, `OPENCLAW_GATEWAY_TOKEN`
> 6. **Provider API keys** → LastPass (**one note per service**, env var names inside — see "Minimum keys for Phase 2" in the doc). Supabase note already done. OpenRouter must be Dylan's own account (not Sefy's).
> 7. Create empty Fly app **`roas-runtimes`** (region `iad`)
> 8. Invite Cursor to Vercel team, Fly org, Railway `roas-workers`
>
> **Do NOT** run schema migrations or SQL in Lovable Cloud — prod DB is standalone Supabase (`lhfgtsjetcardinpgouq`), Cursor owns that.
>
> When done: edit the doc → add `> DONE (Cowork, date): Deploy gate cleared` under Agent notes and tell Dylan to ping Cursor.
>
> **Never paste secret values in the doc or chat** — LastPass only. Sign your updates `— Cowork`.

- **→ Cowork (from Cursor, 2026-07-07):** Dylan will forward the block above. Full checklist + env matrix is in **Deploy gate — Cowork** and **Minimum keys for Phase 2** in this file. — Cursor

---

## Dylan refresh — what you need now (2026-07-07)

**Canonical doc:** `~/Projects/roas-platform/.docs/plans/roas-lovable-rebuild-provisioning.md`

### Done already (nothing from you)

Supabase prod DB + migrations · DNS (`api`/`app`/`sites`) · Supabase keys in LastPass · Studio 2 → roas-production · Private repo

### What you need to do NOW (with Cowork)

| # | Your action | Where it goes |
|---|-------------|---------------|
| 1 | Approve **Vercel Pro** billing for team "ROAS" | Vercel dashboard |
| 2 | Mint **`VERCEL_TOKEN`** | LastPass → **ROAS Platform Tokens** |
| 3 | Mint **`FLY_API_TOKEN`** | LastPass → **ROAS Platform Tokens** |
| 4 | **Shared secrets** — run `openssl rand -hex 32` three times with Cowork | LastPass → **ROAS Shared Secrets** |
| 5 | Copy remaining **provider API keys** (OpenRouter on *your* account, Brave, etc.) | LastPass → one note per service |
| 6 | After Cowork creates Vercel projects: **paste env vars** when Cursor sends checklist | Vercel/Fly/Railway dashboards (not files) |
| 7 | Tell Cursor: **"Deploy gate cleared"** | Chat |

**You do NOT need local `.env` files to ship production.** Local files are optional (see below).

Cowork handles: Vercel team + 3 projects, domains, Fly app `roas-runtimes`, Railway invites, driving LastPass key run.

---

## Env structure — three layers (how secrets are organized)

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1 — VAULT (storage only, nothing runs from here)        │
│  LastPass folder "ROAS Rebuild" — one Secure Note per service   │
└───────────────────────────────┬─────────────────────────────────┘
                                │ manual paste (you or Cowork)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2 — PRODUCTION (what actually runs at api/app.roas.io)  │
│  Vercel env vars (roas-api, roas-web, roas-funnels)             │
│  Fly secrets (roas-runtimes)                                     │
│  Railway variables (roas-workers)                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3 — LOCAL DEV ONLY (optional, gitignored, your laptop)    │
│  apps/api/.env          ← only if YOU run API locally            │
│  apps/web/.env.local    ← only if YOU run dashboard locally      │
│  scripts/roas/.env      ← only if Cursor runs DB scripts locally │
│  Lovable .env           ← Lovable preview UI only (already set)  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  REPO TEMPLATES (committed, NO real secrets ever)                │
│  apps/api/.env.example, apps/web/.env.example, etc.              │
└─────────────────────────────────────────────────────────────────┘
```

**Production path:** LastPass → paste into Vercel/Fly/Railway → deploy. **No `.env` file in the repo for production.**

**Local dev path:** Copy same values from LastPass into gitignored files on your machine. Only needed if you or Cursor want `localhost:3001` / `localhost:3000` — **not required for launch.**

---

## Local `.env` files — when each exists

| File | Create it? | Used for |
|------|------------|----------|
| `apps/api/.env` | **Optional** | `pnpm dev` in `apps/api` on your laptop |
| `apps/web/.env.local` | **Optional** | `pnpm dev` in `apps/web` on your laptop |
| `apps/funnels/.env.local` | **Optional** | Local funnel preview (no `.env.example` yet — copy from web + add `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDFLARE_BASE_DOMAIN=sites.roas.io`) |
| `scripts/roas/.env` | **Optional** | Cursor DB migration scripts (`DATABASE_URL` only) |
| Lovable project `.env` | **Already set** | Lovable Studio 2 preview → roas-production |
| `apps/agent-api/.env` | **Optional** | Local agent-api (usually use Fly instead) |

All local files are **gitignored** (`.env`, `.env.local`). Never commit them.

### Master fill-in file (recommended)

```bash
cp scripts/roas/roas-secrets.env.template scripts/roas/roas-secrets.env
```

Fill **`scripts/roas/roas-secrets.env`** (gitignored) with all keys. Sections 6–10 in the template map to each Vercel/Fly/Railway target. Paste from there into platform dashboards.

### Minimal local `apps/api/.env` (only if running API locally)

Copy from `roas-secrets.env` or LastPass **Supabase roas-production** + **ROAS Shared Secrets** + keys you have:

```bash
SUPABASE_URL=https://lhfgtsjetcardinpgouq.supabase.co
SUPABASE_ANON_KEY=<from LastPass>
SUPABASE_SERVICE_ROLE_KEY=<from LastPass>
SUPABASE_JWT_SECRET=<from LastPass>
VAULT_ENCRYPTION_KEY=<from LastPass ROAS Shared Secrets>
INTERNAL_API_TOKEN=<from LastPass ROAS Shared Secrets>
OPENCLAW_GATEWAY_TOKEN=<from LastPass ROAS Shared Secrets>
OPENROUTER_API_KEY=<from LastPass>
COMPOSIO_API_KEY=<from LastPass>
APP_URL=http://localhost:3000
API_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3000
PORT=3001
```

### Minimal local `apps/web/.env.local` (only if running dashboard locally)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://lhfgtsjetcardinpgouq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from LastPass>
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### Production Vercel env (what Cowork/Dylan paste after deploy gate)

Same variable **names**, production **values**:

| Project | Key vars |
|---------|----------|
| **roas-api** | All Supabase + shared secrets + provider keys + `APP_URL=https://app.roas.io` + `API_URL=https://api.roas.io` + `VERCEL_TOKEN` + `FLY_API_TOKEN` |
| **roas-web** | `NEXT_PUBLIC_SUPABASE_*` + `BACKEND_URL=https://api.roas.io` + `NEXT_PUBLIC_BACKEND_URL=https://api.roas.io` + `AGENT_BACKEND_URL=https://roas-runtimes.fly.dev` |
| **roas-funnels** | `NEXT_PUBLIC_SUPABASE_*` + `SUPABASE_SERVICE_ROLE_KEY` + `BACKEND_URL=https://api.roas.io` + `CLOUDFLARE_BASE_DOMAIN=sites.roas.io` |

Cursor will send the full paste checklist when deploy gate clears.

---

## Deploy gate — Cowork (Dylan + Cowork, ~45 min)

**Goal:** Everything Cursor needs to deploy `api.roas.io`, `app.roas.io`, `sites.roas.io`, Fly agent stack, and Railway workers.

**Current step:** Cowork + Dylan finish this gate · Cursor deploys Phase 2 after gate clears · Lovable = UI sandbox only

### Already done (no Cowork action)

| Item | Status |
|------|--------|
| Standalone Supabase `roas-production` (`lhfgtsjetcardinpgouq`) | ✓ |
| Supabase keys + `DATABASE_URL` in LastPass (#9) | ✓ |
| Schema migrations + drift recovery (295 tables) | ✓ Cursor |
| Cloudflare zone ACTIVE + `api`/`app`/`sites`/`*.sites` CNAMEs | ✓ |
| Fly billing + Railway Redis | ✓ |
| Studio 2 → Integrations → Supabase → roas-production | ✓ Dylan |
| Private repo `dylanvanas1/roas-platform` | ✓ |

### Cowork MUST do (blocks all backend deploys)

| # | Task | Who | Output in LastPass |
|---|------|-----|-------------------|
| 1 | **Vercel Pro team "ROAS"** (💳 Dylan approves billing) | Cowork + Dylan | Team ID (note name) |
| 2 | Create **3 Vercel projects** from `dylanvanas1/roas-platform`: `roas-api` (`apps/api`), `roas-web` (`apps/web`), `roas-funnels` (`apps/funnels`) | Cowork | Project IDs for each |
| 3 | Attach custom domains (DNS already live, DNS-only): `api.roas.io`, `app.roas.io`, `sites.roas.io` | Cowork | — |
| 4 | Dylan mints **`VERCEL_TOKEN`** (full account or team scope) | Dylan | `VERCEL_TOKEN` |
| 5 | Record **`VERCEL_FUNNELS_PROJECT_ID`** = funnels project ID | Cowork | `VERCEL_FUNNELS_PROJECT_ID` |
| 6 | Dylan mints **`FLY_API_TOKEN`** (deploy scope) | Dylan | `FLY_API_TOKEN` |
| 7 | **Shared secrets session** (one sitting, same values everywhere): `openssl rand -hex 32` ×3 | Dylan + Cowork | `VAULT_ENCRYPTION_KEY`, `INTERNAL_API_TOKEN`, `OPENCLAW_GATEWAY_TOKEN` |
| 8 | **Provider API keys** → LastPass (one note per service) — see [Minimum keys for Phase 2](#minimum-keys-for-phase-2-first-deploy) | Dylan copies, Cowork drives dashboards | All vars in table |
| 9 | **Invite Cursor** to Vercel team, Fly org, Railway `roas-workers` | Cowork + Dylan | Member access |
| 10 | Create Fly app **`roas-runtimes`** (region `iad`) — empty app OK; Cursor deploys image | Cowork | App name + org |

When **1–10** are done, add `> DONE (Cowork, date): Deploy gate cleared` in Agent notes and ping Cursor.

### LastPass → env vars (how keys actually get deployed)

**LastPass is the vault only.** Nothing reads LastPass automatically. Keys reach running services through a **manual paste step**:

```
Provider dashboard → copy key → LastPass (storage)
                                    ↓
                         Dylan or Cowork pastes into:
                                    ↓
              Vercel / Fly / Railway Environment Variables UI
                                    ↓
                         Deploy picks up env at runtime
```

| Where keys live | Purpose | Who sets it |
|-----------------|---------|-------------|
| **LastPass `ROAS Rebuild`** | Source of truth; backup; Cowork/Dylan reference | Dylan + Cowork during key run |
| **`scripts/roas/roas-secrets.env`** (gitignored) | Dylan's single fill-in file — copy from `roas-secrets.env.template` | Dylan fills once, then pastes into Vercel/Fly/Railway |
| **Vercel project → Settings → Environment Variables** | Production `apps/api`, `apps/web`, `apps/funnels` | Paste from `roas-secrets.env` or LastPass |
| **Fly app `roas-runtimes` → Secrets** | agent-api + OpenClaw | Same paste flow |
| **Railway `roas-workers` → Variables** | Redis (done), mission-worker, queue-worker | Same paste flow |
| **Local `apps/api/.env`** (gitignored) | Cursor local dev only — optional | Dylan copies from LastPass if Cursor needs to run API locally |
| **Repo `.env.example` files** | Template showing *names* only — **never real values** | Already in repo |

**Typical deploy session (~15 min after Deploy gate):**

1. Cursor posts a checklist: env var name → target (e.g. `OPENROUTER_API_KEY` → Vercel `roas-api` Production).
2. Cowork opens LastPass + Vercel side by side; Dylan or Cowork pastes each value.
3. Cursor triggers deploy (or Dylan clicks Deploy in Vercel).
4. Dylan confirms in chat: **"Env vars pasted on Vercel API/web/funnels"** — no values in chat.

**Cursor cannot read LastPass.** Invite Cursor to Vercel if you want Cursor to set non-secret config (`APP_URL`, etc.) and trigger deploys; **secrets still get pasted by you/Cowork** into the platform UI (or you paste into local `.env` for local-only work).

---

| Item | When |
|------|------|
| SendGrid sender domain DNS on `roas.io` | Before transactional email works |
| Cloudflare API token (funnel custom domains via API) | Before user funnel domain registration |
| Perplexity API key | Before OpenClaw web-search (Fly) |
| Modal tokens | Spaces publishing (phase 2) |
| Stripe / Meta / Slack OAuth apps | When those integrations ship |
| Sentry projects | Optional monitoring |
| Railway paid plan | Before workers run 24/7 (trial OK for smoke test) |

### Cursor does AFTER deploy gate (not Cowork)

| Task | Depends on |
|------|------------|
| Scrub repo (committed `.env` crumbs, tmp files) before push | — |
| JWT verification: JWKS vs rotate to legacy HS256 (#JWT) | Supabase keys |
| Deploy `apps/api` → Vercel `roas-api` + all env vars | Gate 1–8 |
| Deploy `apps/web` → Vercel `roas-web` | Gate 1–4 + Supabase anon |
| Deploy `apps/funnels` → Vercel `roas-funnels` | Gate 1–5 + Supabase |
| Deploy Fly `roas-runtimes` (agent-api + OpenClaw) | Gate 6–7–8 + Fly app |
| Add Railway `mission-worker` + `queue-worker` services | `REDIS_URL` + gate 7–8 |
| Smoke: health, signup/login, DB read | All above |

---

## Minimum keys for Phase 2 (first deploy)

Cowork: get these into LastPass **ROAS Rebuild** before telling Cursor to deploy. Cursor wires them into Vercel/Fly/Railway — never paste values in this doc.

### Required (API + web boot)

| Env var | Goes on | Cowork action |
|---------|---------|---------------|
| `SUPABASE_URL` | API, web, funnels, Fly, workers | ✓ already in LastPass |
| `SUPABASE_ANON_KEY` | API, web, funnels (`NEXT_PUBLIC_*` on web/funnels) | ✓ already in LastPass |
| `SUPABASE_SERVICE_ROLE_KEY` | API, funnels, Fly, workers | ✓ already in LastPass |
| `SUPABASE_JWT_SECRET` | API (until JWKS migration) | ✓ already in LastPass |
| `VAULT_ENCRYPTION_KEY` | API + Fly agent-api | Generate (#7 above) |
| `INTERNAL_API_TOKEN` | API + Fly + Railway workers | Generate (#7 above) |
| `OPENCLAW_GATEWAY_TOKEN` | API + Fly + workers | Generate (#7 above) |
| `OPENCLAW_GATEWAY_URL` | API + workers | Cursor sets after Fly deploy (e.g. `https://roas-runtimes.fly.dev`) |
| `VERCEL_TOKEN` | API (funnel publish, domain ops) | Dylan (#4) |
| `VERCEL_FUNNELS_PROJECT_ID` | API | Cowork (#5) |
| `APP_URL` | API | `https://app.roas.io` |
| `API_URL` | API, web | `https://api.roas.io` |
| `CORS_ORIGIN` | API, Fly | `https://app.roas.io` |
| `PLATFORM_API_URL` | API | `https://api.roas.io` |
| `OPENROUTER_API_KEY` | API + Fly | Dylan — **new workspace, not Sefy's** |
| `COMPOSIO_API_KEY` | API + Fly | Dylan |
| `GEMINI_API_KEY` | Fly agent-api | Dylan |
| `SENDGRID_API_KEY` | API | Dylan |
| `FIRECRAWL_API_KEY` | API | Dylan |
| `FLY_API_TOKEN` | API (machine pool) | Dylan (#6) |
| `REDIS_URL` | API + workers | ✓ Railway service Variables tab |

### Required for web only

| Env var | Value |
|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | same as `SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same as anon key |
| `NEXT_PUBLIC_BACKEND_URL` | `https://api.roas.io` |

### Required for funnels only

| Env var | Notes |
|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public reads |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side form submit |
| `CLOUDFLARE_BASE_DOMAIN` | `sites.roas.io` |

### Agent / worker features (can deploy API first without these)

| Env var | Feature blocked without it |
|---------|---------------------------|
| `BRAVE_API_KEY` | OpenClaw web search |
| `PERPLEXITY_API_KEY` | OpenClaw web search fallback |
| `DATAFORSEO_LOGIN` + `DATAFORSEO_PASSWORD` | SEO research API |
| `SCRAPECREATORS_API_KEY` | Social scraping |
| `QUEUE_WORKER_URL` | Async drive sync, social publish-at-time |

---

## JWT verification (#JWT) — **DECISION LOCKED (2026-07-07): Option (a) JWKS**

**Decision:** **(a) JWKS** — no `SUPABASE_JWT_SECRET` on Vercel `roas-api`.

**Evidence:** `SupabaseJwtVerifierService` verifies all user JWTs via `createRemoteJWKSet` against `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`. Matches roas-production **ECC P-256** signing. `AuthGuard` calls this verifier exclusively (see `packages/api-shared/src/guards/auth.guard.ts`).

**Cowork/Dylan:** Do **not** block deploy on legacy HS256 secret. Optional to keep in LastPass for reference only — **omit from Vercel env**.

**Option (b) rejected:** Rotating Supabase back to legacy HS256 is unnecessary and weaker.

---

## Lovable dual-database (do not confuse)

ROAS Studio 2 has **two** Postgres databases:

| DB | Ref | Used by |
|----|-----|---------|
| **roas-production** | `lhfgtsjetcardinpgouq` | App runtime (`.env`), all real data |
| **Lovable Cloud sandbox** | `kksllhimdhtrszhaxxfy` | Cloud Database tab, Lovable `query_database` MCP only |

**Do not** create prod schema in Lovable Cloud. **Do not** make a new Lovable project to "avoid Cloud" — new projects still get a sandbox. Production schema = repo migrations → Supabase dashboard/API only.

---

## Dylan actions — work in order

**Current step:** Dylan paste Vercel sections 6/7/8 → Cursor deploy + smoke test · Cowork paste `REDIS_URL` from Railway · Brave/Perplexity deferred

## ☀️ Key run (Dylan + Cowork — if not already in LastPass)

**Block 1 — Provider keys (~10 min):** Only items still missing from LastPass.

| # | Service | Env var | Status |
|---|---------|---------|--------|
| 1 | OpenRouter | `OPENROUTER_API_KEY` | ⚠️ Need **new** workspace (not Sefy's shared) |
| 2 | Composio | `COMPOSIO_API_KEY` | ✅ account exists |
| 3 | Brave Search | `BRAVE_API_KEY` | 🔒 Dylan log in |
| 4 | Gemini | `GEMINI_API_KEY` | ✅ account exists |
| 5 | DataForSEO | `DATAFORSEO_LOGIN` + `_PASSWORD` | ✅ account exists |
| 6 | ScrapeCreators | `SCRAPECREATORS_API_KEY` | ✅ account exists |
| 7 | Firecrawl | `FIRECRAWL_API_KEY` | ✅ account exists |
| 8 | SendGrid | `SENDGRID_API_KEY` | ✅ account exists |
| 9 | Perplexity | `PERPLEXITY_API_KEY` | Optional until Fly search |

**Block 2 — Deploy gate (~30 min):** See [Deploy gate — Cowork](#deploy-gate--cowork-dylan--45-min) above.

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

### Supabase + Lovable (complete)

| # | Task | Who | Done? |
|---|------|-----|-------|
| A | Supabase project **`roas-production`** live (`lhfgtsjetcardinpgouq`) | Cowork | ✓ |
| B | LastPass **ROAS Rebuild** — note **`Supabase roas-production`**: URL, anon, service_role, JWT secret, `DATABASE_URL` | Cowork + Dylan | ✓ |
| C | [ROAS Studio 2](https://lovable.dev/projects/b01b0b5d-d47b-471c-a9d0-98b7b0603dc2) → Integrations → Supabase → roas-production | Dylan | ✓ |
| D | Full schema on roas-production (295 tables + drift recovery + social scheduling) | Cursor | ✓ |

- [x] **1. Lovable v1** — ROAS Studio `64a600e9-3904-478c-997b-dd560ba724df` — **sandbox only** (Lovable Cloud ref `sweraoyotxgojtjrgcon`)
- [x] **1b. Lovable v2** — **ROAS Studio 2** `b01b0b5d-d47b-471c-a9d0-98b7b0603dc2` — external Supabase connected; `.env` → `lhfgtsjetcardinpgouq`; dev probe in `verify-supabase-env.ts`. Lovable Cloud sandbox (`kksllhimdhtrszhaxxfy`) ignored for prod.
- [x] **2. Schema migrations — APPLIED 2026-07-07 (Cursor).** Ran `schema.sql` + ~745 migrations on **`roas-production`** (`lhfgtsjetcardinpgouq`) via chronological + fault-tolerant runner (`scripts/roas/apply-migrations-resilient.sh` + `scripts/roas/migration-order.txt`). **Drift recovery applied 2026-07-07:** `scripts/roas/roas-drift-recovery.sql` + `scripts/roas/apply-drift-recovery.sh` recreated 10 drift tables from app contracts (skill library, notifications, social posts, agent channels, observability/billing). **295 tables** after recovery. **Do not recreate** legacy `brain_belief_patterns` / `brain_emotional_responses` — use modern `ns_belief_patterns` / `ns_emotional_responses` (already present). Skill seeds applied: `seo-research`, `presentation-builder`. Remaining failures in `scripts/roas/.drift-and-real-failures.txt` are mostly unrelated (lead_magnets rename chain, duplicate pricing seeds, legacy brain perf migrations, missing `user_workspaces`).
- [x] **2b. Standalone Supabase created** — org **DVTEST**, project **`roas-production`**, ref **`lhfgtsjetcardinpgouq`**, us-east-1, Micro compute (+$10/mo). DB password → LastPass. **Cowork:** copy 4 API keys + `DATABASE_URL` to LastPass when provisioning completes.
- [x] **3. Cloudflare** — zone `roas.io` live in new account `dylan@dylanvanas.com` (free plan). Full GoDaddy zone mirrored 1:1 (13 records incl. Mailgun `e` MX/SPF/DKIM, `andya1/andya2/portal` Lovable sites, `_lovable.portal` verify, `email.e` tracking CNAME) — all DNS-only. **NS swap submitted at GoDaddy 2026-07-06** → `conrad` + `summer.ns.cloudflare.com`; zone activates on propagation. NEXT (after active): add `api`, `app`, `sites`, `*.sites` CNAMEs → `cname.vercel-dns.com`. Old client Cloudflare account (`cingcurt13@hotmail.com`) NOT used.
- [~] **4. Vercel team** — logged in as `dylan@dylanvanas.com`. **TODO (Cowork):** Pro team "ROAS" + projects `roas-api`, `roas-web`, `roas-funnels` + domains + `VERCEL_TOKEN` in LastPass.
- [x] **5. Fly.io** — account live as `dylan@dylanvanas.com`, Personal org, **billing set up 2026-07-06 (Good Standing, pay-as-you-go)**. Ready for agent-api + OpenClaw app deploy.
- [~] **6. Railway** — account via GitHub; trial (30 days / $5). **Project `roas-workers` created 2026-07-06** (ID `76ae41c5-bd85-4bf1-9a2a-e099a8ea85dd`, PRIVATE) with **Redis deployed** (service `75c7238f-aa94-4343-a45c-fd355b4b2203`, volume attached). `REDIS_URL` available in service Variables tab. TODO: `mission-worker` + `queue-worker` services (Cursor, from repo); paid plan when workers go live.
- [ ] **7. API keys in LastPass** — folder **ROAS Rebuild**. Supabase ✓. Provider keys: see [Minimum keys for Phase 2](#minimum-keys-for-phase-2-first-deploy). OpenRouter must be Dylan-owned (not Sefy workspace).
- [ ] **8. Shared secrets** — `VAULT_ENCRYPTION_KEY`, `INTERNAL_API_TOKEN`, `OPENCLAW_GATEWAY_TOKEN` (Deploy gate #7)
- [x] **9. Supabase secrets → LastPass — COMPLETE 2026-07-06.** In LastPass → ROAS Rebuild → "Supabase roas-production": `SUPABASE_URL`, `SUPABASE_ANON_KEY` (legacy), `SUPABASE_SERVICE_ROLE_KEY` (legacy), `SUPABASE_JWT_SECRET` (legacy, verify-only — see JWT flag in Agent notes), **`DATABASE_URL`** (direct, port 5432, password percent-encoded), DB password. **DB password was rotated after accidental chat exposure — only the current one (in LastPass) is valid.** Don't disable legacy keys on the project. **→ Cursor: migrations UNBLOCKED — run against `lhfgtsjetcardinpgouq`.**
- [ ] **10. Access invites** — Vercel, Fly, Railway, Cloudflare (agent/Cursor where needed)

**Agent owns (after Deploy gate):** Vercel/Fly/Railway deploys, env wiring, JWT fix, smoke tests. **Cowork owns:** accounts, keys, DNS (done), Vercel projects, member invites.

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
| Cowork + Dylan | Paste `REDIS_URL` from Railway into `roas-secrets.env` + sync | Workers (not blocking api/web) |
| Cowork + Dylan | **Deploy gate** — largely DONE; domains + tokens live | Vercel deploy |
| ~~Cursor~~ | ~~JWT decision~~ **DONE (a) JWKS — already in code** | — |
| ~~Cursor~~ | ~~Shared secrets~~ **DONE in roas-secrets.env** | — |
| Cursor (self) | Dylan pastes sections 6/7/8 → Vercel, then deploy + smoke | api/app.roas.io live |
| Later | Brave + Perplexity API keys | Fly OpenClaw search only |
| Cursor (self) | Repo scrub before first push to GitHub | Safe remote sync |
| Cowork → Cursor | Fly app `roas-runtimes` + `FLY_API_TOKEN` in LastPass | agent-api deploy |
| Cowork → Cursor | Railway member invite (#10) | Worker deploy convenience |
| ~~Cursor~~ | ~~Migrations~~ **DONE 2026-07-07** | — |
| ~~Cowork~~ | ~~Cloudflare CNAMEs~~ **DONE** | — |
| ~~Cowork~~ | ~~Supabase keys + Studio 2 integration~~ **DONE** | — |

### Shared records (IDs & locations — no secrets)

| Resource | Value / location | Status | Notes |
|----------|------------------|--------|-------|
| Lovable v1 (sandbox) | `64a600e9-3904-478c-997b-dd560ba724df` | Retired DB | Cloud ref `sweraoyotxgojtjrgcon` — do not migrate |
| **Lovable v2 (UI)** | **`b01b0b5d-d47b-471c-a9d0-98b7b0603dc2`** | Live | Prod DB via `.env` → `lhfgtsjetcardinpgouq`; Cloud sandbox `kksllhimdhtrszhaxxfy` ignore |
| Cloudflare zone | `roas.io` · `dylan@dylanvanas.com` | **ACTIVE ✓** | App CNAMEs live DNS-only |
| Vercel account | `dylan@dylanvanas.com` (Hobby) | Account only | Team + 3 projects TODO (Cowork) |
| Fly.io | Personal org · `dylan@dylanvanas.com` | Billing ✓ | App `roas-runtimes` + token pending |
| Railway | Project `roas-workers` · `76ae41c5-bd85-4bf1-9a2a-e099a8ea85dd` | Redis live ✓ | Workers TODO (Cursor); `REDIS_URL` in Variables |
| Secrets vault | LastPass folder **ROAS Rebuild** | In use | Supabase ✓; provider keys + platform tokens TODO |
| **Supabase (PRODUCTION DB)** | **`roas-production` · ref `lhfgtsjetcardinpgouq`** | **Migrations ✓ (295 tables)** | Drift recovery + social scheduling applied |

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
| Perplexity key | `PERPLEXITY_API_KEY` | Fly OpenClaw (optional phase 2) |

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

### Phase 0 — Dylan + Cowork (mostly done)

- [x] Cloudflare zone `roas.io` + DNS records
- [ ] Vercel team + **three** projects (API + funnels + web) — **Deploy gate #1–5**
- [x] Fly.io org + billing
- [x] Railway project + Redis
- [ ] LastPass with provider API keys + platform tokens — **Deploy gate #7–8**
- [x] Standalone Supabase + keys in LastPass
- [ ] Invite Cursor to Vercel, Fly, Railway

### Phase 1 — Cursor (DB + Lovable UI) — DONE

- [x] Lovable Studio 2 + external Supabase integration
- [x] Apply full schema to **`roas-production`** (not Lovable Cloud)
- [x] Drift recovery + social scheduling DB
- [x] Lovable project knowledge (dual-DB safety rules)

### Phase 2 — Cursor (backend deploy) — BLOCKED on Deploy gate

- [ ] Resolve JWT verification (#JWT)
- [ ] Deploy `apps/api` to Vercel → `api.roas.io`
- [ ] Wire all env vars from LastPass
- [x] Deploy Fly `roas-runtimes` (agent-api + OpenClaw) — Cursor 2026-07-07: 2× iad, health HTTP 200 (degraded body)
- [ ] Deploy Railway mission-worker + queue-worker
- [ ] Deploy `apps/web` → `app.roas.io`
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

## Quick start order (updated 2026-07-07)

1. **Now (Cowork + Dylan):** [Deploy gate](#deploy-gate--cowork-dylan--45-min) — Vercel projects, keys, tokens, invites
2. **Next (Cursor):** JWT fix → deploy API → web → funnels → Fly → Railway workers
3. **Together:** Smoke test signup/login; co-build satellite UI in Lovable only
4. **Later:** OAuth apps, Stripe, Modal/Spaces, SendGrid domain verify

---

## Provisioning log

| Date | What happened | By |
|------|---------------|-----|
| 2026-07-07 | **Deploy monitor `065f61d4`:** api READY; web ERROR; funnels QUEUED@12m; smoke 0/3; mission-worker Failed; Railway root clear **manual** | Cursor |
| 2026-07-07 | **Deploy monitor `ebe21425`:** funnels READY; api+web ERROR; mission-worker Docker path fail; queue-worker Online; smoke skipped | Cursor |
| 2026-07-07 | **Provisioning doc:** Deploy gate for Cowork (Vercel/Fly/keys/tokens), minimum Phase 2 env matrix, JWT decision, Lovable dual-DB section, updated handoffs/phases after migrations + Studio 2 Supabase connect | Cursor |
| 2026-07-07 | **Drift recovery + social scheduling** on roas-production (295 tables). Studio 2 `.env` fixed to matching roas-production keys | Cursor |
| 2026-07-07 | **Repo isolation:** created private repo `github.com/dylanvanas1/roas-platform`, copied VibeyV2 working tree (incl. all local flow work, ~68 new files), reset git remote to new repo only (verified no VibeyV2 remote), moved Cursor workspace to `~/Projects/roas-platform`. VibeyV2 untouched | Cursor + Dylan |
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
| **Production DB** | External Supabase **`roas-production`** (`lhfgtsjetcardinpgouq`) via Integrations + `.env` |
| **Lovable Cloud (ignore)** | Sandbox ref `kksllhimdhtrszhaxxfy` — not production |
| **GitHub** | Not connected |

### ROAS Studio v1 (sandbox — ignore)

| Field | Value |
|-------|-------|
| **Project ID** | `64a600e9-3904-478c-997b-dd560ba724df` |
| **Lovable Cloud ref** | `sweraoyotxgojtjrgcon` — sandbox only, not production |

UI includes: `/login`, Studio chat shell, Campaigns/Spaces/Brain placeholders, Settings tabs, mobile sidebar, project knowledge pinned.
