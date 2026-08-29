# Changelog - August 29, 2026

## [2026-08-29 07:55] - [FEATURE]

What: Added canonical meeting-action lifecycle reconciliation. An authenticated hourly cron marks overdue and 30-day inactive follow-ups for owner review, Meetings and My Tasks surface explicit Still open / Done / Dismiss decisions, and those decisions preserve task/provider evidence in `space_items.custom_data`. Updated the task rollup to include meeting follow-up child rows.

Why: Canonical call tasks could remain stale indefinitely, and the All Tasks query hid follow-ups attached to a parent meeting even when Pixel correctly retrieved those same assignments.

Impact: Old meeting commitments can now be reviewed without automatic completion or duplicate task creation. A confirmed-open item is suppressed for 14 days; completed and dismissed decisions retain their owner-review origin; and the same canonical follow-up appears in Meetings, My Tasks, and Pixel's task retrieval path.

Files: `apps/api/src/modules/meetings/`, `apps/api/src/modules/programs/repositories/task-rollup.repository.ts`, `apps/api/api/meeting-action-reconciliation-cron.ts`, `apps/api/vercel.json`, `apps/web/src/components/work-views/AllTasksNativeList.tsx`, `apps/web/src/features/all-tasks/`, `apps/web/src/features/home/components/MeetingActionItemsSection.tsx`, `apps/web/src/lib/tasks/task-lifecycle-review.ts`, `documentation/features/meeting-follow-up-slack.md`, `.docs/logs/changelog2026-08-29.md`.

## 2026-08-29 06:42 - [FIX]

What: Preserved provider follow-up refresh compatibility when no canonical assignee map is available, while retaining human assignment propagation during normal Fathom ingestion.

Why: Rebasing the canonical assignment work over the newer dismissed-follow-up refresh exposed a shared planner call that legitimately has provider actions but no identity-resolution pass.

Impact: Explicit refresh can reopen grounded provider follow-ups without crashing or inventing an assignee; normal ingestion still assigns uniquely resolved organization users into My Tasks.

Files: `apps/api/src/modules/meetings/domain/upsert-provider-follow-ups.ts`, `apps/api/src/modules/meetings/domain/upsert-provider-follow-ups.test.ts`, `apps/api/src/modules/meetings/repositories/meeting-workspace-state.repository.ts`, `.docs/logs/changelog2026-08-29.md`.

## 2026-08-29 05:21 - [FIX]

What: Added a bounded Auto-model route for canonical daily-focus prompts. The existing operational-agenda classifier now selects no-reasoning Terra tool retrieval, low-reasoning Sonnet writing, and direct instructions to query assigned tasks and calendar events without reading skills or listing Spaces. Added regression coverage for both the fast route and the full contextual route.

Why: Signed-in traces showed the assigned-task query completing in roughly 238 ms and calendar retrieval in roughly 5.7 seconds, while generic agent planning and writing kept the complete response near 68 seconds after Brain preload was already removed.

Impact: Plain My Tasks, daily-focus, calendar, schedule, and meeting-list questions can reach canonical tools with less model deliberation. Questions mentioning calls, transcripts, Slack, Brain, clients, campaigns, performance, notes, context, recommendations, or why retain full Brain retrieval and normal Auto reasoning.

Files: `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.test.ts`, `documentation/features/meeting-follow-up-slack.md`, `.docs/logs/changelog2026-08-29.md`.

## 2026-08-29 06:20 - [FIX]

What: Corrected the deterministic operational-agenda stream payload to emit the answer through the canonical `content` field and strengthened the regression assertion around that client-visible contract.

Why: Signed-in preview verification showed both canonical tools completing but no assistant answer rendering because the quick path emitted `delta`, which the progressive stream ignores for `content_delta` events.

Impact: Daily-focus and meeting-only quick-path answers now render and persist through the same stream accumulator used by normal chat responses.

Files: `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.test.ts`, `.docs/logs/changelog2026-08-29.md`.

## 2026-08-29 05:33 - [FIX]

What: Routed canonical operational-agenda research through the existing Gemini 3.5 Flash speed model without incompatible cross-model settings and corrected the calendar tool instruction to require the supported `start` and `end` fields exactly once.

Why: Signed-in preview evidence showed the bounded Terra route still waiting 34 seconds before its first tool call and initially calling the calendar action with unsupported `start_date` and `end_date` fields, leaving the complete turn at 67 seconds. A subsequent Haiku probe preserved that same 35-second pre-tool delay, so the operational route now uses the platform's designated speed model.

