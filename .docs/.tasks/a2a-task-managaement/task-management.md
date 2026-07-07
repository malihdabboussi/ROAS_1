# Task Management — Sprint Plan

---

## Sprint 1 — State Continuity + Session Architecture

### Goal
Make agent state useful across mission lifecycle without forcing full state rewrites, while keeping token usage efficient.

### Architecture to implement

#### Phase 1 (active mission loop, warm session / <= TTL)
- Keep a stable mission session per mission + agent.
- Manager delegates and reviews in the same mission session context.
- Manager updates state at key checkpoints:
  - after delegation
  - after each review result (`done` / revision required / blocked)
- Use patch-based state updates (not full `STATE.md` rewrites).

#### Phase 2 (stale session / > TTL or resumed later)
- Start a fresh runtime session to avoid carrying expensive old prompt context.
- Keep mission identity continuity (`mission_id`, logs, comments, status).
- Rehydrate only required context for that mission/resume event.
- Continue patch-based state updates in the fresh session.

### Problems included in Sprint 1

#### 1) `update_state` hardcodes `agent_id: 'vibey'`
**File:** `apps/agent-api/src/modules/artifacts/services/artifacts.service.ts`

**Problem:** Manager/employee/CEO writes all end up in Vibey's state row.

**Implementation:**
- Derive `agent_id` from `sessionKey` (`agent:<id>:...`) in `updateState()` and `getState()`.
- Add safe fallback to `vibey` only when no agent can be resolved.
- Keep `user_agent_state` schema unchanged (`UNIQUE(user_id, agent_id)` already supports this).

#### 2) Mission-worker session keys are not namespaced (`agent:<id>:`)
**File:** `apps/mission-worker/src/modules/missions/services/missions.service.ts`

**Problem:** Non-`agent:` session keys resolve to default namespace (`main`) in OpenClaw.

**Implementation:**
- Change session key format from `${agentKey}-${userId}-${missionId}` to:
  - `agent:${gatewayAgentId}:mission:${agentKey}:${userId}:${missionId}`
- Ensure manager and employee phases both use agent-prefixed keys.
- Verify workspace/session-store resolution follows agent namespace.

#### 3) Mission-worker path does not perform state updates
**Problem:** Mission execution updates mission tables and graph/memory, but not `user_agent_state`.

**Implementation:**
- Add manager-side state updates at lifecycle checkpoints:
  - plan complete / delegated-to
  - review complete (`done`)
  - review rejected (sent back to `todo`)
  - blocked/failure outcomes
- Keep updates concise and operational (status ledger, not long prose).
- Do this in mission-worker manager phases (plan/review), not employee execute phase.

#### 6) `update_state` rewrites full state (token waste)
**File:** `apps/agent-api/src/modules/artifacts/services/artifacts.service.ts`

**Implementation:**
- Add new action: `patch_state`.
- Support targeted operations:
  - `replace_line` (exact match replace)
  - `append_line`
  - `append_section_block`
  - `remove_line`
- Keep `update_state` for full overwrite fallback only.
- Update tool docs/prompts to prefer `patch_state` for routine updates.

### Delivery steps (ordered)

1. **Session identity fix**
- Implement agent-prefixed mission session keys.
- Validate manager plan/review and employee execute use expected agent namespace.

2. **Per-agent state identity**
- Remove hardcoded `agent_id='vibey'` in `updateState()` + `getState()`.
- Resolve agent from session key consistently.

3. **Patch API for state**
- Implement `patch_state` action + dispatcher wiring + validations.
- Keep operations deterministic and idempotent where possible.

4. **Mission lifecycle state sync**
- In manager plan/review phases, write patch updates reflecting mission outcomes.
- Keep state updates short and machine-readable for future automation.

5. **Prompt/tool usage policy**
- Update manager instructions to call `patch_state` after delegation/review decisions.
- Keep employee prompts unchanged (no forced state writes).

6. **Verification**
- Scenario A: user asks manager for 3 tasks; state reflects delegation.
- Scenario B: employee completes; manager review updates state to done/revision.
- Scenario C: resume after TTL; new session still updates same agent state row correctly.
- Scenario D: manager + employee state rows are isolated (no Vibey overwrite).

### Acceptance criteria
- Manager and employee maintain separate `user_agent_state` rows.
- Mission sessions resolve to correct agent namespace in OpenClaw.
- State updates can be done without full `STATE.md` rewrites.
- Manager state reflects mission lifecycle changes even when user was not in chat during execution.

---

## Sprint 2 — Subtask Architecture (Task as Container)

### Problem

