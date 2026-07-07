# Brain Feature — Complete Implementation Document

> **Last Updated:** 2026-06-25
> **Status:** Brain Write Verification Guards Added
> **Source of Truth:** VM `188.245.41.230` + Nexus Supabase `hmjnnznghncnyfrryssp`

---

## 2026-06-25 Update: Brain Write Verification Guard

Agent Brain write actions now require trustworthy post-action proof before an
agent can tell the user a memory was saved.

- `memory_id` and `memoryId` returned from Brain write handlers are read back
  from `ns_memories`.
- Brain ingestion actions can use positive `memories_created` or duplicate
  acknowledgements as provider proof because those values come after the
  handler's persistence check.
- Unverified Brain write failures now use `unknown_effect`, not
  `succeeded_delivery_failed`.
- The failure contract tells agents not to say a Brain save was created or saved
  until a follow-up Brain read, list, or search returns the saved memory.
- `transcribe_audio` is explicitly marked as not requiring post-action delivery
  verification because it returns direct transcript text rather than a separate
  persisted artifact.

### Data Flow

1. A Brain write action runs through `ArtifactsService.executeAction()`.
2. Successful handler output enters `ArtifactPostActionVerificationService`.
3. Returned memory ids are read back from `ns_memories`; ingestion counts are
   treated as direct persistence acknowledgements.
4. If no proof exists, `buildDeliveryFailureResult()` returns Brain-specific
   guidance that blocks saved/created wording.
5. The agent must verify by Brain read/list/search before reporting success.

### Decision Log

- Fix false saved-to-Brain claims at the shared tool-result contract instead of
  only changing Atlas copy.
- Keep generic artifact delivery failures unchanged because saved artifact
  fallback paths still use different semantics.
- Do not retry Brain writes blindly when proof is missing; verify first to avoid
  duplicate or false memories.

---

## 2026-06-25 Update: Brain Action Delivery Verification

Brain post-action verification now recognizes nested ids returned by Brain
narrative and belief-pattern actions.

- `log_brain_event` reads back `entry.id` from `ns_brain_log`.
- `create_brain_belief_pattern` and `update_brain_belief_pattern` read back
  `pattern.id` from `ns_belief_patterns`.
- These mappings prevent false `ARTIFACT_DELIVERY_FAILED` results when Brain
  handlers return domain wrappers instead of top-level ids.

### Decision Log

- Keep nested Brain result wrappers stable and teach the shared verifier how to
  prove them.
- New Brain write result shapes must add a result-to-table mapping and focused
  verifier test before rollout.

---

## 2026-06-24 Update: Customer Brain Identity Graph And Cortex View

Customer Brain now models collective customer intelligence instead of requiring
every memory to resolve to a contact.

- New migrations add `customer_entities`, `customer_source_identities`,
  nullable Customer Brain memory identity links, `customer_brain_units`,
  `customer_memory_identity_view`, `customer_avatars.member_customer_unit_ids`,
  and `customer_avatar_memberships`.
- Customer Brain writes keep `contact_id` when known. Contactless writes are
  valid when they carry a durable source anchor such as a widget visitor id,
  Telegram chat id, Fathom meeting id, conversation id, or source id.
- Widget and interaction ingestion can save source-backed unknown customer
  memories with `customer_resolution_status='unlinked_source'`.
- Pattern analysis and avatar synthesis now use customer units:
  `customer_entity_id` -> `contact_id` -> `customer_source_identity_id`.
- Cortex Max customer scope reads `/api/brain/customer/view` and renders
  persistent sections for Collective, Avatars, Customers / Accounts, and
  Unlinked Signals.

### Data Flow

1. Customer-facing sources produce normalized interaction envelopes.
2. Known contacts resolve to `contact_id` and a contact customer entity.
3. Unknown but durable sources upsert a source customer entity and source
   identity without creating fake contacts.
4. Memories store identity-resolution metadata beside the normal memory row.
5. Synthesis consumes distinct customer units rather than distinct contacts.
6. Cortex Max reads customer units, source identities, and unlinked memories
   through the Customer Brain view endpoint.

### Decision Log

- Contact is identity metadata, not the Customer Brain write gate.
- Do not invent contacts for anonymous visitors or unresolved source actors.
- Keep `member_contact_ids` as a compatibility projection while synthesized
  avatars move to `member_customer_unit_ids`.
- Keep one Customer Brain per personal/org scope; per-customer/account views are
  rollups from customer units, not separate brains.

---

## 2026-06-24 Update: Cursor-Based Agent Brain Reads

