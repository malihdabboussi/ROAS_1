# Page Grader Campaign Brain Sync

Last Modified: July 19, 2026

## Overview

Mapped Page Grader clients sync continuously into ROAS campaign brains. Page Grader remains the Client Intel source cache; ROAS is the canonical agentic memory (Brain canvas + Campaign Knowledge).

## Data Flow

1. Operator maps a Page Grader client → ROAS campaign/space in Settings → Integrations → Page Grader → Map clients. An unmapped client creates a canonical **General** Space; later syncs deterministically reuse the Space marked `schema.custom_data.space_role = general`.
2. **Create & import / Re-sync** pulls `GET /clients/:id/brain-package` and runs **deterministic dual ingest** (no Atlas LLM):
   - Upserts `ns_memories` (+ evidence chunks) on the campaign brain by `content_hash`
   - Indexes seed memories into Campaign Knowledge via `SpaceRetrievalIndexService` / `space_semantic_objects`
   - Stamps cursors on `campaigns.config.external_sources.page_grader` and `user_integrations.metadata.client_scope_map`
   - Records a succeeded `page_grader_brain_sync` job for the Brain processing queue
3. **Hybrid continuous drivers:**
   - **PG push:** after Client Intel refresh / Send to ROAS-BRAIN, Page Grader POSTs `{ client_id, content_hash }` to `/api/integrations/page-grader/webhooks/brain-package` (`x-page-grader-signature`)
   - **ROAS hourly catch-up:** `POST /api/internal/brain/import-jobs/enqueue-due` and `POST /api/internal/page-grader/brain-sync/catch-up` re-fetch packages for mapped clients and ingest when hash differs
   - **Manual Re-sync:** Map clients row + Brain canvas Import → “Re-sync from Page Grader” (`force: true`)
4. Unchanged `content_hash` skips writes unless `force` is set. Unmapped clients never create campaigns from catch-up/webhook.
5. The importer always writes the canonical Space schema (`version`, system `fields`, standard views, and Page Grader provenance). The web reader also normalizes incomplete legacy schemas, and migration `20260719210500_repair_page_grader_general_spaces.sql` repairs previously malformed Page Grader Spaces in place.

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

## Code map

| Concern              | Location                                                                             |
| -------------------- | ------------------------------------------------------------------------------------ |
| Deterministic ingest | `apps/api/src/modules/brain/services/page-grader-brain-package-ingest.service.ts`    |
| Create/import entry  | `page-grader-client-import.service.ts` → `page-grader-brain-import.service.ts`       |
| Webhook + catch-up   | `page-grader-brain-sync.service.ts`, `page-grader-webhooks.controller.ts`            |
| Map clients UI       | `PageGraderClientScopeMapModal.tsx` / `PageGraderClientScopeMapRow.tsx`              |
| Brain canvas Re-sync | `CampaignAddInfoImportMenu.tsx` / `CampaignAddInfoPanel.tsx`                         |
| PG package + push    | `page-grader/.../roasBrainPackage.ts`, `roasBrainPush.ts`, `scheduled-brain-refresh` |

## Decision Log

- **2026-07-19:** Replaced Atlas `campaign_file_import` + `save_user_memory` for Page Grader packages. Atlas campaign write tools reject campaign targets, leaving jobs stuck at Processing with 0 objects.
- **2026-07-19:** Dual-write Brain memories + Campaign Knowledge; hybrid sync (push + hourly catch-up + manual).
- **2026-07-19:** Client Intel nightly orchestrator retries partial failures and pushes `content_hash` after successful intelligence generation — not UI-gated.
- **2026-07-19:** Page Grader mapping provisions/reuses a canonical General Space, legacy malformed schemas are repaired in place, and the frontend safely normalizes incomplete schemas instead of crashing.
