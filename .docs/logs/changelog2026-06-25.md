# Changelog - June 25, 2026

## [2026-06-25 12:33] - [ARCH]

What: Extracted the `ArtifactPreviewPane` ad preview branch into private `ArtifactPreviewAdPanel.tsx`.
Why: The Studio artifact preview host remains a Phase 3 oversized frontend component and needed behavior-locked branch decomposition after the chrome split.
Impact: `ArtifactPreviewPane.tsx` dropped from 1052 to 674 LOC; the ad panel is 394 LOC and keeps current ad loading, menu, mobile settings, and deep-work creative canvas behavior covered by the mounted Spaces wrapper guard.
Files: `apps/web/src/features/studio/components/preview/artifacts/preview/ArtifactPreviewPane.tsx`, `apps/web/src/features/studio/components/preview/artifacts/preview/ArtifactPreviewAdPanel.tsx`, `apps/web/src/features/studio/components/preview/artifacts/preview/artifact-preview-chrome.tsx`, `apps/web/src/features/spaces/components/artifacts/campaign-slide-preview-body.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 12:18] - [ARCH]

What: Extracted `ArtifactPreviewPane` slide-over chrome into a private `artifact-preview-chrome.tsx` hook and tightened the remediation skill's new-file whitespace verification.
Why: The preview host remains a Phase 3 oversized frontend component and needed behavior-locked decomposition before larger branch moves.
Impact: `ArtifactPreviewPane.tsx` dropped from 1186 to 1052 LOC; mounted coverage now locks Back, full-view, Close, and toolbar-extra chrome on the email branch.
Files: `apps/web/src/features/studio/components/preview/artifacts/preview/ArtifactPreviewPane.tsx`, `apps/web/src/features/studio/components/preview/artifacts/preview/artifact-preview-chrome.tsx`, `apps/web/src/features/spaces/components/artifacts/campaign-slide-preview-body.test.tsx`, `.agents/skills/architecture-compliance-remediation/SKILL.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 12:15] - [FIX]

What: Stopped paid OpenRouter `provider_cost: 0` rows from being treated as actual provider cost in agent billing and admin reconciliation.
Why: OpenRouter/OpenClaw responses can report nonzero token usage with missing provider cost as `0`, which undercounted paid model runs and made the admin cost comparison look like actual OpenRouter costs were captured.
Impact: Paid zero-cost provider metadata now falls back to OpenRouter pricing/generation lookup or logs missing cost; admin reconciliation excludes fake `$0` provider-direct rows while still counting real OpenRouter actual/calculated rows.
Files: `apps/agent-api/src/modules/chat/services/openrouter-cost.service.ts`, `apps/agent-api/src/modules/artifacts/legacy/artifacts-legacy-openclaw-cost.service.ts`, `apps/api/src/modules/admin/services/admin-service-billing-health.base.ts`, `apps/agent-api/src/modules/chat/services/openrouter-cost.service.test.ts`, `apps/agent-api/src/modules/artifacts/legacy/artifacts-legacy.service.test.ts`, `apps/api/src/modules/admin/services/__tests__/admin-service-billing-health.base.test.ts`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 12:11] - [ARCH]

What: Moved the remaining `ArtifactPreviewPane` Spaces email/form preview dependencies behind typed render slots and adapter defaults.
Why: The Studio-owned preview host still directly imported Spaces preview implementations, violating Phase 3 frontend feature-boundary rules.
Impact: The Studio host now has zero direct Spaces artifact imports; the transitional non-barrel adapter preserves current Studio/Spaces behavior until the oversized host is split into true shared surfaces.
Files: `apps/web/src/features/studio/components/preview/artifacts/preview/ArtifactPreviewPane.tsx`, `apps/web/src/components/artifacts/ArtifactPreviewPaneAdapter.tsx`, `apps/web/src/features/studio/components/preview/ArtifactsTab.tsx`, `apps/web/src/features/spaces/components/artifacts/campaign-slide-preview-body.tsx`, `apps/web/src/features/spaces/components/artifacts/campaign-slide-preview-body.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 12:10] - [FIX]

What: Fixed Dream Ops eligibility checks for tables scoped through related rows (`messages`, `channel_messages`, `conversation_documents`).
Why: PostgREST requires an `!inner` embed in `select` before filtering on `channels.org_id` or `conversations.org_id`; without it the night janitor sweep threw on startup.
Impact: Dream Ops eligibility probes now match the Company Cortex collector join pattern and no longer fail the initial sweep.
Files: `apps/mission-worker/src/modules/dream-ops/dream-ops-eligibility.service.ts`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 12:05] - [ARCH]

What: Applied Dream Ops Supabase migrations to production and staging.
Why: `mission-worker` Dream Ops outbox dispatch failed locally because `dream_ops_outbox` and related tables were missing from the shared DB.
Impact: Production now has `dream_ops_settings`, `dream_ops_runs`, and `dream_ops_outbox` (9 settings backfilled from `company_cortex_settings`) plus `agent_improvement_proposals.source_dream_run_id`. Staging has the core Dream Ops tables; the skill-recommendation link migration was skipped there because `agent_improvement_proposals` does not exist on staging yet.
Files: `supabase/migrations/20260624203000_shared_dream_ops.sql`, `supabase/migrations/20260624214500_dream_ops_skill_recommendation_link.sql`, `.docs/logs/changelog2026-06-25.md`


What: Fixed NestJS DI for `DreamOpsProcessor` by using concrete injectable class types in the constructor instead of `Pick<>` utility types.
Why: `Pick<>` erases to `Object` at runtime, so Nest could not resolve the dependency at index 0 and failed on startup.
Impact: `mission-worker` boots again; `DreamOpsProcessor` receives `DreamOpsRepository`, `CompanyDailyDreamRunnerService`, and `AgentLearningDreamRunnerService` from the module.
Files: `apps/mission-worker/src/modules/dream-ops/dream-ops.processor.ts`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 11:40] - [FEATURE]

What: Added completed-turn output recap rows after the final assistant answer for created artifacts, documents, files, media, projects, and widgets.
Why: Artifact previews can appear mid-run and then become hidden inside the collapsed `Worked for` timeline after completion, leaving the final answer without an obvious output summary.
Impact: Regular chat and task activity keep the original live timeline previews inside the completed work summary, then render compact full-width output rows below the final delta and above assistant feedback/actions.
Files: `apps/web/src/features/studio/components/message-bubble/message-bubble.utils.ts`, `apps/web/src/features/studio/components/message-bubble/FinalOutputCards.tsx`, `apps/web/src/features/studio/components/message-bubble/FinalOutputCards.test.tsx`, `apps/web/src/features/studio/components/message-bubble/message-bubble.utils.test.ts`, `apps/web/src/features/studio/components/message-bubble/MessageBubbleOrderedBlocks.tsx`, `apps/web/src/features/channels/components/ChannelOrderedBlocks.tsx`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 11:25] - [FEATURE]

What: Moved Jaime/Atlas suggestions into one Home "For you" review banner with a two-pane Suggestions modal.
Why: Agent improvement suggestions did not belong in the Home card grid, and the old modal hierarchy was too heavy and visually inconsistent with existing Vibey settings/modal patterns.
Impact: Home now groups Jaime Agent Improvement proposals and Atlas Company Cortex signals into one review entry below the composer. Saved Home layouts no longer preserve the old skill-recommendations card, Atlas signal review uses the shared `@/lib/brain` client, and the modal shows a left suggestion list with status plus a compact right detail pane.
Files: `apps/web/src/app/(dashboard)/home/page.tsx`, `apps/web/src/features/home/components/SuggestionReviewBanner.tsx`, `apps/web/src/features/home/components/SuggestionReviewModal.tsx`, `apps/web/src/features/home/components/SuggestionReviewDetails.tsx`, `apps/web/src/features/home/lib/suggestion-review.ts`, `apps/web/src/lib/brain/company-cortex-signals.ts`, `apps/web/src/features/home/components/DailyRecommendationStrip.tsx`, `apps/web/src/features/home/config/home-cards.config.ts`, `apps/web/src/features/home/types/home-cards.ts`, `apps/web/src/features/home/components/cards/HomeCardRenderer.tsx`, `apps/web/src/features/settings/components/settings-content/brain-page/CompanyCortexSignalsCard.tsx`, `documentation/features/skill-recommendations.md`, `documentation/frontend-shared-surfaces.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 11:24] - [FEATURE]