Agent-facing Brain list reads now support continuation through cursor pagination.

- `get_brain_pages` returns one summary batch by default and omits
  `content_md`; use `pagination.next_cursor` as the next request's `cursor` to
  continue reading, including after compaction. Use `slug` or
  `include_content=true` only for selected content reads.
- `get_brain_belief_patterns` and `get_brain_perspectives` return one batch plus
  `pagination.next_cursor` when more rows exist. `include_details=true` reads
  detail batches through the same cursor contract.
- Cursors are opaque and scoped to the current Brain target and filters, so an
  old cursor is rejected if it is reused against different filters.

### Decision Log

- Broad cognition/library reads should be comprehensive through pagination, not
  by returning every full object in one tool result.
- Tool result size protection belongs at the action/runtime boundary, before
  the next model request, because reactive compaction can fail once oversized
  tool output is already in session history.

---

## 2026-06-18 Update: Cortex Timeline Layer

Cortex Max now has a first-class timeline layer on top of the temporal spine.

- `brain_episodes` remains the raw source-event layer.
- New `brain_timelines` rows represent Atlas-curated narratives of change for user, customer, agent, and company brains.
- New `brain_timeline_items` rows store curated milestones, decisions, shifts, contradictions, formations, and resolutions.
- Timeline actions are Atlas-owned and hidden from ordinary artifact turns: `get_brain_timelines`, `get_brain_timeline_items`, `create_brain_timeline`, `upsert_brain_timeline_items`, and `archive_brain_timeline`.
- Brain retrieval now includes `timeline_item` candidates and supports temporal filters for timeline/evolution/as-of modes.
- Manual Cortex crystallization now queues timeline synthesis after library sync and pattern analysis.
- Cortex Max UI loads timelines, shows a Timeline/Journeys section, and labels event/valid time separately from learned time.
- Atlas and brain_scholar system prompts/skills now distinguish episodes, object validity, and synthesized timelines.

### Data Flow

1. Ingestion preserves source event time in episodes and object temporal fields.
2. Crystallization writes evidence and validity windows to snapshots and evidence chunks.
3. Brain Ops queues `brain_timeline_synthesis` after library and pattern work.
4. Atlas reads existing timelines, source objects, and evidence windows, then upserts only curated timeline items.
5. Retrieval can surface timeline items as supporting context without letting recency outrank strong relevance.
6. The UI shows timelines only when Atlas has synthesized them; it does not fake timelines from `created_at`.

### Decision Log

- Keep raw events, object truth, and synthesized timelines as separate layers.
- Do not create one timeline item per episode.
- Unknown event time remains unknown in v1.
- Staging migration apply is gated on Supabase MCP recovery or explicit CLI fallback approval.

---

## 2026-06-17 Update: Temporal Brain Spine V1

Brain time is now stored as typed metadata instead of only as text inside embeddings.

- `created_at` remains the row creation/learned time.
- `brain_episodes` stores source events by `brain_id`, source identity, occurrence window, assertion time, confidence, participants, and metadata.
- Brain rows can now carry `episode_id`, `occurred_at`, `occurred_until`, `asserted_at`, `valid_from`, `valid_until`, `temporal_status`, `temporal_confidence`, and `temporal_source`.
- Cognition/company rows can now carry evidence windows and validity/effective windows.
- Fathom imports use recording/scheduled start and end fields. Slack imports use period start/end timestamps. Telegram/widget customer interactions use the normalized envelope window.
- Legacy rows are backfilled deterministically from source groups, interaction windows, Slack period ids, and `created_at` as `asserted_at`; unknown occurrence time stays null.

### Data Flow

1. Source payloads provide occurrence windows when available.
2. Ingestion normalizes optional temporal fields through shared API contracts.
3. Evidence/source writers upsert a `brain_episodes` row and link memories, evidence chunks, SK sources, and SK entries through `episode_id`.
4. Customer cognition and company cortex roll up evidence windows from supporting memories/signals.
5. Retrieval returns `temporal` metadata per candidate and accepts optional `as_of`, occurrence-window, and historical filters.
6. Brain UI displays `Happened`, `Learned`, and `Valid` labels with graceful fallback to learned time.

### Code Examples

```ts
await brainRetrievalService.search({
  family: 'customer',
  brainId,
  query: 'pricing objections',
  userId,
  requiredAccess: 'query',
  as_of: '2024-06-17T00:00:00.000Z',
})
```

### Decision Log

- Use an episode spine plus typed temporal columns rather than embedding dates into memory text.
- Keep all new temporal inputs optional so existing callers remain valid.
- Do not infer broad dates from historical text in v1.

