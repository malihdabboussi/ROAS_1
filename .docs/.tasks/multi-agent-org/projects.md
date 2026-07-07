# Campaign-Scoped Agents — Plan

## Vision

Every business/brand the user manages is a **Campaign**. Campaigns already exist in Vibey. Agents are scoped per-campaign — a copywriter for Healing Waves is a different employee than a copywriter for Sefy Tofan. Each agent builds memory, context, and expertise specific to that campaign over time.

### Hierarchy (current → future)

**Now (solo user):**
```
Account → Campaigns → Missions/Tasks/Deliverables
```

**Future (agency tier):**
```
Account → Clients → Campaigns → Missions/Tasks/Deliverables
```

Clients = sub-accounts with their own campaigns, agents, billing, team access. We build toward this but don't implement it yet. Campaigns are the top-level scope for now.

---

## What Already Exists

### Vibey2.0 — `campaigns` table
Campaigns already exist with `id`, `user_id`, `name`, etc. Missions already have a potential link (not yet wired). The create side of the app uses campaigns as the main organizational unit.

### Nexus — Knowledge Brain (reference implementation)
The Nexus has a project brain model we port to campaigns:
- `context` JSONB — `{ purpose, result, description, industry, target_audience, tone }`
- `resources` JSONB — `{ website, drive_folder, repo, x, linkedin, youtube, substack, instagram, facebook, threads }`
- `current_priorities` TEXT[]
- Brain editor UI (Result, Purpose, Info, Resources, Priorities, Preview)

---

## Data Model Changes

### Existing: `campaigns` table — ADD knowledge brain columns

```sql
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS resources JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS current_priorities TEXT[] DEFAULT '{}';
```

`context` structure:
```json
{
  "purpose": "Help mothers and children sleep better through holistic practices",
  "result": "10,000 newsletter subscribers, $50K MRR",
  "description": "Wellness brand focused on sleep health for families",
  "industry": "Wellness / Sleep Health",
  "target_audience": "Mothers aged 25-45 with children who struggle with sleep",
  "tone": "Warm, empathetic, science-backed but accessible"
}
```

`resources` structure:
```json
{
  "website": "https://healingwaves.co",
  "drive_folder": "https://drive.google.com/...",
  "x": "https://x.com/healingwaves",
  "linkedin": null,
  "youtube": null,
  "instagram": "https://instagram.com/healingwaves",
  "facebook": null,
  "substack": null,
  "threads": null
}
```

### NEW: `campaign_agents` table — scoped agent instances

```sql
campaign_agents (
  id UUID PK,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  agent_key TEXT NOT NULL,          -- 'manager', 'copywriter', 'designer'
  name TEXT NOT NULL,               -- "Healing Waves Copywriter"
  status TEXT DEFAULT 'idle',       -- 'idle', 'working', 'offline'
  memory JSONB DEFAULT '{}',        -- what this agent has learned about this campaign
  config JSONB DEFAULT '{}',        -- agent-specific overrides
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, agent_key)
)
```

One manager per campaign. Auto-created when the first mission for a campaign is assigned (no explicit "hiring" UI yet — Sprint 3).

### Existing: `missions` table — ADD `campaign_id`

```sql
ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id);
```

### Existing: `tasks` table — already has `campaign_id` ✓

Tasks already have `campaign_id`. The trigger syncs it from the mission when creating the linked task.

### Existing: `mission_deliverables` — ADD `campaign_id`

```sql
ALTER TABLE mission_deliverables
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id);
```

Deliverables scoped to campaign so agents can find prior work.

---

## How Campaigns Change the Agent Flow

### Current flow (no campaign context):
```
User creates mission → Manager plans → Worker executes (generic, no context)
```

