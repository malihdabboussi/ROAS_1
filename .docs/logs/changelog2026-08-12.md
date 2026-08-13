# Changelog - [August 12, 2026]

## [2026-08-12 14:45] - [FIX]

What: Released meeting-bound chat context when a different history conversation is selected, made meeting attachment select its canonical conversation atomically, removed the obsolete bulk history auto-title requester, deduplicated meeting history by `meeting_item_id`, and added persistent meeting/calendar versus regular-chat markers. New meeting conversations now store their actual title without the redundant `Meeting —` prefix, while legacy rows are normalized at display time.

Why: A closed or hidden meeting workspace could keep forcing its preferred conversation after the user selected another chat, producing React maximum-update-depth failures. The retired history auto-titler also issued batches of unsupported `/auto-title` requests, and duplicate meeting rows plus title prefixes made meeting and regular chats difficult to distinguish.

Impact: History navigation no longer snaps back to the meeting thread, console request storms stop, duplicate meeting chats collapse to their newest row, and Recents clearly identifies meeting-backed conversations without sacrificing readable titles.

Files: `apps/web/src/components/global-chat/`, `apps/web/src/components/shell/ShellChatMenu.tsx`, `apps/web/src/components/conversations/`, `apps/web/src/lib/conversations/`, `apps/api/src/modules/meetings/services/meeting-workspace.service.ts`, `documentation/features/claude-chatgpt-shell.md`, `documentation/frontend-shared-surfaces.md`.

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

## [2026-08-12 15:40] - [DOCS]

What: Recovered the Campaign Client Ops Desk plan and reference screenshots, plus the Cursor Cloud environment section in AGENTS.md.

Why: The lost-work audit found these as the only copies on otherwise stale source branches.

Impact: Documentation only; no runtime behavior changes.

## [2026-08-12 15:47] - [FIX]

What: Added the idempotent migration allowing `needs_reconnect` in `user_integrations.status`, registered it in migration order, and added its regression test.

Why: Production already contains the constraint change, but the repository migration chain did not.

Impact: Chain parity only; no production SQL required for this merge.

## [2026-08-12 15:48] - [FIX]

What: Preserved draft-card newlines, forced rich paste to plain text, restored an edit reset control, and re-enabled spellcheck.

Impact: Edited drafts now round-trip multiline text correctly through Copy and composer insertion and can be restored to their original version.

## [2026-08-12 15:34] - [FIX]

What: Replaced the analyst-style timed agenda with seven client-facing sections and updated the Page Grader contract for this-week/next-week content.

Impact: Generated agendas are concise, screen-share-safe, and omit internal source caveats, minute ranges, and mechanical State/Evidence labels.

## [2026-08-12 16:02] - [FEATURE]

What: Recovered the never-merged Page Grader campaign→Space reconciliation cluster from orphaned branch codex/slack-signal-training (e6afd8f7, ece80b2f, 2a7be8ad, a0ac2a48) onto current main. Every successful brain-package pull now reconciles each Page Grader client_campaign into its own ROAS Space (Overview/Docs/Missions/Calendar/Meta Ads/Funnels views) with a source-linked Campaign Brief doc and Meta account/campaign provenance. Reconciliation is fingerprinted (computePageGraderCampaignSpaceHash stored as client_scope_map.campaign_space_hash) so an unchanged brain hash no longer skips stale Space structure; soft-deleted/archived campaigns are excluded, and generated-only stale Spaces are retired while operator-edited ones are retained. Catch-up accepts ?client_ids= for scoped rollouts. Added read-only rollout audit scripts/roas/audit-page-grader-campaign-spaces.py. User-facing strings aligned to main's "The ROAS Portal" branding.

