# Changelog - June 17, 2026

## 2026-06-17 12:52 - [FIX]

What:
- Rebuilt `@vibey/api-shared` so brain temporal exports (`normalizeTemporalPayload`, `temporalInsertFields`, `BrainTemporalPayload`) are in `dist`.
- Synced `@vibey/api` `BrainEvidenceIngestionService` with temporal episode upsert + `episode_id` return (matches agent-api).
- Added `BrainEvidenceRepository.upsertEpisode` and updated characterization test mocks.

Why:
- `document-ingestion.service.ts` imported temporal helpers and passed `temporal`/`episode_id`, but api-shared dist was stale and the api evidence service lacked temporal support.

Impact:
- All 5 TS errors in brain document ingestion compile path are resolved.

Files:
- `packages/api-shared/dist/**` (rebuilt)
- `apps/api/src/modules/brain/services/brain-evidence-ingestion.service.ts`
- `apps/api/src/modules/brain/repositories/brain-evidence.repository.ts`
- `apps/api/src/modules/brain/services/__tests__/type-c-services.characterization.test.ts`

## 2026-06-17 12:02 - [FIX]

What:
- Rebuilt `@vibey/api-shared` so document-intelligence exports are present in `dist`.
- Added `@vibey/api-shared` build step to `@vibey/api` dev script (mirrors agent-policy).

Why:
- API dev failed with TS2305 missing exports because source added document intelligence helpers but dist was stale.

Impact:
- `assessDocumentTextQuality`, `buildDocumentIntelligenceMetadata`, and related types resolve again in `@vibey/api`.

Files:
- `packages/api-shared/dist/**` (rebuilt)
- `apps/api/package.json`

## 2026-06-17 11:57 - [DOCS]

What:
- Updated the Phase 1 section of the architecture compliance remediation plan with a current Type D LOC/god-file decomposition backlog.
- Replaced the stale original god-file snapshot with current status, hard-limit scan result, and follow-up-log references.

Why:
- Phase 1 Type C-H3 direct-access remediation is complete, so the next work needs to be tracked as LOC/headroom decomposition instead of direct Supabase cleanup.

Impact:
- Phase 1 now separates completed Type A/B/C/C-H work from remaining Type D backlog categories.
- The plan now points to `.docs/plans/agent-follow-up-work.md` as the detailed per-file evidence source.

Files:
- `.docs/plans/architecture-compliance-remediation.md`

## 2026-06-17 11:40 - [FEATURE]

What:
- Added shared document intelligence quality policy for empty, low-signal, and usable extracted text.
- Added `media_assets.document_intelligence` migration and DTO/client typing.
- Updated upload indexing, chat parsing, document tools, and live document reading to reject watermark-only PDF text and OCR low-signal PDFs.
- Added native `input_file` fallback for eligible PDFs with no usable extracted text.
- Added upload chip reading/ready/failed status polling and tests.

Why:
- Image-based PDFs with repeated watermark text were treated as successfully read, so agents received unusable context and tried unrelated recovery strategies.

Impact:
- Low-signal PDF text is no longer chunked or sent as ready context.
- OCR text is stored/chunked when usable; otherwise eligible PDFs are attached to the model request as real files.
- Excel and data-file upload support remains accepted through the existing allowlists.

Files:
- `packages/api-shared/src/services/document-intelligence-policy.ts`
- `supabase/migrations/20260617123000_media_asset_document_intelligence.sql`
- `apps/api/src/modules/media/services/media-indexer.service.ts`
- `apps/api/src/modules/brain/services/document-extraction.service.ts`
- `apps/agent-api/src/modules/chat/services/document-parser.service.ts`
- `apps/agent-api/src/modules/chat/services/chat.service.ts`
- `apps/agent-api/src/modules/chat/services/openclaw-proxy.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-missions-media.service.ts`
- `apps/agent-api/src/modules/brain/services/brain-live.service.ts`
- `apps/web/src/features/studio/components/ChatInput.tsx`
- `apps/web/src/features/studio/components/chat/FileAttachments.tsx`
- `documentation/features/document-intelligence.md`

## 2026-06-17 11:34 - [FEATURE]

What:
- Added expand/collapse control to the delegate-to-agent conversation modal in chat.
- Modal width animates between default and wide layout via Framer Motion spring transition.

Why:
- Users need more horizontal space when reading longer agent delegation threads.

Impact:
- Expand icon sits left of the close button; state resets when the modal closes.

Files:
- `apps/web/src/features/studio/components/chat/AgentConversationThread.tsx`

## 2026-06-17 08:48 - [ARCH]

What:
- Moved org sharing and invitation delivery data access behind focused repositories.
- Added characterization coverage for campaign permission upsert/sync and invitation email/notification delivery.

Why:
- Continue Phase 1 Type C-H3 architecture remediation by removing direct Supabase access from org collaboration services.

Impact:
- `OrgSharingService` and `OrgInvitationService` now scan clean for direct Supabase/table access.
- Runtime behavior, controller contracts, invite email payloads, and notification side effects are preserved by focused tests.

Files:
- `apps/api/src/modules/org/services/org-sharing.service.ts`
- `apps/api/src/modules/org/services/org-invitation.service.ts`
- `apps/api/src/modules/org/repositories/org-sharing.repository.ts`
- `apps/api/src/modules/org/repositories/org-invitation-delivery.repository.ts`
- `apps/api/src/modules/org/org.module.ts`
- `apps/api/src/modules/org/services/__tests__/org-sharing.service.test.ts`
- `apps/api/src/modules/org/services/__tests__/org-invitation.service.test.ts`

## 2026-06-17 08:52 - [ARCH]

What:
- Moved org setup seeding and org agent import data access behind focused repositories.
- Added characterization coverage for org create side-effect seeding and full agent import with optional brain asset copy.

Why:
- Continue org Type C-H3 cleanup without mixing billing/Stripe side effects into the agent/import slice.

Impact:
- `OrgService` and `OrgAgentImportService` now scan clean for direct Supabase/table access.
- Remaining org Type C-H3 service direct-access work is isolated to `org-billing.service.ts` and `org-stripe.service.ts`.

Files:
- `apps/api/src/modules/org/services/org.service.ts`
- `apps/api/src/modules/org/services/org-agent-import.service.ts`
- `apps/api/src/modules/org/repositories/org-setup.repository.ts`
- `apps/api/src/modules/org/repositories/org-agent-import.repository.ts`
- `apps/api/src/modules/org/org.module.ts`
- `apps/api/src/modules/org/services/__tests__/org.service.test.ts`
- `apps/api/src/modules/org/services/__tests__/org-agent-import.service.test.ts`

## 2026-06-17 08:53 - [FIX]

What:
- Added Excel spreadsheet files to media library upload support across local upload, Google Drive, Dropbox, Spaces media cells, and presigned media asset classification.
- Centralized the media-library upload accept string and filename/MIME allowlist used by the touched upload surfaces.

Why:
- Users could upload document types like PDF, Word, text, markdown, skill, and CSV, but Excel sheets were missing from the media-library allowlists.

