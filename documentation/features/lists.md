# Lists — The Human Layer for Mission Control

Last updated: 2026-06-24

## 1. Problem Statement

Vibey's Mission Control is designed for agent-driven work: a user defines a goal, agents decompose it into subtasks, execute autonomously, and deliver results. Missions are finite — they have a clear start, execution phase, and completion state.

But there is no surface inside the platform for the human's own operational tasks — the ongoing, persistent, ever-growing work that doesn't neatly map to a single mission. Today, users track personal to-dos, action items from calls, recurring checklists, and project milestones outside Vibey entirely — in notes apps, spreadsheets, or their head.

This creates three problems:

- **Context fragmentation.** The user's tasks live outside the system that has all the context to help execute them.
- **No daily pull.** When agents aren't running, there's no reason to open Vibey. The platform has no "home base" for the user's workday.
- **Missing human touchpoints.** The current architecture assumes agents do everything. In reality, hybrid workflows — where humans approve, review, or execute certain steps — are how work actually gets done, especially at this stage.

**The core insight:** Mission Control is the agent's workspace. Lists is the human's workspace. They work in tandem.

## 2. Proposed Solution

Introduce **Lists** as a new top-level surface in the Vibey platform. A List is a persistent, interactive collection of items that the user (and their team) can manage, assign, and connect to agents and missions.

### 2.1 Core Concept

|               | MISSIONS                          | LISTS                                  |
| ------------- | --------------------------------- | -------------------------------------- |
| Orientation   | Agent-first                       | Human-first                            |
| Lifecycle     | Finite (start → done)             | Ongoing / ever-growing                 |
| Initiated by  | Natural language prompt           | Manual add, agent suggestion, template |
| Assignees     | Agents (auto-delegated)           | Humans, agents, or both                |
| Decomposition | Auto (agent breaks into subtasks) | Manual or templated                    |
| Purpose       | Execute a defined objective       | Track ongoing operational work         |

### 2.2 Key Principle

Lists and Missions are connected but separate surfaces. A list item can trigger a mission. A completed mission can resolve a list item. But they are not the same thing — they serve different mental models and different user needs.

## 3. Feature Specification

### 3.1 Lists

A List is a named, persistent container for items. Users can create multiple lists for different purposes.

Examples:

- "This Week" — rolling personal priorities
- "Campaign Launch: Summer Promo" — project-scoped checklist
- "ROAS.co Transition" — ongoing operational tasks
- "Content Pipeline" — recurring production workflow
- "Investor Outreach" — relationship and task tracking

List properties:

- **Name** (user-defined)
- **Optional association** to a Campaign
- **Template flag** (can be cloned as a reusable starting point)
- **Visibility** (private to the user or shared with team members)

### 3.2 List Items

Each item within a list represents a single task or action.

| Property       | Description                                 | Example                                        |
| -------------- | ------------------------------------------- | ---------------------------------------------- |
| Title          | Short description of the task               | "Review landing page copy"                     |
| Status         | To Do, In Progress, In Review, Done         | To Do                                          |
| Assignees      | One or more human team members or AI agents | Dylan + Ivy, Rex + Sefy                        |
| Priority       | Low, Medium, High, Urgent                   | High                                           |
| Due date       | Optional deadline                           | April 18, 2026                                 |
| Notes          | Additional context, links, or instructions  | "Match the tone from the webinar script"       |
| Source         | How the item was created                    | Manual, Agent-suggested, Fathom call, Template |
| Linked Mission | Connected Mission ID (if pushed to agents)  | Mission #247                                   |

### 3.3 Assignment Model

Every item can be assigned to multiple humans and/or agents. The first selected assignee is still stored as the primary assignee for legacy automations, "Your turn" routing, and mission push behavior.

- **Human (team member).** The item appears in their assigned-work filters. They manually mark it complete. Vibey can send reminders if a due date passes.
- **Agent.** When an agent is assigned as the primary assignee (e.g. Ivy, Rex), the item can be "pushed" to trigger a Mission in Mission Control. The item's status auto-updates based on the mission's progress.
- **Unassigned.** Backlog items that haven't been delegated yet. The user can drag-assign later.

### 3.4 Two-Way Flow (Lists ↔ Agents)

Lists are not just a passive tracker — they are a bidirectional interface between the user and the agent team.

**Human → Agent (Push)**

1. User adds item: "Build the opt-in landing page for the summer promo"
2. User assigns it to Rex (developer agent)
3. User clicks "Push to Agent" — a Mission is spawned in Mission Control
4. The list item's status automatically reflects the mission's state
5. When the mission completes, the list item moves to Done