Why: The 2026-07-22 documentation and decision log described this behavior, but the code only ever existed on codex/slack-signal-training (the slack-signal half of that branch merged; the brain half did not). Main is 3 weeks ahead, so shared files were reconciled hunk-by-hunk (main's mergeClientScopeEntry, ROAS Portal branding, meta-context integration already present).

Impact: Mapped clients get one Space per active Page Grader campaign kept in sync hourly/webhook-driven; no behavior change for unmapped clients. 20 api tests pass across the five touched suites. Skipped from the branch: .vercelignore (main's newer version is authoritative).

Files: apps/api/src/modules/brain/services/page-grader-campaign-space-schema.ts (new), page-grader-campaign-space-sync.ts (new), their __tests__ (new), page-grader-client-import.service.ts (+ test), apps/api/src/modules/integrations/page-grader/services/page-grader-brain-import.service.ts (+ test), page-grader-brain-sync.service.ts (+ test), page-grader-api.helpers.ts, page-grader-api.service.ts, apps/api/src/modules/internal/controllers/internal-page-grader-brain-sync.controller.ts, scripts/roas/audit-page-grader-campaign-spaces.py (new), scripts/roas/README.md, documentation/features/page-grader-campaign-brain-sync.md

## [2026-08-12 16:05] - [FIX]

What: Recovered the Brain Home stuck-on-"Loading" fixes from the same orphaned branch (402d6a6a + surviving half of d73c1430). Ported migration 20260722115000 as 20260812180000_brain_home_health_batch_lite.sql: brain_home_health_batch no longer calls brain_legend_connection_counts per brain (counts ns_memory_connections directly; personal-brain connections_by_type returns {}), appended to scripts/roas/migration-order.txt. BrainHome now clears the Loading state and shows a HEALTH_BATCH_FAILED toast when the health batch fails; fetchBrainHealthBatch tolerates individual failed chunks (throws only if every chunk fails); health-batch chunk size 15→10 in web service and api repository. CampaignOverviewTab workspace clicks deep-link to /spaces?space=<id> instead of bare /spaces (the fetchAllCampaignSpaces half of d73c1430 already landed on main).

Why: Likely-live perf bug — main's newest brain_home_health_batch (20260614111500) still invokes the per-brain legend RPC, which times out at ~20+ Person Brains, 5xxes /api/brain/health/batch, and leaves Brain Home stuck on "Loading" with no error path. Skipped from 402d6a6a: the brainIdsKey/campaignIdsKey effect-dep refactor — main already dedupes refires via the signature-keyed cachedFetch in brain.service.

Impact: Brain Home degrades gracefully on health failures and recovers fully once the migration deploys. Migration NOT applied to prod — deploy migration first, then the api/web build. 3 BrainHome tests and the new CampaignOverviewTab navigation test pass.

Files: supabase/migrations/20260812180000_brain_home_health_batch_lite.sql (new), scripts/roas/migration-order.txt, apps/api/src/modules/brain/repositories/memory-stats.repository.ts, apps/web/src/features/brain/containers/BrainHome.tsx (+ test), apps/web/src/features/brain/services/brain.service.ts, apps/web/src/features/brain/config/brain-toast-errors.config.ts, apps/web/src/app/(dashboard)/campaigns/[id]/_components/tabs/CampaignOverviewTab.tsx (+ new test)

## [2026-08-12 15:30] - [FEATURE]

What: Merge action for duplicate meetings. New `POST /api/spaces/:spaceId/meetings/merge` endpoint (MeetingMergeController/Service/Repository + pure merge rules in domain/meeting-merge-plan.ts) backed by a transactional `merge_meeting_items` Postgres function (migration 20260812164500): per duplicate it repoints meeting_recordings (demoting extra primaries), meeting_actions (survivor wins source_key collisions), meeting_context_links (collision/self-link pruning), meeting_snippets, dual-linked child space_items (parent_item_id + custom_data source_call_item_id/meeting_item_id), space_item_activity and space_item_deliverables; merges meeting_workspaces field-by-field; rewrites next_meeting_item_id continuity; drops the duplicate's semantic-index rows; deletes the duplicate row; then applies an API-computed survivor patch (fill-missing scalars, attendee/email/tag unions, merged_from_item_ids breadcrumb). Duplicate meeting conversations are archived best-effort after commit via the existing dedup service. In the web bulk bar, a Merge action appears when 2+ selected items all resolve to meeting calls; MergeMeetingsPanel picks the survivor (defaults to has-recording > most-filled > oldest) with copy from config/meeting-merge-messages.config.ts.

Why: The Meetings space accumulated duplicate call rows (calendar/Fathom dedupe keying gaps, tracked separately); users need a way to collapse existing duplicates without losing recordings, action items, comments, or agenda links.

Impact: Selecting duplicate meetings in All Meetings now offers Merge with a survivor picker; all child data lands on the survivor atomically; duplicates are deleted. 42 new tests (30 api: domain/service/repository/schema; 12 web: eligibility/ranking/panel).

Files: supabase/migrations/20260812164500_merge_meeting_items.sql, scripts/roas/migration-order.txt, apps/api/src/modules/meetings/{domain/meeting-merge-plan.ts,repositories/meeting-merge.repository.ts,services/meeting-merge.service.ts,controllers/meeting-merge.controller.ts,meetings.module.ts} (+ colocated tests), apps/web/src/features/spaces/{lib/meeting-merge.ts,services/meeting-merge.service.ts,config/meeting-merge-messages.config.ts,components/BulkActionBar.tsx,components/bulk-action-bar/{panel-key.ts,BulkActionBarToolbar.tsx,MergeMeetingsPanel.tsx,use-merge-meetings-bulk.ts}} (+ tests), .docs/features/meeting-merge.md

## [2026-08-12 15:50] - [FIX]

What: Preserved identifying query parameters in recent shell surfaces; restored exact meeting routing and workspace links; removed duplicate overlay controls; stamped meeting conversations with their Space campaign; added direct Space scope lookup; and redesigned the work summary as a floating Outputs/Sources/Tasks bubble.

Why: Recents could reopen empty chats or broad screens, campaign-less meeting chats could not resolve their Space, and stale-base merges had reverted the intended summary presentation.

Impact: Recents restore exact chats and meetings, meeting chats show resolvable Campaign/Space scope and link back to their workspace, summary controls no longer overlap, and artifact resizing preserves a readable work column.

Files: apps/web/src/components/shell, apps/web/src/components/conversations, apps/web/src/features/home, apps/web/src/features/spaces/components/header/SpaceBreadcrumbHeader.tsx, apps/web/src/app/(dashboard)/home, apps/api/src/modules/meetings, documentation/features/claude-chatgpt-shell.md

## [2026-08-12 15:55] - [FIX]

What: Added the missing `/home/delegation-desk` breadcrumb case to ShellTopBar with the matching sidebar icon.

Why: The route rendered a fallback Inbox crumb and recorded mistitled recent-surface entries.

Impact: Delegation Desk names itself correctly in the top bar and remembered work surfaces.

Files: apps/web/src/components/shell/ShellTopBar.tsx (+ test)

## [2026-08-12 14:26] - [FEATURE]

What: Meeting workspace action items now show an inline program/campaign/Space mapping cell on every relocatable row, replacing the hover-only move icon. Deleted the superseded SpaceMoveMenu and its barrel export.

Why: The prior move affordance was hidden until hover and showed no current mapping state; meeting actions should use the same shared mapping presentation as My Tasks.

Impact: Each movable action row shows where it lives and can be relocated inline; non-Space-item actions are unchanged.

Files: apps/web/src/features/home/components/MeetingActionItemsSection.tsx (+ test), apps/web/src/components/work-items/SpaceMoveMenu.tsx (deleted), apps/web/src/components/work-items/index.ts

## [2026-08-12 15:41] - [FIX]

What: Recovered chat-panel remount stability, persisted Agenda minimization and refresh, Agenda document links, the sidebar Favorites flyout, and Home quick-start placement lost to stale-base clobbers. Moved the draft-card event contract to the shared chat library.

Why: Previously landed helpers and behaviors had lost their callers during later stale-base merges.

Impact: Chat remounts recover, minimized meetings persist, instant calls refresh Agenda, meeting docs and Favorites are reachable, and quick starts retain the current seeded routing behavior above the composer.

Files: apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx, apps/web/src/features/home/components, apps/web/src/components/layout/sidebar/SidebarHqFlyouts.tsx, apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx, apps/web/src/lib/chat, apps/web/src/features/studio/components/message-bubble

## [2026-08-12 20:11] - [FIX]

What: Removed an unsupported organization argument from meeting conversation deduplication during duplicate meeting merges.

Why: The merge service passed `orgId` to a deduplication contract that intentionally matches globally unique meeting item IDs across organization scopes, causing the production API TypeScript build to fail.

Impact: Meeting merge behavior is unchanged, and the production API can compile with the established deduplication contract.

Files: apps/api/src/modules/meetings/controllers/meeting-merge.controller.ts, apps/api/src/modules/meetings/services/meeting-merge.service.ts, apps/api/src/modules/meetings/services/meeting-merge.service.test.ts