Impact: Pure My Tasks and calendar prompts retain the same fail-closed assigned-task query and Sonnet final-answer pass while avoiding Terra's long tool-planning delay and the failed calendar retry. Contextual Brain, call, Slack, client, and campaign questions remain unchanged.

Files: `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.test.ts`, `.docs/logs/changelog2026-08-29.md`.

## 2026-08-29 06:01 - [FIX]

What: Replaced model-led tool selection for canonical daily-focus requests with parallel server-side execution of the existing `list_tasks` and `list_calendar_events` actions. The quick path deterministically renders every verified record, while the normal agent route remains intact for contextual questions. Added regression coverage for exact assigned-task arguments, visible tool lifecycle events, all-record rendering, failure receipts, and meetings-only seven-day follow-ups.

Why: Signed-in Gemini, Haiku, and Terra probes all spent roughly 35 seconds processing the agent bootstrap before the first deterministic read. The live Gemini trace completed the actual task and calendar actions in about eight seconds but took 70 seconds overall.

Impact: Pure task/calendar turns avoid both 15k-token agent bootstraps and cannot lose tasks to a writer evidence cap, while retaining the existing action schemas, authorization, structured error contract, workflow circuit breaker, canonical records, and visible work summary. Calls, Slack, Brain, client, campaign, performance, recommendation, and rationale prompts continue through full contextual reasoning.

Files: `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.test.ts`, `documentation/features/meeting-follow-up-slack.md`, `.docs/logs/changelog2026-08-29.md`.

## [2026-08-29 06:58] - [FIX]

**What:** Corrected the deterministic operational-calendar route so follow-up requests for tomorrow or after today start on the next day, while upcoming windows remain bounded to seven days.

**Why:** Signed-in multi-turn browser QA found that “What meetings do I have coming up after today?” repeated today's calendar because the fast route recognized only a narrow set of future-window phrases.

**Impact:** Daily-focus chats now preserve the user's requested time window across follow-up turns without reintroducing the slower Brain/model path.

**Files:** `apps/agent-api/src/modules/chat/services/chat-operational-agenda.util.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.test.ts`, `documentation/features/meeting-follow-up-slack.md`

## [2026-08-29 07:07] - [FIX]

**What:** Made the operational calendar window helper own both the exact date range and its user-facing label, including a distinct one-day tomorrow state.

**Why:** The tomorrow query was date-correct after the previous fix but could still be presented as today's meetings during an ongoing chat.

**Impact:** Follow-up turns now consistently show Today's meetings, Tomorrow's meetings, or Upcoming meetings from the same deterministic temporal contract.

**Files:** `apps/agent-api/src/modules/chat/services/chat-operational-agenda.util.ts`, `apps/agent-api/src/modules/chat/services/chat-operational-agenda-format.util.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.ts`, `apps/agent-api/src/modules/chat/services/chat-operational-agenda-format.util.test.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.test.ts`, `documentation/features/meeting-follow-up-slack.md`, `.docs/logs/changelog2026-08-29.md`

## [2026-08-29 05:26] - [FIX]

What: Kept the Work Summary Create catalog available before a first chat message exists.

Why: Signed-in lifecycle QA showed that a fresh client-scoped chat exposed only Tasks, forcing the user to send a message before the visual Create > More > Client Lifecycle path became reachable.

Impact: Users can now launch Client Lifecycle or seed another Create flow immediately from a fresh client chat; the shared Mission launcher creates and binds the source conversation when the Mission starts.

Files: `apps/web/src/components/shell/ShellRightPanel.tsx`, `apps/web/src/components/shell/ShellRightPanel.test.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-29 05:52] - [FIX]

What: Scoped normal Quick Mission launch choices and defaults to the active global client, and kept the portaled campaign selector inside the Mission dialog interaction boundary.

Why: Signed-in Client Lifecycle QA under Claude Club inherited an unrelated Living Trust campaign from stale chat state, and selecting the dedicated TEST Space dismissed and reset the launcher.

Impact: A client-filtered launch can only target that client's mapped campaign and Spaces, its primary mapped Space is preselected, dropdown choices persist, and explicit parent-Mission extensions retain their supplied Space.

Files: `apps/web/src/components/global-chat/components/QuickMissionsHubHost.tsx`, `apps/web/src/components/global-chat/components/QuickMissionsHubHost.test.ts`, `apps/web/src/features/spaces/components/playbooks/QuickMissionsHubModal.tsx`, `apps/web/src/features/spaces/components/playbooks/QuickMissionsHubModal.test.tsx`, `documentation/features/missions.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-08-29 06:27] - [FIX]

