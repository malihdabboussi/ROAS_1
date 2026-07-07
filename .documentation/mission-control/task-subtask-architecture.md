# Mission Control — Task & Subtask Architecture

## Scope

This document covers the complete lifecycle of tasks and subtasks in Vibey Mission Control: how tasks flow through the Kanban board, how the mission worker orchestrates agent execution, how subtasks enable multi-agent collaboration within a single task, and how sessions, state, and context tie it all together.

---

## 1. Core Entities

### Task (Kanban)

The user-facing entity displayed on the Kanban board.

| Column | Description |
|---|---|
| `id` | UUID PK |
| `mission_id` | FK to `missions` — links Kanban card to backend mission |
| `status` | `backlog`, `planning`, `todo`, `in_progress`, `review`, `done`, `blocked`, `archived` |
| `priority` | `low`, `medium`, `high`, `urgent` |
| `assigned_agent_key` | Which agent is responsible (display-level) |
| `title`, `description` | User-provided task content |

### Mission

The backend execution entity. One task maps to one mission.

| Column | Description |
|---|---|
| `id` | UUID PK |
| `status` | `inbox`, `planning`, `todo`, `in_progress`, `review`, `blocked`, `done`, `error`, `failed` |
| `assigned_agent_key` | The primary agent assigned to the mission (typically the executing worker) |
| `current_agent_key` | The agent currently acting (may differ during review when manager takes over) |
| `campaign_id` | Links the mission to a campaign for context injection |
| `plan_id` | FK to `missions_plans` |
| `correlation_id` | Traces the mission across systems |

### Mission Plan (`missions_plans`)

The execution blueprint created by the manager agent during the plan phase.

```json
{
  "title": "Create 5 blog articles",
  "summary": "Keyword research → copy → design",
  "approach": "Sequential research, parallel copy+design",
  "subtasks": [
    { "id": "st-1", "title": "Keyword research", "assignTo": "analyst", "dependsOn": [] },
    { "id": "st-2", "title": "Write blog copy", "assignTo": "copywriter", "dependsOn": ["st-1"] },
    { "id": "st-3", "title": "Design images", "assignTo": "designer", "dependsOn": ["st-1"] }
  ]
}
```

### Mission Subtask (`mission_subtasks`)

First-class entity representing a unit of work within a mission. Each subtask has its own assigned agent, status, dependencies, output, and deliverable.

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | |
| `mission_id` | UUID FK → missions | Parent mission |
| `title` | TEXT | What to do |
| `status` | TEXT | `pending`, `in_progress`, `done`, `revision`, `blocked` |
| `assigned_agent_key` | TEXT | Which agent executes this subtask |
| `sort_order` | INT | Display/execution order |
| `depends_on` | UUID[] | Array of subtask IDs that must be `done` before this one starts |
| `output` | JSONB | Agent's produced output |
| `feedback` | TEXT | Manager's review feedback (if rejected) |
| `deliverable_id` | UUID FK → mission_deliverables | Links to the produced deliverable |

### Mission Deliverable (`mission_deliverables`)

The output artifact(s) produced by agents — documents, text, images, PDFs, etc.

### Mission Log (`missions_logs`)

Activity timeline: every status change, agent action, and user comment is recorded as a log entry with `event_type`, `agent_key`, `payload`, and `from_status` → `to_status`.

---

## 2. Status Lifecycle

### Task → Mission Sync (DB Trigger)

A PostgreSQL trigger `sync_task_to_mission` fires `AFTER UPDATE ON tasks`. When a task's status changes, the trigger maps it to the corresponding mission status and updates the `missions` row.

```
Task status change → trigger → missions.status = mapped_status
```

Mapped statuses: `planning`, `todo`, `in_progress`, `review`, `done`, `blocked`. Unmapped statuses (`backlog`, `archived`) are ignored by the trigger.

### Mission Status Flow

```
inbox → planning → todo → in_progress → review → done
                     ↑                      |
                     └──────────────────────┘ (rejected subtasks → todo)
```

- **inbox**: New task arrives. Scheduler picks it up for planning.
- **planning**: Manager agent is creating the execution plan + subtasks.
- **todo**: Plan is ready. Scheduler polls for eligible subtasks to execute.
- **in_progress**: At least one subtask is being executed by an agent.
- **review**: All subtasks are `done`. Manager agent reviews each subtask's output.
- **done**: All subtasks approved. Mission complete.
- **blocked/error/failed**: Error states for crashes, timeouts, or repeated failures.

### Subtask Status Flow

