# PRD: AI Organization Template — Phase 1

**Version:** 1.0
**Author:** Q (COO)
**Date:** 2026-02-14
**Status:** Draft — Pending Sefy Approval

---

## 1. Result (What)

A Docker-deployable AI organization that ships as a complete, pre-configured team. The user gets a functioning org with a COO, managers, and workers — ready to execute from day one. No agent creation, no setup wizards. Open the box, give it direction, watch it work.

## 2. Purpose (Why)

Most people trying to use AI agents hit the same wall: they can build one agent, but can't build an _organization_. They don't know how to structure roles, delegate work, create feedback loops, or make agents actually collaborate. We've solved this. We've built the operating system for an AI org — DISC profiles, RPG stats, RPM strategy, quest pipelines, coaching loops, SOPs. This template packages everything we've learned into a product anyone can deploy.

## 3. Scope — What Ships in Phase 1

### Included

- Pre-loaded org structure (Docker image)
- Task system (quests internally, "tasks" to users)
- RPM/Strategy framework for C-level agents
- DISC profiles + RPG character stats
- A2A (agent-to-agent) communication
- SOP system (VM files, attached to roles, indexed in agent context)
- Credential store (DB, encrypted, agents see capability list only)
- Security model (no browser, no filesystem access to user data, backend proxies external calls)
- Inbox routing (user drops notes → COO routes → managers delegate → workers execute)
- Heartbeat chain (staggered: workers → managers → COO)

### Deferred (Later Phases)

- Financial dashboard
- Browser automation
- Pre-built integration connectors
- Brain/memory system (separate PRD)
- Sage coaching loop (internal training, not product)
- Custom agent creation by users

---

## 4. Architecture

### 4.1 The Split: VM vs DB

Two domains, clean separation. Never cross them.

| Domain                  | Storage              | What Lives Here                                                                             | Why                                                                                                   |
| ----------------------- | -------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Agent Consciousness** | VM files             | SOUL.md, AGENTS.md, IDENTITY.md, STATE.md, HEARTBEAT.md, RPM.md, STRATEGY.md, SOPs, ROLE.md | This IS the agent. Its personality, procedures, working memory. Loaded into context on every session. |
| **Brain (Knowledge)**   | Database             | Memories, insights, decisions, connections, emotional tags                                  | Shared knowledge graph. Persists across sessions. Searchable.                                         |
| **User Creations**      | Database             | Content, funnels, copy, landing pages, emails, all deliverables                             | Everything the org produces for the user. Queryable, exportable, never trapped in files.              |
| **Credentials**         | Database (encrypted) | API keys, tokens, service passwords                                                         | Agents never see raw values. Backend proxies all external calls.                                      |
| **Tasks**               | Database             | Quest pipeline (planning → todo → in_progress → review → done)                              | Shared state. All agents read/write. User sees "tasks."                                               |

### 4.2 Agent Consciousness Files (VM)

Each agent has a workspace directory. These files define WHO the agent is and HOW it operates:

```
/agents/{agent-id}/
├── IDENTITY.md      # Name, role, emoji, avatar
├── SOUL.md          # Personality, tone, values, boundaries
├── AGENTS.md        # Operating procedures (universal)
├── ROLE.md          # Responsibilities, skills, authority, metrics
├── HEARTBEAT.md     # Work loop definition (WHAT to do each cycle)
├── STATE.md         # Current tasks, blockers, decisions (working memory)
├── RPM.md           # Result, Purpose, Massive Action Plan (C-level only)
├── STRATEGY.md      # Concrete moves, revenue targets (C-level only)
└── sops/            # Standard Operating Procedures (role-specific)
    ├── SOP-001.md
    └── ...
```

**Key principle:** These files are the agent's consciousness. They're loaded into context at session start. They define behavior, not just configuration.

### 4.3 SOP Injection Model

SOPs are VM files attached to roles. Agents get an index injected into context — lightweight, pull-on-demand:

```
Available SOPs:
- SOP-001: "Task Creation" — How to create and structure tasks with acceptance criteria
- SOP-002: "Content Upload" — Step-by-step track upload to platform
- SOP-003: "Progress Tracking" — How to document work as you go
```

Agent reads the full SOP file from their local `sops/` directory only when they need it. Keeps context lean.

**Attachment model:**

