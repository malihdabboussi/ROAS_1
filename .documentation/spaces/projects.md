# Spaces Projects — Infrastructure Guide

Spaces Projects is the feature that lets users build and run real Next.js applications inside Vibey. The user chats with Viktor on the left, and a live preview of their app renders on the right. This document covers how the entire system works, from button click to running app.

---

## High-Level Architecture

```
User Browser
  ├── ProjectPage (React)
  │     ├── ProjectChatPane → Viktor agent (via OpenClaw)
  │     └── ProjectAppPreview → iframe → /api/proxy/apps/{projectId}/...
  │
  └── Next.js web app (/api/proxy/[...path])
        │
        ▼
  Agent API (NestJS on Fly.io)
  ├── ProjectAppsProxyController  → POST /api/apps/:id/restart
  ├── ProjectAppsProxyService     → GET/POST /api/apps/:id/* (proxy to dev server)
  └── ProjectProcessManagerService
        ├── pnpm install (--ignore-workspace)
        ├── node next dev -p {port}
        └── health check → status update in Supabase
```

---

## The Database: `project_repos`

Every project is a row in the `project_repos` table:

| Column             | Type        | Purpose                                                                                     |
| ------------------ | ----------- | ------------------------------------------------------------------------------------------- |
| `id`               | uuid        | Primary key                                                                                 |
| `user_id`          | uuid        | Owner (references `profiles`)                                                               |
| `workspace_id`     | uuid        | Optional workspace grouping                                                                 |
| `conversation_id`  | uuid        | Chat conversation linked to this project                                                    |
| `name`             | text        | Project display name                                                                        |
| `description`      | text        | Optional description                                                                        |
| `storage_path`     | text        | Supabase Storage path: `{userId}/{projectId}`                                               |
| `entry_point`      | text        | Default: `src/App.tsx`                                                                      |
| `dependencies`     | jsonb       | npm dependencies map                                                                        |
| `manifest`         | jsonb       | File list and metadata                                                                      |
| `source`           | text        | `'github'`, `'agent'`, or `'upload'`                                                        |
| `source_meta`      | jsonb       | GitHub repo info, branch, etc.                                                              |
| `status`           | text        | `'building'`, `'ready'`, `'error'`, `'running'`, `'stopped'`                                |
| `vm_port`          | int         | Port the dev server runs on (4001–4010)                                                     |
| `deploy_status`    | text        | `'pending'`, `'syncing'`, `'installing'`, `'starting'`, `'running'`, `'stopped'`, `'error'` |
| `deploy_error`     | text        | Last error message (e.g. "Health check timed out")                                          |
| `last_deployed_at` | timestamptz | Timestamp of last deploy/restart                                                            |
| `slug`             | text        | URL slug for published apps                                                                 |
| `is_published`     | bool        | Whether the app is publicly accessible                                                      |
| `published_url`    | text        | Full URL like `https://{slug}-app.govibey.com`                                              |

RLS policies ensure users can only see/edit their own projects. A storage bucket called `projects` holds all file content with folder-based access control.

---

## Backend: Agent API (NestJS)

The agent API runs on Fly.io and manages everything about the project runtime. It lives in `apps/agent-api/src/modules/project-runtime/`.

### ProjectProcessManagerService

The core service. Manages child processes for each project.

**Key details:**

- Projects live on disk at `${PROJECTS_BASE_DIR}/{projectId}/`
- Locally: `$PWD/.runtime/user-projects/{id}/`
- Production: `/app/user-projects/{id}/`
- Port range: **4001–4010** (max 10 concurrent projects)
- Memory limit: **384 MB** per Next.js process (`--max-old-space-size=384`)
- Health check: polls `http://127.0.0.1:{port}/` every 2s for up to 60s
- Buffers last 200 lines of stdout/stderr per project

**Start flow:**

1. Check if `package.json` exists → if not, mark as `stopped`
2. Check if `node_modules` exists → if not, run `pnpm install --ignore-workspace --prefer-offline`
3. Ensure default files exist (`app/page.tsx`, `next.config.js`, error collector)
4. Spawn `node node_modules/next/dist/bin/next dev -p {port}`
5. Health check → accept any HTTP response (even 5xx) as "server is up"
6. Update `project_repos` row with status and port

**Restart flow:**

1. Send SIGTERM to existing process
2. Wait up to 5s for exit, then SIGKILL if needed
3. Run full start flow again

**Important config files auto-generated:**

- `next.config.js` — sets `assetPrefix` to `/api/proxy/apps/{projectId}` so static assets route back through the proxy
- `app/api/__errors/route.ts` — client-side error collector endpoint
- `app/__error-collector.tsx` — captures `window.onerror` and `onunhandledrejection`

### ProjectAppsProxyController

Handles `POST /api/apps/:projectId/restart`:

- If a process exists in memory → `restartProject()` (stop + start)
- If no process exists → `startProject()` (fresh start)
- Updates `project_repos` with result (status, port, error)