Impact:
- `.xls`, `.xlsx`, and `.xlsm` files can now be selected and uploaded where media-library document uploads are accepted.
- Native Google Sheets and uploaded Excel MIME types are treated as supported document media instead of being blocked or classified as `other`.

Files:
- `apps/web/src/components/media/drive-file-browser-modal.constants.ts`
- `apps/web/src/components/media/use-media-picker-upload.ts`
- `apps/web/src/components/media/MediaPickerLibraryToolbar.tsx`
- `apps/web/src/components/media/drive-file-browser-modal.utils.tsx`
- `apps/web/src/components/media/DropboxFileBrowserModal.tsx`
- `apps/web/src/features/spaces/components/cells/MediaCell.tsx`
- `apps/api/src/modules/media/services/media-service-03.base.ts`

## 2026-06-17 09:00 - [FIX]

What:
- Routed the Power model strategy to Opus 4.8 with 1M context and high thinking defaults.
- Removed Claude Fable 5 from selectable/default model catalogs while it is paused.
- Redirected stale chat selections for Claude Fable 5 back through the Power strategy.
- Updated Power model picker copy to reflect the Opus 4.8 1M high-thinking routing.

Why:
- Power was still resolving to paused Fable 5, and strategy selections did not carry the context/reasoning defaults needed by the chat runtime.

Impact:
- `auto:power` chat and mission strategy resolution now targets `anthropic/claude-opus-4.8` with `context_window_tokens: 1000000`, `reasoning_effort: high`, and standard speed.
- Fable 5 no longer appears in the workspace selectable/default model list.
- Existing chat configs that still reference Fable 5 normalize to Power during the pause.
- Strategy fallback validation no longer reuses primary model OpenClaw settings blindly.

Files:
- `packages/api-shared/src/services/model-strategy.ts`
- `packages/api-shared/src/services/model-strategy.test.ts`
- `packages/api-shared/src/index.ts`
- `apps/agent-api/src/modules/chat/services/chat.service.ts`
- `apps/api/src/modules/models/model-workspace.constants.ts`
- `apps/api/src/modules/models/services/models.service.ts`
- `apps/web/src/features/team/constants/team.constants.ts`
- `apps/web/src/features/studio/components/ChatInput.tsx`

## 2026-06-17 08:56 - [FIX]

What:
- Added spreadsheet extensions to the shared chat attachment accept list.
- Aligned mission quick capture with the shared chat attachment allowlist.
- Added macro-enabled Excel MIME support to the agent chat document parser.

Why:
- Users could upload Excel files through some mission-specific paths, but normal chat attachment pickers did not advertise spreadsheet files.

Impact:
- `.csv`, `.xls`, `.xlsx`, and `.xlsm` files can be selected from chat attachment pickers.
- `.xlsm` uploads are parsed through the same spreadsheet extraction path as `.xls` and `.xlsx` when the parser receives the macro-enabled Excel MIME type.

Files:
- `apps/web/src/features/studio/config/chat-toast-errors.config.ts`
- `apps/agent-api/src/modules/chat/services/document-parser.service.ts`
- `apps/agent-api/src/modules/chat/services/__tests__/document-parser.service.test.ts`

## 2026-06-17 08:58 - [FIX]

What:
- Added `.xlsm` to the Spaces Docs upload accept list and support check.

Why:
- The Docs upload menu already accepted `.xls` and `.xlsx`; macro-enabled Excel sheets should be accepted by the same spreadsheet upload path.

Impact:
- Users can select `.xlsm` from the Spaces Docs upload picker in addition to `.xls` and `.xlsx`.

Files:
- `apps/web/src/features/spaces/components/toolbar/DocsAddDocMenu.tsx`

## 2026-06-17 09:01 - [ARCH]

What:
- Moved org billing table access and org Stripe checkout/customer lookup access behind repositories.
- Added characterization coverage for balance rollover, credit deduction, member usage, auto-recharge, Stripe customer creation, checkout metadata, credit purchase metadata, and invoice mapping.

Why:
- Complete the remaining org Type C-H3 cleanup while preserving billing and Stripe service contracts.

Impact:
- `OrgBillingService` and `OrgStripeService` now scan clean for direct Supabase/table access.
- Org production code outside repositories now scans clean for this Type C-H3 direct Supabase/RPC/client-access pattern.

Files:
- `apps/api/src/modules/org/services/org-billing.service.ts`
- `apps/api/src/modules/org/services/org-stripe.service.ts`
- `apps/api/src/modules/org/repositories/org-billing.repository.ts`
- `apps/api/src/modules/org/repositories/org-stripe.repository.ts`
- `apps/api/src/modules/org/org.module.ts`
- `apps/api/src/modules/org/services/__tests__/org-billing.service.test.ts`
- `apps/api/src/modules/org/services/__tests__/org-stripe.service.test.ts`

## 2026-06-17 09:01 - [FIX]

What:
- Added Excel spreadsheet extensions to Brain training and add-information file pickers.
- Classified `.xls`, `.xlsx`, and `.xlsm` as document uploads in the shared Brain upload detector.
- Added spreadsheet extraction to the API document extraction service.
- Added `xlsx` as an API dependency for spreadsheet parsing.

Why:
- Brain import flows accepted CSV and other document types but did not allow Excel sheets, and the API extractor did not handle spreadsheet MIME types.

Impact:
- Brain upload/import flows can select Excel spreadsheets and extract sheet text for ingestion.
- `.xlsm` receives the same spreadsheet handling as `.xls` and `.xlsx`.

Files:
- `apps/web/src/features/brain/utils/upload-validation.ts`
- `apps/web/src/features/brain/components/TrainingPanel.tsx`
- `apps/web/src/features/brain/components/CampaignAddInfoPanel.tsx`
- `apps/web/src/features/brain/components/user-add-info-panel/UserAddInfoPanel.tsx`
- `apps/web/src/features/brain/components/training/TrainingModal.tsx`
- `apps/api/src/modules/brain/services/document-extraction.service.ts`
- `apps/api/src/modules/brain/services/__tests__/document-extraction.service.test.ts`
- `apps/api/package.json`
- `pnpm-lock.yaml`

## 2026-06-17 09:22 - [FIX]

What:
- Added PowerPoint and data-file extensions to media-library, chat, mission quick-capture, and Spaces Docs upload selectors.
- Added matching PowerPoint/data MIME support to media-library Drive/Dropbox validation and media asset document classification.
- Added JSON, XML, YAML, and TSV text parsing coverage to the agent chat document parser.
- Extended media-library document previews to render JSON, XML, YAML, and TSV text files.

Why:
- After adding Excel support, PowerPoint and common data files were still inconsistent across generic upload paths.

Impact:
- Users can select `.ppt`, `.pptx`, `.json`, `.xml`, `.yaml`, `.yml`, and `.tsv` from the supported generic upload paths.
- Data files sent through chat parsing are read as text, and uploaded media assets classify as documents instead of `other`.