- Each SOP is tagged with one or more roles
- When an agent boots, it gets the index of SOPs tagged to its role(s)
- User can attach/detach SOPs to roles via the dashboard
- COO can create new SOPs based on user requests

### 4.4 Credential Architecture

```
User adds API credential (e.g., Shopify token)
    → Encrypted in DB (backend manages encryption)
    → Agent context gets capability list:

      Available Integrations:
      - shopify: read_products, write_products, read_orders
      - email: send, read (user@example.com)

    → Agent requests action: "use shopify: read_products, params: {limit: 10}"
    → Backend decrypts credential, makes API call, returns result
    → Agent NEVER sees the raw key/token
```

**Security rules:**

- Credentials stored with AES-256 encryption at rest
- Only the backend service can decrypt
- Agents interact through an action proxy endpoint
- All actions logged in audit trail (who, what, when)
- User can revoke any credential instantly (DB flag)

---

## 5. Pre-Loaded Organization

The Docker image ships with a complete org. Users don't build agents — they direct an existing team.

### 5.1 Org Chart

```
┌─────────────────────────────┐
│         USER (Board)         │
│   Drops notes, sets direction│
└─────────────┬───────────────┘
              │
┌─────────────▼───────────────┐
│         COO ⚡                │
│   Routes inbox, fills        │
│   pipeline, adapts strategy  │
│   from user input            │
└──────┬──────────┬───────────┘
       │          │
┌──────▼──┐  ┌───▼─────┐
│ Manager │  │ Manager │  ... (per product/team)
│ Routes   │  │ Routes   │
│ quests   │  │ quests   │
└────┬─────┘  └────┬────┘
     │              │
┌────▼────┐   ┌────▼────┐
│ Workers │   │ Workers │
│ Execute │   │ Execute │
└─────────┘   └─────────┘

Shared Services:
- Coach (internal agent training — not user-facing)
- Technician (infra, browser ops — Phase 2)
- CFO (financial reporting — Phase 2)
```

### 5.2 Roles & DISC Profiles

Each agent ships with a pre-configured DISC profile that determines:

- Communication style
- Decision-making approach
- How they handle conflict/pressure
- What type of work they excel at

| Role           | DISC                        | Function                                         |
| -------------- | --------------------------- | ------------------------------------------------ |
| COO            | DC (Dominant-Conscientious) | Routes inbox, manages pipeline, adapts strategy  |
| Manager(s)     | DI (Dominant-Influential)   | Delegates to workers, reviews output, unblocks   |
| Content Worker | IS (Influential-Steady)     | Creates content, follows SOPs, consistent output |
| Dev Worker     | CD (Conscientious-Dominant) | Builds, codes, technical execution               |
| Copy Worker    | ID (Influential-Dominant)   | Writes copy, emails, funnels                     |
| Analyst        | CS (Conscientious-Steady)   | Research, data analysis, reporting               |

### 5.3 RPG Character Stats

Every agent has measurable stats (1-10) derived from actual performance data:

**Universal Stats (all agents):**
| Stat | What It Measures |
|------|-----------------|
| Execution Speed | How fast tasks get completed vs estimated |
| Quality | Review pass rate (first-time approval %) |
| Reliability | Consistency — does the agent deliver every cycle? |
| Initiative | Does it find work, or wait to be told? |
| Communication | Clear status updates, proper escalation |
| Spec Adherence | Does output match the brief exactly? |
| Learning Rate | Does it repeat mistakes, or improve? |

**Role-Specific Stats (added per role):**

- Content: Creativity, Voice Consistency
- Dev: Code Quality, Architecture Thinking
- Copy: Conversion Awareness, Brand Voice
- Analyst: Accuracy, Insight Depth

Stats are calculated from quest data (completion time, review cycles, blocker frequency). The coaching agent (internal) uses these to identify training needs.

---

## 6. Core Systems

### 6.1 Task Pipeline

Users see "Tasks." Internal system uses "Quests."

```
User drops note in inbox
    → COO creates task(s) with acceptance criteria
    → COO assigns to right manager
    → Manager assigns to worker(s)
    → Worker executes, moves to "review"
    → Manager reviews, approves or sends back
    → COO final check → marks "done"
    → User sees completed task in dashboard
```