What: Added status-colored active task-agent indicators to Spaces task list rows and board cards.
Why: Tasks with an agent currently running inside them needed to be visible from list and board views without adding a separate chip or changing the normal status UI.
Impact: Running task executions now pulse the existing status dot in list rows, and board cards/subtasks show the same status-colored orb beside the title while `task_execution_status` is `running`.
Files: `apps/web/src/features/spaces/components/TaskExecutionStatusIndicator.tsx`, `apps/web/src/features/spaces/components/TaskExecutionStatusIndicator.test.tsx`, `apps/web/src/features/spaces/components/SpaceItemRow.tsx`, `apps/web/src/features/spaces/components/KanbanView.tsx`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 11:15] - [FIX]

What: Added the completed "Worked for" grouping to task activity agent executions while preserving the same inner timeline groups and updates used during the run.
Why: Task activity was rendering the live ordered-block timeline directly after completion instead of closing the work into the same final summary pattern as regular chat.
Impact: Completed task-agent activity rows now collapse pre-final work into a `Worked for X` summary once `duration_ms` is persisted, keep the final delta below it, and preserve separate thought groups in task-agent progress blocks.
Files: `apps/web/src/features/channels/components/ChannelOrderedBlocks.tsx`, `apps/web/src/features/spaces/components/task-detail/TaskActivity.tsx`, `apps/web/src/features/spaces/components/task-detail/TaskActivity.agent-feedback.test.tsx`, `apps/agent-api/src/modules/task-agent/services/task-agent.service.ts`, `apps/agent-api/src/modules/task-agent/services/task-agent-progress.service.ts`, `apps/agent-api/src/modules/task-agent/task-agent.service.test.ts`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 00:17] - [ARCH]

What: Split Brain live-session audio helpers, public live-session types, and chat/delegation message mutation out of `use-brain-live-session.ts`.
Why: `use-brain-live-session.ts` was the remaining Brain non-test TypeScript file above the 600-line hard architecture cap.
Impact: `use-brain-live-session.ts` is down from 860 to 596 LOC; reconnect delegation hydration now has mounted hook coverage through the real hook path, and focused tests/lint/typecheck pass.
Files: `apps/web/src/features/brain/hooks/use-brain-live-session.ts`, `apps/web/src/features/brain/hooks/use-brain-live-session-messages.ts`, `apps/web/src/features/brain/hooks/brain-live-session-audio.ts`, `apps/web/src/features/brain/hooks/brain-live-session.types.ts`, `apps/web/src/features/brain/hooks/__tests__/use-brain-live-session-reconnect.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 00:34] - [ARCH]

What: Split Studio ad settings header controls and field/status primitives out of `AdSettingsPanel.tsx`, and added mounted characterization coverage for the current settings behavior.
Why: `AdSettingsPanel.tsx` is a Phase 3 frontend god-file target and needs behavior-locked decomposition before larger creative-editor splits.
Impact: `AdSettingsPanel.tsx` is down to 2,619 LOC; the new extracted files are under frontend limits, mounted tests cover header portal/status behavior, and focused verification passes except the known parent max-lines debt.
Files: `apps/web/src/features/studio/components/preview/AdSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/AdSettingsHeaderControls.tsx`, `apps/web/src/features/studio/components/preview/ad-settings-panel-primitives.tsx`, `apps/web/src/features/studio/components/preview/AdSettingsPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 00:39] - [ARCH]

What: Moved the Studio ad Image/Video/Carousel format selector into `AdFormatSelector.tsx` and added mounted coverage for selector save behavior.
Why: `AdSettingsPanel.tsx` remains the largest Phase 3 frontend god-file target after the first header/primitives split.
Impact: `AdSettingsPanel.tsx` is down to 2,593 LOC, the new selector component is 40 LOC, and focused tests/lint/typecheck continue to pass with only the known parent max-lines debt.
Files: `apps/web/src/features/studio/components/preview/AdSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/AdFormatSelector.tsx`, `apps/web/src/features/studio/components/preview/AdSettingsPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 00:45] - [ARCH]

What: Moved Studio ad carousel card editing UI into `AdCarouselCardsEditor.tsx` and added mounted coverage for carousel rendering plus save-on-blur behavior.
Why: `AdSettingsPanel.tsx` remains a Phase 3 frontend god-file target after the header/primitives and format-selector splits.
Impact: `AdSettingsPanel.tsx` is down to 2,487 LOC; carousel card UI is isolated in a 148 LOC private component while parent save/version logic remains unchanged.
Files: `apps/web/src/features/studio/components/preview/AdSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/AdCarouselCardsEditor.tsx`, `apps/web/src/features/studio/components/preview/AdSettingsPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 00:59] - [ARCH]

What: Moved Studio single-image creative rendering into `AdSingleImageCreativeEditor.tsx` and added mounted coverage for per-placement image toggling.
Why: `AdSettingsPanel.tsx` remains a Phase 3 frontend god-file target after the carousel split.
Impact: `AdSettingsPanel.tsx` is down to 2,242 LOC; the extracted single-image editor is 271 LOC, tokenized, and keeps save/upload/media orchestration in the parent.
Files: `apps/web/src/features/studio/components/preview/AdSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/AdSingleImageCreativeEditor.tsx`, `apps/web/src/features/studio/components/preview/AdSettingsPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 01:12] - [ARCH]

What: Moved Studio video creative rendering into `AdVideoCreativeEditor.tsx` and added mounted coverage for per-placement video toggling.
Why: `AdSettingsPanel.tsx` remains a Phase 3 frontend god-file target after the single-image creative split.
Impact: `AdSettingsPanel.tsx` is down to 2,004 LOC; the extracted video editor is 206 LOC, tokenized, and keeps metadata save/media-picker orchestration in the parent.
Files: `apps/web/src/features/studio/components/preview/AdSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/AdVideoCreativeEditor.tsx`, `apps/web/src/features/studio/components/preview/AdSettingsPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 01:25] - [ARCH]

What: Moved Studio tracking and advanced identity/ad-setup settings into `AdAdvancedSettingsSections.tsx` and added mounted coverage for partnership metadata saving.
Why: `AdSettingsPanel.tsx` remains a Phase 3 frontend god-file target after the creative-editor splits.
Impact: `AdSettingsPanel.tsx` is down to 1,904 LOC; the extracted advanced settings component is 201 LOC, tokenized, and keeps metadata save orchestration in the parent.
Files: `apps/web/src/features/studio/components/preview/AdSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/AdAdvancedSettingsSections.tsx`, `apps/web/src/features/studio/components/preview/AdSettingsPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 01:39] - [ARCH]

What: Moved Studio ad media picker, portal menus, and select-post dialog rendering into `AdSettingsMediaOverlays.tsx` and added mounted coverage for opening the image media picker.
Why: `AdSettingsPanel.tsx` remains a Phase 3 frontend god-file target after the advanced-settings split.
Impact: `AdSettingsPanel.tsx` is down to 1,830 LOC; the extracted overlay component is 216 LOC, and the parent keeps save/media/regeneration orchestration.
Files: `apps/web/src/features/studio/components/preview/AdSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/AdSettingsMediaOverlays.tsx`, `apps/web/src/features/studio/components/preview/AdSettingsPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 01:49] - [ARCH]

What: Moved Studio Advantage+ creative enhancement rendering into `AdAdvantageCreativeEnhancements.tsx` and added mounted coverage for customization bulk-save behavior.
Why: `AdSettingsPanel.tsx` remains a Phase 3 frontend god-file target after the media-overlay split.
Impact: `AdSettingsPanel.tsx` is down to 1,741 LOC; the extracted Advantage+ component is 108 LOC, and the parent keeps metadata save orchestration.
Files: `apps/web/src/features/studio/components/preview/AdSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/AdAdvantageCreativeEnhancements.tsx`, `apps/web/src/features/studio/components/preview/AdSettingsPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 01:58] - [ARCH]

What: Moved Studio ad core copy, CTA, format, and advanced description rendering into `AdCoreSettingsFields.tsx` with mounted coverage for opening advanced core fields.
Why: `AdSettingsPanel.tsx` remains a Phase 3 frontend god-file target after the Advantage+ split.
Impact: `AdSettingsPanel.tsx` is down to 1,688 LOC; the extracted core-fields component is 88 LOC, and parent save/version orchestration remains unchanged.
Files: `apps/web/src/features/studio/components/preview/AdSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/AdCoreSettingsFields.tsx`, `apps/web/src/features/studio/components/preview/AdSettingsPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 02:03] - [ARCH]

