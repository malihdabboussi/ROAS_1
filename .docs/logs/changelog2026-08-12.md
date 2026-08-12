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