**Agent → Human (Suggest)**

1. Vibey analyzes a Fathom call transcript and generates 5 action items
2. Items appear on the user's list with source: "Fathom call — April 12"
3. Each item is flagged as "Agent-suggested" with a review state
4. User accepts, edits, or dismisses each suggestion
5. Accepted items become live list items with full assignment options

**Mission → List (Resolve)**

1. A Mission completes in Mission Control
2. If the mission was linked to a list item, that item auto-resolves to Done
3. The deliverable from the mission is attached to the list item for reference

## 4. Templates

Lists can be saved as reusable templates for recurring workflows. When a template is applied, it creates a new list pre-populated with the template's items, assignments, and structure.

Example template — "Campaign Launch Checklist":

| Task                                  | Default Assignee | Type             |
| ------------------------------------- | ---------------- | ---------------- |
| Define offer and positioning          | Human            | Human checkpoint |
| Research competitors and market       | Niko             | Agent task       |
| Write landing page copy               | Ivy              | Agent task       |
| Review and approve copy               | Human            | Human checkpoint |
| Build and deploy funnel               | Rex              | Agent task       |
| Create email sequences                | Ivy              | Agent task       |
| Set up ad creatives                   | Lux / Rio        | Agent task       |
| Final review before launch            | Human            | Human checkpoint |
| Publish ads to Meta                   | Agent            | Agent task       |
| Monitor first 48 hours of performance | Niko             | Agent task       |

Templates make the hybrid human + AI workflow repeatable. The human checkpoints keep the user in control at the moments that matter.

## 5. UI / UX Specification

### 5.1 Navigation

Lists should be a top-level item in the left sidebar, positioned between Brain and Spaces (or adjacent to Missions). Icon: a checklist or stacked-lines icon consistent with the existing icon style.

**HQ (collapsed rail):** Lists uses the same glass secondary panel pattern as Spaces: tapping the rail icon opens the glass menu listing your lists; the app navigates to the Lists page only after you choose a list (or complete “new list” from the panel). The rail icon alone does not route to `/lists`.

### 5.2 List View

- Default view: flat list with status, assignee, priority, and due date columns
- Optional Kanban view: columns by status (To Do → In Progress → In Review → Done)
- Filtering by: assignee (human vs agent), status, priority, source, campaign
- Sorting by: priority, due date, date created, status
- Inline editing: click any field to edit directly in the list view
- Date columns use separate `Start Date` and `Due Date` field names in headers and editors, and both can be formatted from the column header menu as date + time, date only, time only, or relative.

### 5.3 Item Detail Panel

Clicking an item opens a slide-out panel (similar to the Mission detail view) showing:

- Full title and notes/description
- Assignment controls (dropdown of team members + agents)
- Status toggle
- "Push to Agent" button (spawns a Mission and links it)
- Linked Mission status (if applicable) with link to Mission Control
- Activity log (created, reassigned, status changes, agent suggestions)
- Source attribution (manual, Fathom call, agent-suggested, template)

### 5.4 Quick Add

A persistent quick-add bar at the top of the list view (similar to the Mission Control input bar). For Lists: "Add a task..." with the ability to type a task and hit enter to add it immediately.

### 5.5 Design System

Lists should follow the existing Mission Control design language: dark theme, same card and table styling, same status badges (Done, Blocked, In Progress), same typography. Lists and Mission Control should feel like siblings in the same system.

## 6. Agent Integration Behaviors

### 6.1 Agent-Suggested Items

Agents should be able to add items to a user's list in certain contexts:

- **Post-call analysis:** After a Fathom/Fireflies call is analyzed, Vibey extracts action items and adds them as suggestions.
- **CEO awareness loop:** During autonomous operations, if the CEO agent identifies something that requires human input, it adds a list item flagged as "Needs Human Decision."
- **Mission byproducts:** A completed mission might surface follow-up tasks (e.g., "Mission completed: landing page deployed. Suggested follow-up: set up retargeting ads").
- **Daily digest:** The daily digest email/notification can reference outstanding list items and suggest new ones based on campaign performance.

### 6.2 Safeguards

- Agent-suggested items always arrive in a "Suggested" state — they do not auto-appear as active tasks
- Users must explicitly accept or dismiss suggestions
- Rate limiting: agents cannot flood a list with more than 10 suggestions per day

## 7. Relationship to Mission Control

| Action            | In Lists                                  | In Mission Control                  |
| ----------------- | ----------------------------------------- | ----------------------------------- |
| Push to Agent     | Item status becomes "In Progress (Agent)" | New Mission spawned, linked to item |
| Mission completes | Linked item auto-resolves to Done         | Mission marked Done as normal       |
| Mission blocked   | Linked item shows "Blocked" badge         | Blocked state as normal             |
| Mission fails     | Item reverts to To Do with failure note   | Failed state as normal              |

