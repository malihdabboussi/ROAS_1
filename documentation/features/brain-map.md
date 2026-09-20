# Brain Map

Last Modified: 2026-09-10
Linear: ROA-9 (understand brain), feeds ROA-18 (fix brain critical issues)
Scope: `apps/api/src/modules/brain` (about 180 files, about 30,000 lines), plus the database tables and migrations it touches. Read-only audit; no code was changed.

## Summary in plain words

The brain is the notebook the AI helper keeps for each person, agent, campaign, customer base, and company. Content comes in through seven doors (text, file, link, Fathom, Fireflies, Slack, ROAS Portal). An AI helper called Atlas reads what comes in, keeps only the durable parts, and each kept piece gets an embedding so it can be found by meaning later. The web app and Chrome extension search the brain through this folder.

The three biggest problems found:

1. The AI agent does not read the brain through this folder. `apps/agent-api` has its own, structurally different retrieval implementation.
2. The import doors let in more than they should: an unbounded Slack pull, prompt-only content filtering, active-only dedupe, and duplicate-blind copies.
3. The database and the code disagree: a missing SQL function, a table never checked into migrations, no generated types, and an hourly sweep job that does nothing.

## 1. The five brain kinds

All brains are rows in one table, `ns_brains`. The `scope` column says which kind.

| Scope      | What it is                                  | Owner / scoping                                          | Notes                                                                                              |
| ---------- | ------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `user`     | Personal brain                              | `owner_id`, `org_id` null, `is_default` for the main one | Default target for chat `save_memory`                                                              |
| `agent`    | One agent's Structured Knowledge (SK) brain | `owner_id` + `agent_id`                                  | Holds `ns_sk_sources` and `ns_sk_entries` instead of plain memories                                |
| `campaign` | One campaign or client brain                | Linked to `campaigns`                                    | Campaign knowledge also lives in a separate `campaign_nodes` table family, not only in `ns_brains` |
| `customer` | Shared customer intelligence                | One per owner or owner+org                               | Memories can link to `contacts`, `customer_entities`, `customer_source_identities`                 |
| `company`  | Company cortex, org operating truths        | One per org, unique index                                | Signals are proposed automatically, admins approve them into objects                               |

`cortex_max` is a boolean on `ns_brains`, independent of scope. When on, the brain gets background synthesis: narrative pages, timelines, pattern analysis, avatars.

## 2. Tables the brain uses

Root identity: `ns_brains.id`. Almost everything else hangs off `brain_id`.

| Table                                                                   | Purpose                                                | Scoping column                                   | Vector index           |
| ----------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------ | ---------------------- |
| `ns_brains`                                                             | The brains themselves                                  | `owner_id`, `org_id`, `scope`                    |                        |
| `ns_memories`                                                           | Atomic facts, decisions, insights, stories             | `brain_id`                                       | hnsw, 768 dims         |
| `ns_memory_connections`                                                 | Edges between memories                                 | via memory ids                                   |                        |
| `ns_memory_versions`                                                    | Edit history                                           | via memory id                                    |                        |
| `ns_memory_sessions`                                                    | Which conversation sessions were processed             | `brain_id`                                       |                        |
| `ns_snapshots`                                                          | Crystallized models, rules, convictions, principles    | `brain_id`                                       | none (sequential scan) |
| `ns_snapshot_edges`                                                     | Edges between snapshots                                | via snapshot ids                                 |                        |
| `ns_sk_sources` / `ns_sk_entries` / `ns_sk_gaps`                        | Agent textbook knowledge and detected gaps             | `brain_id`                                       | hnsw on entries        |
| `ns_content_hashes`                                                     | Second dedupe mechanism                                | `brain_id`                                       |                        |
| `ns_pending_captures`                                                   | Human review queue before a capture becomes a snapshot | `brain_id`                                       |                        |
| `ns_search_feedback`                                                    | Thumbs up/down on search results                       | `profile_id` only                                |                        |
| `ns_emotional_responses`                                                | Emotional observations on memories                     | via memory id                                    |                        |
| `ns_belief_patterns` / `ns_perspectives`                                | Cognition layer built from emotional tags              | `subject_id`, `brain_id` nullable and backfilled | hnsw                   |
| `ns_narrative_pages` / `ns_narrative_links`                             | Cortex Max narrative pages                             | `brain_id`                                       | hnsw                   |
| `ns_brain_evidence_chunks` / `brain_episodes`                           | Verbatim source text for retrieval, feature-flagged    | `brain_id`                                       | hnsw                   |
| `brain_timelines` / `brain_timeline_items`                              | Temporal spine                                         | `brain_id`                                       | hnsw on items          |
| `brain_import_jobs`                                                     | The import queue                                       | `user_id`, `org_id`                              |                        |
| `brain_ops_outbox`                                                      | Background synthesis job queue                         | `brain_id`, `user_id`, `org_id`                  |                        |
| `brain_shares`                                                          | View / query / train grants to user, org, or team      | `brain_id`, `org_id`                             |                        |
| `brain_cross_suggestions`                                               | Cross-pollinator proposals                             | `user_id`                                        |                        |
| `company_cortex_settings` / `_signals` / `_objects` / `_object_edges`   | Company brain                                          | `org_id` + `brain_id`                            | hnsw / ivfflat         |
| `customer_entities` / `customer_source_identities` / `customer_avatars` | Customer brain identity graph                          | `brain_id`                                       | hnsw on avatars        |
| `campaign_nodes`                                                        | Campaign knowledge graph                               | `campaign_id`                                    | ivfflat                |
| `slack_brain_mappings`                                                  | Which Slack channel feeds which brain                  | `user_id`, `org_id`                              |                        |
| `user_notifications`                                                    | Job and suggestion notifications                       | `user_id`                                        |                        |

