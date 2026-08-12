# Changelog - [August 12, 2026]

## [2026-08-12 09:15] - [FEATURE]

What: Video pipeline P2 hardening — background sweeper (agent-api cron, every 5 min) that resolves video generation jobs abandoned by their polling agent through the same getVideoStatus completion path with a service-role target (claim column last_swept_at prevents double-processing; non-terminal jobs older than 24h are marked failed); generated video assets now persist duration_seconds and a first-frame poster (poster_url, extracted via ffmpeg at upload time, best-effort); Global Artifacts shows video poster thumbnails; uploaded videos are stored under the videos/ storage folder instead of documents/.

Why: generate_video jobs only advanced when the starting agent kept polling — abandoned jobs stayed 'processing' forever and the finished provider output never became a media asset; video assets had no duration or thumbnail so galleries mounted raw video elements and Global Artifacts showed nothing; the upload folder branch predated the video asset type. (Deferred-list item G6 — the media_generation_jobs provider CHECK — turned out to be already fixed by migration 027.)

Impact: Every started video generation now terminates in a media asset or an explicit failure regardless of agent behavior; video cards and Global Artifacts get real poster thumbnails and duration metadata; storage layout is consistent per asset type.

Files: apps/agent-api/src/modules/artifacts/services/artifact-media-jobs-sweeper.service.ts, apps/agent-api/src/modules/artifacts/services/artifact-media-jobs-sweeper.service.test.ts, apps/agent-api/src/modules/artifacts/services/artifact-video-poster.service.ts, apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-upload.service.ts, apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-upload.service.test.ts, apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-status.service.ts, apps/agent-api/src/modules/artifacts/repositories/artifact-media-jobs.repository.ts, apps/agent-api/src/modules/artifacts/artifacts.module.ts, apps/agent-api/src/app.module.ts, apps/agent-api/package.json, apps/api/src/modules/media/services/media-service-02.base.ts, apps/api/src/modules/media/dto/index.ts, apps/web/src/lib/artifacts/global-artifacts-api.ts, apps/web/src/lib/artifacts/global-artifacts-contracts.ts, apps/web/src/lib/services/media-api.ts, supabase/migrations/20260812110000_media_generation_jobs_sweeper.sql, supabase/migrations/20260812111000_media_assets_video_metadata.sql, scripts/roas/migration-order.txt

## 2026-08-12 08:57 - [REFACTOR]

What: Ported the completed shared work-item list and Space mapping foundation onto post-#136 main, moved reusable Space field cells/helpers behind shared domain paths with compatibility re-exports, and documented the remaining PR/branch audit.

Why: The completed shared ownership and item-relocation behavior was the only production-ready semantic delta not already shipped by PR #136.

Impact: Meetings and My Tasks use the same tested work-item list/move surfaces while current production meeting behavior remains intact; superseded rescue PRs can be closed safely.

Files: `apps/web/src/components/work-items/`, `apps/web/src/lib/work-items/`, `apps/web/src/components/spaces/cells/`, `apps/web/src/lib/spaces/`, Home task/meeting consumers, `documentation/frontend-shared-surfaces.md`, `.docs/plans/post-release-cleanup-audit-2026-08-12.md`.

