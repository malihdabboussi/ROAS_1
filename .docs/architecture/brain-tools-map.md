# Brain Tools Map

Last updated: 2026-06-22

## Purpose

This document maps the current Brain tool surface before the Phase 2 action/tool refactor.

It covers:

- All agent-facing Brain actions exposed through `vibey_backend`.
- Their current schema/preflight status.
- Their runtime handlers.
- The docs/instructions agents see.
- Related HTTP/internal APIs.
- Separate live-voice Brain tools.
- Known point-of-failure areas that Phase 2 must fix.

## Source Of Truth Files

| Area | File | Role |
| --- | --- | --- |
| Valid action list | `apps/agent-api/src/modules/artifacts/dtos/artifact-action.dto.ts` | Declares action names accepted by agent-api. |
| Action method map and scope mode | `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts` | Maps action names to method names and marks Brain actions as global scope actions. |
| Schema/preflight | `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`, `artifact-action-additional-schemas.ts`, `artifact-action-preflight.ts` | Validates every PromptMode `VALID_ACTIONS` entry with a hard schema and preflight classification. |
| Runtime executor | `apps/agent-api/src/modules/artifacts/services/artifacts.service.ts` | Normalizes data, authorizes, applies schema validation, calls registered handler. |
| User/agent/campaign/narrative/cognition handlers | `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.ts` | Handles most Brain actions. |
| User memory save/search handlers | `apps/agent-api/src/modules/artifacts/services/artifact-legacy-team-brain.service.ts` | Handles `save_memory` and `search_memory`. |
| Company Brain handlers | `apps/agent-api/src/modules/artifacts/services/artifact-company-cortex.service.ts` | Handles Company Cortex actions. |
| Agent docs | `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts` | Human-readable docs/examples injected into generated agent skill. |
| Generated skill | `apps/agent-api/src/modules/agent-sync/services/vibey-api-skill-generator.ts` | Generates `skills/vibey-api/SKILL.md` and section references. |
| Tool bridge | `docker/tools/vibey-backend/index.ts` | OpenClaw tool enum and bridge to agent-api `/api/artifacts/stream`. |
| Capability policy | `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts` | Determines which agents can call which Brain actions. |
| Live voice Brain tools | `apps/agent-api/src/modules/brain/services/brain-live.service.ts` | Separate Gemini Live tool surface, not `vibey_backend`. |
| Main API brain endpoints | `apps/api/src/modules/brain/controllers/*.ts` | UI/API endpoints that Brain tools indirectly call. |
| Internal Brain endpoints | `apps/api/src/modules/internal/internal.controller.ts` | Service-to-service endpoints called by agent-api handlers. |

## Runtime Pipeline

```text
Agent
  -> OpenClaw tool `vibey_backend`
  -> docker/tools/vibey-backend/index.ts
  -> agent-api POST /api/artifacts/stream
  -> ArtifactsService.executeAction()
  -> actionRegistry[action]
  -> handler service
  -> Supabase / main API internal endpoints / import jobs
```

Important behavior:

- `docker/tools/vibey-backend/index.ts` exposes only actions in `SUPPORTED_ACTIONS` or an agent-specific `ALLOWED_ACTIONS.json`.
- `ArtifactsService.executeAction()` validates action data through exhaustive PromptMode `ACTION_SCHEMAS`, then runs action-specific preflight for operations that need checks beyond field/type validation.
- Brain actions have schema/preflight coverage, but this older map can still expose handler/docs disagreements that need separate cleanup.
- Brain actions are in `GLOBAL_SCOPE_ACTIONS`, so active campaign/space scope defaults are not injected into them by `withScopeDefaults()`.

## Agent-Facing Brain Actions

### User Brain / Generic Memory