Also touched: `campaigns`, `contacts`, `offers`, `avatars`, `spaces`, `space_items`, `programs`, `org_members`, `agent_team_members`, `user_integrations`, `user_profiles`, `dream_ops_settings`.

Access control: the SQL function `can_access_brain(brain_id, level)` is the single gate for row-level security since migration `20260520210300_brain_access_control.sql`. It layers owner, org role, agent creator, and `brain_shares`. The API mirrors this in `services/brain-permissions.service.ts`.

## 3. How data gets in

Verified order on 2026-09-10 by tracing one job. Database first, Redis second, Atlas third, fingerprint fourth.

1. The door writes the ticket: one row in `brain_import_jobs`, status `queued`, attempts 0, max 3. `services/brain-import-jobs-runtime.base.ts:272` `insertJob`.
2. The doorbell: right after the insert the api asks the sweep to look (`:306` `processDueJobs`). Independently a BullMQ repeatable `brain-import-sweep` fires every 3 s (`:167-174`). A second repeatable `page-grader-brain-sync-sweep` fires hourly (`:179-184`).
3. The sweep recovers rows stuck in `processing` for over 20 min (`:218`, window `services/brain-import-jobs.base.ts:25-27`), skips the round if agent-api is unhealthy (`:55`), reads up to 15 due rows (`repositories/brain-import-jobs-runtime.repository.ts:48`), and adds one BullMQ job per row named `brain-import-job` with data `{ jobId }`, `attempts: 1`, `removeOnFail: true` (`:191-209`). Only one queue exists: `agent-runtime-queue-brain-import` (`packages/api-shared/src/services/agent-runtime-queues.ts:13`). Redis is a pointer; status, attempts, retry time, and result live only in the row.
4. A worker pops the note. Two workers are registered on the queue: `services/brain-import-runtime.processor.ts:14` (api, in-process) and `apps/mission-worker/src/modules/agent-runtime/processors/agent-runtime-brain-import.processor.ts:64` (forwards to agent-api `/api/internal/brain/import-jobs/{id}/execute`, which claims back through the api).
5. Claim: `UPDATE brain_import_jobs SET status='processing', attempts=attempts+1 WHERE id=? AND status IN ('queued','retry')` (`repositories/brain-import-jobs-runtime.repository.ts:127-140`). No lock column; the conditional update is the lock and `attempts` fences later writes (`:60`). Gates before the claim: agent-api health, `next_attempt_at`, one processing job per user (`runtime.base.ts:82,151,157`).
6. Atlas reads: plan built (`services/brain-import-jobs-execution.base.ts:37-79`), chunks of 350,000 chars with 500 overlap (`:59`), system prompt names exactly one save tool per target brain (`:196-249`), call through `apps/api/src/modules/missions/services/gateways/mission-agent-gateway.service.ts:225` to agent-api `/api/artifacts/openclaw/responses`, 900 s timeout.
7. Atlas calls the save tool in agent-api (`apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts:597-641`): `save_user_memory` (user), `ingest_agent_brain_text` (agent), `save_customer_memory` (customer), `atlas_save_brain_context` (campaign, fans out to the three).
8. Fingerprint first, before any paid call. Agent brain: sha256 registered in `ns_content_hashes`, duplicate returns immediately (`apps/agent-api/src/modules/brain/services/sk-ingestion.service.ts:66-73`). Personal brain: hash checked against `ns_memories.content_hash` (`apps/agent-api/src/modules/artifacts/services/artifact-legacy-team-brain-memory.service.ts:67-77`). Hashing in `services/content-dedupe.service.ts:14-46`.
9. Extract, embed, insert. Agent brain: Gemini extracts per chunk (`sk-ingestion.service.ts:132`), each entry gets its own hash, a duplicate check, a 768-dim `gemini-embedding-2` vector, and one `ns_sk_entries` row with the vector inline (`:134-148`); raw chunks go to `ns_brain_evidence_chunks` (`:105`). Personal brain: hash → embed → insert (`artifact-legacy-team-brain-memory.service.ts:81,150`); Atlas did the extraction in its own turn. The fingerprint (sha256, free) and the embedding (768 numbers, paid) are different things.
10. Close: Atlas ends with `JOB_STATUS:completed|failed|skipped` (`execution.base.ts:278-281`). Success → `succeeded`, result, notification (`runtime.base.ts:334-377`); only `campaign_slack_import` is audited against the shelves first (`:352-392`). Failure → `retry` with backoff (rate limit 15m/45m/2h, else 1h/3h/3h, credits exhausted never) or `failed` after 3 attempts (`:404-408`, `brain-import-jobs.base.ts:174-191`).

