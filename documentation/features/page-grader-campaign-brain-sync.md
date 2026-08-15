# Page Grader Campaign Brain Sync

Last Modified: August 15, 2026

## Overview

Mapped Page Grader clients sync continuously into ROAS campaign brains. Page Grader remains the Client Intel source cache; ROAS is the canonical agentic memory (Brain canvas + Campaign Knowledge). Campaign-attached Meta ads (`ad_campaign` / `ad_set` / `ad`) are also indexed into Campaign Knowledge on Meta sync and Studio ad CRUD so agents can retrieve live creatives alongside Client Intel.

## Data Flow

1. Operator maps a Page Grader client → ROAS campaign in Settings → Integrations → Page Grader → Map clients. The ROAS campaign is the client/brand container. An unmapped client creates a canonical **General** Space; later syncs deterministically reuse the Space marked `schema.custom_data.space_role = general`.
2. **Create & import / Re-sync** pulls `GET /clients/:id/brain-package` and runs **deterministic dual ingest** (no Atlas LLM):
   - Upserts `ns_memories` (+ evidence chunks) on the campaign brain by `content_hash`
   - Embeds any Page Grader `ns_memories` rows whose Brain vector is still
     missing, including unchanged packages from older imports
   - Indexes seed memories into Campaign Knowledge via `SpaceRetrievalIndexService` / `space_semantic_objects`
   - Stamps cursors on `campaigns.config.external_sources.page_grader` and `user_integrations.metadata.client_scope_map`
   - Records a succeeded `page_grader_brain_sync` job for the Brain processing queue
3. **Hybrid continuous drivers:**
   - **PG push:** after Client Intel refresh / Send to ROAS-BRAIN, Page Grader POSTs `{ client_id, content_hash }` to `/api/integrations/page-grader/webhooks/brain-package` (`x-page-grader-signature`)
   - **ROAS hourly catch-up:** the dedicated `page-grader-brain-sync-sweep` queue job calls `POST /api/internal/page-grader/brain-sync/catch-up`, re-fetches packages for mapped clients, and ingests when hashes differ. The separate three-second Brain import queue sweep only discovers due Brain jobs; it never runs Page Grader synchronization.
   - **Manual Re-sync:** Map clients row + Brain canvas Import → “Re-sync from Page Grader” (`force: true`)
   - **Slack event handoff:** Page Grader's ten-minute Slack source sync POSTs active-client messages to `/api/integrations/page-grader/webhooks/slack-messages`. ROAS authenticates the existing client mapping, upserts by workspace + channel + Slack timestamp into `slack_observation_events`, and attaches deterministic client/campaign metadata plus `ingest_source = page_grader` before Pixel analyzes it. Native ROAS Slack capture and Page Grader delivery therefore converge on one event instead of creating two signals. The handoff uses the existing `reconciliation` ledger source, avoiding a production schema migration.
4. Every successful pull reconciles each Page Grader `client_campaign` into its own ROAS Space under the client campaign container. It creates or updates a source-linked **Campaign Brief** doc and carries over the Page Grader Meta ad account and Meta campaign mapping. Campaign Spaces include Overview, Docs, Missions, Calendar, Meta Ads, and Funnels views.
   - Reconciliation mirrors the Page Grader campaign screen: soft-deleted rows and `archived` campaigns are excluded.
   - A previously synced inactive Space is deleted only when it still contains generated Page Grader content exclusively. Spaces with operator-added content are retained for review.
5. Unchanged `content_hash` skips package writes only when the mapped campaign
   already has indexed Campaign Knowledge **and** the campaign/Meta fingerprint
   (`campaign_space_hash`) also matches, so operational Space structure cannot
   become stale behind an unchanged memory hash. It still repairs missing
   Campaign Brain embeddings before returning. If the campaign is an empty
   shell, catch-up automatically runs one forced, content-hash-deduplicated
   repair import. Unmapped clients never create campaigns from catch-up/webhook.