---

## 2026-06-15 Update: Per-Brain Training Queue Scope

Brain page queue widgets are scoped to the selected destination brain.

- User, shared, company, customer, and agent brain views query queue jobs by the selected `brainId`.
- Campaign and campaign knowledge views query queue jobs by the selected `campaignId`.
- The training modal Activity tab intentionally stays global by loading active jobs without a brain or campaign scope.
- Training imports that write a destination `brainId`, including Fathom and Fireflies jobs, appear in the selected brain queue and in the global Activity tab.

---

## 2026-06-07 Update: Embedding Timing Diagnostics

Agent runtime embedding generation can emit `brain_embedding_timing_v1` JSON logs for the Gemini embedding path when `BRAIN_EMBEDDING_TIMING_LOGS=1`.

- Logs mark `start`, `fetch_start`, `headers_received`, `json_parsed`, `usage_recorded`, async credit-charge stages, and `done`.
- The payload includes request id, model, task type, dimensions, part counts, text character count, billing presence, fetch/json/charge durations, token counts, and embedding dimensions.
- The log family is opt-in to keep normal chat logs quiet after timing validation.
- Brain context and retrieval timing logs are also opt-in through `BRAIN_CONTEXT_TIMING_LOGS=1` and `BRAIN_RETRIEVAL_TIMING_LOGS=1`.

---

## 2026-06-06 Update: Shared Query Embedding For Runtime Context

Runtime Brain context now precomputes the chat query embedding once and passes that same vector into user, agent, customer, and company retrieval when available.

- Retrieval ranking, candidate selection, sufficiency, and context formatting stay unchanged.
- If the precomputed embedding is unavailable, retrieval still computes its own embedding as before.
- This removes duplicate embedding latency across parallel Brain family preload paths without reducing context quality.

---

## 2026-06-07 Update: Deferred Shared Embedding Resolution

Runtime Brain context now starts the shared query embedding promise without awaiting it before family retrieval preloads begin.

- User, agent, customer, and company retrieval can resolve Brain rows and access metadata while the shared embedding request is still in flight.
- Retrieval awaits the shared promise only at its existing embedding stage, immediately before vector candidate searches need the vector.
- Direct `null` embeddings still disable vector search for internal lexical-only query variants; empty shared precomputes still fall back to normal retrieval embedding generation.

---

## 2026-05-11 Update: Brain-Scoped Beliefs And Perspectives

Atlas Brain Scholar cognition actions now scope beliefs and perspectives by `brain_id`, not only by `subject_id`.

- Agent, campaign, customer, and user brains each own their Cortex cognition rows through `ns_belief_patterns.brain_id` and `ns_perspectives.brain_id`.
- Brain job sessions may carry the target brain id in `::brain:<scope>:<brain_id>`; explicit `brain_id` in action data still wins.
- New `create_belief_pattern` and `create_perspective` writes include `brain_id`, so Agent Cortex Max can show agent-specific beliefs and perspectives.
- Legacy default user-brain reads keep a fallback for older `brain_id = null` rows, but new cognition should write the brain id.
- Zara's misplaced cognition rows from 2026-05-11 were moved from owner-subject/no-brain rows into Zara's agent brain.
- Runtime agent access now follows the same policy rows used by the Access UI. Legacy `agents_registry.user_brain_access` and `agents_registry.campaign_context_access` no longer grant runtime access and were removed from the database.
- Agent-owned Cortex spotlight is injected from the active agent brain context path into chat, task mentions, channel mentions, and mission context. It reads perspectives, beliefs, tensions, and matching Cortex pages by `brain_id`.

---

## 2026-05-11 Update: Access Policy In Context

Agent runtimes now inject an explicit ACCESS POLICY block before agent brain context.

- Chat, task mentions, and channel mentions tell each agent which brain/campaign scopes are allowed and which native actions are denied for the current turn.
- The ACCESS POLICY block is generated from the same `agent_team_grants` / `agent_overrides` policy source used by the Access UI and runtime RBAC checks.
- `search_memory`, campaign dashboard reads, and other personal-brain/campaign actions remain denied at runtime when switches are off, and are now also removed from the OpenClaw-visible `vibey_backend` action enum locally.
- OpenClaw now accepts and consumes `enabled_toolkits` and `disabled_native_actions` locally. Fly deployment is still a separate rollout step after local validation.

---

## 1. WHAT EXISTS (Verified via SSH + Supabase MCP)

### 1.1 VM at `188.245.41.230`

**Two systems running:**