Tasks are currently flat: one mission, one assignee, one execution, one review. Steps are JSON inside `missions_plans.content` with no independent lifecycle. This causes:
- Re-execution of good work when only one step failed
- No way to assign different agents to different parts of a task
- No dependency awareness (everything runs sequentially by one agent)
- Comments/activity are not the communication channel between agents within a task
- Manager reviews the entire blob, not individual pieces

### Architecture: Task = Container of Subtasks

```
Task (mission)
├── Subtask 1: Keyword research    → analyst     [status: done]     [depends: none]
├── Subtask 2: Write blog copy     → copywriter  [status: done]     [depends: subtask-1]
├── Subtask 3: Design blog images  → designer    [status: revision] [depends: subtask-1]
├── Subtask 4: Final assembly      → copywriter  [status: blocked]  [depends: subtask-2, subtask-3]
└── Activity: comments + agent logs + review notes (shared channel)
```

### Subtask entity

Each subtask is a first-class record (not JSON inside a plan):

| Field | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `mission_id` | uuid | Parent task/mission |
| `title` | text | What needs to be done |
| `status` | enum | `pending`, `in_progress`, `done`, `revision`, `blocked` |
| `assigned_agent_key` | text | Which agent works on this |
| `sort_order` | int | Execution order |
| `depends_on` | uuid[] | Array of subtask IDs that must be `done` before this can start |
| `output` | jsonb | Deliverable/result from execution |
| `feedback` | text | Manager review notes for this subtask specifically |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### Dependency + parallel execution

- Subtask can start only when all `depends_on` subtasks are `done`.
- If two subtasks have no dependency on each other → they can run in parallel (mission-worker enqueues both).
- Dependency is at the subtask level, not agent level — same agent can have dependent subtasks.

### Execution flow

1. **Plan phase:** Manager creates subtasks with assignments and dependencies (replaces flat `steps[]` JSON).
2. **Scheduler:** Polls for subtasks where `status = 'pending'` AND all `depends_on` are `done`. Enqueues those for execution.
3. **Execute phase:** Agent runs one subtask, produces output, marks `done`. Other subtasks with met dependencies become eligible.
4. **Review phase:** Manager reviews each completed subtask individually. Can approve some, reject others with specific feedback.
5. **Rejected subtask:** Only that subtask goes back to `pending` → re-executes (same or different agent). Approved subtasks stay `done`.
6. **Reassignment:** Manager can change `assigned_agent_key` on any subtask at any time (rejected subtask can go to a different agent).

### Activity as communication channel

All of these write to the same activity stream (currently `missions_logs`):
- User comments (already exists: `event_type: 'user.comment'`)
- Agent progress notes during execution (already exists: `event_type: 'mission.progress'`)
- Manager review notes per subtask (new: `event_type: 'subtask.review'` with `subtask_id`)
- Agent-to-agent handoff notes (new: when subtask completes, output summary visible to dependent subtask's agent)

User comments are injected into the next agent prompt when a subtask re-enters execution (fixes the "user wrote a comment but agent didn't see it" problem).

### What changes from current system

| Current | New |
|---|---|
| `missions_plans.content.steps[]` is JSON blob | Subtasks are DB rows with their own lifecycle |
| One `assigned_agent_key` per mission | Per-subtask `assigned_agent_key` |
| All steps execute sequentially by same agent | Subtasks execute based on dependency graph, possibly parallel, by different agents |
| Review is all-or-nothing | Review is per-subtask |
| Re-execution replays everything | Only rejected subtasks re-execute |
| Comments are ignored by execution | Comments injected into next execution prompt |
| No dependency model | `depends_on` array on each subtask |

### DB changes needed

- New table: `mission_subtasks` (or extend `missions_plans` — but separate table is cleaner)
- Migration: convert existing `missions_plans.content.steps[]` rows to `mission_subtasks` records
- New scheduler query: find subtasks ready to execute (pending + all deps done)
- Modified mission-worker: execute/review at subtask granularity

### Open questions

- Should the Kanban show subtasks as expandable rows under a task, or only in the task detail modal?
- Should subtask-level status be visible on the task card (e.g. "3/5 subtasks done")?
- Max parallelism: should there be a limit on how many subtasks from the same task run simultaneously?

---

## Sprint 3 — Operational Robustness

### Deferred items

#### No stalled `in_progress` mission detection
**File:** `apps/mission-worker/src/modules/missions/services/missions.scheduler.ts`

**Plan later:**
- Add stale `in_progress` watchdog (`updated_at` threshold).
- Decide fallback policy: auto-back-to-`todo` vs `error`.

#### User Kanban status change does not reassign agent
**Plan later:**
- Mostly solved by Sprint 2 subtask architecture (per-subtask assignment).
- Still need UI for reassignment in task detail modal.