6. The importer always writes the canonical Space schema (`version`, system `fields`, standard views, and Page Grader provenance). The web reader also normalizes incomplete legacy schemas, and migration `20260719210500_repair_page_grader_general_spaces.sql` repairs previously malformed Page Grader Spaces in place.
7. New campaigns keep their package `content_hash` empty until deterministic ingest succeeds. Campaign Knowledge rows index with provider concurrency capped at six. Their measured embedding tokens settle in billing batches of 250 rows so internal credits reflect aggregate provider cost plus markup instead of rounding every vector request up to one credit.
8. Campaign Knowledge graph reads paginate through Supabase's 1,000-row response ceiling up to the graph endpoint's 5,000-object limit. The response continues to use aggregate database stats for true object and connection totals.

## Package contract

Envelope fields:

- `content_hash` — SHA-256 of canonical package body **excluding** wall-clock `exported_at`
- `exported_at` — export timestamp
- `package_version` — currently `"1"`

## Agency Clients workspace

ROAS now presents the shared agency hierarchy directly:

- **Clients** lists active Page Grader clients and defaults to pipeline-stage grouping. Operators can switch to account-manager grouping and search across clients and managers.
- **Client detail** is a quick account-manager briefing surface with Page Grader overview and client information plus current ROAS-mapped campaigns, fulfillment tasks, and client requests.
- **Client Campaigns** lists every non-deleted Page Grader `client_campaign` in an all-campaign view or grouped by client. Date/event, budget, status, and next-action fields remain sourced from Page Grader.
- A campaign row opens the stable ROAS Space whose `schema.custom_data.page_grader_campaign_id` matches the Page Grader campaign ID.

The agency list bootstraps unmapped clients through the existing deterministic Brain import. This creates or reuses the ROAS client campaign container, General Space, campaign Brain, and scope mapping before reconciling campaign Spaces. The existing SSO embed is retained for Page Grader-only workflows.

Shared client, campaign, task, and request edits use explicit allowlisted Page Grader write-through routes. Client and campaign writes dispatch the existing Brain webhook, with a direct ROAS import fallback when the webhook is unavailable. ROAS-origin task status changes also update the linked ClickUp task and return through the signed work-status webhook to the originating ROAS Space action item. Existing ROAS → Page Grader work creation remains in place, so the two products do not create competing canonical copies.

## Auth

| Path          | Auth                                                                             |
| ------------- | -------------------------------------------------------------------------------- |
| Pull package  | Existing Page Grader vault API key                                               |
| Push webhook  | `user_integrations.metadata.webhook_secret` matched to `x-page-grader-signature` |
| Catch-up cron | Internal auth token                                                              |

Operators can scope a rollout or repair to known Page Grader client IDs with
`POST /api/internal/page-grader/brain-sync/catch-up?client_ids=id-1,id-2&limit=5`. The default
hourly call continues to scan all mapped clients and skips matching brain plus campaign/Meta
fingerprints. When Brain content is already current but the campaign/Meta fingerprint differs,
catch-up reconciles campaign Spaces and stamps the new fingerprint without repeating the full
Brain ingestion pipeline.

Page Grader env for push: `ROAS_BRAIN_WEBHOOK_URL`, `ROAS_BRAIN_WEBHOOK_SECRET` (must match the connected ROAS user’s webhook secret).

`ROAS_SLACK_INGEST_WEBHOOK_URL` is optional. When omitted, Page Grader derives the Slack endpoint by replacing `/brain-package` in `ROAS_BRAIN_WEBHOOK_URL` with `/slack-messages`. Recent Page Grader Slack messages are also included in the Brain package as `page_grader_slack` channel knowledge, so the event loop gets immediate evidence while campaign Brain retains durable context. Closed or archived Page Grader clients are excluded before either handoff.

Periodic mapped-channel imports use Atlas separately from the deterministic Page Grader package ingest. Campaign-targeted imports must call `atlas_save_brain_context` with the mapped ROAS `campaign_id`; `save_user_memory` is user-only. The campaign branch writes directly to the mapped `ns_brains` row, preserves Slack source and temporal identity, and requires a retrieval embedding before reporting success; General is not a valid Campaign Brain target. Import completion is fail-closed: the runtime reads the final status from both direct text and nested OpenResponses output, and it does not mark the job successful or advance the Slack mapping cursor unless Atlas returns an explicit `JOB_STATUS:completed` or `JOB_STATUS:skipped`. Empty Slack windows never call Atlas; they persist as skipped with a user-facing "nothing to save" toast. Any failed chunk stops a multi-chunk import at that chunk so retry can resume without silently losing part of the period.