```
pending → in_progress → done
   ↑                      |
   └──── revision ←───────┘ (rejected by manager)
```

- **pending**: Waiting to be picked up (or waiting for dependencies).
- **in_progress**: Agent is actively working on it.
- **done**: Agent finished; output stored.
- **revision**: Manager rejected; needs rework. Feedback stored in `feedback` column.
- **blocked**: Dependency subtasks are not yet `done` (visual-only in UI; scheduler skips these).

---

## 3. Mission Worker

The mission worker (`apps/mission-worker`) is a NestJS microservice that orchestrates all agent execution. It has zero intelligence — it's a state machine that reads statuses and dispatches work.

### Components

| Component | Responsibility |
|---|---|
| **Scheduler** (`missions.scheduler.ts`) | Polls DB every N ms, enqueues BullMQ jobs based on mission/subtask statuses |
| **Processor** (`missions.processor.ts`) | BullMQ worker that picks up jobs and calls `MissionsService.processMission()` |
| **Service** (`missions.service.ts`) | Core logic: plan phase, execute phase, review phase, OpenClaw calls, deliverable creation |

### Scheduler Polling

Every poll cycle:

1. **Phase map missions**: Enqueue `inbox` → plan, `review` → review.
2. **Eligible subtasks**: Query `mission_subtasks WHERE status = 'pending'` and all `depends_on` subtasks are `done`. Enqueue one BullMQ job per eligible subtask.
3. **Stalled watchdog**: Check `in_progress` subtasks/missions with `updated_at` older than 10 minutes. Probe OpenClaw gateway for the exact session key. If session is not active, reset to `pending` to re-enqueue.
4. **Todo → review reconciliation**: If a mission is in `todo` but all its subtasks are `done`, transition it to `review`.
5. **Legacy todo missions**: Missions in `todo` with no subtask rows are enqueued for legacy step-by-step execution.
6. **Auto-retry failed**: Missions in `failed` state with retry budget get moved back to `inbox`.

### Concurrency

BullMQ processor concurrency (default: 3) determines how many jobs run in parallel. Each job is one agent call — so 3 concurrent subtasks from different missions (or the same mission) can execute simultaneously. Concurrency is per mission-worker process, not per agent.

---

## 4. Three Phases

### Phase 1: Plan

**Trigger**: Mission in `inbox` status.

**Actor**: Manager agent (resolved from `agents_registry` — first `c_level` or `manager` level agent).

**Process**:
1. Scheduler enqueues a `plan` job.
2. Mission status → `planning`.
3. Mission worker calls OpenClaw with the manager agent, providing: mission title, brief, campaign context (purpose, offers, avatars, brand voice, knowledge graph), user comments, and available team agents.
4. Manager responds with a plan JSON containing subtasks, assignments, and dependencies.
5. Worker creates `missions_plans` row and `mission_subtasks` rows.
6. Mission status → `todo`.
7. Manager's state is patched with delegation summary.

**Session key**: `agent:{gatewayAgentId}:mission:{agentKey}:{userId}:{missionId}`

### Phase 2: Execute

**Trigger**: Subtask in `pending` status with all dependencies `done`.

**Actor**: The agent specified in `subtask.assigned_agent_key`.

**Process**:
1. Scheduler enqueues an `execute` job with `{ missionId, subtaskId }`.
2. Subtask status → `in_progress`. Mission status → `in_progress`.
3. Mission worker fetches: subtask details, dependency outputs (from completed prerequisite subtasks), mission plan summary, campaign context (full), user comments.
4. Worker calls OpenClaw with the assigned agent and a subtask-specific prompt.
5. Agent produces output.
6. Subtask status → `done`. Output stored in `subtask.output`. Deliverable created and linked back to `subtask.deliverable_id`.
7. If all sibling subtasks are `done` → mission status → `review`.

**Session key**: `agent:{gatewayAgentId}:subtask:{agentKey}:{userId}:{subtaskId}`

**Parallel execution**: Multiple subtasks with no dependency on each other are enqueued simultaneously. A copywriter and designer can work at the same time if both depend only on a completed analyst subtask.

### Phase 3: Review

**Trigger**: Mission in `review` status.

**Actor**: Manager agent.

**Process**:
1. Scheduler enqueues a `review` job.
2. Worker fetches all subtasks and their outputs.
3. Worker calls OpenClaw with the manager, presenting each subtask's deliverable separately.
4. Manager responds with per-subtask verdicts:

```json
{
  "subtaskReviews": [
    { "subtaskId": "st-1", "approved": true, "feedback": "Good research" },
    { "subtaskId": "st-2", "approved": true },
    { "subtaskId": "st-3", "approved": false, "feedback": "Image #2 needs redesign", "reassignTo": "designer" }
  ]
}
```

5. Approved subtasks stay `done`.
6. Rejected subtasks → `pending` (with feedback stored, optionally reassigned to a different agent).
7. If any rejected: mission → `todo` (scheduler will re-execute pending subtasks).
8. If all approved: mission → `done`. Manager state patched with completion summary.

---

## 5. Session Keys & State

### Session Key Format

Every OpenClaw call from the mission worker includes a structured session key:

| Context | Format |
|---|---|
| Mission-level (plan/review) | `agent:{gatewayAgentId}:mission:{agentKey}:{userId}:{missionId}` |
| Subtask-level (execute) | `agent:{gatewayAgentId}:subtask:{agentKey}:{userId}:{subtaskId}` |
| State updates | `agent:{gatewayAgentId}:state:{agentKey}:{userId}` |

Where `gatewayAgentId` is resolved from the agent's level: `system` → `vibey`, `c_level`/`manager` → `manager`, `employee` → `employee`.

OpenClaw uses the session key for:
- **Session isolation**: Each mission+agent pair gets its own conversational context.
- **Caching**: Within the TTL window (~1 hour), subsequent calls reuse the cached session to avoid re-sending the full prompt.
- **Tool context**: `x-session-key` is passed through to tool calls (e.g., `vibey_backend`), so tools can resolve `userId` and scope operations.

### Agent State (`user_agent_state` table)

Each agent has a persistent state row (keyed by `user_id` + `agent_id`). The state is a markdown-like text blob (`state_content`) that the agent reads and writes via `update_state` / `patch_state` tools.

**When state changes:**
- During **communication** (user chats with agent directly): Agent can call `update_state` or `patch_state` at any time.
- During **mission execution**: The mission worker patches the manager's state after delegation (plan phase) and after review (review phase) using the `patch_state` API.
- Execution workers (employees) typically do NOT update state — they execute tasks and produce deliverables. State is only relevant for agents the user converses with.

**Patch vs. Full Rewrite:**
- `patch_state` supports granular operations: `append_line`, `replace_line`, `remove_line`, `append_section`.
- `update_state` replaces the entire `state_content` — used only when a full rewrite is intended.

---

## 6. Campaign Context Injection

Every agent call during mission execution receives campaign context built by `buildCampaignContext()`:

- **Campaign metadata**: name, purpose, description, strategy, target audience.
- **Offers**: what we sell, who we sell to, power offer statement, major benefit.
- **Avatars**: persona data, demographics, core problems, frustrations.
- **Brand voice**: tone, style, personality, tagline (from campaign theme).
- **Knowledge graph**: similarity-matched nodes relevant to the current task.
- **Agent memory**: learned notes from past work on this campaign.
- **Agent identity**: role, DISC profile, core beliefs, communication style.

Context is scoped by agent level:
- **Managers**: Full access (offers, strategy, recent deliverables, resources, priorities).
- **Employees**: Reduced access (avatars, brand voice, knowledge graph, identity — no offer details or strategic data).

---

## 7. User Comments

Users can write comments on tasks via the TaskDetailModal. Comments are stored as `missions_logs` entries with `event_type: 'user.comment'`.

Comments are injected into every agent prompt (plan, execute, review) as a `User Comments:` section. This ensures that when a user writes "please make a PDF from this" and moves the task back to `todo`, the executing agent sees the instruction.

---

## 8. Dependency Graph

Subtask dependencies are defined as a `depends_on` UUID array on each subtask row. The scheduler enforces dependencies:

- A subtask is only eligible for execution when ALL subtask IDs in its `depends_on` array have `status = 'done'`.
- This enables parallel execution of independent subtasks and sequential execution of dependent ones.

**Example:**

```
[Keyword Research] → ─┬─ [Write Blog Copy]
                      └─ [Design Images]
```

Research must complete first. Once done, copywriting and design run in parallel.

---

## 9. Stalled Work Detection

The scheduler runs a watchdog that detects subtasks/missions stuck in `in_progress`:

1. Query items with `status = 'in_progress'` and `updated_at` older than the stale threshold (default: 10 minutes).
2. For each stalled item, reconstruct the **exact expected session key** (e.g., `agent:employee:subtask:copywriter:{userId}:{subtaskId}`).
3. Probe the OpenClaw gateway to check if this specific session is active.
4. If the exact session IS active: leave it alone (agent is working, just slow).
5. If the exact session is NOT active: reset status to `pending` to re-enqueue on the next poll cycle.

