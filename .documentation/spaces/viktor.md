# Viktor — Spaces Project Agent

Viktor is the AI agent that powers the **Spaces Projects** feature. When a user opens a project, Viktor is the one chatting with them in the left panel — he scaffolds apps, writes files, manages dependencies, and hot-reloads the live preview on the right.

---

## What Viktor Can Do Today

### Build apps from a prompt

The user describes what they want ("build me a feedback tracker") and Viktor creates the full Next.js project: page routes, components, styles, types, and a `package.json`. The dev server starts automatically once `package.json` lands on disk.

### Edit files in real time

Every file Viktor creates or updates is written to disk and immediately picked up by Next.js hot reload. The user sees changes in the preview iframe within seconds.

### Manage dependencies

Viktor can add npm packages by updating `package.json` or calling `update_project_deps`. When deps change, `pnpm install` runs and the dev server restarts.

### Read project logs

When something breaks, Viktor can pull stdout/stderr from the running dev server to diagnose build or runtime errors.

### Import from GitHub

Viktor can import an existing GitHub repository into a project, pulling the repo contents and setting up the dev environment.

---

## Viktor's Identity System

Viktor does **not** have a hardcoded personality in code. His identity is built at runtime from markdown files synced to his workspace directory:

| File          | Purpose                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `IDENTITY.md` | Who Viktor is — name, title, one-liner used in the system prompt opener |
| `ROLE.md`     | What his job is — responsibilities, boundaries, tone                    |
| `SOUL.md`     | Personality traits — how he communicates, what he cares about           |
| `TOOLS.md`    | How to use his available tools — guidance for the model                 |
| `USER.md`     | Context about the user/platform — Vibey-specific instructions           |

These files live in `${AGENTS_BASE_DIR}/viktor/` and are synced from the database by the agent-sync service on startup.

### Prompt Mode: `vibey`

Viktor uses `promptMode: "vibey"` (defined in `docker/openclaw.json`). This prompt mode assembles the system prompt in this order:

1. **Opener** — "You are Viktor, {title from IDENTITY.md} at Vibey."
2. **Identity block** — SOUL.md, ROLE.md, IDENTITY.md content
3. **Tools list** — available tool names (case-sensitive)
4. **Reference files** — TOOLS.md, USER.md, then other context files
5. **Skills** — injected skill content
6. **Vibey Context** — dynamic per-turn context (project info on first message)
7. **Workspace + Runtime** — working directory, reasoning level

### Tool Restrictions

Viktor's OpenClaw config **denies** all low-level file/shell tools:

```
write, edit, apply_patch, exec, grep, find, ls, process, browser,
canvas, nodes, cron, message, gateway, agents_list, sessions_list,
sessions_history, sessions_send, sessions_spawn, subagents, image, tts
```

This means Viktor cannot directly access the filesystem or run shell commands through OpenClaw. Instead, he works through **Vibey's artifact action system** — purpose-built tools that write to the project directory, sync to storage, and manage the dev server.

---

## Viktor's Tools (Artifact Actions)

These are the actions Viktor can call during a chat. They are registered in `ArtifactProjectsService`:

| Action                | What it does                                                                   |
| --------------------- | ------------------------------------------------------------------------------ |
| `create_project`      | Creates a new project row in DB, sets up the disk directory                    |
| `get_project`         | Fetches project metadata (name, status, deps, manifest)                        |
| `list_projects`       | Lists all projects for the current user                                        |
| `create_file`         | Writes a file to disk + queues Supabase Storage sync + updates manifest        |
| `update_file`         | Same as create_file (upsert behavior)                                          |
| `read_file`           | Reads file content from disk (falls back to Storage if runtime unavailable)    |
| `delete_file`         | Removes file from disk + queues Storage deletion + updates manifest            |
| `list_project_files`  | Lists all files in the project (excludes `node_modules`, `.next`, `.turbo`)    |
| `update_project_deps` | Merges new dependencies into `package.json`, triggers `pnpm install` + restart |
| `import_github_repo`  | Imports a GitHub repository into a new project                                 |
| `get_project_logs`    | Returns the last 5KB of stdout/stderr from the running dev server              |

### Auto-start behavior

When Viktor writes a `package.json` and there is no running process yet, the system automatically starts `pnpm install` followed by `next dev`. Every subsequent file write hot-reloads instantly.