| Action | Handler | Schema in `ACTION_SCHEMAS` | Agent docs | Current target resolution |
| --- | --- | --- | --- | --- |
| `save_memory` | `ArtifactLegacyTeamBrainService.saveMemory()` | Required: `content`, `memory_type` | Says USER DEFAULT BRAIN ONLY | Writes to user default via `memoriesRepo.create()`. Customer brain only in `-brain-job-::brain:customer:<brainId>` sessions. |
| `search_memory` | `ArtifactLegacyTeamBrainService.searchMemory()` | None | Search memories/snapshots semantically | Searches user default only via `memoriesRepo.search(owner_id)` and snapshots via resolved user default brain. No explicit `brain_id`. |
| `trigger_crystallization` | `ArtifactBrainScholarService.triggerCrystallization()` | None | USER BRAIN ONLY | Calls `crystallizationService.crystallize()` for user default brain. Wrong-brain blocked only in brain-job sessions. |
| `ingest_brain_link` | `ArtifactBrainScholarService.ingestBrainLink()` | Required: `url` | USER DEFAULT BRAIN ONLY | Extracts link, then `documentIngestionService.ingest({ ownerId, orgId })`. |
| `ingest_brain_text` | `ArtifactBrainScholarService.ingestBrainText()` | Required: `text`, `title` | USER DEFAULT BRAIN ONLY | Ingests text into user default brain through document ingestion. |
| `ingest_user_document` | `ArtifactBrainScholarService.ingestUserDocument()` | None | Not documented in visible Brain section near other actions | Ingests content/text into user default brain. |
| `ingest_user_link` | `ArtifactBrainScholarService.ingestUserLink()` | None | Not documented in visible Brain section near other actions | Extracts link and ingests into user default brain. |
| `assign_memory_source` | `ArtifactBrainScholarService.assignMemorySource()` | None | User default brain only | Calls internal `/brain/nodes/assign-source`; updates default brain memory source_title/source_id. |

### Agent Brain / SK

| Action | Handler | Schema in `ACTION_SCHEMAS` | Agent docs | Current target resolution |
| --- | --- | --- | --- | --- |
| `resolve_agent_sk_brain` | `ArtifactBrainScholarService.resolveAgentSkBrain()` | None | Use before agent SK ingest/search | Resolves `agent_id` / `agent_key` or current session agent to an `ns_brains.agent_id` row. |
| `search_sk_entries` | `ArtifactBrainScholarService.searchSkEntries()` | None | Optional `brain_id`, `domain`, `limit` | `brain_id` if passed, else current agent session brain, else user default. |
| `ingest_sk_text` | `ArtifactBrainScholarService.ingestSkText()` | Required: `text`, `title` | Docs say `brain_id`, text, sourceType, title required | Handler requires `brain_id` or session agent brain, plus `text`, `sourceType`, `title`. Schema does not require `brain_id` or `sourceType`. |
| `ingest_sk_link` | `ArtifactBrainScholarService.ingestSkLink()` | Required: `url` | Docs say `brain_id` and URL required | Handler requires `brain_id` or session agent brain. Schema does not require `brain_id`. |
| `list_brain_domains` | `ArtifactBrainScholarService.listBrainDomains()` | None | Default brain SK domains | Uses `resolveReadableBrainId()`: explicit `brain_id`, agent session, then user default. |
| `get_brain_gaps` | `ArtifactBrainScholarService.getBrainGaps()` | None | Default brain gaps/thin domains | Same `resolveReadableBrainId()` behavior. |
| `list_brain_imports` | `ArtifactBrainScholarService.listBrainImports()` | None | Default brain import sessions | Same `resolveReadableBrainId()` behavior. |

### Campaign Brain / Campaign Knowledge

| Action | Handler | Schema in `ACTION_SCHEMAS` | Agent docs | Current target resolution |
| --- | --- | --- | --- | --- |
| `search_campaign_knowledge` | `ArtifactBrainScholarService.searchCampaignKnowledge()` | None | `campaign_id` required | Uses explicit `campaign_id` or `target.resolveCampaignId()`, then RPC `campaign_match_nodes`. |
| `ingest_campaign_file` | `ArtifactBrainScholarService.ingestCampaignFile()` | Required: `campaignId`, `title`, `content` | Campaign knowledge file ingest | Calls main API internal `/campaign-knowledge/ingest`. |
| `ingest_campaign_url` | `ArtifactBrainScholarService.ingestCampaignUrl()` | Required: `campaignId`, `url` | Campaign knowledge URL ingest | Extracts URL then calls main API internal `/campaign-knowledge/ingest`. |
| `transfer_brain_node` | `ArtifactBrainScholarService.transferBrainNode()` | None | Copy/move user/agent/campaign nodes | Calls internal `/brain/nodes/transfer`. Scope object accepts `{ type: user|agent|campaign }`. |
| `transfer_brain_by_source` | `ArtifactBrainScholarService.transferBrainBySource()` | None | Batch copy/move by `source_title` | Calls internal `/brain/nodes/transfer-by-source`. |

### Meeting / External Ingest

