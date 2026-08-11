# Page Grader Campaign Brain Sync

Last Modified: August 11, 2026

## Overview

Mapped Page Grader clients sync continuously into ROAS campaign brains. Page Grader remains the Client Intel source cache; ROAS is the canonical agentic memory (Brain canvas + Campaign Knowledge). Campaign-attached Meta ads (`ad_campaign` / `ad_set` / `ad`) are also indexed into Campaign Knowledge on Meta sync and Studio ad CRUD so agents can retrieve live creatives alongside Client Intel.

## Data Flow

1. Operator maps a Page Grader client → ROAS campaign/space in Settings → Integrations → Page Grader → Map clients. An unmapped client creates a canonical **General** Space; later syncs deterministically reuse the Space marked `schema.custom_data.space_role = general`.
2. **Create & import / Re-sync** pulls `GET /clients/:id/brain-package` and runs **deterministic dual ingest** (no Atlas LLM):
   - Upserts `ns_memories` (+ evidence chunks) on the campaign brain by `content_hash`
   - Embeds any Page Grader `ns_memories` rows whose Brain vector is still
     missing, including unchanged packages from older imports
   - Indexes seed memories into Campaign Knowledge via `SpaceRetrievalIndexService` / `space_semantic_objects`
   - Stamps cursors on `campaigns.config.external_sources.page_grader` and `user_integrations.metadata.client_scope_map`
   - Records a succeeded `page_grader_brain_sync` job for the Brain processing queue
3. **Hybrid continuous drivers:**
   - **PG push:** after Client Intel refresh / Send to ROAS-BRAIN, Page Grader POSTs `{ client_id, content_hash }` to `/api/integrations/page-grader/webhooks/brain-package` (`x-page-grader-signature`)
   - **ROAS hourly catch-up:** `POST /api/internal/brain/import-jobs/enqueue-due` and `POST /api/internal/page-grader/brain-sync/catch-up` re-fetch packages for mapped clients and ingest when hash differs
   - **Manual Re-sync:** Map clients row + Brain canvas Import → “Re-sync from Page Grader” (`force: true`)
4. Unchanged `content_hash` skips package writes only when the mapped campaign
   already has indexed Campaign Knowledge. It still repairs missing Campaign
   Brain embeddings before returning. If the campaign is an empty shell,
   catch-up automatically runs one forced, content-hash-deduplicated repair
   import. Unmapped clients never create campaigns from catch-up/webhook.
5. The importer always writes the canonical Space schema (`version`, system `fields`, standard views, and Page Grader provenance). The web reader also normalizes incomplete legacy schemas, and migration `20260719210500_repair_page_grader_general_spaces.sql` repairs previously malformed Page Grader Spaces in place.
6. New campaigns keep their package `content_hash` empty until deterministic ingest succeeds. Campaign Knowledge rows index with provider concurrency capped at six. Their measured embedding tokens settle in billing batches of 250 rows so internal credits reflect aggregate provider cost plus markup instead of rounding every vector request up to one credit.
7. Campaign Knowledge graph reads paginate through Supabase's 1,000-row response ceiling up to the graph endpoint's 5,000-object limit. The response continues to use aggregate database stats for true object and connection totals.

## Package contract

Envelope fields:

- `content_hash` — SHA-256 of canonical package body **excluding** wall-clock `exported_at`
- `exported_at` — export timestamp
- `package_version` — currently `"1"`

## Auth

| Path          | Auth                                                                             |
| ------------- | -------------------------------------------------------------------------------- |
| Pull package  | Existing Page Grader vault API key                                               |
| Push webhook  | `user_integrations.metadata.webhook_secret` matched to `x-page-grader-signature` |
| Catch-up cron | Internal auth token                                                              |

Page Grader env for push: `ROAS_BRAIN_WEBHOOK_URL`, `ROAS_BRAIN_WEBHOOK_SECRET` (must match the connected ROAS user’s webhook secret).

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

The prep agent receives a bounded Page Grader context pack containing cached Meta performance with source range and freshness, recent meeting notes, active campaigns, open fulfillment work, prior agendas, and Client Brain intelligence. Operator notes remain a distinct input. The Drive writer accepts only a substantive six-section result: Agenda, Performance, Wins, Campaign notes, Other updates, and Needs / blockers. Generic placeholders such as “see dashboard,” cross-client material, and an otherwise successful prep without a completed Drive tab are treated as failures that can be retried.

Repeated manual requests use the deterministic Page Grader client and meeting timestamp key. A ready item is skipped only after its Drive tab exists; a stale pending or failed write can run again. Stored document links preserve the raw Google Docs tab identifier in the `tab` query parameter.

## Code map

| Concern              | Location                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Deterministic ingest | `apps/api/src/modules/brain/services/page-grader-brain-package-ingest.service.ts`                                     |
| Brain vector repair  | `page-grader-memory-embedding.service.ts`, `scripts/roas/backfill-campaign-brain-embeddings.py`                       |
| Create/import entry  | `page-grader-client-import.service.ts` → `page-grader-brain-import.service.ts`                                        |
| Campaign Spaces      | `page-grader-campaign-space-schema.ts` → `page-grader-client-import.service.ts`                                       |
| Webhook + catch-up   | `page-grader-brain-sync.service.ts`, `page-grader-webhooks.controller.ts`                                             |
| Map clients UI       | `PageGraderClientScopeMapModal.tsx` / `PageGraderClientScopeMapRow.tsx`                                               |
| Brain canvas Re-sync | `CampaignAddInfoImportMenu.tsx` / `CampaignAddInfoPanel.tsx`                                                          |
| PG package + push    | `page-grader/.../roasBrainPackage.ts`, `roasBrainPush.ts`, `scheduled-brain-refresh`                                  |
| Fathom meetings      | `page-grader-meeting-sync.service.ts`, `fathom-webhook.service.ts`, Page Grader `roas-api`                            |
| Precall Drive agenda | `meetings-precall-prep.service.ts`, `meetings-precall-drive-agenda.service.ts`, `meetings-precall-agenda-sections.ts` |

## Decision Log

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

## Rollout

Pilot reconciliation should cover five multi-campaign clients first: Andy Elliott, Multifamily Strategy, Standard Plumbing Supply, The One Percent Life, and Sakha Media Group. Review Space names and Meta links in ROAS, correct any source records in Page Grader, then run the same idempotent catch-up across the remaining mapped clients. The active-client workbook is an audit aid for missing campaigns; it is not the source of truth.
