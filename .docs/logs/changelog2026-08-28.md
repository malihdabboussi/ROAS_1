# Changelog - August 28, 2026

## [2026-08-28 22:31] - [FIX]

**What:** Added page-level regression coverage for the complete public post-call review sequence from meeting context through the inline delegation preview and final follow-up message.

**Why:** Production QA needed a non-destructive way to prove the stage orchestration without confirming task creation or sending a client message.

**Impact:** The full public review flow now fails in CI if it stops opening the existing bulk-delegation review inline or stops revealing the prepared follow-up message afterward.

**Files:** `apps/web/src/features/home/components/PublicMeetingFollowUpReviewPage.test.tsx`

## 2026-08-28 15:35 - [FIX]

What: Made unmapped-channel `@Pixel` mentions resolve named clients from the surrounding Slack thread before binding the agent conversation, and made exact campaign names win over broader partial name matches.

Why: A short follow-up such as “do you have it?” in `#roas-review` discarded the earlier Claude Club identity, searched generic Brain/integration context, and incorrectly claimed an available onboarding recording was not linked.

Impact: Thread follow-ups can bind the correct client Campaign Brain even when the current mention contains only a pronoun; client-name parsing no longer crosses Slack message lines, and genuinely ambiguous names still fail closed.

Files: `apps/api/src/modules/slack/services/slack-service-events.base.ts`, `apps/api/src/modules/slack/services/slack-turn-prompt.ts`, `apps/api/src/modules/slack/services/slack-client-context.ts`, `apps/api/src/modules/slack/services/__tests__/slack-turn-prompt.test.ts`, `apps/api/src/modules/slack/services/__tests__/slack-client-context.test.ts`, `documentation/features/meeting-follow-up-slack.md`

## 2026-08-28 12:25 - [FIX]

What: Aligned Space task-list headers with the external selection, expansion, and status controls, and made a childless task's expand chevron open the inline Add subtask composer.

Why: Moving row controls outside the Name cell left the header grid offset, while expanding an empty task produced no editable subtask row.

Impact: All Tasks and shared Space task lists keep Name and subsequent headers aligned with row data, and users can begin entering the first subtask directly from the chevron.

Files: `apps/web/src/features/spaces/components/DraggableColumnHeaders.tsx`, `apps/web/src/features/spaces/components/GroupSection.tsx`, `apps/web/src/features/spaces/components/ListView.tsx`, `apps/web/src/features/spaces/components/space-list-group-chrome.tsx`, `apps/web/src/features/spaces/components/ListView.test.tsx`, `documentation/features/space-items-custom-data-drive.md`

## 2026-08-28 12:51 - [STYLE]

What: Replaced sticky, shadowed user prompts with flat timestamped chat bubbles in the normal conversation flow and scoped message actions to exact-message hover or keyboard focus.

Why: The pinned prompt, opaque wrapper, and gradient fade made the top message look like a floating card, while unnamed hover groups could reveal actions outside the message being targeted.

Impact: Studio, Space, project, Team, HR, and voice chats now follow the same streamlined ChatGPT-style reading flow while preserving edit, copy, reply, and fork actions.

Files: `apps/web/src/features/studio/components/message-bubble/UserMessageBubble.tsx`, `apps/web/src/features/studio/components/message-bubble/AssistantActions.tsx`, `apps/web/src/features/studio/components/message-bubble/MessageBubbleOrderedBlocks.tsx`, `apps/web/src/features/studio/components/MessageBubble.tsx`, `apps/web/src/features/studio/components/ChatInterface.tsx`, `apps/web/src/features/projects/components/ProjectChatPane.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/team/components/agent-chat-panel/AgentChatThread.tsx`, `apps/web/src/features/team-2/components/hr-side-chat/TeamHrChatMessageTurns.tsx`, `apps/web/src/features/team/components/voice/agent-voice-mode/AgentVoiceTranscript.tsx`, `documentation/features/claude-chatgpt-shell.md`
## [2026-08-28 15:49] - [FIX]

What: Added a public post-call action that restores missing Fathom follow-ups from canonical meeting actions, added the review-page refresh control, and embedded the existing Portal bulk-delegation review inline before the final follow-up message.

