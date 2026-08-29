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
