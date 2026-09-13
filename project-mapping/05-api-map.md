# API Map

> Reverse-engineered from source on **2026-09-05**. Read-only pass; no source file was modified.
> Route counts were extracted by parsing `@Controller()` / `@Get|@Post|@Put|@Patch|@Delete|@All` decorators
> across `apps/api/src` and `apps/agent-api/src`, then reconciled against `rg` counts.
> Confidence tags: **CONFIRMED** (read the code), **LIKELY** (strong indirect evidence), **UNKNOWN** (not determined).

## How to Read This

There are **four** tiers, not three. A browser request to the product almost never hits a backend directly:

```
Browser (app.roas.io — apps/web, Next.js 16)
  │
  ├─ /api/proxy/[...path]  ← catch-all Next.js route handler (THE hinge; see "The Proxy Layer")
  │     │
  │     ├─ path starts with chat | apps | project-files, or is brain/live-session
  │     │      → AGENT tier: the *calling user's own* Fly.io machine (app `roas-runtimes`)
  │     │        running apps/agent-api (NestJS, port 3003)
  │     │            │
  │     │            └─ agent-api talks to the OpenClaw gateway on localhost:18789
  │     │               (apps/openclaw — vendored agent runtime, node:http, NOT NestJS)
  │     │
  │     └─ everything else
  │            → PLATFORM tier: apps/api (NestJS, port 3001 local / api.roas.io on Vercel)
  │
  └─ 9 non-proxy Next.js route handlers under apps/web/src/app/api/** that do their own thing
```

Two independent side doors bypass `apps/web` entirely:

- **`workers/apps-proxy`** — a Cloudflare Worker on `*.agents.roas.io` that fronts public agent
  widgets and published apps, hitting the Fly runtime directly.
- **`apps/funnels`** / **`apps/website`** — separate Next.js apps whose route handlers call
  `apps/api` public endpoints server-to-server.

**The single most useful fact for a newcomer:** a frontend call to `/api/proxy/billing/status`
becomes `GET {BACKEND_URL}/api/billing/status`. The proxy inserts the literal `/api` prefix itself
(`apps/web/src/app/api/proxy/[...path]/route.ts:864`), which is why every NestJS route below is
written as `/api/...` even though controllers declare paths without it.

## Surface Summary

| Surface                   | Base URL / Port                                           | Framework                                        | Endpoint count                                    | Auth model                                                                                                                          |
| ------------------------- | --------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api`                | `http://localhost:3001` · `https://api.roas.io`           | NestJS 11 + Express adapter                      | **1,632** routes / 339 controllers / 58 modules   | Per-controller `@UseGuards(AuthGuard, …)`. **No global guard** — unguarded means unauthenticated.                                   |
| `apps/agent-api`          | `http://localhost:3003` · `https://roas-runtimes.fly.dev` | NestJS + `WsAdapter`                             | **78** routes / 32 controllers / 16 modules       | Same guard stack, plus `InternalAuthGuard`, `RuntimeIdentityGuard`, `PublicAgentGuard`, `ChannelServiceGuard`, `VibeyMcpOAuthGuard` |
| `apps/web` route handlers | `http://localhost:3000` · `https://app.roas.io`           | Next.js 16 App Router                            | **10** files (1 is the catch-all proxy = 5 verbs) | Supabase cookie session (`@/lib/supabase/server`) or pass-through `Authorization`                                                   |
| `apps/openclaw` gateway   | `http://localhost:18789`                                  | `node:http` + chain-of-responsibility dispatcher | ~7 known HTTP paths + WS                          | Bearer gateway token via `authorizeGatewayConnect`                                                                                  |
| `apps/admin`              | port 3002                                                 | Next.js                                          | **1** file (proxy only, 5 verbs)                  | Forwards `Authorization` only                                                                                                       |
| `apps/funnels`            | port 3002 (collides with admin)                           | Next.js                                          | **4** files                                       | None inbound; calls public `apps/api` endpoints                                                                                     |
| `apps/website`            | —                                                         | Next.js                                          | **1** file                                        | None                                                                                                                                |
| `apps/docs`               | —                                                         | Next.js                                          | **3** files                                       | UNKNOWN (not audited in depth)                                                                                                      |
| `workers/apps-proxy`      | `*.agents.roas.io`                                        | Cloudflare Worker                                | 2 host-based entry branches                       | Mints `x-public-agent-token` server-side; `INTERNAL_API_TOKEN` for machine wake                                                     |

Route-count caveat (CONFIRMED): the parser attributes array-form decorators such as
`@Get(['mcp', 'vibey-mcp'])` as one route. `apps/agent-api` therefore has **78** decorator sites but
**74** parsed rows; `apps/api` has no array-form decorators, so 1,632 is exact.

## Routing & Prefixes

**`apps/api` — global prefix `api`** (`apps/api/src/main.ts:56`), with exactly two exclusions:

```62:64:apps/api/src/main.ts
    exclude: [
      { path: '.well-known/oauth-authorization-server', method: RequestMethod.GET },
      { path: '.well-known/openid-configuration', method: RequestMethod.GET },
    ],
```