Why: Deleted follow-up rows could not be reconstructed, and the task-review step forced reviewers into a separate Portal screen instead of continuing in the post-call flow.

Impact: Reviewers can recover grounded meeting tasks and complete the existing task-by-task delegation UI without leaving the meeting review page. No task or follow-up message is sent automatically.

Files: `apps/api/src/modules/meetings/controllers/meeting-follow-up-review.controller.ts`, `apps/api/src/modules/meetings/services/meeting-follow-up-review.service.ts`, `apps/web/src/components/global-chat/components/MeetingPostCallReviewCard.tsx`, `apps/web/src/components/global-chat/components/MeetingPostCallReviewStages.tsx`, `apps/web/src/features/home/components/PublicMeetingFollowUpReviewPage.tsx`, `apps/web/src/features/home/services/meeting-follow-up-review-api.ts`, tests, and feature documentation.

## [2026-08-28 21:10] - [FIX]

What: Made the explicit post-call refresh reopen dismissed provider follow-ups without changing normal ingestion semantics, and normalized saved ISO due dates when the meeting review card hydrates.

Why: Refresh returned success while restored tasks stayed hidden because their dismissal marker was preserved, and persisted timestamps rendered as an empty date because the card treated them as date-only strings.

Impact: Reviewers can recover grounded meeting tasks and see previously saved dates before continuing to the inline delegation review; routine Fathom syncs still respect intentional task dismissals.

Files: `apps/api/src/modules/meetings/domain/upsert-provider-follow-ups.ts`, `apps/api/src/modules/meetings/domain/upsert-provider-follow-ups.test.ts`, `apps/api/src/modules/meetings/repositories/meeting-workspace-state.repository.ts`, `apps/api/src/modules/meetings/services/meeting-follow-up-review.service.ts`, `apps/api/src/modules/meetings/services/meeting-follow-up-review.service.test.ts`, `apps/web/src/components/global-chat/components/MeetingPostCallReviewCard.tsx`, `apps/web/src/components/global-chat/components/MeetingPostCallReviewCard.test.tsx`, `documentation/features/meeting-follow-up-slack.md`

## 2026-08-28 12:39 - [FEATURE]

What: Carried canonical Fathom assignees into meeting follow-up tasks, made Assigned to me the default Tasks scope, and surfaced the same My Tasks rollup on New Chat.

Why: Call commitments already created canonical follow-up tasks, but their resolved user assignment stopped at `meeting_actions`, leaving My Tasks incomplete and forcing users to hunt across meeting and task surfaces.

Impact: Explicit call commitments assigned to a known organization user now enter that user's My Tasks automatically. Review and Portal delegation continue to operate on the existing task, while New Chat provides a compact source-aware queue without creating duplicate records.

Files: `apps/api/src/modules/meetings/domain/upsert-provider-follow-ups.ts`, `apps/api/src/modules/meetings/repositories/meeting-workspace-state.repository.ts`, `apps/api/src/modules/meetings/services/meeting-source-ingestion.service.ts`, `apps/web/src/features/all-tasks/components/AllTasksBoard.tsx`, `apps/web/src/components/shell/ShellNewChatTasks.tsx`, `apps/web/src/components/shell/ShellNewChatGreeting.tsx`, `documentation/features/meeting-follow-up-slack.md`

## 2026-08-28 13:00 - [FIX]

What: Added a cross-Space, assigned-to-current-user mode to Pixel's existing `list_tasks` action and taught daily-focus prompts to combine that single fail-closed task read with the authoritative calendar read.

Why: Pixel previously had to discover Spaces before listing tasks. When that path failed, the model retried without the ownership filter and ranked stale, delegated, and unrelated client work as Dylan's priorities.

Impact: “What should I focus on today?” can retrieve every open task assigned to the signed-in user in one call, remove configured closed statuses per Space, and cannot silently broaden into all tasks. Brain remains interpretation context rather than a source of task records.

Files: `apps/agent-api/src/modules/artifacts/repositories/artifact-tasks.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-tasks.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-my-tasks.helper.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/agent-api/src/modules/agent-sync/services/vibey-api-skill-generator.ts`, `documentation/features/meeting-follow-up-slack.md`

## 2026-08-28 14:58 - [FIX]