Files:
- `apps/web/src/components/media/drive-file-browser-modal.constants.ts`
- `apps/web/src/components/media/drive-file-browser-modal.utils.tsx`
- `apps/web/src/components/media/MediaPickerDocumentCardPreview.tsx`
- `apps/web/src/features/studio/config/chat-toast-errors.config.ts`
- `apps/web/src/features/spaces/components/toolbar/DocsAddDocMenu.tsx`
- `apps/agent-api/src/modules/chat/services/document-parser.service.ts`
- `apps/agent-api/src/modules/chat/services/__tests__/document-parser.service.test.ts`
- `apps/api/src/modules/media/services/media-service-03.base.ts`

## 2026-06-17 09:23 - [ARCH]

What:
- Moved transfer preview counts, artifact preview lookup, view-row resolution, linked domain lookups, and linked contact counting behind `TransferRepository`.
- Added transfer characterization coverage for campaign previews, artifact previews, space previews, and document-view closed-item filtering.

Why:
- Continue Type C-H3 transfer service hardening without changing transfer preview behavior.

Impact:
- `TransferServiceBase04` now scans clean for direct Supabase access.
- The remaining transfer Type C-H3 work is isolated to execute/copy/move helpers in `TransferServiceBase01`, `TransferServiceBase02`, and `TransferServiceBase03`.

Files:
- `apps/api/src/modules/transfer/__tests__/transfer.service.test.ts`
- `apps/api/src/modules/transfer/repositories/transfer.repository.ts`
- `apps/api/src/modules/transfer/services/transfer-service-01.base.ts`

## 2026-06-17 09:44 - [ARCH]

What:
- Added `TransferSpaceRepository` for space move/copy data access.
- Moved space row updates, child org updates, share deletes, and copied-space insertion out of `TransferServiceBase02`.
- Added characterization coverage for moving a space and copying a space row.

Why:
- Continue Type C-H3 transfer service cleanup while keeping space transfer orchestration behavior unchanged.

Impact:
- `TransferServiceBase02` now scans clean for direct Supabase access.
- Remaining transfer service direct-access work is isolated to `TransferServiceBase03` space item/view item/create-space helpers.

Files:
- `apps/api/src/modules/transfer/__tests__/transfer.service.test.ts`
- `apps/api/src/modules/transfer/repositories/transfer-space.repository.ts`
- `apps/api/src/modules/transfer/transfer.module.ts`
- `apps/api/src/modules/transfer/services/transfer-service-01.base.ts`
- `apps/api/src/modules/transfer/services/transfer-service-02.base.ts`
- `apps/api/src/modules/transfer/services/transfer.service.ts`

## 2026-06-17 09:41 - [ARCH]

What:
- Extended `TransferCampaignCopyRepository` for funnel/page/ad/parent-child copy data access.
- Moved funnel/page copy, ad set copy, ad copy, and parent-child copy Supabase calls out of `TransferServiceBase02`.
- Added characterization coverage for campaign copies that remap funnels, pages, sequence emails, ad campaigns, ad sets, and ads.

Why:
- Continue Type C-H3 transfer service cleanup while preserving current campaign copy remapping and sanitization behavior.

Impact:
- Campaign copy helpers no longer perform direct Supabase access from `TransferServiceBase02`.
- Remaining transfer service direct-access work is now limited to space move/copy and space item/create helpers.

Files:
- `apps/api/src/modules/transfer/__tests__/transfer.service.test.ts`
- `apps/api/src/modules/transfer/repositories/transfer-campaign-copy.repository.ts`
- `apps/api/src/modules/transfer/services/transfer-service-02.base.ts`

## 2026-06-17 09:36 - [ARCH]

What:
- Added `TransferCampaignCopyRepository` for campaign-copy row/config data access.
- Moved campaign row copy, campaign child row list/insert, and campaign config list/bulk-insert calls out of `TransferServiceBase02`.
- Added characterization coverage for copying a campaign with one child row and one config row.

Why:
- Continue Type C-H3 transfer service cleanup while keeping `TransferRepository` below its hard LOC limit.

Impact:
- Campaign row/config copy helpers no longer perform direct Supabase access from `TransferServiceBase02`.
- Remaining transfer service direct-access work is funnel/page/ad copy, parent-child copy, space move/copy, and space-item/create helpers.

Files:
- `apps/api/src/modules/transfer/__tests__/transfer.service.test.ts`
- `apps/api/src/modules/transfer/repositories/transfer-campaign-copy.repository.ts`
- `apps/api/src/modules/transfer/transfer.module.ts`
- `apps/api/src/modules/transfer/services/transfer-service-01.base.ts`
- `apps/api/src/modules/transfer/services/transfer-service-02.base.ts`
- `apps/api/src/modules/transfer/services/transfer.service.ts`

## 2026-06-17 09:31 - [ARCH]

What:
- Added `TransferViewRepository` for view-transfer data access.
- Moved view item move updates and source-space schema updates out of transfer services.
- Added characterization coverage for moving a document view into an existing target space.

Why:
- Continue Type C-H3 transfer service hardening without growing the already near-threshold `TransferRepository`.

Impact:
- `TransferServiceBase01` and `TransferServiceBase04` now scan clean for direct Supabase access.
- Remaining transfer service direct-access work is in campaign-copy and space/item copy/move helpers.

Files:
- `apps/api/src/modules/transfer/__tests__/transfer.service.test.ts`
- `apps/api/src/modules/transfer/repositories/transfer-view.repository.ts`
- `apps/api/src/modules/transfer/transfer.module.ts`
- `apps/api/src/modules/transfer/services/transfer-service-01.base.ts`
- `apps/api/src/modules/transfer/services/transfer-service-03.base.ts`
- `apps/api/src/modules/transfer/services/transfer.service.ts`

## 2026-06-17 09:29 - [ARCH]

What:
- Moved transfer campaign move side effects behind `TransferRepository`.
- Added characterization coverage for moving a campaign with selected child rows, linked domains, linked email domains, contacts, and usage events.

Why:
- Continue Type C-H3 transfer service hardening while preserving campaign move behavior.

Impact:
- Campaign move/link updates no longer perform direct Supabase access from `TransferServiceBase01`.
- `TransferServiceBase01` is down to the view-item move direct-access hit; remaining transfer work is concentrated in view, campaign copy, and space/item copy/move helpers.

Files:
- `apps/api/src/modules/transfer/__tests__/transfer.service.test.ts`
- `apps/api/src/modules/transfer/repositories/transfer.repository.ts`
- `apps/api/src/modules/transfer/services/transfer-service-01.base.ts`
- `apps/api/src/modules/transfer/services/transfer-service-03.base.ts`
- `apps/api/src/modules/transfer/services/transfer-service-04.base.ts`

## 2026-06-17 09:26 - [ARCH]

What:
- Moved transfer artifact execution load/move/copy data access behind `TransferRepository`.
- Moved transfer media execution load/move/copy data access behind `TransferRepository`.
- Added characterization coverage for artifact move payloads and media copy payload sanitization.