**Task statuses (user-facing):**
| Status | What User Sees |
|--------|---------------|
| Planning | "Being planned" — COO is writing the spec |
| To Do | "Queued" — waiting for an agent to pick it up |
| In Progress | "Working on it" — agent is executing |
| Review | "Under review" — manager/COO checking output |
| Done | "Complete" — deliverable ready |
| Blocked | "Needs input" — waiting on user or external dependency |

### 6.2 Inbox Routing

The primary interface between user and org:

1. User drops a note (text, voice, whatever)
2. COO reads the note within one heartbeat cycle
3. COO determines:
   - Which team/manager owns this
   - Priority (urgent / high / medium / low) based on RPM alignment
   - Whether it needs a full spec or is a simple task
4. COO creates task(s), assigns to manager, closes inbox item
5. User gets notified: "Got it — [Manager] is handling this. ETA: [estimate]"

**COO learns strategy from user over time.** As the user gives feedback, corrects priorities, or redirects work, the COO updates RPM.md and STRATEGY.md. The org adapts.

### 6.3 RPM Framework (C-Level Agents Only)

C-level agents (COO, Managers) have strategic files that drive their decision-making:

**RPM.md** — The North Star:

```markdown
# Result

What world are we creating? (Specific, measurable outcome)

# Purpose

WHY does this matter? (Emotional fuel — the user's real motivation)

# Massive Action Plan

The concrete moves to get there (prioritized, sequenced)
```

**STRATEGY.md** — The Playbook:

```markdown
# Current Priorities (ordered)

1. [Priority 1] — why it's #1
2. [Priority 2] — why it's #2

# Revenue Targets (if applicable)

- Monthly: $X
- Quarterly: $X

# Key Constraints

- What we're NOT doing right now
- What's blocked
```

Execution-level workers DON'T get these files. They get tasks. The strategy cascades down through the management chain, not through direct context injection.

### 6.4 Heartbeat Chain

Staggered loops ensure work flows upward:

```
:00 / :30  — Workers execute (check own tasks, do work, submit for review)
:15 / :45  — Managers review (approve work, assign new tasks, unblock workers)
:25 / :55  — COO oversees (review managers, fill pipelines, route inbox, adapt strategy)
```

Each heartbeat, an agent:

1. Reads its HEARTBEAT.md (defines the loop)
2. Checks STATE.md (current context)
3. Checks task queue from DB
4. Does the highest-priority work
5. Updates STATE.md with what happened

### 6.5 A2A Communication

Agents communicate through:

1. **Task comments** — progress updates, questions, blockers (DB)
2. **Direct messages** — urgent coordination between agents (session messaging)
3. **Escalation chain** — Worker → Manager → COO → User (never skip levels unless emergency)

### 6.6 Security Model (Phase 1)

**Hard blocks:**

- ❌ No browser automation (deferred to Phase 2)
- ❌ No filesystem access to user data (all creations in DB)
- ❌ Agents never see raw credentials
- ❌ No external API calls without backend proxy
- ❌ No sending emails/messages without user approval rules

**Allowed:**

- ✅ Agents read/write their own consciousness files (VM)
- ✅ Agents read/write tasks in DB
- ✅ Agents read/write brain memories in DB
- ✅ Agents request actions through backend proxy
- ✅ A2A messaging between agents
- ✅ COO updates strategy files based on user input

**Audit trail:**

- Every credential usage logged (agent, action, timestamp)
- Every task status change logged
- Every external API call logged with response status

---

## 7. User Interface

### 7.1 Dashboard (Nexus UI)

User sees:

- **Inbox** — drop notes, requests, direction changes
- **Tasks** — Kanban board (Planning → Queued → Working → Review → Done)
- **Team** — agent cards with RPG stats, DISC profiles, current status
- **SOPs** — create/edit/attach SOPs to roles
- **Integrations** — add/remove API credentials, see capability list
- **Settings** — org-level config

### 7.2 What Users DON'T See

- Agent consciousness files (SOUL.md, AGENTS.md, etc.)
- Internal quest naming ("quests" = "tasks" to user)
- Heartbeat mechanics
- A2A message traffic
- RPM/Strategy files (these are internal agent context)
- Coaching/training data

---

## 8. Docker Deployment

### 8.1 Image Contents