What: Applied the task-rollup current-user assignment filter in the database query before ordering and limiting results, and standardized both web/API and agent task reads on native JSONB assignee containment with regression coverage.

Why: The API previously limited the cross-Space task pool before filtering assignments in memory. Small consumers such as New Chat could therefore receive zero My Tasks even though the Tasks page found the same user's work with a larger limit.

Impact: Every `view=my` task-rollup consumer and Pixel's `assigned_to_me` action now receives genuinely assigned tasks without broadening to teammates' work, depending on unrelated tasks appearing early in the global result set, or emitting a malformed PostgREST logic expression.

Files: `apps/api/src/modules/programs/repositories/task-rollup.repository.ts`, `apps/api/src/modules/programs/repositories/__tests__/task-rollup.repository.test.ts`, `apps/api/src/modules/programs/services/task-rollup.service.ts`, `apps/api/src/modules/programs/services/__tests__/task-rollup.service.test.ts`, `apps/agent-api/src/modules/artifacts/services/space-item-query.util.ts`, `apps/agent-api/src/modules/artifacts/services/__tests__/artifact-tasks.service.test.ts`

## 2026-08-28 15:18 - [FIX]

What: Added opt-in Vercel deployment-protection authentication to the web platform proxy for preview-to-preview API requests.

Why: Signed-in branch QA previously mixed preview UI with the production API because protected API previews could not be reached server-to-server. That hid branch backend changes from real browser verification.

Impact: A branch can now set `BACKEND_URL` to its exact protected API deployment and provide `VERCEL_AUTOMATION_BYPASS_SECRET`; production and non-Vercel targets remain unchanged when the variable is absent.

Files: `apps/web/src/app/api/proxy/[...path]/route.ts`, `apps/web/src/app/api/proxy/[...path]/proxy-upstream-headers.ts`, `apps/web/src/app/api/proxy/[...path]/proxy-upstream-headers.test.ts`

## 2026-08-28 15:31 - [FIX]

What: Generalized chat output receipts across every active durable artifact action family, retained them alongside explicit service progress blocks, and added persisted Outputs aggregation and canonical opening for document, project, widget, and browser-screenshot blocks.

Why: Canvas exposed the wider contract gap: successful create/update actions could return a durable resource without a persisted linked receipt, while several already-persisted block families were omitted from the Outputs side card after refresh.

Impact: Supported create and material-update actions now share one registry-backed receipt fallback, receipt coverage drifts with the action schema/preflight surface, Outputs restores all supported persisted block families, and projects/documents open their canonical destinations. The web summary extractor was split below repository line limits.

Files: `apps/agent-api/src/modules/shared/durable-artifact-output-registry.ts`, `apps/agent-api/src/modules/shared/ui-block-extractor.ts`, `apps/agent-api/src/modules/shared/ui-block-extractor.test.ts`, `apps/agent-api/src/modules/agent-sync/services/creation-output-capability-drift.test.ts`, `apps/web/src/components/shell/shell-conversation-output-rows.ts`, `apps/web/src/components/shell/shell-conversation-summary.ts`, `apps/web/src/components/shell/ShellRightPanelFiles.tsx`, `apps/web/src/features/studio/components/preview/ShellArtifactViewerAdapter.tsx`, `documentation/features/claude-chatgpt-shell.md`

## 2026-08-28 14:40 - [FIX]

What: Made Canvas mutations emit linked, persisted chat outputs; extended the shared artifact contract with campaign/Canvas targets; showed active tool progress under Activity; and made repeated updates keep the newest output summary.

Why: Chat could claim a Canvas was live while Outputs remained empty, and the side card discarded active progress and retained stale receipts for repeatedly updated resources.

Impact: Direct chat and Mission/task Canvas work now share the standard inline-output and sidebar path, survive transcript reloads, open the correct campaign Canvas, and expose live execution detail. Existing durable artifact, document, media, project, and widget outputs continue through the same persisted contract.

Files: `apps/agent-api/src/modules/artifacts/services/artifact-strategy.service.ts`, `apps/agent-api/src/modules/shared/ui-block-extractor.ts`, `apps/web/src/lib/chat/message-content-blocks.ts`, `apps/web/src/lib/artifacts/artifact-preview-types.ts`, `apps/web/src/lib/artifacts/shell-artifact-viewer.ts`, `apps/web/src/lib/missions/mission-types.ts`, `apps/web/src/components/artifacts/artifact-inline-preview-card/`, `apps/web/src/features/studio/components/message-bubble/`, `apps/web/src/components/shell/`, `documentation/features/claude-chatgpt-shell.md`