This prevents false positives — an agent could have an active session for a different task, which would not count as activity for the stalled task.

---

## 10. UI — TaskDetailModal

The task detail modal (opened by clicking a Kanban card) shows:

### Left Column (70%)
- **Header**: Title, status dropdown, priority dropdown, assignee dropdown, retry button.
- **Metadata**: Created date, completed date.
- **Description**: Collapsible text area.
- **Subtasks section**: List of subtask cards with:
  - Color-coded status circle (grey=pending, red=blocked, amber=in_progress, green=done, orange=revision).
  - Title.
  - Assignee badge (clickable dropdown to reassign agent).
  - Expandable output preview and feedback.
- **Deliverables**: Thumbnail grid with preview modal (supports markdown rendering, PDF export, image/video display).

### Right Column (30%)
- **Activity timeline**: Chronological log of all events — status changes, agent actions, user comments, subtask reviews.
- **Comment input**: Text area to send messages that agents will see in their next prompt.

### Subtask-specific timeline context
When a `subtask.review` event has a `subtask_id` in its payload, the timeline resolves the subtask title and displays it (e.g., "Subtask review — Design images").

---

## 11. API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/missions` | List missions (filterable by status) |
| `GET` | `/missions/:id` | Get mission by ID |
| `POST` | `/missions` | Create mission |
| `PATCH` | `/missions/:id/status` | Update mission status |
| `POST` | `/missions/:id/comment` | Add user comment |
| `POST` | `/missions/:id/retry` | Retry failed mission |
| `DELETE` | `/missions/:id` | Trash mission |
| `GET` | `/missions/:id/plan` | Get mission plan |
| `GET` | `/missions/:id/deliverables` | List deliverables |
| `GET` | `/missions/:id/logs` | List activity logs |
| `GET` | `/missions/:id/subtasks` | List subtasks |
| `PATCH` | `/missions/:id/subtasks/:subtaskId` | Update subtask (status, assigned_agent_key, feedback) |

All endpoints require `AuthGuard` + `RoleGuard` (`power` or `admin` roles). Subtask ID params are UUID-validated.

---

## 12. Database Tables Summary

| Table | Purpose |
|---|---|
| `tasks` | Kanban board cards (user-facing) |
| `missions` | Backend execution entities (worker-facing) |
| `missions_plans` | Execution plans created by manager agents |
| `mission_subtasks` | Individual work units with per-agent assignment + dependencies |
| `mission_deliverables` | Output artifacts (docs, images, PDFs, etc.) |
| `missions_logs` | Activity timeline (all events + user comments) |
| `agents_registry` | Agent definitions (key, name, role, level, skills, stats) |
| `campaign_agents` | Per-campaign agent config and memory |
| `user_agent_state` | Persistent agent state (per user + agent) |

---

## 13. Key Files

| File | Role |
|---|---|
| `apps/mission-worker/src/modules/missions/services/missions.service.ts` | Core plan/execute/review logic, OpenClaw calls, deliverable creation |
| `apps/mission-worker/src/modules/missions/services/missions.scheduler.ts` | Status polling, subtask eligibility, stalled detection, BullMQ enqueue |
| `apps/mission-worker/src/modules/missions/processors/missions.processor.ts` | BullMQ job processor (concurrency config) |
| `apps/mission-worker/src/modules/missions/types/missions.types.ts` | Type definitions for phases, statuses, job data, subtask rows |
| `apps/api/src/modules/missions/controllers/missions.controller.ts` | REST API endpoints |
| `apps/api/src/modules/missions/services/missions.service.ts` | API service layer (plan creation, subtask CRUD, callbacks) |
| `apps/api/src/modules/missions/repositories/missions.repository.ts` | Supabase data access (missions, plans, subtasks, deliverables, agents) |
| `apps/api/src/modules/missions/dto/index.ts` | Zod schemas for request validation |
| `apps/agent-api/src/modules/artifacts/services/artifacts.service.ts` | Tool execution (state, campaigns, knowledge graph) + session key parsing |
| `apps/web/src/features/tasks/components/dialogs/TaskDetailModal.tsx` | Task detail UI (subtasks, timeline, deliverables, comments) |
| `apps/web/src/features/mission-control/services/missions.service.ts` | Frontend API client for missions/subtasks |
| `supabase/migrations/20260227010000_mission_subtasks.sql` | Subtasks table schema |
| `supabase/migrations/20260222071809_sync_task_to_mission.sql` | Task → mission status sync trigger |