```
docker-image/
├── openclaw/               # OpenClaw runtime
├── agents/                 # Pre-configured agent workspaces
│   ├── coo/
│   │   ├── IDENTITY.md
│   │   ├── SOUL.md
│   │   ├── AGENTS.md
│   │   ├── ROLE.md
│   │   ├── HEARTBEAT.md
│   │   ├── STATE.md
│   │   ├── RPM.md
│   │   ├── STRATEGY.md
│   │   └── sops/
│   ├── manager-1/
│   ├── worker-content/
│   ├── worker-dev/
│   ├── worker-copy/
│   └── coach/              # Internal only
├── db/                     # Database schema + seed data
│   ├── migrations/
│   └── seed/               # Default SOPs, task templates
├── backend/                # API server (credential proxy, task API, brain API)
└── config/
    └── org.json            # Org structure, heartbeat schedule, role mappings
```

### 8.2 First Boot

1. Docker starts all services (OpenClaw, DB, backend)
2. DB migrations run, seed data loads (default SOPs, org structure)
3. Agents boot, read their consciousness files
4. COO sends welcome message to user: "Your org is live. Drop a note in the inbox to get started."
5. User drops first note → COO routes it → org starts working

No setup wizard. No config. Just go.

---

## 9. Data Model (DB)

### 9.1 Core Tables

```sql
-- Tasks (user-facing "tasks", internal "quests")
tasks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status ENUM('planning','todo','in_progress','review','done','blocked'),
  priority ENUM('urgent','high','medium','low'),
  assignee_id UUID REFERENCES agents(id),
  manager_id UUID REFERENCES agents(id),
  project_id UUID REFERENCES projects(id),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Task Progress (comments, updates, blockers)
task_progress (
  id UUID PRIMARY KEY,
  task_id UUID REFERENCES tasks(id),
  agent_id UUID REFERENCES agents(id),
  type ENUM('progress_update','blocker','question','completion','review'),
  content TEXT,
  created_at TIMESTAMPTZ
)

-- Agents
agents (
  id UUID PRIMARY KEY,
  name TEXT,
  role TEXT,
  disc_profile TEXT,
  level ENUM('c_level','manager','worker','shared'),
  status ENUM('active','idle','offline'),
  stats JSONB  -- RPG stats: {speed: 7, quality: 8, ...}
)

-- Credentials (encrypted)
credentials (
  id UUID PRIMARY KEY,
  service_name TEXT,        -- 'shopify', 'instagram', etc.
  encrypted_value BYTEA,    -- AES-256 encrypted
  capabilities TEXT[],       -- ['read_products', 'write_products']
  created_by UUID,           -- user who added it
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ
)

-- Credential Audit Log
credential_usage (
  id UUID PRIMARY KEY,
  credential_id UUID REFERENCES credentials(id),
  agent_id UUID REFERENCES agents(id),
  action TEXT,              -- 'read_products'
  params JSONB,
  response_status INT,
  created_at TIMESTAMPTZ
)

-- User Creations (all deliverables)
creations (
  id UUID PRIMARY KEY,
  type TEXT,                -- 'content', 'funnel', 'copy', 'email', 'landing_page'
  title TEXT,
  content JSONB,            -- flexible schema per type
  task_id UUID REFERENCES tasks(id),  -- which task produced this
  created_by UUID REFERENCES agents(id),
  status ENUM('draft','review','approved','published'),
  created_at TIMESTAMPTZ
)

-- Inbox (user → org communication)
inbox (
  id UUID PRIMARY KEY,
  text TEXT,
  priority ENUM('urgent','high','medium','low'),
  status ENUM('open','routed','done'),
  assigned_to UUID REFERENCES agents(id),
  task_id UUID REFERENCES tasks(id),  -- linked task once routed
  created_at TIMESTAMPTZ
)

-- SOPs
sops (
  id UUID PRIMARY KEY,
  number TEXT UNIQUE,       -- 'SOP-001'
  title TEXT,
  content TEXT,             -- full SOP content (also exists as VM file)
  roles TEXT[],             -- which roles this SOP is attached to
  status ENUM('active','deprecated'),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Projects
projects (
  id UUID PRIMARY KEY,
  name TEXT,
  description TEXT,
  status ENUM('active','paused','completed'),
  created_at TIMESTAMPTZ
)
```

### 9.2 Brain Tables (Deferred — Separate PRD)

Brain/memory tables exist but are Phase 2 scope. The schema is already built from our Nexus brain system — it will be adapted for multi-tenant use.