Lists does not replace Mission Control. Mission Control remains the system of record for agent execution. Lists is the system of record for the human's operational reality.

## 8. Strategic Rationale

### 8.1 Retention

Lists gives users a reason to open Vibey every day, even when they're not launching campaigns or running missions. It transforms Vibey from an "execution engine I visit when I need something built" into "my workspace where I run my business."

### 8.2 Hybrid Workflow

The current platform architecture assumes agents handle everything autonomously. This is the long-term vision, but the near-term reality is that humans need to stay in the loop at key checkpoints. Lists formalizes those human touchpoints without undermining the autonomous agent model.

### 8.3 Competitive Positioning

No AI agent platform has solved the human-in-the-loop task management problem well. Most are either fully autonomous (no human tasks) or fully manual (no agent delegation). Lists positions Vibey as the platform that bridges both.

### 8.4 Product Stickiness

Once a user's operational tasks live inside Vibey, switching costs increase significantly. Their to-do list, their project checklists, their recurring workflows — all inside the platform.

## 9. Suggested Phasing

### Phase 1: Core Lists (MVP)

- Create, edit, delete lists and items
- Assign to humans or agents
- Status management (To Do → In Progress → Done)
- Push to Agent → spawns a Mission
- Mission completion resolves linked list items
- Left sidebar navigation entry

### Phase 2: Intelligence Layer

- Agent-suggested items from Fathom call analysis
- CEO awareness loop integration (human decision flags)
- Mission byproduct suggestions
- Daily digest includes list item summary

### Phase 3: Templates & Automation

- Save any list as a reusable template
- Pre-built templates for common workflows (Campaign Launch, Client Onboarding, Content Pipeline)
- Auto-create list from template when a new campaign is started
- Recurring list items (daily/weekly tasks that auto-reset)

## 10. Success Metrics

| Metric                 | Target (90 days)                       | Signal                            |
| ---------------------- | -------------------------------------- | --------------------------------- |
| Daily active usage     | 60%+ of active users open Lists weekly | Platform is a daily workspace     |
| Items created per user | 10+ items per user per week            | Users are tracking real work here |
| Push-to-Agent rate     | 30%+ of items get pushed to agents     | Hybrid workflow is working        |
| Retention impact       | D7 retention +15% vs pre-Lists cohort  | Lists drives daily return         |

**Bottom line:** Mission Control is where agents work. Lists is where humans work. Together, they make Vibey the platform where the entire operation lives — not just the AI parts.

## 11. Technical Implementation (Phase 1 MVP)

### 11.1 Database Schema

Migration: `supabase/migrations/20260413100000_lists_mvp.sql`

**`lists`** — persistent containers for items

- `id` UUID PK, `org_id` UUID NOT NULL, `user_id` UUID NOT NULL (FK auth.users)
- `title` TEXT, `description` TEXT, `campaign_id` UUID, `is_template` BOOLEAN, `visibility` ('private'|'team')
- RLS: owner read/write + org member read for team-visible lists

**`list_items`** — individual tasks within a list

- `id` UUID PK, `list_id` UUID NOT NULL (FK lists CASCADE), `org_id`, `user_id`
- `title`, `status` ('todo'|'in_progress'|'in_review'|'done'), `priority` ('low'|'medium'|'high'|'urgent')
- `assignee_type` ('human'|'agent'|'unassigned'), `assignee_id`, `due_date`, `notes`
- `source` ('manual'|'agent_suggested'|'template'|'fathom'), `linked_mission_id` UUID (FK missions)
- RLS: owner + org member read for team lists
- Both tables added to Supabase Realtime publication

**Mission sync trigger:** `sync_mission_status_to_list_item` — when a linked mission completes/fails/blocks, the list item status updates automatically.

### 11.2 API Layer (NestJS)

Module: `apps/api/src/modules/lists/`

- `ListsController` — `/api/lists` with 10 CRUD endpoints + push-to-agent
- `ListsService` — business logic; push-to-agent creates a mission and links it back
- `ListsRepository` — Supabase queries with org-scoped filtering
- Zod DTOs for all validation
- Guards: AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard

### 11.3 Frontend (Next.js)

