# Vibey User Apps Platform — Full Architecture Plan

## The Vision

User says "Build me a content dashboard." The agent builds a **real application** — not a mockup — that connects to the user's YouTube, Instagram, Meta accounts via Composio, pulls live data from their Vibey agents and campaigns, renders interactive charts, and runs persistently inside the Vibey UI. Later, users can attach a Supabase database for custom persistence.

The differentiator: Vibey has multi-agent teams + 22 Composio integrations + campaign intelligence. No other app builder gives the user's application access to all of that out of the box.

---

## Runtime Decision: Run on the Existing User VM

Each Vibey user already has a running Fly.io Machine (2 vCPU, 2GB RAM) with OpenClaw + agent-api + supervisord. The user's apps run **on this same VM** as additional managed processes — no new infrastructure.

**Why this beats a separate Machine per project:**

| Factor             | Separate Machine                          | Same VM                                |
| ------------------ | ----------------------------------------- | -------------------------------------- |
| Cold start         | ~2 seconds                                | Zero — already running                 |
| Extra cost         | $0.50-$4/mo per project                   | $0 — already paid for                  |
| Auth/proxy         | New sidecar + scoped tokens               | agent-api already has everything       |
| Vibey SDK          | Calls proxy on separate port              | Calls agent-api on localhost:3003      |
| New infrastructure | Docker image, Machines API, DNS wildcards | Zero — reuse existing sync pattern     |
| Deploy pipeline    | Build, push, create Machine, wait         | Sync files, npm install, start process |
| Time to build      | 2-3 weeks                                 | Days                                   |

**Why it works with 2 vCPU + 2GB RAM:**

- OpenClaw + agent-api use ~300-400MB idle, spike during active chat
- Each user app (Next.js): ~150-200MB
- That leaves room for 3-5 concurrent apps comfortably
- Can bump to 4 vCPU + 4GB if users need more — charge accordingly

**Resource safety:**