| App              | Stack                   | Port  | PM2 Name        | Location           |
| ---------------- | ----------------------- | ----- | --------------- | ------------------ |
| **nexus-api**    | Hono + tsx + Supabase   | 3200  | `nexus-api`     | `/root/nexus-api/` |
| **cursor-proxy** | OpenAI-compatible proxy | 18789 | systemd service | —                  |

**nexus-api is NOT NestJS.** It's Hono (lightweight HTTP framework) running via `tsx` (TypeScript executor). Single `supabase` service-role client (no per-user RLS).

**nexus-api routes (22 files):**

| Route File          | Mount Point            | Purpose                                                                                                |
| ------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `brain.ts`          | `/api/brain`           | Memories CRUD, semantic search, graph, connection discovery, conversation processing, profile building |
| `snapshots.ts`      | `/api/brain/snapshots` | Neural Snapshots CRUD, 4-phase crystallization pipeline, semantic search                               |
| `knowledge.ts`      | `/api/knowledge`       | Document embedding search (separate from brain memories)                                               |
| `agents.ts`         | `/api/agents`          | Agent Chrome screenshots + status                                                                      |
| `fathom.ts`         | `/webhook/fathom`      | Fathom meeting import webhook                                                                          |
| `inbox.ts`          | `/api/inbox`           | Inbox items                                                                                            |
| `activity.ts`       | `/api/activity`        | Activity feed                                                                                          |
| `notifications.ts`  | `/api/notifications`   | Notifications                                                                                          |
| `content.ts`        | `/api/content`         | Content management                                                                                     |
| `quests.ts`         | `/api/quests`          | Task/quest management                                                                                  |
| `projects.ts`       | `/api/projects`        | Project management                                                                                     |
| `members.ts`        | `/api/members`         | Team members                                                                                           |
| `sops.ts`           | `/api/sops`            | Standard operating procedures                                                                          |
| `sage-knowledge.ts` | `/api/sage`            | Sage knowledge base                                                                                    |
| `x-accounts.ts`     | `/api/x-accounts`      | X/Twitter accounts                                                                                     |
| `it-tracks.ts`      | `/api/it/tracks`       | Insight Timer tracks                                                                                   |
| `audit.ts`          | `/api/audit`           | Audit logging                                                                                          |

**Auth model:** Bearer tokens per agent (Q, Vibe, Wave, Atlas) with role-based permissions (admin/developer/content/analyst). NOT Supabase JWT — hardcoded agent tokens.

### 1.2 The Nexus Frontend (`/root/repos/The-Nexus/`)

**Stack:** Next.js 16, React 19, Tailwind 4, Phosphor Icons, Sonner toasts

**Brain feature files (complete, ready UI):**

| File                                    | Purpose                                                      |
| --------------------------------------- | ------------------------------------------------------------ |
| `features/brain/api.ts`                 | API service — fetches from nexus-api `/api/brain/*`          |
| `features/brain/types.ts`               | TypeScript types for memories, snapshots, connections, graph |
| `features/brain/BrainVisualization.tsx` | Main container — orchestrates graph + panels                 |
| `features/brain/ForceGraph.tsx`         | Force-directed graph (canvas-based, interactive)             |
| `features/brain/MemoryPanel.tsx`        | Memory list/search panel                                     |
| `features/brain/BrainStats.tsx`         | Stats overview (totals, types, connections)                  |
| `features/brain/NavControls.tsx`        | Zoom, pan, filter controls                                   |
| `features/brain/LegendPanel.tsx`        | Node type color legend                                       |
| `features/brain/NodeDetailModal.tsx`    | Detail modal for selected node                               |
| `app/(dashboard)/brain/page.tsx`        | Brain page route                                             |

### 1.3 Nexus Supabase (`hmjnnznghncnyfrryssp`) — All Tables

**Brain-specific tables (what the brain routes use):**

| Table                | Rows | Columns | Purpose                                           |
| -------------------- | ---- | ------- | ------------------------------------------------- |
| `memories`           | —    | 20 cols | Raw memories with pgvector embeddings             |
| `memory_connections` | —    | 7 cols  | Graph edges between memories                      |
| `memory_versions`    | —    | 5 cols  | Version history for edited memories               |
| `memory_sessions`    | —    | 6 cols  | Conversation processing session tracking          |
| `neural_snapshots`   | —    | 21 cols | Crystallized beliefs/models/rules with embeddings |
| `agent_profiles`     | —    | —       | AI-synthesized subject profiles                   |

**NeuralSnap tables (separate system, also in this Supabase):**