| Action | Handler | Schema in `ACTION_SCHEMAS` | Agent docs | Current target resolution |
| --- | --- | --- | --- | --- |
| `ingest_fathom_meeting` | `ArtifactBrainScholarService.ingestFathomMeeting()` | Required one of `meeting_id`, `recording_id`, `call_id`, `meeting`; optional `brainId`, `targetBrain`, `campaignId` | Docs near import section | Calls internal `/brain/import-jobs/fathom-meeting`. Can route campaign by `targetBrain='campaign'` + campaign resolution. |
| `ingest_fireflies_transcript` | `ArtifactBrainScholarService.ingestFirefliesTranscript()` | None | Docs mention Fireflies handled via mission | Handler returns `handled_by_mission`; no actual ingest. |

### Scope / Stats / Listing

| Action | Handler | Schema in `ACTION_SCHEMAS` | Agent docs | Current target resolution |
| --- | --- | --- | --- | --- |
| `get_brain_stats` | `ArtifactBrainScholarService.getBrainStats()` | None | Scope user/agent/campaign | `scope=user` resolves user default; `scope=agent` resolves agent brain; `scope=campaign` counts campaign nodes. |
| `list_brain_scopes` | `ArtifactBrainScholarService.listBrainScopes()` | None | Lists user rows/campaigns | Lists `ns_brains.owner_id = userId`; does not include shared accessible brains. |
| `list_recent_memories` | `ArtifactBrainScholarService.listRecentMemories()` | None | Default brain recent memories | Uses explicit `brain_id`, then session agent brain, then user default. Max 100. |

### Narrative Pages / Cortex Max

| Action | Handler | Schema in `ACTION_SCHEMAS` | Agent docs | Current target resolution |
| --- | --- | --- | --- | --- |
| `get_narrative_pages` | `ArtifactBrainScholarService.getNarrativePages()` | None | Optional `brain_id`; omit for default user brain | `resolveNarrativeBrainId()` accepts explicit `brain_id` but requires `owner_id === userId`. Shared brains fail. |
| `create_narrative_page` | `ArtifactBrainScholarService.createNarrativePage()` | None | Optional `brain_id`; Atlas-maintained | Same resolver. Write allowed only Atlas/brain_scholar by `ensureAtlasNarrativeWriter()`. |
| `patch_narrative_page` | `ArtifactBrainScholarService.patchNarrativePage()` | None | Requires `id`, `operation`, `content` in docs | Does not use `resolveNarrativeBrainId()` for ownership; reads page by id, then writes. Writer check only Atlas/brain_scholar. |
| `update_narrative_page` | `ArtifactBrainScholarService.updateNarrativePage()` | None | Requires `id` in docs | Reads page by id, writes. Writer check only Atlas/brain_scholar. |
| `archive_narrative_page` | `ArtifactBrainScholarService.archiveNarrativePage()` | None | Requires `id` in docs | Archives page by id. Writer check only Atlas/brain_scholar. |
| `link_narrative_pages` | `ArtifactBrainScholarService.linkNarrativePages()` | None | Requires `from_page_id`, `to_page_id` in docs | Links pages by ids. Writer check only Atlas/brain_scholar. |
| `unlink_narrative_pages` | `ArtifactBrainScholarService.unlinkNarrativePages()` | None | Requires `from_page_id`, `to_page_id` in docs | Deletes link by ids. Writer check only Atlas/brain_scholar. |
| `get_brain_log` | `ArtifactBrainScholarService.getBrainLog()` | None | Optional `brain_id`, event_type, limit | Uses `resolveNarrativeBrainId()`. |
| `log_brain_event` | `ArtifactBrainScholarService.logBrainEvent()` | None | event_type and summary required by handler | Uses `resolveNarrativeBrainId()`. |
| `get_brain_lint` | `ArtifactBrainScholarService.getBrainLint()` | None | Optional filters | Uses `resolveNarrativeBrainId()`. |
| `run_brain_lint` | `ArtifactBrainScholarService.runBrainLint()` | None | Optional brain_id | Uses `resolveNarrativeBrainId()`, then enqueues `brain_lint`. |
| `resolve_brain_lint` | `ArtifactBrainScholarService.resolveBrainLint()` | None | Requires `id` by handler | Updates lint result by id; no brain ownership check in handler. |

### Cognition / Beliefs / Perspectives