What: Moved Studio ad destination URL and display-link rendering into `AdDestinationSettingsFields.tsx` with mounted coverage for the link preview and advanced display-link field.
Why: `AdSettingsPanel.tsx` remains a Phase 3 frontend god-file target after the core-fields split.
Impact: `AdSettingsPanel.tsx` is down to 1,659 LOC; the extracted destination-fields component is 57 LOC, and the parent keeps the same debounced save path.
Files: `apps/web/src/features/studio/components/preview/AdSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/AdDestinationSettingsFields.tsx`, `apps/web/src/features/studio/components/preview/AdSettingsPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 02:09] - [ARCH]

What: Moved the Studio synced-from-Meta banner into `AdMetaSourceBanner.tsx` and replaced raw inline Meta color styles with tokenized utilities.
Why: `AdSettingsPanel.tsx` remains a Phase 3 frontend god-file target and the touched parent still had banner-only style debt.
Impact: `AdSettingsPanel.tsx` is down to 1,642 LOC; the new banner component is 19 LOC, focused style scan is clean, and mounted coverage locks the banner text.
Files: `apps/web/src/features/studio/components/preview/AdSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/AdMetaSourceBanner.tsx`, `apps/web/src/features/studio/components/preview/AdSettingsPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 02:14] - [ARCH]