- Each app process gets a memory cap (`--max-old-space-size=384`) — if the app's memory grows past this, Node auto-restarts it instead of starving the agent system
- Supervisord auto-restarts crashed processes
- If the VM gets tight, the platform can stop idle project apps (haven't been accessed in 30min)

**Upgrade path:** If a specific user's app outgrows the shared VM, migrate just that project to a dedicated Fly Machine. The code stays the same — only the URL the iframe points to changes.

---

## Architecture Overview

```
User prompts agent
        │
        ▼
   Agent (OpenClaw) writes code via create_file/update_file
        │
        ▼
   ArtifactProjectsService writes files directly to VM filesystem (instant)
   └── Async: syncs to Supabase Storage for durability
        │
        ▼
   Next.js dev server detects file change → hot-reloads automatically
   (system auto-started the dev server on create_project — no agent deploy action)
        │
        ▼
   App runs on VM port 4001 (4002, 4003 for additional apps)
   ├── Calls agent-api on localhost:3003 for all platform data
   │   ├── Team, agents, campaigns, missions
   │   ├── Composio integrations (YouTube, Instagram, Meta, etc.)
   │   ├── Brain/knowledge, custom objects
   │   └── Auth handled transparently — agent-api already has the user's session
   └── Exposed to frontend via agent-api path-based proxy (Phase 1)
       or via *.apps.govibey.com subdomain (Phase 5)
        │
        ▼
   Rendered in Vibey UI via iframe
```

---

## Layer 1: Vibey SDK — The Bridge Between User Apps and the Platform

The agent writes Next.js code that imports `@vibey/sdk`. This lightweight package wraps fetch calls to agent-api on localhost.

### SDK Surface

```typescript
// @vibey/sdk — pre-installed on every VM, calls agent-api on localhost:3003

import { vibey } from '@vibey/sdk'

// Team & Agents
const team = await vibey.team.list()
const agent = await vibey.team.get('copywriter')
const missions = await vibey.missions.list()

// Campaigns
const campaigns = await vibey.campaigns.list()
const campaign = await vibey.campaigns.get(campaignId)
const offers = await vibey.offers.list()
const funnels = await vibey.funnels.list()

// Integrations (Composio — user's connected accounts)
const ytStats = await vibey.integrations.youtube.getAnalytics({
  startDate: '2026-01-01',
  endDate: '2026-03-15',
  metrics: ['views', 'subscribers', 'watchTime'],
})
const igProfile = await vibey.integrations.instagram.getProfile()
const metaAds = await vibey.integrations.meta.getAdsInsights({ adAccountId })
const repos = await vibey.integrations.github.listRepos()

// Brain / Knowledge
const memories = await vibey.brain.search('content strategy')
const knowledge = await vibey.brain.getStats()

// Custom Objects
const objects = await vibey.objects.list('lead')
const object = await vibey.objects.create('lead', { name: 'John', email: 'j@x.com' })

// Real-time (WebSocket to agent-api)
vibey.realtime.onAgentActivity((event) => {
  /* agent started a mission */
})
vibey.realtime.onCampaignUpdate((event) => {
  /* campaign metrics changed */
})
```

### SDK Implementation

```typescript
// @vibey/sdk/src/index.ts — the entire SDK is ~100 lines

const BASE = process.env.VIBEY_API_URL || 'http://localhost:3003'
const SESSION_KEY = process.env.VIBEY_SESSION_KEY || ''

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-session-key': SESSION_KEY,
      'x-openclaw-internal': 'true',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`Vibey API ${res.status}: ${await res.text()}`)
  return res.json()
}

export const vibey = {
  team: {
    list: () => call('POST', '/artifacts/stream', { action: 'list_team', data: {} }),
    get: (key: string) =>
      call('POST', '/artifacts/stream', { action: 'list_team', data: { agent_key: key } }),
  },
  campaigns: {
    list: () => call('POST', '/artifacts/stream', { action: 'list_offers', data: {} }),
    // ...maps to existing artifact actions
  },
  integrations: {
    youtube: {
      getAnalytics: (params: any) =>
        call('POST', '/artifacts/stream', {
          action: 'use_integration',
          data: { service: 'youtube', integration_action: 'get_analytics_report', ...params },
        }),
    },
    instagram: {
      getProfile: () =>
        call('POST', '/artifacts/stream', {
          action: 'use_integration',
          data: { service: 'instagram', integration_action: 'get_profile' },
        }),
    },
    // ...all 22 Composio integrations
  },
  brain: {
    search: (query: string) =>
      call('POST', '/artifacts/stream', {
        action: 'search_memory',
        data: { query },
      }),
    getStats: () =>
      call('POST', '/artifacts/stream', {
        action: 'get_brain_stats',
        data: {},
      }),
  },
  objects: {
    list: (type: string) =>
      call('POST', '/artifacts/stream', {
        action: 'list_objects',
        data: { type_key: type },
      }),
    create: (type: string, data: any) =>
      call('POST', '/artifacts/stream', {
        action: 'create_object',
        data: { type_key: type, ...data },
      }),
  },
}
```

**Key insight:** The SDK is thin. It maps to existing artifact actions that agent-api already supports. No new backend endpoints needed for the MVP. The agent-api already has `use_integration`, `list_team`, `search_memory`, etc. The SDK just wraps them in a developer-friendly API.

---

## Layer 2: Filesystem-First Architecture

The VM filesystem is the **live truth**. Supabase Storage is the **durable backup**. Not the other way around.

### Why filesystem-first?

The old model (agent → API → Supabase Storage → sync to filesystem) added network round-trips on every file write. The user had to wait for Storage upload before seeing anything. With filesystem-first:

- Agent writes a file → it's on disk in microseconds
- Next.js dev server detects the change → hot-reloads instantly
- User sees the update in the iframe immediately
- Meanwhile, the file gets synced to Supabase Storage in the background (for durability)

If the VM dies before sync completes, files are lost — but this is a ~seconds window, and the agent can recreate them. The DB is the insurance policy, not the hot path.

### Location on VM

```
/app/user-projects/
  {projectId}/
    package.json
    app/
      page.tsx
      layout.tsx
      components/
        YouTubeCard.tsx
        InstagramCard.tsx
    node_modules/       (created by npm install)
    .next/              (created by next dev)
```

### File Write Flow

```
1. Agent calls create_file / update_file (via vibey_backend tool)
   └── ArtifactProjectsService handler runs ON the VM:
       a. Validates path (relative only, no "..", within project dir)
       b. fs.writeFile('/app/user-projects/{projectId}/{path}', content)  ← INSTANT
       c. Next.js dev server detects change → hot-reloads
       d. User sees update in iframe immediately
       e. Async: upload to Supabase Storage for durability (fire-and-forget)
       f. Async: update manifest in project_repos table

2. If package.json changed (deps added):
   └── Handler detects dep change
   └── Runs npm install in background
   └── Next.js picks up new packages after install completes

3. NO deploy_project action needed
   └── The system handles everything automatically
   └── Agent just writes files — the rest is infrastructure
```

### Why NOT raw `write` tool?

The agent already has a `write` tool in OpenClaw (currently denied). We could enable it, but:

- It writes to ANY path on the VM — agent could corrupt agent-api, OpenClaw, or other projects
- OpenClaw's workspace restriction is per-agent, not per-project
- No built-in DB sync

Instead, `create_file` / `update_file` actions stay as the interface. They're routed through `ArtifactProjectsService` which:

- Validates the path is within `/app/user-projects/{projectId}/` (agent can't escape)
- Writes to disk first (instant)
- Syncs to DB async (durable)
- Same agent interface, zero security risk

### System-Triggered App Management (No Agent Deploy Action)

The agent does NOT control deployment. The system does. This eliminates hallucination risk — the agent can't claim "I deployed" when it didn't.

**Auto-start:** When the first `create_file` is called for a project, the system:

1. Creates `/app/user-projects/{projectId}/` if it doesn't exist
2. Assigns a port (4001-4010)
3. Starts Next.js dev server on that port
4. Updates project status to 'running'

**Auto-restart:** When `package.json` changes (new deps), the system:

1. Runs `npm install`
2. Restarts the Next.js dev server

**Auto-recovery:** On VM boot, `ProjectProcessManager` reads all projects with `status = 'running'`:

1. Downloads files from Supabase Storage (the durable backup)
2. Writes to filesystem
3. Runs `npm install`
4. Starts processes
   This is the same pattern as AgentSyncService — restore from DB on boot.

### Background Sync: Filesystem → DB

A `ProjectStorageSyncService` runs on the VM:

- After every `create_file` / `update_file`, queues an async Storage upload
- Debounces rapid writes (agent creating 5 files in a row → batch sync)
- Updates manifest in `project_repos` after each batch
- If sync fails, retries with exponential backoff
- On VM shutdown, flushes pending syncs before exit

### Process Management

Each project app runs as a supervisord program:

```ini
[program:project-{projectId}]
command=node --max-old-space-size=384 node_modules/.bin/next dev -p %(ENV_PROJECT_PORT)s
directory=/app/user-projects/{projectId}
autorestart=true
startretries=3
startsecs=5
stopwaitsecs=10
environment=
    PORT="%(ENV_PROJECT_PORT)s",
    VIBEY_API_URL="http://localhost:3003",
    VIBEY_SESSION_KEY="%(ENV_VIBEY_SESSION_KEY)s",
    VIBEY_PROJECT_ID="{projectId}",
    NODE_ENV="production"
```

### Port Allocation

| Service          | Port             |
| ---------------- | ---------------- |
| agent-api        | 3003             |
| OpenClaw gateway | 18789 (internal) |
| Project app 1    | 4001             |
| Project app 2    | 4002             |
| Project app 3    | 4003             |
| ... up to        | 4010             |

The `project_repos` table stores the assigned port. ProjectSyncService picks the next available port when starting a new project.

---

## Layer 3: Agent Actions (Updated)

The agent's job is to **write files**. The system handles everything else — starting the app, restarting on changes, syncing to DB, managing ports, health checks. This means we do NOT add `deploy_project`, `restart_project`, etc. as agent actions. The agent cannot hallucinate "I deployed" because deployment isn't its responsibility.

### Existing actions (now filesystem-first)

These already exist. The only change is the handler writes to disk first instead of going through Platform API → Storage.

| Action                | What changes                                                                        |
| --------------------- | ----------------------------------------------------------------------------------- |
| `create_file`         | Writes to `/app/user-projects/{projectId}/{path}` instantly, async syncs to Storage |
| `update_file`         | Same as create_file (both upsert)                                                   |
| `read_file`           | Reads from filesystem first, falls back to Storage                                  |
| `delete_file`         | Deletes from filesystem, async deletes from Storage                                 |
| `list_project_files`  | Reads filesystem directory listing (faster than DB manifest)                        |
| `update_project_deps` | Writes package.json to disk, triggers npm install automatically                     |
| `create_project`      | Creates directory + DB row, assigns port, starts dev server                         |
| `get_project`         | Unchanged — reads from DB                                                           |

### New read-only action for agent debugging

| Action             | Purpose                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `get_project_logs` | Read stdout/stderr from the running app process. Agent uses this when the app has errors. |

This is read-only — the agent reads logs to understand what went wrong, then fixes the code via `update_file`. The system auto-restarts.

### What the system handles automatically (no agent action)

| Trigger                                      | System response                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| First `create_file` for a project            | Create directory, assign port, start Next.js dev server                 |
| Any `create_file` / `update_file`            | Write to disk → Next.js hot-reloads → async sync to Storage             |
| `update_project_deps` or package.json change | Run `npm install`, restart dev server                                   |
| `delete_file`                                | Remove from disk → Next.js hot-reloads → async sync removal to Storage  |
| App crashes                                  | Supervisord auto-restarts (max 3 retries)                               |
| VM boots                                     | Restore all `status=running` projects from Storage → filesystem → start |
| App idle 30min+                              | Optionally stop process to free resources                               |

---

## Layer 4: Routing — Exposing User Apps

### Option A: Path-based routing (simplest)

agent-api already runs on port 3003. Add a catch-all route that proxies `/apps/{projectId}/*` to `localhost:{project_port}/*`.

```
https://user-machine.fly.dev/api/apps/{projectId}/dashboard
  └── agent-api receives request
  └── Looks up projectId → port 4001
  └── Proxies to http://localhost:4001/dashboard
  └── Returns response
```

The frontend iframe src becomes:

```
{userMachineUrl}/api/apps/{projectId}
```

This works today with zero DNS changes. agent-api is already exposed on the user's Machine.

### Option B: Subdomain routing (Phase 5)

Set up `*.apps.govibey.com` wildcard DNS on Cloudflare (same playbook as vibeyfunnels.com). Each project gets `{slug}.apps.govibey.com`. Uses the existing `domains` table + Cloudflare integration. See Phase 5 for full details.

---

## Layer 5: Agent Skill — project-builder (Updated)

The agent needs to know it builds real apps with real data access. Key changes:

1. **Framework:** Next.js (not plain React). Agent builds `app/page.tsx`, `app/layout.tsx`, API routes if needed.
2. **SDK:** Agent imports `@vibey/sdk` for all platform data. No mock data ever.
3. **No deploy action:** The system auto-starts the app on `create_project` and hot-reloads on every file write. The agent just writes files.
4. **Error handling:** If the app has errors, agent reads `get_project_logs` and fixes the code via `update_file`. The system auto-restarts.
5. **Integrations:** Agent checks which integrations the user has connected, uses only those.

### Example Agent Flow

```
User: "Build me a content dashboard that shows my YouTube and Instagram stats"

Agent:
1. create_project({ name: "Content Dashboard" })

2. update_project_deps({ dependencies: {
     "next": "^15", "@vibey/sdk": "latest",
     "recharts": "^2.15", "lucide-react": "^0.470"
   }})

3. create_file({ path: "package.json", content: `{
     "name": "content-dashboard",
     "scripts": { "dev": "next dev", "start": "next start", "build": "next build" },
     "dependencies": { "next": "^15", "react": "^19", "@vibey/sdk": "latest", "recharts": "^2.15" }
   }` })

4. create_file({ path: "app/layout.tsx", content: `
     export default function Layout({ children }) {
       return <html><body>{children}</body></html>
     }
   ` })

5. create_file({ path: "app/page.tsx", content: `
     import { vibey } from '@vibey/sdk'

     export default async function Dashboard() {
       const ytStats = await vibey.integrations.youtube.getAnalytics({
         startDate: '2026-01-01', endDate: '2026-03-15'
       })
       const igProfile = await vibey.integrations.instagram.getProfile()
       const team = await vibey.team.list()

       return (
         <div className="p-6">
           <h1>Content Dashboard</h1>
           <YouTubeSection stats={ytStats} />
           <InstagramSection profile={igProfile} />
           <TeamSection agents={team} />
         </div>
       )
     }
   ` })

6. create_file({ path: "app/components/YouTubeSection.tsx", ... })
7. create_file({ path: "app/components/InstagramSection.tsx", ... })
8. create_file({ path: "app/components/TeamSection.tsx", ... })

   // System auto-started the app after step 1 (create_project).
   // Each create_file writes to disk → Next.js hot-reloads → user sees changes live.
   // No deploy action needed. The preview iframe updates automatically.

9. "Your dashboard is live! It's pulling real data from your
     YouTube and Instagram accounts. Here's what I built: ..."
```

---

## Layer 6: Frontend Changes

### Project Page — iframe to live app

The project page keeps the same layout but the preview points to the running app on the VM instead of Sandpack.

```
┌──────────────────────────────────────────────────────┐
│ CONTENT DASHBOARD                          [Settings]  │
├──────────────────┬───────────────────────────────────┤
│                  │                                     │
│   Chat with      │   iframe src=                       │
│   Viktor         │   "{machineUrl}/api/apps/{id}"     │
│                  │                                     │
│   > Build me a   │   ┌────────────────────────────┐   │
│     content      │   │  YouTube Analytics          │   │
│     dashboard    │   │  ▓▓▓▓▓░░  12.4K real views │   │
│                  │   │                            │   │
│                  │   │  Instagram                  │   │
│                  │   │  ▓▓▓▓▓▓▓  8.2K real follows│   │
│                  │   │                            │   │
│                  │   │  Team: Vibey, Viktor...     │   │
│                  │   │  (live agent status)        │   │
│                  │   └────────────────────────────┘   │
│                  │                                     │
├──────────────────┴───────────────────────────────────┤
│ [Edit Code]  [Preview]  [Files]  [Logs]  [Settings]   │
└──────────────────────────────────────────────────────┘
```

### Deploy States in UI

| State        | What user sees                                          |
| ------------ | ------------------------------------------------------- |
| `created`    | "Chat with Viktor to start building" (empty state)      |
| `building`   | Agent writing files — file creation timeline            |
| `installing` | "Installing dependencies..." spinner + live logs        |
| `running`    | iframe showing the live app                             |
| `stopped`    | "App is stopped. Click to restart."                     |
| `error`      | Error message + build logs + "Ask Viktor to fix" button |

### Keep Sandpack for Edit Mode

Sandpack stays as the **code editor** (file explorer + code editing). When user edits code and saves, it writes to the VM filesystem (via `update_file` action) → Next.js hot-reloads → async syncs to Storage. The **preview** is always the live app from the VM — never Sandpack's bundler.

---

## Layer 7: Security

### Auth Flow

- The user's app calls agent-api on `localhost:3003`
- agent-api already has the user's session context (USER_ID, Supabase client, Composio tokens)
- No auth tokens appear in app source code — the SDK just calls localhost
- The session key is injected as an env var when the process starts, never in the code

### Process Isolation

- Each project app runs as a separate OS process with:
  - Memory cap: `--max-old-space-size=384` (Node auto-restarts if exceeded)
  - Separate working directory: `/app/user-projects/{projectId}/`
  - Separate port
  - Supervisord auto-restarts on crash (max 3 retries)
- Cannot access other projects' directories (enforced by app working directory)
- Cannot access agent-api's internal state (separate process, only HTTP)

### Network

- Apps can make outbound HTTP requests (needed for external APIs)
- Inbound: only through Fly's edge proxy on the assigned port
- Cannot listen on agent-api's port (3003) or OpenClaw's port (18789)

---

## Layer 8: @vibey/sdk Package

### Package Structure

```
packages/vibey-sdk/
  package.json        { "name": "@vibey/sdk", "main": "dist/index.js" }
  src/
    index.ts          Main export
    client.ts         HTTP client (fetch wrapper)
    team.ts           vibey.team.* methods
    campaigns.ts      vibey.campaigns.* methods
    integrations.ts   vibey.integrations.* methods (all 22 Composio)
    brain.ts          vibey.brain.* methods
    objects.ts        vibey.objects.* methods
    realtime.ts       vibey.realtime.* (WebSocket)
    types.ts          TypeScript types for all responses
```

### Publishing

Option A: npm publish `@vibey/sdk` to npm registry — user apps install it normally.
Option B: Pre-install on VM filesystem as a local package — `npm link` or workspace reference.

Option B is simpler for now. The SDK lives on the VM at `/app/packages/vibey-sdk/`. Each project's `package.json` references it:

```json
{
  "dependencies": {
    "@vibey/sdk": "file:/app/packages/vibey-sdk"
  }
}
```

No npm publish needed. Agent writes the dependency, npm install resolves it from the local path.

---

## DB Changes

```sql
ALTER TABLE project_repos ADD COLUMN vm_port INTEGER;
ALTER TABLE project_repos ADD COLUMN vm_pid INTEGER;
ALTER TABLE project_repos ADD COLUMN deploy_status TEXT DEFAULT 'pending'
  CHECK (deploy_status IN ('pending', 'syncing', 'installing', 'starting', 'running', 'stopped', 'error'));
ALTER TABLE project_repos ADD COLUMN deploy_error TEXT;
ALTER TABLE project_repos ADD COLUMN last_deployed_at TIMESTAMPTZ;
ALTER TABLE project_repos ADD COLUMN active_app BOOLEAN DEFAULT false;
```

---

## Implementation Order

### Phase 1: Foundation (3-4 days)

1. **Filesystem-first create_file/update_file** — Change ArtifactProjectsService handlers to write to `/app/user-projects/{projectId}/` directly, async sync to Storage
2. **ProjectProcessManager** — Start/stop/restart Next.js dev servers per project, port allocation (4001-4010), memory caps, supervisord integration
3. **ProjectStorageSyncService** — Background sync: filesystem → Supabase Storage (debounced, batched, retry on failure)
4. **@vibey/sdk package** — Thin wrapper over agent-api artifact actions on localhost:3003
5. **DB migration** — Add vm_port, deploy_status, deploy_error, last_deployed_at, active_app columns
6. **Path-based proxy** — agent-api route that proxies `/api/apps/{id}/*` → `localhost:{port}/*`
7. **Boot recovery** — On VM start, restore all `status=running` projects from Storage → filesystem → start

### Phase 2: Agent Integration (2-3 days)

8. **get_project_logs action** — Read-only access to app stdout/stderr for agent debugging
9. **Plugin enum** — Add get_project_logs to vibey-backend SUPPORTED_ACTIONS
10. **Capability policy** — Allow get_project_logs for vibey + developer agents
11. **Action docs** — Document filesystem-first behavior + get_project_logs in vibey-api-action-docs
12. **Skill rewrite** — project-builder for Next.js + @vibey/sdk + no deploy step (system handles it)

### Phase 3: Frontend (2-3 days)

13. **Project page** — iframe pointing to live app URL instead of Sandpack
14. **App states UI** — starting, running, installing, error states (driven by project status, not agent)
15. **Build logs panel** — Stream stdout/stderr from project process
16. **Edit mode** — Keep Sandpack editor for code browsing/editing, save writes to filesystem + triggers hot-reload

### Phase 4: Polish + Depth (1 week)

17. **SDK: full Composio surface** — All 22 integrations with typed responses
18. **SDK: real-time** — WebSocket for live agent/campaign events
19. **Error recovery** — Agent reads get_project_logs, fixes code via update_file, system auto-restarts
20. **Multiple active projects** — Process lifecycle for 3-5 concurrent apps, idle timeout for resource management
21. **npm install optimization** — Cache node_modules across projects that share deps, use --prefer-offline

### Phase 5: Custom App Domains (1-2 days)

Same playbook as vibeyfunnels.com — Cloudflare wildcard DNS + domain resolution, but pointing to the user's Fly Machine instead of Vercel.

22. **Wildcard DNS** — Set up `*.apps.govibey.com` on Cloudflare pointing to Fly's edge proxy
23. **Domain resolution** — Add `project_id` column to `domains` table. When a request hits `{slug}.apps.govibey.com`, resolve the domain → user_id + project_id → route to that user's Fly Machine → proxy to the project's port
24. **Auto-assign subdomain** — When a project is created, generate a slug (e.g. `content-dashboard`) and insert into `domains` table with `status: 'verified'` (no DNS verification needed — it's a subdomain we control)
25. **Custom domains** — Reuse the existing custom domain flow from funnels. User adds `dashboard.theircompany.com`, Cloudflare DNS verification, CNAME to `apps.govibey.com`, SSL provisioned automatically
26. **Fly proxy config** — Configure Fly to route `*.apps.govibey.com` traffic to the correct Machine based on the domain lookup. Use Fly's `fly-replay` header or a lightweight router app.

Result: each project gets a clean public URL like `content-dashboard.apps.govibey.com` or the user's own domain. Shareable, bookmarkable, embeddable.

### Phase 6: Database (future)

27. **Per-project Supabase** — Spin up a Supabase project for user's app storage
28. **SDK: database** — vibey.db.query(), vibey.db.from('table').select() etc.
29. **Migrations** — Agent creates/modifies database schema via SDK

### Phase 7: Portable Apps + Public API (future)

Today, apps built on Vibey only run on Vibey — the `@vibey/sdk` calls `localhost:3003` (agent-api on the VM). If a user exports to GitHub and tries to run it elsewhere, the SDK calls fail. This is the Shopify model: your apps live in the ecosystem.

Phase 7 adds **Option B: Portable Apps** — users can export a fully standalone app that runs anywhere.

**What's needed:**

30. **Public Vibey API** — A hosted API at `api.govibey.com/v1/` that exposes the same surface as the SDK:
    - `GET /v1/team` — list agents
    - `GET /v1/campaigns` — list campaigns
    - `GET /v1/integrations/youtube/analytics` — YouTube stats
    - `POST /v1/objects` — CRUD custom objects
    - etc. — mirrors every `vibey.*` SDK method

31. **API Key Auth** — Users generate API keys from Vibey settings. Each key is scoped to the user's data (same RLS as today). Keys are long-lived, rotatable, revocable.

32. **SDK: dual mode** — `@vibey/sdk` detects its environment:
    - If `VIBEY_API_URL=http://localhost:3003` → calls agent-api directly (on-platform mode, zero latency)
    - If `VIBEY_API_KEY=vbk_abc123` → calls `api.govibey.com/v1/` with the API key (portable mode, works anywhere)
    - Same code, same API surface. User changes one env var.

    ```typescript
    // On Vibey VM (auto-detected):
    // VIBEY_API_URL=http://localhost:3003
    const team = await vibey.team.list() // → localhost:3003

    // Exported, running on user's own server:
    // VIBEY_API_KEY=vbk_abc123
    const team = await vibey.team.list() // → api.govibey.com/v1/team
    ```

33. **GitHub export with env setup** — When user clicks "Export to GitHub":
    - Push code to their repo (existing GitHub import can be reversed)
    - Generate a `.env.example` with `VIBEY_API_KEY=your_key_here`
    - Include a `README.md` with setup instructions
    - The app works standalone — runs on Vercel, Railway, their own server, anywhere
    - Still calls Vibey's API for data — like how Stripe apps work anywhere but need Stripe

34. **Usage-based API billing** — API calls from external apps count against the user's plan. This turns Vibey into a platform with an API economy — users build apps that stay connected to Vibey's data layer, even outside the UI.

**Why this matters for the business:**

- Lock-in without hostage-taking — users own their code, can run it anywhere, but still need Vibey for the data
- API revenue stream — external API calls are billable
- Developer ecosystem — third-party devs can build on Vibey's API
- Trust signal — "you can leave anytime" makes users more willing to commit

---

## What This Enables

User says: "Build me a content dashboard"

They get:

- Real YouTube analytics from their connected account
- Real Instagram metrics from their connected account
- Real agent roster with live status (who's working on what)
- Real mission timeline (active tasks across the team)
- Real campaign performance data
- Interactive charts with Recharts
- Runs on their existing VM — zero extra cost
- Accessible via URL inside Vibey UI
- Agent iterates on it in real-time via chat

No mockups. No fake data. No sandbox limitations. The real deal from the first prompt.