| Action | Handler | Schema in `ACTION_SCHEMAS` | Agent docs | Current target resolution |
| --- | --- | --- | --- | --- |
| `get_belief_patterns` | `ArtifactBrainScholarService.getBeliefPatterns()` | None | Optional `brain_id`, `status`, `limit` | Uses `resolveCognitionContext()` -> `resolveNarrativeBrainId()`. |
| `create_belief_pattern` | `ArtifactBrainScholarService.createBeliefPattern()` | None | Docs say `brain_id`, pattern fields | Uses cognition context; inserts subject_id=userId and brain_id. |
| `update_belief_pattern` | `ArtifactBrainScholarService.updateBeliefPattern()` | None | Docs require `id` | Verifies pattern in scoped cognition query. |
| `archive_belief_pattern` | `ArtifactBrainScholarService.archiveBeliefPattern()` | None | Docs require `id` | Verifies pattern in scoped cognition query. |
| `merge_belief_patterns` | `ArtifactBrainScholarService.mergeBeliefPatterns()` | None | Docs require primary/secondary ids | Verifies both in scoped cognition query. |
| `connect_belief_to_memory` | `ArtifactBrainScholarService.connectBeliefToMemory()` | None | Docs require belief_id and memory_id | Verifies belief scope; does not verify memory belongs to same brain. |
| `disconnect_belief_from_memory` | `ArtifactBrainScholarService.disconnectBeliefFromMemory()` | None | Docs require belief_id and memory_id | Verifies belief scope; removes id from array. |
| `get_perspectives` | `ArtifactBrainScholarService.getPerspectives()` | None | Optional `brain_id`, `status`, `limit` | Uses cognition context. |
| `create_perspective` | `ArtifactBrainScholarService.createPerspective()` | None | Docs say `brain_id`, name, description, narrative_md | Uses cognition context; inserts subject_id=userId and brain_id. |
| `update_perspective` | `ArtifactBrainScholarService.updatePerspective()` | None | Docs require `id` | Verifies perspective in scoped cognition query. |
| `archive_perspective` | `ArtifactBrainScholarService.archivePerspective()` | None | Docs require `id` | Verifies perspective in scoped cognition query. |
| `connect_belief_to_perspective` | `ArtifactBrainScholarService.connectBeliefToPerspective()` | None | Docs require perspective_id and belief_id | Verifies both in scoped cognition query. |
| `disconnect_belief_from_perspective` | `ArtifactBrainScholarService.disconnectBeliefFromPerspective()` | None | Docs require perspective_id and belief_id | Verifies perspective in scoped cognition query. |

### Company Brain / Company Cortex

| Action | Handler | Schema in `ACTION_SCHEMAS` | Agent docs | Current target resolution |
| --- | --- | --- | --- | --- |
| `get_company_cortex_objects` | `ArtifactCompanyCortexService.getCompanyCortexObjects()` | None | Optional object_type/status/limit | Requires org context; optional `brain_id`; must be company brain in current org. |
| `get_company_cortex_object_edges` | `ArtifactCompanyCortexService.getCompanyCortexObjectEdges()` | None | Optional source/target filters | Same company resolver. |
| `search_company_cortex` | `ArtifactCompanyCortexService.searchCompanyCortex()` | None | Requires query by handler | Same resolver; semantic RPC fallback to title/truth ilike. |
| `create_company_cortex_object` | `ArtifactCompanyCortexService.createCompanyCortexObject()` | None | object_type/title/truth in docs | Same resolver; object_type must be one of belief/perspective/tension/standard/move/anti_pattern/protocol/decision/retrieval_rule. |
| `update_company_cortex_object` | `ArtifactCompanyCortexService.updateCompanyCortexObject()` | None | Requires `id` by handler | Same resolver; updates fields by id within org/brain. |
| `archive_company_cortex_object` | `ArtifactCompanyCortexService.archiveCompanyCortexObject()` | None | Requires `id` by handler | Sets status retired. |
| `create_company_cortex_edge` | `ArtifactCompanyCortexService.createCompanyCortexEdge()` | None | source_object_id, target_object_id, relation_type | Same resolver; relation_type supports/contradicts/contains/enforces/derived_from/refines. |
| `delete_company_cortex_edge` | `ArtifactCompanyCortexService.deleteCompanyCortexEdge()` | None | Requires `id` by handler | Deletes edge by id in org/brain. |

### Delete

| Action | Handler | Schema in `ACTION_SCHEMAS` | Agent docs | Current target resolution |
| --- | --- | --- | --- | --- |
| `delete_brain_node` | `ArtifactBrainScholarService.deleteBrainNode()` | None | node_type and node_id in docs | Calls internal `/brain/nodes/delete`. Supports memory, snapshot, sk_entry, sk_source, connection. |

## Brain Actions With Schema Preflight

This section is historical inventory from the original Brain tools audit. PromptMode now requires every `VALID_ACTIONS` entry, including Brain actions, to have schema and preflight classification coverage.