What: Moved the Studio ad settings mounted-test mocks, fixture, and default service setup into `AdSettingsPanel.test-helpers.tsx`.
Why: `AdSettingsPanel.test.tsx` was at 398 LOC and needed headroom before adding save/status orchestration coverage.
Impact: The mounted suite still has 12 passing tests; `AdSettingsPanel.test.tsx` is down to 301 LOC and the helper is 113 LOC.
Files: `apps/web/src/features/studio/components/preview/AdSettingsPanel.test.tsx`, `apps/web/src/features/studio/components/preview/AdSettingsPanel.test-helpers.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 02:26] - [ARCH]

What: Moved Studio ad field-save state, debounce timers, text/select saves, format saves, and debounce cleanup into `useAdSettingsFieldSaves.ts` with mounted debounce-save coverage.
Why: `AdSettingsPanel.tsx` remains a Phase 3 frontend god-file target and its save orchestration needed behavior-locked extraction before publish/status splits.
Impact: `AdSettingsPanel.tsx` is down to 1,578 LOC; the new hook is 111 LOC, the mounted suite has 13 passing tests, and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/useAdSettingsFieldSaves.ts`, `apps/web/src/features/studio/components/preview/AdSettingsPanel.test.tsx`, `apps/web/src/features/studio/components/preview/AdSettingsPanel.test-helpers.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 02:34] - [ARCH]

What: Moved Studio ad Meta status, pending-change derivation, review/publish modal state, and post-publish refetch orchestration into `useAdSettingsMetaControls.ts` with mounted Pause-flow coverage.
Why: `AdSettingsPanel.tsx` remains a Phase 3 frontend god-file target and status/publish orchestration was still inline after field-save extraction.
Impact: `AdSettingsPanel.tsx` is down to 1,529 LOC; the new Meta controls hook is 122 LOC, the mounted suite has 13 passing tests, and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/useAdSettingsMetaControls.ts`, `apps/web/src/features/studio/components/preview/AdSettingsPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 02:43] - [ARCH]

What: Moved Studio ad creative menu/media-picker open state, trigger refs, positioning, and outside-click listeners into `useAdSettingsCreativeMenuControls.ts` with mounted image-menu coverage.
Why: `AdSettingsPanel.tsx` remains a Phase 3 frontend god-file target and menu state/effects were still inline after the save/status hook extractions.
Impact: `AdSettingsPanel.tsx` is down to 1,449 LOC; the new menu controls hook is 128 LOC, the mounted suite has 14 passing tests, and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/useAdSettingsCreativeMenuControls.ts`, `apps/web/src/features/studio/components/preview/AdSettingsPanel.menus.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 02:56] - [ARCH]

What: Moved Studio ad image media save, restore, upload, Drive-file, and per-placement image orchestration into focused private hooks with mounted library-selection coverage.
Why: `AdSettingsPanel.tsx` remains a Phase 3 frontend god-file target and image media save logic was still inline after menu-state extraction.
Impact: `AdSettingsPanel.tsx` is down to 1,064 LOC; the three new image-media hooks are each under 200 LOC, the mounted suite has 15 passing tests, and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/useAdSettingsImageMediaSaves.ts`, `apps/web/src/features/studio/components/preview/useAdSettingsRootImageMediaSaves.ts`, `apps/web/src/features/studio/components/preview/useAdSettingsPlacementImageMediaSaves.ts`, `apps/web/src/features/studio/components/preview/AdSettingsPanel.menus.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 03:10] - [ARCH]

What: Moved Studio carousel card save, add/remove, and library replacement orchestration into `useAdSettingsCarouselCards.ts` with mounted carousel library-pick coverage.
Why: `AdSettingsPanel.tsx` remains a Phase 3 frontend god-file target and carousel save routing was still inline after image media save extraction.
Impact: `AdSettingsPanel.tsx` is down to 998 LOC; the new carousel hook is 138 LOC, the mounted suite has 16 passing tests, and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/useAdSettingsCarouselCards.ts`, `apps/web/src/features/studio/components/preview/AdSettingsPanel.menus.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 03:21] - [ARCH]

What: Moved Studio video media save, per-placement video metadata, and video library replacement routing into `useAdSettingsVideoMediaSaves.ts` with mounted video library-pick coverage.
Why: `AdSettingsPanel.tsx` remains a Phase 3 frontend god-file target and video save routing was still inline after carousel save extraction.
Impact: `AdSettingsPanel.tsx` is down to 825 LOC; the new video media hook is 249 LOC, the mounted suite has 17 passing tests, and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/useAdSettingsVideoMediaSaves.ts`, `apps/web/src/features/studio/components/preview/AdSettingsPanel.menus.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 03:28] - [ARCH]

What: Moved Studio ad regeneration dispatch and related menu routing into `useAdSettingsRegenerationActions.ts` with mounted coverage for image, carousel-card, and video regeneration events.
Why: `AdSettingsPanel.tsx` remains a Phase 3 frontend god-file target and regeneration menu handlers were still inline after video media save extraction.
Impact: `AdSettingsPanel.tsx` is down to 744 LOC; the new regeneration hook is 164 LOC, the mounted suite has 18 passing tests, and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/useAdSettingsRegenerationActions.ts`, `apps/web/src/features/studio/components/preview/AdSettingsPanel.menus.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 03:51] - [ARCH]

What: Completed the Studio `AdSettingsPanel.tsx` parent LOC split by moving metadata/page setup, media-picker routing, initial ad loading, Drive preview lookup, scroll body rendering, overlay shell rendering, loading/error states, and response merge protection into private focused siblings.
Why: `AdSettingsPanel.tsx` needed to drop below the 400-line frontend component cap while preserving the existing mounted behavior.
Impact: `AdSettingsPanel.tsx` is down to 398 LOC; the extracted files are under limits, mounted tests pass, normal focused ESLint passes with `max-lines` enabled, and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/AdSettingsPanelContent.tsx`, `apps/web/src/features/studio/components/preview/AdSettingsPanelOverlays.tsx`, `apps/web/src/features/studio/components/preview/AdSettingsPanelStates.tsx`, `apps/web/src/features/studio/components/preview/ad-settings-panel-response.ts`, `apps/web/src/features/studio/components/preview/useAdSettingsAdData.ts`, `apps/web/src/features/studio/components/preview/useAdSettingsDrivePreview.ts`, `apps/web/src/features/studio/components/preview/useAdSettingsMediaPickerRouting.ts`, `apps/web/src/features/studio/components/preview/useAdSettingsMetadataControls.ts`, `apps/web/src/features/studio/components/preview/AdSettingsPanel.metadata.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 04:07] - [ARCH]

What: Started the Studio `AdSetSettingsPanel.tsx` LOC split by adding mounted status-flow coverage, moving publish/status header controls and the synced Meta banner into private components, and tokenizing touched color debt.
Why: `AdSetSettingsPanel.tsx` is the next Phase 3 frontend god-file target after completing `AdSettingsPanel.tsx`.
Impact: `AdSetSettingsPanel.tsx` is down to 2,232 LOC; the new header/banner components are under limits, mounted tests pass, direct feature-import and hardcoded-color scans are clean for touched files, and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/AdSetSettingsHeaderControls.tsx`, `apps/web/src/features/studio/components/preview/AdSetMetaSourceBanner.tsx`, `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 04:20] - [ARCH]

What: Continued the Studio `AdSetSettingsPanel.tsx` LOC split by moving debounced field saves, field status, budget text sync, and timer cleanup into `useAdSetSettingsFieldSaves.ts`.
Why: The ad-set settings parent still owned save orchestration inline after the header/banner split.
Impact: `AdSetSettingsPanel.tsx` is down to 2,169 LOC; the new save hook is 126 LOC, mounted debounce coverage passes, focused lint passes except the known parent max-lines rule, and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/useAdSetSettingsFieldSaves.ts`, `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 04:32] - [ARCH]

What: Continued the Studio `AdSetSettingsPanel.tsx` LOC split by moving campaign schedule, budget mode, ad-account, and Meta custom-audience loading into `useAdSetSettingsCampaignContext.ts`.
Why: The ad-set settings parent still owned campaign/ad-account loading and Meta audience effects inline after the save hook split.
Impact: `AdSetSettingsPanel.tsx` is down to 2,145 LOC; the new hook is 63 LOC, mounted campaign/audience coverage passes, scoped lint passes except the known parent max-lines rule, and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/useAdSetSettingsCampaignContext.ts`, `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 04:36] - [ARCH]

What: Continued the Studio `AdSetSettingsPanel.tsx` LOC split by moving shared field primitives into `ad-set-settings-panel-primitives.tsx` and General/Budget rendering into `AdSetGeneralBudgetFields.tsx`.
Why: The ad-set settings parent still rendered top-level name and budget sections inline after campaign/audience extraction.
Impact: `AdSetSettingsPanel.tsx` is down to 2,056 LOC; the extracted render files are under 100 LOC, mounted field/budget coverage passes, scoped lint passes except the known parent max-lines rule, and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/AdSetGeneralBudgetFields.tsx`, `apps/web/src/features/studio/components/preview/ad-set-settings-panel-primitives.tsx`, `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 04:47] - [ARCH]

What: Continued the Studio `AdSetSettingsPanel.tsx` LOC split by moving advanced country search debounce, dropdown positioning, outside-click, and country-search toast handling into `useAdSetSettingsCountrySearch.ts`.
Why: The ad-set settings parent still owned targeting search state/effects inline after the General/Budget render split.
Impact: `AdSetSettingsPanel.tsx` is down to 2,020 LOC; the new country-search hook is 87 LOC, mounted country-search coverage passes, scoped lint passes except the known parent max-lines rule, and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/useAdSetSettingsCountrySearch.ts`, `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 04:51] - [ARCH]

What: Continued the Studio `AdSetSettingsPanel.tsx` LOC split by moving location search debounce, dropdown positioning, outside-click, and location-search toast handling into `useAdSetSettingsLocationSearch.ts`.
Why: The ad-set settings parent still owned location search state/effects inline after country-search extraction.
Impact: `AdSetSettingsPanel.tsx` is down to 1,972 LOC; the new location-search hook is 87 LOC, mounted location-search coverage passes, scoped lint passes except the known parent max-lines rule, and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/useAdSetSettingsLocationSearch.ts`, `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 05:01] - [ARCH]

What: Continued the Studio `AdSetSettingsPanel.tsx` LOC split by moving interest search debounce, dropdown positioning, outside-click, and interest-search toast handling into `useAdSetSettingsInterestSearch.ts`, and moved mounted fixtures into a private test helper.
Why: The ad-set settings parent still owned interest search state/effects inline after location-search extraction, and the added mounted coverage pushed the test file over the frontend LOC cap.
Impact: `AdSetSettingsPanel.tsx` is down to 1,921 LOC; the new interest-search hook is 85 LOC; `AdSetSettingsPanel.test.tsx` is back under 400 LOC; mounted interest-search coverage passes; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/useAdSetSettingsInterestSearch.ts`, `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.test.tsx`, `apps/web/src/features/studio/components/preview/ad-set-settings-panel-test-fixtures.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 05:08] - [ARCH]

What: Continued the Studio `AdSetSettingsPanel.tsx` LOC split by moving duplicated simple/advanced countries rendering into `AdSetCountryTargetingField.tsx`.
Why: The ad-set settings parent still rendered the country chips/search/dropdown inline in two targeting sections after search state moved into hooks.
Impact: `AdSetSettingsPanel.tsx` is down to 1,813 LOC; the new country field component is 169 LOC; mounted country/search coverage passes; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/AdSetCountryTargetingField.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 05:14] - [ARCH]

What: Continued the Studio `AdSetSettingsPanel.tsx` LOC split by moving duplicated simple/advanced locations rendering into `AdSetLocationTargetingField.tsx`.
Why: The ad-set settings parent still rendered the location list, radius controls, search input, and dropdown inline in two targeting sections after location search state moved into a hook.
Impact: `AdSetSettingsPanel.tsx` is down to 1,590 LOC; the new location field component is 183 LOC; mounted simple and advanced location-search coverage passes; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/AdSetLocationTargetingField.tsx`, `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 05:29] - [ARCH]

What: Continued the Studio `AdSetSettingsPanel.tsx` LOC split by moving advanced audience and interest targeting rendering into private audience/interest field components and adding mounted audience characterization coverage.
Why: The ad-set settings parent still rendered AI-managed audience, custom audience include/exclude, and interest search sections inline after the country/location targeting split.
Impact: `AdSetSettingsPanel.tsx` is down to 1,196 LOC; the new audience/interest components and audience test are under the frontend cap; mounted tests pass; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/AdSetAudienceTargetingField.tsx`, `apps/web/src/features/studio/components/preview/AdSetInterestTargetingField.tsx`, `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.audiences.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 05:39] - [ARCH]

What: Continued the Studio `AdSetSettingsPanel.tsx` LOC split by moving placement group rendering and delivery-prediction rendering into private field components with mounted placement/prediction coverage.
Why: The ad-set settings parent still rendered Advantage+ Placements, manual placement groups, and prediction estimate UI inline after the audience/interests split.
Impact: `AdSetSettingsPanel.tsx` is down to 948 LOC; the new placement/prediction components and test are under the frontend cap; mounted tests pass; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/AdSetPlacementsField.tsx`, `apps/web/src/features/studio/components/preview/AdSetDeliveryEstimateField.tsx`, `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.placements.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 05:50] - [ARCH]

What: Continued the Studio `AdSetSettingsPanel.tsx` LOC split by moving optimization/billing rendering and age/AI Recommended rendering into `AdSetAdvancedTargetingFields.tsx` with mounted advanced-field coverage.
Why: The ad-set settings parent still rendered advanced field UI and stateful age/Advantage+ save wiring inline after placement/prediction extraction.
Impact: `AdSetSettingsPanel.tsx` is down to 851 LOC; the new advanced-field component and test are under the frontend cap; mounted tests pass; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/AdSetAdvancedTargetingFields.tsx`, `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.advanced.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 05:57] - [ARCH]

What: Continued the Studio `AdSetSettingsPanel.tsx` LOC split by moving publish/review modal state and rendering into private publish controls and modal files with mounted publish-flow coverage.
Why: The ad-set settings parent still owned Meta review modal state, publish modal state, default Meta id mapping, and post-publish refetch inline after advanced field extraction.
Impact: `AdSetSettingsPanel.tsx` is down to 829 LOC; the new publish controls hook, modal shell, and publish test are under the frontend cap; mounted tests pass; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/AdSetSettingsPublishModals.tsx`, `apps/web/src/features/studio/components/preview/useAdSetSettingsPublishControls.ts`, `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.publish.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 06:07] - [ARCH]

What: Continued the Studio `AdSetSettingsPanel.tsx` LOC split by moving geo-targeting mutation orchestration into private `useAdSetSettingsGeoTargeting.ts` with mounted country/location save coverage.
Why: The ad-set settings parent still owned country toggle, active country/city derivation, location add/remove, and radius save callbacks inline after the publish/modal extraction.
Impact: `AdSetSettingsPanel.tsx` is down to 725 LOC; the new geo-targeting hook and targeting test are under the frontend cap; mounted tests pass; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/useAdSetSettingsGeoTargeting.ts`, `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.targeting.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 06:17] - [ARCH]

What: Continued the Studio `AdSetSettingsPanel.tsx` LOC split by moving placement mutation orchestration into private `useAdSetSettingsPlacements.ts` with mounted individual-placement and placement-group save coverage.
Why: The ad-set settings parent still owned expanded placement groups, active placement derivation, manual placement toggle, individual placement saves, and group placement saves inline after the geo-targeting extraction.
Impact: `AdSetSettingsPanel.tsx` is down to 623 LOC; the new placement orchestration hook and expanded placement test stay under the frontend cap; mounted tests pass; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/useAdSetSettingsPlacements.ts`, `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.placements.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 06:22] - [ARCH]

What: Continued the Studio `AdSetSettingsPanel.tsx` LOC split by moving ad-set loading, Meta status updates, and delivery-estimate orchestration into private `useAdSetSettingsLifecycle.ts` with mounted automatic-estimate coverage.
Why: The ad-set settings parent still owned fetch/load/error state, budget-sync load effects, Meta status refresh handling, delivery-estimate loading state, and estimate error normalization inline after the placement orchestration extraction.
Impact: `AdSetSettingsPanel.tsx` is down to 549 LOC; the new lifecycle hook and expanded placement/prediction test stay under the frontend cap; mounted tests pass; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/useAdSetSettingsLifecycle.ts`, `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.placements.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 06:26] - [ARCH]

What: Continued the Studio `AdSetSettingsPanel.tsx` LOC split by moving audience search state and targeting callbacks into private `useAdSetSettingsTargetingControls.ts`.
Why: The ad-set settings parent still owned include/exclude audience search UI state plus generic targeting, age-targeting, and Advantage+ audience save callbacks inline after lifecycle extraction.
Impact: `AdSetSettingsPanel.tsx` is down to 524 LOC; the new targeting-controls hook is under the frontend cap; mounted tests pass; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/useAdSetSettingsTargetingControls.ts`, `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.audiences.test.tsx`, `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.advanced.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 06:36] - [ARCH]

What: Completed the Studio `AdSetSettingsPanel.tsx` parent LOC split by moving final panel body rendering into `AdSetSettingsPanelBody.tsx` and its prop contract into `ad-set-settings-panel-body.types.ts`.
Why: The ad-set settings parent was still above the 400-line frontend component cap after state and callback extraction.
Impact: `AdSetSettingsPanel.tsx` is down to 358 LOC; the body component, type contract, and new layout test are under their caps; mounted AdSet tests pass across 7 files / 16 tests; normal scoped lint passes; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/AdSetSettingsPanelBody.tsx`, `apps/web/src/features/studio/components/preview/ad-set-settings-panel-body.types.ts`, `apps/web/src/features/studio/components/preview/AdSetSettingsPanel.layout.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 06:51] - [ARCH]

What: Completed the Studio `AdCampaignSettingsPanel.tsx` parent LOC split by moving header controls, Meta source banner, and final body rendering into private campaign settings components.
Why: The campaign settings parent was still above the 400-line frontend component cap and contained touched raw Meta/status color debt.
Impact: `AdCampaignSettingsPanel.tsx` is down to 386 LOC, `AdCampaignSettingsPanelBody.tsx` is 391 LOC, touched files have zero cross-feature imports and no raw style/color findings, mounted campaign settings tests pass, focused ESLint passes, and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/AdCampaignSettingsPanel.tsx`, `apps/web/src/features/studio/components/preview/AdCampaignSettingsPanelBody.tsx`, `apps/web/src/features/studio/components/preview/AdCampaignSettingsHeaderControls.tsx`, `apps/web/src/features/studio/components/preview/AdCampaignMetaSourceBanner.tsx`, `apps/web/src/features/studio/components/preview/ad-campaign-settings-panel.types.ts`, `apps/web/src/features/studio/components/preview/AdCampaignSettingsPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 07:04] - [ARCH]

What: Started the Studio `MediaTab.tsx` LOC split by moving the header/search/bulk/add/view toggle rendering into `media/MediaTabHeader.tsx` with mounted characterization coverage.
Why: `MediaTab.tsx` is the next oversized Phase 3 Studio component and needed behavior-locked frontend coverage before any decomposition.
Impact: `MediaTab.tsx` is down to 2,121 LOC; the new header component and mounted test are under their caps; the mounted test passes before and after extraction; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/MediaTab.tsx`, `apps/web/src/features/studio/components/preview/media/MediaTabHeader.tsx`, `apps/web/src/features/studio/components/preview/media/index.ts`, `apps/web/src/features/studio/components/preview/MediaTab.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 07:11] - [ARCH]

What: Continued the Studio `MediaTab.tsx` LOC split by moving the duplicated bulk selected-count delete footer into `media/MediaTabBulkActionBar.tsx`.
Why: The media tab parent rendered the same bulk action footer inline in both mobile and desktop branches after the header extraction.
Impact: `MediaTab.tsx` is down to 2,101 LOC; the new bulk action component is 26 LOC and tokenized; the mounted MediaTab guard passes before and after extraction; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/MediaTab.tsx`, `apps/web/src/features/studio/components/preview/media/MediaTabBulkActionBar.tsx`, `apps/web/src/features/studio/components/preview/media/index.ts`, `apps/web/src/features/studio/components/preview/MediaTab.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 07:16] - [ARCH]

What: Continued the Studio `MediaTab.tsx` LOC split by moving repeated mobile/desktop selection-preview rendering into `media/MediaTabSelectionPreview.tsx`.
Why: The media tab parent still rendered the same selected document/image/video/audio/file/deliverable preview switch inline in both preview branches.
Impact: `MediaTab.tsx` is down to 2,059 LOC; the new selection preview component is 62 LOC; mounted preview open/close coverage passes before and after extraction; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/MediaTab.tsx`, `apps/web/src/features/studio/components/preview/media/MediaTabSelectionPreview.tsx`, `apps/web/src/features/studio/components/preview/media/index.ts`, `apps/web/src/features/studio/components/preview/MediaTab.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 07:20] - [ARCH]

What: Continued the Studio `MediaTab.tsx` LOC split by moving shared list section, error, and empty-state primitives into `media/MediaTabListPrimitives.tsx`.
Why: The media tab parent still owned reusable render primitives after header, footer, and selection-preview extraction.
Impact: `MediaTab.tsx` is down to 1,994 LOC; the new list primitive component is 69 LOC and tokenizes moved error/empty-state classes; mounted MediaTab coverage passes; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/MediaTab.tsx`, `apps/web/src/features/studio/components/preview/media/MediaTabListPrimitives.tsx`, `apps/web/src/features/studio/components/preview/media/index.ts`, `apps/web/src/features/studio/components/preview/MediaTab.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 07:24] - [ARCH]

What: Continued the Studio `MediaTab.tsx` LOC split by moving deliverable row and preview rendering into `media/MediaDeliverables.tsx`.
Why: The media tab parent still owned deliverable-specific row, icon, preview, and file-open rendering inline after the shared preview shell extraction.
Impact: `MediaTab.tsx` is down to 1,862 LOC; the new deliverables component is 131 LOC; mounted deliverable preview open/close coverage passes; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/MediaTab.tsx`, `apps/web/src/features/studio/components/preview/media/MediaDeliverables.tsx`, `apps/web/src/features/studio/components/preview/media/MediaTabSelectionPreview.tsx`, `apps/web/src/features/studio/components/preview/media/index.ts`, `apps/web/src/features/studio/components/preview/MediaTab.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 07:36] - [ARCH]

What: Continued the Studio `MediaTab.tsx` LOC split by moving document and asset row rendering into `media/MediaRows.tsx`.
Why: The media tab parent still owned row selection, bulk checkbox, thumbnail, menu, rename, and drag rendering inline after deliverable/list primitive extraction.
Impact: `MediaTab.tsx` is down to 1,584 LOC; the new row component is 295 LOC and tokenizes moved checkbox/video thumbnail classes; mounted image preview open/close coverage passes; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/MediaTab.tsx`, `apps/web/src/features/studio/components/preview/media/MediaRows.tsx`, `apps/web/src/features/studio/components/preview/media/index.ts`, `apps/web/src/features/studio/components/preview/MediaTab.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 07:47] - [ARCH]

What: Continued the Studio `MediaTab.tsx` LOC split by moving grid-tab rendering into `media/MediaGridView.tsx`.
Why: The media tab parent still owned tabbed grid rendering, media thumbnails, bulk grid checkboxes, file/link grid panels, and grid-only style debt inline.
Impact: `MediaTab.tsx` is down to 1,196 LOC; the new grid component is 364 LOC and tokenizes moved grid styles; mounted grid-mode coverage passes; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/MediaTab.tsx`, `apps/web/src/features/studio/components/preview/media/MediaGridView.tsx`, `apps/web/src/features/studio/components/preview/media/index.ts`, `apps/web/src/features/studio/components/preview/MediaTab.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 07:57] - [ARCH]

What: Continued the Studio `MediaTab.tsx` LOC split by moving list-section rendering into `media/MediaListSections.tsx` and the list prop contract into `media-tab.types.ts`.
Why: The media tab parent still owned deliverables, documents, images, videos, files, and links list rendering inline after the grid extraction.
Impact: `MediaTab.tsx` is down to 793 LOC; the new list component is 352 LOC; touched list/grid/parent style debt is tokenized; mounted MediaTab coverage passes; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/MediaTab.tsx`, `apps/web/src/features/studio/components/preview/media/MediaListSections.tsx`, `apps/web/src/features/studio/components/preview/media/MediaGridView.tsx`, `apps/web/src/features/studio/components/preview/media/media-tab.types.ts`, `apps/web/src/features/studio/components/preview/media/index.ts`, `apps/web/src/features/studio/components/preview/MediaTab.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 08:04] - [ARCH]

What: Continued the Studio `MediaTab.tsx` LOC split by moving media data loading, realtime refresh, link pagination, and filtered derived lists into `media/useMediaTabData.ts`.
Why: The media tab parent still owned fetch/effect/filter orchestration after list and grid rendering had been extracted.
Impact: `MediaTab.tsx` is down to 598 LOC; the new data hook is 272 LOC; mounted MediaTab coverage passes before and after extraction; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/MediaTab.tsx`, `apps/web/src/features/studio/components/preview/media/useMediaTabData.ts`, `apps/web/src/features/studio/components/preview/media/index.ts`, `apps/web/src/features/studio/components/preview/MediaTab.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 08:14] - [ARCH]

What: Completed the Studio `MediaTab.tsx` parent LOC split by moving final mobile/desktop shell rendering into `media/MediaTabShell.tsx` and bulk selection/delete state into `media/useMediaTabBulkSelection.ts`.
Why: The media tab parent was still above the 400-line frontend component cap after data/effect extraction.
Impact: `MediaTab.tsx` is down to 372 LOC; the new shell and bulk-selection hook are under their caps; mounted MediaTab coverage passes; normal scoped lint passes with `max-lines` enabled; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/MediaTab.tsx`, `apps/web/src/features/studio/components/preview/media/MediaTabShell.tsx`, `apps/web/src/features/studio/components/preview/media/useMediaTabBulkSelection.ts`, `apps/web/src/features/studio/components/preview/media/index.ts`, `apps/web/src/features/studio/components/preview/MediaTab.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 08:27] - [ARCH]

What: Started the Studio `SocialPostPreview.tsx` LOC split by adding mounted characterization coverage, moving data/realtime loading into `social-post-preview/useSocialPostPreviewData.ts`, and moving `MonthCalendar` to a shared component path.
Why: `SocialPostPreview.tsx` was the next largest Studio preview target and also imported Spaces-private calendar/menu code directly.
Impact: `SocialPostPreview.tsx` is down to 1,853 LOC; the new hook/test/shared calendar are under their caps; the SocialPost target no longer has direct non-Studio feature imports; mounted SocialPost coverage passes before and after extraction; scoped lint passes with only the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/SocialPostPreview.tsx`, `apps/web/src/features/studio/components/preview/SocialPostPreview.test.tsx`, `apps/web/src/features/studio/components/preview/social-post-preview/useSocialPostPreviewData.ts`, `apps/web/src/components/calendar/MonthCalendar.tsx`, `apps/web/src/features/spaces/components/cells/date-picker/MonthCalendar.tsx`, `apps/web/src/features/studio/components/preview/artifacts/preview/ArtifactPreviewPane.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 08:37] - [ARCH]

What: Continued the Studio `SocialPostPreview.tsx` LOC split by moving schedule dialog rendering into `social-post-preview/SocialPostScheduleDialog.tsx` and platform logo paths into a private constants file.
Why: The parent still owned the full schedule dialog JSX after data/realtime loading moved out.
Impact: `SocialPostPreview.tsx` is down to 1,678 LOC; the new dialog and constants files are under their caps; mounted SocialPost coverage passes before and after extraction; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/SocialPostPreview.tsx`, `apps/web/src/features/studio/components/preview/social-post-preview/SocialPostScheduleDialog.tsx`, `apps/web/src/features/studio/components/preview/social-post-preview/social-post-preview.constants.ts`, `apps/web/src/features/studio/components/preview/SocialPostPreview.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 08:48] - [ARCH]

What: Continued the Studio `SocialPostPreview.tsx` LOC split by moving toolbar, upload/download menu, schedule button, and post-menu rendering into `social-post-preview/SocialPostPreviewToolbar.tsx`.
Why: The parent still owned toolbar/menu JSX after data and schedule dialog rendering had moved out.
Impact: `SocialPostPreview.tsx` is down to 1,457 LOC; the new toolbar is 356 LOC and props-only; mounted SocialPost coverage now locks upload-menu and host post-menu behavior; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/SocialPostPreview.tsx`, `apps/web/src/features/studio/components/preview/social-post-preview/SocialPostPreviewToolbar.tsx`, `apps/web/src/features/studio/components/preview/SocialPostPreview.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 08:57] - [ARCH]

What: Continued the Studio `SocialPostPreview.tsx` LOC split by moving media picker state, upload validation, presigned upload, library attach, and media remove orchestration into `social-post-preview/useSocialPostMediaActions.ts`.
Why: The parent still owned media mutation and picker orchestration after toolbar/menu rendering had moved out.
Impact: `SocialPostPreview.tsx` is down to 1,307 LOC; the new media hook is 198 LOC; mounted SocialPost coverage now locks the media-library picker path; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/SocialPostPreview.tsx`, `apps/web/src/features/studio/components/preview/social-post-preview/useSocialPostMediaActions.ts`, `apps/web/src/features/studio/components/preview/SocialPostPreview.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 09:05] - [ARCH]

What: Continued the Studio `SocialPostPreview.tsx` LOC split by moving PNG/PDF/ZIP export state, preview capture, carousel slide capture, and export error mapping into `social-post-preview/useSocialPostExportActions.ts`.
Why: The parent still owned export orchestration after media picker/mutation logic had moved out.
Impact: `SocialPostPreview.tsx` is down to 1,225 LOC; the new export hook is 130 LOC; mounted SocialPost coverage now locks generated-creative PNG export from the download menu; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/SocialPostPreview.tsx`, `apps/web/src/features/studio/components/preview/social-post-preview/useSocialPostExportActions.ts`, `apps/web/src/features/studio/components/preview/SocialPostPreview.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 09:16] - [ARCH]

What: Continued the Studio `SocialPostPreview.tsx` LOC split by moving LinkedIn/Instagram platform frame rendering and caption truncation helpers into `social-post-preview/SocialPostPlatformFrames.tsx`.
Why: The parent still owned platform mockup rendering and fixed-surface chrome after export orchestration had moved out.
Impact: `SocialPostPreview.tsx` is down to 835 LOC; the new platform frame component is 383 LOC; mounted SocialPost coverage now locks LinkedIn frame behavior and render stability; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/SocialPostPreview.tsx`, `apps/web/src/features/studio/components/preview/social-post-preview/SocialPostPlatformFrames.tsx`, `apps/web/src/features/studio/components/preview/SocialPostPreview.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 09:21] - [ARCH]

What: Continued the Studio `SocialPostPreview.tsx` LOC split by moving video URL detection, raster media rendering, and TSX preview runner setup into `social-post-preview/SocialPostVisualRenderers.tsx`.
Why: The parent still owned TSX/raster visual rendering helpers after platform-frame rendering had moved out.
Impact: `SocialPostPreview.tsx` is down to 723 LOC; the new renderer file is 120 LOC; mounted SocialPost coverage now locks image raster rendering and generated TSX runner output; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/SocialPostPreview.tsx`, `apps/web/src/features/studio/components/preview/social-post-preview/SocialPostVisualRenderers.tsx`, `apps/web/src/features/studio/components/preview/SocialPostPreview.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 09:30] - [ARCH]

What: Continued the Studio `SocialPostPreview.tsx` LOC split by moving visual selection and no-visual upload placeholder rendering into `social-post-preview/SocialPostVisualPresentation.tsx`.
Why: The parent still owned final visual branching and empty visual controls after renderer extraction.
Impact: `SocialPostPreview.tsx` is down to 608 LOC; the new presentation file is 206 LOC; mounted SocialPost coverage now locks the no-visual placeholder; scoped lint passes except the known parent max-lines rule; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/SocialPostPreview.tsx`, `apps/web/src/features/studio/components/preview/social-post-preview/SocialPostVisualPresentation.tsx`, `apps/web/src/features/studio/components/preview/SocialPostPreview.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 09:42] - [ARCH]

What: Completed the Studio `SocialPostPreview.tsx` LOC split by moving schedule orchestration into `social-post-preview/useSocialPostScheduleActions.ts` and preview label formatting into `social-post-preview-labels.ts`.
Why: The parent still exceeded the frontend component cap after visual presentation extraction, with schedule state and callbacks as the last large inline concern.
Impact: `SocialPostPreview.tsx` is down to 399 LOC; the new schedule hook is 297 LOC; mounted SocialPost coverage now locks schedule confirmation; normal scoped lint passes with max-lines enabled; and full web typecheck passes.
Files: `apps/web/src/features/studio/components/preview/SocialPostPreview.tsx`, `apps/web/src/features/studio/components/preview/social-post-preview/useSocialPostScheduleActions.ts`, `apps/web/src/features/studio/components/preview/social-post-preview/social-post-preview-labels.ts`, `apps/web/src/features/studio/components/preview/SocialPostPreview.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 09:57] - [ARCH]