What: Mounted the Quick Missions campaign-and-Space menu inside its owning dialog portal and added a regression test for owner-scoped option selection.

Why: Exact deployed browser QA proved that preventing dialog dismissal was insufficient: selecting Claude Club's second Space still reset the controlled picker to its initial `General` value because the menu remained outside the Radix dialog tree.

Impact: Campaign selection now remains an internal dialog interaction, updates the controlled Space value, and can proceed to lifecycle context without snapping back to the initial Space.

Files: `apps/web/src/features/spaces/components/automations/AutomationCategorizedSelect.tsx`, `apps/web/src/features/spaces/components/automations/AutomationCategorizedSelect.test.tsx`, `apps/web/src/features/spaces/components/playbooks/QuickMissionCampaignSpaceSelect.tsx`, `apps/web/src/features/spaces/components/playbooks/QuickMissionsHubModal.tsx`, `apps/web/src/features/spaces/components/playbooks/QuickMissionsHubModal.test.tsx`, `documentation/features/missions.md`

## [2026-08-29 07:11] - [FEATURE]

What: Split the generic Mission plan-change chat action into explicit Extend, Restart from a stage, Skip or remove a step, and Replace a step controls, each with a confirmation-gated source-chat prompt.

Why: Lifecycle operators should be able to choose the exact Mission operation visually without translating several materially different actions through one vague plan-change entry point.

Impact: Manage mission now exposes the complete lifecycle vocabulary directly, preserves chat-first review and confirmation, and keeps the expanded action set reachable in a bounded scrollable menu.

Files: `apps/web/src/features/mission-control/components/dialogs/MissionTrackActions.tsx`, `apps/web/src/features/mission-control/components/dialogs/MissionTrackActions.test.tsx`, `documentation/features/missions.md`

## [2026-08-29 07:35] - [FIX]

What: Added the canonical campaign asset summary to normal client chat and made campaign-selected Offer and Avatar ids control which records Pixel receives.

Why: Client Lifecycle Missions already used approved campaign fundamentals, but normal chat did not inject its campaign asset summary and could therefore reason without the approved Offer/Avatar records.

Impact: Chat and Missions now share the same client strategy records. Selected ids filter the injected records, missing approved ids are surfaced without fallback, and chat context accounting measures the campaign block separately.

Files: `apps/agent-api/src/modules/chat/repositories/chat-context.repository.ts`, `apps/agent-api/src/modules/chat/services/campaign-context.service.ts`, `apps/agent-api/src/modules/chat/services/campaign-context.service.test.ts`, `apps/agent-api/src/modules/chat/services/chat-prewarm-context.types.ts`, `apps/agent-api/src/modules/chat/services/chat-prewarm-context.service.ts`, `apps/agent-api/src/modules/chat/services/chat-prewarm-policy-codec.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-gateway-preparation.service.ts`, `apps/agent-api/src/modules/chat/services/public-agent-quick-context.ts`, `apps/agent-api/src/modules/chat/services/chat-gateway-input.service.ts`, `apps/agent-api/src/modules/chat/services/chat.service.access-context.test.ts`, `documentation/features/missions.md`

## [2026-08-29 08:18] - [FIX]

What: Made Mission execution explicitly report campaign-selected Offer and Avatar ids that no longer resolve, with an instruction to stop instead of substituting another record.

Why: Signed-in lifecycle QA and the final context audit found that client chat surfaced unresolved approved ids, while the Mission worker filtered to the ids but silently omitted a missing record.

Impact: Client chat and Mission execution now apply the same fail-closed fundamentals contract for the selected client campaign.

Files: `apps/mission-worker/src/modules/missions/services/context/mission-context.service.ts`, `apps/mission-worker/src/modules/missions/services/__tests__/hybrid-context.test.ts`, `.docs/logs/changelog2026-08-29.md`

## [2026-08-29 09:15] - [FIX]

What: Added Canvas to the fixed client-workspace campaign navigation and moved that navigation contract into the tested campaign-tab module.

Why: A valid chat-created Canvas receipt linked to `?view=canvas`, but client workspaces rejected Canvas as an allowed tab and normalized the destination back to Overview.

Impact: Canvas outputs now open the editable Canvas inside the correct client campaign, while existing client-workspace tabs and scope remain unchanged.

Files: `apps/web/src/app/(dashboard)/campaigns/[id]/page.tsx`, `apps/web/src/app/(dashboard)/campaigns/[id]/_lib/campaign-nav-tabs.ts`, `apps/web/src/app/(dashboard)/campaigns/[id]/_lib/campaign-nav-tabs.test.ts`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-29 08:39] - [FEATURE]