| Door                           | Endpoint or trigger                                                                                                                                 | Job type                                                                                                                  | Target brain     | Road                                  | Save tool                                       | Shelf                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| Typed text, Train brain        | `POST /api/brain/import-jobs/sk-ingest` (`controllers/import-jobs.controller.ts:119`)                                                               | `sk_ingest`                                                                                                               | agent            | ticket → Atlas                        | `ingest_agent_brain_text`                       | `ns_sk_sources` + `ns_sk_entries`                                 |
| Typed text, Remember this      | `POST /api/brain/remember` (`controllers/memories.controller.ts:39`)                                                                                | `document_remember`                                                                                                       | user             | ticket → Atlas                        | `save_user_memory`                              | `ns_memories`                                                     |
| Uploaded file                  | text extracted in the browser (`apps/web/src/features/brain/components/training/training-queue-dispatch.ts:53-55`), then the two endpoints above    | `sk_ingest` / `document_remember`                                                                                         | agent / user     | ticket → Atlas                        | as above                                        | as above                                                          |
| Link, Train brain              | `POST /api/brain/import-jobs/sk-ingest-link` (`import-jobs.controller.ts:131`)                                                                      | `sk_link_ingest`                                                                                                          | agent            | ticket → Atlas                        | `ingest_agent_brain_link`                       | SK                                                                |
| Link, personal                 | `POST /api/brain/remember-link` (`memories.controller.ts:91`)                                                                                       | `user_link_import`                                                                                                        | user             | ticket → Atlas                        | `save_user_memory`                              | `ns_memories`                                                     |
| Fathom                         | `POST /api/brain/import-jobs/fathom-meeting` (`:39`), webhook `apps/api/src/modules/integrations/fathom/services/fathom-webhook.service.ts:116`     | `fathom_meeting_import`                                                                                                   | user or override | ticket → Atlas                        | `save_user_memory`                              | `ns_memories`                                                     |
| Fireflies                      | `POST /api/brain/import-jobs/fireflies-transcript` (`:62`), `apps/api/src/modules/integrations/fireflies/controllers/fireflies.controller.ts:87-91` | `fireflies_transcript_import`                                                                                             | user             | ticket → Atlas                        | `save_user_memory`                              | `ns_memories`                                                     |
| Slack                          | scheduler `apps/api/src/modules/slack/services/slack-brain-mapping.service.ts:120` → `services/brain-import-jobs-enqueue.base.ts:267`               | `slack_period_import`, `campaign_slack_import`                                                                            | user or campaign | ticket → Atlas, then audit            | `save_user_memory` / `atlas_save_brain_context` | `ns_memories`                                                     |
| ROAS Portal (Page Grader)      | `POST /api/brain/page-grader/client-package`, webhook, hourly catch-up                                                                              | `page_grader_brain_sync` written after the work as a receipt (`services/page-grader-brain-package-ingest.service.ts:372`) | campaign         | direct, no ticket, no Redis, no Atlas | none                                            | `ns_memories` + evidence; embeds after insert (`:104`)            |
| Chat, whole conversation       | `POST /api/brain/process/conversation` (`memories.controller.ts:114`)                                                                               | none                                                                                                                      | user             | direct                                | none                                            | `ns_memories` (`services/conversation-processing.service.ts:52`)  |
| Chat, "remember this" mid-chat | the helper calls the tool                                                                                                                           | none                                                                                                                      | user             | direct tool                           | `save_user_memory`                              | `ns_memories` (`artifact-legacy-team-brain-memory.service.ts:11`) |