| Table                 | Rows | Purpose                                                                           |
| --------------------- | ---- | --------------------------------------------------------------------------------- |
| `ns_profiles`         | 1    | User profiles with plan/usage                                                     |
| `ns_brains`           | 1    | Brain containers (multi-brain per user)                                           |
| `ns_snapshots`        | 0    | Snapshots (with vector embeddings, typed: Belief/Model/Rule/Conviction/Principle) |
| `ns_snapshot_edges`   | 0    | Typed graph edges (supports/contradicts/extends/refines/etc.)                     |
| `ns_connections`      | 2    | External providers (fathom/fireflies/openclaw)                                    |
| `ns_meeting_imports`  | 1    | Meeting imports from Fathom/Fireflies                                             |
| `ns_pending_captures` | 0    | Pending captures from OpenClaw agents                                             |
| `ns_jobs`             | 3    | Background jobs (crystallize/import/ingest)                                       |
| `ns_content_hashes`   | 0    | Content dedup                                                                     |
| `ns_search_feedback`  | 0    | Search quality feedback                                                           |
| `ns_usage`            | 0    | Token usage                                                                       |
| `ns_api_usage`        | 0    | API usage                                                                         |
| `ns_errors`           | 7    | Error log                                                                         |

---

## 2. DATABASE SCHEMA DETAIL

### 2.1 `memories` (20 columns)

| Column             | Type        | Nullable | Default             | Purpose                                                |
| ------------------ | ----------- | -------- | ------------------- | ------------------------------------------------------ |
| `id`               | uuid        | NO       | `gen_random_uuid()` | PK                                                     |
| `content`          | text        | NO       | —                   | Memory content                                         |
| `content_hash`     | text        | NO       | —                   | SHA-256 hash for dedup                                 |
| `memory_type`      | text        | NO       | —                   | fact/decision/insight/story/framework/preference/event |
| `source_type`      | text        | NO       | —                   | manual/conversation/fathom/api                         |
| `source_id`        | text        | YES      | —                   | Reference to source                                    |
| `source_title`     | text        | YES      | —                   | Human-readable source name                             |
| `project_id`       | uuid        | YES      | —                   | Associated project                                     |
| `agent_id`         | uuid        | YES      | —                   | Agent that captured this                               |
| `speaker`          | text        | YES      | —                   | Who said this                                          |
| `confidence`       | float8      | YES      | 0.8                 | Confidence score 0-1                                   |
| `significance`     | float8      | YES      | 0.5                 | Significance score 0-1                                 |
| `embedding`        | vector      | YES      | —                   | pgvector 768-dim (Gemini embedding)                    |
| `tags`             | text[]      | YES      | `'{}'`              | Tags array                                             |
| `metadata`         | jsonb       | YES      | `'{}'`              | Extra metadata                                         |
| `recalled_count`   | int         | YES      | 0                   | Times recalled                                         |
| `last_recalled_at` | timestamptz | YES      | —                   | Last recall time                                       |
| `expires_at`       | timestamptz | YES      | —                   | Optional expiry                                        |
| `created_at`       | timestamptz | YES      | `now()`             | Created                                                |
| `updated_at`       | timestamptz | YES      | `now()`             | Updated                                                |

### 2.2 `memory_connections` (7 columns)

| Column             | Type        | Nullable | Default             | Purpose                                                           |
| ------------------ | ----------- | -------- | ------------------- | ----------------------------------------------------------------- |
| `id`               | uuid        | NO       | `gen_random_uuid()` | PK                                                                |
| `source_memory_id` | uuid        | NO       | —                   | FK to memories                                                    |
| `target_memory_id` | uuid        | NO       | —                   | FK to memories                                                    |
| `relationship`     | text        | NO       | —                   | supports/contradicts/elaborates/caused_by/evolved_from/related_to |
| `strength`         | float8      | YES      | 0.5                 | Connection strength 0-1                                           |
| `created_by`       | text        | YES      | `'auto'`            | auto/manual/auto_discovery                                        |
| `created_at`       | timestamptz | YES      | `now()`             | Created                                                           |

### 2.3 `neural_snapshots` (21 columns)