`atlas_save_brain_context` must remain in Atlas's `system_brain` capability
allowlist as well as its action contract, schema, lifecycle, preflight, MCP
catalog, and runtime handler. Capability drift coverage verifies the local
runtime policy so a declared Campaign Brain write cannot disappear from Atlas's
available chat workflow.

For campaign Slack imports, `JOB_STATUS:completed` is only a claim until the
main API verifies the exact source period in the mapped Campaign Brain. At
least one matching `ns_memories` row must exist and every matching row must
have a retrieval embedding before the job becomes succeeded or the mapping
cursor advances. A missing row or embedding converts the attempt to the normal
retry/failure lifecycle even if Atlas's final prose says completed.

Page Grader QC notifications also enter the unified `agent_cases` ledger before their Slack blocks are sent. Structured findings preserve `quality_control`, `proactive_launch`, or `campaign_quality_control`, resolve the mapped ROAS client campaign and campaign Space when available, and retain the Page Grader finding ID as the idempotent source key. Slack acknowledge, snooze, and resolve interactions update both Page Grader and the same ROAS case, preventing two competing status histories.

## Post-call work bridge

After a meeting recap is approved, ROAS keeps internal handoffs in its Action Ledger and sends only fulfillment candidates with an unambiguous Page Grader client and assignee. Resolution is per action item: explicit link, unique client-name match, then the meeting Space/campaign mapping as a fallback. The Page Grader work record preserves task type, subtype, source excerpt, meeting links, assignee, and ClickUp IDs.

Page Grader forwards ClickUp status changes to `/api/integrations/page-grader/webhooks/work-status`. It uses `ROAS_WORK_STATUS_WEBHOOK_URL` / `ROAS_WORK_STATUS_WEBHOOK_SECRET` when set, otherwise derives the work-status URL from `ROAS_BRAIN_WEBHOOK_URL` and reuses `ROAS_BRAIN_WEBHOOK_SECRET`. ROAS verifies the connected-client mapping plus the linked `space_item_id`, `client_id`, and `work_id` before updating the Action Ledger.

## Fathom meetings bridge

ROAS remains the Fathom source and routing controller. After the normal Fathom webhook creates its call item in ROAS, ROAS sends a normalized meeting record to the matching Page Grader client's **Meetings → Call Notes** tab. The Page Grader record contains the title, date, duration, attendees, summary, transcript, action items, recording URL, and ROAS provenance.

Client resolution is conservative and ordered:

1. Explicit Page Grader client IDs saved on the ROAS call item
2. The existing Page Grader client → ROAS campaign/Space mapping
3. One unique Page Grader client name found in the meeting context

Ambiguous calls are left with `needs_client_mapping` instead of being attached to the wrong client. An operator can attach an internal call to one or more clients with `POST /api/integrations/page-grader/meetings/:spaceItemId/sync` and `{ "client_ids": ["..."] }`. Historical or failed calls are retried through `POST /api/internal/page-grader/meetings/catch-up?limit=100`.

Page Grader upserts on the Fathom meeting ID plus client ID, so webhook retries and catch-up runs do not duplicate calls. Deploy the Page Grader migration and `roas-api` function before deploying the ROAS webhook sender.

## Unified precall agenda bridge

Page Grader's **New Agenda** action and eligible ROAS meetings use the same precall-prep pipeline. Page Grader owns the Google Docs template, weekly tab, and Meta ad-preview insertion. ROAS owns the agenda analysis and must use the exact client mapping's campaign Brain; an unmapped Page Grader client is rejected instead of falling back to another user's integration.

The prep agent receives a bounded Page Grader context pack containing cached Meta performance, recent meeting notes, active campaigns, open fulfillment work, prior agendas, and Client Brain intelligence. Operator notes remain a distinct input. The Drive writer accepts only a substantive seven-section result in this client-facing order: What's on the agenda, What we worked on this week, What we're working on next week, Raw performance data, Wins, Campaign notes / recommendations, and Needs / blockers. Page Grader keeps the branded template styling, renders the opening topics as native Google Docs checkboxes, and inserts Meta ad previews after the performance section.