| Action | Required | Optional / notes |
| --- | --- | --- |
| `save_memory` | `content`, `memory_type` | No type enum validation in schema; handler validates type. |
| `ingest_brain_text` | `text`, `title` | Handler also accepts `content`; schema does not mention `content`. |
| `ingest_sk_text` | `text`, `title` | Handler also requires `sourceType` and `brain_id` or session agent brain. Schema does not require them. |
| `ingest_sk_link` | `url` | Handler also requires `brain_id` or session agent brain. |
| `ingest_brain_link` | `url` | Handler may require `title` if extraction has no title. |
| `ingest_campaign_file` | `campaignId`, `title`, `content` | Handler also accepts `campaign_id`, source/media fields. |
| `ingest_campaign_url` | `campaignId`, `url` | Handler also accepts `campaign_id`, domain. |
| `ingest_fathom_meeting` | one of `meeting_id`, `recording_id`, `call_id`, `meeting` | Optional: `title`, `brainId`, `brain_id`, `targetBrain`, `target_brain`, `campaignId`, `campaign_id`. |

Remaining Brain risk is not missing schema entries; it is disagreement between some handler requirements, generated docs, and how explicit target ids are authorized.

## Agent Docs / Generated Skill

The docs agents read come from `VIBEY_API_ACTION_DOCS` and `generateScopedVibeyApiSkill()`.

Key generated Brain patterns today:

```text
Brain routing: Two separate scopes exist (user brain, agent SK brain).
save_memory always writes to the user's default brain with no way to target a different one.
Use ingest_sk_text/ingest_sk_link with brain_id from resolve_agent_sk_brain for agent SK brains.
Wrong action = data in wrong brain, no error.
```

Problems with current docs:

- They describe only two Brain scopes: user brain and agent SK brain.
- They do not model Customer Brain, Company Brain, Campaign Brain as first-class tool families.
- They warn that wrong action can write data into the wrong brain, which confirms the current tool model is unsafe.
- They say `save_memory` has no way to target a different brain, but live voice tools do have `save_to_other_brain`.
- They say campaign context is automatically resolved and `campaign_id` should never be passed, but several Brain tools explicitly require/pass campaign IDs.

## Capability / Policy Exposure

Brain-related policy buckets:

- `CAT_MEMORY`: `save_memory`, `search_memory`, `resolve_agent_sk_brain`, `search_sk_entries`.
- `CAT_BRAIN_READ`: `search_campaign_knowledge`, `get_brain_stats`, `list_brain_scopes`, `list_recent_memories`, `list_brain_domains`.
- `CAT_BRAIN_CORTEX_READ`: `get_narrative_pages`, `get_belief_patterns`, `get_perspectives`, `get_company_cortex_objects`, `get_company_cortex_object_edges`, `search_company_cortex`.

Important allowlists:

- `BRAIN_SCHOLAR_ALLOWED_ACTIONS` includes nearly all Brain write/read actions, plus integration extraction/delegation.
- Managed baseline agents get `CAT_MEMORY`, `CAT_BRAIN_READ`, and `CAT_BRAIN_CORTEX_READ`, which means many non-Atlas agents can read Brain/Cortex surfaces.
- `BUILDER_ALLOWED_ACTIONS` includes `save_memory`, `search_memory`, `search_sk_entries`, `resolve_agent_sk_brain`, `ingest_sk_text`, `ingest_sk_link`.
- `VIBEY_ALLOWED_ACTIONS` includes promoted broad access, but it is not a clean Brain-specific model.

Point of failure:

- Policy is action-name based, not brain-type based.
- A tool name like `search_sk_entries` does not encode whether the target is User Brain, Agent Brain, or shared brain.
- `train`/write semantics are not represented in action names or schema.

## Docker / OpenClaw Bridge

`docker/tools/vibey-backend/index.ts` exposes `vibey_backend` with:

- `action`: enum from `SUPPORTED_ACTIONS` or agent-specific `ALLOWED_ACTIONS.json`.
- `label`: required UI label.
- `data`: free-form object.

The bridge performs only limited local validation:

- It validates `add_funnel_page` and `update_funnel_page`.
- It does not validate Brain action schemas locally.
- It forwards to agent-api `/api/artifacts/stream`.

Point of failure:

- If generated docs and agent-api schemas disagree, OpenClaw does not catch Brain mistakes before the API call.

## Live Voice Brain Tool Surface