### ProjectAppsProxyService

Raw Express middleware registered before NestJS routing. Handles all other `/api/apps/{projectId}/*` requests:

- Extracts project ID from the URL path
- Looks up the assigned port
- Proxies the request to `http://localhost:{port}/{subPath}`
- Streams the response body back to the caller
- Skips `POST .../restart` (lets the controller handle it)

### ProjectStorageSyncService

Keeps Supabase Storage in sync with the local disk:

- **Debounced** (2s) — batches rapid file writes
- **Retry** — up to 3 attempts per file operation
- Operations: `queueUpsert`, `queueDelete`, `queueManifestUpdate`
- Also has `downloadAllFiles` for boot recovery

### ProjectBootRecoveryService

Runs on agent-api startup (after 5s delay):

- Queries `project_repos` for rows where `deploy_status = 'running'` and `user_id` matches
- Downloads files from Supabase Storage using the manifest
- Writes them to disk
- Starts each project's dev server
- This is how projects survive Fly machine restarts

---

## Frontend: Web App (Next.js)

Lives in `apps/web/src/features/projects/`. The main components:

### ProjectPage

The top-level page component. Manages:

- Project data loading and polling (every 3s during transitional states)
- Restart handler → calls `restartProjectApp()` → polls for updated status
- Publish/unpublish handlers
- Split-pane layout: chat on left, preview on right (resizable divider)

### ProjectChatPane

Chat interface connected to Viktor via `useProjectChat` hook:

- Creates/restores a conversation scoped to `agentKey: 'viktor'`
- Stores conversation ID in localStorage: `vibey:project-chat:{projectId}:viktor`
- Injects project context on first message (project_id, name, tool instructions)
- Shows streaming responses with agent phase indicator

### ProjectAppPreview

The iframe that shows the running app:

- Source URL: `/api/proxy/apps/{projectId}/`
- Shows different states based on `deploy_status`:
  - **pending** — "Start chatting with Viktor to build your app"
  - **syncing/installing/starting** — loading spinner with status text
  - **running** — live iframe with refresh button
  - **error** — error message with retry button
  - **stopped** — "App is stopped" message

### ProjectPreviewToolbar

Top bar above the preview:

- Deploy status badge (color-coded)
- Restart button (play icon)
- Publish/unpublish button with dropdown (copy URL, open in new tab, unpublish)

### ProjectFilesPanel

File tree viewer and inline code editor:

- Lists all project files via `/api/projects/{id}/files`
- Syntax-highlighted code viewer (Monaco-style)
- Read-only — editing is done through Viktor

### RepoImportModal

Modal for importing a GitHub repository:

- Lists user's GitHub repos via `/api/integrations/github/repos`
- Imports selected repo into a new project

---

## Proxy Chain: Browser to Dev Server

When the user's browser loads the preview iframe:

```
Browser iframe
  → /api/proxy/apps/{projectId}/
  → Next.js API route (apps/web/src/app/api/proxy/[...path]/route.ts)
  → Agent API on Fly.io: /api/apps/{projectId}/
  → ProjectAppsProxyService middleware
  → http://localhost:{port}/ (Next.js dev server inside the container)
  → Response streamed back through the chain
```

The `assetPrefix` in `next.config.js` ensures that Next's `_next/static/*` requests also go through this proxy chain, not directly to the dev server port.

---

## Published Apps: Cloudflare Worker

When a project is published, it gets a slug and becomes accessible at `{slug}-app.govibey.com`.

The Cloudflare Worker (`workers/apps-proxy/`) handles this:

1. Extract slug from hostname: `feedback-tracker-app.govibey.com` → `feedback-tracker`
2. Look up `project_repos` row by slug (with KV cache, 60s TTL)
3. Look up the user's Fly machine URL and instance ID from `profiles`
4. Proxy the request to `{flyMachineUrl}/api/apps/{projectId}{path}` with `fly-force-instance-id` header
5. The request hits the same `ProjectAppsProxyService` on Fly → localhost dev server

---

## File Storage: Supabase

Project files are stored in two places:

| Location                                                               | Purpose                              | Persistence               |
| ---------------------------------------------------------------------- | ------------------------------------ | ------------------------- |
| **Disk** (`PROJECTS_BASE_DIR/{id}/`)                                   | Hot files for the running dev server | Lost on container restart |
| **Supabase Storage** (`projects` bucket, path `{userId}/{projectId}/`) | Durable backup                       | Permanent                 |

The `ProjectStorageSyncService` keeps them in sync:

- Every file write by Viktor → queued for Storage upload (2s debounce)
- On boot recovery → files downloaded from Storage to disk
- Manifest (`project_repos.manifest`) tracks the file list

---

## Project Lifecycle

### 1. Creation

- User describes an app to Viktor
- Viktor calls `create_project` → row in `project_repos`, directory on disk
- Viktor starts writing files (`create_file`)
- When `package.json` is written → auto-triggers `pnpm install` + `next dev`

