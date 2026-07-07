# Brain System — Complete Analysis & Cheat Sheet

> Generated 2026-03-16. Every file, every pipeline, every problem.

---

## TABLE OF CONTENTS

1. [Architecture Overview](#1-architecture-overview)
2. [Where Brain Code Lives](#2-where-brain-code-lives)
3. [All Brain Files — What Each Does](#3-all-brain-files--what-each-does)
4. [All Ingestion Pipelines](#4-all-ingestion-pipelines)
5. [Pipeline Flow Diagrams](#5-pipeline-flow-diagrams)
6. [The Routing Mess — How Jobs Actually Flow](#6-the-routing-mess--how-jobs-actually-flow)
7. [Duplicated Code Between API & Agent-API](#7-duplicated-code-between-api--agent-api)
8. [Problems & Architecture Violations](#8-problems--architecture-violations)

---

## 1. ARCHITECTURE OVERVIEW

### The Intended Design

```
User / Webhook / Frontend
        ↓
    apps/api  (enqueue job only)
        ↓
    apps/agent-api  (Atlas agent executes brain ops via missions)
        ↓
    Database (ns_memories, ns_snapshots, ns_sk_entries, ns_content_hashes)
```

### What Actually Happens

```
User / Webhook / Frontend
        ↓
    apps/api  (enqueue job)
        ↓
    apps/api  (poll job every 3s)
        ↓
    apps/agent-api  (Atlas receives action)
        ↓
    apps/agent-api  (calls BACK to apps/api /api/internal/brain-ingestion/execute)
        ↓
    apps/api  (runs crystallization, conversation extraction, embedding, dedupe — ALL here)
        ↓
    Database
```

**The round-trip:** API → agent-api → API. All heavy brain operations (LLM calls, embeddings, crystallization) run inside `apps/api`, not inside Atlas agent.

---

## 2. WHERE BRAIN CODE LIVES

| Location                                       | What's There                                                                                                                    | Should It Be There?                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `apps/api/src/modules/brain/`                  | Controllers, ALL services (crystallization, conversation processing, embedding, dedupe, ingestion), repositories, types         | Controllers + enqueue only. Heavy ops should be in agent-api |
| `apps/agent-api/src/modules/brain/`            | **Duplicate** services (crystallization, conversation-processing, embedding, memory, snapshots, emotional), repositories, types | This is where brain ops SHOULD run                           |
| `apps/agent-api/src/modules/artifacts/`        | Action handlers that proxy back to main API                                                                                     | Should execute directly using local brain services           |
| `apps/api/src/modules/integrations/fathom/`    | Fathom OAuth, webhook, API client                                                                                               | Fine for OAuth/webhook. Ingestion should delegate to agent   |
| `apps/api/src/modules/integrations/fireflies/` | Fireflies controller, API client                                                                                                | Same as Fathom                                               |
| `apps/api/src/modules/campaigns/services/`     | Campaign knowledge ingestion (uses MeetingIngestionService, EmbeddingService)                                                   | Should delegate to agent                                     |

---

## 3. ALL BRAIN FILES — WHAT EACH DOES

### apps/api (Platform Backend)

#### Controllers

| File                                                         | Purpose                                      | Key Endpoints                                                                                                                           |
| ------------------------------------------------------------ | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `brain/controllers/memories.controller.ts`                   | Memory CRUD, search, conversation processing | `POST /brain/remember`, `POST /brain/remember-link`, `POST /brain/process/conversation`, `GET /brain/search`                            |
| `brain/controllers/snapshots.controller.ts`                  | Snapshot CRUD + crystallization trigger      | `POST /brain/snapshots/crystallize`, CRUD                                                                                               |
| `brain/controllers/import-jobs.controller.ts`                | Job queue endpoints (enqueue all types)      | `POST /brain/import-jobs/remember-document`, `/fathom-meeting`, `/fireflies-transcript`, `/sk-ingest`, `/sk-ingest-link`, `/campaign-*` |
| `brain/controllers/sk.controller.ts`                         | Scholar Knowledge (SK) ingest, search, stats | `POST /brain/sk/ingest`, `/ingest-link`, `GET /brain/sk/search`                                                                         |
| `brain/controllers/search.controller.ts`                     | Semantic/graph/hybrid brain search           | `POST /brain/search`, `POST /brain/search/image`                                                                                        |
| `brain/controllers/graph.controller.ts`                      | ForceGraph visualization data                | `GET /brain/graph`                                                                                                                      |
| `brain/controllers/emotional.controller.ts`                  | Emotional intelligence (Dispenza layers 3-5) | `POST /brain/emotional/observe`, `GET /brain/emotional/profile`                                                                         |
| `brain/controllers/pending-captures.controller.ts`           | Pending capture review                       | `GET /brain/pending-captures`, `POST /accept`, `POST /reject`                                                                           |
| `brain/controllers/internal-brain-ingestion.controller.ts`   | Internal endpoint for Atlas round-trip       | `POST /internal/brain-ingestion/execute`, `/enqueue`                                                                                    |
| `integrations/fathom/controllers/fathom.controller.ts`       | Fathom OAuth + webhook + meeting import      | `POST /integrations/fathom/webhook`, `POST /meetings/import`                                                                            |
| `integrations/fireflies/controllers/fireflies.controller.ts` | Fireflies import + sync                      | `POST /fireflies/transcripts/:id/import`, `POST /sync`                                                                                  |

#### Services — Heavy Brain Ops (THE PROBLEM: these run in API)

| File                                                | What It Does                                                                                                    | LLM Calls?            | DB Writes?      |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------- | --------------- |
| `brain/services/crystallization.service.ts`         | 4-phase pipeline: text → Gemini extraction → significance gate → embedding → save `ns_snapshots`                | YES (4 Gemini calls)  | YES             |
| `brain/services/conversation-processing.service.ts` | Extract memories from conversation: Gemini extraction → significance gate → dedupe → embed → save `ns_memories` | YES (1+ Gemini calls) | YES             |
| `brain/services/meeting-ingestion.service.ts`       | Orchestrates Fathom/Fireflies: dedupe → crystallize → conversation extract                                      | YES (delegates)       | YES (delegates) |
| `brain/services/document-ingestion.service.ts`      | Ingest documents/links: chunk → Gemini classify → significance → dedupe → embed → save `ns_memories`            | YES                   | YES             |
| `brain/services/sk-ingestion.service.ts`            | Ingest SK text: chunk → Gemini extract → dedupe → embed → save `ns_sk_entries`                                  | YES                   | YES             |
| `brain/services/embedding.service.ts`               | Gemini embeddings + LLM calls                                                                                   | YES                   | NO              |
| `brain/services/emotional-tagging.service.ts`       | Tag memories with emotions (Dispenza layer 2)                                                                   | YES (1 Gemini)        | YES             |
| `brain/services/emotional-intelligence.service.ts`  | Pattern detection, profiles (Dispenza layers 3-5)                                                               | YES                   | YES             |
| `brain/services/content-dedupe.service.ts`          | SHA256 hash → check `ns_content_hashes`                                                                         | NO                    | YES             |
| `brain/services/scholar-context.service.ts`         | Gather context for extraction prompts                                                                           | NO                    | READ            |

#### Services — Non-Heavy (fine in API)

| File                                            | What It Does                         |
| ----------------------------------------------- | ------------------------------------ |
| `brain/services/memories.service.ts`            | Memory CRUD wrapper                  |
| `brain/services/snapshots.service.ts`           | Snapshot CRUD wrapper                |
| `brain/services/sk.service.ts`                  | SK search, sources, gaps             |
| `brain/services/search.service.ts`              | Brain search orchestrator            |
| `brain/services/graph.service.ts`               | ForceGraph builder                   |
| `brain/services/feedback.service.ts`            | Search feedback                      |
| `brain/services/link-extraction.service.ts`     | URL → text (YouTube, web, image OCR) |
| `brain/services/document-extraction.service.ts` | PDF/DOCX/image → text                |
| `brain/services/gemini-ocr.service.ts`          | Image OCR via Gemini                 |
| `brain/services/pending-captures.service.ts`    | Pending capture accept/reject        |

#### Services — Job Queue

| File                                          | What It Does                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| `brain/services/brain-import-jobs.service.ts` | Central job queue: enqueue, poll (3s), process, route to Atlas or direct |

#### Repositories

| File                                         | Tables                                                       |
| -------------------------------------------- | ------------------------------------------------------------ |
| `brain/repositories/memories.repository.ts`  | `ns_memories`, `ns_memory_connections`, `ns_memory_sessions` |
| `brain/repositories/snapshots.repository.ts` | `ns_snapshots`                                               |

---

### apps/agent-api (Atlas / Agent Backend)

#### Services — Brain (DUPLICATED from API)

| File                                                | What It Does                                | Used By                         |
| --------------------------------------------------- | ------------------------------------------- | ------------------------------- |
| `brain/services/crystallization.service.ts`         | Same 4-phase pipeline as API version        | NOT actively used for ingestion |
| `brain/services/conversation-processing.service.ts` | Same conversation extraction as API version | NOT actively used for ingestion |
| `brain/services/embedding.service.ts`               | Same Gemini embedding/LLM                   | Used by local services          |
| `brain/services/memory.service.ts`                  | Memory CRUD                                 | Chat context, artifact actions  |
| `brain/services/snapshots.service.ts`               | Snapshot CRUD                               | Artifact actions                |
| `brain/services/brain-context.service.ts`           | Build brain context for AI prompts          | Chat service                    |
| `brain/services/graph.service.ts`                   | ForceGraph data                             | Not actively used               |
| `brain/services/emotional-intelligence.service.ts`  | Emotion tracking                            | Not actively used               |
| `brain/services/emotional-tagging.service.ts`       | Emotion tagging                             | Not actively used               |
| `brain/services/pending-captures.service.ts`        | Pending captures queue                      | Conversation processing         |

#### Services — Artifacts (Atlas Action Handlers)

| File                                                       | What It Does                         | Key Actions                                                                                                                                                    |
| ---------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `artifacts/services/artifact-brain-scholar.service.ts`     | Brain action handler for Atlas agent | `triggerCrystallization` → calls main API; `ingestBrainText/Link` → calls main API; `ingestFathomMeeting` → calls main API; `searchSkEntries` → calls main API |
| `artifacts/services/artifact-legacy-team-brain.service.ts` | Legacy save/search memory            | `saveMemory`, `searchMemory`                                                                                                                                   |

#### Repositories (DUPLICATED from API)

| File                                         | Tables                               |
| -------------------------------------------- | ------------------------------------ |
| `brain/repositories/memories.repository.ts`  | `ns_memories` (same as API version)  |
| `brain/repositories/snapshots.repository.ts` | `ns_snapshots` (same as API version) |

---

## 4. ALL INGESTION PIPELINES

### Pipeline A: Fathom Meeting

```
Trigger: Fathom webhook OR user clicks "Import" in UI
         ↓
    FathomController (webhook or importMeeting)
         ↓
    enqueueFathomMeetingImport() → ns_brain_import_jobs (job_type: fathom_meeting_import)
         ↓
    Poller picks up job (every 3s)
         ↓
    callAtlasIngestionAction() → agent-api /api/artifacts (Atlas)
         ↓
    Atlas handler: _fromQueue: true → POST main API /api/internal/brain-ingestion/execute
         ↓
    executeAtlasIngestionActionDirect() → processJobDirect()
         ↓
    processFathomMeetingImport() → this.meetingIngestion.ingest()
         ↓
    MeetingIngestionService.ingest():
      1. Check session exists (skip if yes)
      2. Format transcript text
      3. Content dedupe (SHA256 → ns_content_hashes)
      4. ⚠️ CrystallizationService.crystallize() — 4 Gemini calls, runs in API
      5. ⚠️ ConversationProcessingService.processConversation() — Gemini extraction, runs in API
      6. Track session in ns_memory_sessions
```

**What's wrong:** Steps 4 and 5 are heavy LLM operations running synchronously in the API process.

---

### Pipeline B: Fireflies Transcript

```
Trigger: User clicks "Import" or "Sync" in UI
         ↓
    FirefliesController (importTranscript or syncTranscripts)
         ↓
    enqueueFirefliesTranscriptImport() → ns_brain_import_jobs (job_type: fireflies_transcript_import)
         ↓
    Same routing as Fathom: Poller → Atlas → back to API
         ↓
    processFirefliesTranscriptImport():
      1. Fetch full transcript from Fireflies API
      2. Map sentences to transcript entries
      3. → this.meetingIngestion.ingest() (same as Fathom from here)
```

---

### Pipeline C: User Document (text, PDF, DOCX, image)

```
Trigger: User uploads file or pastes text in Brain UI
         ↓
    MemoriesController.remember() or ImportJobsController.enqueueRememberDocument()
         ↓
    enqueueDocumentRemember() → ns_brain_import_jobs (job_type: document_remember)
         ↓
    Same routing: Poller → Atlas → back to API
         ↓
    processDocumentRemember() → documentIngestion.ingest():
      1. Content dedupe
      2. Chunk text
      3. ⚠️ Gemini classification per chunk (type, significance, tags)
      4. Significance gate (≥ 0.6)
      5. ⚠️ Gemini embedding per chunk
      6. Save to ns_memories
      7. Background: discover connections (more Gemini calls)
      8. Background: emotional tagging (more Gemini calls)
```

---

### Pipeline D: User Link (URL)

```
Trigger: User pastes URL in Brain UI
         ↓
    MemoriesController.rememberLink() or ImportJobsController
         ↓
    enqueueUserLinkImport() → ns_brain_import_jobs (job_type: user_link_import)
         ↓
    Same routing: Poller → Atlas → back to API
         ↓
    processUserLinkImport():
      1. LinkExtractionService.extract() — web scrape / YouTube transcript / image OCR
      2. → documentIngestion.ingest() (same as Pipeline C from here)
```

---

### Pipeline E: Scholar Knowledge (SK) Text

```
Trigger: User adds knowledge in Training Panel or SK UI
         ↓
    SkController or ImportJobsController
         ↓
    enqueueSkIngest() → ns_brain_import_jobs (job_type: sk_ingest)
         ↓
    Same routing: Poller → Atlas → back to API
         ↓
    processSkIngest() → skIngestion.ingest():
      1. Create source in ns_sk_sources
      2. Content dedupe (per brain)
      3. Chunk text
      4. ⚠️ Gemini extraction per chunk
      5. ⚠️ Gemini embedding per chunk
      6. Save to ns_sk_entries
```

---

### Pipeline F: Scholar Knowledge (SK) Link

```
Trigger: User adds URL in Training Panel or SK UI
         ↓
    enqueueSkLinkIngest() → ns_brain_import_jobs (job_type: sk_link_ingest)
         ↓
    Same routing: Poller → Atlas → back to API
         ↓
    processSkLinkIngest():
      1. LinkExtractionService.extract() — scrape URL
      2. → skIngestion.ingest() (same as Pipeline E from here)
```

---

### Pipeline G: Standalone Crystallization

```
Trigger: User or agent POST /api/brain/snapshots/crystallize
         ↓
    SnapshotsController.crystallize() — runs directly in API (no queue!)
         ↓
    CrystallizationService.crystallize():
      1. Phase 1: Gemini thought extraction + origin mapping (parallel)
      2. Phase 2: Gemini system builder
      3. Phase 3: Gemini stress test
      4. Significance gate (≥ 0.3)
      5. Gemini embedding
      6. Save to ns_snapshots
```

**Also triggered by agent:** `artifact-brain-scholar.service.ts` → `triggerCrystallization` → POST main API `/api/brain/snapshots/crystallize`

---

### Pipeline H: Conversation Processing (standalone)

```
Trigger: POST /api/brain/process/conversation (from chat or direct call)
         ↓
    MemoriesController.processConversation() — runs directly in API (no queue!)
         ↓
    ConversationProcessingService.processConversation():
      1. Validate messages (≥ 3, text ≥ 500 chars)
      2. Format conversation text
      3. ⚠️ Gemini memory extraction
      4. Parse JSON response
      5. Significance gate (≥ 0.6)
      6. Per-memory: dedupe → embed → save ns_memories
      7. Background: discover connections
      8. Background: emotional tagging
      9. Track session
```

---

### Pipeline I: Campaign Knowledge (File, URL, Fathom, Fireflies)

```
Trigger: Campaign UI "Add Knowledge" panel
         ↓
    ImportJobsController or CampaignsController
         ↓
    enqueueCampaign*() → ns_brain_import_jobs
         ↓
    Same routing: Poller → Atlas → back to API
         ↓
    processCampaign*():
      - File: campaigns.createManualKnowledgeNode()
      - URL: campaigns.importKnowledgeFromUrl()
      - Fathom: campaigns.importKnowledgeFromFathomMeeting()
          → meetingIngestion.ingest() (brain) + ingestKnowledgePayload() (campaign nodes)
      - Fireflies: campaigns.importKnowledgeFromFirefliesTranscript()
          → meetingIngestion.ingest() (brain) + ingestKnowledgePayload() (campaign nodes)
```

**Campaign Fathom/Fireflies is double-ingesting:** Once into user brain (via meetingIngestion) and once into campaign knowledge graph.

---

## 5. PIPELINE FLOW DIAGRAMS

### How a Job Routes Today

```
Frontend (user action)
    ↓
API Controller → enqueue*() → INSERT into ns_brain_import_jobs
    ↓
API Poller (3s interval) → picks up pending job
    ↓
callAtlasIngestionAction()
    ↓ POST
agent-api /api/artifacts (Atlas)
    ↓
artifact-brain-scholar.service.ts handler
    ↓ flag: _fromQueue: true
    ↓ POST back to
API /api/internal/brain-ingestion/execute
    ↓
executeAtlasIngestionActionDirect()
    ↓
processJobDirect() → actual ingestion (crystallize, embed, etc.)
    ↓
All LLM calls happen HERE in apps/api
```

### What It SHOULD Be

```
Frontend (user action)
    ↓
API Controller → enqueue*() → INSERT into ns_brain_import_jobs
    ↓
Atlas Agent picks up job as a MISSION
    ↓
Atlas executes brain ops DIRECTLY using agent-api local services
    ↓
(crystallization, embedding, memory extraction all run in agent-api)
    ↓
Database
```

---

## 6. THE ROUTING MESS — HOW JOBS ACTUALLY FLOW

The current job routing is a round-trip through 3 systems:

```
1. API enqueues job to DB
2. API polls DB for pending jobs (every 3s)
3. API calls agent-api (Atlas)
4. Agent-api calls BACK to API (/internal/brain-ingestion/execute)
5. API runs the actual heavy work (LLM, embedding, DB writes)
```

**Why this is broken:**

- Atlas is just a proxy, not actually doing brain work
- All heavy LLM calls happen in the API process
- The round-trip adds latency and complexity for zero benefit
- Agent-api has duplicate brain services that are NOT used for ingestion

---

## 7. DUPLICATED CODE BETWEEN API & AGENT-API

These files exist in BOTH `apps/api` and `apps/agent-api` with near-identical code:

| Service                       | API                       | Agent-API                       | Both Active?             |
| ----------------------------- | ------------------------- | ------------------------------- | ------------------------ |
| CrystallizationService        | ✅ Used for all ingestion | ❌ Not used for ingestion       | Only API version runs    |
| ConversationProcessingService | ✅ Used for all ingestion | ❌ Not used for ingestion       | Only API version runs    |
| EmbeddingService              | ✅ Used for all ingestion | ✅ Used for search/chat context | Both, different purposes |
| MemoriesRepository            | ✅ Used                   | ✅ Used                         | Both                     |
| SnapshotsRepository           | ✅ Used                   | ✅ Used                         | Both                     |
| EmotionalTaggingService       | ✅ Used                   | ❌ Not used                     | Only API version runs    |
| EmotionalIntelligenceService  | ✅ Used                   | ❌ Not used                     | Only API version runs    |
| GraphService                  | ✅ Used                   | ❌ Not used                     | Only API version runs    |
| brain.types.ts                | ✅                        | ✅                              | Duplicate definitions    |

---

## 8. PROBLEMS & ARCHITECTURE VIOLATIONS

### Problem 1: All Brain Ops Run in API (Not Atlas)

**Every** heavy brain operation (crystallization, conversation extraction, document ingestion, SK ingestion, embedding) runs inside `apps/api`. Atlas agent is just a pass-through proxy.

**Affected pipelines:** ALL of them (A through I).

### Problem 2: Fathom Pipeline Runs "Conversation Processing" on Transcript

`MeetingIngestionService.ingest()` treats transcript lines as "conversation messages" and runs `ConversationProcessingService.processConversation()` on them. This was designed for chat conversations (user ↔ agent), not meeting transcripts.

A 1215-line meeting transcript gets shoved through a prompt that expects conversational messages, causing LLM to return invalid JSON.

### Problem 3: Massive Code Duplication

Crystallization, conversation processing, embedding, repositories, and types are duplicated across API and agent-api. The agent-api copies are mostly unused for actual ingestion.

### Problem 4: Job Queue Round-Trip

Jobs go: API → DB → API poller → agent-api → back to API. The agent-api step adds nothing because it just calls back to the API to do the work.

### Problem 5: No Retry/Backoff on LLM Failures

When Gemini returns invalid JSON (which happens frequently with large transcripts), the conversation processing just returns `status: error` with no retry. The meeting gets marked as `partial` and the memories are lost.

### Problem 6: Campaign Double-Ingestion

Campaign Fathom/Fireflies imports call `meetingIngestion.ingest()` (user brain) AND `ingestKnowledgePayload()` (campaign graph). The user brain ingestion runs full crystallization + conversation extraction, which may not be desired for campaign context.

### Problem 7: Standalone Crystallization Bypasses Queue

`POST /brain/snapshots/crystallize` runs synchronously in the API with no queue, no job tracking, no retry. All other brain ops go through the job queue.

### Problem 8: Standalone Conversation Processing Bypasses Queue

`POST /brain/process/conversation` also runs synchronously in the API with no queue.

---

## DATABASE TABLES

| Table                    | Purpose                                          | Written By                                              |
| ------------------------ | ------------------------------------------------ | ------------------------------------------------------- |
| `ns_memories`            | User memories (facts, decisions, insights, etc.) | ConversationProcessingService, DocumentIngestionService |
| `ns_snapshots`           | Neural snapshots (crystallized thoughts)         | CrystallizationService                                  |
| `ns_sk_entries`          | Scholar Knowledge entries                        | SkIngestionService                                      |
| `ns_sk_sources`          | SK sources metadata                              | SkIngestionService                                      |
| `ns_content_hashes`      | Deduplication hashes                             | ContentDedupeService                                    |
| `ns_memory_connections`  | Relationships between memories                   | ConversationProcessingService (auto-discover)           |
| `ns_memory_sessions`     | Session tracking (prevent re-processing)         | MeetingIngestionService, ConversationProcessingService  |
| `ns_brain_import_jobs`   | Job queue                                        | BrainImportJobsService                                  |
| `ns_brains`              | Brain containers (default + custom)              | ContentDedupeService (auto-create default)              |
| `ns_emotional_responses` | Emotional observations                           | EmotionalIntelligenceService                            |
| `ns_pending_captures`    | Pending captures for review                      | PendingCapturesService                                  |
| `ns_search_feedback`     | Search quality feedback                          | FeedbackService                                         |

---

## FRONTEND ENTRY POINTS

| Component / Service            | What It Triggers                                                 |
| ------------------------------ | ---------------------------------------------------------------- |
| `UserAddInfoPanel`             | Document remember, link remember                                 |
| `CampaignAddInfoPanel`         | Campaign file, campaign URL, campaign Fathom, campaign Fireflies |
| `TrainingPanel` (SK)           | SK text ingest, SK link ingest                                   |
| `user-brain-import.service.ts` | All import-jobs API calls                                        |
| `BrainVisualization`           | Graph data fetch                                                 |
| Fathom settings page           | Fathom meeting import, auto-ingest toggle                        |
| Fireflies settings page        | Fireflies transcript import, sync                                |