What: Moved Spaces social-post menu ownership out of the Studio artifact preview host by adding a `renderSocialPostMenu` slot and wiring the concrete menu from the Spaces preview body.
Why: `ArtifactPreviewPane.tsx` still imported a Spaces-private social-post menu directly after the SocialPost preview split.
Impact: The Studio host no longer imports `SocialPostMenuDropdown`; Spaces social-post preview menu behavior is covered by a mounted wrapper test before and after the move; full web typecheck passes; the larger ArtifactPreviewPane host split remains tracked.
Files: `apps/web/src/features/studio/components/preview/artifacts/preview/ArtifactPreviewPane.tsx`, `apps/web/src/features/spaces/components/artifacts/campaign-slide-preview-body.tsx`, `apps/web/src/features/spaces/components/artifacts/campaign-slide-preview-body.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 10:08] - [ARCH]

What: Extracted the shared artifact preview resource contract and moved the Spaces artifact preview wrapper through a documented transitional `ArtifactPreviewPaneAdapter`.
Why: The Spaces preview body and controller still reached into the Studio-owned artifact preview host/type after the SocialPost menu ownership cleanup.
Impact: Spaces no longer imports the Studio preview host directly, Studio hooks and the Spaces controller share `ArtifactPreviewResource` from `@/lib/artifacts`, and the remaining adapter/host/controller debt is logged for the next Phase 3-E slices.
Files: `apps/web/src/components/artifacts/ArtifactPreviewPaneAdapter.tsx`, `apps/web/src/lib/artifacts/artifact-preview-types.ts`, `apps/web/src/features/studio/components/preview/artifacts/preview/ArtifactPreviewPane.tsx`, `apps/web/src/features/studio/components/preview/artifacts/hooks/useArtifactSelection.ts`, `apps/web/src/features/studio/components/preview/artifacts/hooks/useArtifactsController.ts`, `apps/web/src/features/spaces/components/artifacts/campaign-slide-preview-body.tsx`, `apps/web/src/features/spaces/components/artifacts/use-space-artifact-preview-controller.ts`, `apps/web/src/features/spaces/components/artifacts/campaign-slide-preview-body.test.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 10:24] - [ARCH]

