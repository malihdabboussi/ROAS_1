# Project Glossary

> This repository uses inconsistent terminology. The same concept often has two or three names, and a few names mean different things in different places. This file is the decoder ring.
>
> **Read the [Naming Collisions](#naming-collisions--the-important-ones) section first** — it covers the ambiguities that actually cause bugs.

---

## Product & Brand Names

| Term           | Meaning                                                                                    | Used in                                                                                       | Notes                                                               |
| -------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **ROAS**       | The **product** name users see. Stands for Return On Ad Spend.                             | UI, page titles (`\| ROAS`), domains (`app.roas.io`, `api.roas.io`), `scripts/roas/`          | 3,401 occurrences                                                   |
| **Vibey**      | The **internal/codebase** name. Root package is `vibey-v2`; every workspace is `@vibey/*`. | package names, class names, env vars (`VIBEY_*`), headers (`x-vibey-*`), DB prefixes (`vb_*`) | 10,404 occurrences — **the codebase is Vibey, the product is ROAS** |
| **NeuralSnap** | A third, mostly-vestigial brand                                                            | 37 occurrences                                                                                | LEGACY — safe to read as "an older name"                            |
| **1DSLABS**    | Appears only in the repository folder name `ROAS-X-1DSLABS`                                | —                                                                                             | No code references                                                  |
| **OpenClaw**   | The vendored third-party agent runtime                                                     | `apps/openclaw`, `OPENCLAW_*` env vars                                                        | Not first-party code                                                |
| **Clawdbot**   | OpenClaw's own former name                                                                 | 3 occurrences (e.g. `CLAWDBOT_SKIP_CHANNELS`)                                                 | Upstream legacy                                                     |

> **Practical rule:** if you see `vibey` you are in the code; if you see `roas` you are in the product, the infrastructure, or an ops script.

---

## Core Domain Concepts

| Term                   | Meaning                                                                                                                                                                  | Where it lives                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **Space**              | The primary container for work. Holds items, documents, a kanban board, a calendar, automations, research panels, and a chat. The most developed feature in the product. | `apps/web/src/features/spaces`, `apps/api/src/modules/spaces` (151 routes), tables `spaces`, `space_items`, `space_shares` |
| **Campaign**           | A marketing campaign. Overlaps heavily with Space.                                                                                                                       | `apps/api/src/modules/campaigns` (61 routes)                                                                               |
| **Project**            | A third container concept.                                                                                                                                               | `apps/api/src/modules/projects`, `apps/web/src/features/projects`                                                          |
| **Organization (Org)** | The tenant. Users belong to orgs via `org_members`.                                                                                                                      | `apps/api/src/modules/org` (42 routes), tables `organizations`, `org_members`                                              |
| **Agent**              | A configured AI persona with a key, skills, a brain, and tool permissions.                                                                                               | table `agent_definitions`, `apps/api/src/modules/agents` (55 routes)                                                       |
| **Agent Team**         | A group of agents that collaborate.                                                                                                                                      | `apps/api/src/modules/agent-teams` (21 routes)                                                                             |
| **Brain**              | The long-term memory and knowledge system. Content is embedded into pgvector (768 dimensions) and retrieved during agent runs.                                           | `apps/api/src/modules/brain` (82 routes), `apps/agent-api/src/modules/brain`, `mission-worker`'s `brain-ops.processor.ts`  |
| **Brain family**       | The scoping of a memory: **User Brain**, **Agent Brain**, **Company Brain**, **Customer Brain**, **Space/Campaign context**.                                             | `AGENTS.md` §8.1                                                                                                           |
| **Brain Ops**          | Background processing over the Brain — pattern analysis, timeline synthesis, "cortex formation".                                                                         | `apps/mission-worker/src/modules/brain-ops/`                                                                               |
| **Dream Ops**          | A second background Brain process.                                                                                                                                       | `apps/mission-worker`                                                                                                      |
| **Mission**            | A durable, multi-phase agent work item — the async counterpart to synchronous chat.                                                                                      | `apps/mission-worker`, `apps/api/src/modules/missions` (52 routes), tables `missions`, `mission_outbox`                    |
| **Playbook**           | A named strategy that determines how a mission executes (`meta-ads-launch`, `webinar-fulfillment`, `ig-organic-video-ad`, `static-ad-production`, `client-strategy`, …). | `mission-playbook.registry.ts`, ~10 playbooks                                                                              |
| **Artifact**           | A generated output — document, funnel, presentation, image, ad.                                                                                                          | `apps/api/src/modules/artifacts`, `apps/agent-api/src/modules/artifacts`, `apps/web/src/features/artifacts`                |
| **Studio**             | The frontend workspace where artifacts are created and previewed.                                                                                                        | `apps/web/src/features/studio`                                                                                             |
| **Funnel**             | A publishable marketing landing-page flow, generated as TSX.                                                                                                             | `apps/api/src/modules/funnels` (27 routes), `apps/funnels`                                                                 |
| **Flow**               | A visual automation/workflow canvas (`@xyflow/react`). **Not** the same as a Funnel.                                                                                     | `apps/web/src/features/flows`                                                                                              |
| **Skill**              | A capability definition attached to an agent. **Stored in the database**, not in files.                                                                                  | see `.agents/skills/claude-skills/SKILL.md`                                                                                |
| **Vault**              | AES-256-GCM encrypted storage for integration credentials.                                                                                                               | `apps/api/src/modules/vault`, table `vault_secrets`, `VAULT_ENCRYPTION_KEY`                                                |
| **Machine**            | A Fly.io VM. See the [Machine](#machine--two-different-things) collision below.                                                                                          | `apps/api/src/modules/machines`                                                                                            |
| **Runtime**            | The Fly.io box running `agent-api` + OpenClaw + browser sidecar.                                                                                                         | Fly app `roas-runtimes`                                                                                                    |
| **Gateway**            | The OpenClaw HTTP server on port 18789.                                                                                                                                  | `apps/openclaw`, `OPENCLAW_GATEWAY_TOKEN`                                                                                  |
| **Outbox**             | Postgres tables written transactionally, then dispatched to BullMQ via `pg_notify`.                                                                                      | `mission_outbox` and 2 others; 3 dispatchers in `mission-worker`                                                           |
| **Work Request**       | A request for a human or agent to do something.                                                                                                                          | `apps/api/src/modules/work-requests`                                                                                       |
| **Your Turn**          | A backend module for items awaiting the user.                                                                                                                            | `apps/api/src/modules/your-turn`                                                                                           |
| **Impersonation**      | Superadmin acting as another user.                                                                                                                                       | `apps/web/src/features/impersonation`                                                                                      |
| **Composio**           | A third-party **integration broker** — one vendor fronting many SaaS connections.                                                                                        | `apps/api/src/modules/composio`                                                                                            |
| **MCP**                | Model Context Protocol. This platform is both an MCP **server** (exposing tools, with its own OAuth server advertising 20 scopes) and an MCP **client**.                 | `apps/api/src/modules/mcp`, `apps/agent-api/src/modules/{mcp,vibey-mcp}`                                                   |
| **Canvas**             | An artifact surface. Distinct from the Flow canvas.                                                                                                                      | `apps/api/src/modules/canvas` (18 routes)                                                                                  |
| **Autopilot**          | Autonomous agent operation mode.                                                                                                                                         | `apps/web/src/features/autopilot`                                                                                          |
| **Waitlist mode**      | The flag that closes public signup (`NEXT_PUBLIC_WAITLIST_MODE`). Default is **closed**.                                                                                 | `apps/web/src/middleware.ts:95`                                                                                            |

---

## Naming Collisions — the important ones

These are the ones that will actually mislead you.

### `Space` vs `Campaign` vs `Project`

Three container concepts with overlapping purposes, three separate frontend features, and three separate backend modules. `spaces` is by far the most developed (151 routes vs 61 and ~11). See [`04-feature-inventory.md`](./04-feature-inventory.md) for the resolution. **Do not assume they are aliases** — they have separate tables and separate code paths.

### `profiles` vs `user_profiles` — CONFIRMED duplicate

Two distinct tables, both live, both queried **on the same request** by `apps/web/src/middleware.ts`:

- `profiles` — 103 `from('profiles')` references. Holds `onboarding_completed`, `account_mode`, machine columns.
- `user_profiles` — 26 references. Holds `role`.

There is no aliasing view. This is a genuine domain-model split and the highest-traffic example of duplication in the codebase.

### `Contact` vs `Lead`

`contacts` is the frontend feature; `leads` is a backend module with its own table (created twice — see below). Resolution in [`features/contacts-crm.md`](./features/contacts-crm.md).

### Four names for "a thing to do"

`all-tasks`, `my-work`, `mission-control`, `work-requests` (frontend) over `missions`, `your-turn`, `work-requests` (backend), plus a `tasks` table and a `missions` table with a `mission_task_bridge` migration joining them. Resolution in [`features/missions-and-tasks.md`](./features/missions-and-tasks.md).

### `team` vs `team-2`

Two frontend feature folders. `team-2` is presumably a rewrite; whether `team` is still wired is answered in [`04-feature-inventory.md`](./04-feature-inventory.md).

### `Machine` — two different things

1. **The shared runtime** — Fly app `roas-runtimes`, `AGENT_RUNTIME_MODE = "shared"`, `min_machines_running = 1`. This is where agent runs actually execute, and **all users share it**.
2. **Per-user machine pinning** — `MachinesService`, `MachinePoolService`, `machine_id` columns on `profiles`, and a "wake the machine" step in the proxy.

The code supports per-user machines, but production runs in **shared** mode where identity is namespaced logically (`user-<uuid>-<key>`) rather than by giving each user a VM. Reading the `machines` module in isolation will give you the wrong mental model.

### `Flow` vs `Funnel`

A **Flow** is an internal automation graph. A **Funnel** is a public marketing page. Similar words, unrelated systems.

### `Canvas` — two things

The artifact `canvas` module in `apps/api`, and the node-graph canvas in the Flows UI.

### `/api` prefix

Frontend code calls `/api/proxy/<x>`. NestJS controllers declare `<x>` **without** `/api`. The proxy inserts the literal `/api`. So `@Controller('billing')` with `@Get('status')` is reached as `/api/proxy/billing/status` from the browser. Searching the backend for the string the frontend uses will find nothing.

---

## Technical Terms

| Term                    | Meaning                                                                                                                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SSE**                 | Server-Sent Events — how agent chat streams. One held-open HTTP request with a 25 s heartbeat. Not websockets.                                                                                                                     |
| **BullMQ**              | Redis-backed job queue library. 10 queues across two workers.                                                                                                                                                                      |
| **pgvector**            | Postgres extension for embeddings. 768 dimensions throughout.                                                                                                                                                                      |
| **RLS**                 | Row Level Security. 1,684 policies exist, but **service-role clients bypass them** in 75 of 239 repositories, so RLS is not the primary boundary.                                                                                  |
| **GoTrue**              | Supabase's auth service. The identity provider.                                                                                                                                                                                    |
| **JWKS**                | The public-key set used to verify Supabase JWTs asymmetrically (`jose` + `createRemoteJWKSet`).                                                                                                                                    |
| **Service role**        | A Supabase key that bypasses RLS entirely.                                                                                                                                                                                         |
| **Turborepo / turbo**   | Build orchestration across the 20 workspaces.                                                                                                                                                                                      |
| **Architecture gate**   | `scripts/arch/check-loc.mjs`, run via `pnpm architecture:check` and a Husky pre-commit hook. Enforces per-file line limits and import restrictions against a baseline. **Currently failing with 25 violations.**                   |
| **Supervisord**         | Runs three programs on the single Fly runtime box: `agent-api`, `openclaw-gateway`, `browser-sidecar`.                                                                                                                             |
| **Shadow run**          | A queued chat execution used only to measure latency, behind `AGENT_RUNTIME_QUEUE_SHADOW` (default off). Part of an unfinished migration to queued agent execution.                                                                |
| **Circuit breaker**     | Per-`workflow_class` failure tracking that stops an agent retrying a broken tool through adjacent tools.                                                                                                                           |
| **Tool error contract** | The mandated structured error shape returned to agents: `error_code`, `error_class`, `effect_state`, `retry_policy`, `correction`, `agent_instruction`, `user_explanation`, `forbidden_user_framing`, `observability.fingerprint`. |

---

## Environment Variable Naming Conventions

| Prefix                        | Scope                                                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_*`               | **Shipped to the browser.** Never put a secret here.                                                                   |
| `VIBEY_*`                     | Internal platform config                                                                                               |
| `OPENCLAW_*`                  | Agent runtime gateway                                                                                                  |
| `AGENT_*` / `AGENT_RUNTIME_*` | Agent backend and runtime behaviour, including feature flags                                                           |
| `SUPABASE_*`                  | Database and auth                                                                                                      |
| `x-vibey-*` (headers)         | Distributed tracing — `request-id`, `trace-id`, `span-id`, `parent-span-id`, `run-id`, `conversation-id`, `message-id` |

---

## Database Naming Conventions

- Domain-scoped snake_case: `space_shares`, `funnel_blocks`, `agent_definitions`, `mission_outbox`.
- **No `project_` prefix** — explicitly forbidden by `AGENTS.md` §9.
- `vb_*` prefix appears on some older tables (`vb_agent_traces`, `vb_message_timeline_events`) — a Vibey-era convention.
- **No native Postgres enums anywhere.** All 0 `CREATE TYPE ... AS ENUM`. Every enum is a `CHECK` constraint, which means adding a value requires a migration that rewrites the constraint.

### Two migration numbering schemes

`supabase/migrations/` contains **both**:

- 60 legacy sequential files (`007_user_roles.sql`, `030_missions_mvp.sql`)
- 876 timestamped files (`20260214210819_user_roles.sql`)

**41 of the 60 legacy files have a timestamped twin with the same name suffix**, and the pairs are _not_ byte-identical. This is the residue of a renumbering where the originals were never removed. When you search migrations for a table's history you will find two chains — check both, and prefer the timestamped one as current. Detail in [`06-database-map.md`](./06-database-map.md).

---

## Deployment Vocabulary

| Term                | Meaning                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| **`roas-runtimes`** | The Fly.io app hosting `agent-api` + OpenClaw + browser sidecar                                               |
| **`roas-api`**      | The Vercel project for `apps/api` (`api.roas.io`)                                                             |
| **`roas-workers`**  | The Railway project hosting `queue-worker` and `mission-worker`                                               |
| **`roas-platform`** | A Railway **service** name that actually runs the **mission-worker** Dockerfile — misleading, per `CLAUDE.md` |
| **apps-proxy**      | The Cloudflare Worker fronting `*.agents.roas.io`                                                             |
| **`/ship`**         | An internal command that opens a PR. **It never deploys.**                                                    |

---

## Documentation Locations

| Path                                  | Contains                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| `AGENTS.md`                           | The operating protocol for AI agents — the single source of truth for repo rules |
| `CLAUDE.md`                           | Project overview and the deploy map                                              |
| `.docs/guidelines/`                   | Architecture, design, development, AI, and feature guidelines                    |
| `.agents/skills/*/SKILL.md`           | Repo-local agent skills                                                          |
| `documentation/features/`             | Per-feature documentation (pre-existing, may be stale)                           |
| `documentation/utilities/`            | Shared utility docs + registry                                                   |
| `.docs/logs/changelog<date>.md`       | Daily changelog, pruned after 14 days                                            |
| `.docs/plans/agent-follow-up-work.md` | Deferred work — **40,325 lines, ~2,944 entries**                                 |
| `.vibey/`                             | Map between this repo and the Vibey long-term memory system                      |
| `project-mapping/`                    | This folder                                                                      |
