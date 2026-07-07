# Brain Architecture -- Narrative Knowledge System

> Last updated: April 5, 2026
> Status: Architecture finalized, Phase 1 implementation starting

---

## What This Document Covers

This is the complete architecture for upgrading Vibey's brain from a flat RAG store (retrieve scattered memories on every query) to a narrative-based, compounding knowledge system where Atlas (the Brain Scholar agent) maintains an organized library of synthesized knowledge.

The system is inspired by two frameworks:

- **Andrej Karpathy's LLM Wiki pattern** -- a persistent, interlinked wiki maintained by an LLM that compiles knowledge once and keeps it current, rather than re-deriving answers from raw fragments on every query
- **Joe Dispenza's memory-to-belief model** -- memories (thought + emotion) form patterns that become beliefs, beliefs cluster into perspectives (worldviews), and the whole system tracks evolution over time

---

## The Core Idea

Today, Vibey's brain stores individual memories, snapshots, and SK entries in database tables. When an agent needs context, `BrainContextService` runs a semantic search and returns the top 10 matches. This is standard RAG. It works for targeted retrieval but has fundamental problems:

- 500 scattered memories are individually true but collectively incoherent
- No synthesis happens -- memory #47 and memory #312 might tell a story together, but the system doesn't know that
- Contradictions go undetected -- the user's brand voice evolved but old and new memories coexist without reconciliation
- Knowledge doesn't compound -- campaign 5 doesn't automatically benefit from campaigns 1-4
- Compaction destroys knowledge -- when sessions fill up, older messages are summarized and lost

The upgrade adds a **narrative layer** between raw entries and retrieval. Atlas maintains structured markdown pages that synthesize raw memories into coherent topics. Instead of returning 10 random memories, the system can serve compiled, cross-referenced knowledge that tells a story.

---

## Who Sees What

This is the most important architectural decision. The wiki is NOT for all agents.

**Regular agents** (copywriter, designer, analyst, etc.) continue to get exactly what they get today: 10 semantically-matched memories + 10 snapshots + SK entries, targeted to the current user message. This works well for task-specific context. The wiki would add tokens without improving relevance for these agents.

**Atlas** is the only agent who reads the wiki. It IS his workspace -- actual markdown files on his Fly.io machine. When a user talks to Atlas, his context comes from his organized library. When Atlas gets a background mission to organize or analyze, he reads and writes his library files.

**Support agents** also get wiki-based context (capsule + relevant pages) because they answer broad questions about the user's business.

---

## The Knowledge Hierarchy

Raw data compresses through layers, each one smaller and more meaningful than the last:

```
500 raw memories (ns_memories -- scattered, emotionally tagged)
  ↓ Library Organization (Job 1 -- Atlas)
15-20 narrative pages (ns_narrative_pages -- organized by topic)
  ↓ Pattern Recognition (Job 2 -- Atlas)
10-20 beliefs (ns_belief_patterns -- detected from organized pages)
  ↓ Perspective Synthesis (part of Job 2)
3-5 perspectives (ns_perspectives -- worldviews with narrative markdown)
  ↓ Distillation
1 capsule (CAPSULE.md -- 150 words, the essence of everything)
  ↓ Navigation
1 index (INDEX.md -- Atlas's map of every page)
```

Each layer is independently queryable. Atlas works primarily at the page level. He drops to raw memories only when he needs evidence or detail.

---

## Atlas's Workspace (The Library)

Atlas's workspace on Fly.io looks like this:

```
~/agents/atlas/
├── ROLE.md
├── SOUL.md
├── skills/brain-library-organization/SKILL.md
├── skills/brain-pattern-analysis/SKILL.md
├── brain/                                   <-- THE WIKI (flat, no subfolders)
│   ├── INDEX.md                             <-- map of all pages, grouped by meaning
│   ├── CAPSULE.md                           <-- 150-word essence (loaded into every Atlas turn)
│   ├── LOG.md                               <-- recent brain log entries
│   ├── brand-voice.md
│   ├── target-audience.md
│   ├── marketing-strategy.md
│   ├── competitive-landscape.md
│   ├── competitor-jasper.md
│   ├── product-healing-waves.md
│   ├── ad-performance.md
│   ├── campaign-q2-launch.md
│   ├── campaign-learnings.md
│   └── strategy-evolution.md
```