What: Moved artifact theme-preview CSS generation into shared `@/lib/artifacts` and routed touched artifact preview theme fetches through the shared `@/lib/themes` barrel.
Why: The Spaces artifact preview controller still imported the Studio artifact tree helper only to build theme CSS, and the touched Studio/Spaces hooks still reached into the Themes feature service for `getTheme`.
Impact: The old Spaces-to-Studio tree import is gone, the duplicate helper was removed from the Studio tree builder, focused helper and mounted preview tests pass before and after the move, normal focused ESLint passes, and full web typecheck passes.
Files: `apps/web/src/lib/artifacts/theme-preview-css.ts`, `apps/web/src/lib/artifacts/theme-preview-css.test.ts`, `apps/web/src/lib/artifacts/index.ts`, `apps/web/src/lib/themes/index.ts`, `apps/web/src/features/studio/components/preview/artifacts/tree/buildArtifactTree.tsx`, `apps/web/src/features/studio/components/preview/artifacts/hooks/useArtifactsData.ts`, `apps/web/src/features/spaces/components/artifacts/use-space-artifact-preview-controller.ts`, `apps/web/src/features/spaces/components/artifacts/campaign-slide-preview-body.test.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 10:34] - [ARCH]

What: Moved the Spaces artifact preview controller campaign fetch from the Studio campaign service re-export to the shared `@/lib/campaigns` barrel and added hook-level characterization coverage.
Why: The Spaces preview controller still had a direct Studio campaign service import after the theme-preview helper moved to shared artifacts.
Impact: The old campaign-service path is clean for the touched controller/test/shared campaigns files; the hook test locks presentation selection, campaign theme lookup, theme CSS, and render stability; focused tests, lint, and web typecheck pass.
Files: `apps/web/src/features/spaces/components/artifacts/use-space-artifact-preview-controller.ts`, `apps/web/src/features/spaces/components/artifacts/use-space-artifact-preview-controller.test.tsx`, `apps/web/src/features/spaces/components/artifacts/campaign-slide-preview-body.test.tsx`, `apps/web/src/lib/campaigns/index.ts`, `apps/web/src/lib/campaigns/campaign-api.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 10:39] - [ARCH]