Why:
- Continue Type C-H3 transfer service hardening while preserving execute-transfer behavior.

Impact:
- Artifact and media execute-transfer paths no longer perform direct Supabase access from `TransferServiceBase01`.
- Remaining transfer Type C-H3 service access is isolated to campaign move/link updates, view item moves, campaign copy helpers, and space/item copy/move helpers.

Files:
- `apps/api/src/modules/transfer/__tests__/transfer.service.test.ts`
- `apps/api/src/modules/transfer/repositories/transfer.repository.ts`
- `apps/api/src/modules/transfer/services/transfer-service-01.base.ts`

## 2026-06-17 09:54 - [ARCH]

What:
- Extended `TransferSpaceRepository` for space item copy/list/update data access and copied-view target-space creation.
- Moved `copySpaceItems`, `copySelectedSpaceItems`, and `createSpaceForView` Supabase calls out of `TransferServiceBase03`.
- Added characterization coverage for copied space item hierarchy restoration and copying a document view into a newly created target space.

Why:
- Complete the transfer Type C-H3 service direct-access cleanup while preserving copy/view transfer behavior.

Impact:
- Transfer production services now scan clean for direct Supabase/RPC/storage/createClient access.
- Remaining transfer work is LOC/test-suite splitting follow-up, not service-layer data-access cleanup.

Files:
- `apps/api/src/modules/transfer/__tests__/transfer.service.test.ts`
- `apps/api/src/modules/transfer/repositories/transfer-space.repository.ts`
- `apps/api/src/modules/transfer/services/transfer-service-03.base.ts`

## 2026-06-17 10:05 - [FIX]

What:
- Fixed conversation list 503 when loading hundreds of owned conversations by skipping unnecessary `conversation_shares` lookups and batching foreign-row share queries.
- Made Spaces chat panel tolerate partial conversation fetch failures via `Promise.allSettled`.

Why:
- A single `.in('conversation_id', …)` with 400+ IDs exceeded HTTP header limits (`UND_ERR_HEADERS_OVERFLOW`), causing "Service temporarily unavailable" and an empty conversation list despite data existing.

Impact:
- Personal/org conversation lists with many owned conversations load successfully; space-scoped conversations still appear if a secondary legacy fetch fails.

Files:
- `apps/api/src/modules/conversations/services/conversation-permissions.service.ts`
- `apps/api/src/modules/conversations/services/__tests__/conversation-permissions.service.test.ts`
- `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`

## 2026-06-17 10:14 - [ARCH]

What:
- Moved Machines wake attempts, idle/status snapshots, reconciliation rows, pool table/RPC access, provision locks, and profile machine updates behind Machines repositories.
- Added repository and service characterization coverage for the moved Machines data-access seams.

Why:
- Complete the Machines portion of Phase 1 Type C-H3 service hardening without changing runtime/provisioning behavior.

Impact:
- Machines production services now scan clean for direct Supabase/RPC/storage/createClient access outside repositories.
- Remaining Machines cleanup is LOC headroom only, logged separately.

Files:
- `apps/api/src/modules/machines/machines.module.ts`
- `apps/api/src/modules/machines/repositories/machine-pool.repository.ts`
- `apps/api/src/modules/machines/repositories/machine-pool.repository.test.ts`
- `apps/api/src/modules/machines/repositories/machine-profile.repository.ts`
- `apps/api/src/modules/machines/repositories/machine-profile.repository.test.ts`
- `apps/api/src/modules/machines/repositories/machines.repository.ts`
- `apps/api/src/modules/machines/repositories/machines.repository.test.ts`
- `apps/api/src/modules/machines/services/idle-manager.service.ts`
- `apps/api/src/modules/machines/services/machine-pool.service.ts`
- `apps/api/src/modules/machines/services/machine-reconciliation.service.ts`
- `apps/api/src/modules/machines/services/machine-wake-attempts.service.ts`
- `apps/api/src/modules/machines/services/machines-service-01.base.ts`
- `apps/api/src/modules/machines/services/machines-service-02.base.ts`
- `apps/api/src/modules/machines/services/machines-service-03.base.ts`
- `apps/api/src/modules/machines/services/machines.service.ts`
- `apps/api/src/modules/machines/services/__tests__/idle-manager.service.test.ts`
- `apps/api/src/modules/machines/services/__tests__/machine-pool.service.test.ts`
- `apps/api/src/modules/machines/services/__tests__/machine-reconciliation.service.test.ts`
- `apps/api/src/modules/machines/services/__tests__/machine-wake-attempts.service.test.ts`
- `apps/api/src/modules/machines/services/__tests__/machines.service.test.ts`

## 2026-06-17 10:28 - [ARCH]

What:
- Moved Media upload, presign, generated asset persistence, social cache persistence, campaign upload storage, pending upload confirmation, and media access lookup calls behind `MediaUploadRepository`.
- Kept media asset read/list/update/index behavior behind `MediaRepository` and split the repository back under the 400 LOC limit.
- Removed copied generated imports/constants from Media service base files.

Why:
- Complete the Media portion of Phase 1 Type C-H3 service hardening without changing media upload, cache, import, or asset-library behavior.

Impact:
- Media production services now scan clean for direct Supabase/RPC/storage/createClient access outside repositories.
- Focused Media tests, focused lint, full `@vibey/api` typecheck, LOC checks, stale changelog scan, and `git diff --check` passed.

Files:
- `apps/api/src/modules/media/media.module.ts`
- `apps/api/src/modules/media/repositories/media.repository.ts`
- `apps/api/src/modules/media/repositories/media-upload.repository.ts`
- `apps/api/src/modules/media/services/media-service-01.base.ts`
- `apps/api/src/modules/media/services/media-service-02.base.ts`
- `apps/api/src/modules/media/services/media-service-03.base.ts`
- `apps/api/src/modules/media/services/media-service-04.base.ts`
- `apps/api/src/modules/media/services/media.service.ts`
- `apps/api/src/modules/media/services/__tests__/media-assets.service.test.ts`
- `apps/api/src/modules/media/services/__tests__/media-instagram-cache.service.test.ts`
- `apps/api/src/modules/media/services/__tests__/media-url-import.service.test.ts`

## 2026-06-17 10:33 - [ARCH]

What:
- Moved Agent Teams runtime sync lookup, Management-owner guard lookup, team overview/spending RPCs, policy invalidation RPC, and policy resolution table reads behind module repositories.
- Added `AgentTeamRuntimeRepository` and `AgentPolicyRepository`.
- Added characterization coverage for the moved Agent Teams service and policy behavior.

Why:
- Complete the Agent Teams portion of Phase 1 Type C-H3 service hardening without changing team policy, runtime sync, or spending behavior.

Impact:
- Agent Teams production services now scan clean for direct Supabase/RPC/storage/createClient access outside repositories.
- Focused Agent Teams tests, focused lint, full `@vibey/api` typecheck, direct-access scan, and LOC checks passed.

