# Multi-Agent Organization — Mission Control

## Summary

We are building a **multi-agent organization system** inside Vibey's Manage tab that lets users run their business on autopilot through AI agents.

**What it is:** A mission control where users interact with a team of AI agents — each with a defined role (CEO, COO, CTO, etc.), responsibilities, skills, and their own brain (NeuralSnap). Users talk to the CEO agent, assign tasks, and the CEO knows how to delegate them to the right agents automatically. Tasks execute on autopilot via cron-triggered runs.

**Architecture (two planes):**

- **Control Plane — BullMQ Queue Worker:** Owns the job lifecycle. Enqueues missions, tracks state (`queued → dispatching → running → success | failed | dead_letter`), handles retries with exponential backoff, enforces timeouts, manages dead-letter review, and ensures idempotency. This is the reliability layer — it guarantees tasks don't get lost, stuck, or duplicated.

- **Execution Plane — OpenClaw (same Docker image):** Where agents actually think and act. Each agent is registered in `openclaw.json` with its own workspace, skills, and tool permissions. The queue worker triggers agent sessions via the OpenClaw gateway API (`POST /v1/chat/completions`), and agents execute autonomously — reading context, using tools, calling internal APIs, and reporting progress back.

**What we're porting from Nexus (reference):**

- Inbox UI — quick capture, assign to agents, priority, categories
- Quest/task system — status pipeline, progress tracking, PRDs
- Agent roles — responsibilities, skills, authority levels, escalation rules
- Health monitoring — agent status, active/idle, last seen
- NeuralSnap Brain — per-agent knowledge and memory

**What's new (not in Nexus):**

- Reliable execution via BullMQ (Nexus uses unreliable cron-only heartbeats)
- Multi-tenant isolation (Nexus is single-tenant for one org)
- End-to-end correlation IDs across queue → gateway → agent → DB
- Dead-letter operations UI for failed missions
- SLO guardrails (max runtime, token caps, parallel job limits per user)
- Compensation/rollback for partial multi-step failures

**Where it lives:**

| Layer | Location | Runtime |
|-------|----------|---------|
| Frontend | `apps/web` — Manage tab (new pages under `(dashboard)/`) | Vercel |
| API | `apps/api` — new `missions` + `org-agents` NestJS modules | Vercel |
| Queue | `apps/queue-worker` — new `MissionsModule` with BullMQ | Self-hosted |
| Agents | `docker/` — OpenClaw gateway + registered agents | Fly.io VM |
| DB | Supabase — new tables for missions, org agents, agent roles | Supabase |

---

## MVP — Prove the Chain

**Goal:** Validate the full delegation chain works reliably: User → Manager → Worker → Result. Smallest possible surface that proves the architecture.

### 3 Agents Only

| Agent | Role | What it proves |
|-------|------|----------------|
| **Manager** (1) | Receives tasks from user, decides which worker handles it, writes a brief | Delegation logic, task routing, manager→worker handoff |
| **Copywriter** (1) | Writes copy — emails, headlines, landing page text | Worker execution, tool usage, output delivery |
| **Designer** (1) | Creates visual assets — social posts, ad creatives, thumbnails | Worker execution, different skill set, proves multi-agent variety |

Why these 3: Copywriter and Designer are the two most common delegation targets for marketing users. They have clearly different skills, so the Manager must actually route (not just blindly forward). And the outputs are tangible — user can immediately see if it worked.

### MVP Scope (build)

**Backend:**
- `missions` table — task lifecycle (`queued → dispatched → running → done | failed`)
- `org_agents` table — 3 seed agents with role, skills, status
- `mission_logs` table — progress entries per mission (who did what, when)
- NestJS `MissionsModule` in `apps/api` — CRUD + dispatch endpoint
- BullMQ `MissionsModule` in `apps/queue-worker` — processor that triggers OpenClaw sessions
- 3 agent configs in `openclaw.json` — manager, copywriter, designer
- Internal callback endpoint — agents report progress/completion back

**Frontend (Manage tab):**
- Mission inbox — list of missions with status chips
- Quick capture — "Write welcome email copy" → enqueues mission
- Mission detail — see status, which agent is working, progress log
- Agent status panel — 3 cards showing online/idle/working

**Reliability (minimum):**
- BullMQ retries (3 attempts, exponential backoff) — already configured in queue-worker
- Job timeout (max 5 min per agent run)
- Idempotency key per mission (prevent duplicate dispatch)
- Correlation ID on every mission (`mission_id` flows through queue → gateway → agent → DB)

### MVP Scope (skip for now)

- Automatic CEO delegation (Manager routes manually first, auto-routing later)
- Cron/autopilot scheduling
- NeuralSnap Brain per agent
- Health monitoring dashboard
- Dead-letter UI
- Compensation/rollback
- Multi-step missions (mission = 1 agent run for now)
- Agent role/skill editing UI

### MVP Success Criteria

1. User creates mission in Manage → it appears in queue
2. Queue worker picks it up → triggers Manager agent via OpenClaw
3. Manager decides "this is a copy task" → creates sub-mission for Copywriter
4. Queue worker picks up sub-mission → triggers Copywriter agent
5. Copywriter executes → posts result back via internal API
6. User sees completed mission with output in Manage UI
7. If Copywriter fails → BullMQ retries automatically → user sees retry count
8. Full flow takes < 60 seconds for simple tasks

### What We'll Learn

- Is the queue → OpenClaw gateway trigger reliable?
- How long does agent cold-start take?
- Does session isolation work per-user per-mission?
- What breaks first? (timeout, context, tool errors, handoff?)
- Is the Manager useful or just overhead for simple tasks?
- What UI does the user actually need vs what we assumed?

After MVP works end-to-end, we decide: scale agents, add autopilot, or clean/remove what didn't work.

---

*Status: MVP scope defined. Schema, job contracts, and implementation phases TBD.*