### New flow (campaign-scoped):
```
User picks campaign "Healing Waves" in Mission Control
User creates mission → mission.campaign_id = healing_waves_id

Manager starts planning:
  1. Load campaign.context (purpose, result, description, tone, industry)
  2. Load campaign.current_priorities
  3. Load campaign_agents[manager].memory (what Manager knows about HW)
  4. Load recent deliverables for this campaign (last 10)
  5. Create plan with full campaign context

Worker starts executing:
  1. Load campaign.context
  2. Load campaign_agents[copywriter].memory (what Copywriter knows about HW)
  3. Load recent deliverables from this campaign
  4. Execute with deep campaign knowledge

After execution:
  1. Deliverable saved with campaign_id
  2. Agent memory updated (what was learned this session)
  3. Mission logs scoped to campaign
```

### What the agent prompt looks like:

```
You are the Copywriter for "Healing Waves".

CAMPAIGN CONTEXT:
- Purpose: Help mothers and children sleep better through holistic practices
- Result: 10,000 newsletter subscribers, $50K MRR from online courses
- Industry: Wellness / Sleep Health
- Target Audience: Mothers aged 25-45 with children who struggle with sleep
- Tone: Warm, empathetic, science-backed but accessible
- Website: healingwaves.co

CURRENT PRIORITIES:
- Launch blog content hub (5 pillar articles)
- Build welcome email sequence
- Create lead magnet for opt-in

YOUR MEMORY (what you know from past work):
- Wrote the "About" page copy last week — brand voice is nurturing, uses "you" language
- Blog posts should be 600-800 words, conversational, with one clear takeaway

RECENT CAMPAIGN DELIVERABLES:
- "5 Breathing Exercises for Better Sleep" (blog post, done 2 days ago)
- "Welcome Email Sequence" (3-part series, done last week)

---
Now execute your mission: [mission title + brief]
```

---

## Agent Memory

Each `campaign_agents` row has a `memory` JSONB field. After every mission, the mission-worker updates the agent's memory:

```json
{
  "learned": [
    { "date": "2026-02-21", "note": "Brand voice is nurturing, uses 'you' language" },
    { "date": "2026-02-21", "note": "Blog posts should be 600-800 words with one clear takeaway" }
  ],
  "style_notes": "Warm, empathetic. Avoid clinical/medical language.",
  "completed_count": 12,
  "last_active": "2026-02-21T20:50:00Z"
}
```

The mission-worker asks the LLM to produce a memory update as part of its response:
```
After completing the mission, also provide a brief memory update — what did you learn about this campaign/brand that would help you do better work next time?
```

---

## Frontend Changes

### Updated: Campaign detail page
- Add **Knowledge** tab (port Brain editor from Nexus)
  - Result + Purpose
  - General Info (description, industry, target audience, tone)
  - Resources (website, socials, drive folder)
  - Current Priorities
- Add **Deliverables** tab — all deliverables produced for this campaign
- Add **Agents** tab (Sprint 3) — hired agents, status, memory preview