Files:
- `apps/api/src/modules/agent-teams/agent-teams.module.ts`
- `apps/api/src/modules/agent-teams/repositories/agent-policy.repository.ts`
- `apps/api/src/modules/agent-teams/repositories/agent-team-runtime.repository.ts`
- `apps/api/src/modules/agent-teams/services/agent-policy.service.ts`
- `apps/api/src/modules/agent-teams/services/agent-teams.service.ts`
- `apps/api/src/modules/agent-teams/__tests__/agent-policy-action-domain.test.ts`
- `apps/api/src/modules/agent-teams/__tests__/agent-policy-data-access.test.ts`
- `apps/api/src/modules/agent-teams/__tests__/agent-teams-service-policy-lock.test.ts`

## 2026-06-17 10:37 - [ARCH]

What:
- Moved Segments distinct filter option RPCs and segment-preview RPC access from `SegmentsService` into `SegmentsRepository`.
- Added characterization coverage for filter option normalization, null preview counts, and preview RPC error logging/rethrow behavior.

Why:
- Complete the Segments portion of Phase 1 Type C-H3 service hardening without changing segment filter or preview behavior.

Impact:
- Segments production service code now scans clean for direct Supabase/RPC/storage/createClient access outside repositories.
- Focused Segments service test, focused lint, full `@vibey/api` typecheck, direct-access scan, and LOC checks passed.
- The existing org-scoping integration consumer remains blocked by the known test-app `MachinesService`/`ErrorReporter` DI issue and sandboxed Redis connection attempt before assertions.

Files:
- `apps/api/src/modules/segments/repositories/segments.repository.ts`
- `apps/api/src/modules/segments/services/segments.service.ts`
- `apps/api/src/modules/segments/services/__tests__/segments.service.test.ts`

## 2026-06-17 10:47 - [ARCH]

What:
- Moved Slack service-role client creation, token refresh, disconnect updates, channel-member lookups/upserts, org/profile email resolution, conversation/campaign lookups, and campaign storage upload access behind `SlackRuntimeRepository`.
- Kept existing Slack channel/integration record access in `SlackRepository`, split both repository files under the 400 LOC limit, and registered the new provider in `SlackModule`.
- Added characterization coverage for inbound Slack storage upload, disconnect scoping, default campaign backfill, sender row refresh, and org-member email mapping.

Why:
- Complete the Slack portion of Phase 1 Type C-H3 service hardening without changing Slack OAuth, webhook, media, or sender-resolution behavior.

Impact:
- Slack production services now scan clean for direct Supabase/RPC/storage/createClient access outside repositories/integrations.
- Focused Slack tests, focused lint, full `@vibey/api` typecheck, direct-access scan, and LOC checks passed.

Files:
- `apps/api/src/modules/slack/slack.module.ts`
- `apps/api/src/modules/slack/repositories/slack.repository.ts`
- `apps/api/src/modules/slack/repositories/slack-runtime.repository.ts`
- `apps/api/src/modules/slack/services/slack.service.ts`
- `apps/api/src/modules/slack/services/slack-service.base.ts`
- `apps/api/src/modules/slack/services/slack-service-auth.base.ts`
- `apps/api/src/modules/slack/services/slack-service-conversation.base.ts`
- `apps/api/src/modules/slack/services/slack-service-media.base.ts`
- `apps/api/src/modules/slack/services/slack-sender-resolver.service.ts`
- `apps/api/src/modules/slack/services/__tests__/slack-media.test.ts`

## 2026-06-17 10:51 - [ARCH]

What:
- Moved project storage upload/remove/download access from `ProjectsService` and `ProjectPublishService` into `ProjectsRepository`.
- Moved project-domain lookup from `DomainConnectionService` into `DomainsRepository`.
- Moved promoted-ad insertion from `CanvasService` into `CanvasRepository`.
- Added characterization coverage for project storage deletion, project publish storage download, project file upsert, project domain disconnection/restoration, and canvas node promotion.

Why:
- Continue Phase 1 Type C-H3 lower-count service hardening without changing project file, domain connection, or canvas promotion behavior.

Impact:
- Projects, Domains, and Canvas production services now scan clean for direct Supabase/RPC/storage/createClient access outside repositories/integrations.
- Focused tests, focused lint, full `@vibey/api` typecheck, direct-access scans, and LOC checks passed.

Files:
- `apps/api/src/modules/projects/repositories/projects.repository.ts`
- `apps/api/src/modules/projects/services/projects.service.ts`
- `apps/api/src/modules/projects/services/project-publish.service.ts`
- `apps/api/src/modules/projects/services/projects.service.test.ts`
- `apps/api/src/modules/domains/repositories/domains.repository.ts`
- `apps/api/src/modules/domains/services/domain-connection.service.ts`
- `apps/api/src/modules/domains/services/domain-connection.service.test.ts`
- `apps/api/src/modules/canvas/repositories/canvas.repository.ts`
- `apps/api/src/modules/canvas/services/canvas.service.ts`
- `apps/api/src/modules/canvas/services/canvas.service.test.ts`

## 2026-06-17 11:00 - [ARCH]

What:
- Moved channel campaign binding validation and service-role channel message metadata writes behind `ChannelRuntimeRepository` and existing `ChannelsRepository` seams.
- Moved conversation permission/share queries, org-membership validation, and agent-registry status lookup behind conversation repositories.
- Added characterization coverage for channel campaign binding, auto-invoke/retry metadata writes, channel metadata patching, conversation share list/upsert/delete behavior, and route order.

Why:
- Continue Phase 1 Type C-H3 lower-count service hardening without changing channel message, channel context, conversation permission, or share behavior.

Impact:
- Channels and Conversations production services now scan clean for direct Supabase/RPC/storage/createClient access outside repositories.
- Focused tests, focused lint, full `@vibey/api` typecheck, direct-access scan, and LOC checks passed.

Files:
- `apps/api/src/modules/channels/channels.module.ts`
- `apps/api/src/modules/channels/repositories/channel-runtime.repository.ts`
- `apps/api/src/modules/channels/services/channel-agent-invocation.service.ts`
- `apps/api/src/modules/channels/services/channel-management.service.ts`
- `apps/api/src/modules/channels/services/channels.service.ts`
- `apps/api/src/modules/channels/services/channel-agent-invocation.service.test.ts`
- `apps/api/src/modules/channels/services/channels.service.test.ts`
- `apps/api/src/modules/conversations/conversations.module.ts`
- `apps/api/src/modules/conversations/repositories/conversation-permissions.repository.ts`
- `apps/api/src/modules/conversations/repositories/conversations.repository.ts`
- `apps/api/src/modules/conversations/services/conversation-permissions.service.ts`
- `apps/api/src/modules/conversations/services/conversations.service.ts`
- `apps/api/src/modules/conversations/services/__tests__/conversation-permissions.service.test.ts`

## 2026-06-17 11:27 - [ARCH]

