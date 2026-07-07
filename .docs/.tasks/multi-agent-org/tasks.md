# Mission Control V2 — Unified Inbox + Tasks + Plans

## Vision

Merge the current separate `missions` pipeline and `tasks` Kanban into one unified system. The user interacts with an **Inbox** (quick capture), the **Manager agent** triages and plans, and tasks flow through a Kanban with agent-driven status progression.

---

## Data Model (replaces current split)

### Table: `missions` (already exists — becomes the single source of truth)

Keep as-is but update the status enum to match the new lifecycle:

```
Status lifecycle:
  inbox → planning → todo → in_progress → review → done | failed | dead_letter
```

New fields to add:
- `priority` TEXT CHECK ('low','medium','high','urgent') DEFAULT 'medium'
- `description` TEXT — expanded description (Manager writes this during planning)
- `assigned_agent_key` — already exists (who should do it)
- `current_agent_key` — already exists (who is doing it right now)
- `progress_notes` TEXT — running log of what the agent did ("I wrote the headline", "Draft complete")
- `plan_id` UUID REFERENCES missions_plans(id) — link to the Plan

### Table: `missions_plans` (NEW — replaces task_prds concept)

```sql
missions_plans (
  id UUID PK,
  mission_id UUID REFERENCES missions(id),
  user_id UUID REFERENCES auth.users(id),
  content JSONB NOT NULL DEFAULT '{}',   -- structured plan content (see below)
  version INTEGER DEFAULT 1,
  created_by TEXT,                        -- agent_key who wrote it ('manager')
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

Plan content structure (JSONB), user-facing friendly version of PRD:

```json
{
  "title": "Write welcome email for new leads",
  "summary": "Create a 3-part welcome sequence that introduces the brand and drives first purchase.",
  "approach": "Starting with subject line options, then body copy, then CTA variants.",
  "steps": [
    { "id": "step-1", "title": "Draft subject lines", "status": "done", "notes": "3 options created" },
    { "id": "step-2", "title": "Write email body", "status": "in_progress", "notes": "" },
    { "id": "step-3", "title": "Add CTA variants", "status": "pending", "notes": "" }
  ],
  "outOfScope": ["Email design/HTML", "Sequence scheduling"],
  "estimatedMinutes": 5
}
```

### Table: `missions_logs` (already exists — keeps timeline)

No changes needed. Already stores event_type, from_status, to_status, agent_key, payload.

### Table: `agents_registry` (already exists — keeps agent status)

No changes needed.

### Table: `agent_tasks` (existing Tasks table)

Keep for now but stop creating new rows there from Mission Control. The Tasks Kanban board will read from `missions` instead. Old `agent_tasks` data stays accessible but the new flow writes to `missions` only.

---

## Status Lifecycle (Kanban Columns)

```
INBOX → PLANNING → TODO → IN PROGRESS → REVIEW → DONE
  │         │        │         │            │        │
  │    Manager    Manager   Worker      Agent     Final
  │    picks up   writes    picks up    checks    state
  │    the task   the Plan  and works   quality
  │
  User submits
  quick capture
```

| Status | Who acts | What happens |
|--------|----------|-------------|
| `inbox` | User | User submitted raw text. Sitting in inbox waiting for Manager. |
| `planning` | Manager agent | Manager picked it up. Analyzing, writing the Plan. |
| `todo` | Manager agent | Plan done. Manager assigned it to copywriter/designer. Waiting for worker pickup. |
| `in_progress` | Worker agent | Worker is executing. Posting progress_notes as they go. |
| `review` | Manager agent | Worker finished. Manager reviews output quality. |
| `done` | System | Complete. Output visible to user. |
| `failed` / `dead_letter` | System | Something went wrong. Retry exhausted. |

---

## Manager Agent — How It Works

### Trigger

The mission-worker scheduler polls for `inbox` status missions (not `queued` anymore). When found:
1. Dispatches to Manager agent via OpenClaw
2. Status transitions: `inbox` → `planning`

### Manager Skill: "mission-planner"

This is a **Skill file** in the Manager's workspace (`docker/agents/manager/skills/mission-planner/SKILL.md`) that tells the Manager exactly how to handle inbox items:

```markdown
# Mission Planner Skill

When you receive a mission:

1. READ the mission title and brief
2. ANALYZE what type of work this is (copy, design, strategy, mixed)
3. CREATE a Plan by calling the internal API:
   POST /api/internal/missions/{id}/plan
   Body: { title, summary, approach, steps[], outOfScope[], estimatedMinutes }