## 2026-08-28 16:58 - [FIX]

What: Added a preview-only runtime override for exact branch QA and made the Fly secret importer support an app's first deployment before any machines exist.

Why: Signed-in browser QA otherwise followed Dylan's existing runtime profile instead of the isolated branch runtime, while the approved Fly deployment script stopped after staging secrets because a brand-new app had no machines to restart yet.

Impact: Preview deployments can opt into an isolated `AGENT_BACKEND_URL` without changing user profiles or production routing, and temporary Fly apps can complete their first deployment through the repository script.

Files: `apps/web/src/app/api/proxy/[...path]/route.ts`, `apps/web/src/app/api/proxy/[...path]/route.test.ts`, `scripts/roas/apply-fly-secrets.sh`

## 2026-08-28 21:08 - [FIX]

What: Made current-user ownership authoritative when Pixel sends `assigned_to_me` together with an incidental `space_id`, and preserved the pre-limit open-task count for that cross-Space result.

Why: A fresh daily-focus chat correctly requested current-user tasks but also supplied a Space discovered during planning. The task service treated the Space as higher precedence, returned zero tasks from that one Space, and falsely told the user no work was assigned to them.

Impact: My Tasks questions now stay cross-Space and fail closed to the signed-in user's assignments even when the model adds a Space. The returned count still describes the open assigned set before the response limit.

Files: `apps/agent-api/src/modules/artifacts/services/artifact-my-tasks.helper.ts`, `apps/agent-api/src/modules/artifacts/services/__tests__/artifact-tasks.service.test.ts`, `documentation/features/meeting-follow-up-slack.md`

## 2026-08-28 21:20 - [FIX]

What: Added a fail-closed fast path that skips semantic Brain retrieval for purely operational task and calendar questions while retaining Brain retrieval whenever the prompt asks for calls, Slack, campaign, client, recommendation, or rationale context.

Why: Signed-in browser traces showed a fresh daily-focus request spending about 25 seconds reranking irrelevant Brain candidates before the chat stream started, including a failed reranker parse, while the canonical assigned-task query completed in 243 ms.

Impact: “What is on top today?”, My Tasks, calendar, schedule, and meeting-list questions can start directly with canonical tools. Questions that need conversational or client knowledge still use Brain, preserving the source-of-truth boundary instead of treating Brain as the task or calendar database.

Files: `apps/agent-api/src/modules/chat/services/chat-operational-agenda.util.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-gateway-preparation.service.ts`, `apps/agent-api/src/modules/chat/services/chat-turn-gateway-preparation.service.test.ts`, `documentation/features/meeting-follow-up-slack.md`

## 2026-08-28 15:00 - [FEATURE]

What: Added a deterministic Client Lifecycle Mission to the shared Chat and Create catalog, including Client Brain review, Avatar and Offer confirmation, strategy, production selection, launch readiness, explicit approval gates, and ongoing optimization.

Why: Agency operators need one guided client path that can be started visually or conversationally without rebuilding existing strategy and production playbooks or losing source-of-truth boundaries.

Impact: Users can select Client Lifecycle from Create > Mission and launch a client-scoped Mission that reuses approved records, pauses at meaningful decisions, and prepares linked production work without automatically publishing, spending, or messaging.

Files: `apps/web/src/lib/spaces/quick-missions-catalog.ts`, `apps/web/src/features/spaces/components/playbooks/client-lifecycle.ts`, `apps/web/src/features/spaces/components/playbooks/QuickMissionsHubModal.tsx`, `apps/mission-worker/src/modules/missions/playbooks/client-lifecycle.playbook.ts`, `documentation/features/missions.md`

## 2026-08-28 15:15 - [FEATURE]

What: Expanded Mission Details into a single Manage mission menu with visual entry points for continuing, changing or removing plan steps, retrying from a step, branching into a child Mission, deterministic track extensions, and existing playbooks.

Why: Users need the same lifecycle controls whether they begin in chat or click through the Mission, without maintaining a second mutation path or losing the Mission's conversation history.