**Why flat, not folders:** Research on how brains organize information (schemas + associative networks, not categories), Zettelkasten knowledge management for AI agents (connections over hierarchy), and Karpathy's own recommendation (LLM decides taxonomy, cross-references instead of folders) all point to the same conclusion: folder hierarchies (topics/entities/synthesis) force classification decisions that don't help Atlas navigate. INDEX.md handles conceptual grouping by meaning -- Atlas reads one file and has his full map. The `page_type` column in `ns_narrative_pages` still exists for database queries, but it doesn't map to a folder.

These files are synced between Supabase (`ns_narrative_pages` table) and disk:

- **Download on boot:** When Atlas's machine wakes up, `AgentSyncService` syncs pages from Supabase to disk (same pattern as session JSONL syncing)
- **Write-through on update:** When Atlas calls `update_narrative_page` via `vibey_backend`, the action handler writes to both Supabase and disk

Atlas reads pages via OpenClaw's native file reading (fast, zero tool calls). He writes pages via `vibey_backend` actions (persists to DB + syncs to disk).

---

## Three Jobs, All Event-Driven

Atlas has three distinct background jobs. None run on a timer. Each triggers when enough change justifies a run.

### Job 1: Library Organization

**What:** Organize new memories into narrative wiki pages. Focused and incremental -- only processes the latest batch.

**Trigger:** Every 10 new memories saved to the brain. Event-driven hook, not a cron.

**How it works:**

1. Every ingestion service (conversation-processing, document-ingestion, sk-ingestion) calls `brainOpsHook.onMemoriesSaved(brainId, count)` after saving memories
2. The hook atomically increments `ns_brains.memories_since_last_sync`
3. When the counter reaches 10, the hook resets it and enqueues a `brain_library_sync` job to the `brain-ops` BullMQ queue
4. The queue processor fetches ONLY the new memories (created since `last_library_sync_at`) and builds an Atlas mission payload
5. Atlas receives the mission with just the new batch in context
6. For each memory: if it fits an existing page, patch it. If it doesn't fit, skip it (the memory stays in `ns_memories`, searchable, not lost). If 3+ new memories cluster around a new theme, create a page -- and use `search_memory` to find older related memories to enrich it.
7. Update INDEX.md and CAPSULE.md if needed, log via `log_brain_event`

**What happens to memories that don't fit any page?** They stay in the brain as individual memories. They're fully searchable via `search_memory`. They're NOT lost. They'll be picked up later by Job 3 (Lint) if they form a cluster, or by a future Job 1 when Atlas creates a new page and searches for related content.

**Pipeline:**

```
Memories saved by any ingestion pipeline
  → brainOpsHook.onMemoriesSaved(brainId, count)
  → Counter increments atomically (Supabase RPC)
  → When counter >= 10:
      → Reset counter
      → Enqueue brain_library_sync to brain-ops queue
      → Processor fetches new memories only + builds mission
      → Atlas receives mission via OpenClaw
      → Atlas organizes new memories into pages (patches existing, creates new if cluster found)
      → When creating a new page: Atlas calls search_memory to find older related memories
      → After completion: increment pages_updated_since_last_analysis + syncs_since_last_lint
```

**Mission context for Atlas:**