What:
- Moved the remaining real Type C-H3 lower-count service data access behind repositories for Forms, Funnels, DM, Email, Telegram, MCP, and Leads.
- Added Leads characterization coverage for contact email sends, failed-send persistence, segment filtering, CRM sync jobs, and existing ingestion/contact flows.
- Fixed the Forms publish path to use `FormsRuntimeRepository.createServiceClient()` after the repository extraction.

Why:
- Complete Phase 1 Type C-H3 service hardening by removing direct Supabase/RPC/storage/createClient access from production services outside repositories/providers.

Impact:
- Full Type C-H3 direct-access scan now has no real production service hits outside repositories/integrations.
- The remaining two Admin scan hits are documented false positives because they call `this.repository.rpc(...)`, not Supabase directly.
- Focused tests, focused lint, full `@vibey/api` typecheck, LOC checks, stale changelog scan, and `git diff --check` passed.

Files:
- `apps/api/src/modules/forms/services/forms.service.ts`
- `apps/api/src/modules/forms/services/form-contact-answer.service.ts`
- `apps/api/src/modules/forms/repositories/forms-runtime.repository.ts`
- `apps/api/src/modules/funnels/services/funnels.service.ts`
- `apps/api/src/modules/funnels/services/funnel-publish.service.ts`
- `apps/api/src/modules/funnels/repositories/funnel-runtime.repository.ts`
- `apps/api/src/modules/dm/services/dm.service.ts`
- `apps/api/src/modules/dm/repositories/human-dm.repository.ts`
- `apps/api/src/modules/email/repositories/email-runtime.repository.ts`
- `apps/api/src/modules/email/repositories/email-artifacts.repository.ts`
- `apps/api/src/modules/telegram/repositories/telegram-runtime.repository.ts`
- `apps/api/src/modules/mcp/repositories/mcp-oauth.repository.ts`
- `apps/api/src/modules/leads/repositories/contact-identifier.repository.ts`
- `apps/api/src/modules/leads/repositories/lead-email.repository.ts`
- `apps/api/src/modules/leads/repositories/lead-ingestion.repository.ts`
- `apps/api/src/modules/leads/repositories/leads-runtime.repository.ts`
- `apps/api/src/modules/leads/services/lead-email.service.test.ts`

## 2026-06-17 11:41 - [FEATURE]

What:
- Added an admin-only OpenAI Codex OAuth integration backed by `vault_secrets` instead of source code or raw `user_integrations` token columns.
- Added agent-api runtime credential resolution for admins/superadmins, including vault decrypt, token refresh, and fail-closed handling.
- Passed runtime-only OpenAI Codex credentials into OpenClaw with model fallback disabled for subscription-backed Codex runs.
- Added GPT-5.5 Codex/OpenAI Codex forward compatibility and model normalization.

Why:
- Admins need to use their own OpenAI subscription-backed Codex access for selected models without spending Vibey/OpenRouter tokens.

Impact:
- OpenAI Codex credentials are stored encrypted in DB vault storage and are only injected into OpenClaw for the current request.
- Non-admin users, missing vault secrets, unreadable vault payloads, or failed credential resolution block the Codex run instead of falling back to paid Vibey tokens.
- `openai-codex/gpt-5.3-codex`, `openai-codex/gpt-5.5`, and `openai-codex/gpt-5.5-codex` are registered for this integration path.

Files:
- `apps/api/src/modules/integrations/openai-codex/`
- `apps/api/src/modules/integrations/integrations.module.ts`
- `apps/api/src/modules/integrations/services/integrations-overview.service.ts`
- `apps/api/src/modules/integrations/services/integrations-status.service.ts`
- `apps/api/src/modules/vault/services/vault.service.ts`
- `apps/api/src/modules/vault/__tests__/vault.service.test.ts`
- `apps/agent-api/src/modules/chat/services/openai-codex-admin-auth.service.ts`
- `apps/agent-api/src/modules/chat/services/openai-codex-admin-auth.service.test.ts`
- `apps/agent-api/src/modules/chat/services/openclaw-proxy.service.ts`
- `apps/agent-api/src/modules/chat/chat.module.ts`
- `apps/openclaw/src/gateway/open-responses.schema.ts`
- `apps/openclaw/src/gateway/openresponses-http.ts`
- `apps/openclaw/src/commands/agent.ts`
- `apps/openclaw/src/commands/agent/types.ts`
- `apps/openclaw/src/agents/pi-embedded-runner/run.ts`
- `apps/openclaw/src/agents/pi-embedded-runner/run/params.ts`
- `apps/openclaw/src/agents/model-selection.ts`
- `apps/openclaw/src/agents/model-forward-compat.ts`
- `supabase/migrations/20260617092523_openai_codex_admin_integration.sql`
- `documentation/features/chat-stream-recovery.md`

## 2026-06-17 11:54 - [FEATURE]

What:
- Added an admin-only OpenAI Codex section to Workspace Settings integrations.
- Added a guided OpenAI Codex connection dialog that opens OpenAI auth and completes by submitting the localhost callback URL to the vault-backed API.
- Wired OpenAI Codex connect/disconnect/status into the existing settings integration hook and success messaging.

Why:
- Admins need a visible place in Workspace Settings to start and complete the OpenAI subscription-backed Codex connection.

Impact:
- Platform admins and superadmins can see OpenAI Codex under Admin Integrations.
- Non-admin users do not see the card.
- The connection still stores tokens only through the backend vault path; the browser only submits the OAuth callback URL.

Files:
- `apps/web/src/features/settings/components/settings-content/useIntegrations.ts`

## 2026-06-17 12:31 - [ARCH]

What:
- Split Agent Teams policy workflows out of `AgentTeamsService` into `AgentTeamPolicyWorkflowService`.
- Kept `AgentTeamsService` as the public controller/sidebar facade and registered the new Nest provider.
- Added behavior-lock coverage for agent reassignment invalidation/sync and skill-deny removal.

Why:
- Phase 1 Type D needs near-limit services decomposed by behavior boundary before more Agent Teams policy work pushes them toward hard LOC violations.

Impact:
- `agent-teams.service.ts` drops from 556 LOC to 353 LOC.
- `agent-team-policy-workflow.service.ts` is 311 LOC and data access remains in repositories.
- `agent-policy.service.ts` remains tracked as the next Agent Teams headroom follow-up at 508 LOC.

Files:
- `apps/api/src/modules/agent-teams/services/agent-teams.service.ts`
- `apps/api/src/modules/agent-teams/services/agent-team-policy-workflow.service.ts`
- `apps/api/src/modules/agent-teams/agent-teams.module.ts`
- `apps/api/src/modules/agent-teams/__tests__/agent-teams-service-policy-lock.test.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## 2026-06-17 12:22 - [ARCH]

What:
- Split conversation message/fork workflows out of `ConversationsService` into `ConversationMessagesService`.
- Kept `ConversationsService` as the public controller-facing facade for existing routes and tests.
- Added focused behavior coverage for message read authorization, metadata merge behavior, fork copy payloads, and response-chain pointer recalculation.
- Updated the architecture remediation skill with the facade-preserving Type D split rule.

Why:
- Phase 1 Type D needs near-limit services split by cohesive workflow before new behavior pushes them into hard LOC violations.

Impact:
- `conversations.service.ts` drops from 570 LOC to 453 LOC.
- `conversation-messages.service.ts` is 223 LOC and owns the extracted message workflows.
- Public route/service method contracts are preserved.

Files:
- `apps/api/src/modules/conversations/services/conversations.service.ts`
- `apps/api/src/modules/conversations/services/conversation-messages.service.ts`
- `apps/api/src/modules/conversations/services/conversations.service.test.ts`
- `apps/api/src/modules/conversations/conversations.module.ts`
- `.agents/skills/architecture-compliance-remediation/SKILL.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## 2026-06-17 12:19 - [FIX]