Everything else is `/api/**`. **No versioning anywhere** — no `app.enableVersioning()`, no `/v1/`
segment (CONFIRMED; the only `/v1/` paths in the repo belong to OpenClaw's OpenAI-compatible shim).

Before Nest sees a request, a bare-Express middleware rejects anything outside the API surface:

```21:27:apps/api/src/middleware/external-surface.middleware.ts
export function enforceApiSurface(req: Request, res: Response, next: NextFunction) {
  const pathname = (req.path && req.path.length > 0 ? req.path : '/') || '/'
  if (isApiOrStaticPath(pathname)) {
    return next()
  }
  res.status(404).end()
}
```

Allowed non-`/api` paths are exactly `/favicon.ico`, `/favicon.png`, `/capture.js`, and the two
`.well-known` documents (`external-surface.middleware.ts:7-14`).

**Vercel function mapping** (`apps/api/vercel.json`): five serverless functions. `api/index.ts` is
the whole Nest app — it lazily imports `../dist/main`, calls `createNestApp()`, and caches the
underlying Express instance across invocations (`apps/api/api/index.ts:25-32`). The `rewrites` array
sends four `/cron/*` paths to dedicated small functions and then `{ "source": "/(.*)", "destination": "/api" }`
funnels **all other traffic** into the Nest function. `maxDuration` is 300s on every function.

**`apps/agent-api` — global prefix `api`** (`apps/agent-api/src/main.ts:70`) with four exclusions,
notably `{ path: '', method: RequestMethod.POST }` so the MCP transport can be reached at the bare
root `POST /`. Its `AGENT_API_BOOT_PROFILE` env var selects between the full `AppModule` and a slim
`RuntimeChatAppModule` (`main.ts:35-42`), so **the live route set can be smaller than 78 depending on
boot profile** (CONFIRMED mechanism; which profile production uses is UNKNOWN).

**`apps/web`** has no rewrite layer for the API — the proxy is an ordinary route handler.

## The Proxy Layer

File: `apps/web/src/app/api/proxy/[...path]/route.ts` (307 lines shown as 1,307 with the SSE machinery;
`export const maxDuration = 300`, `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`).
All five verbs share one handler:

```1303:1307:apps/web/src/app/api/proxy/[...path]/route.ts
export const GET = proxyRequest
export const POST = proxyRequest
export const PUT = proxyRequest
export const PATCH = proxyRequest
export const DELETE = proxyRequest
```

Note there is **no `HEAD` and no `OPTIONS` export** (CONFIRMED) — those verbs cannot reach a backend
through the proxy.

### Path rewriting

`const backendPath = '/api/' + path.join('/')` (line 864). Query params are copied verbatim
(`appendSearchParams`, line 466).

### Backend selection

```34:37:apps/web/src/app/api/proxy/[...path]/route.ts
const AGENT_PATHS = ['chat', 'apps', 'project-files']

/** Specific sub-paths under other prefixes that route to Agent Backend */
const AGENT_SUBPATHS = ['brain/live-session']
```

First segment in `AGENT_PATHS`, or first-two-segments equal to `brain/live-session` → agent tier;
otherwise `BACKEND_URL` (default `http://localhost:3001`).

### Agent-tier target resolution (`resolveAgentInfo`, lines 292–393)

1. Short-circuits to `AGENT_BACKEND_URL` when `FORCE_AGENT_BACKEND_URL=1` (non-prod only), when
   `AGENT_BACKEND_URL` is localhost, or when there is no bearer token.
2. Decodes `sub` from the JWT **without verifying it** (`decodeJwtSub`, line 107) purely to pick a
   routing key — verification happens at the backend guard.
3. Reads the caller's `profiles` row via the Supabase **anon** key with the user's JWT attached
   (so RLS applies), retrying up to 10s with backoff (`resolveProfileWithRetry`, line 149).
4. `runtime_type === 'shared_railway'` → route to `agent_runtime_url`.
5. Otherwise pin to the user's Fly machine by setting **`fly-force-instance-id`** (line 481). The
   header-comment at lines 245–265 is explicit that omitting the pin risks landing on another user's
   machine — a cross-tenant leak.
6. Before forwarding, it calls **`POST /api/proxy/machines/ensure-running` on itself** (line 218) to
   wake the machine, with a 285s timeout; failure aborts the request.
7. 60s in-memory cache keyed by raw JWT (`machineCache`, line 47).

### Auth and headers attached

| Header                                                                           | Behaviour                                                                                                                                    | Line    |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `Authorization`                                                                  | Forwarded verbatim; the proxy never mints a token                                                                                            | 882     |
| `x-org-id`                                                                       | Forwarded when present                                                                                                                       | 885     |
| `x-impersonate-user-id`                                                          | Forwarded **except** when the path starts with `/api/admin/impersonation`                                                                    | 889–896 |
| `x-supabase-refresh-token`                                                       | Forwarded only for agent paths and exactly `/api/mcp/oauth/consent`, `/api/telegram/connect`, `/api/slack/install`, `/api/slack/channel-map` | 898–907 |
| `x-vibey-request-id` / `-parent-span-id` / trace, message, run, conversation ids | Correlation chain; a fresh proxy span id is generated per request                                                                            | 435–448 |
| `fly-force-instance-id`                                                          | Set for pinned agent machines, deleted otherwise                                                                                             | 479–483 |
| `Accept-Encoding: identity` (+ `Accept: text/event-stream` for chat)             | Disables compression so SSE arrives incrementally                                                                                            | 910–915 |
| Vercel protection bypass                                                         | `applyVercelProtectionBypass(...)` on **platform** calls only, never agent calls                                                             | 991–994 |

### Response handling

Five distinct paths: SSE relay with credit headers (`x-credits-low`, `x-credits-remaining`) at 1096–1182;
bodyless 204 at 1185; 3xx with preserved `Location` at 1201; binary/PDF/image/video/zip/csv streamed
raw at 1222; and the `apps` prefix streamed as HTML at 1243. Everything else is buffered as text.
On any throw the proxy returns **502 `{ error: 'Backend unavailable' }`** (line 1296).

### The chat warm-up special case

`POST /api/chat` never proxies straight through. `shouldWarmChatBeforeProxying` (line 936) diverts it
into `proxyChatWithWarmup` (line 545), which **immediately returns HTTP 200 with an SSE stream**,
emits rotating `status` events ("Turning on your agents…") every 8s while the machine boots, then
splices in the upstream stream. Cold-start retries follow `[0, 1000, 2000, 4000, 8000, 16000]` ms
(line 399). Consequence worth knowing: **a failed chat request still returns 200** — the error
arrives as an in-band SSE `{type:'error'}` event.

### What bypasses the proxy

- The 9 sibling route handlers in `apps/web/src/app/api/**` (see below).
- `apps/admin`'s own simpler proxy (`apps/admin/src/app/api/proxy/[...path]/route.ts`, 53 lines) —
  forwards only `Authorization` and `Content-Type`, no SSE, no agent routing, no impersonation.
- `workers/apps-proxy` on `*.agents.roas.io`.
- `apps/funnels` and `apps/website` server-side `fetch` to `api.roas.io`.
- All webhooks and cron paths, which are called by third parties / Vercel directly.

## Endpoints by Feature

Full machine-readable listing is reproducible from the decorators; below, each group cites the
directory so a reader can `rg "@Controller\(" <dir>` and see everything. Route counts are per module.

### `apps/api` — top modules

**integrations — 506 routes**, 87 controllers, `apps/api/src/modules/integrations/`.
By far the largest module and effectively a mini-monolith. Per-provider counts (CONFIRMED):

| Provider dir                                                                                                                                                                       | Routes  | Base path                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------- |
| `activecampaign`                                                                                                                                                                   | 110     | `/api/integrations/active-campaign/**`                          |
| `scrapecreators`                                                                                                                                                                   | 70      | `/api/integrations/scrapecreators/**`                           |
| `meta`                                                                                                                                                                             | 34      | `/api/integrations/meta/**`                                     |
| `controllers` (shared)                                                                                                                                                             | 29+     | `/api/integrations/**` (catalog, capabilities, composio bridge) |
| `fanbasis`                                                                                                                                                                         | 29      | `/api/integrations/fanbasis/**`                                 |
| `stripe`                                                                                                                                                                           | 28      | `/api/integrations/stripe/**`                                   |
| `page-grader`                                                                                                                                                                      | 27      | `/api/integrations/page-grader/**`                              |
| `google-drive`                                                                                                                                                                     | 22      | `/api/integrations/google-drive/**`                             |
| `supabase`                                                                                                                                                                         | 21      | `/api/integrations/supabase/**`                                 |
| `wordpress`, `fathom`                                                                                                                                                              | 18 each | `/api/integrations/{wordpress,fathom}/**`                       |
| `calendly`                                                                                                                                                                         | 14      | `/api/integrations/calendly/**`                                 |
| `google-workspace`                                                                                                                                                                 | 13      | `/api/integrations/google-workspace/**`                         |
| `github` 11 · `dropbox` 10 · `searchapi` 9 · `fireflies` 8 · `paypal` 7 · `dataforseo` 5 · `gohighlevel` 5 · `openai-codex` 4 · `cursor` 4 · `higgsfield` 3 · `anthropic-claude` 3 |         |                                                                 |

Near-universal per-provider shape: `GET …/status`, OAuth `…/connect` + `…/callback`, `DELETE …/disconnect`,
then provider-specific operations. Guards are `AuthGuard, OrgContextGuard, OrgRoleGuard` (+`ThrottlerGuard`).

**spaces — 141 routes**, 36 controllers, `apps/api/src/modules/spaces/`.

| Method | Endpoint                                        | Controller / File                                                  | Handler          | Auth                                       | Purpose                                                                                            |
| ------ | ----------------------------------------------- | ------------------------------------------------------------------ | ---------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| GET    | `/api/shared/item/:token`                       | `controllers/space-public-sharing.controller.ts:22`                | `getSharedItem`  | **`@Public()`**                            | Token-scoped public share view                                                                     |
| GET    | `/api/shared/space/:token`                      | `controllers/space-public-sharing.controller.ts:32`                | `getSharedSpace` | **`@Public()`**                            | Token-scoped public space view                                                                     |
| POST   | `/api/flow-webhooks/:publicToken`               | `controllers/space-webhook-receiver.controller.ts:24`              | —                | `ThrottlerGuard` + `x-vibey-signature`     | Inbound automation trigger                                                                         |
| GET    | `/api/internal/space-automations/process-due`   | `controllers/space-automation-scheduler-internal.controller.ts:12` | `processDue`     | inline `CRON_SECRET`                       | Cron fan-out                                                                                       |
| POST   | `/api/internal/spaces/:id/automations/resume`   | `controllers/space-automations-internal.controller.ts`             | `resume`         | **none found**                             | Resume paused automation                                                                           |
| —      | `/api/spaces/**` (134) · `/api/automations` (4) | 36 controllers                                                     | —                | `AuthGuard, OrgContextGuard, OrgRoleGuard` | items, docs, kanban, automations+flows (34), social-research (20), ads-research (11), precall-prep |

**campaigns — 137 routes**, 28 controllers, `apps/api/src/modules/campaigns/`.
Every controller here is `@Controller()` with **no base path**, so paths are top-level and do _not_
live under `/api/campaigns`: `/api/campaigns` (59), `/api/presentations` (16), `/api/ad-sets` (12),
`/api/sequences` (8), `/api/ad-campaigns` (8), `/api/ads` (7), `/api/social-posts` (5), `/api/offers` (4),
`/api/funnels` (3), `/api/blog-posts` (3), `/api/documents` (3), `/api/avatars` (3), `/api/artifacts` (3),
`/api/internal/campaign-knowledge/ingest` (1). Example: `GET|PATCH|DELETE /api/ads/:id`,
`POST /api/ads/:id/{refresh-meta-status,set-meta-status,duplicate,clone}` in
`controllers/ad-artifacts.controller.ts:27`. Generation routes add `CreditsGuard`
(`ad-copy-generation-artifacts.controller.ts:20`).

**missions — 83 routes**, 15 controllers, `apps/api/src/modules/missions/`:
`/api/missions/**` (52, incl. `notifications` 14 and `agents/:agentKey/checkpoints` 4) and
`/api/internal/{missions,agents}/**` (31, `InternalAuthGuard`).

**brain — 82 routes**, 18 controllers, `apps/api/src/modules/brain/`:
`/api/brain` (37), `/api/brain/import-jobs` (17), `/api/brain/sk` (10), `/api/brain/snapshots` (8),
`/api/brain/search` (3), `/api/brain/pending` (3), `/api/brain/cross-suggestions` (3),
`/api/brain/page-grader` (1). Includes `GET /api/brain/health` (`controllers/memories-status.controller.ts:47`)
— a **data-freshness** probe, not a liveness probe. 18 routes use `BrainAuthGuard`.

**admin — 60 routes**, 10 controllers, `apps/api/src/modules/admin/`. All `AuthGuard, RoleGuard`.

| Method   | Endpoint                                                                                                                                                  | File                                                    | Purpose                                                            |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ |
| GET      | `/api/admin/check` · `/dashboard` · `/users` · `/orgs` · `/users/:id/dashboard` · `/orgs/:id/dashboard`                                                   | `controllers/admin.controller.ts:7`                     | Superadmin console                                                 |
| GET      | `/api/admin/{machines,unit-economics,billing-health}`                                                                                                     | `controllers/admin-infrastructure.controller.ts:7`      | Infra + billing health                                             |
| POST     | `/api/admin/billing-health/reconcile`                                                                                                                     | same, line 7                                            | **Vercel cron target**                                             |
| GET      | `/api/admin/{finances,operations,errors,traces,traces/:id,request-traces/:requestId,mission-reliability,instruction-governance}`                          | `controllers/admin-operations.controller.ts:6`          | Observability console                                              |
| GET/POST | `/api/admin/impersonation/{targets,start,stop,audit}`, `GET …/machine-target/:userId`                                                                     | `controllers/impersonation.controller.ts:19`            | Impersonation control (proxy strips the impersonation header here) |
| —        | `/api/admin/enterprise/skill-builder/**` (13), `/api/admin/platform-email/**` (5), `/api/admin/{waitlist,invite-codes}/**` (6), `/api/admin/ai-usage` (1) | `controllers/`, `enterprise/`                           |                                                                    |
| POST     | `/api/internal/enterprise/skills/{list,create,upsert,update,delete,resource}`                                                                             | `enterprise/internal-enterprise-skills.controller.ts:9` | `InternalAuthGuard`                                                |

**slack — 56 routes**, 9 controllers, `apps/api/src/modules/slack/`: `/api/integrations/slack/**` (45,
incl. `people` 15 and `brain-mappings` 8), `/api/slack/**` (9), `POST /api/webhooks/slack/events` (1),
`GET /api/slack/oauth/callback` (1).

**agents — 54 routes**, 8 controllers, `apps/api/src/modules/agents/`: `/api/agents` (40),
`/api/agents/skill-catalog` (10), `/api/agents/:agentKey/checkpoints` (4).

**org — 42 routes**, 10 controllers, `apps/api/src/modules/org/` — all under `/api/org/**`
(members, roles, invitations, settings). `GET /api/org/invitations/:token` is `@Public()`
(`controllers/org-invitations.controller.ts:149`).

### `apps/api` — mid and small modules

| Module                                                                                                                                                                    | Routes  | Paths                                                                                                                                                                               | Dir                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| email                                                                                                                                                                     | 34      | `/api/email/{domains 10, sender-identities 8, unsubscribe 5, logs 3, webhooks 2}`, `/api/emails` (4), `/api/campaigns` (2)                                                          | `modules/email/`    |
| funnels                                                                                                                                                                   | 27      | `/api/funnels` (24), `/api/internal/funnels` (2), `GET /api/preview/pages/:pageId` (1, unguarded)                                                                                   | `modules/funnels/`  |
| internal                                                                                                                                                                  | 24      | `/api/internal/**` — brain nodes/import-jobs, media, billing, offers, documents, sequences, storage upload                                                                          | `modules/internal/` |
| billing                                                                                                                                                                   | 24      | `/api/billing/**` (23) + `GET /api/internal/billing-credit-alerts/process-due`                                                                                                      | `modules/billing/`  |
| leads                                                                                                                                                                     | 23      | `/api/leads/**` (22, contacts+CRM) + `POST /api/internal/contacts/resolve`                                                                                                          | `modules/leads/`    |
| channels                                                                                                                                                                  | 22      | `/api/channels/**`                                                                                                                                                                  | `modules/channels/` |
| agent-teams · conversations · media                                                                                                                                       | 21 each | `/api/agent-teams`, `/api/conversations`, `/api/media`                                                                                                                              | respective dirs     |
| meetings                                                                                                                                                                  | 20      | `/api/spaces/:spaceId/meetings/**` (12), `/api/meeting-follow-up-reviews/**` (7, all `@Public()`), `POST /api/internal/meeting-action-reconciliation/run`                           | `modules/meetings/` |
| canvas                                                                                                                                                                    | 18      | `/api/canvas` (10), `/api/canvas/campaigns` (8)                                                                                                                                     | `modules/canvas/`   |
| mcp                                                                                                                                                                       | 16      | `/api/mcp/**` (14) + 2 `.well-known` docs                                                                                                                                           | `modules/mcp/`      |
| domains 13 · projects 13 · users 12 · forms 11 · programs 11 · work-requests 10                                                                                           |         | `/api/domains`, `/api/projects`+`/api/sdk-proxy`, `/api/profile`+`/api/users`+`/api/settings`, `/api/forms`+`/api/public/forms`, `/api/programs`+`/api/tasks`, `/api/work-requests` |                     |
| machines 9 · telegram 9 · dm 8 · themes 8 · waitlist 7 · email-campaigns 7 · skill-recommendations 7 · browser-sessions 7 · segments 7 · home 6                           |         | see `/tmp`-free reproduction: `rg "@Controller\(" apps/api/src/modules/<name>`                                                                                                      |                     |
| sandboxes 5 · custom-fields 5 · auth 4 · models 4 · team-roster 4 · transcribe 4 · enterprise-applications 3 · space-templates 3 · space-retrieval 3 · provider-billing 3 |         |                                                                                                                                                                                     |                     |
| sidebar 2 · agent-feedback 2 · transfer 2 · onboarding 2 · vault 2 · client-errors 1 · artifacts 1 · feature-updates 1 · your-turn 1 · link-preview 1 · entity-search 1   |         |                                                                                                                                                                                     |                     |

### `apps/agent-api` — all 16 modules (78 routes)

| Method                | Endpoint                                                                                                             | File                                                                                              | Handler                                                    | Auth                                                                     | Purpose                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- | ---------------- |
| POST                  | `/api/chat`                                                                                                          | `modules/chat/controllers/chat-stream.controller.ts:30`                                           | `sendMessage`                                              | `AuthGuard, CreditsGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard` | Main SSE chat turn                                               |
| POST                  | `/api/chat/stop` · `/api/chat/prewarm`                                                                               | same dir                                                                                          | `stopStream`, `prewarm`                                    | same                                                                     | Abort / warm                                                     |
| GET                   | `/api/chat/status/:conversationId` · `/api/chat/runs/:runId/stream` · `/api/chat/conversations/:id/context-baseline` | `chat-status.controller.ts:29`                                                                    | —                                                          | same                                                                     | Resume + status streams                                          |
| GET                   | `/api/chat/browser-media/:filename`                                                                                  | `browser-media.controller.ts:11`                                                                  | `serveMedia`                                               | `AuthGuard,…`                                                            | Serve agent browser screenshots                                  |
| POST                  | `/api/channel-chat`                                                                                                  | `channel-chat.controller.ts:22`                                                                   | `sendMessage`                                              | `ChannelServiceGuard`                                                    | Slack/Telegram-originated turns                                  |
| POST                  | `/api/internal/chat/runs/:runId/{execute,fail}`                                                                      | `internal-chat-runtime.controller.ts:21`                                                          | —                                                          | `RuntimeIdentityGuard`                                                   | Runtime callbacks                                                |
| POST                  | `/api/public-chat` · `/prewarm` · `/prewarm-agent` · `/identify`                                                     | `modules/public-agent/controllers/public-chat.controller.ts:24`                                   | —                                                          | `PublicAgentGuard, ThrottlerGuard`                                       | Public agent widget chat                                         |
| GET/POST/PATCH        | `/api/public-conversations/**` (4)                                                                                   | `public-conversations.controller.ts:18`                                                           | —                                                          | `PublicAgentGuard, ThrottlerGuard`                                       | Widget conversation CRUD                                         |
| GET                   | `/api/public-widget/config`                                                                                          | `public-widget.controller.ts:7`                                                                   | `getConfig`                                                | `PublicAgentGuard, ThrottlerGuard`                                       | Widget bootstrap                                                 |
| POST                  | `/api/public-brain/live-session`                                                                                     | `public-brain.controller.ts:25`                                                                   | `createLiveSession`                                        | `PublicAgentGuard, ThrottlerGuard`                                       | Public voice session                                             |
| POST                  | `/api/agents/{sync,instruction-audit,instruction-repair}`, `/api/agents/:agentKey/{sync,ensure-ready,register}`      | `modules/agent-sync/controllers/agent-sync.controller.ts:10`                                      | —                                                          | `InternalAuthGuard`                                                      | Agent definition sync                                            |
| POST                  | `/api/agents/runtime-skills/read`                                                                                    | `runtime-skills.controller.ts:23`                                                                 | `read`                                                     | `InternalAuthGuard`                                                      | Skill read-through                                               |
| POST                  | `/api/runtime/identity/{bind,reset}`                                                                                 | `runtime-identity.controller.ts:13`                                                               | —                                                          | `RuntimeIdentityGuard`                                                   | Machine↔user binding                                             |
| GET/POST/PATCH/DELETE | `/api/conversations/**` (8)                                                                                          | `modules/conversations/controllers/conversations.controller.ts:32`                                | —                                                          | `AuthGuard,…`                                                            | Conversation CRUD (**overlaps `apps/api`**)                      |
| —                     | `/api/browser-sessions/**` (7)                                                                                       | `modules/browser-sessions/controllers/…:32`                                                       | —                                                          | `AuthGuard,…`                                                            | Cookie/consent sync (**overlaps `apps/api`**)                    |
| POST                  | `/api/artifacts` · `/api/artifacts/stream`                                                                           | `modules/artifacts/controllers/artifacts.controller.ts:33`                                        | —                                                          | `InternalAuthGuard, ThrottlerGuard`                                      | Artifact action executor                                         |
| POST                  | `/api/artifacts/openclaw/{chat-completions,responses}`                                                               | `artifact-openclaw-proxy.controller.ts:29`                                                        | —                                                          | `InternalAuthGuard, ThrottlerGuard`                                      | Pass-through to OpenClaw                                         |
| PUT/GET               | `/api/sessions/transcript/:agentId/:sessionId` · `/api/sessions/store/:agentId`                                      | `modules/sessions/controllers/sessions-storage.controller.ts:17`                                  | —                                                          | `InternalAuthGuard`                                                      | Session persistence                                              |
| POST                  | `/api/task-agent/{invoke,cancel}`, `/api/agents/{post-call-draft,suggest-tasks,suggest-meeting-title}`               | `modules/task-agent/controllers/`                                                                 | —                                                          | `ChannelServiceGuard`                                                    | Headless task agents                                             |
| POST                  | `/api/channel-agent/{invoke,invoke-brainstorm}`                                                                      | `modules/channel-agent/controllers/…:6`                                                           | —                                                          | `ChannelServiceGuard`                                                    | Channel agents                                                   |
| POST                  | `/api/brain/live-session`                                                                                            | `modules/brain/controllers/brain-live.controller.ts:32`                                           | `createLiveSession`                                        | `AuthGuard,… + CreditsGuard`                                             | Voice session (the one `AGENT_SUBPATHS` entry)                   |
| POST                  | `/api/internal/brain-eval/{configure,probe}`                                                                         | `brain-eval-probe.controller.ts:17`                                                               | —                                                          | `AuthGuard, OrgContextGuard`                                             | Eval harness                                                     |
| POST                  | `/api/internal/brain/import-jobs/:jobId/execute`                                                                     | `modules/brain-import-runtime/controllers/…:8`                                                    | `executeJob`                                               | `RuntimeIdentityGuard`                                                   | Runtime-side import                                              |
| POST                  | `/api/apps/:projectId/agent-call`                                                                                    | `modules/project-runtime/controllers/project-agent-call.controller.ts:21`                         | `agentCall`                                                | **no guard on controller or method**                                     | App→agent bridge                                                 |
| POST                  | `/api/apps/:projectId/restart` · GET `/api/project-files/:projectId`                                                 | `project-apps-proxy.controller.ts`, `project-files.controller.ts`                                 | —                                                          | `AuthGuard,…`                                                            | App runtime control                                              |
| GET/POST              | `POST /` (root, prefix-excluded), `GET                                                                               | POST /api/{mcp,vibey-mcp}`, `GET /api/.well-known/oauth-protected-resource[/api/{mcp,vibey-mcp}]` | `modules/vibey-mcp/controllers/vibey-mcp.controller.ts:26` | —                                                                        | `VibeyMcpOAuthGuard, ThrottlerGuard` (metadata routes unguarded) | Vibey MCP server |
| POST                  | `/api/internal/admin-skill-builder/chat`                                                                             | `modules/admin-skill-builder/controllers/…:6`                                                     | `chat`                                                     | `InternalAuthGuard`                                                      | Admin skill authoring                                            |
| POST                  | `/api/internal/observability/openclaw-error`                                                                         | `modules/observability/internal-openclaw-observability.controller.ts:6`                           | —                                                          | `RuntimeIdentityGuard`                                                   | Error ingest                                                     |

### `apps/web` route handlers (non-proxy)

| Method | Endpoint                                        | File                                                 | Auth                                 | Purpose                                                                                                 |
| ------ | ----------------------------------------------- | ---------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| GET    | `/api/auth/session`                             | `app/api/auth/session/route.ts:12`                   | Supabase cookie session              | **Returns `access_token` + `refresh_token` in JSON** to same-origin callers (the ROAS Chrome extension) |
| GET    | `/api/feature-updates`                          | `app/api/feature-updates/route.ts:15`                | Supabase cookie → Bearer             | Wrapper over `apps/api` `/api/feature-updates`                                                          |
| GET    | `/api/chat/browser-media/:filename`             | `app/api/chat/browser-media/[filename]/route.ts:107` | Supabase cookie + own profile lookup | Serves agent browser media                                                                              |
| GET    | `/api/ig-thumbnail` · `/api/social-thumbnail`   | respective `route.ts`                                | none found                           | Server-side thumbnail fetch/proxy                                                                       |
| POST   | `/api/tsx-repair`                               | `app/api/tsx-repair/route.ts:44`                     | none found                           | Repairs artifact TSX (uses `@vibey/api-shared` contract)                                                |
| POST   | `/api/preview-docx` · `/api/spaces/export-docx` | respective `route.ts`                                | none found                           | DOCX render/export                                                                                      |
| POST   | `/api/freeze-debug`                             | `app/api/freeze-debug/route.ts:34`                   | none found                           | Dev diagnostic sink                                                                                     |

### `apps/funnels`, `apps/website`, `apps/docs`

| Method | Endpoint                                                       | File                                                       | Calls upstream                                                |
| ------ | -------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| POST   | `/api/form-submit`                                             | `apps/funnels/src/app/api/form-submit/route.ts:20`         | `POST {BACKEND_URL}/api/public/forms/:token/submit` (line 31) |
| POST   | `/api/lead`                                                    | `apps/funnels/src/app/api/lead/route.ts:50`                | `POST {BACKEND_URL}/api/leads/ingest` (line 87)               |
| POST   | `/api/form-upload`                                             | `apps/funnels/src/app/api/form-upload/route.ts:7`          | file upload path (upstream UNKNOWN)                           |
| GET    | `/api/blog`                                                    | `apps/funnels/src/app/api/blog/route.ts:21`                | blog listing                                                  |
| GET    | `/api/public/agent-library`                                    | `apps/website/src/app/api/public/agent-library/route.ts:4` | 7-line handler                                                |
| POST   | `/api/docs-ask` · `/api/docs-search`; GET `/api/raw/[...slug]` | `apps/docs/src/app/api/**`                                 | docs search/RAG (auth UNKNOWN)                                |

### `apps/openclaw` gateway (port 18789)

Not a framework app — `createGatewayHttpServer` (`src/gateway/server-http.ts:446`) builds a raw
`node:http`/`https` server whose `handleRequest` tries handlers in order (lines 474–620):
hooks → `/tools/invoke` → Slack HTTP → plugin routes → OpenResponses → OpenAI-compatible → canvas/A2UI
→ WebSocket upgrade (handled separately by `ws`).

| Method | Path                              | File                                                                        | Auth                                                            |
| ------ | --------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------- |
| POST   | `/tools/invoke`                   | `src/gateway/tools-invoke-http.ts:140`                                      | Bearer via `authorizeGatewayConnect` (line 160); non-POST → 405 |
| POST   | `/v1/chat/completions`            | `src/gateway/openai-http.ts:212`                                            | same, gated by `openAiChatCompletionsEnabled`                   |
| POST   | `/v1/responses`                   | `src/gateway/openresponses-http.ts:755`                                     | same, gated by `openResponsesEnabled`                           |
| GET    | `/v1/models`                      | `src/gateway/openai-http.ts`                                                | same                                                            |
| POST   | `/slack/events`                   | `src/slack/http/index.ts`                                                   | Slack-side verification (LIKELY)                                |
| \*     | `/api/channels/**`                | plugin-owned; gateway enforces bearer auth first (`server-http.ts:507-522`) | gateway token                                                   |
| \*     | `/hooks` (+ configured base path) | `src/gateway/hooks.ts`                                                      | hook-specific                                                   |
| GET    | `/media/:id`                      | `src/media/server.ts:35`                                                    | separate Express app, different port (UNKNOWN which)            |

`/tools/invoke` has a **deny-list of dangerous tools** (`src/security/dangerous-tools.ts:5`) and the
built-in audit flags re-enabling them as a finding (`src/security/audit.ts:283`). There is also a
large browser-automation Express surface under `src/browser/routes/*` (`/act`, `/navigate`,
`/screenshot`, `/snapshot`, `/cookies`, `/tabs`, `/storage/:kind`, …) — that is the internal browser
control server, **not** the gateway (CONFIRMED separate `app` instances).

### `workers/apps-proxy` (Cloudflare)

Route: `*.agents.roas.io/*` on zone `roas.io` (`wrangler.toml`). Two host branches in `fetch`
(`src/index.ts:155-171`):

- **Published apps** (`{slug}-app.roas.io`) → `handleAppRoute` → Vercel deployment if
  `vercelDeploymentUrl`, else `proxyToFly` which rewrites to
  `{flyMachineUrl}/api/apps/{projectId}{path}` with `fly-force-instance-id` (line 499).
  **Dormant** — the `wrangler.toml` comment states the catch-all DNS/route is not enabled.
- **Public agents** (`{userSlug}.agents.roas.io/a/{agentKey}/...`) → `handleAgentPageRoute` (line 196).
  `/_next/*` is proxied to `APPS_WEB_VERCEL_URL`; `…/api/*` is rewritten to
  **`{runtimeUrl}/api/public-{apiPath}`** (line 366) with a server-minted `x-public-agent-token`
  header (line 370) and CORS enforced against `widgetAllowedOrigins`. Everything else renders an
  HTML agent page.

Machine wake uses `POST {BACKEND_URL}/api/internal/machines/ensure-running` with `INTERNAL_API_TOKEN`
(lines 134-138). A `x-vibey-worker-secret: WORKER_SECRET` header is added on one upstream path (line 292).

## Public (Unauthenticated) Endpoints

`apps/api` has **no global `APP_GUARD`** — `providers: [CronService]` is the only entry in
`apps/api/src/app.module.ts:76`. So "public" comes in two flavours: an explicit `@Public()`
(which only matters where a class-level `AuthGuard` exists) **and** simply having no guard at all.
Total genuinely unguarded routes: **50 in `apps/api`, 7 in `apps/agent-api`** (CONFIRMED by
enumerating controllers whose class and methods carry no `@UseGuards`).

Truly anonymous (no secret, no token, no signature):

| Endpoint                                                                                                                                                                  | File                                                                             | Evidence                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `GET /api`                                                                                                                                                                | `apps/api/src/health.controller.ts:5`                                            | Whole file has no guard, no `@Public()`                                      |
| `POST /api/auth/{register,login,oauth,forgot-password}`                                                                                                                   | `modules/auth/controllers/auth.controller.ts:7`                                  | No guards; pre-authentication by design                                      |
| `POST /api/waitlist/join`, `GET /api/waitlist/count`, `POST /api/waitlist/fast-track-checkout`, `GET /api/waitlist/fast-track-status/:sessionId`                          | `modules/waitlist/controllers/waitlist.controller.ts:19`                         | No guards                                                                    |
| `GET /api/preview/pages/:pageId`                                                                                                                                          | `modules/funnels/controllers/preview.controller.ts:10`                           | No guards — funnel page preview                                              |
| `GET /api/integrations/composio/callback`                                                                                                                                 | `modules/integrations/controllers/integrations-composio-bridge.controller.ts:15` | OAuth bridge, no guard                                                       |
| `GET /api/slack/oauth/callback`                                                                                                                                           | `modules/slack/controllers/slack-oauth.controller.ts:5`                          | OAuth callback, no guard                                                     |
| `GET /api/.well-known/oauth-authorization-server`, `/openid-configuration`, `GET /api/mcp/oauth/authorize`, `POST /api/mcp/oauth/{register,deny,token,introspect,revoke}` | `modules/mcp/controllers/mcp-oauth.controller.ts:34-110`                         | Each carries `@Public()`; correct for RFC 8414 / dynamic client registration |
| `GET /api/health`, `/api/ready`, `/api/health/deep`, `/api/runtime/capabilities`, `GET /api`                                                                              | `apps/agent-api/src/health.controller.ts:15`                                     | No guards                                                                    |
| `GET /api/.well-known/oauth-protected-resource[…]`                                                                                                                        | `apps/agent-api/src/modules/vibey-mcp/controllers/vibey-mcp.controller.ts:30-40` | Metadata routes have no `@UseGuards` (siblings do)                           |

Token-in-URL public (anonymous but capability-scoped by an unguessable token):

| Endpoint                                                               | File                                                                                                                        | Notes                                                                                                                                                         |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------ |
| `GET /api/shared/{item,space}/:token`                                  | `space-public-sharing.controller.ts:22,32`                                                                                  | `@Public()`                                                                                                                                                   |
| `GET /api/org/invitations/:token`                                      | `org-invitations.controller.ts:149`                                                                                         | `@Public()`                                                                                                                                                   |
| `GET                                                                   | PATCH /api/work-requests/review/:token`, `GET                                                                               | POST …/chat`, `POST …/{finalize,refresh}`                                                                                                                     | `work-request.controller.ts:45-97` | 7 × `@Public()`; the proxy even redacts these paths from logs (`route.ts:472`) |
| `GET                                                                   | PATCH /api/meeting-follow-up-reviews/:token`, `POST :token/{delegation-preview,follow-ups/refresh,chat}`, `GET :token/chat` | `meeting-follow-up-review.controller.ts:61-97`                                                                                                                | 6 × `@Public()`                    |
| `GET /api/public/forms/:token`, `POST /api/public/forms/:token/submit` | `forms/controllers/public-forms.controller.ts:12`                                                                           | `ThrottlerGuard` only                                                                                                                                         |
| `POST /api/flow-webhooks/:publicToken`                                 | `space-webhook-receiver.controller.ts:24`                                                                                   | `ThrottlerGuard` + optional `x-vibey-signature`                                                                                                               |
| `POST /api/leads/ingest`                                               | `leads/controllers/leads.controller.ts:60`                                                                                  | Method-level `@UseGuards(ThrottlerGuard)` **overrides** the class's `AuthGuard` stack — this is the "public ingest endpoint" that `main.ts:68` opens CORS for |
| `ALL /api/sdk-proxy/:projectId[/*path]`                                | `projects/controllers/project-sdk-proxy.controller.ts:19`                                                                   | No guard, but rejects unless `verifyProjectSessionKey(projectId, sessionKey, VIBEY_SESSION_KEY)` passes (line 55)                                             |
| `POST /api/public-{chat,conversations,brain,widget}/**`                | `apps/agent-api/src/modules/public-agent/`                                                                                  | `PublicAgentGuard` reads `x-public-agent-token`, minted by the Cloudflare Worker                                                                              |

## Internal / Service-to-Service Endpoints

Three distinct shared-secret schemes coexist (CONFIRMED):

1. **`INTERNAL_API_TOKEN` via `Authorization: Bearer …`** — `InternalAuthGuard`
   (`apps/api/src/modules/funnels/guards/internal-auth.guard.ts`). Note the guard lives in the
   _funnels_ module but is imported across `internal`, `machines`, `admin/enterprise`, `leads`, etc.
   Covers 19 `@UseGuards` sites in `apps/api` and 6 in `apps/agent-api`, roughly 60+ routes under
   `/api/internal/**`, `/api/agents/**` (agent-api), `/api/artifacts*`, `/api/sessions/**`.
2. **`INTERNAL_API_TOKEN` + `x-user-id` inside `AuthGuard` itself** — a bypass that grants a
   **service-role** Supabase client for _any_ user id on _any_ authenticated route:

   ```69:79:packages/api-shared/src/guards/auth.guard.ts
       const internalToken = request.headers['x-internal-token'] as string | undefined
       const internalUserId = request.headers['x-user-id'] as string | undefined
       if (
         internalToken &&
         internalUserId &&
         process.env.INTERNAL_API_TOKEN &&
         internalToken === process.env.INTERNAL_API_TOKEN
       ) {
         request.user = { id: internalUserId }
         request.supabase = this.supabaseServiceClient.client
         return true
       }
   ```

3. **`CRON_SECRET`, verified inline in the handler** (not a guard) — see the cron table below.

Other service identities: `RuntimeIdentityGuard` (Fly machine → agent-api), `ChannelServiceGuard`
(Slack/Telegram workers → agent-api), `x-vibey-worker-secret` (Cloudflare Worker), and
`x-impersonate-user-id` (superadmin-only, verified against `user_profiles.role === 'superadmin'`
in `auth.guard.ts:161`, with minted GoTrue sessions).

## Webhooks

| Provider                          | Endpoint                                                                                                                                      | File                                                                                                                                      | Signature verification?                                                                                                                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Stripe                            | `POST /api/billing/webhook`                                                                                                                   | `modules/billing/controllers/billing-webhook.controller.ts:18`                                                                            | **Yes** — `stripe-signature` header required, raw body passed to `stripeService.handleWebhookEvent` (lines 22-33)                                                                                          |
| Slack (platform)                  | `POST /api/webhooks/slack/events`                                                                                                             | `modules/slack/controllers/slack-webhook.controller.ts:7`                                                                                 | **Yes** — `x-slack-signature` + `x-slack-request-timestamp` (lines 17-27)                                                                                                                                  |
| Meta / Facebook                   | `GET                                                                                                                                          | POST /api/integrations/meta/webhook`                                                                                                      | `modules/integrations/meta/controllers/meta-webhooks.controller.ts:26,40`                                                                                                                                  | **Yes** — GET does `hub.verify_token` challenge; POST requires `x-hub-signature-256`, 401 on missing/invalid (lines 43-58) |
| Meta                              | `POST /api/integrations/meta/data-deletion`                                                                                                   | same file                                                                                                                                 | **No** (GDPR deletion callback)                                                                                                                                                                            |
| SendGrid (email events + inbound) | `POST /api/email/webhooks/{events,inbound}`                                                                                                   | `modules/email/controllers/webhooks.controller.ts:6`                                                                                      | **Yes** — dynamic signature header + timestamp, `verifyWebhookSignature`, 401 on invalid (lines 17-34)                                                                                                     |
| Google Drive push                 | `POST /api/integrations/google-drive/push/webhook`                                                                                            | `modules/integrations/google-drive/sync/drive-push-webhook.controller.ts:4`                                                               | **Partial** — `x-goog-channel-token` checked as a shared secret; no cryptographic signature (Google's own model)                                                                                           |
| Telegram                          | `POST /api/webhooks/telegram/:agentKey`                                                                                                       | `modules/telegram/controllers/telegram.controller.ts:149`                                                                                 | **Yes (shared secret)** — `x-telegram-bot-api-secret-token` (line 158)                                                                                                                                     |
| Composio                          | `POST /api/integrations/composio/webhook`                                                                                                     | `modules/integrations/controllers/integrations-composio-bridge.controller.ts:36`                                                          | **Yes** — `webhook-id` + `webhook-signature` + `webhook-timestamp` (Svix scheme, lines 40-47)                                                                                                              |
| Fathom                            | `POST /api/integrations/fathom/webhook`                                                                                                       | `modules/integrations/fathom/controllers/fathom-webhooks.controller.ts:67`                                                                | **Yes** — `x-fathom-signature` or `x-webhook-signature` (lines 70-85)                                                                                                                                      |
| Cursor                            | `POST /api/integrations/cursor/webhook`                                                                                                       | `modules/integrations/cursor/controllers/cursor.controller.ts:122`                                                                        | **Yes** — `x-webhook-signature` (line 127)                                                                                                                                                                 |
| Page Grader (6 endpoints)         | `POST /api/integrations/page-grader/webhooks/{brain-package,slack-messages,work-status,meeting-agenda,qc-notification,qc-slack-interactions}` | `modules/integrations/page-grader/controllers/page-grader-webhooks.controller.ts:19-144`                                                  | **Yes** — `x-page-grader-signature` \|\| `x-webhook-signature`                                                                                                                                             |
| Page Grader (work requests)       | `POST /api/integrations/page-grader/webhooks/work-request-drafts[/refresh]`                                                                   | `modules/work-requests/controllers/work-request.controller.ts:101,112`                                                                    | **Yes** — `x-page-grader-signature`, `@Public()` + signature                                                                                                                                               |
| **Calendly**                      | `POST /api/integrations/calendly/webhooks`                                                                                                    | `modules/integrations/calendly/controllers/calendly-webhook.controller.ts:8`                                                              | **NO** — the entire controller is 46 lines, has no guard, reads no headers, and both branches only `logger.log` with `// Future:` TODOs. Anyone can POST it. Currently harmless because it writes nothing. |
| Space automations (inbound)       | `POST /api/flow-webhooks/:publicToken`                                                                                                        | `modules/spaces/controllers/space-webhook-receiver.controller.ts:24`                                                                      | **Optional** — `x-vibey-signature` passed to the service; unguessable token is the primary control                                                                                                         |
| Fanbasis / ActiveCampaign         | `…/webhook-subscriptions*`, `…/webhooks*`                                                                                                     | `fanbasis/controllers/fanbasis-webhook-subscriptions.controller.ts`, `activecampaign/controllers/activecampaign-operations.controller.ts` | N/A — these **manage** the provider's webhooks (guarded `AuthGuard` CRUD), they are not receivers                                                                                                          |
| Slack (OpenClaw gateway)          | `POST /slack/events` on :18789                                                                                                                | `apps/openclaw/src/slack/http/index.ts`                                                                                                   | LIKELY (vendored OpenClaw code, not audited line-by-line)                                                                                                                                                  |

Searched and **not found** as inbound receivers: Twilio, Resend, WhatsApp, Instagram (Instagram
arrives through the Meta webhook), Fireflies. Google's only receiver is the Drive push channel.

## Cron / Scheduled HTTP Endpoints

`apps/api/vercel.json` `crons` — 7 entries. Three hit Nest routes directly; four go through
`rewrites` to dedicated small functions that then re-enter the API over HTTP with `Bearer CRON_SECRET`.

| Schedule                            | Path                                                                              | Handler file                                                                                                  | What it does                                                                                                               |
| ----------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `*/5 * * * *`                       | `/api/machines/idle-check`                                                        | `modules/machines/controllers/machines.controller.ts:89,94`                                                   | Shuts down idle Fly machines. Auth: inline `process.env.CRON_SECRET` check (line 120), **not** the class guard             |
| `*/10 * * * *`                      | `/api/machines/pool-replenish`                                                    | same, lines 99,104                                                                                            | Tops up the warm machine pool; inline `CRON_SECRET` (line 128)                                                             |
| `0 2 * * *`                         | `/api/admin/billing-health/reconcile`                                             | `modules/admin/controllers/admin-infrastructure.controller.ts:7`                                              | Nightly billing reconciliation. Guarded by `AuthGuard, RoleGuard` — **see Risks**                                          |
| `1-4,6-9,…,56-59 * * * *` (~48×/hr) | `/cron/space-automations` → `/api/space-automation-cron`                          | `apps/api/api/space-automation-cron.ts` → `GET /api/internal/space-automations/process-due`                   | Fans out due space automations; both hops verify `CRON_SECRET` (`space-automation-scheduler-internal.controller.ts:20-26`) |
| `*/5 * * * *`                       | `/cron/billing-credit-alerts` → `/api/billing-credit-alert-cron`                  | `apps/api/api/billing-credit-alert-cron.ts` → `GET /api/internal/billing-credit-alerts/process-due`           | Low-credit alerts; `CRON_SECRET` verified (`billing-credit-alert-internal.controller.ts:15-18`)                            |
| `*/5 * * * *`                       | `/cron/work-requests` → `/api/work-request-cron`                                  | `apps/api/api/work-request-cron.ts` → `POST /api/internal/work-requests/process-reminders`                    | Service-request reminders; `@Public()` + inline `CRON_SECRET` (`work-request.controller.ts:122-128`)                       |
| `0 * * * *`                         | `/cron/meeting-action-reconciliation` → `/api/meeting-action-reconciliation-cron` | `apps/api/api/meeting-action-reconciliation-cron.ts` → `POST /api/internal/meeting-action-reconciliation/run` | Reconciles meeting action items; `CRON_SECRET` verified (`meeting-action-reconciliation.controller.ts:13-18`)              |

The four wrapper functions are near-identical (~35 lines each): verify `Bearer CRON_SECRET`, resolve
`PUBLIC_API_URL ?? https://$VERCEL_PROJECT_PRODUCTION_URL`, `fetch` the internal path, return
`{dispatched:true}` / 502. They exist purely to escape the 300s ceiling of a single long request.

In-process scheduling is conditional: `...(shouldEnableInProcessScheduling() ? [ScheduleModule.forRoot()] : [])`
(`apps/api/src/app.module.ts:85`), so `@Cron` decorators only fire outside serverless.

## Health & Diagnostics Endpoints

| Endpoint                                                              | File                                                               | Auth                   | Notes                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api`                                                            | `apps/api/src/health.controller.ts:5`                              | none                   | Static `{status:'ok', service:'vibey-api', version:'0.1.0', timestamp}`. Checks nothing — no DB, no Redis.                                                                                                                                               |
| `GET /api` (agent-api)                                                | `apps/agent-api/src/health.controller.ts:15`                       | none                   | Liveness                                                                                                                                                                                                                                                 |
| `GET /api/health`                                                     | same, line 222                                                     | none                   | Liveness                                                                                                                                                                                                                                                 |
| `GET /api/ready`                                                      | same, line 244                                                     | none                   | Readiness — gated on `gatewayReady` + `authReady`, probed at `onModuleInit` (lines 57-60) against `OPENCLAW_GATEWAY_URL` (15s) and Supabase (30s); throws `ServiceUnavailableException` when not ready. **This is what the proxy's machine-wake polls.** |
| `GET /api/health/deep`                                                | same                                                               | none                   | Deep dependency check                                                                                                                                                                                                                                    |
| `GET /api/runtime/capabilities`                                       | same                                                               | none                   | Advertises runtime mode (`pool`/`shared`/`user`) and boot profile                                                                                                                                                                                        |
| `GET /api/brain/health` (+ `/batch`)                                  | `modules/brain/controllers/memories-status.controller.ts:47`       | guarded                | Brain **data** freshness, not process health                                                                                                                                                                                                             |
| `POST /api/log/client-error`                                          | `modules/client-errors/controllers/client-errors.controller.ts:42` | `ThrottlerGuard`       | Browser error sink                                                                                                                                                                                                                                       |
| `GET /api/admin/{errors,traces,traces/:id,request-traces/:requestId}` | `modules/admin/controllers/admin-operations.controller.ts:6`       | `AuthGuard, RoleGuard` | Trace/error console fed by `RouteTraceReporter` (wired in both `main.ts` files)                                                                                                                                                                          |
| `POST /api/freeze-debug`                                              | `apps/web/src/app/api/freeze-debug/route.ts:34`                    | none                   | Frontend freeze diagnostics                                                                                                                                                                                                                              |
| `POST /api/internal/observability/openclaw-error`                     | `apps/agent-api/src/modules/observability/…:6`                     | `RuntimeIdentityGuard` | Runtime error ingest                                                                                                                                                                                                                                     |

There is **no `/api/health` on `apps/api`** — only the bare `GET /api` (CONFIRMED). Anything probing
`https://api.roas.io/api/health` gets a 404.

## Duplicate / Overlapping Endpoints

Looked for this deliberately. Real overlaps found:

1. **`GET /api/chat/browser-media/:filename` exists twice with independent implementations.**
   `apps/agent-api/src/modules/chat/controllers/browser-media.controller.ts:11` (NestJS, guarded)
   **and** `apps/web/src/app/api/chat/browser-media/[filename]/route.ts:107` (183 lines that
   re-implement Supabase profile lookup, retry/backoff, and Fly machine resolution — a near-copy of
   `resolveProfileWithRetry`/`resolveAgentInfo` from the proxy). Because Next.js matches the more
   specific file route before the catch-all, `/api/proxy/chat/browser-media/x` goes through the proxy
   while `/api/chat/browser-media/x` goes through the local copy. **Two code paths, one capability,
   duplicated retry logic.** CONFIRMED.

2. **`GET /api/feature-updates` is a pure pass-through wrapper.**
   `apps/web/src/app/api/feature-updates/route.ts:15` reads the Supabase cookie session and calls
   `GET {BACKEND_URL}/api/feature-updates` — which is exactly what `/api/proxy/feature-updates` would
   have done against `apps/api/src/modules/feature-updates/controllers/feature-updates.controller.ts:12`.
   The only added behaviour is a 5s timeout and swallowing failures into `{updates: []}`. CONFIRMED.

3. **`conversations` and `browser-sessions` exist in both NestJS apps.**
   `apps/api/src/modules/conversations/` (21 routes) vs `apps/agent-api/src/modules/conversations/controllers/conversations.controller.ts:32` (8 routes, same `/api/conversations` base and overlapping verbs: list/create/get-messages/delete/update). Likewise `apps/api/src/modules/browser-sessions/` (7) vs `apps/agent-api/src/modules/browser-sessions/` (7) — **identical path set and identical route count**. Since the proxy routes `conversations` and `browser-sessions` to the _platform_ tier (neither prefix is in `AGENT_PATHS`), the agent-api copies are reachable only from inside the machine or via the Cloudflare Worker. Which copy is authoritative is **UNKNOWN**. This is the highest-value thing to resolve.

4. **`ensure-running` exists three times** for the same operation:
   `POST /api/machines/ensure-running` (user-auth, `machines.controller.ts:70`),
   `POST /api/internal/machines/ensure-running` (`InternalAuthGuard`, `internal-machines.controller.ts:17`),
   and the proxy's self-call to `/api/proxy/machines/ensure-running` (`route.ts:218`). Plus the
   Cloudflare Worker calls the internal one (`workers/apps-proxy/src/index.ts:137`). Defensible
   (different callers, different auth) but four entry points to one action.

5. **Three cron endpoints are exposed as both GET and POST** with separate handlers —
   `idle-check`, `pool-replenish`, `reconcile` in `machines.controller.ts:89-110`. Six routes, three
   behaviours; the GET variants exist because Vercel crons issue GET.

6. **`InternalAuthGuard` is implemented twice** —
   `apps/api/src/modules/funnels/guards/internal-auth.guard.ts` and
   `apps/agent-api/src/modules/artifacts/guards/internal-auth.guard.ts` — rather than living in
   `packages/api-shared/src/guards/` next to `AuthGuard`, `OrgContextGuard`, `OrgRoleGuard`, `RoleGuard`.

## Legacy / Dead Endpoint Candidates

- **`apps/api/railway.json` and `apps/agent-api/railway.json`** — `CLAUDE.md`'s deploy map states
  these are "unused configs" and the topology in `.docs/deployment/backend-separation.md` is legacy.
  CONFIRMED the files exist; LIKELY dead.
- **Published-apps host branch in the Cloudflare Worker** — `matchAppSlug` /
  `handleAppRoute` / `proxyToVercel` / `proxyToFly` are fully implemented, but `wrangler.toml` says
  "Published apps (`{slug}-app.roas.io`) remain dormant until their catch-all DNS and route can be
  enabled". Live routes list only `*.agents.roas.io/*`. **~150 lines of unreachable worker code.**
- **`POST /api/integrations/calendly/webhooks`** — accepts, logs, and discards. Both handlers end in
  `// Future:` comments referencing a `calendly_bookings` table. Dead in effect.
- **`POST /api/apps/:projectId/agent-call`** (`apps/agent-api/.../project-agent-call.controller.ts:21`)
  — the only agent-api route with no guard on class or method and no inline secret check found.
  Either intentionally trusted-network-only or an oversight; **UNKNOWN**.
- **`POST /api/web/freeze-debug`** — a debug sink shipped in the product app; LIKELY leftover.
- **`ChatController` phantom** — the parser saw a `@Controller('chat')` at
  `apps/agent-api/src/modules/agent-sync/interceptors/sync-ready.interceptor.ts:24`. That is a
  doc-comment/test fixture inside an interceptor, not a real controller (CONFIRMED by file role);
  it contributes 0 routes.
- `apps/openrouter-model-scout` and `apps/chrome-extension` were not audited for HTTP surfaces;
  the extension is the consumer of `GET /api/auth/session`. **UNKNOWN**.

## Observations & Risks

1. **Auth is opt-in, not opt-out.** Neither Nest app registers an `APP_GUARD`. A new controller
   written without `@UseGuards` is publicly reachable and nothing fails loudly. 50 routes in
   `apps/api` are currently in that state; most are legitimate (OAuth callbacks, webhooks with
   signature checks, cron with inline `CRON_SECRET`), but the _default_ is the wrong way round.
   `@Public()` is doing double duty as documentation on 27 routes that already sit under a guard,
   which makes the genuinely-unguarded ones harder to spot.

2. **`GET /api/admin/billing-health/reconcile` is a cron target behind `AuthGuard, RoleGuard`.**
   `vercel.json` schedules `POST`-less `0 2 * * *` against it, and Vercel crons send a GET with
   `Authorization: Bearer $CRON_SECRET`. `AuthGuard` will try to verify that as a Supabase JWT and
   throw 401 (`auth.guard.ts:88`) — unless `CRON_SECRET === INTERNAL_API_TOKEN`, in which case the
   internal bypass at `auth.guard.ts:69` still needs an `x-user-id` header Vercel does not send.
   Also, `admin-infrastructure.controller.ts` declares `reconcileBillingHealth` as `@Post`, while the
   cron path is invoked as GET. **LIKELY a silently failing nightly cron.** Worth verifying against
   Vercel cron logs.

3. **The `AuthGuard` internal bypass is very powerful.** `x-internal-token` + `x-user-id` yields a
   **service-role** Supabase client impersonating any user on any guarded route
   (`packages/api-shared/src/guards/auth.guard.ts:69-79`), sidestepping RLS entirely. The proxy does
   not strip `x-internal-token` from inbound browser requests — it only forwards a fixed allow-list
   of headers (`route.ts:880-916`), so this is not directly exploitable _through the proxy_, but
   `api.roas.io` is publicly reachable and any `INTERNAL_API_TOKEN` leak is a full-tenant compromise.

4. **`GET /api/auth/session` hands raw Supabase `access_token` + `refresh_token` to any script
   running on the app origin** (`apps/web/src/app/api/auth/session/route.ts:37-41`). The comment
   argues it "exposes nothing that isn't already bound to the caller's cookie jar", but that is only
   true if the cookies are `httpOnly` — a refresh token in a JSON body is exfiltratable by any XSS,
   whereas an httpOnly cookie is not. Existence justified by the Chrome extension; the trade-off is
   real and undocumented outside that comment.

5. **`POST /api/chat` always returns HTTP 200.** The warm-up SSE stream is opened before the upstream
   is contacted (`route.ts:545-857`), so failures surface as in-band `{type:'error'}` events. Any
   monitoring or client code that treats non-2xx as the failure signal for chat is blind.

6. **Cross-tenant routing depends on one header.** `fly-force-instance-id` is what keeps a user's
   chat on their own machine; the code comment at `route.ts:245-265` states plainly that dropping the
   pin can route to "another user's machine → cross-tenant data leak". This safety property lives in
   a Next.js route handler, protected by a 60s in-memory cache keyed on the raw JWT, with no test
   named in the file. High-blast-radius, low-visibility.

7. **`integrations` at 506 routes / 87 controllers is ~31% of the whole platform API.**
   `activecampaign` alone is 110 routes — more than any other _module_ except `spaces`. This is the
   obvious candidate for extraction or for a generic provider-operations dispatcher.

8. **No API versioning at all.** 1,710 backend routes with no `/v1`, no header negotiation, and a
   browser client shipped from the same repo. Fine while everything deploys together; a hard problem
   the day the Chrome extension or a public agent widget lags a deploy.

9. **Three overlapping proxy implementations** (`apps/web` 1,307 lines, `apps/admin` 53 lines,
   `workers/apps-proxy` 824 lines) each reimplement machine resolution and retry. The `apps/web`
   proxy plus the `browser-media` route duplicate that logic a fourth time inside the same app.

10. **The `apps/api` health endpoint checks nothing.** `GET /api` returns a hardcoded
    `{status:'ok', version:'0.1.0'}` regardless of DB, Redis, or Supabase state. Contrast with
    `apps/agent-api`'s real `/api/ready`. Any uptime monitor pointed at the platform API is
    measuring only that Vercel booted a function.