- `[CONTEXT]`: ONLY the new memories since last sync (full content, with emotional tags, significance, source info)
- Task prompt: references `/brain-library-organization` skill, explains why the work matters, gives the workflow
- Atlas reads his workspace files for current library state (no pages in context -- they're on disk)

### Job 2: Pattern Recognition (Dispenza Layers)

**What:** Read organized narrative pages and detect belief patterns forming across topics. Create, reinforce, challenge, or archive beliefs. Synthesize perspectives when the belief landscape changes.

**Trigger:** 5 narrative pages updated since last analysis.

**How it works:**

1. After Job 1 completes, `brainOpsHook.onPagesUpdated(brainId, pagesCount)` increments `pages_updated_since_last_analysis`
2. When the counter reaches 5, enqueue `brain_pattern_analysis` to the `brain-ops` queue
3. Atlas receives the mission with no extra context -- he reads his own organized pages from disk
4. Atlas applies the `brain-pattern-analysis` skill (Dispenza framework) to detect patterns across topic pages
5. Atlas creates/updates/archives beliefs and perspectives via full CRUD actions

**Key insight:** Job 1 does the heavy lifting of organizing raw memories into pages. Job 2 reads 15-20 organized pages instead of scanning 500 raw memories. The organization work already clusters related memories by topic, notes contradictions, and tracks evolution. Pattern detection becomes reading comprehension, not data mining.

**Pipeline:**

```
Job 1 completes → pages_updated_since_last_analysis increments
  → When counter >= 5:
      → Reset counter
      → Enqueue brain_pattern_analysis to brain-ops queue
      → Atlas reads organized pages from workspace
      → Atlas applies Dispenza framework
      → Atlas writes beliefs/perspectives via vibey_backend actions
```

### Job 3: Library Lint (Health Check)

**What:** Periodic holistic review of the entire brain. Atlas steps back from incremental syncs and looks at the big picture -- are there gaps, contradictions, stale content, or orphaned memory clusters that deserve attention?

**Trigger:** Every 10 page updates (cumulative across Job 1 syncs), OR on-demand when the user asks Atlas to review the brain health.

**Why this exists separately from Job 1:** Job 1 is incremental -- it sees 10 new memories at a time. It can't know that 3 memories from January, 2 from February, and 4 from March all form a theme about "pricing strategy" that was never organized into a page. Job 3 is the holistic check that catches what incremental syncs miss.

**What Atlas checks:**

- **Missing pages** -- memory clusters that deserve a page but don't have one. Atlas uses `search_memory` with broad topic queries to find unorganized clusters.
- **Stale pages** -- pages that haven't been updated in 30+ days while new memories exist that should have touched them.
- **Contradictions** -- pages that disagree with each other (strategy page says X, latest campaign page shows Y).
- **Orphan pages** -- pages with no cross-references to other pages (isolated knowledge).
- **Missing cross-references** -- pages that clearly relate but aren't linked.
- **Shallow pages** -- pages with fewer than 3 source memories (thin evidence).

**How it works:**

1. `brainOpsHook.onPagesUpdated()` also increments `syncs_since_last_lint`
2. When the counter reaches 10, enqueue `brain_lint` to the `brain-ops` queue
3. Atlas receives the mission, reads his entire library from workspace
4. Atlas runs each check, uses `search_memory` to spot-check whether pages reflect what's in the brain
5. For missing page clusters: Atlas creates new pages (enriched via `search_memory` for full evidence)
6. For contradictions/staleness: Atlas updates affected pages
7. Findings logged via `log_brain_event` with event_type `lint_pass`

**Pipeline:**

```
Job 1 completes → syncs_since_last_lint increments
  → When counter >= 10:
      → Reset counter
      → Enqueue brain_lint to brain-ops queue
      → Atlas reads entire library from workspace
      → Atlas checks: missing pages, stale, contradictions, orphans, shallow
      → Atlas fixes what he can (create pages, update stale, add links)
      → Atlas logs findings
```

**Schema addition:**

```sql
ALTER TABLE ns_brains ADD COLUMN IF NOT EXISTS syncs_since_last_lint integer DEFAULT 0;
ALTER TABLE ns_brains ADD COLUMN IF NOT EXISTS last_lint_at timestamptz;
```

---

## The Dispenza Model (Memories → Beliefs → Perspectives)

Based on Joe Dispenza's research on how the brain forms identity through repeated thought-emotion patterns.

### Current Implementation State

| Layer                      | What                                                                       | Status                                                                                                                                                           |
| -------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1: Crystallization        | Raw text → structured neural snapshot (16-field format)                    | Fully implemented, working                                                                                                                                       |
| L2: Emotional Tagging      | Each memory tagged with source_emotion, valence, intensity, speaker_intent | Fully implemented, automatic on every memory save                                                                                                                |
| L3: Emotional Observations | Separate log of "user felt X about Y"                                      | Bypassed -- L2 tags on memories are sufficient, `ns_emotional_responses` table exists but is empty in production                                                 |
| L4: Pattern Detection      | Cluster emotional patterns into beliefs                                    | Code exists (`detectPatterns()`) but reads from empty `ns_emotional_responses`. Needs rewiring to read from `ns_memories` directly. Will become Atlas-driven.    |
| L5: Perspective Synthesis  | Cluster beliefs into worldviews                                            | Table exists (`ns_perspectives`), read endpoint exists. Write/synthesis logic does NOT exist -- `getPerspectives()` is read-only. Will be built as Atlas-driven. |

### Architecture Decision: Skip L3, Rewire L4

L2 tagging already stamps every memory with emotional data (`source_emotion`, `emotional_valence`, `emotional_intensity`, `speaker_intent`). L4 (`detectPatterns()`) was reading from `ns_emotional_responses` (empty) instead of `ns_memories` (populated). The fix: rewire L4 to query `ns_memories WHERE source_emotion IS NOT NULL`. This eliminates the dead L3 link.

### Architecture Decision: Atlas-Driven, Not Pipeline

Pattern detection and perspective synthesis are **Atlas missions**, not backend pipeline calls.

Why: A pipeline sends a single prompt to Gemini and parses JSON. Atlas reasons through the data multi-step -- he can say "this contradicts what I saw last month" because he has full brain context (existing beliefs, perspectives, the organized library). Atlas decides what's a pattern vs noise, what to reinforce vs challenge, when beliefs cluster into perspectives.

### The Dispenza Framework for Atlas

Atlas has a skill (`brain-pattern-analysis/SKILL.md`) grounded in Dispenza's research:

**What a memory is:** A thought fused with an emotion. The emotional tag is not metadata -- it is half the memory. A memory tagged "frustrated, valence -0.7" about ad spend is not just "user dislikes ads" -- it's an emotional charge that, when repeated, forms a belief.

**How beliefs form:** Repeated emotional responses to the same category of situation. Frequency + emotional consistency + behavioral evidence = belief. Not just "these memories are similar" -- the repetition of the thought-emotion pattern is what makes it a belief.

**Belief classification:**

- Limiting vs empowering (expands or restricts possibilities)
- Conscious vs unconscious (explicitly stated vs only visible in patterns)
- Lifecycle: emerging → active → challenged → transforming → resolved

**How perspectives form:** When 3+ beliefs align into a coherent worldview. The perspective is the narrative that ties beliefs together AND explains them. Every perspective creates blind spots that Atlas should name.

**Evolution tracking:** Beliefs are not static. The narrative captures temporal arcs: "In January, the user strongly believed X. After Campaign 3's results in March, they began questioning it."

---

## Database Schema

### Existing Tables (relevant to this architecture)

| Table                    | Purpose                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `ns_brains`              | Brain containers (user brain, agent brains, campaign brains)                                                 |
| `ns_memories`            | Raw memories with L2 emotional tags (source_emotion, emotional_valence, emotional_intensity, speaker_intent) |
| `ns_snapshots`           | Neural snapshots (crystallized knowledge, 16-field format)                                                   |
| `ns_sk_entries`          | Scholar Knowledge entries (curated domain expertise)                                                         |
| `ns_memory_connections`  | Graph edges between memories                                                                                 |
| `ns_belief_patterns`     | Detected belief patterns (exists, partially populated)                                                       |
| `ns_perspectives`        | Higher-order worldviews (exists, empty -- no write logic yet)                                                |
| `ns_emotional_responses` | Emotional observations (exists, empty -- bypassed in this architecture)                                      |

### New Tables

**`ns_narrative_pages`** -- the wiki layer

```sql
CREATE TABLE ns_narrative_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_id uuid NOT NULL REFERENCES ns_brains(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  page_type text NOT NULL DEFAULT 'topic',  -- topic | entity | synthesis | capsule
  content_md text NOT NULL DEFAULT '',
  summary text,
  source_refs jsonb DEFAULT '[]',           -- [{type: "memory"|"snapshot"|"belief"|"sk", id: uuid}]
  last_synthesis_at timestamptz,
  version integer DEFAULT 1,
  embedding vector(768),
  tags text[] DEFAULT '{}',
  status text DEFAULT 'active',             -- active | stale | archived
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brain_id, slug)
);
```

Page types:

- **capsule**: one per brain, ~150 words, loaded into every Atlas turn
- **topic**: domain pages (Brand Voice, Target Audience, Marketing Strategy)
- **entity**: pages about specific things (Competitor: Jasper, Product: Healing Waves)
- **synthesis**: cross-cutting analysis (Campaign Learnings, Strategy Evolution)

**`ns_narrative_links`** -- cross-references between pages

```sql
CREATE TABLE ns_narrative_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_page_id uuid NOT NULL REFERENCES ns_narrative_pages(id) ON DELETE CASCADE,
  to_page_id uuid NOT NULL REFERENCES ns_narrative_pages(id) ON DELETE CASCADE,
  link_type text DEFAULT 'related',  -- related | supports | contradicts | evolved_from
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(from_page_id, to_page_id)
);
```

**`ns_brain_log`** -- chronological knowledge evolution

```sql
CREATE TABLE ns_brain_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_id uuid NOT NULL REFERENCES ns_brains(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  summary text NOT NULL,
  affected_pages text[] DEFAULT '{}',
  source_ref jsonb,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Event types: `ingest`, `update_page`, `create_page`, `detect_pattern`, `synthesize_perspective`, `lint_pass`, `contradiction_resolved`, `compaction_extract`, `user_correction`

**`ns_brain_lint_results`** -- health check findings (Phase 5)

```sql
CREATE TABLE ns_brain_lint_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_id uuid NOT NULL REFERENCES ns_brains(id) ON DELETE CASCADE,
  check_type text NOT NULL,      -- contradiction | stale | orphan | gap | shallow
  severity text DEFAULT 'info',  -- info | warning | critical
  title text NOT NULL,
  description text,
  affected_refs jsonb DEFAULT '[]',
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Schema Additions to Existing Tables

```sql
ALTER TABLE ns_brains ADD COLUMN IF NOT EXISTS memories_since_last_sync integer DEFAULT 0;
ALTER TABLE ns_brains ADD COLUMN IF NOT EXISTS last_library_sync_at timestamptz;
ALTER TABLE ns_brains ADD COLUMN IF NOT EXISTS pages_updated_since_last_analysis integer DEFAULT 0;
ALTER TABLE ns_brains ADD COLUMN IF NOT EXISTS last_pattern_analysis_at timestamptz;
ALTER TABLE ns_perspectives ADD COLUMN IF NOT EXISTS narrative_md text;
```

---

## Atlas's vibey_backend Actions (Full CRUD)

Atlas has full CRUD + lifecycle operations on all brain entities. 26 total actions registered in the `system_brain` capability profile.

### Beliefs (7 actions)

| Action                          | Purpose                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `get_belief_patterns`           | Read beliefs, filter by status/strength                                        |
| `create_belief_pattern`         | Create new belief with description, emotional signature, supporting memory IDs |
| `update_belief_pattern`         | Update any field (description, strength, status, emotional signature)          |
| `archive_belief_pattern`        | Set status to 'resolved', set resolved_at                                      |
| `merge_belief_patterns`         | Merge two beliefs, combine supporting memories, archive weaker                 |
| `connect_belief_to_memory`      | Add a memory ID to supporting_memories[]                                       |
| `disconnect_belief_from_memory` | Remove a memory ID from supporting_memories[]                                  |

### Perspectives (6 actions)

| Action                               | Purpose                                                            |
| ------------------------------------ | ------------------------------------------------------------------ |
| `get_perspectives`                   | Read perspectives, filter by status                                |
| `create_perspective`                 | Create with narrative_md, belief IDs, influence areas, blind spots |
| `update_perspective`                 | Update any field (narrative_md, strength, status, blind_spots)     |
| `archive_perspective`                | Set status to 'transformed'                                        |
| `connect_belief_to_perspective`      | Add a belief ID to beliefs[]                                       |
| `disconnect_belief_from_perspective` | Remove a belief ID from beliefs[]                                  |

### Narrative Pages (6 actions)

| Action                   | Purpose                                                                    |
| ------------------------ | -------------------------------------------------------------------------- |
| `get_narrative_pages`    | Read pages by slug, type, or list all with summaries                       |
| `create_narrative_page`  | Create page with slug, title, type, content_md, summary, tags, source_refs |
| `update_narrative_page`  | Update content_md, summary, tags, source_refs, increment version           |
| `archive_narrative_page` | Set status to 'archived'                                                   |
| `link_narrative_pages`   | Create cross-reference between two pages                                   |
| `unlink_narrative_pages` | Remove cross-reference                                                     |

### Memory Operations (2 actions)

| Action                   | Purpose                                          |
| ------------------------ | ------------------------------------------------ |
| `search_memory`          | Search memories by query/emotion/tags (existing) |
| `get_memory_connections` | Read connections for a memory                    |

### Brain Log + Lint (5 actions)

| Action               | Purpose                       |
| -------------------- | ----------------------------- |
| `get_brain_log`      | Read recent log entries       |
| `log_brain_event`    | Append to brain evolution log |
| `get_brain_lint`     | Read lint results             |
| `run_brain_lint`     | Trigger lint checks           |
| `resolve_brain_lint` | Mark lint result as resolved  |

### Action Registration Chain

Every new action must be registered in 6 files:

1. `apps/agent-api/src/modules/artifacts/dtos/artifact-action.dto.ts` -- action name constants
2. `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.ts` -- handler implementations
3. `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts` -- action name → handler mapping
4. `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts` -- `system_brain` allowlist
5. `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts` -- documentation for the model
6. `docker/tools/vibey-backend/index.ts` -- SUPPORTED_ACTIONS list

---

## Context Loading (Two Paths)

### Path A: Atlas + Support Agents (wiki-based)

```
User message arrives
  → Load capsule (ns_narrative_pages WHERE page_type = 'capsule')
  → Load page index (all page titles + summaries)
  → Embed user message
  → Search ns_narrative_pages by embedding → top 2-3 relevant pages
  → Concatenate: capsule + index + relevant pages
  → Inject as [CONTEXT]
```

Atlas also has the wiki as workspace files on disk for deeper reading during his turn.

### Path B: All Other Agents (existing RAG, unchanged)

```
User message arrives
  → Semantic search ns_memories → top 10 memories
  → Semantic search ns_snapshots → top 10 snapshots (with graph expansion)
  → Semantic search ns_sk_entries → top 10 SK entries (if agent brain exists)
  → Concatenate as flat text
  → Inject as [CONTEXT]
```

No change to existing `BrainContextService` for regular agents.

### Implementation

Conditional in `BrainContextService.buildFullContext()`:

```typescript
if (agentRole === 'system_brain' || agentRole === 'support') {
  return this.buildWikiContext(userId, agentKey, query, orgId)
} else {
  return this.buildRagContext(userId, agentKey, query, orgId)
}
```

---

## Campaign Narrative Pages

Campaigns get their own narrative pages in the same `ns_narrative_pages` table. The `brain_id` determines scope:

- **User brain** → user-level pages (brand voice, personal preferences, business strategy)
- **Agent brain** → agent-level pages (domain expertise compilations, style guides)
- **Campaign brain** → campaign-level pages (campaign strategy, audience insights, performance learnings)

Cross-campaign synthesis happens at the user brain level: a "Campaign Learnings" page that pulls insights from all campaign-scoped pages.

---

## Additional Systems (Later Phases)

### Compaction-to-Brain Pipeline

Before OpenClaw compaction discards old messages, extract knowledge into the brain via `ConversationProcessingService`. The compaction-safeguard extension calls the brain ingestion endpoint with the messages being compacted (fire-and-forget, non-blocking). This feeds the library organization pipeline.

File: `apps/openclaw/src/agents/pi-extensions/compaction-safeguard.ts`

### Knowledge Lint

Periodic health-check on brain content. Atlas-driven, triggered on-demand or by schedule. Checks: contradictions between pages, stale entries (not recalled in 60+ days), orphaned entries (no connections), gaps (referenced concepts without pages), shallow pages (insufficient evidence).

Results saved to `ns_brain_lint_results`.

### Knowledge Evolution Log

Append-only record of everything that happens in the brain. Every brain operation appends a log entry with event_type, summary, affected pages, and source reference. Atlas can query "what did the brain learn this week?" and recent log entries inform his library organization decisions.

Saved to `ns_brain_log`.

---

## Implementation Phases

| Phase   | What                                                                               | Trigger                                                     |
| ------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Phase 1 | Library Organization -- Atlas organizes memories into narrative wiki pages         | Every 10 new memories (event-driven hook)                   |
| Phase 2 | Pattern Recognition -- Atlas detects beliefs and perspectives from organized pages | Every 5 page updates (event-driven hook, Job 1 feeds Job 2) |
| Phase 3 | Tiered Context -- Atlas + support agents get wiki context, other agents unchanged  | Built into BrainContextService                              |
| Phase 4 | Compaction Pipeline -- extract knowledge before session compaction                 | OpenClaw compaction event                                   |
| Phase 5 | Knowledge Lint -- health-check for contradictions, staleness, gaps                 | On-demand or periodic Atlas mission                         |
| Phase 6 | Knowledge Log -- chronological brain evolution audit trail                         | Every brain write operation                                 |

---

## Key Files Reference

| Area                      | Path                                                                              | Purpose                                                       |
| ------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Brain context (agent-api) | `apps/agent-api/src/modules/brain/services/brain-context.service.ts`              | Builds [CONTEXT] for agent turns -- will add wiki path        |
| Emotional intelligence    | `apps/api/src/modules/brain/services/emotional-intelligence.service.ts`           | `detectPatterns()`, `getPerspectives()` -- needs rewiring     |
| Emotional tagging (L2)    | `apps/api/src/modules/brain/services/emotional-tagging.service.ts`                | Tags memories with emotion data -- working, no changes needed |
| Conversation processing   | `apps/api/src/modules/brain/services/conversation-processing.service.ts`          | Extracts memories from conversations -- will add hook call    |
| Document ingestion        | `apps/api/src/modules/brain/services/document-ingestion.service.ts`               | Ingests documents -- will add hook call                       |
| SK ingestion              | `apps/api/src/modules/brain/services/sk-ingestion.service.ts`                     | Ingests SK entries -- will add hook call                      |
| Artifact brain scholar    | `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.ts` | Handler for Atlas's vibey_backend actions                     |
| Capability policy         | `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts`     | RBAC allowlists per agent profile                             |
| Action docs               | `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`             | Action documentation the model sees                           |
| Agent sync                | `apps/agent-api/src/modules/agent-sync/services/agent-sync.service.ts`            | Syncs agent workspace files -- will add wiki sync for Atlas   |
| Compaction safeguard      | `apps/openclaw/src/agents/pi-extensions/compaction-safeguard.ts`                  | Session compaction -- will add memory flush                   |
| Brain module              | `apps/api/src/modules/brain/brain.module.ts`                                      | NestJS module registration                                    |
| Vibey backend tool        | `docker/tools/vibey-backend/index.ts`                                             | SUPPORTED_ACTIONS list for OpenClaw                           |
| Atlas template            | `docker/agents/templates/brain_scholar/`                                          | Atlas agent definition, skills, role                          |
| Brain analysis doc        | `.docs/.tasks/brain_clean/organization.md`                                        | Legacy brain system analysis (pre-upgrade)                    |
| Brain integration plan    | `.docs/.tasks/multi-agent-org/brain-integration.md`                               | Original NeuralSnap integration plan                          |