What: Moved the Spaces artifact preview controller `Ad` and `Presentation` type imports from the Studio type re-export to shared `@/lib/artifacts`.
Why: The controller still had a direct Studio type import even though those artifact contracts already live in shared lib.
Impact: The stale Studio types path is clean for the touched controller/test/shared artifact files; the hook-mounted baseline and post-change test pass; focused lint and web typecheck pass.
Files: `apps/web/src/features/spaces/components/artifacts/use-space-artifact-preview-controller.ts`, `apps/web/src/features/spaces/components/artifacts/use-space-artifact-preview-controller.test.tsx`, `apps/web/src/lib/artifacts/index.ts`, `apps/web/src/lib/artifacts/artifact-types.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 10:42] - [ARCH]

What: Moved the Spaces artifact preview controller funnel and presentation preview helpers from the Studio service re-export to shared `@/lib/artifacts`.
Why: The controller's last direct Studio import was only reaching shared artifact preview APIs through the Studio compatibility service.
Impact: `use-space-artifact-preview-controller.ts` now has zero direct Studio imports; hook and wrapper mounted tests pass before and after the move; focused lint and web typecheck pass.
Files: `apps/web/src/features/spaces/components/artifacts/use-space-artifact-preview-controller.ts`, `apps/web/src/features/spaces/components/artifacts/use-space-artifact-preview-controller.test.tsx`, `apps/web/src/features/spaces/components/artifacts/campaign-slide-preview-body.test.tsx`, `apps/web/src/lib/artifacts/index.ts`, `apps/web/src/lib/artifacts/artifact-preview-api.ts`, `apps/web/src/lib/artifacts/funnel-preview-api.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 10:49] - [ARCH]

What: Split pure mapping, page loading, theme lookup, and selected resource normalization helpers out of the Spaces artifact preview controller.
Why: The controller was boundary-clean but still 567 LOC, above the hook decomposition guideline.
Impact: `use-space-artifact-preview-controller.ts` is down to 403 LOC, the new helper is 184 LOC, mounted hook coverage now locks the funnel first-page path, and focused lint/typecheck pass.
Files: `apps/web/src/features/spaces/components/artifacts/use-space-artifact-preview-controller.ts`, `apps/web/src/features/spaces/components/artifacts/use-space-artifact-preview-controller.helpers.ts`, `apps/web/src/features/spaces/components/artifacts/use-space-artifact-preview-controller.test.tsx`, `apps/web/src/features/spaces/components/artifacts/campaign-slide-preview-body.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 10:55] - [ARCH]

What: Split funnel, presentation, and funnel-page realtime subscription effects out of the Spaces artifact preview controller.
Why: The controller was still 403 LOC after the pure helper extraction, above the 300 LOC hook guideline.
Impact: `use-space-artifact-preview-controller.ts` is down to 272 LOC, the new realtime hook is 174 LOC, mounted coverage locks presentation realtime refresh and channel cleanup, and focused lint/typecheck pass.
Files: `apps/web/src/features/spaces/components/artifacts/use-space-artifact-preview-controller.ts`, `apps/web/src/features/spaces/components/artifacts/use-space-artifact-preview-realtime.ts`, `apps/web/src/features/spaces/components/artifacts/use-space-artifact-preview-controller.test.tsx`, `apps/web/src/features/spaces/components/artifacts/campaign-slide-preview-body.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 11:08] - [ARCH]

What: Split Studio artifact data hook helpers, theme preview loading, and realtime subscription setup out of `useArtifactsData.ts`.
Why: The hook still mixed artifact fetch/cache state, theme lookup, realtime subscriptions, and tree derivation at 562 LOC.
Impact: `useArtifactsData.ts` is down to 245 LOC; the new helper, theme, and realtime files are each under their limits; mounted hook coverage locks artifact loading, theme CSS, realtime cleanup, newest-artifact selection, and render stability; focused lint and full web typecheck pass.
Files: `apps/web/src/features/studio/components/preview/artifacts/hooks/useArtifactsData.ts`, `apps/web/src/features/studio/components/preview/artifacts/hooks/useArtifactsData.helpers.ts`, `apps/web/src/features/studio/components/preview/artifacts/hooks/useArtifactsRealtime.ts`, `apps/web/src/features/studio/components/preview/artifacts/hooks/useArtifactsThemePreview.ts`, `apps/web/src/features/studio/components/preview/artifacts/hooks/useArtifactsData.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 11:25] - [ARCH]

What: Split Studio artifact selection helpers, node selection branching, and funnel-page preview/realtime behavior out of `useArtifactSelection.ts`.
Why: The hook still mixed tree-node branch selection, selected resource normalization, page preview loading, and realtime refresh at 557 LOC.
Impact: `useArtifactSelection.ts` is down to 177 LOC; the new helper and sub-hook files are each under their limits; mounted hook coverage locks funnel/page/blog selection, realtime cleanup, and render stability; focused lint and full web typecheck pass.
Files: `apps/web/src/features/studio/components/preview/artifacts/hooks/useArtifactSelection.ts`, `apps/web/src/features/studio/components/preview/artifacts/hooks/useArtifactSelection.helpers.ts`, `apps/web/src/features/studio/components/preview/artifacts/hooks/useArtifactFunnelPagePreview.ts`, `apps/web/src/features/studio/components/preview/artifacts/hooks/useArtifactNodeSelection.ts`, `apps/web/src/features/studio/components/preview/artifacts/hooks/useArtifactSelection.test.tsx`, `apps/web/src/features/studio/components/preview/artifacts/hooks/useArtifactsData.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 11:35] - [ARCH]