What:
- Fixed the OpenAI Codex admin OAuth connect POST so it can sign OAuth state using a dedicated OpenAI state secret or an OpenAI-specific signer derived from `VAULT_ENCRYPTION_KEY`.
- Added focused coverage for the vault-key fallback and missing-secret error.
- Documented the optional `OPENAI_CODEX_OAUTH_STATE_SECRET` env variable.

Why:
- The local API had `VAULT_ENCRYPTION_KEY` for token storage but no `OPENAI_CODEX_OAUTH_STATE_SECRET`, `OAUTH_STATE_SECRET`, or `JWT_SECRET`, so the connect POST failed before opening OpenAI.

Impact:
- Admins can start the OpenAI Codex OAuth flow without adding an API key.
- Secrets still stay in environment/vault paths, not source code.

Files:
- `apps/api/src/modules/integrations/openai-codex/services/openai-codex-oauth.service.ts`
- `apps/api/src/modules/integrations/openai-codex/services/__tests__/openai-codex-oauth.service.test.ts`
- `apps/api/.env.example`
- `documentation/features/chat-stream-recovery.md`

## 2026-06-17 12:26 - [FEATURE]

What:
- Applied the OpenAI Codex admin integration migration to the production Supabase project via MCP.
- Aligned the local migration filename with the Supabase-recorded migration version.

Why:
- The local migration file existed, but the production database had not received the `openai_codex` integration seed or admin-only RLS policy.

Impact:
- `openai_codex` now exists in `integrations_available` with vault-backed token metadata and GPT-5.3/GPT-5.5 Codex model entries.
- `user_integrations` now has an admin-only OpenAI Codex policy while general user/org policies exclude `openai_codex`.

Files:
- `supabase/migrations/20260617092523_openai_codex_admin_integration.sql`

## 2026-06-17 12:16 - [ARCH]

What:
- Split channel message workflows out of `ChannelsService` into `ChannelMessagesService`.
- Moved channel read/unread state delegation into `ChannelManagementService` and kept `ChannelsService` as the controller-facing facade.
- Added focused behavior coverage for explicit agent sends, one-on-one thread auto-invocation, metadata patch preservation, and facade delegation.
- Updated the architecture remediation skill with Type D-specific LOC decomposition rules.

Why:
- Phase 1 Type D needs near-limit service files decomposed by behavior boundary before new work pushes them into hard violations.

Impact:
- `channels.service.ts` drops from 593 LOC to 190 LOC with public method contracts preserved.
- Channel message orchestration is isolated for future cleanup; the new message service remains tracked as a follow-up headroom item at 493 LOC.