4. DECIDE which worker handles it (copywriter or designer)
5. UPDATE mission status to 'todo' and set assigned_agent_key
6. LOG a delegation event with your reasoning
```

### Heartbeat (NOT used for mission processing)

Heartbeat in OpenClaw is a periodic "wake up and check on things" mechanism. For missions, we DON'T use heartbeat because the **mission-worker BullMQ scheduler** is the reliable trigger. The heartbeat stays as `"target": "none"` for mission agents.

The mission-worker polls DB → dispatches via BullMQ → triggers OpenClaw session. This is more reliable than heartbeat-driven cron.

### Why Skill, Not Heartbeat?

- **Heartbeat** = agent wakes up on a timer, checks if there's work. Unreliable for mission processing (can miss items, no retry, no idempotency).
- **Skill** = agent receives a mission via OpenClaw session trigger (from BullMQ), follows the skill instructions to process it. Reliable because BullMQ handles retry/timeout/dead-letter.

---

## Worker Agents — How They Work

### Trigger

When Manager sets status to `todo`, the mission-worker scheduler picks it up and dispatches to the assigned worker (copywriter/designer).

### During Execution

Worker posts progress updates via internal callback:
```
POST /api/internal/missions/callback
{ mission_id, user_id, status: "in_progress", event_type: "mission.progress", event_payload: { note: "Drafted 3 subject line options" } }
```

These progress notes accumulate in `missions_logs` and are visible in the UI timeline.

### On Completion

Worker calls callback with `status: "review"` (not "done" — Manager reviews first).

### Manager Review

Mission-worker picks up `review` status, dispatches to Manager. Manager:
1. Reads worker output
2. If quality OK → updates to `done`
3. If needs revision → updates back to `in_progress` with feedback in progress_notes

---

## Frontend Changes

### Mission Control Page (`/mission-control`)

**Inbox section (top):**
- Quick capture input (already built)
- Below: list of `inbox` status missions (raw submissions)

**Kanban board (main area):**
- Columns: Planning | To-Do | In Progress | Review | Done
- Cards show: title, priority badge, assigned agent, current agent, last progress note
- Click card → side panel with: Plan view + Timeline + Output

**Plan view (inside mission detail):**
- Rendered from `missions_plans.content`
- Shows: title, summary, approach, step checklist with status
- User-friendly language, not developer PRD terminology
- Steps show progress (done/in_progress/pending)

**Agent panel (already built):**
- 3 cards showing agent status (idle/working)

### Tasks Page (`/tasks`)

Option A: Redirect to Mission Control (replace Tasks entirely)
Option B: Keep Tasks as manual Kanban, Mission Control as agent-driven Kanban

Recommend **Option A** for now — one system, not two.

---

## Implementation Order

### Phase 1: Schema update
- Add `priority`, `description`, `progress_notes` to `missions` table
- Update status CHECK constraint to include `inbox`, `planning`, `review`
- Create `missions_plans` table
- Migration + apply via Supabase MCP

### Phase 2: Manager planning skill
- Create `docker/agents/manager/skills/mission-planner/SKILL.md`
- Update mission-worker to handle `inbox` → `planning` → `todo` flow
- Add internal API endpoint for plan creation: `POST /api/internal/missions/:id/plan`
- Manager creates plan, assigns worker, transitions to `todo`

### Phase 3: Worker progress flow
- Update worker execution to post progress notes during work
- Add `review` status handling in mission-worker
- Manager review step after worker completion

### Phase 4: Frontend Kanban
- Replace mission list with Kanban columns
- Add Plan detail view (rendered from missions_plans)
- Add progress timeline in mission detail
- Wire quick capture to create with `inbox` status instead of `queued`

### Phase 5: Unify Tasks
- Point Tasks page to Mission Control (or merge UI)
- Stop writing to `agent_tasks` from new flows

---

## Decisions (Resolved)

1. **No manual drag-and-drop.** Users cannot move cards between columns. Agents own the Kanban — this is an AI-run org, not a human project board.
2. **Fully replace Tasks with Mission Control.** No separate human Kanban. One system, agent-driven.
3. **User sets priority on submit, with "Auto" option.** Inbox capture includes a priority selector (low/medium/high/urgent/auto). If "auto", the Manager assigns priority during planning.