### Updated: Mission Control
- Campaign selector in quick capture (dropdown of user's active campaigns)
- Creating a mission attaches `campaign_id`
- Mission list shows campaign badge
- Filter by campaign (optional)

### Updated: Tasks
- Tasks inherit `campaign_id` from linked mission (via trigger)
- Campaign badge on task cards
- Filter by campaign (optional)

---

## Mission Worker Changes

### Context injection
When processing any phase (plan, execute, review), the mission-worker:

1. If `mission.campaign_id` exists:
   - Fetch `campaigns` row → extract context, resources, priorities
   - Fetch `campaign_agents` row for this agent + campaign → get memory
   - Fetch recent `mission_deliverables` for this campaign (last 10)
2. Build a campaign context block and prepend it to the system prompt

### Auto-create campaign agents
When a mission has `campaign_id` and no `campaign_agents` row exists for the required agent_key:
- Auto-insert a row with default name (`"{Campaign Name} {Agent Role}"`)
- This is the "auto-hire" behavior — no explicit UI needed yet

### Memory update
After execution completes (before moving to review):
1. Ask the LLM for a memory update
2. Append to `campaign_agents.memory.learned[]`
3. Update `campaign_agents.last_active` and `completed_count`

---

## Implementation Sprints

### Sprint 1: Campaign Brain + Scoped Missions + Agent Hierarchy (NOW)
- Add `context`, `resources`, `current_priorities` columns to `campaigns`
- Create `campaign_agents` table
- Add `campaign_id` to `missions` and `mission_deliverables`
- API: campaign brain CRUD (update context/resources/priorities)
- Frontend: Knowledge tab on campaign detail (port from Nexus)
- Mission Control: campaign selector in quick capture
- Mission creation attaches `campaign_id`
- Mission-worker: load campaign context + recent deliverables into prompts
- Mission-worker: auto-create campaign_agents on first use
- Mission-worker: agent memory updates after execution
- Trigger: sync `campaign_id` from mission to task

**Manager Agents (distinct from C-Level)**
- Managers are mid-level agents scoped to a single campaign or department
- `agents_registry.level` already supports `c_level`, `manager`, `employee`
- Context access rules enforced in mission-worker prompt building:
  - `c_level`: sees ALL campaigns, all agent memories, all deliverables, all priorities (org-wide view)
  - `manager`: sees ONLY their assigned campaign's brain, their own memory, their campaign's deliverables
  - `employee`: sees campaign context + their own campaign memory + the mission plan only
- Manager can plan + review within their campaign, but cannot route cross-campaign
- C-Level can delegate to Managers, Managers delegate to Employees
- Auto-create manager `campaign_agents` row when first campaign mission runs
- Templates: `docker/agents/templates/manager/` with DISC profile, SOUL, ROLE, IDENTITY

### Sprint 2: Knowledge Page Redesign + Asset Integration

**Goal:** The Knowledge page becomes a consolidated hub — manual strategic fields (Result, Purpose, Strategy, Resources) stay editable. Everything else auto-populates from existing campaign assets (Offers, Avatars, Themes). Rich card-based UI with previews.

**Phase 2A: Knowledge Page Layout Redesign**
- Two-column layout: left = campaign assets (auto), right = RPM strategy (manual)
- Right column: Result, Purpose, Strategy (large textareas, prominent) + Resources
- Left column: auto-populated cards from campaign assets
- Save only applies to manual fields (right column + resources)

**Phase 2B: Avatar Cards**
- Pull all avatars linked to campaign (via offer_id → offers.campaign_id)
- Card UI: circle avatar image (top-left), name, 2-line description from persona_data
- Hover effect on card
- Click → opens full avatar preview modal (read-only, shows complete persona)
- Future: generate avatar face image via NanoBanana Pro

**Phase 2C: Offer Cards (carousel if multiple)**
- Pull all offers linked to campaign_id
- Card UI: offer name, power offer statement (from step2_data), key benefits
- If multiple offers → horizontal carousel (dots + arrows, like funnel settings)
- Click → opens full offer preview (all 5 steps read-only)
- Shows: Product/Market (step1), Power Offer (step2), Buyer Persona (step3), ICP (step4), Competitive Edge (step5)

**Phase 2D: Brand Voice (from Theme)**
- Pull active theme for campaign (via funnels.theme_id or direct link)
- Display: tone, style, personality, brand values, tagline
- Read-only card — edit in Theme Settings
- If no theme linked → show "No theme applied" with link to Studio

**Phase 2E: Assets Summary Section**
- Show counts/cards for all campaign assets: funnels, lead magnets, sequences, ads
- Each as a small card: name, type, status (draft/published)
- Click → navigates to Studio with that asset open

**Phase 2F: Mission Worker — Pull from Assets**
- Update buildCampaignContext() to also pull from:
  - offers.step1_data → product/market context
  - offers.step2_data → power offer (what we sell)
  - offers.step3_data / avatars.persona_data → target audience (deep)
  - offers.step5_data → competitive edge
  - branding_themes.brand_voice → tone/style/personality
  - branding_themes.brand_values → brand positioning
- This replaces the manual Knowledge fields for agent context
- Manual fields (result, purpose, strategy) still loaded from campaigns.context

### Sprint 2.5: Campaign Knowledge Graph

**Concept:** Each campaign gets its own knowledge graph — not flat document storage, not traditional RAG. A graph of nodes (everything the campaign produces/receives) with typed edges (relationships). Agents traverse the graph to find exactly what they need instead of searching through documents.

**Three Knowledge Layers (how they relate):**
1. **SK Brain** (per agent, $10/mo) — Domain expertise. How to write copy, sales frameworks. The "skill" layer. See `brain-integration.md`.
2. **User Brain** (per user, paid plans) — Personal context. Preferences, decisions, history. The "who you are" layer. See `brain-integration.md`.
3. **Campaign Knowledge Graph** (per campaign, included) — Business context + operational knowledge. Everything about this specific campaign. **This sprint.**

**Phase 2.5A: Campaign Graph Schema**
- `campaign_nodes` table: id, campaign_id, user_id, node_type, title, content, content_embedding (pgvector), source_type, source_id, metadata, created_at, updated_at
  - `node_type`: 'deliverable', 'document', 'offer', 'avatar', 'theme', 'agent_learning', 'user_upload', 'url_import'
  - `source_type`: 'mission', 'upload', 'drive', 'dropbox', 'url', 'auto_sync'
  - `source_id`: links back to the original record (mission_deliverables.id, offers.id, etc.)
- `campaign_edges` table: id, campaign_id, from_node_id, to_node_id, edge_type, strength, auto_generated, metadata, created_at
  - `edge_type`: 'connected', 'evolved_from', 'contradicts', 'used_by', 'created_by', 'references', 'supersedes'
  - `strength`: 0.0 to 1.0 (decays if not reinforced)
- Indexes: campaign_id, node_type, embedding vector (ivfflat), from_node_id, to_node_id
- RLS: user_id = auth.uid()

**Phase 2.5B: Auto-Node Creation**
- When a deliverable is created by an agent → auto-create a node (type: 'deliverable', source_id: deliverable.id)
- When an offer/avatar/theme is linked to a campaign → auto-create a node
- When agent memory is updated → auto-create a node (type: 'agent_learning')
- Each node gets an embedding on creation (gemini-embedding-001)

**Phase 2.5C: Auto-Edge Creation**
- On node creation: find similar nodes via vector search (min 0.7 similarity) → create 'connected' edges
- Deliverable → offer it was based on: 'references' edge
- Deliverable v2 → deliverable v1: 'evolved_from' edge (same mission retry)
- Agent learning → deliverable that triggered it: 'created_by' edge
- Same agent, same campaign, sequential missions: 'connected' edge between deliverables

**Phase 2.5D: Cron — Graph Self-Organization**
- **Backfill edges:** Find campaign nodes with embeddings but few edges, vector-search similar nodes, ask Gemini to classify relationship type + strength, create edges with `auto_generated: true`
- **Validate edges:** Auto-generated edges older than 30 days → re-evaluate, decay strength if weak, prune if below 0.2
- Same pattern as NeuralSnap cron (brain-integration.md Priority 3)

**Phase 2.5E: User Document Import**
- Upload: PDF/doc/txt → extract text → create node (type: 'user_upload') → embed → auto-connect
- URL import: scrape page text → create node (type: 'url_import') → embed → auto-connect
- Google Drive sync (future, Sprint 3E): folder → poll for new files → auto-import as nodes
- Dropbox sync (future): same pattern

**Phase 2.5F: Agent Graph Access (replaces flat context injection)**
- When building campaign context in mission-worker, instead of listing "last 10 deliverables":
  - Take the mission brief, embed it
  - Traverse campaign graph: seed with vector-similar nodes, then traverse edges 2 hops deep (same as NeuralSnap graph search)
  - Inject top-ranked nodes as context (title + content snippet + relationship chain)
- Agents see WHY a node is relevant: "Blog post 'Sleep Tips for Moms' (connected → Email Sequence 'Welcome Arc', evolved_from → Blog v1)"
- Context access rules still apply: employees get fewer hops, c_level gets full traversal

**Phase 2.5G: Campaign Knowledge UI**
- Knowledge tab on campaign page gets a "Documents" section
- Upload button + URL import input
- List of campaign nodes grouped by type (deliverables, uploads, imports)
- Visual graph view (optional, future) — nodes + edges like NeuralSnap brain visualization
- Search: hybrid mode (semantic + graph traversal) across campaign nodes

### Sprint 3: Agent Hiring + Management

**Phase 3A: Team Page — Nexus-Style Layout**
- Left panel: CharacterCard with agent info (name, role, DISC profile, level badge, status)
- Left panel: Performance stats with stat bars (execution_speed, quality, reliability, initiative, communication, spec_adherence, learning_rate, overall score out of 10)
- Left panel: Skills badges, projects, bio
- Bottom of left panel: Agent carousel — horizontal scrollable row of all agent avatars, click to select
- Right panel: **Agent Chat** — direct conversation with the selected agent (replaces the Nexus hero art/3D viewer)
  - Chat input at bottom, message history above
  - Uses OpenClaw session for the selected agent
  - User can ask the agent questions, give instructions, or just talk
  - Agent responds in its DISC personality / communication style
- Mobile: swipeable cards with dot indicators, chat below

**Phase 3B: Agent Performance Scoring + Full CharacterCard**

**DB:**
- Add `stats JSONB DEFAULT '{}'` column to `agents_registry`
- Stats shape: `{ execution_speed, quality, reliability, initiative, communication, spec_adherence, learning_rate, overall, missions_scored, last_scored_at }`

**Mission-worker scoring:**
- After review phase approved (`finalStatus === 'done'`), auto-score the worker agent
- `quality` = `qualityScore` from manager review (rolling avg, last 10 missions weighted)
- `reliability` = 10 if approved first try, decays per revision (10 - revision_count * 2.5)
- `initiative`, `communication`, `spec_adherence` = proxy from qualityScore (diverge over time)
- `learning_rate` = grows with `missions_scored` count (min 3, max 10)
- `execution_speed` = 5 baseline (calibrated later when duration is tracked)
- `overall` = average of all 7 metrics
- Update `agents_registry.stats` JSONB via service role

**CharacterCard UI (full Nexus parity):**
- 7 metric bars with real scores (Speed, Quality, Reliable, Initiative, Comms, Spec, Learning)
- Overall score badge top-right: crown icon + X.X / 10, color tiers (red/orange/yellow/lime/green)
- Mission counters row: `N todo · N active · N blocked · last active X ago`
- Bio line from `config.style_description` (one-liner personality descriptor)
- "Scores available after missions" placeholder when `missions_scored === 0`

**Phase 3C: Agent Hiring UI**
- Explicit "Hire Agent" UI in campaign detail
- HR agent conversational flow for creating new agents
- DISC profile selection, communication style, name, role

**Phase 3D: Agent Configuration**
- Agent configuration (custom instructions, style overrides)
- Agent memory viewer + editor
- Edit agent definitions from the UI (IDENTITY.md, SOUL.md, ROLE.md)

**Phase 3E: External Integrations**
- Google Drive folder sync → auto-import files as campaign graph nodes
- Dropbox folder sync → same pattern
- Meeting transcript import (Fathom/Fireflies) → auto-crystallize into campaign nodes

### Sprint 4: Agency Tier (future)
- `clients` table above campaigns
- Client = sub-account with own campaigns, agents, billing
- Agency dashboard — view all clients
- Team access / permissions
- Cross-client reporting

---

## Decisions (Resolved)

1. **One manager per campaign** — Yes. Each campaign gets its own manager with scoped memory.
2. **Agent hiring** — Auto-create on first mission assignment (Sprint 1). Explicit hiring UI in Sprint 3.
3. **Hierarchy** — Campaigns are the top-level scope now. Clients layer added in Sprint 4 for agency accounts.
4. **Campaign selector UX** — Dropdown in Mission Control quick capture. No global sidebar switcher yet.
5. **Campaign Knowledge** — Knowledge graph (not RAG). Each campaign gets a graph of nodes + typed edges. Agents traverse the graph instead of searching documents. Sprint 2.5.
6. **Three Knowledge Layers** — SK Brain (per agent, domain expertise), User Brain (per user, personal context), Campaign Knowledge Graph (per campaign, business + operational). Each serves a different purpose. They don't overlap.
7. **Google Drive / Dropbox** — Sprint 3E. Documents imported as campaign graph nodes with auto-connections.