Impact: A visual management choice reopens the Mission's source conversation and prefills a precise request. Pixel can inspect the live plan, explain downstream effects, and request confirmation before using the existing mission manager actions.

Files: `apps/web/src/features/mission-control/components/dialogs/MissionTrackActions.tsx`, `apps/web/src/features/mission-control/components/dialogs/MissionTrackActions.test.tsx`, `apps/web/src/features/mission-control/config/messages.config.ts`, `documentation/features/missions.md`

## 2026-08-28 15:25 - [FIX]

What: Added Client Lifecycle to the agent-facing `create_mission` schema and generated Vibey action guidance, with source-drift coverage.

Why: The visual catalog and Mission Worker recognized the playbook, but Pixel's chat-facing action vocabulary did not yet name it and could choose a freeform Mission for a lifecycle request.

Impact: Requests to onboard, plan, produce, launch, and optimize a client through one guided lifecycle now direct Pixel to pass `playbook_id: client-lifecycle` through the same deterministic path used by Create.

Files: `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-capability-source-drift.test.ts`

## 2026-08-28 15:05 - [FEATURE]

What: Added a direct Create > More entry for Client Lifecycle, persisted approved Offer and Avatar ids into campaign context, filtered Mission context to those records, scoped Mission Brain retrieval to the active campaign and step request, and required explicit intent for Mission-manager mutations.

Why: Chat and visual launches need to produce the same grounded lifecycle, and later steps must consume the exact marketing fundamentals the user approved instead of generic Brain context or whichever records happen to load first.

Impact: Users can start the lifecycle from chat, Create > Mission, or Create > More; approved fundamentals become canonical across later Mission work; and reads remain immediate while extend, edit, cancel, retry, reassign, replan, and approval actions require a deliberate user request.

Files: `apps/web/src/components/shell/ShellCreateMenuPanel.tsx`, `apps/mission-worker/src/modules/missions/playbooks/client-lifecycle.playbook.ts`, `apps/mission-worker/src/modules/missions/services/context/mission-context.service.ts`, `apps/agent-api/src/modules/artifacts/services/mission-context-enricher.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-north-star.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-additional-schemas.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/api/src/modules/campaigns/controllers/campaigns.controller.ts`, `apps/api/src/modules/campaigns/services/campaigns-service-02.base.ts`, `packages/agent-policy/src/action-contracts.ts`, `documentation/features/missions.md`

## 2026-08-28 15:15 - [FEATURE]

What: Added a post-approval Client Lifecycle stage that synchronizes the approved campaign roadmap to the campaign Canvas, strengthened launch readiness to reconcile native tasks and Page Grader Work Requests as distinct records, and added adapter proof for branch, remove, retry, and replan controls.

Why: The lifecycle named Canvas and Work Requests but did not deterministically place the approved plan on Canvas, and several existing durable Mission-manager routes lacked explicit Agent API contract coverage.

Impact: The lifecycle now carries one approved plan from strategy into editable Canvas stages, resource cards, and placeholders before launch review. Automated tests prove parent-scoped branch creation and the manager endpoints used for remove, retry-from-stage, and restart/replan.

Files: `apps/mission-worker/src/modules/missions/playbooks/client-lifecycle.playbook.ts`, `apps/mission-worker/src/modules/missions/playbooks/__tests__/client-lifecycle.playbook.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-missions.service.test.ts`, `documentation/features/missions.md`

## 2026-08-28 15:18 - [FIX]

What: Added opt-in Vercel deployment-protection authentication to the web platform proxy for preview-to-preview API requests.

Why: Signed-in branch QA previously mixed preview UI with the production API because protected API previews could not be reached server-to-server. That hid branch backend changes from real browser verification.

Impact: A branch can now set `BACKEND_URL` to its exact protected API deployment and provide `VERCEL_AUTOMATION_BYPASS_SECRET`; production and non-Vercel targets remain unchanged when the variable is absent.

Files: `apps/web/src/app/api/proxy/[...path]/route.ts`, `apps/web/src/app/api/proxy/[...path]/proxy-upstream-headers.ts`, `apps/web/src/app/api/proxy/[...path]/proxy-upstream-headers.test.ts`