- Route: `app/(dashboard)/lists/page.tsx`
- Sidebar: `ListChecks` in `manage-rail-items` (panel rail item, same mechanism as Spaces) between Team and Brain; glass panel lists → `Link` to `/lists` + `useListsStore.setActiveList(id)`
- Feature: `features/lists/` — types, service, Zustand store, 7 components, container
- Store: `use-lists-store` now uses backend Lists API for load/create/update/delete/push flows (mock data removed)
- Realtime: `postgres_changes` subscription on `list_items` filtered by active `list_id`
- Design: follows Mission Control design language (dark theme, same status badges, same typography)

### 11.4 Task Activity Slash Skills

Task activity comments and the Send to agent modal share the channel rich composer. In task context, the composer loads enabled skills for the relevant agent keys and exposes them in the `/` menu as `/skill-key` entries. Selecting a skill inserts the slash token into the instructions and includes `skill_keys` in the payload when the skill is known to the composer.

**Data Flow**

1. `ChannelComposer` inserts `/skill-key` text and returns `skill_keys` in `ChannelComposerPayload`.
2. `TaskActivity` sends comment `skill_keys` through `addItemComment`; `SendTaskToAgentModal` sends them through `invokeTaskAgent`.
3. The Spaces API validates and stores `skill_keys` on the comment activity payload, then forwards them to Agent API task-agent invocation.
4. `TaskAgentService` merges explicit `skill_keys` with slash tokens parsed from the prompt, resolves enabled skills for the invoked agent, ensures required runtime skill files exist, and prepends the resolved skill markdown to the task prompt.

**Code Examples**

```ts
await addItemComment(spaceId, itemId, html, {
  mentions: [{ type: 'agent', agent_key: 'copywriter', label: 'Copywriter' }],
  skill_keys: ['landing-page-copy'],
})
```

```ts
await invokeTaskAgent(spaceId, itemId, {
  agent_key: 'copywriter',
  include,
  extra_notes: '<p>/landing-page-copy Draft the hero copy.</p>',
  skill_keys: ['landing-page-copy'],
})
```

### 11.5 Task Activity Agent Mentions

Task activity comments and Send to agent instructions use the same campaign/task member list for `@` members and `@@` People entity mentions. Agent entries display their roster or campaign display name while preserving `agent_key` in the payload. Agent entity chips inserted through `@@` also normalize their entity id into `agent_key`, so the Spaces API's existing comment mention trigger invokes the task agent through the same path as a normal `@agent` mention.

### 11.6 Stopping Task Agent Work

Running task-agent activity rows expose a stop action from the row timestamp area. The action calls the Spaces API `cancel-agent` endpoint, which checks task edit access and forwards the cancellation to Agent API. Agent API keeps an abort controller for the active task run and marks the task activity plus `space_items.task_execution_status` as `cancelled` when the user stops it.

## 12. Decision Log

### 2026-06-24 — Active task-agent work can be stopped

Task activity now has an explicit stop control for running task-agent rows. Cancellation is not a frontend-only state change: the button calls an authenticated Spaces endpoint, Agent API aborts the active OpenClaw stream, and the final activity payload records `status: 'cancelled'` so the row renders as stopped instead of failed.

### 2026-06-24 — `@` and `@@` task activity agent mentions share identity

Task activity now keeps display identity and invocation identity separate: users see the agent display name, while the comment payload still carries `agent_key` for task-agent invocation. The `@@` People tab can use the task composer member source when provided, so task activity and Send to agent instructions show the same campaign/task people and agents.

### 2026-06-18 — Task activity slash skills reach task-agent runtime

Task comments that mention an agent and include `/skill-key`, plus Send to agent extra instructions with `/skill-key`, now resolve the referenced enabled skill for the invoked agent at task-agent runtime. Unknown slash tokens stay in the prompt as normal text. The activity payload records `skill_keys` when the composer can identify them, but runtime also parses slash tokens from prompt text so manually typed skill keys still work.

### 2026-06-04 — Date column display formats

Task list/table views default date columns to date + time display so call/task timestamps are visible without opening the picker. `Start Date` and `Due Date` remain separate columns and field names, while the shared date picker can edit both values. The column header menu can switch each date column independently to relative, date + time, date only, or time only, persisted on the view as `date_display_formats` with legacy `date_display_format` as fallback. The date picker itself keeps the actual field names as `Start date` and `Due date` placeholders.

### 2026-05-25 — Org General campaign singleton

Org workspaces use one shared `General` campaign as the default bucket for spaces. Historical data allowed one `General` campaign per user inside the same org, which made the Spaces sidebar render multiple `General` sections. Migration `supabase/migrations/20260525214800_org_general_campaign_singleton.sql` keeps the oldest org `General` as canonical, moves duplicate-General spaces and visible campaign-scoped content into it, archives duplicate General campaigns, and adds separate uniqueness rules for one personal General per user and one org General per org.