`apps/agent-api/src/modules/brain/services/brain-live.service.ts` exposes a separate tool system for Gemini Live. These are not `vibey_backend` actions.

| Live action | Schema source | Runtime behavior |
| --- | --- | --- |
| `save_memory` | `buildToolDeclarations()` requires `content`; `memory_type` present in properties but not required | Saves to current voice session brain via `memoriesService.createMemory()`. |
| `search_memory` | Listed in `BRAIN_LIVE_ACTIONS`, but only `search_brain` is declared in live tool declarations | `executeBrainAction()` handles both `search_memory` and `search_brain`. |
| `search_brain` | Requires `query` | Searches current session brain. |
| `get_brain_stats` | No required params | Counts current session brain. |
| `list_recent_memories` | Optional `limit` | Lists current session brain memories. |
| `trigger_crystallization` | Requires `input` | Crystallizes into current session brain. |
| `list_available_brains` | No params | Lists `ns_brains.owner_id = userId`; personal + agent, no shared brains. |
| `save_to_other_brain` | Requires `content`, `target_brain_id`; `memory_type` property | Writes to any owned target brain. |
| `copy_memory_to_brain` | Requires `memory_id`, `target_brain_id` | Copies memory from current brain to owned target. |
| `move_memory_to_brain` | Requires `memory_id`, `target_brain_id` | Copies then deletes from current brain. |

Point of failure:

- Live voice already has cross-brain actions, while `vibey_backend` docs say `save_memory` has no target override.
- Live voice target model does not know `brain_shares`.
- Live voice uses `current brain` language, while chat `vibey_backend` uses implicit user/agent/session fallback.

## Main API / Internal API Endpoints

### Public Brain API

| Endpoint | Controller | Purpose |
| --- | --- | --- |
| `POST /api/brain/remember` | `MemoriesController.remember()` | Enqueue user default brain document memory import. |
| `POST /api/brain/search` | `MemoriesController.search()` | Search user default brain memories via `MemoriesService.searchMemories()`. |
| `POST /api/brain/remember-link` | `MemoriesController.rememberLink()` | Enqueue user default brain link import. |
| `POST /api/brain/process/conversation` | `MemoriesController.processConversation()` | Extract memories from conversation messages. |
| `GET /api/brain/brains` | `MemoriesController.listBrains()` | Lists accessible brains via `BrainPermissionsService.listAccessibleBrains()`. |
| `GET /api/brain/stats` | `MemoriesController.stats()` | User/agent brain stats. |
| `GET /api/brain/health` | `MemoriesController.health()` | Brain health, optional `agent_id`/`brain_id`. |
| `GET/PATCH/DELETE /api/brain/memories/:id` | `MemoriesController` | Memory CRUD. |
| `POST /api/brain/memories/:id/connect` | `MemoriesController.connect()` | Memory connections. |
| `DELETE /api/brain/connections/:id` | `MemoriesController.deleteConnection()` | Delete memory connection. |
| `POST /api/brain/nodes/transfer` | `MemoriesController.transferNode()` | User-facing transfer node endpoint. |

### Search API

| Endpoint | Controller | Purpose |
| --- | --- | --- |
| `GET /api/brain/search` | `SearchController.search()` | Query brain graph/search by text. Optional `brainId`, `agentId`; explicit brainId checks `assertCanQueryBrain`. |
| `POST /api/brain/search/image` | `SearchController.searchByImage()` | Image embedding search. Optional `brainId`, `agentId`; explicit brainId checks `assertCanQueryBrain`. |
| `POST /api/brain/search/feedback` | `SearchController.submitFeedback()` | Search feedback. |

### SK API

| Endpoint | Controller | Purpose |
| --- | --- | --- |
| `POST /api/brain/sk/extract-text` | `SkController.extractText()` | Extract text from file/URL. |
| `POST /api/brain/sk/ingest` | `SkController.ingest()` | Enqueue agent/SK brain text ingest; requires `brainId`; asserts train. |
| `POST /api/brain/sk/ingest-link` | `SkController.ingestLink()` | Enqueue agent/SK brain URL ingest; requires `brainId`; asserts train. |
| `GET /api/brain/sk/sources` | `SkController.getSources()` | Requires `brainId`; asserts view. |
| `GET /api/brain/sk/search` | `SkController.search()` | Requires `brainId`; asserts query. |
| `GET /api/brain/sk/gaps` | `SkController.getGaps()` | Requires `brainId`; asserts view. |
| `GET /api/brain/sk/stats` | `SkController.getStats()` | Requires `brainId`; asserts view. |
| `DELETE /api/brain/sk/entries/:id` | `SkController.deleteEntry()` | Loads brain_id then asserts train. |
| `DELETE /api/brain/sk/sources/:id` | `SkController.deleteSource()` | Loads brain_id then asserts train. |
| `PATCH /api/brain/sk/mastery` | `SkController.updateMastery()` | Loads entry brain_id then asserts train. |