What: Split Studio artifact controller helper logic out of `useArtifactsController.ts` and routed its compatibility imports to shared artifact/chat contracts.
Why: The controller still mixed pending-open parsing, synthetic tree-node mapping, active-selection payloads, fetched page sorting, and ad-set option derivation at 386 LOC.
Impact: `useArtifactsController.ts` is down to 208 LOC; the new helper file is 191 LOC; mounted controller coverage locks pending-open restore, artifact events, active-selection emission, fetched page sorting, bulk creator routing, and render stability; focused lint/tests pass.
Files: `apps/web/src/features/studio/components/preview/artifacts/hooks/useArtifactsController.ts`, `apps/web/src/features/studio/components/preview/artifacts/hooks/useArtifactsController.helpers.ts`, `apps/web/src/features/studio/components/preview/artifacts/hooks/useArtifactsController.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 11:40] - [FIX]

What: Added backend task-agent artifact scope propagation so task-created outputs inherit the task space and campaign through request context plus an opt-in scoped session key.
Why: Artifacts created from task activity were landing without the task's `space_id` and sometimes in the wrong campaign because the task harness did not seed the same artifact action scope that chat/channel runs use.
Impact: Task-created documents, presentations, websites, media, and other artifact tool outputs now receive the task's space/campaign scope automatically; normal chat session keys remain backward-compatible unless scope segments are explicitly requested.
Files: `apps/agent-api/src/modules/shared/services/agent-runtime.service.ts`, `apps/agent-api/src/modules/shared/agent-runtime.service.test.ts`, `apps/agent-api/src/modules/task-agent/services/task-agent.service.ts`, `apps/agent-api/src/modules/task-agent/services/task-agent-request-context.service.ts`, `apps/agent-api/src/modules/task-agent/task-agent.service.test.ts`, `apps/agent-api/src/modules/task-agent/task-agent.module.ts`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 11:44] - [ARCH]

What: Moved the Spaces ad artifact menu out of the Studio artifact preview host and behind a `renderAdMenu` slot.
Why: `ArtifactPreviewPane.tsx` still imported the Spaces-private `AdMenuDropdown` directly after the social-post menu ownership cleanup.
Impact: The direct Studio/shared `AdMenuDropdown` scan is clean, Spaces ad and social-post menu paths are covered by mounted wrapper tests with render-loop guards, and the remaining ArtifactPreviewPane host debt is narrowed to date/email/form/funnel dependencies.
Files: `apps/web/src/features/studio/components/preview/artifacts/preview/ArtifactPreviewPane.tsx`, `apps/web/src/features/spaces/components/artifacts/campaign-slide-preview-body.tsx`, `apps/web/src/features/spaces/components/artifacts/campaign-slide-preview-body.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 11:50] - [ARCH]

What: Moved artifact date formatting helpers from Spaces artifact display code into shared `@/lib/artifacts`.
Why: The Studio-owned `ArtifactPreviewPane.tsx` still imported a Spaces-private date formatter only to render ad preview metadata.
Impact: `ArtifactPreviewPane.tsx` now imports `formatRelativeArtifactDate` from shared artifacts, existing Spaces card meta rows keep working through a compatibility re-export, date-helper behavior has focused coverage, and the host's remaining Spaces imports are narrowed to email, form, and funnel preview branches.
Files: `apps/web/src/lib/artifacts/artifact-date.ts`, `apps/web/src/lib/artifacts/index.ts`, `apps/web/src/features/spaces/components/artifacts/artifact-display.ts`, `apps/web/src/features/spaces/components/artifacts/__tests__/artifact-display.test.ts`, `apps/web/src/features/studio/components/preview/artifacts/preview/ArtifactPreviewPane.tsx`, `apps/web/src/features/spaces/components/artifacts/campaign-slide-preview-body.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 11:50] - [FEATURE]

What: Added first-party inbound Space webhooks for Flows, including HMAC receiver, endpoint/event persistence, endpoint-level field mappings, Flow trigger/runtime support, Loop capability exposure, and the Flows Webhooks tab.
Why: Users need to create signed webhook endpoints and reuse the mapped webhook payload in published Flows without adding an outbound webhook action in V1.
Impact: Admins can create, rotate, disable, map, and inspect Space-scoped webhook endpoints from `/flows`; signed JSON deliveries fan out to every enabled published Flow using the endpoint; Flow templates can use `trigger.payload`, `trigger.fields.*`, and `trigger.webhook.*`; focused backend/shared/agent/web tests cover the new contracts.
Files: `supabase/migrations/20260625081518_flow_webhook_endpoints.sql`, `apps/api/src/modules/spaces/**`, `packages/api-shared/src/types/flow-capabilities.ts`, `packages/api-shared/src/types/workflow-capabilities.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-flows.service.ts`, `apps/agent-api/src/modules/agent-sync/**`, `apps/web/src/features/flows/**`, `apps/web/src/features/spaces/components/automations/**`, `apps/web/src/lib/flows/**`, `documentation/features/spaces-automation.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 11:56] - [ARCH]

What: Moved the Spaces funnel artifact menu out of the Studio artifact preview host and behind a `renderFunnelMenu` slot.
Why: `ArtifactPreviewPane.tsx` still imported the Spaces-private `FunnelMenuDropdown` directly after the ad menu and date-helper boundary cleanup.
Impact: The direct Studio/shared `FunnelMenuDropdown` scan is clean, mounted wrapper coverage now locks social-post, ad, and funnel menu render paths with render-loop guards, and the host's remaining Spaces imports are narrowed to email and form preview branches.
Files: `apps/web/src/features/studio/components/preview/artifacts/preview/ArtifactPreviewPane.tsx`, `apps/web/src/features/spaces/components/artifacts/campaign-slide-preview-body.tsx`, `apps/web/src/features/spaces/components/artifacts/campaign-slide-preview-body.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 12:30] - [FIX]

What: Replaced the task-agent document-only readback with scoped persisted output reconciliation for supported artifact rows, Space items, task-linked emails, and media assets.
Why: Task-created presentations, media, funnels, forms, flows, social posts, ads, and other outputs could still disappear from task activity and Deliverables & media when the stream missed the `ui_block`.
Impact: Task completion now synthesizes the same `artifact_preview` and `media_asset` blocks the chat UI already understands, dedupes them against streamed/completion blocks, and skips empty funnel shells that have no page/file content.
Files: `apps/agent-api/src/modules/task-agent/services/task-agent-artifact-outputs.service.ts`, `apps/agent-api/src/modules/task-agent/services/task-agent-artifact-output-specs.ts`, `apps/agent-api/src/modules/task-agent/services/task-agent-artifact-outputs.service.test.ts`, `apps/agent-api/src/modules/task-agent/repositories/task-agent.repository.ts`, `apps/agent-api/src/modules/task-agent/services/task-agent.service.ts`, `documentation/features/spaces-automation.md`, `.docs/plans/task-agent-artifact-output-gap-audit.md`, `.docs/logs/changelog2026-06-25.md`

## [2026-06-25 12:32] - [FIX]

What: Merged Home Jaime/Atlas suggestion review into the single DailyRecommendationStrip "For you" row.
Why: The separate suggestion banner duplicated the For you strip below the composer and used purple/sparkle styling that did not match the unified suggestion treatment.
Impact: Home now shows one For you carousel with Atlas/Jaime suggestions always first in orange styling, daily recommendations rotate after them, Sparkles icons are removed from suggestion surfaces, and the standalone SuggestionReviewBanner component is deleted.
Files: `apps/web/src/app/(dashboard)/home/page.tsx`, `apps/web/src/features/home/components/DailyRecommendationStrip.tsx`, `apps/web/src/features/home/components/DailyRecommendationStrip.test.tsx`, `apps/web/src/features/home/hooks/use-suggestion-review.ts`, `apps/web/src/features/home/components/SuggestionReviewModal.tsx`, `apps/web/src/features/home/components/SuggestionReviewDetails.tsx`, `apps/web/src/features/home/lib/suggestion-review.ts`, `.docs/logs/changelog2026-06-25.md`