What: Added server-owned provenance to canonical meeting and Slack-derived tasks. Fathom follow-ups now retain recording/transcript identifiers and bounded evidence excerpts; manual call actions retain manual-note evidence; Slack-created tasks retain their originating conversation plus exact Slack team, channel, thread, and message identifiers. Meeting workspace responses include sourced, missing-source, percentage, and source-kind coverage.

Why: A task title and assignee were not enough for Pixel or an operator to verify why the task existed, and historical rows could not be distinguished from fully sourced actions.

Impact: Contextual task questions can use the canonical task record to cite the originating conversation while task status remains owned by `space_items`. Missing provenance is explicit instead of being inferred or hidden.

Files: `apps/api/src/modules/meetings/domain/meeting-action-provenance.ts`, `apps/api/src/modules/meetings/domain/upsert-provider-follow-ups.ts`, `apps/api/src/modules/meetings/providers/fathom-meeting-source.ts`, `apps/api/src/modules/meetings/repositories/meeting-workspace-read.repository.ts`, `apps/api/src/modules/meetings/repositories/meeting-workspace-state.repository.ts`, `apps/api/src/modules/meetings/services/meeting-source-ingestion.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-task-activity-helper.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-tasks.service.ts`, `documentation/features/meeting-follow-up-slack.md`.

## [2026-08-29 09:58] - [FEATURE]

What: Added a shared source-of-truth response envelope to Brain and live campaign reporting, injected the canonical routing policy into chat, and added a deterministic Auto path that combines a refreshed campaign dashboard with campaign Brain context and open campaign work.

Why: Pixel needs to answer campaign-status questions from current reporting while using Brain to explain approved decisions and conversation history, without treating a stale memory or unrelated client as the current record.

Impact: Campaign-status questions resolve one client, retrieve canonical metrics with an as-of timestamp, cross-reference durable context in parallel, and fail closed when no client campaign is resolved. Brain, reporting, and chat now share `{ canonical_source, as_of, evidence, brain_context }`.