### 2. Running

- Dev server listens on allocated port (4001–4010)
- Health check passes → `deploy_status` set to `running`
- Preview iframe loads via proxy chain
- Every file write hot-reloads the app

### 3. Restart

- User clicks Restart button
- `POST /api/apps/{id}/restart`
- Existing process killed → new process spawned
- DB updated with new status

### 4. Publishing

- User clicks Publish
- `POST /api/projects/{id}/publish` → generates slug, async pipeline sets `publish_status` then `is_published` when done
- **Source:** All paths in `project_repos.manifest.files` are downloaded from Supabase Storage (`projects` bucket under `storage_path`)
- **Deploy:** Files are uploaded to Vercel via the REST API; **`projectSettings`** uses `pnpm install`, `next build`, and Node **22.x** so Vercel performs the production build (not a pre-uploaded `.next` tarball)
- **Domains:** Generated hostname `{slug}{APPS_DOMAIN_SUFFIX}` (e.g. `{slug}-app.govibey.com`) is added to the Vercel project; optional custom domain from `domains` is added when linked
- App is served from Vercel; DNS for the generated subdomain is handled as before (e.g. Cloudflare Worker) where configured

### 5. Boot Recovery (after Fly restart)

- Agent-api starts up → `ProjectBootRecoveryService` queries for `running` projects
- Downloads files from Storage → writes to disk → starts dev servers
- Updates DB with new port assignments

---

## Agent Call API: Team-Powered AI in Project Apps

Project apps can call any agent on the user's team via `vibey.agent()` from the `@vibey/sdk`.

### Endpoint

```
POST /api/apps/:projectId/agent-call
Headers: x-vibey-session-key: {VIBEY_SESSION_KEY}
Body: { "agent_key": "rex", "message": "Analyze this code", "context": { ... } }
Response: { "success": true, "agent_key": "rex", "response": "...", "usage": { ... } }
```

### SDK Usage

```typescript
import { vibey } from '@vibey/sdk'

const result = await vibey.agent('rex').ask('Review this for bugs', { code: sourceCode })
```

### How it works internally

```
Project app (Next.js API route)
  → vibey.agent('rex').ask(message, context)
  → POST /api/apps/{projectId}/agent-call (on agent-api)
  → Validates VIBEY_SESSION_KEY
  → POST /v1/responses to OpenClaw gateway (stream: false)
      → OpenClaw runs Rex with his skills, brain, personality
  → Single JSON response back
  → App renders Rex's response in the UI
```

### Key details

- **Auth:** Automatic via `VIBEY_SESSION_KEY` env var (already set in child processes)
- **Non-streaming:** Uses `stream: false` for a single JSON response (not SSE)
- **Agent routing:** `model: "openclaw:{agentKey}"` + `X-OpenClaw-Agent-Id` header
- **Max output:** 16K tokens per call
- **Timeout:** 120 seconds

### Files

| File                                                                          | Purpose                    |
| ----------------------------------------------------------------------------- | -------------------------- |
| `apps/agent-api/src/modules/project-runtime/project-agent-call.controller.ts` | HTTP endpoint              |
| `apps/agent-api/src/modules/project-runtime/project-agent-call.service.ts`    | OpenClaw gateway call      |
| `packages/vibey-sdk/src/client.ts`                                            | `agentCall()` function     |
| `packages/vibey-sdk/src/index.ts`                                             | `vibey.agent()` public API |

---

## Key Environment Variables

| Variable                | Default              | Purpose                                    |
| ----------------------- | -------------------- | ------------------------------------------ |
| `PROJECTS_BASE_DIR`     | `/app/user-projects` | Root directory for all project files       |
| `USER_ID`               | —                    | Fly machine owner ID (for boot recovery)   |
| `SKIP_PROJECT_RECOVERY` | `false`              | Disable boot recovery                      |
| `VIBEY_SESSION_KEY`     | —                    | Auth key passed to child Next.js processes |

---

## Codebase Map

| Layer                   | Path                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Frontend**            | `apps/web/src/features/projects/`                                                       |
| **Agent API runtime**   | `apps/agent-api/src/modules/project-runtime/`                                           |
| **Agent tools**         | `apps/agent-api/src/modules/artifacts/services/artifact-projects.service.ts`            |
| **Agent call API**      | `apps/agent-api/src/modules/project-runtime/project-agent-call.{controller,service}.ts` |
| **Vibey SDK**           | `packages/vibey-sdk/`                                                                   |
| **Platform API**        | `apps/api/src/modules/projects/`                                                        |
| **Published app proxy** | `workers/apps-proxy/src/index.ts`                                                       |
| **DB migration**        | `supabase/migrations/20260314173000_create_project_repos_and_storage.sql`               |
| **Types**               | `apps/web/src/features/projects/types/index.ts`                                         |