| Column               | Type        | Nullable | Default             | Purpose                                          |
| -------------------- | ----------- | -------- | ------------------- | ------------------------------------------------ |
| `id`                 | uuid        | NO       | `gen_random_uuid()` | PK                                               |
| `name`               | text        | NO       | —                   | Snapshot title                                   |
| `type`               | text        | NO       | —                   | Belief/Model/Rule/Conviction/Principle           |
| `core`               | text        | NO       | —                   | Core insight (2-3 sentences)                     |
| `one_liner`          | text        | YES      | —                   | One-line summary                                 |
| `story`              | text        | YES      | —                   | Origin backstory                                 |
| `moment`             | text        | YES      | —                   | Crystallization moment                           |
| `emotion`            | jsonb       | YES      | —                   | `{intensity: float, feeling: string}`            |
| `source`             | text        | YES      | —                   | Where this came from                             |
| `trigger_pattern`    | text        | YES      | —                   | What activates this                              |
| `method`             | text        | YES      | —                   | How it's applied                                 |
| `steps`              | text        | YES      | —                   | Step-by-step process                             |
| `filter`             | text        | YES      | —                   | What it rejects                                  |
| `challenge`          | text        | YES      | —                   | Strongest counter-argument                       |
| `break_test`         | text        | YES      | —                   | When it breaks down                              |
| `risks`              | text        | YES      | —                   | What could go wrong                              |
| `proof`              | text        | YES      | —                   | Supporting evidence                              |
| `confidence`         | float8      | YES      | 0.8                 | Confidence 0-1                                   |
| `significance_score` | float8      | YES      | —                   | Significance 0-1                                 |
| `tags`               | text[]      | YES      | `'{}'`              | Tags                                             |
| `source_type`        | text        | YES      | —                   | manual/fathom/fireflies/api/openclaw/crystallize |
| `source_id`          | text        | YES      | —                   | Source reference                                 |
| `embedding`          | vector      | YES      | —                   | pgvector 768-dim                                 |
| `created_at`         | timestamptz | YES      | `now()`             | Created                                          |
| `updated_at`         | timestamptz | YES      | `now()`             | Updated                                          |

### 2.4 `memory_versions` (5 columns)

| Column             | Type        | Purpose          |
| ------------------ | ----------- | ---------------- |
| `id`               | uuid        | PK               |
| `memory_id`        | uuid        | FK to memories   |
| `content_previous` | text        | Previous content |
| `edited_by`        | text        | Who edited       |
| `created_at`       | timestamptz | When             |

### 2.5 `memory_sessions` (6 columns)

| Column              | Type        | Purpose                     |
| ------------------- | ----------- | --------------------------- |
| `id`                | uuid        | PK                          |
| `session_key`       | text        | Unique session identifier   |
| `last_message_id`   | text        | Last processed message      |
| `last_processed_at` | timestamptz | When last processed         |
| `memories_created`  | int         | Count created this session  |
| `skipped_reason`    | text        | Why skipped (if applicable) |
| `created_at`        | timestamptz | When                        |

---

## 3. BRAIN API ENDPOINTS (from `brain.ts` + `snapshots.ts`)

### 3.1 Memories API (`/api/brain/`)

| Method   | Endpoint                | Purpose                            | Key Logic                                                                               |
| -------- | ----------------------- | ---------------------------------- | --------------------------------------------------------------------------------------- |
| `POST`   | `/remember`             | Store a new memory                 | Dedup via content_hash, auto-embed via Gemini, auto-discover connections                |
| `POST`   | `/search`               | Semantic search                    | pgvector cosine similarity via `search_memories` RPC                                    |
| `GET`    | `/stats`                | Brain statistics                   | Counts by type/source/project, connections, most recalled, hub nodes                    |
| `GET`    | `/graph`                | Full graph data                    | All nodes + edges + document virtual nodes + neural snapshots, enriched with age/status |
| `GET`    | `/memories/:id`         | Get memory detail                  | Memory + connections + connected memories + version history                             |
| `PATCH`  | `/memories/:id`         | Update memory                      | Re-embeds on content change, saves version                                              |
| `DELETE` | `/memories/:id`         | Delete memory                      | Hard delete                                                                             |
| `POST`   | `/memories/:id/connect` | Create connection                  | Upsert typed connection between two memories                                            |
| `DELETE` | `/connections/:id`      | Delete connection                  | Hard delete                                                                             |
| `GET`    | `/profile/:subject`     | Get subject profile                | Latest AI-synthesized profile                                                           |
| `POST`   | `/profile/rebuild`      | Rebuild profile                    | LLM synthesizes profile from subject's memories                                         |
| `POST`   | `/discover-connections` | Auto-discover connections          | Pairwise cosine similarity + LLM relationship classification                            |
| `GET`    | `/health`               | Health check                       | Total counts, last capture/recall, embedding queue                                      |
| `POST`   | `/process/conversation` | Extract memories from conversation | LLM extracts significant knowledge, significance gate (0.6+), dedup, embed, connect     |