### Import Jobs API

| Endpoint | Controller | Purpose |
| --- | --- | --- |
| `POST /api/brain/import-jobs/remember-document` | `ImportJobsController` | Enqueue user brain document import. |
| `POST /api/brain/import-jobs/fathom-meeting` | `ImportJobsController` | Enqueue Fathom meeting, optional brainId/targetBrain; explicit brainId asserts train. |
| `POST /api/brain/import-jobs/remember-link` | `ImportJobsController` | Enqueue user brain link import. |
| `POST /api/brain/import-jobs/fireflies-transcript` | `ImportJobsController` | Enqueue Fireflies transcript, optional brainId/targetBrain; explicit brainId asserts train. |
| `POST /api/brain/import-jobs/campaign-file` | `ImportJobsController` | Campaign file ingest. |
| `POST /api/brain/import-jobs/campaign-url` | `ImportJobsController` | Campaign URL ingest. |
| `POST /api/brain/import-jobs/campaign-fathom` | `ImportJobsController` | Campaign Fathom ingest. |
| `POST /api/brain/import-jobs/campaign-fireflies` | `ImportJobsController` | Campaign Fireflies ingest. |
| `POST /api/brain/import-jobs/sk-ingest` | `ImportJobsController` | Agent/SK brain text ingest, asserts train. |
| `POST /api/brain/import-jobs/sk-ingest-link` | `ImportJobsController` | Agent/SK brain URL ingest, asserts train. |
| `GET /api/brain/import-jobs/active` | `ImportJobsController` | Active jobs, optional brainId/campaignId. |
| `GET/DELETE/POST retry/dismiss` | `ImportJobsController` | Job management. |

### Company / Customer / Cortex API

| Endpoint | Controller | Purpose |
| --- | --- | --- |
| `GET /api/brain/company/status` | `CortexMaxController` | Get/create company brain/settings; editor role. |
| `PATCH /api/brain/company/settings` | `CortexMaxController` | Update company settings; admin role. |
| `GET /api/brain/company/objects` | `CortexMaxController` | List company cortex objects. |
| `GET /api/brain/company/signals` | `CortexMaxController` | List proposed company signals. |
| `PATCH /api/brain/company/signals/:signalId` | `CortexMaxController` | Update signal status; admin role. |
| `GET /api/brain/customer/status` | `CortexMaxController` | Get/create customer brain. |
| `POST /api/brain/customer/memories/text` | `CortexMaxController` | Direct customer brain text memory write. |
| `POST /api/brain/customer/memories/link` | `CortexMaxController` | Direct customer brain link memory write. |
| `PATCH /api/brain/customer/enabled` | `CortexMaxController` | Enable/disable customer brain. |
| `PATCH /api/brain/:brainId/cortex-max` | `CortexMaxController` | Toggle Cortex Max for owned brain. |
| `POST /api/brain/:brainId/cortex-max/crystallize` | `CortexMaxController` | Enqueue manual cortex crystallization. |
| `GET /api/brain/:brainId/narrative-pages` | `CortexMaxController` | List active narrative pages; owner-only check. |

### Internal API Called By Tools

| Endpoint | Caller | Purpose |
| --- | --- | --- |
| `POST /api/internal/brain/import-jobs/fathom-meeting` | `ingest_fathom_meeting` | Fetch transcript/summary and enqueue Fathom brain import. |
| `POST /api/internal/brain/nodes/transfer` | `transfer_brain_node` | Service role transfer of node between scopes. |
| `POST /api/internal/brain/nodes/delete` | `delete_brain_node` | Service role delete after ownership checks. |
| `POST /api/internal/brain/nodes/transfer-by-source` | `transfer_brain_by_source` | Batch transfer by source title. |
| `POST /api/internal/brain/nodes/assign-source` | `assign_memory_source` | Assign source title/id on user default brain. |

## Current Resolver Patterns