Other direct pipelines: `services/document-ingestion.service.ts` (hash → extract → hash → embed → insert), `services/meeting-ingestion.service.ts` (session key → hash → crystallize), `services/crystallization.service.ts` (three Gemini passes → gate → embed → `ns_snapshots`, no hash of its own).

Model calls: Gemini embeddings (`gemini-embedding-2`, 768 dims, env `EMBEDDING_MODEL`) and Gemini text (`gemini-3.5-flash`) through `services/embedding.service.ts`. Usage is billed through `CreditsService`.

### Shelves are tables, not stages

`ns_memories`, `ns_sk_entries`, `ns_snapshots`, `ns_belief_patterns`, `ns_perspectives`, `ns_narrative_pages`, and `brain_timelines` are separate tables. A memory never becomes a snapshot (`crystallization.service.ts:66` takes raw text). An SK entry never becomes a memory (the only copy-out is the campaign hand-off, `services/brain-handoff.service.ts:172-186`). Beliefs, perspectives, pages, and timelines are derived later from many memories (`ns_belief_patterns.supporting_memories`, `ns_perspectives.beliefs`, `ns_narrative_pages.source_refs`). `memory_type` is a label inside `ns_memories`: `fact | decision | insight | story | framework | preference | event` (`types/brain.types.ts:5-12`), free text in the DB with no check (`047_brain_consolidation.sql:34`).

## 4. How the brain is read

Web app and Chrome extension:

```text
GET /api/brain/search  ->  controllers/search.controller.ts
  legacy mode  -> services/search.service.ts (semantic, graph, hybrid, summary, chain, auto)
  hybrid mode  -> services/brain-retrieval.service.ts
                  (01..04 base files: resolve brain, permission check, one query embedding,
                   parallel lanes: memories, snapshots, evidence, SK, cognition, timeline,
                   company objects, customer avatars; merge; rerank; sufficiency check)
```

The AI agent:

```text
OpenClaw tool  ->  apps/agent-api  ->  apps/agent-api/src/modules/brain/services/brain-retrieval.service.ts
```

That is a separate implementation with its own repositories and lane services. `apps/openclaw` has no brain references. Callers of this folder's retrieval are only `apps/web/src/features/brain/services/brain.service.ts` and `apps/chrome-extension/src/background/api.ts`.

## 5. Module surfaces

17 controllers, all under `/api/brain`, guarded by `BrainAuthGuard`, `OrgContextGuard`, `OrgRoleGuard`, `ThrottlerGuard`. Billed routes add `CreditsGuard`.

| Area              | Controllers                                    | Services                                                                                                                            |
| ----------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Memories          | `memories`, `memories-crud`, `memories-status` | `memories.service`, `conversation-processing.service`                                                                               |
| Search            | `search`                                       | `search.service`, `brain-retrieval.service`, `brain-reranker.service`, `brain-sufficiency.service`, `feedback.service`              |
| Snapshots         | `snapshots`, `pending-captures`                | `snapshots.service`, `crystallization.service`, `pending-captures.service`                                                          |
| Imports           | `import-jobs`, `import-job-status`             | `brain-import-jobs*.base`, `brain-import-job-requests.service`, `brain-import-job-status.service`, `brain-import-runtime.processor` |
| SK                | `sk`, `sk-query`, `sk-mutations`               | `sk.service`, `sk-ingestion.service`, `document-extraction.service`, `gemini-ocr.service`, `link-extraction.service`                |
| Graph             | `graph`                                        | `graph.service`, `graph-request.service`, `graph-node-builders`, `graph-node-window`                                                |
| Company           | `company-cortex`                               | `company-cortex.service`                                                                                                            |
| Customer          | `customer-brain`                               | `customer-brain.service`, `customer-brain-memory-write.service`                                                                     |
| Cortex Max        | `brain-cortex-max`                             | `brain-cortex-max.service`, `brain-ops-hook.service`                                                                                |
| Emotional         | `emotional`                                    | `emotional-intelligence.service`, `emotional-tagging.service`                                                                       |
| Cross-pollination | `brain-cross-suggestions`                      | `brain-cross-pollinator.service`, `brain-cross-suggestions.service`                                                                 |
| Page Grader       | `page-grader-client-import`                    | `page-grader-*` (11 files)                                                                                                          |
| Moving data       | none in this module                            | `brain-handoff*` (whole brain copy), `brain-node-transfer*` (single node copy or move)                                              |