---

## Skills

Viktor has 7 registered skills (from `docker/openclaw.json`):

| Skill                 | Purpose                                                                        |
| --------------------- | ------------------------------------------------------------------------------ |
| `frontend-design`     | UI/UX patterns, component structure, styling approaches                        |
| `github-workflow`     | Git operations, GitHub integration, repo management                            |
| `skill-creator`       | Creating new skills for other agents                                           |
| `vibey-api`           | Using the `@vibey/sdk` for real platform data (campaigns, integrations, brain) |
| `web-app-development` | Next.js App Router, React patterns, full-stack web development                 |
| `widget-builder`      | Building Vibey widgets (dashboards, data displays)                             |
| `widget-development`  | Widget implementation details and patterns                                     |

Skill content is loaded from the database and injected into Viktor's system prompt at runtime.

---

## First-Message Context

When the user sends their first message in a project chat, the frontend injects a **Project Context** block:

```
[Project Context]
project_id: {uuid}
project_name: {name}
This is a real Next.js application running on the user's VM.
Use create_file / update_file / read_file / list_project_files / update_project_deps / get_project_logs with this project_id.
Import @vibey/sdk for real data: team, integrations (YouTube, Instagram, Meta, etc.), campaigns, brain.
The app uses Next.js App Router. Entry point is app/page.tsx. Layout is app/layout.tsx.
Creating package.json auto-triggers npm install + dev server start. Every file write hot-reloads instantly.
Never use mock/fake data — the SDK connects to the user's real accounts and platform data.
```

This context is sent only once per conversation (tracked by `contextSentRef`).

---

## Agent Integration: `vibey.agent()`

The SDK now allows project apps to **call any team member agent** for AI tasks. Viktor knows to use this when the user asks for AI-powered features.

### How it works

```typescript
import { vibey } from '@vibey/sdk'

// Ask Rex to analyze code
const result = await vibey.agent('rex').ask('Analyze this code for performance issues', { code })
console.log(result.response) // Rex's analysis
console.log(result.agent_key) // "rex"
```

### The flow Viktor follows

1. User says "add AI code analysis to this app"
2. Viktor calls `list_team` to see available agents and their roles
3. Viktor picks the best agent for the task (e.g. Rex for code review)
4. Viktor writes a Next.js API route that calls `vibey.agent('rex').ask(...)`
5. Viktor writes a frontend component that sends data to that route and renders the result
6. The API route runs server-side — auth is automatic via `VIBEY_SESSION_KEY`

### How it connects to the backend

The SDK calls `POST /api/apps/{projectId}/agent-call` on the agent-api, which:

1. Validates the session key
2. Routes to OpenClaw's `/v1/responses` endpoint with `stream: false`
3. OpenClaw runs the request through the specified agent (with all their skills, brain, and personality)
4. Returns a single JSON response

This means the user's app is powered by **their actual team** — not a generic AI call.

---

## Special Treatment: Relaxed Response Filter

Viktor has `relaxedResponseFilter: true` in the chat service. Normal agents have their responses filtered for safety; Viktor's filter is relaxed to only block secrets and internal infrastructure references. This allows Viktor to output code freely without the filter stripping valid code patterns.

---

## Where Viktor Lives in the Codebase

| Layer          | Path                                                                         | What it does                                            |
| -------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------- |
| Config         | `docker/openclaw.json`                                                       | Agent registration: id, workspace, skills, denied tools |
| Prompt builder | `apps/openclaw/src/agents/system-prompt.ts`                                  | `vibey` prompt mode assembly                            |
| Chat hook      | `apps/web/src/features/projects/hooks/useProjectChat.ts`                     | Frontend chat with `agentKey: 'viktor'`                 |
| Chat UI        | `apps/web/src/features/projects/components/ProjectChatPane.tsx`              | Chat pane with Viktor branding                          |
| Tools          | `apps/agent-api/src/modules/artifacts/services/artifact-projects.service.ts` | All project artifact actions                            |
| Streaming      | `apps/agent-api/src/modules/chat/services/chat.service.ts`                   | `relaxedResponseFilter` for Viktor                      |
| Identity files | `${AGENTS_BASE_DIR}/viktor/` (runtime)                                       | SOUL.md, ROLE.md, IDENTITY.md, TOOLS.md, USER.md        |