---

## 10. COO Intelligence — The Adaptive Layer

The COO is the most critical agent. It's the bridge between user intent and org execution.

### 10.1 What Makes COO Special

1. **Strategy Adaptation** — When user gives feedback, corrects priorities, or redirects, COO updates RPM.md and STRATEGY.md. The whole org shifts.
2. **Pipeline Management** — Every agent always has 3-5 queued tasks. If a queue is thin, COO creates tasks from strategy.
3. **Inbox Routing** — User drops notes. COO determines team, priority, spec completeness. Routes in one heartbeat.
4. **Blocker Resolution** — COO escalates to user only when agents can't self-resolve. 3 strikes rule: 3 different approaches failed → escalate.
5. **Quality Gate** — COO is final reviewer before marking work "done."

### 10.2 Strategy Learning Loop

```
User gives direction ("Focus on Instagram this month")
    → COO updates STRATEGY.md priorities
    → COO rebalances task pipeline (more IG tasks, fewer other channels)
    → Managers get updated strategy on next heartbeat
    → Workers get tasks aligned to new priority
    → User sees org shift within one heartbeat cycle
```

The COO doesn't just follow instructions. It learns the user's patterns, preferences, and priorities over time and proactively adjusts.

### 10.3 Autonomy Target

**95% of tasks should complete without user intervention.** The COO tracks this metric:

- Tasks completed without user escalation / total tasks = autonomy rate
- Goal: 95%+
- If dropping below, COO identifies WHY (bad specs? missing SOPs? unclear strategy?) and fixes the system, not just the task.

---

## 11. Acceptance Criteria

### Must Have (Phase 1 Ship)

- [ ] Docker image builds and boots with full org in <5 minutes
- [ ] User can drop inbox notes and see them routed within one heartbeat
- [ ] Tasks flow through full pipeline (planning → done)
- [ ] All agents have DISC profiles and RPG stats visible on dashboard
- [ ] SOPs can be created, attached to roles, and appear in agent context index
- [ ] Credentials stored encrypted, agents never see raw values
- [ ] All user creations stored in DB, not filesystem
- [ ] COO adapts strategy when user gives direction
- [ ] Heartbeat chain runs staggered (workers → managers → COO)
- [ ] A2A messaging works between agents
- [ ] Audit trail on all credential usage and task changes
- [ ] User-facing terminology: "Tasks" (not "Quests")

### Should Have

- [ ] Task templates (pre-built task structures for common work types)
- [ ] SOP templates (starter SOPs for content, dev, copy workflows)
- [ ] Agent stats auto-calculated from task data (not manual)

### Won't Have (Phase 1)

- [ ] Browser automation
- [ ] Financial dashboard
- [ ] Brain/memory system (separate PRD)
- [ ] Custom agent creation
- [ ] Integration connectors (generic proxy only)
- [ ] Sage coaching (internal use only)

---

## 12. Open Questions

1. **Org composition for v1** — How many agents ship in the default Docker image? Minimum viable: COO + 1 Manager + 2 Workers = 4? Or the full 12+ we run now?
2. **Multi-tenant** — Does Phase 1 support one user per deployment, or multiple?
3. **User communication surface** — How does the user interact with the inbox? Web UI only? Telegram/Discord integration?
4. **SOP sync** — SOPs exist as VM files AND in DB (for the dashboard). How do we keep them in sync? Single source of truth?
5. **Stat calculation** — How often do we recalculate RPG stats? Every heartbeat? Daily? On task completion?

---

## 13. Risk & Mitigation

| Risk                                   | Impact                     | Mitigation                                                                |
| -------------------------------------- | -------------------------- | ------------------------------------------------------------------------- |
| Agent loops (stuck on task)            | Wasted compute, stale work | 3-strikes escape hatch baked into AGENTS.md                               |
| Credential leak via prompt injection   | Security breach            | Agents never see raw creds + backend proxy + injection defense in SOUL.md |
| Context bloat (too many SOPs injected) | Slow/expensive agent turns | Index-only injection, pull-on-demand                                      |
| COO single point of failure            | Org stops if COO breaks    | Auto-restart + simplified fallback mode (managers self-manage)            |
| User overwhelm                         | Abandonment                | Clean dashboard, minimal config, "just drop notes" simplicity             |