## 6. The three biggest problems

### Problem 1: two brain readers

- `apps/api/src/modules/brain/services/brain-retrieval.service.ts` and `apps/agent-api/src/modules/brain/services/brain-retrieval.service.ts` are different implementations of the same concept. Verified by diff.
- A bug fix or threshold change in one does not reach the other. Agent answer quality issues may be in the agent-api copy while this folder is the one being read.
- This folder's retrieval class is sliced into four `*.base.ts` files with about 30 `abstract (...args: any[]): any` declarations, so TypeScript cannot check the cross-file method signatures.

### Problem 2: the doors let in unwanted data

This is the starting point for ROA-18.

- **Slack, personal mappings.** `services/brain-import-jobs-input.base.ts:277` calls `slackService.pullChannelHistorySince(botToken, channelId, periodStartTs)`. The Slack service signature at `apps/api/src/modules/slack/services/slack-service-conversation.base.ts:219` takes only `oldestTs`. The job's `periodEndTs` is never applied, so a personal Slack import pulls everything from the period start until now. The org path uses `loadPeriodThreads` with both bounds and is fine.
- **Content filtering is prompt-only.** What is "meaningful" for Slack, and the customer-brain rule of `role=customer|lead|team_of_customer` with confidence >= 0.75, live only in the Atlas system prompt in `services/brain-import-jobs-execution.base.ts:210-259`. No code checks the saved memories against those rules.
- **Dedupe covers active jobs only.** `findExistingActiveJob` in `repositories/brain-import-jobs-runtime.repository.ts:109-121` filters `status in (queued, processing, retry)`. After a job succeeds, the same link, document, or meeting can be enqueued and fully reprocessed.
- **Copies never dedupe.** `services/brain-handoff-brain-copy.service.ts` and `services/brain-node-transfer-copy.service.ts` read all rows and insert them with new ids, with no content-hash check. Two copies produce two of everything.
- Smaller: the sender-thread filter keeps a thread if any message from the target user has more than 20 characters (`brain-import-jobs-input.base.ts:288`); the Slack sync cursor update failure is swallowed (`brain-import-jobs-runtime.base.ts:352-355`), so a period can be re-pulled silently.

### Problem 3: database and code disagree

- `repositories/memory-stats.repository.ts:44` calls RPC `find_connections_between`, which has no `CREATE FUNCTION` anywhere in `supabase/migrations`. Its sibling `find_connections_for_brain` exists.
- `user_notifications` has no `CREATE TABLE` in migrations. It only appears in `scripts/roas/roas-drift-recovery.sql`, which documents tables created directly on the live server.
- There is no generated Supabase types file for the brain schema. `packages/db/src/types.ts` is hand-written and has no `ns_*` tables. Each repository declares its own row shapes.
- The hourly `page-grader-brain-sync-sweep` job registered in `services/brain-import-jobs-runtime.base.ts:179-188` is enqueued with empty data. `services/brain-import-runtime.processor.ts` only special-cases `brain-import-sweep`, finds no `jobId`, logs a warning, and returns. The sweep does nothing every hour.
- `ns_belief_patterns.brain_id` and `ns_perspectives.brain_id` are nullable and were backfilled only to default personal brains, so rows for org, company, or agent brains may still be null and invisible to brain-scoped queries.
- `ns_snapshots.embedding` has no vector index; `find_similar_snapshots` does a sequential scan.
- `services/memories.service.ts:52-90` `createMemory` inserts without generating an embedding, unlike every other write path, so manually created memories are not vector-searchable.

## 7. Other findings worth a ticket

Permissions and safety:

- `controllers/emotional.controller.ts` `GET patterns`, `GET perspectives`, `GET avatars` accept any `brainId` with no `BrainPermissionsService` check. Same for `controllers/snapshots.controller.ts` `:id` routes and `controllers/memories-status.controller.ts` `GET health/batch`.
- `controllers/brain-cross-suggestions.controller.ts:33` discards org scope (`void org`); `repositories/brain-cross-pollinator.repository.ts:8-18` filters by `owner_id` only. A user in several orgs can see suggestions across org contexts.
- `controllers/sk.controller.ts:67-70` and `services/link-extraction.service.ts:113-153` fetch any caller-supplied URL server-side with no host allowlist.
- `increment_brain_counter` in migration `20260406130000_brain_narrative_pages.sql` builds the column name with `format('%I')` from a caller-supplied `p_field` and has no allowlist in SQL.

