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

## [2026-08-12 15:25] - [FIX]

What: Root-cause fix for duplicate meeting items/chats. Meeting resolution now keys on stable natural keys instead of the agenda row's UI-synthetic id: the frontend sends the invite's ical_uid with /meetings/resolve; the workspace/service resolve by calendar_event_id, then ical_uid, then a rescued existing call; createScheduledMeeting stamps ical_uid onto the call item and recovers idempotently from natural-key unique violations; listMeetingCandidates now includes fathom-sourced calls and findBestExistingCallForEvent adds ical (+50) and time-proximity (+15/+10) scoring so strong title+time matches link instead of duplicating. Migration 20260812170000 adds partial unique indexes on meeting_workspaces (space_id, ical_uid), call space_items (space_id, ical_uid), and call space_items (space_id, fathom meeting_id), merging pre-existing same-space Fathom duplicates first. Duplicate-chat archival drops the org predicate (chats are created under the SPACE's org while requests carry the session org, so cross-org duplicates were never archived; meeting item ids are globally unique) and widens matching to sibling call items sharing a natural key in the same space. Also repaired a pre-existing constructor-arg drift in meeting-source-ingestion.service.test.ts (impromptu-attach test passed 3 args to a 5+ param constructor).

Why: Persistence keyed on event.id, an unstable agenda-row id (google:/outlook:/fathom:/workspace: variants; mergeAgendaEvents can flip which survives), so the same real meeting kept creating new call items, workspaces, and chats; the fallback matcher could never rescue a title-only match (30 < 40) and excluded fathom-sourced items entirely; the ical_uid column existed but was never written.

Impact: Opening the same meeting from any provider/account agenda row resolves to one item and one chat; races on the natural key recover instead of duplicating; existing cross-org duplicate chats now get archived on workspace open. Migration is additive/idempotent (ical indexes start empty; Fathom dedupe merges children before enforcing). NOT applied to prod — PR stays draft; deploy migration first.

Files: apps/web/src/features/home/services/meeting-workspace-api.ts (+ .test.ts), apps/api/src/modules/meetings/controllers/meeting-workspace-resolution.controller.ts (+ .test.ts), apps/api/src/modules/meetings/repositories/meeting-workspace-resolution.repository.ts (+ new .test.ts), apps/api/src/modules/meetings/repositories/meeting-call-matching.repository.ts (new — matching/scoring queries extracted to satisfy the 400-LOC repository gate; resolution repo delegates), apps/api/src/modules/meetings/meetings.module.ts, apps/api/src/modules/meetings/repositories/meeting-workspace.repository.ts, apps/api/src/modules/meetings/services/meeting-workspace.service.ts (+ .test.ts), apps/api/src/modules/meetings/services/meeting-conversation-deduplication.service.ts (+ .test.ts), apps/api/src/modules/meetings/services/meeting-source-ingestion.service.test.ts, apps/api/src/modules/conversations/repositories/conversations.repository.ts (+ .test.ts), supabase/migrations/20260812170000_meeting_natural_key_dedupe.sql, scripts/roas/migration-order.txt

## [2026-08-12 14:10] - [FIX]

What: Removed the tracked dangling OpenClaw canvas-host test symlink and hardened the architecture file walker to skip unstatable entries.

Why: The captured runtime fixture pointed at a path on another machine and crashed `pnpm architecture:check` with ENOENT.

Impact: The architecture gate now runs to completion and reports the existing backlog instead of crashing. Canvas-host server tests remain green.

Files: apps/openclaw/src/canvas-host/a2ui/test-link-1782116645255-348bba5dc9fbd.txt (deleted), scripts/arch/check-loc.mjs