The output contract is designed for a two-minute account-manager scan and a live client screen share. It forbids timed run-of-show blocks, internal source or integration caveats, diagnostic prompts, mechanical report labels, blank filler bullets, and generic placeholders such as “see dashboard.” Missing inputs are omitted rather than advertised to the client. A prep without every substantive section or without a completed Drive tab is treated as a retryable failure.

Repeated manual requests use the deterministic Page Grader client and meeting timestamp key. A ready item is skipped only after its Drive tab exists; a stale pending or failed write can run again. Stored document links preserve the raw Google Docs tab identifier in the `tab` query parameter.

## Code map

| Concern                 | Location                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Deterministic ingest    | `apps/api/src/modules/brain/services/page-grader-brain-package-ingest.service.ts`                                     |
| Brain vector repair     | `page-grader-memory-embedding.service.ts`, `scripts/roas/backfill-campaign-brain-embeddings.py`                       |
| Create/import entry     | `page-grader-client-import.service.ts` → `page-grader-brain-import.service.ts`                                        |
| Campaign Spaces         | `page-grader-campaign-space-schema.ts` → `page-grader-client-import.service.ts`                                       |
| Webhook + catch-up      | `page-grader-brain-sync.service.ts`, `page-grader-webhooks.controller.ts`                                             |
| Map clients UI          | `PageGraderClientScopeMapModal.tsx` / `PageGraderClientScopeMapRow.tsx`                                               |
| Brain canvas Re-sync    | `CampaignAddInfoImportMenu.tsx` / `CampaignAddInfoPanel.tsx`                                                          |
| PG package + push       | `page-grader/.../roasBrainPackage.ts`, `roasBrainPush.ts`, `scheduled-brain-refresh`                                  |
| Fathom meetings         | `page-grader-meeting-sync.service.ts`, `fathom-webhook.service.ts`, Page Grader `roas-api`                            |
| Precall Drive agenda    | `meetings-precall-prep.service.ts`, `meetings-precall-drive-agenda.service.ts`, `meetings-precall-agenda-sections.ts` |
| Agency client workspace | `page-grader-agency-workspace.service.ts`, `features/agency-clients`, Page Grader `roas-api`                          |

## Decision Log

- **2026-08-15:** Empty Slack periods are a skip, not an Atlas failure. The import runtime does not call Atlas when the formatted window has no message content, remaps Slack `JOB_STATUS:failed` empty-ingest reasons to skipped, and the Brain toast says there was nothing to save instead of "Atlas could not process/ingest".
- **2026-08-13:** Separated Page Grader's hourly mapped-client catch-up from the three-second Brain import sweep. The frequent enqueue endpoint is now bounded to due-job discovery, preventing overlapping 50-client Page Grader pulls from exhausting the Vercel function window.
- **2026-08-13:** Replaced the Campaign Brain router's `save_document` fallback with a direct embedded `ns_memories` write. Campaign imports now retain Slack source IDs and temporal fields, verify campaign access, reject General, and fail if retrieval embedding cannot be created.
- **2026-08-13:** Fixed periodic Campaign Brain imports that were falsely recorded as successful after Atlas rejected the user-only save route. Campaign jobs now use the canonical Atlas Brain router with the exact campaign id, nested OpenResponses terminal statuses are parsed, missing status markers fail closed, and failed chunks cannot advance the Slack cursor.
- **2026-08-13:** Routed QC, Proactive Launch, and Campaign QC notifications into the unified company/client/campaign case ledger before Slack delivery. Finding actions now synchronize back to that case lifecycle.
- **2026-08-12:** Added first-class agency Clients and Client Campaigns navigation. Page Grader clients are projected as ROAS client campaign containers; Page Grader client campaigns are stable ROAS Spaces. Missing clients bootstrap through deterministic Brain import, campaign Spaces carry source IDs, and shared client/campaign/task/request changes write through the Page Grader API.
- **2026-08-12:** Completed the agency workspace write loop. Client and campaign edits now refresh Brain and canonical campaign Spaces; ROAS-origin task status updates propagate through Page Grader to ClickUp and back to the linked ROAS action item; edit controls, date-only rendering, and Portal-facing labels were hardened for production use.
- **2026-08-11:** Replaced the analyst-style timed precall report with a concise client-facing meeting workspace. The agenda now opens with native checkboxes, separates completed work from next-week priorities, presents raw performance per live campaign, uses plain-English wins and recommendations, and shows only genuine client needs. Internal source availability and preparation gaps can no longer appear in the generated document.
- **2026-08-11:** Unified Page Grader manual agendas and ROAS precall prep behind the mapped client campaign. ROAS now supplies validated, client-safe, decision-ready content from bounded Brain, meeting, fulfillment, and cached Meta context; Page Grader remains the Google Docs/ad-preview writer. Missing mappings, lazy placeholder output, cross-client call context, failed Drive writes, and duplicate same-meeting requests no longer silently pass as successful agendas.
- **2026-07-23:** Page Grader imports had two separate vector stores:
  Campaign Knowledge chunks received embeddings, but their canonical
  `ns_memories` rows did not. Matching package hashes then skipped the importer
  before repair was possible. Every import now repairs missing Page Grader
  Brain vectors even when content is unchanged. The production backfill
  discovers every mapped Page Grader campaign Brain dynamically instead of
  carrying a hardcoded two-client list. Production repair embedded 8,889
  previously null vectors across 26 mapped client Brains; the final audit
  returned zero missing vectors for every mapped client.