### 3.2 Neural Snapshots API (`/api/brain/snapshots/`)

| Method   | Endpoint       | Purpose                          | Key Logic                                                                                                                               |
| -------- | -------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `POST`   | `/crystallize` | 4-phase crystallization pipeline | Phase 1: Extract thought + origin (parallel) → Phase 2: System builder → Phase 3: Stress test → Significance gate (0.3+) → Embed → Save |
| `POST`   | `/`            | Create snapshot manually         | Validate type (Belief/Model/Rule/Conviction/Principle), embed, save                                                                     |
| `GET`    | `/`            | List snapshots                   | Filter by type/tag/min_confidence, paginated                                                                                            |
| `GET`    | `/search`      | Semantic search                  | pgvector via `search_neural_snapshots` RPC                                                                                              |
| `GET`    | `/stats`       | Snapshot stats                   | Count by type, avg confidence                                                                                                           |
| `GET`    | `/:id`         | Get single snapshot              | Full snapshot data                                                                                                                      |
| `PATCH`  | `/:id`         | Update snapshot                  | Re-embeds if name/core/one_liner changed                                                                                                |
| `DELETE` | `/:id`         | Delete snapshot                  | Hard delete                                                                                                                             |

---

## 4. KEY ARCHITECTURE PATTERNS

### 4.1 Embedding Pipeline

- **Model:** Gemini `gemini-embedding-001` (768 dimensions)
- **Storage:** pgvector `vector` column
- **Search:** Supabase RPC functions (`search_memories`, `search_neural_snapshots`) using cosine similarity
- Graceful degradation: stores without embedding if API fails, flags `needs_embedding` in metadata

### 4.2 Crystallization Pipeline (4 phases, 4 Gemini calls)

```
Input text
  → Phase 1 (parallel): Thought Extractor + Origin Mapper
  → Phase 2: System Builder (uses Phase 1 output)
  → Phase 3: Stress Test (uses Phases 1-2 output)
  → Significance Gate (reject < 0.3)
  → Generate embedding
  → Save to neural_snapshots
```

### 4.3 Conversation Processing Pipeline

```
Conversation messages (3+ messages, 500+ chars)
  → LLM extraction prompt (strict filter — only significant knowledge)
  → Significance gate (reject items < 0.6)
  → Dedup via content_hash
  → Embed each significant item
  → Save to memories table
  → Background: discover connections for each new memory
  → Track session in memory_sessions
```

### 4.4 Connection Discovery

```
New memory with embedding
  → RPC: find top 5 similar memories (cosine ≥ 0.72)
  → For each similar: LLM classifies relationship type + strength
  → Upsert to memory_connections
```

### 4.5 Auth Model

- Agent bearer tokens (hardcoded per agent)
- Role-based permissions matrix (admin/developer/content/analyst per resource)
- Service-role Supabase client (NOT per-user RLS)

---

## 5. PORTING STRATEGY TO VIBEY v2

### What Vibey v2 already has:

- NestJS backend at `apps/api/` (3-layer architecture)
- Next.js frontend at `apps/web/` (Zustand stores, feature folders)
- Supabase with user JWT + RLS (NOT service-role)
- OpenClaw Gateway connection (chat completions proxy)
- Brain page placeholder at `apps/web/src/app/(dashboard)/brain/page.tsx`

### Key architectural differences to resolve:

| Aspect            | Nexus (Source)                      | Vibey v2 (Target)                        | Decision Needed                              |
| ----------------- | ----------------------------------- | ---------------------------------------- | -------------------------------------------- |
| Backend framework | Hono                                | NestJS                                   | Rewrite routes as controllers/services/repos |
| Auth              | Agent bearer tokens                 | Supabase JWT + RLS                       | Switch to user-scoped auth                   |
| DB client         | Service-role (global)               | Per-request user client                  | Pass `supabase` from `@Supabase()` decorator |
| Supabase project  | `hmjnnznghncnyfrryssp` (Nexus)      | `qfrvykscoymiwwgysvsr` (Vibey2.0)        | Migrate schema to Vibey2.0 DB                |
| Embeddings        | Gemini `gemini-embedding-001`       | Same (need GEMINI_API_KEY)               | Add env var to `apps/api/.env`               |
| LLM calls         | Gemini `gemini-3-flash-preview`     | Same or route through OpenClaw           | Decision: direct Gemini vs OpenClaw proxy    |
| Frontend          | React 19 + Phosphor Icons           | React + Tailwind + globals.css utilities | Adapt to Vibey design system                 |
| pgvector          | Extension enabled in Nexus Supabase | Need to enable in Vibey2.0 Supabase      | Migration to enable `vector` extension       |