Duplication and drift:

- Default-brain resolution is implemented three times: `repositories/memory-brain-resolver.ts`, `repositories/snapshots.repository.ts`, `repositories/content-dedupe.repository.ts`. All ignore the request-scoped client and use the service-role client.
- Two dedupe mechanisms exist, `ns_memories.content_hash` and `ns_content_hashes`, and they are not coordinated.
- `search_ns_memories` is called with two different argument shapes: `repositories/scholar-context.repository.ts:7-13` and `repositories/brain-retrieval.repository.ts:114-121`.
- `services/page-grader-client-org.ts` is not imported by any production file. It duplicates `findCampaignByPageGraderClient` in `services/page-grader-client-import.service.ts`.
- Similarity thresholds vary per lane with no shared source: 0.25, 0.35, 0.4, 0.5, 0.6.
- Several repositories create their own Supabase admin client instead of the shared `SupabaseServiceClient`.

Data quality:

- `repositories/sk.repository.ts:159` sets `recall_count: 1` on every mastery update instead of incrementing.
- `repositories/sk.repository.ts:28-36` inserts a new `ns_sk_gaps` row on every empty search with no dedupe.
- `services/pending-captures.service.ts:47` hardcodes `type: 'Model'` for every accepted capture.
- `services/page-grader-brain-package-build.ts` writes raw offer, avatar, and strategy JSON into memory content without `sanitizePortalBrainValue`, so credential-shaped fields are not redacted.
- Unbounded `select('*')` queries with no limit in `repositories/brain-permissions.repository.ts:47-61`, `repositories/sk.repository.ts:38-55`, `repositories/brain-handoff.repository.ts:18-21`, `repositories/brain-graph.repository.ts:163-197`, and the extension brain and campaign lists in `repositories/memories.repository.ts:339-376`.

Found while tracing the import flow (2026-09-10):

- Two BullMQ workers on `agent-runtime-queue-brain-import`: `services/brain-import-runtime.processor.ts:14` (in-process) and `apps/mission-worker/.../agent-runtime-brain-import.processor.ts:64` (delegates to agent-api). Which one runs a job is nondeterministic. (ROA-33)
- The api worker only handles `brain-import-sweep`; the hourly `page-grader-brain-sync-sweep` it registers (`runtime.base.ts:179-184`) falls through and is logged as skipped (`brain-import-runtime.processor.ts:26-37`). (ROA-34)
- Stale window 20 min (`brain-import-jobs.base.ts:25-27`) vs 900 s per Atlas chunk call: a multi-chunk job over 20 min is reclaimed and the chunk in flight is paid twice. (ROA-35)
- `services/memories.service.ts:52-89` `createMemory` inserts with no embedding; rows are invisible to vector search. (ROA-36)
- `services/conversation-processing.service.ts:96-138` never registers `ns_content_hashes`; dedupe is per extracted item only. (ROA-37)
- `memory_type`, `source_type` unconstrained (`047:34-35`); code writes source types outside its union; `ns_snapshots.type` defaults to `'Belief'` (`047:115`), never produced by code (`types/brain.types.ts:13`). (ROA-38)

## 8. Older docs and where they drift

- `.docs/architecture/brain-tools-map.md` (2026-06-22) is the best map of the agent-facing tool names and already lists 12 points of failure, mostly around tool names not encoding brain type and explicit `brain_id` not being authorized in agent-api.
- `.docs/features/brain-feature-implementation.md` names a "Nexus Supabase `hmjnnznghncnyfrryssp`" and a VM as source of truth, and `.docs/plans/customer-brain-product-architecture-drift-audit.md` queried project `qfrvykscoymiwwgysvsr`. Both are older projects. The only production project per `CLAUDE.md` is `lhfgtsjetcardinpgouq`.
- `documentation/features/page-grader-campaign-brain-sync.md` is current for the Page Grader path.

## Method

Eight read-only mapping passes over the module, one per slice: wiring and controllers; memories, search, and snapshots; retrieval; import jobs and ingestion; Page Grader; SK and graph; company, customer, emotional, handoff, transfer, and ops hook; database schema and migrations. Each claim listed under the three problems was re-verified directly in the source before writing this document.