Files: `apps/agent-api/src/modules/artifacts/services/artifact-source-truth-contract.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-source-truth.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-search-input.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-search-actions.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-analytics.service.ts`, `apps/agent-api/src/modules/chat/services/chat-source-truth-instructions.ts`, `apps/agent-api/src/modules/chat/services/chat-campaign-intelligence.util.ts`, `apps/agent-api/src/modules/chat/services/chat-artifact-read-execution.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.ts`, `apps/agent-api/src/modules/chat/services/chat-gateway-input.service.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `documentation/features/meeting-follow-up-slack.md`

## [2026-08-29 11:00] - [FIX]

What: Added a deterministic quoted-task follow-up route that performs one canonical assigned-task lookup and renders assignment, current status, and stored meeting or Slack provenance directly.

Why: Signed-in production QA found that asking where one visible task came from triggered repeated Brain, Slack, meeting, and calendar searches, took nearly two minutes, and incorrectly claimed the assigned Fathom task had no source even though its canonical row contained both assignment and recording evidence.

Impact: Exact task assignment/source questions no longer invoke model-led research. They remain scoped to the signed-in user's tasks, include completed rows for lifecycle explanations, require an exact title match, and cite stored Fathom timestamps/playback links or Slack provenance without cross-client widening.

Files: `apps/agent-api/src/modules/chat/services/chat-operational-agenda.util.ts`, `apps/agent-api/src/modules/chat/services/chat-canonical-task-lookup.util.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.test.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-gateway-preparation.service.test.ts`, `documentation/features/meeting-follow-up-slack.md`

## [2026-08-29 11:27] - [FIX]

What: Made **Show page** depend on an explicitly conversation-bound work page, removed global recent-page and Meetings fallbacks, stopped artifact opens from attaching the latest navigation page, and invalidated legacy unmarked page associations during shell hydration.

Why: Full chat could advertise a page that did not belong to the conversation, and opening an output could silently save an unrelated recently visited page as that chat's restore destination.

Impact: Output clicks retain their exact conversation artifact, linked meeting pages remain restorable, ordinary menu navigation stays independent, and chats without a real page no longer show a misleading control.

Files: `apps/web/src/components/shell/ShellChatHeaderPageControl.tsx`, `apps/web/src/components/shell/shell-chat-header-page.ts`, `apps/web/src/components/shell/shell-work-area-page.ts`, `apps/web/src/components/shell/use-shell-store.ts`, focused shell tests, `documentation/features/claude-chatgpt-shell.md`, `.docs/logs/changelog2026-08-29.md`.

## [2026-08-29 10:15] - [FEATURE]

What: Replaced Home's meeting-only next-move projection with the canonical assigned-task rollup, added meeting/Slack/task provenance icons and source routing, and added owner-scoped accepted, snoozed, dismissed, and false-positive telemetry with a live edited/completed/stale quality view.

Why: Home, All Tasks, and Pixel could disagree because Home independently reconstructed call follow-ups from attendance, and there was no measurable way to distinguish useful recommendations from stale or incorrectly surfaced work.

Impact: Home and New Chat now surface the same personal task lifecycle as My Tasks without changing task status. Operators can explicitly mark a suggestion not relevant, and product quality can be measured against the current canonical task while Slack delivery remains approval-gated.

Files: `apps/api/src/modules/home/`, `apps/web/src/features/home/components/SuggestedNextMoves.tsx`, `apps/web/src/features/home/services/next-moves.service.ts`, `apps/web/src/features/home/config/next-moves-messages.config.ts`, `supabase/migrations/20260829173000_action_recommendation_quality.sql`, `documentation/features/meeting-follow-up-slack.md`

## [2026-08-29 11:40] - [FIX]

What: Included assigned child actions in the canonical cross-Space My Tasks query, honored `include_closed` on that query, and bypassed Brain preload for exact quoted-task provenance questions.

Why: Signed-in production QA proved that a Fathom action could be correctly assigned to Dylan and retain exact recording evidence while My Tasks and Pixel omitted it solely because meeting actions are child records beneath the canonical meeting item.

Impact: Call-derived commitments now appear everywhere that reads My Tasks, completed commitments remain available for lifecycle/source explanations when explicitly requested, and direct assignment/source questions perform only the canonical task read.

Files: `apps/agent-api/src/modules/artifacts/repositories/artifact-tasks.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-my-tasks.helper.ts`, `apps/agent-api/src/modules/artifacts/services/__tests__/artifact-tasks.service.test.ts`, `apps/agent-api/src/modules/chat/services/chat-operational-agenda.util.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-gateway-preparation.service.test.ts`, `documentation/features/meeting-follow-up-slack.md`

## [2026-08-29 12:30] - [FIX]

What: Bounded operational daily-focus answers to ten current tasks and eight upcoming meetings, separated stale or overdue commitments into a three-item review preview, and retained the complete canonical counts plus My Tasks handoff.

Why: Signed-in production QA proved that including meeting child actions fixed provenance lookup but caused “What should I focus on?” to dump 143 assigned records, letting historical calls bury current work.

Impact: Pixel now gives a usable workday agenda while preserving every task in My Tasks and keeping exact quoted-task provenance lookup complete. Old commitments remain visible as a review count with explicit Done / Keep open guidance instead of masquerading as today’s priorities.

Files: `apps/agent-api/src/modules/chat/services/chat-operational-agenda-format.util.ts`, `apps/agent-api/src/modules/chat/services/chat-operational-agenda-format.util.test.ts`, `documentation/features/meeting-follow-up-slack.md`, `.docs/logs/changelog2026-08-29.md`

## [2026-08-29 12:04] - [FIX]

What: Bound direct-route chat outputs to their exact owning conversation and work-page destination before navigating to Canvas, Campaign, Flow, or Project surfaces.

Why: Production browser QA found that closing a Canvas opened from one chat could reveal a stale drawer conversation and then attach that Canvas to the wrong chat's **Show page** control.

Impact: Closing a directly routed output now returns to the chat that opened it, and **Show page** on that chat reopens the exact output page without cross-chat leakage.

Files: `apps/web/src/features/studio/components/preview/ShellArtifactViewerAdapter.tsx`, `apps/web/src/features/studio/components/preview/ShellArtifactViewerAdapter.test.tsx`, `documentation/features/claude-chatgpt-shell.md`, `.docs/logs/changelog2026-08-29.md`.

## [2026-08-29 12:51] - [FIX]

What: Split operational agenda inventory from first-action recommendations. Direct agenda questions still render bounded canonical task/calendar data, while “what should I do first?” sends that same verified evidence through the tool-free writer.

Why: Signed-in production QA found that a contextual prioritization follow-up repeated the entire agenda instead of choosing the user's next action.

Impact: Pixel can now work through the day conversationally: it preserves the fast, owner-scoped retrieval path and gives a reasoned first step without Brain fan-out, invented tasks, or organization-wide widening.

Files: `apps/agent-api/src/modules/chat/services/chat-operational-agenda.util.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.ts`, focused tests, `documentation/features/meeting-follow-up-slack.md`, `.docs/plans/agent-follow-up-work.md`