| Resolver | File | Behavior |
| --- | --- | --- |
| User default resolver | Many files after Phase 1 | `owner_id + is_default + scope='user' + org_id IS NULL`. |
| Agent brain resolver | `ArtifactBrainScholarService.resolveAgentBrainId()` | `owner_id + agent_id`, optionally `org_id` when session org exists. |
| Readable brain resolver | `ArtifactBrainScholarService.resolveReadableBrainId()` | explicit `brain_id` -> current agent brain -> user default. No permission check for explicit brain. |
| Narrative brain resolver | `ArtifactBrainScholarService.resolveNarrativeBrainId()` | explicit `brain_id` or brain-job id; requires `owner_id === userId`. |
| Company brain resolver | `ArtifactCompanyCortexService.resolveCompanyBrain()` | org context required; explicit or default org company brain; verifies scope/company org. |
| Campaign resolver | `searchCampaignKnowledge()` / internal transfer | explicit campaign_id or session campaign resolver. |
| Brain permissions resolver | `apps/api/src/modules/brain/services/brain-permissions.service.ts` | Main API has `brain_shares` access logic; agent-api does not use it yet. |

## Major Point-Of-Failure List

1. **Tool names are not brain-type explicit.** `save_memory`, `search_memory`, `search_sk_entries`, and `get_narrative_pages` hide the actual target model.

2. **Schema coverage is now enforced, but schema quality can still vary.** Every PromptMode action has an `ACTION_SCHEMAS` entry and preflight classification; remaining work is tightening individual schemas where handler/docs semantics still disagree.

3. **Docs and handlers disagree.** Example: `ingest_sk_text` docs say `brain_id` is required, handler requires `brain_id` or session brain, but schema only requires `text` and `title`.

4. **Explicit `brain_id` is not consistently authorized in agent-api.** Main API uses `BrainPermissionsService`, but agent-api Brain tools mostly use service client and local owner/session checks.

5. **`resolveReadableBrainId()` can silently fall back to user default.** For multiple selected/future shared brains this is unsafe.

6. **`resolveNarrativeBrainId()` blocks shared brains by owner check.** This will fail for future shared-brain reads even when `brain_shares` grants query.

7. **Company Brain is separate and clearer than other Brain types.** It already has explicit company action names; this is the pattern to copy.

8. **Customer Brain has API endpoints but no explicit `vibey_backend` action family.** Customer writes currently happen through customer API or special brain-job `save_memory` behavior.

9. **Campaign Brain is partly `campaign_nodes`, not always `ns_brains`.** Existing tools use `search_campaign_knowledge` and campaign ingest actions, which are clearer than user/agent tools.

10. **Live voice exposes a separate cross-brain model.** Phase 2 must either align live voice tool names/contracts or explicitly leave it out with a documented reason.

11. **Policy is action-level, not brain-type-level.** `CAT_MEMORY`, `CAT_BRAIN_READ`, and `CAT_BRAIN_CORTEX_READ` do not encode User vs Agent vs Customer vs Company vs Campaign Brain.

12. **OpenClaw bridge does not validate Brain schemas.** It trusts generated docs and agent-api handler validation.

## Phase 2 Refactor Checklist

Before coding Phase 2, decide and document:

- Final action names by brain type.
- Which old action names remain as aliases, and for how long.
- Which actions are read-only vs write/train.
- Which actions can target shared brains.
- Which actions must require explicit `brain_id`.
- Whether live voice Brain tools are refactored in the same phase or stopped behind a separate hard stop.
- How `describe_action` will expose new schemas.
- How `BRAIN_SCHOLAR_ALLOWED_ACTIONS`, managed baseline, builder, and Vibey allowlists change.
- How generated `vibey-api` docs explain ambiguity and target selection.
- How handler-level enforcement rejects unselected or ambiguous brain targets.

## Recommended Direction

Use the Company Cortex pattern as the model: action names should encode the brain family.

Candidate families:

- User Brain: `search_user_brain`, `save_user_memory`, `ingest_user_brain_text`, `ingest_user_brain_link`, `list_user_brain_memories`.
- Agent Brain: `resolve_agent_brain`, `search_agent_brain`, `ingest_agent_brain_text`, `ingest_agent_brain_link`, `list_agent_brain_domains`.
- Customer Brain: `search_customer_brain`, `save_customer_memory_manual`, `list_customer_avatars`, `ingest_customer_brain_text`.
- Company Brain: keep/normalize existing `*_company_cortex_*` or rename to `*_company_brain_*`.
- Campaign Brain: keep/normalize `search_campaign_knowledge`, `ingest_campaign_file/url`.
- Shared Brain: no write action from chat; read only through selected runtime context and explicit read tools.

Do not implement shared-brain picker/context until this action model is explicit and enforced.