- **2026-07-22:** Programs sit above Campaigns as a ClickUp Space shell (Clients / ROAS Ops). Page Grader still maps **client → campaign**; campaigns with `config.source = 'page_grader'` backfill into the Clients program. See `documentation/features/programs.md`.
- **2026-07-19:** Replaced Atlas `campaign_file_import` + `save_user_memory` for Page Grader packages. Atlas campaign write tools reject campaign targets, leaving jobs stuck at Processing with 0 objects.
- **2026-07-19:** Dual-write Brain memories + Campaign Knowledge; hybrid sync (push + hourly catch-up + manual).
- **2026-07-19:** Client Intel nightly orchestrator retries partial failures and pushes `content_hash` after successful intelligence generation — not UI-gated.
- **2026-07-19:** Page Grader mapping provisions/reuses a canonical General Space, legacy malformed schemas are repaired in place, and the frontend safely normalizes incomplete schemas instead of crashing.
- **2026-07-20:** Client Intel “Uploading to Vibey Brain” was still UI-gated (`ClientKnowledgeHubTab` auto-push). Page Grader now drains `client_knowledge_entries` → `client_memories` in `scheduled-brain-refresh` and hourly `scheduled-knowledge-brain-drain`, then pushes ROAS when imports land.
- **2026-07-20:** Campaign Knowledge stayed at Objects: 0 after successful `page_grader_brain_sync` because `SpaceRetrievalIndexService.indexSource` no-op’d without `SPACE_SEMANTIC_RETRIEVAL`/`SPACE_ASSET_INDEXING`, and ingest only indexed when `spaceId` was passed. Ingest now resolves the campaign General space, forces knowledge index, and indexes up to 500 seed+source memories. Prod Multifamily/Sakha were backfilled into `space_semantic_objects`.
- **2026-07-20:** Brain Campaign Knowledge in ROAS org opens org-scoped campaign duplicates, while Page Grader `client_scope_map` had pointed at personal copies — UI showed 15/9 objects vs full personal backfills. Org General spaces were backfilled; scope map retargeted to org Multifamily (`af082417…` / General `7aefc857…`) and Sakha (`a922909b…` / General `ae308930…`). Stale Failed Atlas `campaign_file_import` removed.
- **2026-07-20:** Org Campaign Knowledge blank on Sakha was caused by graph edge query `.in(from_object_id, ~800 uuids)` failing PostgREST; edges now load by `space_id`. Stale `client_scope_map` pointed at empty personal campaigns — remapped to org Sakha/Multifamily and soft-deleted personal empties; personal sync upgrades personal mapped campaigns to org.
- **2026-07-20:** Campaign Knowledge UI showed Objects: 500 / Connections: 0 / all “Conversation doc” because (1) graph API defaulted to limit 500 and used list length as totals, (2) Page Grader dual-write forced `conversation_document`, (3) Space hub objects were never indexed so structural Space→item edges were skipped. Graph default/max raised (2500/5000) with true stats; ingest maps PG provenance to avatar/offer/channel_message/space_doc/etc, indexes the Space hub first, and drops stale conversation_document duplicates. Prod Multifamily/Sakha remapped + edged via `scripts/roas/repair-page-grader-campaign-knowledge-graph.py`.
- **2026-07-20:** Campaign-attached Meta ads (`ad_campaign` / `ad_set` / `ad`) now index into Campaign Knowledge on Meta sync and Studio ad CRUD (`force: true`, General space + org scope). Structural edges are Space → ad_campaign → ad_set → ad (no Space → ad star). Existing rows: `scripts/roas/backfill-campaign-ads-knowledge.py`.
- **2026-07-20:** Active-client bootstrap exposed two import defects: newly created campaigns were pre-stamped with the incoming hash and skipped their first ingest, while hundreds of Campaign Knowledge records were indexed serially and exceeded the API request window. New campaigns now receive the hash only after success, and knowledge indexing runs in bounded batches of six.
- **2026-07-20:** Existing pre-stamped campaign shells could still remain permanently empty because catch-up trusted the matching hash. Catch-up now verifies indexed Campaign Knowledge before skipping and force-repairs empty mapped campaigns even when the client-scope mapping is missing its hash but the campaign shell has one. Graph object/edge reads now page through Supabase's 1,000-row ceiling instead of presenting 1,000 as the brain size. Production recovery verified all 26 mapped brands populated (12,028 semantic objects; 0 empty).
- **2026-07-20:** High-volume Page Grader imports were charged one minimum internal credit per embedding request even though Gemini's actual cost is token-based. Page Grader keeps the same Gemini calls and six-request concurrency, but settles measured usage in 250-row billing batches so integer rounding applies to aggregate cost.
- **2026-07-22:** Formalized the cross-product hierarchy: Page Grader client = ROAS client campaign container; Page Grader `client_campaign` = ROAS Space. Hourly and webhook-driven pulls now reconcile campaign Spaces and source-linked Campaign Brief docs even when the brain hash is unchanged. Page Grader Meta account/campaign mappings are recorded on the Space schema and brief when available.
- **2026-07-22:** The Page Grader brain package includes soft-deleted and archived `client_campaigns`, while the Page Grader UI hides them. Space reconciliation now applies the same visibility rule and safely retires generated-only stale Spaces; operator-edited Spaces are never automatically deleted.
- **2026-07-22:** Added ROAS-owned Fathom meeting delivery into Page Grader Client Meetings. Explicit mappings win, ambiguous calls wait for review, multi-client internal calls can fan out intentionally, and repeated delivery is idempotent.
- **2026-08-12:** The campaign→Space reconciliation code described by the 2026-07-22 entries had never merged (it was stranded on `codex/slack-signal-training`). Recovered onto main: `page-grader-campaign-space-schema.ts` / `page-grader-campaign-space-sync.ts`, the `campaign_space_hash` fingerprint on `client_scope_map`, catch-up `client_ids` scoping, and the read-only rollout audit script `scripts/roas/audit-page-grader-campaign-spaces.py`.
- **2026-08-12:** Catch-up now uses a reconciliation-only path when Brain content is unchanged and only the campaign/Meta fingerprint differs, preventing redundant ingestion from exhausting the API request window before the fingerprint can be stamped.

## Rollout

Pilot reconciliation should cover five multi-campaign clients first: Andy Elliott, Multifamily Strategy, Standard Plumbing Supply, The One Percent Life, and Sakha Media Group. Review Space names and Meta links in ROAS, correct any source records in Page Grader, then run the same idempotent catch-up across the remaining mapped clients. The active-client workbook is an audit aid for missing campaigns; it is not the source of truth.