### Tables to migrate to Vibey2.0 Supabase:

1. `memories` (20 cols + pgvector)
2. `memory_connections` (7 cols)
3. `memory_versions` (5 cols)
4. `memory_sessions` (6 cols)
5. `neural_snapshots` (21 cols + pgvector)
6. RPC functions: `search_memories`, `search_neural_snapshots`, `increment_recalled_count`, `get_hub_memories`, `find_similar_pairs`
7. RLS policies (user-scoped, matching existing Vibey2.0 pattern)

### Frontend components to port:

1. `BrainVisualization.tsx` — Main container
2. `ForceGraph.tsx` — Force-directed graph
3. `MemoryPanel.tsx` — Memory list/search
4. `BrainStats.tsx` — Statistics
5. `NavControls.tsx` — Graph controls
6. `LegendPanel.tsx` — Legend
7. `NodeDetailModal.tsx` — Node detail
8. `api.ts` — Rewrite for backendClient pattern
9. `types.ts` — Rewrite matching backend types

---

## 6. CONFIRMED DECISIONS (2026-02-10)

| #   | Decision                                                       | Details                                                                                                                                                     |
| --- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Brain data in NeuralSnap Supabase** (`lmwfgqhtogjbqpvzckua`) | NOT Vibey2.0 Supabase. NestJS connects to NeuralSnap as a second Supabase client.                                                                           |
| 2   | **Migrate missing tables** into NeuralSnap                     | `memories`, `memory_connections`, `memory_versions`, `memory_sessions` + RPC functions. These complement the existing `ns_snapshots` + `ns_snapshot_edges`. |
| 3   | **Single agent (Vibey)**                                       | No multi-agent system. Remove Q/Vibe/Wave/Atlas token auth. Vibey is the only agent.                                                                        |
| 4   | **Option A: Agent → NestJS → NeuralSnap DB**                   | NestJS is the single gateway for brain operations. Both frontend and Vibey agent call NestJS.                                                               |
| 5   | **Production-first**                                           | In dev: brain UI works (Next.js → localhost NestJS → NeuralSnap). Agent auto-extraction doesn't (VM can't reach localhost). In prod: everything works.      |
| 6   | **Scope: Brain feature only**                                  | Not porting quests, projects, members, wiki, content, inbox from Nexus. Only brain (memories + snapshots + graph + crystallization).                        |
| 7   | **Keep existing Studio chat**                                  | Don't port Nexus chat feature. Vibey v2 already has its own chat.                                                                                           |

### Architecture Diagram (Confirmed)

```
USER BROWSER
    │
    ▼
Next.js (apps/web, port 3000)
    │
    ├── Brain UI pages ──────────────┐
    │                                │
    ▼                                ▼
NestJS API (apps/api, port 3001)     │
    │                                │
    ├── Chat routes ──► OpenClaw Gateway (VM:18789)
    │                        │
    │                   Vibey Agent
    │                        │
    ├── Brain routes ◄───────┘  (agent calls NestJS for brain ops)
    │
    ▼
NeuralSnap Supabase (lmwfgqhtogjbqpvzckua)
    ├── ns_snapshots (crystallized knowledge)
    ├── ns_snapshot_edges (graph connections)
    ├── ns_brains (brain containers)
    ├── ns_pending_captures (agent captures pending review)
    ├── memories (raw memories with embeddings)
    ├── memory_connections (memory graph edges)
    ├── memory_versions (edit history)
    └── memory_sessions (conversation processing tracker)
```

### NestJS Brain Module — Two Auth Paths

| Consumer              | Auth Method                                  | Endpoints                                                                                                     |
| --------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Frontend user**     | Supabase JWT (existing pattern)              | All brain endpoints (CRUD, search, graph, stats)                                                              |
| **Vibey agent on VM** | Service token (new — single token for Vibey) | POST /brain/remember, POST /brain/search, POST /brain/process/conversation, POST /brain/snapshots/crystallize |

### Second Supabase Client

NestJS needs TWO Supabase connections:

1. **Vibey2.0 Supabase** (`qfrvykscoymiwwgysvsr`) — for conversations, campaigns, user data (existing)
2. **NeuralSnap Supabase** (`lmwfgqhtogjbqpvzckua`) — for brain data (new)

The Brain module creates its own Supabase client using `NEURALSNAP_SUPABASE_URL` + `NEURALSNAP_SUPABASE_SERVICE_KEY` env vars.