## 2026-08-12 00:53 - [FIX]
Files: `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`, `apps/web/src/features/home/components/AgendaCard.tsx`, `apps/web/src/features/home/config/home-agenda-messages.config.ts`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/components/layout/sidebar/sidebar-types.ts`

## 2026-08-12 00:55 - [FIX]

What: Added the active `search_conversations`, `get_canvas_board`, and `apply_canvas_operations` actions to the PromptMode backend plugin capability list.

Why: The consolidated agenda/canvas branch exposed these governed actions, but the plugin transport would have stripped them from agent workspaces.

Impact: Agent capability drift validation covers and exposes the completed conversation-search and canvas workflows.

Files: `docker/tools/vibey-backend/index.ts`

## [2026-08-12 09:27] - [FIX]

What: Fixed two test suites failing on main. Restored the intended `captureDelegationThought` contract in delegation-desk.service (work_item intake with dispatch_mode 'review', delegation mode/source metadata, priority null, and rejection of empty input), and updated the stale ConversationShareModal invite test to match the pass-off-by-default share flow.
Why: Commit fdfe8c81 re-implemented `captureDelegationThought` against a stale checkout and clobbered the contract added in e6ff6147 — its `intake_type: 'thought'` isn't even a valid option in the Delegation Desk template's select field, and the Delegator agent automation depends on the delegation metadata. Separately, commit 1957411b intentionally made invite default to a notify pass-off (`passOffConversationShare`), but the older test in features/spaces still asserted the direct-upsert path.
Impact: `delegation-desk.service.test.ts` and `ConversationShareModal.test.tsx` pass again; manual Delegation Desk thoughts are valid intake for the Delegator automation again; invite behavior now covered for both the default pass-off path and the toggle-off direct-share path.
Files: apps/web/src/features/spaces/services/delegation-desk.service.ts, apps/web/src/features/spaces/components/chat/ConversationShareModal.test.tsx, .docs/logs/changelog2026-08-12.md

## [2026-08-12 09:12] - [REFACTOR]

What: Deleted `MeetingActionMoveMenu.tsx` (242 lines, zero remaining imports) — fully superseded by the shared `SpaceMoveMenu`/`SpaceMappingPopover` in `@/components/work-items`. Logged the SourceCallCell feature-store TODO and the five grandfathered >400-LOC cells in the follow-up work log.

Why: Replace-don't-accumulate — the bespoke menu's only consumer (MeetingActionItemsSection) now renders the shared cascade.

Impact: No behavior change; dead code removed.

Files: apps/web/src/features/home/components/MeetingActionMoveMenu.tsx (deleted), .docs/plans/agent-follow-up-work.md

## [2026-08-12 12:09] - [FIX]

What: Atomic completion ownership for video generation jobs. Added completion_claimed_at/_by and billing_recorded_at to media_generation_jobs (migration 20260812150000). Every terminal transition in getVideoStatus (success completion, provider failure/cancel) and the sweeper's 24h expiry now first wins a single-UPDATE atomic claim (retakable after 10 minutes for crash recovery); losing callers reload and return the canonical result or processing. Credit debits are gated by a never-expiring one-shot billing_recorded_at flip; the hasProviderUsageEvent lookup remains only as a legacy pre-check. Consolidated the duplicated replicate/google billing blocks into recordVideoBillingOnce/resolveVideoRate.

Why: Release blocker on PR #139 — the sweeper claimed jobs via last_swept_at, but a late agent poll took no claim, so a poll racing a sweep after provider success could double-upload assets/posters, double-debit credits (check-then-insert usage-event lookup is not atomic), and double-update the job.

Impact: Exactly one caller performs upload, poster creation, billing, and the terminal job update under any poll/sweep concurrency; billing is at-most-once even across stale-claim crash retries; provider failure, transient errors, and 24h expiry semantics unchanged. Covered by 13 new completion-ownership tests (both providers), 2 repository claim-shape tests, and 2 new sweeper expiry tests.

Files: supabase/migrations/20260812150000_media_generation_jobs_completion_claim.sql, scripts/roas/migration-order.txt, apps/agent-api/src/modules/artifacts/repositories/artifact-media-jobs.repository.ts (+ .test.ts), apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-jobs.service.ts, apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-status.service.ts (+ .completion.test.ts), apps/agent-api/src/modules/artifacts/services/artifact-media-jobs-sweeper.service.ts (+ .test.ts), .docs/plans/video-create-workstream-plan.md

## [2026-08-12 15:20] - [FIX]

What: Home Agenda now surfaces Fathom recordings that All Meetings and the meeting workspace already show. Web: AgendaCardEventEntry resolves the recording via agendaFathomRecordingUrl(ev) (related.recording_url ?? merged video_url) instead of only ev.video_url, renders "Watch recording" alongside the join link on the expanded card, and adds a compact-row recording icon link (compact rows are permanently isExpanded={false}, so past meetings previously had no recording affordance at all). API: toAgendaRelatedCall populates related.external_recording_id from custom_data.external_automation.meeting_id (threaded through buildMeetingAgendaEvent synthetic rows); agenda dedupe merges related preferring the duplicate that carries a recording_url instead of silently dropping the incoming Fathom row's related; scoreRelatedCallMatch gains a post-gate RELATED_CALL_RECORDING_BONUS (+25) fed by has_recording so the recording-bearing duplicate becomes the canonical related call (mirrors findBestExistingCallForEvent's +40); the empty catch swallowing prep/related enrichment failures in both IntegrationsCalendarService and IntegrationsCalendarTeamService now logs a warning. Also split the related-call block of meetings-precall-prep.helpers.ts into meetings-precall-related-calls.ts (re-exported, no import-site changes) because the new code pushed the file over the 600-LOC hard limit; extracted the duplicated personal/team enrichment try/catch into integrations-calendar-enrichment.ts (enrichAgendaWithPrecall) and the candidate-scoring loop into buildRelatedCallCandidates so both grandfathered over-limit services shrink below their architecture-gate baselines instead of growing.

Why: Commit 978c18b5 deliberately moved Fathom URLs off video_url onto related.recording_url, but the Agenda card link, the dedupe related-merge, and the related-call scoring were never updated to follow — so the Agenda hid recordings for merged rows, list rows, and any event whose canonical related call was the recording-less duplicate.

Impact: Past meetings on the Agenda show their Fathom recording on both the expanded hero card and compact list rows; the canonical related call is the recording-bearing row; workspace recording sync can use external_recording_id directly; enrichment failures are observable instead of silent. Covered by 6 new API tests and 3 new web component tests; all pre-existing suites pass (the 9 failing spaces/meetings API tests fail identically on main).

Files: apps/web/src/features/home/components/AgendaCardEventEntry.tsx (+ .test.tsx), apps/api/src/modules/spaces/services/meetings-precall-prep.helpers.ts, apps/api/src/modules/spaces/services/meetings-precall-related-calls.ts (new), apps/api/src/modules/spaces/services/meetings-precall-prep.service.ts, apps/api/src/modules/integrations/services/integrations-calendar-enrichment.ts (new), apps/api/src/modules/integrations/services/integrations-calendar-dedupe.ts (+ test), apps/api/src/modules/integrations/services/integrations-calendar.service.ts (+ test), apps/api/src/modules/integrations/services/integrations-calendar-team.service.ts, apps/api/src/modules/spaces/services/__tests__/meetings-precall-prep.helpers.test.ts