Files:
- `apps/api/src/modules/channels/services/channels.service.ts`
- `apps/api/src/modules/channels/services/channel-messages.service.ts`
- `apps/api/src/modules/channels/services/channel-management.service.ts`
- `apps/api/src/modules/channels/services/channels.service.test.ts`
- `apps/api/src/modules/channels/services/channel-messages.service.test.ts`
- `apps/api/src/modules/channels/channels.module.ts`
- `.agents/skills/architecture-compliance-remediation/SKILL.md`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`
- `apps/web/src/features/settings/components/settings-content/IntegrationCard.tsx`
- `apps/web/src/features/settings/components/settings-content/IntegrationsView.tsx`
- `apps/web/src/features/settings/components/settings-content/IntegrationsLibrary.tsx`
- `apps/web/src/features/settings/components/settings-content/integrations.types.ts`
- `apps/web/src/features/settings/config/settings-toast-errors.config.ts`

## 2026-06-17 11:56 - [FIX]

What:
- Routed OpenAI Codex integration removal through the dedicated vault-backed disconnect endpoint before deleting the visible connection row.

Why:
- Removing the admin-only OpenAI Codex integration should purge encrypted OAuth material, not only remove the settings row.

Impact:
- Admin cleanup keeps UI behavior consistent while deleting the stored OpenAI Codex secret first.

Files:
- `apps/web/src/features/settings/components/settings-content/useIntegrations.ts`

## 2026-06-17 12:32 - [FIX]

What:
- Included the admin-only `openai_codex` personal integration in org-context overview and status lookups.

Why:
- The OpenAI Codex OAuth callback stored the connected row and vault secret, but Workspace Settings was reading through active org scope and hid the personal admin connection.

Impact:
- Refreshing Workspace Settings in an org context now reports OpenAI Codex as connected.
- The connecting poll can resolve after OAuth instead of falling back to the Connect state.

Files:
- `apps/api/src/modules/integrations/services/integrations-overview.service.ts`
- `apps/api/src/modules/integrations/services/integrations-status.service.ts`

## 2026-06-17 12:36 - [ARCH]

What:
- Split action-domain policy decisions out of `AgentPolicyService` into `AgentPolicyActionDecisionService`.
- Kept `AgentPolicyService` as the exported facade for cache, policy composition, capability checks, and action authorization.
- Registered the new provider in `AgentTeamsModule`.

Why:
- The remaining Agent Teams Type D follow-up was `agent-policy.service.ts` at 508 LOC, above the 480-line remediation warning threshold.

Impact:
- `agent-policy.service.ts` drops from 508 LOC to 317 LOC.
- `agent-policy-action-decision.service.ts` is 218 LOC.
- Agent Teams Type D1 headroom follow-up is fully resolved.

Files:
- `apps/api/src/modules/agent-teams/services/agent-policy.service.ts`
- `apps/api/src/modules/agent-teams/services/agent-policy-action-decision.service.ts`
- `apps/api/src/modules/agent-teams/agent-teams.module.ts`
- `apps/api/src/modules/agent-teams/__tests__/agent-policy-action-domain.test.ts`
- `apps/api/src/modules/agent-teams/__tests__/agent-policy-data-access.test.ts`
- `.docs/plans/architecture-compliance-remediation.md`
- `.docs/plans/agent-follow-up-work.md`

## 2026-06-17 12:47 - [FEATURE]

What:
- Added Temporal Brain Spine v1 with `brain_episodes`, typed temporal columns, deterministic backfill, temporal RPC return fields, and optional retrieval time filters.
- Added shared temporal contracts/helpers and wired temporal fields through Brain action schemas, Atlas routing, Fathom/Slack imports, document ingestion, SK ingestion, evidence chunks, direct user/customer/company writes, customer interaction extraction, customer cognition synthesis, company signal/object formation, graph repositories, and Brain UI labels.

Why:
- Brain knowledge needs to distinguish when Atlas learned a row from when the source event happened and when the knowledge is valid.

Impact:
- Imported historical calls can be learned today while still displaying and retrieving as old source events.
- Retrieval candidates now expose `temporal` metadata and support `as_of`, occurrence windows, and historical inclusion flags while preserving relevance-first default ranking.

Files:
- `supabase/migrations/20260617092831_brain_temporal_spine.sql`
- `packages/api-shared/src/types/brain-temporal.ts`
- `packages/api-shared/src/types/brain-retrieval.ts`
- `packages/api-shared/src/index.ts`
- `apps/api/src/modules/brain/services/brain-import-jobs-input.base.ts`
- `apps/api/src/modules/brain/services/brain-import-jobs-execution.base.ts`
- `apps/api/src/modules/brain/services/document-ingestion.service.ts`
- `apps/api/src/modules/integrations/fathom/services/fathom-envelope.adapter.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-legacy-team-brain.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-customer-brain.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-company-cortex.service.ts`
- `apps/agent-api/src/modules/brain/services/brain-evidence-ingestion.service.ts`
- `apps/agent-api/src/modules/brain/services/brain-retrieval.service.ts`
- `apps/agent-api/src/modules/brain/services/sk-ingestion.service.ts`
- `apps/mission-worker/src/modules/brain-ops/customer-interaction-extraction.service.ts`
- `apps/mission-worker/src/modules/brain-ops/brain-ops.processor.ts`
- `apps/mission-worker/src/modules/brain-ops/company-cortex-signal.repository.ts`
- `apps/mission-worker/src/modules/brain-ops/company-daily-dream-atlas.service.ts`
- `apps/mission-worker/src/modules/brain-ops/company-cortex-object.repository.ts`
- `apps/api/src/modules/brain/repositories/brain-graph.repository.ts`
- `apps/api/src/modules/brain/repositories/brain-retrieval-artifacts.repository.ts`
- `apps/api/src/modules/brain/repositories/brain-retrieval.repository.ts`
- `apps/api/src/modules/brain/repositories/memories.repository.ts`
- `apps/api/src/modules/brain/repositories/snapshots.repository.ts`
- `apps/web/src/features/brain/types/brain.types.ts`
- `apps/web/src/features/brain/components/ForceGraph.tsx`
- `apps/web/src/features/brain/components/NodeDetailModal.tsx`
- `.docs/plans/agent-follow-up-work.md`
- `.docs/features/brain-feature-implementation.md`

## 2026-06-17 12:48 - [FEATURE]

What:
- Added Google Calendar and Outlook as visible Spaces calendar sources alongside tasks and scheduled social posts.
- Added provider-owned calendar create/update/delete backend endpoints and agent actions.
- Added selected-day quick task creation, provider event drag/resize updates, calendar source toggles, tests, and Spaces views documentation.

Why:
- Spaces calendar needed to show the same connected user schedule available on Home and let users/agents operate calendar events from the Space context.

Impact:
- Calendar views can render tasks, social posts, Google Calendar events, and Outlook events together.
- Timed provider events can be moved/resized through the integrations API and then refetched; all-day provider events remain read-only in v1.
- Agents can list/create/update/delete provider calendar events with `use_integrations` permission; task scheduling remains on task actions with `start_date`/`due_date`.

Files:
- `apps/api/src/modules/integrations/services/integrations-calendar.service.ts`
- `apps/api/src/modules/integrations/services/integrations-calendar-mutations.ts`
- `apps/api/src/modules/integrations/controllers/integrations-calendar.controller.ts`
- `apps/api/src/modules/integrations/dto/calendar-events.dto.ts`
- `apps/api/src/modules/integrations/integrations.module.ts`
- `apps/api/src/modules/integrations/controllers/integrations.controller.ts`
- `apps/web/src/lib/services/calendar-api.ts`
- `apps/web/src/features/home/components/AgendaCard.tsx`
- `apps/web/src/features/home/components/AgendaCalendarPanel.tsx`
- `apps/web/src/features/spaces/types/space-schema.ts`
- `apps/web/src/features/spaces/views/calendar/SpaceCalendarView.tsx`
- `apps/web/src/features/spaces/views/calendar/CalendarToolbar.tsx`
- `apps/web/src/features/spaces/views/calendar/calendar-source-utils.ts`
- `apps/web/src/features/spaces/views/calendar/useSpaceCalendarExternalEvents.ts`
- `apps/web/src/features/spaces/views/calendar/SpaceCalendarSelectedDayPanel.tsx`
- `apps/web/src/features/spaces/views/calendar/SpaceCalendarQuickTaskComposer.tsx`
- `apps/web/src/features/spaces/views/calendar/SpaceCalendarEventRenderers.tsx`
- `apps/web/src/features/spaces/components/content/SpaceContentRouter.tsx`
- `apps/web/src/features/spaces/components/ViewSwitcher.tsx`
- `apps/web/src/features/spaces/config/spaces-toast-errors.config.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-calendar.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-tasks.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifacts.service.ts`
- `apps/agent-api/src/modules/artifacts/dtos/artifact-action.dto.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts`
- `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`
- `packages/agent-policy/src/actions.ts`
- `packages/agent-policy/src/registry.ts`
- `apps/docs/content/spaces/views.mdx`
- `apps/api/src/modules/integrations/services/__tests__/integrations-calendar.service.test.ts`
- `apps/web/src/features/spaces/views/calendar/calendar-source-utils.test.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-calendar.service.test.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.test.ts`

## 2026-06-17 12:48 - [FIX]

What:
- Added a service-role guarded OpenAI Codex row lookup for platform `admin` and `superadmin` users.
- Wired that lookup into integrations overview and status responses so Workspace Settings and the connecting poll can see the current user's personal OpenAI Codex connection even when RLS hides it from the request-scoped client.
- Moved integration overview grouping into a small helper to keep the overview service below the hard LOC limit.
- Added a forward migration source that aligns `public.is_admin()` with API `RoleGuard` by allowing `superadmin`.

Why:
- The frontend treats `superadmin` as admin and shows the OpenAI Codex card, but the DB `public.is_admin()` helper only accepted `role = 'admin'`, so the connected row could be stored successfully while still being hidden from overview/status reads.

Impact:
- Superadmin users can see their already-stored OpenAI Codex connection as connected after the patched API process is serving requests.
- Non-admin users still cannot read OpenAI Codex rows through the service-role fallback.

Files:
- `apps/api/src/modules/integrations/repositories/integrations.repository.ts`
- `apps/api/src/modules/integrations/repositories/integrations.repository.test.ts`
- `apps/api/src/modules/integrations/services/integrations-overview.service.ts`
- `apps/api/src/modules/integrations/services/integrations-overview-groups.ts`
- `apps/api/src/modules/integrations/services/integrations-status.service.ts`
- `supabase/migrations/20260617124500_allow_superadmin_openai_codex_policy.sql`
