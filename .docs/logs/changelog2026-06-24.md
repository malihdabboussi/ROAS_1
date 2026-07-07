# Changelog - June 24, 2026

## [2026-06-24 20:58] - [FEATURE]

What: Added durable production error reporting for Web server routes, worker process/background failures, OpenClaw runtime errors, and the Funnels app.
Why: Daily trace-to-bug intake needs persisted `app_errors` and `request_trace_events` across production-important surfaces, not console-only failures.
Impact: Auth callback/browser-media/tsx-repair server failures, mission/queue worker process and loop failures, OpenClaw error/fatal/unhandled failures, and Funnels browser/server failures now report best-effort observability rows with correlation IDs and source evidence where available.
Files: `apps/web/src/lib/observability/*`, `apps/web/src/app/(auth)/callback/route.ts`, `apps/web/src/app/api/chat/browser-media/[filename]/route.ts`, `apps/web/src/app/api/tsx-repair/route.ts`, `apps/funnels/src/lib/observability/*`, `apps/funnels/src/app/api/*/route.ts`, `apps/funnels/src/app/layout.tsx`, `apps/mission-worker/src/main.ts`, `apps/mission-worker/src/modules/logger/process-error-reporter.ts`, `apps/queue-worker/src/main.ts`, `apps/queue-worker/src/modules/logger/process-error-reporter.ts`, `apps/agent-api/src/modules/observability/*`, `apps/openclaw/src/observability/vibey-error-reporter.ts`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 20:56] - [FIX]

What: Applied the Flow definitions/installations migration to production Supabase and reloaded PostgREST schema cache.
Why: Flow Manage was querying `public.flow_installations`, but production did not yet have the table, causing the runtime schema-cache error.
Impact: Production now has `flow_definitions`, `flow_definition_versions`, `flow_installations`, linked Flow columns on `space_automations`, and backfilled installation rows for existing Space automations.
Files: `supabase/migrations/20260624175438_flow_definitions_installations.sql`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 19:48] - [FEATURE]

What: Split assistant feedback chips into positive (thumbs up) and negative (thumbs down) groups.
Why: Showing tags like "Too slow" on positive feedback or "Helpful" on negative feedback was confusing.
Impact: Thumbs up shows Helpful/Clear only; thumbs down shows Wrong, Missed context, Tool issue, Too slow, and Tone. Switching thumb direction drops incompatible tags before save.
Files: `apps/web/src/lib/agent-feedback/types.ts`, `apps/web/src/lib/agent-feedback/types.test.ts`, `apps/web/src/components/chat/AgentTurnFeedbackActions.tsx`, `apps/web/src/components/chat/AgentTurnFeedbackActions.test.tsx`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 19:40] - [FIX]

What: Fixed assistant feedback Save flow so tags and notes persist reliably after thumbs up/down.
Why: Save stayed disabled while the initial thumb request was in flight, and feedback sync overwrote in-progress draft edits when the first save completed.
Impact: Save stays enabled while editing, draft state is preserved until the popover closes, and explicit empty notes/tags are sent correctly.
Files: `apps/web/src/components/chat/AgentTurnFeedbackActions.tsx`, `apps/web/src/lib/agent-feedback/use-agent-turn-feedback.ts`, `apps/web/src/components/chat/AgentTurnFeedbackActions.test.tsx`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 19:36] - [FIX]

What: Repositioned assistant feedback popover with viewport-aware flip and right-edge alignment.
Why: The thumbs menu used absolute `left-0 top-full` positioning and clipped outside chat scroll containers near the bottom/right edges.
Impact: Feedback details now portal to `document.body`, align to the action row's right edge, flip above when space below is tight, and clamp within the viewport on scroll/resize.
Files: `apps/web/src/components/chat/AgentTurnFeedbackActions.tsx`, `apps/web/src/lib/ui/floating-menu-anchor.ts`, `apps/web/src/lib/ui/floating-menu-anchor.test.ts`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 19:10] - [ARCH]

What: Applied the production observability migrations and added a follow-up migration for trace bug intake actionability fields.
Why: Daily trace-to-bug intake needs durable joins across request, trace, app-error, runtime-run, and timeline-event tables plus enough noise/actionability metadata to avoid filing non-bugs.
Impact: Production now has request route events, source-code pointer columns, trace correlation fields, source-map metadata, Development Space fingerprint indexing, and actionability/noise fields for the tables used by trace intake.
Files: `supabase/migrations/20260624160401_observability_noise_actionability_fields.sql`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 19:31] - [STYLE]

What: Swapped fork chat icon from `GitFork` to Lucide `Split`.
Why: User requested the split icon for fork actions.
Impact: Fork button in assistant turn actions uses the `Split` icon.
Files: `apps/web/src/components/chat/AgentTurnFeedbackActions.tsx`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 19:28] - [STYLE]

What: Added hover tooltips to assistant turn-action icons (copy, fork, thumbs up, thumbs down).
Why: Icons alone were not self-explanatory without labels on hover.
Impact: Each action in `AgentTurnFeedbackActions` shows a top tooltip after 150ms, matching the undo button pattern.
Files: `apps/web/src/components/chat/AgentTurnFeedbackActions.tsx`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 19:22] - [STYLE]

What: Right-aligned assistant turn-action icons below each assistant message.
Why: Actions should sit on the right edge of the message row, not the left.
Impact: Copy, fork, thumbs, and undo controls align to the right across all chat surfaces using `AssistantActions`.
Files: `apps/web/src/features/studio/components/message-bubble/AssistantActions.tsx`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 19:18] - [STYLE]

What: Increased spacing between assistant turn-action icons from `gap-spacing-0` to `gap-spacing-1`.
Why: Compact zero-gap layout felt too tight after the last pass.
Impact: Copy, fork, thumbs, and undo icons have a small readable gap without returning to the wider glass button footprint.
Files: `apps/web/src/features/studio/components/message-bubble/AssistantActions.tsx`, `apps/web/src/components/chat/AgentTurnFeedbackActions.tsx`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 19:12] - [STYLE]

What: Tightened assistant turn-action icon spacing and pinned the latest assistant message actions visible until the user sends again.
Why: Expanded bare icon buttons felt too spaced out, and past messages should stay hover-only while the newest assistant reply keeps actions visible then fades when superseded.
Impact: Action icons use compact `p-0.5` hit targets with zero gap; last assistant message shows copy/fork/thumbs by default across studio, space, team, project, and agent chat surfaces.
Files: `apps/web/src/components/chat/AgentTurnFeedbackActions.tsx`, `apps/web/src/features/studio/components/message-bubble/AssistantActions.tsx`, `apps/web/src/lib/chat/assistant-message-actions.ts`, `apps/web/src/features/studio/components/ChatInterface.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/team-2/components/hr-side-chat/TeamHrSideChatPanel.tsx`, `apps/web/src/features/projects/components/ProjectChatPane.tsx`, `apps/web/src/features/team/components/AgentChatPanel.tsx`, `apps/web/src/features/team/components/agent-chat-panel/AgentChatThread.tsx`, `apps/web/src/features/spaces/components/chat/SpaceUndoButton.tsx`, `apps/web/src/lib/chat/assistant-message-actions.test.ts`, `apps/web/src/features/studio/components/message-bubble/AssistantActions.test.tsx`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 18:54] - [STYLE]

What: Removed glass chip backgrounds from post-turn chat action icons (copy, fork, thumbs, undo/redo).
Why: The small glass pills added visual noise after every assistant message.
Impact: Turn actions now use flat `btn-icon-bare` icons; selected thumbs keep color only, no active glass background.
Files: `apps/web/src/components/chat/AgentTurnFeedbackActions.tsx`, `apps/web/src/features/spaces/components/chat/SpaceUndoButton.tsx`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 18:53] - [FIX]

What: Moved context-window overflow recovery into OpenClaw and streamed structured compaction progress back through Agent API.
Why: Agent API retrying with a synthetic compact prompt still let oversized OpenClaw session state poison the next request; recovery needs to happen where the transcript, tool results, and retry loop actually live.
Impact: OpenClaw now emits `response.compaction` events while it compacts or truncates and retries the same run, the gateway maps unrecovered overflow to failed `context_window_exceeded`, and Agent API records those recovery events without issuing an extra model call.
Files: `apps/openclaw/src/agents/pi-embedded-runner/run.ts`, `apps/openclaw/src/gateway/openresponses-http.ts`, `apps/openclaw/src/agents/pi-embedded-runner/run.overflow-compaction.e2e.test.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-recovery.service.ts`, `apps/agent-api/src/modules/chat/services/openclaw-stream-lifecycle.service.ts`, `apps/agent-api/src/modules/chat/services/openclaw-stream-lifecycle.service.test.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.test.ts`, `apps/agent-api/src/modules/chat/services/chat.service.channel-message-persistence.test.ts`, `documentation/features/chat-stream-recovery.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 18:26] - [FIX]

What: Converted daily trace-to-bug intake ownership from an API cron classifier to the existing Codex automation session.
Why: Trace clustering and bug creation should be performed by a high-reasoning Codex run that can inspect evidence, consolidate root-cause clusters, and write Development Space bug tasks for the existing PR automation, not by a fixed backend algorithm.
Impact: The API no longer wires or ships the deterministic `trace-bug-intake` module; the `daily-vibey-trace-audit` Codex automation is now named Daily Vibey Trace-to-Bug Intake, runs on `gpt-5.5` with xhigh reasoning, and creates/updates only Development Space bug tasks.
Files: `apps/api/src/cron.service.ts`, `apps/api/src/app.module.ts`, `apps/api/src/modules/trace-bug-intake/*`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`, `~/.codex/automations/daily-vibey-trace-audit/automation.toml`

## [2026-06-24 18:07] - [FIX]

What: Fixed agent-api bootstrap crash resolving `RouteTraceReporter` by using static `@vibey/api-shared` imports in `main.ts`.
Why: Dynamic `import('@vibey/api-shared')` could resolve a stale or mismatched export, so `app.get(RouteTraceReporter)` threw `UnknownElementException` during boot.
Impact: agent-api now resolves route-trace middleware and the global exception filter from the same DI tokens registered by `SharedModule`.
Files: `apps/agent-api/src/main.ts`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 18:05] - [FIX]

What: Replaced the Brain read window/truncation implementation with cursor-based Brain pagination and restored the generic OpenClaw tool-result cap.
Why: Brain Scholar needs to fetch a batch, compact when needed, then continue with `pagination.next_cursor`; reducing result sizes or exposing raw offsets does not create the non-failing continuation loop.
Impact: Brain page, belief-pattern, and perspective reads now return `pagination.next_cursor`/`has_more`, reject cursors reused with different filters, and teach agents to continue after compaction with `cursor`; generic OpenClaw truncation remains a last-resort guard instead of the primary Brain strategy.
Files: `apps/agent-api/src/modules/artifacts/services/artifact-brain-read-pagination.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-narrative-actions.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-belief-actions.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-perspective-actions.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.test.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/openclaw/src/agents/pi-embedded-runner/tool-result-truncation.ts`, `apps/openclaw/src/agents/session-tool-result-guard.ts`, `.docs/features/brain-feature-implementation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 18:04] - [FIX]

What: Refreshed the generated `@vibey/api-shared` package output after adding observability exports and `component_stack` reporting.
Why: `@vibey/api` resolves `@vibey/api-shared` through `dist`, so stale generated declarations hid `RouteTraceReporter`, `createRequestTraceMiddleware`, and the updated `ReportErrorParams` type from the API compiler.
Impact: API dev/typecheck can import the observability middleware/reporter and pass frontend component stacks to the shared error reporter.
Files: `packages/api-shared/dist/index.d.ts`, `packages/api-shared/dist/index.js`, `packages/api-shared/dist/services/error-reporter.service.d.ts`, `packages/api-shared/dist/observability/*`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 16:39] - [FIX]

What: Bounded broad Agent Brain read actions and isolated chat context-window recovery retries.
Why: Brain Scholar turns could gather compact-looking prompt context, then append large Brain tool results for pages, belief patterns, and perspectives until the next LLM request exceeded the model context window; recovery retries reused the same OpenClaw session state.
Impact: Chat context recovery is opt-out and retries in an isolated recovery session. The initial Brain read-window approach from this entry was superseded by the 18:05 cursor-pagination fix.
Files: `apps/agent-api/src/modules/artifacts/repositories/artifact-brain-narrative.repository.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-brain-cognition.repository.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-recovery.service.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.ts`, `documentation/features/chat-stream-recovery.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 16:36] - [FIX]

What: Scoped social research People pending add/sync state by platform.
Why: Pending account operations were keyed only by handle, so an Instagram add could render as an in-flight row inside the YouTube People drawer.
Impact: IG, TikTok, YouTube, and X People drawers no longer show each other's in-flight account rows while adds or syncs are running.
Files: `apps/web/src/features/spaces/components/instagram-research/AccountTracker.tsx`, `apps/web/src/features/spaces/components/instagram-research/AccountTracker.test.tsx`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 16:25] - [FIX]

What: Fixed Flow drag-to-Loop so dropped flows stay as composer chips and feed Loop through Flow awareness context instead of typed composer text.
Why: The drop handler was writing `Work on this Flow...` into the input, which made the context look like a user draft instead of an attached Flow chip.
Impact: Dropped flows remain visible as chips above the composer, stay visible in existing Loop conversations, and expose attached flow ids, Space id/name, and installation count through `system_context`.
Files: `apps/web/src/features/flows/containers/FlowsPage.tsx`, `apps/web/src/features/flows/lib/flows-loop-awareness-context.ts`, `apps/web/src/features/flows/lib/flows-loop-awareness-context.test.ts`, `apps/web/src/features/team-2/components/hr-side-chat/TeamHrSideChatPanel.tsx`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 16:14] - [FEATURE]

What: Added daily trace-triage instrumentation across `app_errors`, `vb_agent_traces`, chat/OpenClaw streams, task/channel agents, mission traces, and admin trace/error surfaces.
Why: Daily automation needs queryable trace/message/request/run joins, normalized failed tool fields, and separate user-visible outcome/recovery status to classify recovered vs blocked turns.
Impact: New traces carry `request_id`, `message_id`, `run_id`, outcome fields, recovery events, and normalized tool failure fields; app errors can join to the exact turn; admin list queries expose the new columns. No automation skill was created in this migration.
Files: `supabase/migrations/20260624125739_trace_triage_observability_correlation.sql`, `packages/api-shared/src/services/error-reporter.service.ts`, `packages/api-shared/src/utils/agent-tool-error-normalizer.ts`, `packages/api-shared/src/filters/global-exception.filter.ts`, `apps/agent-api/src/modules/chat/services/*`, `apps/agent-api/src/modules/task-agent/services/task-agent.service.ts`, `apps/agent-api/src/modules/channel-agent/services/channel-agent.service.ts`, `apps/api/src/modules/client-errors/*`, `apps/api/src/modules/admin/services/admin-service-errors-traces.base.ts`, `apps/mission-worker/src/modules/missions/services/*`, `apps/mission-worker/src/modules/logger/*`, `apps/queue-worker/src/modules/logger/*`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 16:13] - [FEATURE]

What: Added the first TDD Agent Learning Loop execution slice for Jaime-owned skill and agent-file improvements.
Why: Jaime needs measured classification, ranking, proposal-quality, route-out, and experiment-decision logic before learning-loop proposals can safely reach users.
Impact: System-agent events no longer become customer-visible skill recommendations, Jaime's legacy skill recommendation prompt routes unsupported evidence out, and HR readiness instructions/migration now define the skills-and-agent-files lane.
Files: `apps/api/src/modules/skill-recommendations/services/agent-learning-loop-policy.service.ts`, `apps/api/src/modules/skill-recommendations/services/__tests__/agent-learning-loop-policy.service.test.ts`, `apps/api/src/modules/skill-recommendations/services/__tests__/jaime-learning-loop-instructions.test.ts`, `apps/api/src/modules/skill-recommendations/services/skill-recommendation-detection.service.ts`, `apps/api/src/modules/skill-recommendations/services/__tests__/skill-recommendation-detection.service.test.ts`, `apps/api/src/modules/skill-recommendations/services/skill-recommendation-jaime.service.ts`, `apps/api/src/modules/skill-recommendations/services/__tests__/skill-recommendation-jaime.service.test.ts`, `apps/api/src/modules/skill-recommendations/repositories/skill-recommendations.repository.ts`, `apps/api/src/modules/skill-recommendations/skill-recommendations.module.ts`, `docker/agents/hr/ROLE.md`, `supabase/migrations/20260624160952_hr_agent_learning_loop_readiness.sql`, `.docs/plans/agent-learning-loops-v2.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 16:09] - [FIX]

What: Fixed stacked live-chat tip alignment so the icon, “Tip:”, and typewriter text share one inline row.
Why: Splitting the label and tip text broke baseline alignment; `TypewriterTipReveal` used `inline-block`.
Impact: Stacked tips render as icon + `Tip: [text]` on the same line with consistent vertical alignment.
Files: `apps/web/src/components/chat/ComposerActiveRunTipCard.tsx`, `apps/web/src/components/chat/TypewriterTipReveal.tsx`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 16:06] - [STYLE]

What: Tightened stacked live-chat tip layout so the lightbulb sits inline directly before “Tip:”.
Why: The icon was in a separate flex column with extra gap, so it did not read as part of the label.
Impact: Stacked tips now show `[icon] Tip:` as one inline label, then the typewriter tip text.
Files: `apps/web/src/components/chat/ComposerActiveRunTipCard.tsx`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 15:58] - [STYLE]

What: Render the stacked live-chat tip flat on the gray composer tray instead of inside the `composer-tip-bubble` card.
Why: Stacked mode should match Flow and task activity — icon + text on the tray, not a nested card.
Impact: During streaming, the lightbulb and tip copy sit directly on `bg-secondary`; the bubble card only shows when the tip is not stacked.
Files: `apps/web/src/components/chat/ComposerActiveRunTipCard.tsx`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 15:57] - [DOCS]

What: Clarified that system agents and official/system skills never create customer-visible Jaime recommendations.
Why: System-owned artifacts should route to an internal Vibey review path instead of appearing in user approval surfaces.
Impact: Agent Learning Loops V2 now treats system-owned artifact findings as internal route-out items, while approval permissions only apply to organization-owned agent and skill artifacts.
Files: `.docs/plans/agent-learning-loops-v2.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 15:50] - [STYLE]

What: Stacked the live-chat composer tip onto the input using the same gray tray + glass composer pattern as Flow and task activity.
Why: The tip should feel connected to the composer during streaming instead of floating above it.
Impact: While a conversation streams, the existing lightbulb tip card sits on a `bg-secondary` tray above the glass `ChatInput`; tip content and icon are unchanged. Applied across studio chat, space chat, team HR chat, project chat, and agent chat thread.
Files: `apps/web/src/components/chat/ComposerInputStack.tsx`, `apps/web/src/components/chat/ComposerActiveRunTipCard.tsx`, `apps/web/src/components/chat/index.ts`, `apps/web/src/features/studio/components/chat/ComposerActiveRunTipCard.tsx`, `apps/web/src/features/studio/components/ChatInterface.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/team-2/components/hr-side-chat/TeamHrSideChatPanel.tsx`, `apps/web/src/features/projects/components/ProjectChatPane.tsx`, `apps/web/src/features/team/components/agent-chat-panel/AgentChatThread.tsx`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 15:44] - [DOCS]

What: Expanded the Agent Learning Loops V2 plan with Jaime readiness, artifact selection, proposal quality, approval permissions, experiment thresholds, conflict handling, and DB-backed name alignment.
Why: The plan needed to cover how Jaime is prepared to do the work correctly, how proposals choose the right target artifact, who can approve changes, and how experiments avoid duplicate or overlapping edits.
Impact: V2 now requires a bootstrap upgrade of Jaime's own files and skills, past-trace testing, context-engineering quality gates, explicit keep/revise/revert/inconclusive thresholds, and one active proposal or experiment per target artifact.
Files: `.docs/plans/agent-learning-loops-v2.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 15:33] - [DOCS]

What: Added the revise-trigger bridge to the Agent Learning Loops V2 plan.
Why: The plan needed to explain when experiment measurement should open a linked follow-up proposal instead of simply keeping, reverting, or waiting.
Impact: Revise decisions now require explicit measurement evidence, a parent experiment link, a revision reason, and a new proposed change.
Files: `.docs/plans/agent-learning-loops-v2.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 15:08] - [DOCS]

What: Added a clean V2 Agent Learning Loops plan focused only on Jamie-owned agent files and skills.
Why: The previous planning document mixed Jamie work with platform, Brain, workflow, and product concerns, making the actual agent-improvement system hard to review.
Impact: The V2 plan now defines Jamie's lane, route-out boundaries, observation, ranking, classification, proposal, approval, application, measurement, and rollout phases as one readable scope.
Files: `.docs/plans/agent-learning-loops-v2.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 15:04] - [FEATURE]

What: Added Flow Manage drag-to-Loop support with a typed flow drag payload, draggable Manage cards/rows, and a Loop-chat drop handler that starts an update build session for the dragged flow.
Why: Dropping a flow into Loop should select the flow's Space and give Loop the real update target through `target_automation_id`, not just create a visual chat attachment.
Impact: Flow cards from Manage can be dragged into the Loop chat panel; the drop reuses the stored Loop conversation for that Space when available and starts the same server-owned update path as the existing Loop update menu action.
Files: `apps/web/src/features/flows/lib/flow-chat-drag.ts`, `apps/web/src/features/flows/components/FlowsManageGridView.tsx`, `apps/web/src/features/flows/components/FlowsManageListView.tsx`, `apps/web/src/features/flows/containers/FlowsPage.tsx`, `apps/web/src/features/flows/components/FlowsManagePanel.test.tsx`, `apps/web/src/features/flows/lib/__tests__/flow-chat-drag.test.ts`, `documentation/features/spaces-automation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:58] - [DOCS]

What: Clarified Agent Learning Loops ownership routing and platform issue intake.
Why: Tool schemas, preflight validators, generated action docs, runtime status, and shared error contracts are platform-owned surfaces that Jamie can detect but cannot mutate on behalf of a customer org.
Impact: The plan now separates user/org/agent/platform-owned findings, routes platform-owned issues through local signals, cross-org clustering, engineering/product intake, and platform fix experiments, and prevents platform schema/runtime issues from becoming customer approval cards.
Files: `.docs/plans/agent-learning-loops.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:39] - [FIX]

What: Hide the top scroll-fade on collapsed “Worked N thought(s)” blocks until the list is scrolled and overflowing.
Why: The fade gradient was always painted over the first line in light mode, reading as a muddy top shadow even when nothing was scrolled.
Impact: Short thought blocks no longer show the top band; long scrollable blocks still fade content above the viewport when scrolled.
Files: `apps/web/src/features/studio/components/chat/LockedInGroup.tsx`, `apps/web/src/features/mission-control/components/dialogs/MissionLockedIn.tsx`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:38] - [STYLE]

What: Swapped the task Activity agent-working banner dot for the green glass `VibeyChatOrb` and changed the label to regular muted text.
Why: Match the standard agent-working orb treatment instead of a purple pulse dot.
Impact: The stacked composer banner now shows the green glass orb with neutral “Agent is working on this task…” copy.
Files: `apps/web/src/features/spaces/components/task-detail/TaskActivity.tsx`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:37] - [STYLE]

What: Stacked the task Activity “Agent is working…” banner on the comment composer using the same gray tray + glass input pattern as Flow’s space picker.
Why: The banner should feel connected to the input instead of floating as a separate violet pill above it.
Impact: While an agent runs on a task, the banner sits on a `bg-secondary` tray above the glass `ChannelComposer`; view-only members still see a flat banner when edit is unavailable.
Files: `apps/web/src/features/spaces/components/task-detail/TaskActivity.tsx`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:33] - [DOCS]

What: Added the `karpathy/autoresearch` external-pattern adaptation to the Agent Learning Loops plan.
Why: The plan needed to capture the useful parts of the autonomous research loop without copying its unsafe production assumptions.
Impact: Agent Learning Loops now includes bounded target artifacts, fixed evaluation windows, primary metrics with guardrails, an experiment ledger, and a keep/revert/revise lifecycle for approved Jamie upgrades.
Files: `.docs/plans/agent-learning-loops.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:31] - [DOCS]

What: Added a broad agent capability family drift prioritization report after the Flow and Space Builder drift fixes.
Why: The next use of the capability drift audit skill should focus on families with actual source-surface gaps before scanning families with no obvious broad drift.
Impact: The report identifies Code Projects/Custom DB, docs-only phantom actions, Brain, Campaign/Communication, and task detail actions as the next audit queue, with initial drift rows and acceptance criteria.
Files: `.docs/plans/agent-capability-family-drift-prioritization.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:11] - [FEATURE]

What: Added the Customer Brain identity graph migration and wired Customer Brain writes to upsert `customer_entities` and `customer_source_identities` before inserting memories.
Why: Contactless customer memories need a durable customer unit/source identity model so synthesis can count distinct customer units instead of relying only on `contact_id`.
Impact: New customer memories now carry `customer_entity_id`, `customer_source_identity_id`, and `customer_resolution_status`; existing memories are backfilled by the migration from `contact_id` or source metadata. The migration passed a rollback-only transaction check against the production schema.
Files: `supabase/migrations/20260624110423_customer_brain_identity_graph.sql`, `apps/agent-api/src/modules/artifacts/repositories/artifact-customer-brain.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-customer-brain.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-customer-brain.service.test.ts`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:09] - [FEATURE]

What: Added safe direct Space Builder helpers for appending Space options and creating/updating Space views.
Why: Loop and managed Space-capable agents should not need to replace full options arrays to add a status, tag, category, or custom select option, and flow setup sometimes needs the Space view itself aligned before planning.
Impact: `append_space_field_option`, `create_space_status`, `create_space_category`, `create_space_tag`, `create_space_view`, and `update_space_view` are now schema-backed, registry-backed, policy-visible, MCP-visible, documented in generated `vibey-api`, and covered by the Space Builder drift guard.
Files: `apps/agent-api/src/modules/artifacts/services/artifact-space-schema.service.ts`, `apps/agent-api/src/modules/artifacts/services/__tests__/artifact-space-schema.service.test.ts`, `apps/agent-api/src/modules/artifacts/dtos/artifact-action.dto.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts`, `apps/agent-api/src/modules/artifacts/services/artifacts.service.rbac.test.ts`, `apps/agent-api/src/modules/agent-sync/contracts/agent-instruction-contracts.ts`, `apps/agent-api/src/modules/agent-sync/contracts/agent-instruction-contracts.test.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-sync-action-exposure.tdd.test.ts`, `apps/agent-api/src/modules/agent-sync/services/space-builder-capability-drift.test.ts`, `packages/agent-policy/src/actions.ts`, `packages/agent-policy/src/registry.ts`, `packages/agent-policy/src/action-contracts.ts`, `packages/agent-policy/src/agent-policy.test.ts`, `packages/agent-policy/src/mcp-catalog.ts`, `packages/agent-policy/src/mcp-catalog.test.ts`, `.docs/plans/space-builder-capability-drift-audit.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:02] - [FIX]

What: Made Customer Brain write contracts contact-optional and source-anchored across action schemas, static preflight, Atlas routing, direct customer handlers, legacy brain-job customer writes, generated action docs, and Atlas runtime tool guidance.
Why: Customer Brain represents collective customer intelligence; unknown/anonymous customers should become durable customer memories when they have source identity instead of being blocked by missing `contact_id`.
Impact: `contact_id` remains preferred and validated when present, but customer memories can now persist with durable source anchors such as `source_id`, `source_url`, `conversation_id`, `visitor_id`, `meeting_id`, `telegram_chat_id`, `source_identity`, or `customer_source_identity_id`.
Files: `apps/agent-api/src/modules/artifacts/services/artifact-action-preflight.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-customer-brain.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-customer-brain.service.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-atlas-brain-context.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-team-brain-memory.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.test.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/agent-api/src/modules/agent-sync/services/vibey-api-skill-generator.ts`, `docker/agents/atlas/skills/knowledge-intake/SKILL.md`, `docker/agents/atlas/TOOLS.md`, `docker/agents/templates/brain_scholar/TOOLS.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 13:58] - [FIX]

What: Synced the generated `agent-policy` package output for `propose_company_brain_signal`.
Why: The source policy already exposed the Company Brain proposal action, but package-resolved dist omitted it from actions, registry, contracts, and MCP catalog entries, causing the workflow capability graph to drop one active action.
Impact: Runtime/tests importing `@vibey/agent-policy` now see the same action surface as source, and the workflow capability graph guard passes without weakening the count assertion.
Files: `packages/agent-policy/dist/actions.js`, `packages/agent-policy/dist/actions.d.ts`, `packages/agent-policy/dist/registry.js`, `packages/agent-policy/dist/registry.d.ts`, `packages/agent-policy/dist/action-contracts.js`, `packages/agent-policy/dist/mcp-catalog.js`, `packages/agent-policy/dist/mcp-catalog.d.ts`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 15:35] - [FIX]

What: Fixed sluggish docs and task-list search by debouncing toolbar query updates, using in-memory search state for docs, caching doc search haystacks, and removing leftover debug fetch logging on list rows.
Why: Docs search wrote the view config on every keystroke (triggering save + full re-filter with HTML stripping), and list rows logged/fetched on every render during search.
Impact: Search typing is responsive in Docs and task views; docs filter no longer persists query to the view on each key.
Files: `apps/web/src/features/spaces/views/docs/DocsToolbar.tsx`, `apps/web/src/features/spaces/views/_shared/SpaceQuickFilterDock.tsx`, `apps/web/src/features/spaces/components/DocsView.tsx`, `apps/web/src/features/spaces/components/content/SpaceContentRouter.tsx`, `apps/web/src/features/spaces/containers/SpaceItemsContainer.tsx`, `apps/web/src/features/spaces/lib/apply-space-toolbar-filters.ts`, `apps/web/src/features/spaces/components/ListView.tsx`, `apps/web/src/features/spaces/components/SpaceItemRow.tsx`, `apps/web/src/features/spaces/components/cells/TextCell.tsx`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 13:45] - [DOCS]

What: Added a Customer Brain product architecture drift audit covering contactless memory, identity graph, source ingestion, Atlas skills, synthesis, Cortex Max UX, tests, and production evidence.
Why: The target Customer Brain architecture treats contact as optional metadata and the brain as collective customer consciousness, while current runtime surfaces still make contact identity the practical write and synthesis gate.
Impact: The plan now gives a gap-by-gap long-term UX and engineering path to align Customer Brain with collective, customer/account, avatar, and unlinked-signal workflows.
Files: `.docs/plans/customer-brain-product-architecture-drift-audit.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 13:44] - [FIX]

What: Closed Flow capability schema drift and shared Space Builder exposure drift, with both guardrail tests now expecting zero drift.
Why: Loop and Space-capable agents need the same action/trigger contracts the runtime accepts, including Flow output/completion controls and Space view read actions.
Impact: Flow catalog fields now match published automation DTO schemas in source and package output; `@vibey/api-shared/types/*` subpath imports resolve through package exports; Loop and managed Space policies now include Space view reads; generated API docs describe `list_space_views` and `get_space_view`; audit reports document remaining product-level Space Builder helper gaps separately.
Files: `packages/api-shared/package.json`, `packages/api-shared/src/types/flow-capabilities.ts`, `packages/api-shared/dist/types/flow-capabilities.js`, `packages/api-shared/src/types/workflow-capabilities.test.ts`, `packages/api-shared/dist/types/workflow-capabilities.test.js`, `apps/api/src/modules/spaces/dto/__tests__/space-automation-flow-capability-drift.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/agent-api/src/modules/agent-sync/services/space-builder-capability-drift.test.ts`, `.docs/plans/loop-flow-capability-schema-drift-audit.md`, `.docs/plans/space-builder-capability-drift-audit.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 15:18] - [FIX]

What: Inline add-task composer keeps Cancel/Save and field icons adjacent to the title input instead of pinned to the far right of the row.
Why: The overlap fix used flex-1 on the title area, which pushed actions to the trailing edge of the title column.
Impact: Actions sit right after the typed title (capped width with horizontal scroll for long names); overlap is still prevented.
Files: `apps/web/src/features/spaces/components/SpaceQuickAdd.tsx`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 15:05] - [FEATURE]

What: Docs view toolbar now includes document search and a Campaign docs option inside the Source menu; campaign overlay docs use `_doc_source: campaign`.
Why: Users needed to search docs like other space views and include all campaign docs from the same Source control instead of a separate button.
Impact: Search filters title/notes/description/body via `docs_config.search_query`; selecting Campaign docs in Source loads campaign overlays and filters to them; clear filters restores the full loaded set.
Files: `apps/web/src/features/spaces/types/space-schema.ts`, `apps/web/src/features/spaces/lib/apply-space-toolbar-filters.ts`, `apps/web/src/features/spaces/hooks/use-space-campaign-docs.ts`, `apps/web/src/features/spaces/hooks/use-space-active-view.ts`, `apps/web/src/features/spaces/components/DocsView.tsx`, `apps/web/src/features/spaces/views/docs/DocsToolbar.tsx`, `apps/web/src/features/spaces/components/customize/views/default/DefaultViews.tsx`, `apps/web/src/features/spaces/containers/SpaceItemsContainer.tsx`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:40] - [FIX]

What: Fixed inline task composer layout so long task names shrink inside the title column instead of overlapping field icons and Cancel/Save.
Why: SpaceQuickAdd grew the title input by character width with shrink-0, so typed text rendered on top of the action buttons.
Impact: New-task row composer keeps icons and Save/Cancel pinned on the right while the title input scrolls within remaining space.
Files: `apps/web/src/features/spaces/components/SpaceQuickAdd.tsx`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:22] - [STYLE]

What: Moved the task "Agent is working on this task..." banner from the left deliverables column into the Activity panel, directly above the comment composer.
Why: Running-agent status belongs with activity and the input, not below deliverables on the task body.
Impact: Users see agent-in-progress feedback in the right Activity column above where they comment.
Files: `apps/web/src/features/spaces/components/task-detail/TaskDetailModal.tsx`, `apps/web/src/features/spaces/components/task-detail/TaskActivity.tsx`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:15] - [FIX]

What: Task detail Cursor panel now renders only when Cursor automation metadata exists on the task.
Why: Any running agent automation set `task_execution_status: running`, which incorrectly showed a Cursor status box for Send to Agent flows.
Impact: Send to Agent and other non-Cursor automations no longer display a misleading Cursor / Status: Running section; Cursor panel still appears for real Send to Cursor runs.
Files: `apps/web/src/features/spaces/components/task-detail/TaskDetailModal.tsx`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 13:27] - [DOCS]

What: Added the repo-local `capability-drift-audit` Codex skill for reusable agent capability surface drift audits.
Why: Flow and Space Builder drift checks revealed a repeatable pattern that should be reusable across Brain, media, content, contacts, tasks, integrations, skill-management, and campaign action families.
Impact: Future audits can use one skill to compare executable schemas, registries, policies, MCP catalogs, generated `vibey-api` docs, protocol references, runtime artifacts, and DB-backed skill rows, then create known-gap tests and Markdown reports.
Files: `.agents/skills/capability-drift-audit/SKILL.md`, `.agents/skills/capability-drift-audit/references/vibey-capability-surfaces.md`, `.agents/skills/capability-drift-audit/agents/openai.yaml`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 13:18] - [DOCS]

What: Added a shared Space Builder capability drift audit and guardrail test for Space schema mutation exposure.
Why: Loop should be able to align statuses, categories, tags, and fields before building flows, but that needs to be verified against shared agent policy/runtime surfaces rather than assumed from Loop-specific wording.
Impact: The audit confirms `get_space`, `create_space_field`, and `update_space_field` are exposed to Loop and managed Space-capable agents, while view-read policy/docs drift and direct Space-object action gaps are now documented.
Files: `apps/agent-api/src/modules/agent-sync/services/space-builder-capability-drift.test.ts`, `.docs/plans/space-builder-capability-drift-audit.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 13:07] - [DOCS]

What: Added a Loop Flow capability schema drift audit and a focused known-gap baseline test comparing the shared Flow catalog to published automation DTO schemas.
Why: Loop's flow-building instructions can drift from the backend contract, causing missing output/completion controls, weak trigger filters, or misleading build quality even when a flow compiles.
Impact: The current 46 action/trigger drift rows are documented with fix priority, and future schema/catalog changes have a deterministic guardrail instead of relying on Loop's self-score.
Files: `apps/api/src/modules/spaces/dto/__tests__/space-automation-flow-capability-drift.test.ts`, `.docs/plans/loop-flow-capability-schema-drift-audit.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 13:04] - [FIX]

What: Standardized Customer Brain belief evidence promotion so `stated` beliefs are reinforced/promoted to `revealed` or `behavioral` instead of duplicated as new rows.
Why: Atlas could previously emit the same concept once as `stated` and again as `revealed` because `belief_updates` had no `evidence_type` field and the worker inserted duplicate new-belief drafts.
Impact: Atlas's DB-backed skill now instructs evidence-tier promotion through `belief_updates`; the worker parses and persists the stronger tier, converts exact duplicate new-belief drafts into reinforcements, and the HC weaker draft rows in production are resolved/historical while the revealed rows stay current.
Files: `apps/mission-worker/src/modules/brain-ops/brain-ops.processor.ts`, `apps/mission-worker/src/modules/brain-ops/brain-ops.customer-pattern-analysis.test.ts`, `docker/agents/atlas/skills/customer-brain-pattern-analysis/SKILL.md`, `supabase/migrations/20260624100158_customer_belief_evidence_promotion.sql`, `.docs/plans/customer-brain.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 12:48] - [DOCS]

What: Replaced the generic Brain Inputs & Outputs page with practical Customer Brain and Company Cortex source maps.
Why: The architecture visual needed concrete input boxes, central brain storage, and concrete output/use boxes so missing source rows and reuse opportunities are visible at a glance.
Impact: The local HTML now starts with two infographic pages that map Website widget, Telegram, Fathom, Fireflies, Slack, manual notes/links, daily dreams, org activity, signals, formation, tools, and runtime outputs.
Files: `public/vibey-platform-architecture.html`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 12:44] - [FIX]

What: Fixed Vibey MCP OAuth introspection to mint an isolated server-side Supabase session instead of rotating the user's browser refresh token; fixed MCP string-array schemas to include item types.
Why: Cursor authenticated and cached Vibey tools, then failed with `401 after successful authentication` because MCP introspection reused the web app refresh token and Supabase later revoked that refresh-token chain.
Impact: Vibey MCP catalog/resource requests no longer depend on a browser-session refresh token, tool introspection receives a separate user access token, and strict MCP clients no longer see array schemas without `items`.
Files: `apps/api/src/modules/mcp/services/mcp-oauth.service.ts`, `apps/api/src/modules/mcp/controllers/mcp-oauth.controller.ts`, `apps/api/src/modules/mcp/repositories/mcp-oauth.repository.ts`, `apps/api/src/modules/mcp/mcp-oauth.service.test.ts`, `apps/agent-api/src/modules/vibey-mcp/services/vibey-mcp-tool-catalog.service.ts`, `apps/agent-api/src/modules/vibey-mcp/services/vibey-mcp-tool-catalog.service.test.ts`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 15:00] - [FIX]

What: Completed Cortex Max light-mode theming for modal shell, library panels, and onboarding banner previews.
Why: Hardcoded near-black modal background and dark-only banner text/borders left the entire Cortex Max surface black in light mode.
Impact: Modal, sidebar, detail panels, and animated banner previews now use theme tokens (`surface-bg`, `card-glass-panel`, `text-foreground`, `border-border`, `compare-hero-brain-grid`).
Files: `apps/web/src/features/brain/components/CortexMaxModal.tsx`, `apps/web/src/features/brain/components/CortexMaxBrainView.tsx`, `apps/web/src/features/brain/components/CortexMaxDetailPanel.tsx`, `apps/web/src/features/brain/components/cortex-max-banners/*.tsx`, `apps/web/src/app/globals.css`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:30] - [FIX]

What: Fixed Cortex Max modal and library UI to respect light mode theme tokens instead of hardcoded near-black backgrounds.
Why: The Cortex Max dialog used `bg-[#050508]` and dark-only borders/text, so the entire Brain Cortex Max surface stayed black in light mode.
Impact: Modal shell, sidebar, detail panels, and empty states now follow `surface-bg` / `border-border` / `text-foreground`; onboarding banner previews keep an intentional dark demo canvas via `cortex-max-banner-canvas`.
Files: `apps/web/src/features/brain/components/CortexMaxModal.tsx`, `apps/web/src/features/brain/components/CortexMaxBrainView.tsx`, `apps/web/src/features/brain/components/CortexMaxDetailPanel.tsx`, `apps/web/src/app/globals.css`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 12:15] - [FIX]

What: Moved HC Medical Center belief patterns and perspective out of PT DOM Customer Brain into Vibey org Customer Brain (production DB).
Why: Atlas synthesis artifacts for HC Medical were misrouted to Brian Mark's PT DOM customer brain instead of the Vibey organization customer brain where the source insight memories already live.
Impact: PT DOM Customer Brain now holds only PT DOM VIP client insights (Aliaa, Zac, Abram). Vibey Customer Brain owns all 6 HC belief-pattern rows plus "The Gatekeeper Organization" perspective.
Files: `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 11:33] - [DOCS]

What: Added a Brain Inputs & Outputs page above the platform architecture infographic.
Why: The architecture visual needed a deeper first slice showing Brain families, real input sources, shared processing layers, runtime outputs, and the campaign/Space context boundary.
Impact: The local browser visual now starts with a Brain-specific map before the meta platform view, making it easier to reason about how Brain data enters and leaves the system.
Files: `public/vibey-platform-architecture.html`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 11:14] - [DOCS]

What: Added short plain-English descriptions to the Control Layer and Execution boxes in the platform architecture infographic.
Why: The infographic needed to explain what grouped terms like RBAC, action domains, tool schemas, Agent API, OpenClaw, MCPs, and artifacts mean at a glance.
Impact: The standalone HTML visual is easier to understand without separate documentation.
Files: `public/vibey-platform-architecture.html`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 11:06] - [DOCS]

What: Added a standalone browser infographic for the Vibey platform architecture.
Why: The platform needed a one-look visual explaining how Spaces, Brain, Agents, Flows, control layers, runtime, and infrastructure fit together.
Impact: The architecture can now be reviewed as a local HTML artifact without running the app.
Files: `public/vibey-platform-architecture.html`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 11:07] - [DOCS]

What: Reframed the Suggestion and Improvement Layer plan from an implementation backlog into a city-road maturity map.
Why: The previous version tracked actions but did not show the cross-building roads between Brain, Agents, Flows, Spaces, and the proactive recommendation layer.
Impact: The document now explains buildings, road maturity, current traffic, missing roadwork, and example proactive loops such as onboarding reports, skill recommendations, and media workflow automation.
Files: `.docs/plans/suggestion-improvement-layer.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 08:34] - [DOCS]

What: Added the central Suggestion and Improvement Layer plan.
Why: Recommendation work was spread across Company Cortex dreams, skill recommendations, mission evaluation, Home nudges, Flow candidates, and brain suggestion surfaces without one execution tracker.
Impact: Product and engineering now have one source of truth for the current inventory, target pipeline, backlog priorities, and Development space mirror rules.
Files: `.docs/plans/suggestion-improvement-layer.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 00:15] - [ARCH]

What: Split Team detail and moved its data contracts to shared lib boundaries.
Why: `TeamDetailView.tsx` was 1,340 LOC and directly imported Agent Teams, Mission Control, Org, Spaces, and Studio feature-owned services/types.
Impact: The Team detail parent is now 239 LOC, service/data orchestration lives in focused local hooks, add-member/sidebar/dialog UI lives in focused local components, mission list reads use shared `@/lib/missions`, Spaces list reads use the new `@/lib/spaces` barrel, and mounted coverage locks data loading, add-member portal behavior, tab routing, and render stability.
Files: `apps/web/src/features/team-2/components/teams/TeamDetailView.tsx`, `apps/web/src/features/team-2/components/teams/TeamDetailView.test.tsx`, `apps/web/src/features/team-2/components/teams/TeamDetailHeader.tsx`, `apps/web/src/features/team-2/components/teams/TeamDetailMembersSidebar.tsx`, `apps/web/src/features/team-2/components/teams/TeamDetailRemoveDialog.tsx`, `apps/web/src/features/team-2/components/teams/TeamDetailAddPanels.tsx`, `apps/web/src/features/team-2/components/teams/use-team-detail-add-panels.ts`, `apps/web/src/features/team-2/components/teams/use-team-detail-data.ts`, `apps/web/src/features/team-2/components/teams/team-detail-grants.ts`, `apps/web/src/features/team-2/components/teams/team-detail-member-types.ts`, `apps/web/src/lib/missions/missions-api.ts`, `apps/web/src/lib/missions/missions-api.test.ts`, `apps/web/src/lib/spaces/index.ts`, `apps/web/src/features/mission-control/services/missions.service.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `documentation/frontend-shared-surfaces.md`

## [2026-06-24 00:29] - [ARCH]

What: Split Team index rendering and moved agent/team roster dependencies to shared frontend boundaries.
Why: `TeamsIndexView.tsx` was 440 LOC and directly imported Agent Teams and Mission Control feature paths; its avatar stack also imported Settings UI for generic agent avatars.
Impact: The Team index parent is now 294 LOC, team card/list/header rendering lives in `TeamsIndexItems.tsx`, mission-agent roster caching is exposed from `@/lib/agents`, generic agent avatars are exposed from `@/components/agents`, and mounted coverage locks embedded selection, creation, avatar overflow, and render stability.
Files: `apps/web/src/features/team-2/components/teams/TeamsIndexView.tsx`, `apps/web/src/features/team-2/components/teams/TeamsIndexItems.tsx`, `apps/web/src/features/team-2/components/teams/TeamsIndexView.test.tsx`, `apps/web/src/features/team-2/components/teams/TeamAgentAvatarStack.tsx`, `apps/web/src/features/team-2/components/teams/teams-index.utils.ts`, `apps/web/src/components/agents/AgentAvatar.tsx`, `apps/web/src/components/agents/AgentRoleEmblem.tsx`, `apps/web/src/components/agents/index.ts`, `apps/web/src/lib/agents/use-mission-agents.ts`, `apps/web/src/lib/agents/index.ts`, `apps/web/src/features/mission-control/hooks/use-cached-agents.ts`, `apps/web/src/features/settings/components/settings-content/skills-page/skill-menu/skill-agent-avatar.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `documentation/frontend-shared-surfaces.md`

## [2026-06-24 00:40] - [ARCH]

What: Moved remaining touched old mission-agent cache and sidebar agent-team consumers to the shared agents boundary.
Why: Sidebar, contact-thread, and Team hook files still imported the Mission Control cached-agent compatibility path or Agent Teams hook/type paths after the shared `@/lib/agents` boundary was created.
Impact: The old cached-agent hook path has no remaining app source consumers, the touched sidebar/team slice no longer depends on old Agent Teams hook/type paths, and mounted coverage now locks contact conversation thread loading, avatar fallback, back navigation, and render stability.
Files: `apps/web/src/components/layout/sidebar/SidebarTeam2Flyout.tsx`, `apps/web/src/components/layout/sidebar/useSidebarTeam2Bootstrap.ts`, `apps/web/src/components/layout/sidebar/SidebarTeamRow.tsx`, `apps/web/src/components/layout/sidebar/SidebarAgentDmRow.tsx`, `apps/web/src/features/spaces/components/contacts/ContactConversationThread.tsx`, `apps/web/src/features/spaces/components/contacts/ContactConversationThread.test.tsx`, `apps/web/src/features/team/hooks/useAgentMenuActions.ts`, `apps/web/src/features/team/hooks/useTeamContainerData.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-24 00:59] - [ARCH]

What: Moved remaining old Agent Teams access/team consumers to the shared agents boundary and split the touched access panel below the frontend component cap.
Why: `AgentInfoAccessTab.tsx`, Team-2 files, Studio inline access, and Team menu actions still imported old Agent Teams hook/service/type paths after shared `@/lib/agents` contracts existed; `AgentInfoAccessTab.tsx` was also 701 LOC.
Impact: Old Agent Teams hook/service/type imports are clean in `apps/web/src`, `AgentInfoAccessTab.tsx` is now 386 LOC with local focused collaborators, and mounted coverage locks policy loading, team reassignment, override saving, and render stability.
Files: `apps/web/src/features/team/components/chat/agent-info-panel/AgentInfoAccessTab.tsx`, `apps/web/src/features/team/components/chat/agent-info-panel/AgentInfoAccessTab.test.tsx`, `apps/web/src/features/team/components/chat/agent-info-panel/AgentInfoAccessTeamSelect.tsx`, `apps/web/src/features/team/components/chat/agent-info-panel/AgentInfoIntegrationsAccessSection.tsx`, `apps/web/src/features/team/components/chat/agent-info-panel/AgentInfoAccessSectionHeader.tsx`, `apps/web/src/features/team/components/chat/agent-info-panel/agent-info-access.logic.ts`, `apps/web/src/features/team/components/chat/agent-info-panel/agent-info-access.types.ts`, `apps/web/src/features/team/hooks/useAgentMenuActions.ts`, `apps/web/src/features/studio/components/chat/InlineAgentAccessRequest.tsx`, `apps/web/src/features/team-2/containers/Team2Container.tsx`, `apps/web/src/features/team-2/components/AgentsGrid.tsx`, `apps/web/src/features/team-2/components/nav/TeamBreadcrumbTeamDropdown.tsx`, `apps/web/src/features/team-2/components/nav/TeamManageBreadcrumbHeader.tsx`, `apps/web/src/features/team-2/components/nav/Team2ManageShell.tsx`, `apps/web/src/features/team-2/components/teams/TeamDetailView.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-24 01:42] - [ARCH]

What: Split the Team-2 container/grid batch below frontend LOC caps and moved the composer model picker to shared chat boundaries.
Why: `Team2Container.tsx` and `AgentsGrid.tsx` were still over their frontend limits, and Team-2/Team communication consumers imported Studio-owned model-picker components and helpers directly.
Impact: `Team2Container.tsx` is now 585 LOC, `AgentsGrid.tsx` is 306 LOC, model-picker UI lives under `@/components/chat/model-picker`, picker helpers live under `@/lib/chat`, old Studio helper paths remain compatibility re-exports, and shared agent channel/fire-handoff contracts live under `@/lib/agents`.
Files: `apps/web/src/features/team-2/containers/Team2Container.tsx`, `apps/web/src/features/team-2/components/AgentsGrid.tsx`, `apps/web/src/features/team-2/components/AgentGridCard.tsx`, `apps/web/src/features/team-2/components/AgentListModelPicker.tsx`, `apps/web/src/features/team-2/components/AgentsListView.tsx`, `apps/web/src/features/team-2/components/Team2ManageContent.tsx`, `apps/web/src/features/team-2/components/Team2ContainerModals.tsx`, `apps/web/src/features/team-2/components/team2-manage-content.types.ts`, `apps/web/src/components/chat/model-picker/ComposerModelPicker.tsx`, `apps/web/src/components/chat/model-picker/ComposerSubscriptionModelsSubmenu.tsx`, `apps/web/src/components/chat/model-picker/composer-model-picker-dropdown.tsx`, `apps/web/src/components/chat/model-picker/composer-model-picker-panels.tsx`, `apps/web/src/components/chat/model-picker/composer-model-picker.types.ts`, `apps/web/src/components/chat/model-picker/use-composer-model-picker-positioning.ts`, `apps/web/src/components/chat/model-picker/index.ts`, `apps/web/src/lib/chat/composer-model-picker.ts`, `apps/web/src/lib/chat/subscription-model-options.ts`, `apps/web/src/lib/chat/model-picker-edit-panel-position.ts`, `apps/web/src/lib/agents/agent-channels.ts`, `apps/web/src/lib/agents/agent-fire-handoff.ts`, `apps/web/src/features/team/containers/TeamCommunicationTab.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-24 01:50] - [ARCH]

What: Moved Team-2 detail/collapsed-rail agent info tab metadata to the shared agents boundary.
Why: `Team2DetailView.tsx` and `Team2AgentInfoCollapsedRail.tsx` still imported Mission Control and Team feature-owned tab/type paths directly.
Impact: Shared tab metadata/icons now live under `@/lib/agents`, old Team tab files are compatibility re-exports, Team-2 detail/rail imports are clean for direct feature paths, and mounted coverage locks collapsed rail tab display, selection, fallback avatar rendering, and render stability.
Files: `apps/web/src/features/team-2/components/Team2DetailView.tsx`, `apps/web/src/features/team-2/components/Team2AgentInfoCollapsedRail.tsx`, `apps/web/src/features/team-2/components/Team2AgentInfoCollapsedRail.test.tsx`, `apps/web/src/features/team/lib/agent-info-panel-tabs.ts`, `apps/web/src/features/team/lib/agent-info-panel-tab-meta.tsx`, `apps/web/src/lib/agents/agent-info-panel-tab-meta.tsx`, `apps/web/src/lib/agents/index.ts`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-24 01:59] - [ARCH]

What: Moved the Team overview chat modal to shared chat runtime adapter paths.
Why: `TeamOverviewChatModal.tsx` still imported Studio-owned `MessageBubble`, `fetchMessages`, and `Message` paths directly.
Impact: The modal now uses `@/components/chat/MessageBubbleAdapter` and `@/lib/chat/studio-chat-runtime-adapter`, preserving existing chat runtime behavior behind the transitional shared boundary; mounted coverage locks loading, message filtering, message props, close behavior, and render stability.
Files: `apps/web/src/features/team-2/components/teams/TeamOverviewChatModal.tsx`, `apps/web/src/features/team-2/components/teams/TeamOverviewChatModal.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 02:07] - [ARCH]

What: Moved Human DM attachment URL classification to the shared chat lib boundary.
Why: `HumanDMMessageBubble.tsx` imported Studio-owned attachment preview helpers and preview UI directly.
Impact: Human DM message rendering now reads attachment URL classification from `@/lib/chat` and preview UI through the transitional shared chat adapter, while the old Studio helper path remains a compatibility re-export. Mounted coverage locks attachment rendering, edit/save, delete, and render stability.
Files: `apps/web/src/features/team-2/components/HumanDMMessageBubble.tsx`, `apps/web/src/features/team-2/components/HumanDMMessageBubble.test.tsx`, `apps/web/src/lib/chat/chat-attachment-preview.ts`, `apps/web/src/lib/chat/index.ts`, `apps/web/src/components/chat/ChatAttachmentPreviewsAdapter.tsx`, `apps/web/src/features/studio/components/chat/chat-attachment-preview.utils.ts`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 02:14] - [ARCH]

What: Moved the Human DM composer to shared chat/upload imports.
Why: `HumanDMComposer.tsx` still imported Composer and Studio-owned pasted-text, file attachment, chat upload config, and clipboard helper paths directly.
Impact: The composer now uses shared chat file attachment UI, shared chat upload config, shared media clipboard helpers, and a transitional pasted-text adapter. Mounted coverage locks typed sends, large-paste merged payloads, uploaded attachment URLs, and render stability.
Files: `apps/web/src/features/team-2/components/HumanDMComposer.tsx`, `apps/web/src/features/team-2/components/HumanDMComposer.test.tsx`, `apps/web/src/components/chat/PastedTextComposerAdapter.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 02:23] - [ARCH]

What: Moved the Team-2 conversation scope picker to shared campaign, org, space, conversation, home-cache, and floating-menu boundaries.
Why: `ConversationScopePicker.tsx` was 421 LOC and imported Home, Org, Spaces, Studio campaign/chat, and Studio floating-menu feature paths directly.
Impact: The picker is now exactly 400 LOC, shared campaign cache and floating-menu helpers live under `@/lib/home` and `@/lib/ui`, conversation space assignment lives in `@/lib/conversations`, and mounted coverage locks campaign/space selection plus render stability.
Files: `apps/web/src/features/team-2/components/ConversationScopePicker.tsx`, `apps/web/src/features/team-2/components/ConversationScopePicker.test.tsx`, `apps/web/src/features/team-2/components/conversation-scope-picker-layout.ts`, `apps/web/src/lib/home/home-feed-campaign-cache.ts`, `apps/web/src/lib/home/index.ts`, `apps/web/src/features/home/lib/home-feed-campaign-cache.ts`, `apps/web/src/lib/ui/floating-menu-anchor.ts`, `apps/web/src/lib/ui/index.ts`, `apps/web/src/features/studio/utils/floating-menu-anchor.ts`, `apps/web/src/lib/conversations/conversations-api.ts`, `apps/web/src/lib/conversations/conversations-api.test.ts`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 02:33] - [ARCH]

What: Split Team overview hook realtime reducers out of the hook and moved Org store access to the shared boundary.
Why: `use-team-overview.ts` was 379 LOC, above the frontend hook target, and imported the Org feature store directly.
Impact: The hook is now 127 LOC and owns fetch/subscription orchestration only; realtime row mapping and delta reducers live in a 273 LOC helper, the direct Org feature import is gone, and mounted coverage locks fetch, realtime mission/agent updates, subscription cleanup, and render stability.
Files: `apps/web/src/features/team-2/hooks/use-team-overview.ts`, `apps/web/src/features/team-2/hooks/use-team-overview-realtime.ts`, `apps/web/src/features/team-2/hooks/use-team-overview.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 02:38] - [ARCH]

What: Moved Team-2 container agent profile mutations and account-context access to shared boundaries.
Why: `Team2Container.tsx` still imported Mission Control agent mutation helpers and the Org account gate store directly.
Impact: Agent rename, active-state, and communication updates now live under `@/lib/agents` with the old Mission Control service path kept as compatibility re-exports; `Team2Container.tsx` uses shared `@/lib/org`, and the touched arbitrary border class now uses `border-border`.
Files: `apps/web/src/features/team-2/containers/Team2Container.tsx`, `apps/web/src/features/team-2/containers/Team2Container.test.tsx`, `apps/web/src/lib/agents/mission-agents-api.ts`, `apps/web/src/features/mission-control/services/missions.service.ts`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 02:50] - [ARCH]

What: Moved Team-2 container derived stats to the shared agents boundary.
Why: `Team2Container.tsx` still imported the pure derived stats hook from the old Team feature path.
Impact: The derived stats hook now lives under `@/lib/agents`, the old Team hook path is a compatibility re-export, mounted hook/container coverage locks current counts and render stability, score color class names use existing status utilities, and the container is down to three remaining old Team hook imports.
Files: `apps/web/src/features/team/hooks/useTeamContainerDerived.ts`, `apps/web/src/features/team/hooks/useTeamContainerDerived.test.tsx`, `apps/web/src/lib/agents/use-team-container-derived.ts`, `apps/web/src/lib/agents/index.ts`, `apps/web/src/features/team-2/containers/Team2Container.tsx`, `apps/web/src/features/team-2/containers/Team2Container.test.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 03:06] - [ARCH]

What: Moved Team-2 container command handlers to focused shared agent hook helpers.
Why: `Team2Container.tsx` still imported the old Team feature command handler hook, and that hook bundled communication, billing, avatar, campaign assignment, fire, and navigation callbacks in one oversized file.
Impact: The public handlers hook now composes focused `@/lib/agents` helpers, campaign assignment APIs live under `@/lib/campaigns`, agent image/fire mutations live under `@/lib/agents`, old feature service paths remain compatibility exports, mounted hook/container coverage locks current behavior, and `Team2Container.tsx` is down to two remaining old Team hook imports.
Files: `apps/web/src/features/team/hooks/useTeamContainerHandlers.ts`, `apps/web/src/features/team/hooks/useTeamContainerHandlers.test.tsx`, `apps/web/src/lib/agents/use-team-container-handlers.ts`, `apps/web/src/lib/agents/use-team-container-communication-handlers.ts`, `apps/web/src/lib/agents/use-team-container-profile-handlers.ts`, `apps/web/src/lib/agents/use-team-container-campaign-handlers.ts`, `apps/web/src/lib/agents/use-team-container-navigation-handlers.ts`, `apps/web/src/lib/agents/team-container-handlers.types.ts`, `apps/web/src/lib/agents/agent-portrait-prompt.ts`, `apps/web/src/lib/agents/report-agent-error.ts`, `apps/web/src/lib/agents/mission-agents-api.ts`, `apps/web/src/lib/agents/mission-agents-api.test.ts`, `apps/web/src/lib/agents/index.ts`, `apps/web/src/lib/campaigns/campaign-api.ts`, `apps/web/src/lib/campaigns/campaign-api.test.ts`, `apps/web/src/features/studio/services/campaign.service.ts`, `apps/web/src/features/mission-control/services/missions.service.ts`, `apps/web/src/features/team/lib/report-team-error.ts`, `apps/web/src/features/team-2/containers/Team2Container.tsx`, `apps/web/src/features/team-2/containers/Team2Container.test.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-24 03:19] - [ARCH]

What: Moved Team-2 agent menu actions and favorite state to shared agent/brain boundaries.
Why: `Team2Container.tsx`, sidebar Team flyout rows, and Skills settings still imported the old Team `useAgentMenuActions` path, and the hook mixed agent menu behavior with Brain events, billing brain-status checks, campaign loading, favorites, and team movement.
Impact: `useAgentMenuActions` and `useAgentUserState` now live under `@/lib/agents`, Brain modal event contracts live under `@/lib/brain`, old Team/Mission-Control/Brain paths remain compatibility exports, mounted hook/container coverage locks current behavior, and `Team2Container.tsx` has one remaining old Team hook import: `useTeamContainerData`.
Files: `apps/web/src/lib/agents/use-agent-menu-actions.ts`, `apps/web/src/lib/agents/use-agent-user-state.ts`, `apps/web/src/lib/agents/mission-agents-api.ts`, `apps/web/src/lib/agents/mission-agents-api.test.ts`, `apps/web/src/lib/agents/index.ts`, `apps/web/src/lib/brain/brain-agent-modal-events.ts`, `apps/web/src/lib/brain/index.ts`, `apps/web/src/features/team/hooks/useAgentMenuActions.ts`, `apps/web/src/features/team/hooks/useAgentMenuActions.test.tsx`, `apps/web/src/features/team/hooks/use-agent-user-state.ts`, `apps/web/src/features/brain/lib/brain-agent-modal.events.ts`, `apps/web/src/features/mission-control/services/missions.service.ts`, `apps/web/src/features/team-2/containers/Team2Container.tsx`, `apps/web/src/features/team-2/containers/Team2Container.test.tsx`, `apps/web/src/components/layout/sidebar/SidebarTeam2Flyout.tsx`, `apps/web/src/components/layout/sidebar/SidebarAgentDmRow.tsx`, `apps/web/src/features/settings/components/settings-content/SkillsPageContent.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-24 03:47] - [ARCH]

What: Split Team container data loading into focused shared agent hooks and removed the last old Team hook import from `Team2Container`.
Why: `useTeamContainerData.ts` was 871 LOC and mixed roster loading, route effects, campaigns, brain/skills, channel/model state, dropdown positioning, fire handoff, realtime subscriptions, and onboarding side effects; `Team2Container.tsx` still depended on that old Team feature hook path.
Impact: The old Team hook path is now a 1 LOC compatibility export, the shared aggregator is 176 LOC, focused shared helpers stay below hook/utility caps, `Team2Container.tsx` imports all Team container seams from `@/lib/agents`, and mounted data/container tests lock render stability before and after the move.
Files: `apps/web/src/features/team/hooks/useTeamContainerData.ts`, `apps/web/src/features/team/hooks/useTeamContainerData.test.tsx`, `apps/web/src/lib/agents/use-team-container-data.ts`, `apps/web/src/lib/agents/use-team-container-roster.ts`, `apps/web/src/lib/agents/use-team-container-campaign-data.ts`, `apps/web/src/lib/agents/use-team-container-brain-skills-data.ts`, `apps/web/src/lib/agents/use-team-container-communication-data.ts`, `apps/web/src/lib/agents/use-team-container-fire-data.ts`, `apps/web/src/lib/agents/use-team-container-route-effects.ts`, `apps/web/src/lib/agents/agent-channels-api.ts`, `apps/web/src/lib/brain/brain-api.ts`, `apps/web/src/lib/ui/dropdown-positioning.ts`, `apps/web/src/lib/agents/index.ts`, `apps/web/src/features/team-2/containers/Team2Container.tsx`, `apps/web/src/features/team-2/containers/Team2Container.test.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-24 04:05] - [ARCH]

What: Split the Team communication tab into focused private section components.
Why: `TeamCommunicationTab.tsx` was 1,284 LOC after the shared model-picker redirect and needed mounted coverage before decomposition.
Impact: The tab is now a 116 LOC facade over model/voice, style, channel, digest, and public-page section files, all below frontend caps; mounted coverage locks section rendering, style preset persistence, daily-summary patching, and render stability.
Files: `apps/web/src/features/team/containers/TeamCommunicationTab.tsx`, `apps/web/src/features/team/containers/TeamCommunicationTab.test.tsx`, `apps/web/src/features/team/containers/team-communication-tab/CommsSectionHeader.tsx`, `apps/web/src/features/team/containers/team-communication-tab/PublicPageSection.tsx`, `apps/web/src/features/team/containers/team-communication-tab/TeamCommunicationChannelRows.tsx`, `apps/web/src/features/team/containers/team-communication-tab/TeamCommunicationChannelsSection.tsx`, `apps/web/src/features/team/containers/team-communication-tab/TeamCommunicationDigestSection.tsx`, `apps/web/src/features/team/containers/team-communication-tab/TeamCommunicationModelVoiceSection.tsx`, `apps/web/src/features/team/containers/team-communication-tab/TeamCommunicationStyleSection.tsx`, `apps/web/src/features/team/containers/team-communication-tab/team-communication-tab.constants.ts`, `apps/web/src/features/team/containers/team-communication-tab/team-communication-tab.types.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 04:23] - [ARCH]

What: Moved `AgentChatPanel` off direct feature imports through shared chat, agent, org, campaign, and layout boundaries.
Why: `AgentChatPanel.tsx` was the largest current web component and still imported Mission Control, Team, Org, and Studio internals directly.
Impact: Mounted coverage now locks current conversation loading, message rendering, composer/status wiring, and render stability; the panel/test have zero direct `@/features/*` imports, while Studio-specific runtime dependencies are isolated in explicit transitional adapters.
Files: `apps/web/src/features/team/components/AgentChatPanel.tsx`, `apps/web/src/features/team/components/AgentChatPanel.test.tsx`, `apps/web/src/lib/chat/studio-chat-runtime-adapter.ts`, `apps/web/src/lib/chat/campaign-mode-adapter.ts`, `apps/web/src/components/chat/CampaignPreviewPanelAdapter.tsx`, `apps/web/src/lib/agents/mission-agents-api.ts`, `apps/web/src/features/mission-control/services/missions.service.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 04:33] - [ARCH]

What: Extracted the first private logic slice from `AgentChatPanel`.
Why: `AgentChatPanel.tsx` remained a 2,819 LOC god-file after the shared-boundary import cleanup and needed behavior-locked LOC decomposition.
Impact: Storage helpers, constants, pending-send dedupe sets, timeout handling, conversation ownership checks, space-id reading, and chat turn grouping now live in a 135 LOC private helper with focused coverage; the mounted panel test still locks render stability and the parent dropped to 2,718 LOC.
Files: `apps/web/src/features/team/components/AgentChatPanel.tsx`, `apps/web/src/features/team/components/agent-chat-panel/agent-chat-panel.logic.ts`, `apps/web/src/features/team/components/agent-chat-panel/agent-chat-panel.logic.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 04:38] - [ARCH]

What: Extracted the `AgentChatPanel` message thread and composer render shell.
Why: The panel remained far above the frontend component limit after the first private logic split.
Impact: Message scrolling, turn rendering, voice delegation task display, credit banners, stream interruption, queue controls, active-run tip, scroll-to-bottom control, and composer shell now live in a 306 LOC private render component; moved semantic colors use token utilities, the remaining scroll-control utility gap is logged, and the parent is down to 2,531 LOC.
Files: `apps/web/src/features/team/components/AgentChatPanel.tsx`, `apps/web/src/features/team/components/agent-chat-panel/AgentChatThread.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 04:46] - [ARCH]

What: Extracted initial-load session and campaign decision helpers from `AgentChatPanel`.
Why: The panel still owned low-level requested-session, campaign-scope, cached-conversation, persisted-session clearing, and target-session selection logic inline.
Impact: Those decisions now live in the private helper with focused coverage for desktop/mobile and cached-session cases; mounted panel coverage still passes and the parent is down to 2,514 LOC.
Files: `apps/web/src/features/team/components/AgentChatPanel.tsx`, `apps/web/src/features/team/components/agent-chat-panel/agent-chat-panel.logic.ts`, `apps/web/src/features/team/components/agent-chat-panel/agent-chat-panel.logic.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 04:54] - [ARCH]

What: Extracted campaign/session selection helpers from `AgentChatPanel`.
Why: The panel still owned active-campaign fallback, mobile campaign option building, and latest session lookup by campaign inline.
Impact: Those decisions now live in the private helper with focused coverage for General fallback, API-null campaign names, and latest-session ordering; mounted panel coverage still passes and the parent is down to 2,497 LOC.
Files: `apps/web/src/features/team/components/AgentChatPanel.tsx`, `apps/web/src/features/team/components/agent-chat-panel/agent-chat-panel.logic.ts`, `apps/web/src/features/team/components/agent-chat-panel/agent-chat-panel.logic.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 05:04] - [ARCH]

What: Extracted selected-session message hydration from `AgentChatPanel`.
Why: The panel still owned session hydration fetch/merge/recovery branches inline, keeping the god-file large and harder to verify.
Impact: Session hydration now lives in a private 85 LOC helper with focused coverage for empty loads, cached merges, stale-token races, and stream-active guards; mounted panel coverage still passes and the parent is down to 2,480 LOC.
Files: `apps/web/src/features/team/components/AgentChatPanel.tsx`, `apps/web/src/features/team/components/agent-chat-panel/agent-chat-panel.session-selection.ts`, `apps/web/src/features/team/components/agent-chat-panel/agent-chat-panel.session-selection.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 05:11] - [ARCH]

What: Extracted the mobile campaign overlay from `AgentChatPanel`.
Why: The panel still owned the mobile campaign/preview overlay render tree and picker outside-click effect inline.
Impact: Mobile campaign overlay UI now lives in a private 184 LOC component with mounted coverage for picker and preview-back behavior; mounted panel coverage still passes and the parent is down to 2,360 LOC.
Files: `apps/web/src/features/team/components/AgentChatPanel.tsx`, `apps/web/src/features/team/components/agent-chat-panel/AgentChatMobileCampaignPanel.tsx`, `apps/web/src/features/team/components/agent-chat-panel/AgentChatMobileCampaignPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 05:22] - [ARCH]

What: Extracted the `AgentChatPanel` voice-mode refresh branch.
Why: The panel still owned delayed message refresh, fetch, merge, and chat-store writes inline after voice mode ended.
Impact: Voice mode refresh now lives in a private 39 LOC component with mounted fake-timer coverage and a render-loop guard; mounted panel coverage still passes and the parent is down to 2,343 LOC.
Files: `apps/web/src/features/team/components/AgentChatPanel.tsx`, `apps/web/src/features/team/components/agent-chat-panel/AgentChatVoicePanel.tsx`, `apps/web/src/features/team/components/agent-chat-panel/AgentChatVoicePanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 05:34] - [ARCH]

What: Extracted the `AgentChatPanel` initial-load orchestration branch.
Why: The panel still owned async initial conversation loading, cached requested-session prefetch, blank/no-target handling, pending-strategy selection, stream recovery, and initial-load error cleanup inline.
Impact: Initial load now lives in a private 241 LOC helper with focused coverage for cached requested sessions, campaign blank starts, select-session delegation, error cleanup, and cancellation; mounted panel coverage still passes and the parent is down to 2,253 LOC.
Files: `apps/web/src/features/team/components/AgentChatPanel.tsx`, `apps/web/src/features/team/components/agent-chat-panel/agent-chat-panel.initial-load.ts`, `apps/web/src/features/team/components/agent-chat-panel/agent-chat-panel.initial-load.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 05:43] - [ARCH]

What: Extracted the main `AgentChatPanel` send-message workflow.
Why: The panel still owned lazy session creation, conversation promotion, stream payload construction, draft cleanup, refresh, and first-message title suggestion inline.
Impact: Send orchestration now lives in a private 182 LOC helper with focused coverage for stopping no-op, scoped session creation, payload mapping, promotion, and team-draft cleanup; mounted panel coverage still passes and the parent is down to 2,200 LOC.
Files: `apps/web/src/features/team/components/AgentChatPanel.tsx`, `apps/web/src/features/team/components/agent-chat-panel/agent-chat-panel.send.ts`, `apps/web/src/features/team/components/agent-chat-panel/agent-chat-panel.send.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 05:53] - [ARCH]

What: Extracted the `AgentChatPanel` initial-session sync retry loop.
Why: The panel still owned the retrying `initialSessionId` conversation refresh/select loop inline after the initial-load and send extractions.
Impact: Initial-session sync retry now lives in a private 66 LOC helper with focused coverage for retry-after-error selection, exhausted misses, and cancellation; mounted panel coverage still passes and the parent is down to 2,180 LOC.
Files: `apps/web/src/features/team/components/AgentChatPanel.tsx`, `apps/web/src/features/team/components/agent-chat-panel/agent-chat-panel.initial-session-sync.ts`, `apps/web/src/features/team/components/agent-chat-panel/agent-chat-panel.initial-session-sync.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 06:07] - [ARCH]

What: Extracted the `AgentChatPanel` pending send and deliverable handoff effects.
Why: The panel still owned org-scoped storage parsing, in-flight dedupe, suppressed strategy session creation, and deliverable document forwarding inline.
Impact: Pending-message handoffs now live in a private 197 LOC helper with focused coverage for cleanup, wrong-agent preservation, suppressed sends, documents, and in-flight cleanup; mounted panel coverage still passes and the parent is down to 2,130 LOC.
Files: `apps/web/src/features/team/components/AgentChatPanel.tsx`, `apps/web/src/features/team/components/agent-chat-panel/agent-chat-panel.pending-messages.ts`, `apps/web/src/features/team/components/agent-chat-panel/agent-chat-panel.pending-messages.test.ts`, `apps/web/src/features/team/components/agent-chat-panel/agent-chat-panel.logic.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 06:21] - [ARCH]

What: Extracted the `AgentChatPanel` queue/edit composer wrappers.
Why: The panel still owned queue enqueue/update/send-now/send-next handlers and stream-settled queue draining inline.
Impact: Queue/edit behavior now lives in a private 224 LOC hook with focused render-stability coverage; mounted panel coverage still passes and the parent is down to 2,045 LOC.
Files: `apps/web/src/features/team/components/AgentChatPanel.tsx`, `apps/web/src/features/team/components/agent-chat-panel/agent-chat-panel.queue.ts`, `apps/web/src/features/team/components/agent-chat-panel/agent-chat-panel.queue.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 06:39] - [ARCH]

What: Extracted Team 2 sidebar cache/loading orchestration and moved shared sidebar cache contracts into `apps/web/src/lib`.
Why: `SidebarTeam2Flyout.tsx` was exactly at the component limit and still owned bootstrap fallback, member cache, session lookup, sort, active route, and unread derivation logic inline.
Impact: The flyout is down to 312 LOC, the new hook is 162 LOC with render-stability coverage, old feature paths remain compatibility re-exports, and focused tests/lint/typecheck pass.
Files: `apps/web/src/components/layout/sidebar/SidebarTeam2Flyout.tsx`, `apps/web/src/components/layout/sidebar/useSidebarTeam2FlyoutData.ts`, `apps/web/src/components/layout/sidebar/useSidebarTeam2FlyoutData.test.tsx`, `apps/web/src/components/layout/sidebar/useSidebarTeam2Bootstrap.ts`, `apps/web/src/lib/agents/*`, `apps/web/src/lib/org/*`, `apps/web/src/lib/channels/*`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 07:01] - [ARCH]

What: Cleaned Team 2 sidebar row/UI imports through shared agent and channel boundaries.
Why: The sidebar rows still imported Team-2, Org, Settings, and Channels feature internals after the sidebar cache/loading extraction.
Impact: Person/team row menus and remove-member UI now live in `@/components/agents`, channel icon and channel helper ownership now live in shared component/lib paths, focused mounted sidebar coverage passes, and the only remaining target-scope feature imports are the two smart channel components deferred for a dedicated split.
Files: `apps/web/src/components/layout/sidebar/SidebarPersonRow.tsx`, `apps/web/src/components/layout/sidebar/SidebarTeamRow.tsx`, `apps/web/src/components/layout/sidebar/HomeCommunicationNav.tsx`, `apps/web/src/components/agents/*`, `apps/web/src/components/channels/*`, `apps/web/src/lib/channels/*`, `apps/web/src/features/channels/components/ChannelIcon.tsx`, `apps/web/src/features/channels/lib/channel-icon.ts`, `apps/web/src/features/channels/lib/pending-add-people.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 07:07] - [ARCH]

What: Promoted the create-channel modal into the shared Channels component surface.
Why: `HomeCommunicationNav` still imported the channel creation modal from the Channels feature after the sidebar row/UI cleanup.
Impact: The modal now lives under `@/components/channels`, uses the shared channel contract, the old feature path is a compatibility export, and the sidebar nav has one remaining target-scope Channels feature import: the smart actions host.
Files: `apps/web/src/components/channels/CreateChannelModal.tsx`, `apps/web/src/components/channels/index.ts`, `apps/web/src/features/channels/components/CreateChannelModal.tsx`, `apps/web/src/components/layout/sidebar/HomeCommunicationNav.tsx`, `apps/web/src/components/layout/sidebar/HomeCommunicationNav.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 07:13] - [ARCH]

What: Moved the channel actions host and supporting channel helpers behind shared paths.
Why: `HomeCommunicationNav` still imported the Channels feature actions host directly.
Impact: The sidebar nav now has zero direct Channels/Team-2/Org/Settings feature imports, channel member loading and brainstorm helpers live in `@/lib/channels`, and the old feature host/hook/helper paths remain compatibility exports. The shared host is still transitional because its child modals/actions are feature-owned.
Files: `apps/web/src/components/channels/ChannelListActionsHost.tsx`, `apps/web/src/components/channels/ChannelListActionsHost.test.tsx`, `apps/web/src/components/layout/sidebar/HomeCommunicationNav.tsx`, `apps/web/src/components/layout/sidebar/HomeCommunicationNav.test.tsx`, `apps/web/src/lib/channels/*`, `apps/web/src/features/channels/components/ChannelListActionsHost.tsx`, `apps/web/src/features/channels/hooks/use-channel-members.ts`, `apps/web/src/features/channels/lib/channel-space-brainstorm-toolbar.ts`, `apps/web/src/features/channels/lib/can-manage-channel.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 07:28] - [ARCH]

What: Promoted the lower-risk Channels actions-host children into shared component paths.
Why: `ChannelListActionsHost` still depended on feature-owned child components after the host move.
Impact: `ChannelActionsMenu`, `ChannelSettingsModal`, and `StartBrainstormModal` now live under `@/components/channels`, old feature paths remain compatibility exports, `ChannelChatContainer` uses shared mission/team-roster boundaries, `SpaceChannelsSidebar` uses shared channel imports, and mounted coverage locks the moved children plus the channel container roster effect.
Files: `apps/web/src/components/channels/ChannelActionsMenu.tsx`, `apps/web/src/components/channels/ChannelSettingsModal.tsx`, `apps/web/src/components/channels/StartBrainstormModal.tsx`, `apps/web/src/components/channels/index.ts`, `apps/web/src/components/channels/ChannelListActionsHost.tsx`, `apps/web/src/features/channels/components/ChannelActionsMenu.tsx`, `apps/web/src/features/channels/components/ChannelSettingsModal.tsx`, `apps/web/src/features/channels/components/StartBrainstormModal.tsx`, `apps/web/src/features/channels/containers/ChannelChatContainer.tsx`, `apps/web/src/features/channels/containers/ChannelChatContainer.test.tsx`, `apps/web/src/features/spaces/components/channels/SpaceChannelsSidebar.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 07:46] - [ARCH]

What: Promoted the final Channels actions-host child and publicized the shared Channels host barrel.
Why: `ChannelListActionsHost` still depended on feature-owned `AddPeopleToChannelModal`, which kept the host transitional after the lower-risk child moves.
Impact: `AddPeopleToChannelModal` is now a props-driven shared component with the old feature path kept as a compatibility wrapper, add-member/roster wiring lives in `@/lib/channels`, the host is exported from `@/components/channels`, and mounted/helper coverage locks add-member filtering plus payloads.
Files: `apps/web/src/components/channels/AddPeopleToChannelModal.tsx`, `apps/web/src/components/channels/index.ts`, `apps/web/src/components/channels/ChannelListActionsHost.tsx`, `apps/web/src/components/channels/ChannelListActionsHost.test.tsx`, `apps/web/src/features/channels/components/AddPeopleToChannelModal.tsx`, `apps/web/src/features/channels/components/AddPeopleToChannelModal.test.tsx`, `apps/web/src/features/channels/containers/ChannelChatContainer.tsx`, `apps/web/src/features/channels/containers/ChannelChatContainer.test.tsx`, `apps/web/src/components/layout/sidebar/HomeCommunicationNav.tsx`, `apps/web/src/components/layout/sidebar/HomeCommunicationNav.test.tsx`, `apps/web/src/features/spaces/components/channels/SpaceChannelsSidebar.tsx`, `apps/web/src/lib/channels/add-channel-members.ts`, `apps/web/src/lib/channels/add-channel-members.test.ts`, `apps/web/src/lib/channels/use-add-people-roster.ts`, `apps/web/src/lib/channels/index.ts`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 07:52] - [STYLE]

What: Cleaned the touched sidebar raw token classes from the Channels shared-surface batch.
Why: The Batch 71 final style scan still reported raw CSS-variable utility classes in `HomeCommunicationNav.tsx` and an arbitrary section-label text size in `SpaceChannelsSidebar.tsx`.
Impact: The sidebar channel surfaces now use named token/typography utilities for those touched classes; remaining style findings are logged missing-utility gaps for modal height caps, vertical rail labels, and the unread badge min-width.
Files: `apps/web/src/components/layout/sidebar/HomeCommunicationNav.tsx`, `apps/web/src/features/spaces/components/channels/SpaceChannelsSidebar.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 07:59] - [ARCH]

What: Moved the channel deliverable content-block mapper into shared missions.
Why: Studio and Spaces consumers imported `missionDeliverableFromContentBlock` from the Channels feature, and the helper itself depended on Mission Control/Studio feature type paths.
Impact: The mapper now lives in `@/lib/missions` with behavior coverage, the old Channels helper path is a compatibility export, Studio/Spaces consumers import the shared helper, and Spaces task deliverable collection uses shared mission/chat contracts.
Files: `apps/web/src/lib/missions/mission-deliverable-from-block.ts`, `apps/web/src/lib/missions/mission-deliverable-from-block.test.ts`, `apps/web/src/lib/missions/index.ts`, `apps/web/src/features/channels/lib/mission-deliverable-from-block.ts`, `apps/web/src/features/studio/components/message-bubble/MessageContentBlockSwitchPartA.tsx`, `apps/web/src/features/studio/components/message-bubble/MessageContentBlockSwitchPartB.tsx`, `apps/web/src/features/spaces/lib/collect-task-deliverables.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 08:14] - [ARCH]

What: Extracted the Studio message-block Meta renderer branch from `MessageContentBlockSwitchPartA`.
Why: Part A was still above the frontend component LOC target and owned Meta ad block normalization/rendering inline.
Impact: Meta block rendering now lives in a private 269 LOC helper with mounted coverage for account selection, config, publish confirm, status normalization, and render stability; Part A is down to 174 LOC and the remaining preview-width utility gap is logged.
Files: `apps/web/src/features/studio/components/message-bubble/MessageContentBlockSwitchPartA.tsx`, `apps/web/src/features/studio/components/message-bubble/MessageContentBlockSwitchMeta.tsx`, `apps/web/src/features/studio/components/message-bubble/MessageContentBlockSwitchPartA.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 08:29] - [ARCH]

What: Extracted the `AgentChatPanel` setup gate into a private Team chat component.
Why: The panel still owned setup repair state, stale/syncing auto-repair, failed setup blocking UI, and manual retry behavior inline.
Impact: Setup gating now lives in a 124 LOC component with mounted render-stability coverage; the parent is down to 1,945 LOC and remains the active god-file target.
Files: `apps/web/src/features/team/components/AgentChatPanel.tsx`, `apps/web/src/features/team/components/agent-chat-panel/AgentChatSetupGate.tsx`, `apps/web/src/features/team/components/AgentChatPanelSetupGate.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 08:40] - [ARCH]

What: Extracted `AgentChatPanel` session lifecycle timers into a private hook.
Why: The panel still owned stale draft cleanup timers, title reveal intervals, generated title persistence, and deleted-session reveal cleanup inline.
Impact: Session lifecycle behavior now lives in a 222 LOC hook with direct render-stability coverage; the parent is down to 1,834 LOC and the current stale-draft clearing behavior is preserved.
Files: `apps/web/src/features/team/components/AgentChatPanel.tsx`, `apps/web/src/features/team/components/agent-chat-panel/use-agent-chat-session-lifecycle.ts`, `apps/web/src/features/team/components/agent-chat-panel/use-agent-chat-session-lifecycle.test.tsx`, `apps/web/src/features/team/components/AgentChatPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 08:53] - [ARCH]

What: Extracted `AgentChatPanel` scroll orchestration into a private hook.
Why: The panel still owned scroll refs, resize observers, older-message pagination, scroll-away state, mobile scroll restore, and scroll-to-latest behavior inline.
Impact: Scroll behavior now lives in a 212 LOC hook with mounted render-stability coverage; the parent is down to 1,699 LOC and older-page pagination behavior is preserved.
Files: `apps/web/src/features/team/components/AgentChatPanel.tsx`, `apps/web/src/features/team/components/agent-chat-panel/use-agent-chat-scroll-controller.ts`, `apps/web/src/features/team/components/AgentChatPanelScrollController.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 09:08] - [ARCH]

What: Extracted `AgentChatPanel` campaign and realtime orchestration into a private hook.
Why: The panel still owned active campaign sync, campaign model strategy loading, mobile campaign preview state, realtime artifact subscriptions, artifact-open routing, and campaign header/picker handlers inline.
Impact: Campaign/realtime behavior now lives in a 375 LOC hook with mounted render-stability coverage; the parent is down to 1,455 LOC and artifact/campaign behavior is preserved.
Files: `apps/web/src/features/team/components/AgentChatPanel.tsx`, `apps/web/src/features/team/components/agent-chat-panel/use-agent-chat-campaign-controller.ts`, `apps/web/src/features/team/components/AgentChatPanelCampaignController.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 09:29] - [ARCH]

What: Extracted the Team conversations sidebar model helpers and moved campaign create/delete calls to the shared campaign API.
Why: `TeamConversationsSidebar.tsx` owned grouping, display-state, campaign row mapping, and Studio campaign service calls inline.
Impact: Sidebar grouping/search behavior is behavior-locked with mounted coverage, the helper is 203 LOC, shared campaign API coverage now includes create/delete, and the sidebar parent is down to 1,554 LOC while remaining modal/import/style debt is logged for the next sidebar batches.
Files: `apps/web/src/features/team/components/chat/TeamConversationsSidebar.tsx`, `apps/web/src/features/team/components/chat/team-conversations-sidebar.logic.ts`, `apps/web/src/features/team/components/chat/TeamConversationsSidebar.test.tsx`, `apps/web/src/lib/campaigns/campaign-api.ts`, `apps/web/src/lib/campaigns/campaign-api.test.ts`, `apps/web/src/features/studio/services/campaign.service.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 09:49] - [ARCH]

What: Promoted the Transfer dialog/provider/API boundary into shared web surfaces.
Why: Shared sidebars, dashboard providers, and Move/Copy menus imported transfer UI and permission/API contracts from the Transfer feature.
Impact: Transfer UI now lives under `@/components/transfer`, transfer contracts/API/permissions live under `@/lib/transfer`, old feature paths are compatibility exports, the old transfer feature import scan is clean, and mounted coverage locks preview/execute behavior plus render stability.
Files: `apps/web/src/components/transfer/*`, `apps/web/src/lib/transfer/*`, `apps/web/src/features/transfer/*`, `apps/web/src/app/(dashboard)/providers.tsx`, `apps/web/src/components/menus/MoveCopySubmenu.tsx`, `apps/web/src/components/layout/sidebar/SidebarStudioSection.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqSpacesMenuLayers.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqProjectList.tsx`, `apps/web/src/features/team/components/chat/TeamConversationsSidebar.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 10:12] - [ARCH]

What: Promoted the Org resource sharing modal/button and generic SettingsSelect into shared web surfaces.
Why: Campaign, Brain, sidebar, Team chat, and MCP consent consumers were importing reusable Org/Settings UI and sharing logic from feature-owned paths.
Impact: Org sharing UI now lives under `@/components/org`, sharing orchestration and toast constants live under `@/lib/org`, `SettingsSelect` lives under `@/components/ui/forms`, old feature paths are compatibility exports, and focused mounted tests plus web typecheck passed. Remaining parent LOC/import debt is logged.
Files: `apps/web/src/components/org/*`, `apps/web/src/lib/org/org-resource-sharing.ts`, `apps/web/src/lib/org/org-toast-errors.ts`, `apps/web/src/components/ui/forms/SettingsSelect.tsx`, `apps/web/src/features/org/components/ShareModal.tsx`, `apps/web/src/features/settings/components/SettingsSelect.tsx`, `apps/web/src/app/(dashboard)/campaigns/page.tsx`, `apps/web/src/features/brain/containers/BrainHome.tsx`, `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/components/layout/sidebar/*`, `apps/web/src/features/team/components/chat/TeamConversationsSidebar.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 10:26] - [ARCH]

What: Extracted the duplicated Team conversations session row and action menu into a private component.
Why: `TeamConversationsSidebar.tsx` still rendered the same rename/select/avatar/action-menu row logic in search results and campaign-expanded groups.
Impact: Row rendering now lives in `TeamConversationSessionRow.tsx` with mounted action-menu coverage, the sidebar parent is down to 1,281 LOC, and the existing search/campaign row Rename/Delete behavior is preserved.
Files: `apps/web/src/features/team/components/chat/TeamConversationsSidebar.tsx`, `apps/web/src/features/team/components/chat/TeamConversationSessionRow.tsx`, `apps/web/src/features/team/components/chat/TeamConversationsSidebar.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 10:35] - [ARCH]

What: Extracted the assigned campaign group section from the Team conversations sidebar.
Why: `TeamConversationsSidebar.tsx` still owned campaign group header, pinned/menu trigger, new-chat row, visible-row cap, and load-more rendering inline.
Impact: Assigned campaign group rendering now lives in `TeamConversationCampaignGroupSection.tsx` with mounted coverage for expansion, new-chat delegation, and campaign menu opening; the sidebar parent is down to 1,207 LOC.
Files: `apps/web/src/features/team/components/chat/TeamConversationsSidebar.tsx`, `apps/web/src/features/team/components/chat/TeamConversationCampaignGroupSection.tsx`, `apps/web/src/features/team/components/chat/TeamConversationsSidebar.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 10:45] - [ARCH]

What: Extracted the recent active conversations and search-results sections from the Team conversations sidebar.
Why: `TeamConversationsSidebar.tsx` still owned recent active conversation rows and grouped search-result rendering inline.
Impact: Recent active conversations now live in `TeamConversationActiveSection.tsx`, search results live in `TeamConversationSearchResults.tsx`, mounted coverage locks active selection/collapse and render stability, and the sidebar parent is down to 1,139 LOC.
Files: `apps/web/src/features/team/components/chat/TeamConversationsSidebar.tsx`, `apps/web/src/features/team/components/chat/TeamConversationActiveSection.tsx`, `apps/web/src/features/team/components/chat/TeamConversationSearchResults.tsx`, `apps/web/src/features/team/components/chat/TeamConversationsSidebar.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 10:55] - [ARCH]

What: Extracted the unassigned campaign section from the Team conversations sidebar.
Why: `TeamConversationsSidebar.tsx` still owned unassigned campaign header, row icon/title, and assign trigger rendering inline.
Impact: Unassigned campaign rendering now lives in `TeamConversationUnassignedSection.tsx`, mounted coverage locks assign-confirm delegation, sidebar test fixtures live in a helper to stay under LOC limits, and the sidebar parent is down to 1,104 LOC.
Files: `apps/web/src/features/team/components/chat/TeamConversationsSidebar.tsx`, `apps/web/src/features/team/components/chat/TeamConversationUnassignedSection.tsx`, `apps/web/src/features/team/components/chat/TeamConversationsSidebar.test.tsx`, `apps/web/src/features/team/components/chat/team-conversations-sidebar.test-helpers.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 11:03] - [ARCH]

What: Extracted the assigned campaign header and agent filter from the Team conversations sidebar.
Why: `TeamConversationsSidebar.tsx` still owned assigned-campaign expand controls, agent filter dropdown state, and new-campaign action rendering inline.
Impact: Assigned campaign header/filter rendering now lives in `TeamConversationAssignedSectionHeader.tsx`, mounted coverage locks filter selection behavior, and the sidebar parent is down to 980 LOC.
Files: `apps/web/src/features/team/components/chat/TeamConversationsSidebar.tsx`, `apps/web/src/features/team/components/chat/TeamConversationAssignedSectionHeader.tsx`, `apps/web/src/features/team/components/chat/TeamConversationsSidebar.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 11:09] - [ARCH]

What: Extracted the Team conversations sidebar header and search controls.
Why: `TeamConversationsSidebar.tsx` still owned mobile/desktop header controls, scope/collapse actions, and search input rendering inline.
Impact: Header and search controls now live in `TeamConversationsSidebarHeader.tsx`, mounted coverage locks desktop hover actions, and the sidebar parent is down to 842 LOC.
Files: `apps/web/src/features/team/components/chat/TeamConversationsSidebar.tsx`, `apps/web/src/features/team/components/chat/TeamConversationsSidebarHeader.tsx`, `apps/web/src/features/team/components/chat/TeamConversationsSidebar.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 11:15] - [ARCH]

What: Extracted the collapsed rail from the Team conversations sidebar.
Why: `TeamConversationsSidebar.tsx` still owned collapsed label, expand action, and new-conversation action rendering inline.
Impact: Collapsed rail rendering now lives in `TeamConversationsSidebarCollapsedRail.tsx`, mounted coverage locks expand/new-conversation delegation, and the sidebar parent is down to 806 LOC.
Files: `apps/web/src/features/team/components/chat/TeamConversationsSidebar.tsx`, `apps/web/src/features/team/components/chat/TeamConversationsSidebarCollapsedRail.tsx`, `apps/web/src/features/team/components/chat/TeamConversationsSidebar.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 11:23] - [ARCH]

What: Extracted the Team conversations loading and list shell.
Why: `TeamConversationsSidebar.tsx` still owned loading state plus active/search/assigned/unassigned list rendering inline.
Impact: List rendering now lives in `TeamConversationsSidebarListContent.tsx`, the parent scroll area uses the existing `scrollbar-hide` utility, mounted coverage still passes, and the sidebar parent is down to 743 LOC.
Files: `apps/web/src/features/team/components/chat/TeamConversationsSidebar.tsx`, `apps/web/src/features/team/components/chat/TeamConversationsSidebarListContent.tsx`, `apps/web/src/features/team/components/chat/TeamConversationsSidebar.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 11:37] - [ARCH]

What: Extracted the Team conversations campaign overlay shell.
Why: `TeamConversationsSidebar.tsx` still owned assign confirmation, campaign menu routing, and campaign modal rendering inline.
Impact: Overlay rendering now lives in `TeamConversationsSidebarOverlays.tsx`, modal/menu routing has a dedicated mounted characterization test, existing sidebar coverage still passes, and the sidebar parent is down to 651 LOC.
Files: `apps/web/src/features/team/components/chat/TeamConversationsSidebar.tsx`, `apps/web/src/features/team/components/chat/TeamConversationsSidebarOverlays.tsx`, `apps/web/src/features/team/components/chat/TeamConversationsSidebarModals.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 11:41] - [DOCS]

What: Added the Vibey context system protocol to the shared agent operating instructions.
Why: Agents need a portable process for using Vibey MCP as durable memory while respecting connected-user access limits.
Impact: Future sessions can create and refresh a lightweight `.vibey/` map, route durable knowledge to the right Brain family, stage uncertain memories, and treat denied MCP calls as access limits instead of missing platform capability.
Files: `AGENTS.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 11:45] - [DOCS]

What: Created the initial `.vibey/` context map folder.
Why: The shared agent protocol now expects a lightweight repo-local map for Vibey MCP access, Brain routing, relevant agents, refresh history, and pending memory candidates.
Impact: Future agents can read `.vibey/` before memory-heavy work, see that live MCP access is currently unverified in this session, and refresh the map with read/list MCP tools when available.
Files: `.vibey/README.md`, `.vibey/context-map.md`, `.vibey/access-map.md`, `.vibey/brain-routing.md`, `.vibey/agents/index.md`, `.vibey/refresh-log.md`, `.vibey/pending-memory.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 12:43] - [FIX]

What: Exposed Loop Flow Builder's existing agent-run output and completion controls for `send_to_agent`.
Why: Loop could compile agent-run flows but did not know by default to request durable document outputs or set completion status on the agent step, which led to missing artifacts and duplicate immediate status-change steps.
Impact: The shared Flow capability catalog, production DB-backed Loop `flow-builder` skill, local generated Loop runtime, and production shared Railway runtime now tell Loop to use `output_type`, `continuation`, and `completed_status` directly. Flow docs now also clarify that build quality scores are diagnostics, not semantic self-proof.
Files: `packages/api-shared/src/types/flow-capabilities.ts`, `packages/api-shared/src/types/flow-capabilities.test.ts`, `packages/api-shared/dist/types/flow-capabilities.js`, `packages/api-shared/dist/types/flow-capabilities.test.js`, `supabase/migrations/20260624085239_loop_flow_builder_agent_output_contracts.sql`, `documentation/features/spaces-automation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`, production Supabase `agent_skills` / `agent_skill_resources`

## [2026-06-24 12:45] - [ARCH]

What: Extracted Team conversations sidebar orchestration into private hooks.
Why: `TeamConversationsSidebar.tsx` still owned shell hover/focus state, campaign/menu/modal state, search state, session menu positioning, and campaign grouping orchestration after render extraction.
Impact: The sidebar parent is down to 306 LOC; shell, campaign, and controller hooks are all below frontend hook limits, and the existing mounted sidebar/modal behavior remains locked by tests.
Files: `apps/web/src/features/team/components/chat/TeamConversationsSidebar.tsx`, `apps/web/src/features/team/components/chat/use-team-conversations-sidebar-frame.ts`, `apps/web/src/features/team/components/chat/use-team-conversations-sidebar-campaign-controller.ts`, `apps/web/src/features/team/components/chat/use-team-conversations-sidebar-controller.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 13:08] - [ARCH]

What: Extracted the Brain visualization created-date dropdown and promoted shared reporting calendar UI.
Why: `BrainVisualization.tsx` still owned date-range dropdown state/rendering inline and depended on private Spaces reporting date-range modules.
Impact: Brain date filtering is behavior-locked with mounted search/date/render-stability coverage, reusable reporting presets/month calendar live under `@/components/reporting`, and the Brain parent is down to 1,779 LOC.
Files: `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/features/brain/components/BrainCreatedAtRangeDropdown.tsx`, `apps/web/src/features/brain/components/BrainVisualization.test.tsx`, `apps/web/src/components/reporting/ViewDateRangeMonthCalendar.tsx`, `apps/web/src/components/reporting/index.ts`, `apps/web/src/features/spaces/components/reporting/shared/view-date-range-subview.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 13:16] - [ARCH]

What: Extracted Brain visualization pure graph and awareness-context helpers.
Why: `BrainVisualization.tsx` still owned date/experience filtering, visible connection filtering, count merging, and Atlas context formatting inline.
Impact: Pure helper behavior now has focused coverage, the mounted Brain render-stability test still passes, and the Brain parent is down to 1,654 LOC.
Files: `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/features/brain/lib/brain-visualization-helpers.ts`, `apps/web/src/features/brain/lib/brain-visualization-helpers.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 13:25] - [ARCH]

What: Extracted the Brain campaign-scope graph mapper and snapshots.
Why: `BrainVisualization.tsx` still owned campaign graph snapshot caches plus campaign knowledge to Brain graph/search result mapping inline.
Impact: Campaign-scope mapping behavior is now covered separately without switching to the different operational knowledge mapper, and the Brain parent is down to 1,511 LOC.
Files: `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/features/brain/lib/brain-campaign-scope-graph.ts`, `apps/web/src/features/brain/lib/brain-campaign-scope-graph.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 13:26] - [FIX]

What: Reconciled task-agent generated Space Docs back into task activity deliverable blocks.
Why: Flow-driven `send_to_agent` runs could save documents into Space Docs while the task activity stream missed the structured `document_card` block, leaving the task preview and Deliverables & media section empty.
Impact: Task-agent completion now adds missing `document_card` blocks for Space Docs created during the run, and focused regression coverage locks the task activity payload behavior.
Files: `apps/agent-api/src/modules/task-agent/repositories/task-agent.repository.ts`, `apps/agent-api/src/modules/task-agent/services/task-agent.service.ts`, `apps/agent-api/src/modules/task-agent/services/task-agent-document-blocks.service.ts`, `apps/agent-api/src/modules/task-agent/services/task-agent-suggestions.service.ts`, `apps/agent-api/src/modules/task-agent/task-agent.module.ts`, `apps/agent-api/src/modules/task-agent/task-agent.service.test.ts`, `documentation/features/spaces-automation.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 13:45] - [ARCH]

What: Extracted the Brain visualization bottom dock into private Brain components.
Why: `BrainVisualization.tsx` still owned voice trigger, search results, dock toolbar actions, filters, queue, and stats rendering inline.
Impact: The mounted Brain search/date/render-stability guard still passes, the new dock files are below the frontend component limit and clean of copied raw-token/arbitrary style findings, and the Brain parent is down to 1,183 LOC.
Files: `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/features/brain/components/BrainVisualizationDock.tsx`, `apps/web/src/features/brain/components/BrainSearchResultsPanel.tsx`, `apps/web/src/features/brain/components/BrainDockHoverButton.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 13:49] - [DOCS]

What: Added a task-agent artifact output gap audit covering preview cards, task activity blocks, and Deliverables & media coverage across generated artifact families.
Why: The document attachment fix only covered Space Docs, and the remaining task-agent output surface needed a concrete gap map before broadening the runtime fix.
Impact: The audit separates currently covered document and stream-dependent artifact paths from missing producer blocks, missing frontend mappings, and missing generic task reconciliation for media, forms, tasks, missions, contacts, flows, projects, themes, and custom objects.
Files: `.docs/plans/task-agent-artifact-output-gap-audit.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 13:57] - [ARCH]

What: Rewired Brain visualization off direct Mission Control, Studio, and Team-2 feature imports.
Why: `BrainVisualization.tsx` still crossed feature boundaries for Atlas agent APIs, campaign knowledge APIs, and the side-chat layout.
Impact: Campaign knowledge APIs now live under `@/lib/campaigns`, the old Studio service path is a compatibility export with characterization coverage, Brain uses shared agent APIs, and the remaining side-chat dependency goes through the documented transitional shared adapter.
Files: `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/features/brain/components/BrainVisualization.test.tsx`, `apps/web/src/lib/campaigns/campaign-knowledge-api.ts`, `apps/web/src/lib/campaigns/index.ts`, `apps/web/src/features/studio/services/campaign-knowledge.service.ts`, `apps/web/src/features/studio/services/campaign-knowledge.service.test.ts`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 13:57] - [FIX]

What: Narrowed Docs view toolbar search to visible document titles.
Why: The Docs search haystack included full document bodies, so common terms like "services" could match every generated document and leave the list looking unfiltered.
Impact: Searching the Docs view now filters by the document names users see in the list/grid/tree, so "services" matches "Hadash Cyprus - Services & Treatments" without keeping unrelated docs just because their content mentions services.
Files: `apps/web/src/features/spaces/lib/apply-space-toolbar-filters.ts`, `apps/web/src/features/spaces/lib/__tests__/apply-space-toolbar-filters.test.ts`, `apps/web/src/features/spaces/components/DocsView.tsx`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:08] - [FIX]

What: Changed the Docs list footer quick-add row to delegate to the existing Docs add menu.
Why: Grouped Docs list sections were still using the generic task quick-add fallback, so the footer said "Add task" and opened the task composer instead of document creation choices.
Impact: Docs list footers now show "Add doc" and open the same top-right Docs menu for New draft, New visual doc, file upload, and cloud imports.
Files: `apps/web/src/features/spaces/components/SpaceQuickAdd.tsx`, `apps/web/src/features/spaces/components/SpaceQuickAdd.test.tsx`, `apps/web/src/features/spaces/components/GroupSection.tsx`, `apps/web/src/features/spaces/components/ListView.tsx`, `apps/web/src/features/spaces/components/DocsView.tsx`, `apps/web/src/features/spaces/components/content/SpaceContentRouter.tsx`, `apps/web/src/features/spaces/containers/SpaceItemsContainer.tsx`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:09] - [FEATURE]

What: Added the Company Cortex signal review gate across schema, API review, worker formation, agent actions, MCP policy, web review UI, and Atlas runtime instructions.
Why: Raw Company Brain activity could still become durable Cortex objects directly; durable company knowledge now has to pass through proposed signal creation, human review, reviewed-signal formation, and evidence-backed object creation.
Impact: Company saves now propose reviewed signals, approval queues formation, formation only consumes active reviewed signals, direct object creation requires existing signal lineage/evidence/retrieval rules, and legacy unsafe rows are reported by a read-only integrity query instead of auto-repaired.
Files: `supabase/migrations/20260624103922_company_cortex_signal_review_gate.sql`, `apps/api/src/modules/brain/*`, `apps/mission-worker/src/modules/brain-ops/*`, `apps/agent-api/src/modules/artifacts/*`, `packages/agent-policy/src/*`, `apps/web/src/features/brain/*`, `apps/web/src/features/settings/components/settings-content/brain-page/CompanyCortexSignalsCard.tsx`, `docker/agents/**`, `docker/tools/vibey-backend/index.ts`, `.docs/reports/company-cortex-integrity-audit.sql`, `documentation/features/mcp-brain-audit.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:11] - [ARCH]

What: Extracted Brain visualization search and image-search orchestration into a private hook.
Why: `BrainVisualization.tsx` still owned search dock state, debounce timers, image file reading, service payload construction, and outside-click cleanup inline after the dock UI split.
Impact: Search orchestration now lives in `use-brain-visualization-search.ts`, the mounted Brain guard covers text search, image-search payloads, and render stability, the Brain parent is down to 1,049 LOC, and a Space quick-add test matcher was normalized so full web typecheck passes.
Files: `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/features/brain/hooks/use-brain-visualization-search.ts`, `apps/web/src/features/brain/components/BrainVisualization.test.tsx`, `apps/web/src/features/spaces/components/SpaceQuickAdd.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:10] - [DOCS]

What: Added the Agent Learning Loops plan.
Why: Jamie's current skill recommendation path needed a broader product and implementation frame for observing, ranking, classifying, proposing, approving, applying, and measuring agent upgrades from real work.
Impact: The plan captures message-level feedback, platform signal measurements, ranking math, classification types, proposal quality gates, approval boundaries, apply rules, and a phased implementation roadmap. The broader Suggestion And Improvement Layer plan now points to the focused Agent Learning Loops plan.
Files: `.docs/plans/agent-learning-loops.md`, `.docs/plans/suggestion-improvement-layer.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:18] - [FIX]

What: Repositioned the Docs list footer add menu under the clicked "Add doc" row.
Why: The inline Docs footer should not open the toolbar's top-right dropdown; it needs the same document actions at the local row position.
Impact: Clicking "Add doc" in the Docs list now opens a fixed-position Docs menu under that row, while the toolbar menu and shared Drive/Dropbox modals remain reusable.
Files: `apps/web/src/features/spaces/components/toolbar/DocsAddDocMenu.tsx`, `apps/web/src/features/spaces/components/toolbar/DocsAddDocMenu.test.tsx`, `apps/web/src/features/spaces/components/SpaceQuickAdd.tsx`, `apps/web/src/features/spaces/components/SpaceQuickAdd.test.tsx`, `apps/web/src/features/spaces/components/GroupSection.tsx`, `apps/web/src/features/spaces/components/ListView.tsx`, `apps/web/src/features/spaces/components/DocsView.tsx`, `apps/web/src/features/spaces/components/content/SpaceContentRouter.tsx`, `apps/web/src/features/spaces/containers/SpaceItemsContainer.tsx`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:24] - [FIX]

What: Aligned Customer Brain interaction ingestion with source-anchored customer memories.
Why: Public widget and source-only customer interactions could still stop before becoming durable Customer Brain memory when no contact was resolvable.
Impact: Widget envelopes no longer require email, the sweeper includes public widget sources in both Supabase and direct-PG paths, single-customer interactions take direct extraction with `contact_id` null when needed, extraction writes `customer_entity_id`, `customer_source_identity_id`, and resolution status, and Atlas routing instructions now allow contact-linked or source-anchored Customer Brain writes.
Files: `apps/mission-worker/src/modules/brain-ops/customer-interaction-envelope.ts`, `apps/mission-worker/src/modules/brain-ops/customer-signal-sweeper.service.ts`, `apps/mission-worker/src/modules/brain-ops/customer-interaction-extraction.service.ts`, `apps/mission-worker/src/modules/brain-ops/brain-ops.processor.ts`, `apps/mission-worker/src/modules/brain-ops/customer-interaction-envelope.test.ts`, `apps/mission-worker/src/modules/brain-ops/customer-signal-sweeper.contract.test.ts`, `apps/mission-worker/src/modules/brain-ops/customer-interaction-extraction.service.test.ts`, `apps/mission-worker/src/modules/brain-ops/brain-ops.customer-interaction-route.actions.test.ts`, `docker/agents/atlas/skills/customer-call-routing/SKILL.md`, `docker/agents/templates/brain_scholar/skills/customer-call-routing/SKILL.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:29] - [FIX]

What: Added a generic task-agent artifact output manifest from OpenClaw tool results through task activity and deliverable mapping.
Why: The previous task-agent repair only recovered generated Space Docs; other tool-created outputs could still be lost when the live `ui_block` event did not land in task activity.
Impact: Completed tool results now record previewable `artifact_preview`, `media_asset`, document/file, project, widget, and screenshot blocks in the OpenClaw completion result; task completion merges those output blocks before the Space Doc readback safety net; the web content-block and deliverable mappers now support generic forms, tasks, missions, flows, websites, themes, custom objects, ad sets, DOCX files, and audio/media assets.
Files: `apps/agent-api/src/modules/shared/ui-block-extractor.ts`, `apps/agent-api/src/modules/chat/services/openclaw-stream-state.ts`, `apps/agent-api/src/modules/chat/services/openclaw-stream-tool.service.ts`, `apps/agent-api/src/modules/chat/services/openclaw-ui-block-text.ts`, `apps/agent-api/src/modules/task-agent/services/task-agent-artifact-outputs.service.ts`, `apps/agent-api/src/modules/task-agent/services/task-agent.service.ts`, `apps/web/src/lib/chat/message-content-blocks.ts`, `apps/web/src/lib/missions/mission-deliverable-from-block.ts`, `apps/web/src/lib/missions/mission-types.ts`, `apps/web/src/features/studio/components/message-bubble/MessageContentBlockSwitchPartA.tsx`, `apps/web/src/components/deliverables/DeliverablePreviewBody.tsx`, `apps/web/src/features/spaces/components/artifacts/artifact-card-display.ts`, `apps/web/src/features/spaces/components/artifacts/use-space-artifact-preview-controller.ts`, `documentation/features/spaces-automation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:30] - [ARCH]

What: Extracted Brain visualization derived graph and count state into a private helper and made Spaces artifact preview selection mappings exhaustive.
Why: `BrainVisualization.tsx` still owned filtered graph state, selected-node neighbor derivation, legend totals, and scope counts inline; full web typecheck also exposed missing artifact selection cases in the Spaces preview/card mapping.
Impact: `BrainVisualization.tsx` is down to 929 LOC, the new Brain derived-state helper and pure helper files are under the utility limit, focused Brain/Spaces tests and full web typecheck pass, and no user-visible behavior or API changed.
Files: `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/features/brain/lib/brain-visualization-derived-state.ts`, `apps/web/src/features/brain/lib/brain-visualization-helpers.ts`, `apps/web/src/features/brain/lib/brain-visualization-helpers.test.ts`, `apps/web/src/features/spaces/components/artifacts/artifact-card-display.ts`, `apps/web/src/features/spaces/components/artifacts/artifact-card-display.test.ts`, `apps/web/src/features/spaces/components/artifacts/use-space-artifact-preview-controller.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:44] - [ARCH]

What: Extracted Brain visualization graph/data loading orchestration into a private hook.
Why: `BrainVisualization.tsx` still owned campaign graph state, knowledge graph state, cache-first refreshes, scope load effects, active graph/loading selection, and queue-completion refresh routing inline.
Impact: `BrainVisualization.tsx` is down to 788 LOC, graph loading behavior has hook-level characterization coverage plus the mounted Brain guard, full web typecheck passes, and no user-visible behavior or API changed.
Files: `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/features/brain/hooks/use-brain-visualization-graph-data.ts`, `apps/web/src/features/brain/hooks/use-brain-visualization-graph-data.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:55] - [ARCH]

What: Extracted Brain visualization selected-node detail modal wiring into a private host and completed an adjacent Cortex Max typecheck unblock.
Why: `BrainVisualization.tsx` still owned selected-node modal transfer-scope filtering and delete refresh routing inline; full web typecheck also exposed incomplete customer-unit/unlinked-signal/perspective handling in the dirty Cortex Max detail panel.
Impact: `BrainVisualization.tsx` is down to 745 LOC, selected-node modal routing has focused host coverage, full web typecheck passes, and the remaining Cortex Max LOC/style debt is logged as follow-up.
Files: `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/features/brain/components/BrainNodeDetailModalHost.tsx`, `apps/web/src/features/brain/components/BrainNodeDetailModalHost.test.tsx`, `apps/web/src/features/brain/components/CortexMaxDetailPanel.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:49] - [FIX]

What: Made task-agent Space document cards appear in task Deliverables & media.
Why: Activity could render a `document_card` with only `spaceItemId`, while the deliverables mapper still required `documentId` and the task-detail deliverables hook relied on a refetch-based realtime update.
Impact: Space document cards now become `space_items` doc deliverables, document cards without conversation document ids remain renderable in chat/activity, and task detail deliverables merge realtime activity INSERT/UPDATE payloads directly on a unique channel.
Files: `apps/web/src/lib/missions/mission-deliverable-from-block.ts`, `apps/web/src/lib/missions/mission-deliverable-from-block.test.ts`, `apps/web/src/lib/chat/message-content-blocks.ts`, `apps/web/src/features/studio/components/message-bubble/MessageContentBlockSwitchPartB.tsx`, `apps/web/src/features/spaces/hooks/useTaskDetailData.ts`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 14:58] - [FIX]

What: Closed source-level agent capability drift for active PromptMode actions and added a reusable source drift guardrail.
Why: Loop and other managed agents could receive stale or incomplete generated Vibey API docs even when backend actions, schemas, registry rows, and policy exposure existed.
Impact: Active backend actions now have schema, registry, policy, and generated-doc coverage; docs-only phantom actions were removed from the source catalog; the read-only production DB/runtime audit identifies the remaining materialization gaps separately.
Files: `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-capability-source-drift.test.ts`, `.docs/plans/agent-capability-family-drift-prioritization.md`, `.docs/plans/agent-runtime-materialization-drift-audit.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 15:06] - [ARCH]

What: Extracted Brain visualization scope and toolbar action handling into a private hook.
Why: `BrainVisualization.tsx` still owned URL action routing, train/add-info/voice/Cortex Max/Crystallize open state, and dock callbacks inline.
Impact: `BrainVisualization.tsx` is down to 710 LOC, scope/action behavior has hook-level characterization coverage plus the mounted Brain guard, full web typecheck passes, and no user-visible behavior or API changed.
Files: `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/features/brain/hooks/use-brain-visualization-actions.ts`, `apps/web/src/features/brain/hooks/use-brain-visualization-actions.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 15:06] - [ARCH]

What: Executed the Customer Brain architecture alignment build across contactless/source-anchored writes, identity graph migrations, ingestion, customer-unit synthesis, Cortex Max read UX, Atlas skills, and documentation.
Why: Customer Brain is a collective customer consciousness, not a contact-only CRM view; anonymous/source-only customer signals need durable memory, and synthesis/UX should organize by customer/account/source units instead of dropping unresolved contacts.
Impact: Customer Brain writes now require either contact identity or durable source identity, migrations add customer entities/source identities and avatar unit memberships, widget/source-only ingestion creates durable customer memories, beliefs and avatars synthesize across customer units, Cortex Max exposes collective/customer/unlinked-signal sections, production Supabase project `qfrvykscoymiwwgysvsr` has both migrations applied, and the global DB-backed Atlas skill rows for customer routing, pattern analysis, and avatar synthesis now carry the aligned runtime instructions.
Files: `apps/agent-api/src/modules/artifacts/services/artifact-action-preflight.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-atlas-brain-context.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-customer-brain.service.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-customer-brain.repository.ts`, `apps/api/src/modules/brain/controllers/customer-brain.controller.ts`, `apps/api/src/modules/brain/repositories/customer-brain.repository.ts`, `apps/api/src/modules/brain/services/customer-brain.service.ts`, `apps/mission-worker/src/modules/brain-ops/customer-interaction-envelope.ts`, `apps/mission-worker/src/modules/brain-ops/customer-signal-sweeper.service.ts`, `apps/mission-worker/src/modules/brain-ops/customer-interaction-extraction.service.ts`, `apps/mission-worker/src/modules/brain-ops/brain-ops.processor.ts`, `apps/web/src/features/brain/components/CortexMaxBrainView.tsx`, `apps/web/src/features/brain/components/CortexMaxDetailPanel.tsx`, `apps/web/src/features/brain/components/CortexMaxModal.tsx`, `apps/web/src/features/brain/services/brain.service.ts`, `apps/web/src/features/brain/types/brain.types.ts`, `supabase/migrations/20260624110423_customer_brain_identity_graph.sql`, `supabase/migrations/20260624112500_customer_avatar_customer_unit_memberships.sql`, `docker/agents/atlas/skills/customer-call-routing/SKILL.md`, `docker/agents/atlas/skills/customer-brain-pattern-analysis/SKILL.md`, `docker/agents/atlas/skills/customer-avatar-synthesis/SKILL.md`, `.docs/plans/customer-brain.md`, `.docs/plans/customer-brain-cognition.md`, `.docs/plans/customer-signal-loop.md`, `.docs/features/brain-feature-implementation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 15:13] - [ARCH]

What: Extracted Brain visualization modal and voice portal rendering into a private layer.
Why: `BrainVisualization.tsx` still owned Cortex Max, Crystallize, and voice portal rendering plus live voice scope mapping inline.
Impact: `BrainVisualization.tsx` is down to 663 LOC, modal/voice behavior has focused layer coverage plus the mounted Brain guard, full web typecheck passes, and no user-visible behavior or API changed.
Files: `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/features/brain/components/BrainVisualizationModalLayer.tsx`, `apps/web/src/features/brain/components/BrainVisualizationModalLayer.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 15:19] - [FIX]

What: Collapsed ordered chat work groups into a final `Worked for` summary before the assistant answer and preserved separate thinking transcript blocks across stream phases.
Why: Completed chat messages still showed all prior thoughts/tools/updates above the final answer, while new thinking deltas reused the first transcript block and overwrote earlier thoughts.
Impact: Ordered chat messages now render prior work and intermediate ordered text updates as one collapsed summary with the duration label and divider before the final text; footer actions stay on the left without a duplicate duration; thinking transcripts append in stream order and complete the latest active transcript.
Files: `apps/web/src/features/studio/store/use-chat-store.ts`, `apps/web/src/features/studio/components/message-bubble/message-bubble.utils.ts`, `apps/web/src/features/studio/components/message-bubble/MessageBubbleOrderedBlocks.tsx`, `apps/web/src/features/studio/components/chat/LockedInGroup.tsx`, `apps/web/src/features/studio/components/message-bubble/AssistantActions.tsx`, `apps/web/src/features/studio/components/MessageBubble.tsx`, `apps/web/src/features/studio/components/message-bubble/message-bubble.utils.test.ts`, `apps/web/src/features/studio/store/use-chat-store.test.ts`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 15:23] - [ARCH]

What: Extracted Brain visualization graph controls and legend chrome into a private component.
Why: `BrainVisualization.tsx` still owned desktop `NavControls`/`LegendPanel` placement, graph-ref callback wiring, monochrome toggle wiring, and legend cognition-count normalization inline.
Impact: `BrainVisualization.tsx` is down to 632 LOC, graph controls have focused coverage plus the mounted Brain render-stability guard, full web typecheck passes, and no user-visible behavior or API changed.
Files: `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/features/brain/components/BrainVisualizationGraphControls.tsx`, `apps/web/src/features/brain/components/BrainVisualizationGraphControls.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 15:32] - [ARCH]

What: Extracted Brain visualization canvas and breadcrumb chrome into private components.
Why: `BrainVisualization.tsx` still owned canvas error/loading/ForceGraph rendering, retry and node-click wiring, mobile menu/breadcrumb chrome, and desktop breadcrumb placement inline.
Impact: `BrainVisualization.tsx` is down to 587 LOC, the canvas and breadcrumb layers have focused coverage plus the mounted Brain render-stability guard, full web typecheck passes, and no user-visible behavior or API changed.
Files: `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/features/brain/components/BrainVisualizationCanvasStage.tsx`, `apps/web/src/features/brain/components/BrainVisualizationCanvasStage.test.tsx`, `apps/web/src/features/brain/components/BrainVisualizationBreadcrumbLayer.tsx`, `apps/web/src/features/brain/components/BrainVisualizationBreadcrumbLayer.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 15:38] - [FIX]

What: Preserved the original ordered chat timeline inside the final `Worked for` summary.
Why: The first summary pass collapsed prior work into one outer row but flattened the expanded contents, so mini-groups like `Read 2 files` and intermediate updates no longer looked identical to the during-run timeline.
Impact: The completed-message summary is now only an outer wrapper; expanding it renders the same grouped timeline segments, updates, browser panel placement, and ordered block renderer that were visible before the final answer started.
Files: `apps/web/src/features/studio/components/message-bubble/message-bubble.utils.ts`, `apps/web/src/features/studio/components/message-bubble/MessageBubbleOrderedBlocks.tsx`, `apps/web/src/features/studio/components/chat/LockedInGroup.tsx`, `apps/web/src/features/studio/components/message-bubble/message-bubble.utils.test.ts`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 15:41] - [ARCH]

What: Extracted Brain visualization memory panel and hidden image-search input wiring into a private component.
Why: `BrainVisualization.tsx` still owned image-search file input rendering plus memory selection/search mirroring and close behavior inline.
Impact: `BrainVisualization.tsx` is down to 579 LOC, memory-layer behavior has focused coverage plus the mounted Brain render-stability guard, full web typecheck passes, and no user-visible behavior or API changed.
Files: `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/features/brain/components/BrainVisualizationMemoryLayer.tsx`, `apps/web/src/features/brain/components/BrainVisualizationMemoryLayer.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 15:57] - [ARCH]

What: Extracted Brain visualization Atlas agent lookup/backfill into a private hook and cleared frontend typecheck blockers found during verification.
Why: `BrainVisualization.tsx` still owned Atlas mission-agent loading state and backfill side effects inline, and full web typecheck exposed current-tree composer stack mistakes in Studio chat and Team side chat.
Impact: `BrainVisualization.tsx` is down to 512 LOC, Atlas lookup/backfill behavior has focused hook coverage plus the mounted Brain render-stability guard, Team side-chat mounted coverage passes with the new composer stack mock, and full web typecheck passes.
Files: `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/features/brain/hooks/use-brain-visualization-atlas-agent.ts`, `apps/web/src/features/brain/hooks/use-brain-visualization-atlas-agent.test.tsx`, `apps/web/src/features/studio/components/ChatInterface.tsx`, `apps/web/src/features/team-2/components/hr-side-chat/TeamHrSideChatPanel.tsx`, `apps/web/src/features/team-2/components/hr-side-chat/TeamHrSideChatPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 16:13] - [ARCH]

What: Extracted Brain visualization scope selection and runtime-state derivation into a private hook.
Why: `BrainVisualization.tsx` still owned URL scope-param syncing, invalid scope replacement, selected-scope resolution, home navigation, and runtime-state memoization inline.
Impact: `BrainVisualization.tsx` is down to 487 LOC, scope selection has focused hook coverage plus the mounted Brain render-stability guard, full web typecheck passes, and adjacent Flow type-surface blockers found during verification are fixed without changing behavior.
Files: `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/features/brain/hooks/use-brain-visualization-scope-selection.ts`, `apps/web/src/features/brain/hooks/use-brain-visualization-scope-selection.test.tsx`, `apps/web/src/features/flows/containers/FlowsPage.tsx`, `apps/web/src/features/flows/lib/flows-filters.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 16:20] - [ARCH]

What: Extracted Brain visualization UI state and Atlas awareness context into private hooks.
Why: `BrainVisualization.tsx` still owned dock filter state, queue visibility/counting, mobile viewport tracking, monochrome state, and Atlas context assembly after the prior Brain splits.
Impact: `BrainVisualization.tsx` is down to 395 LOC and now clears the frontend component cap; the new hooks have focused coverage and the mounted Brain render-stability guard still passes.
Files: `apps/web/src/features/brain/components/BrainVisualization.tsx`, `apps/web/src/features/brain/hooks/use-brain-visualization-ui-state.ts`, `apps/web/src/features/brain/hooks/use-brain-visualization-ui-state.test.tsx`, `apps/web/src/features/brain/hooks/use-brain-visualization-atlas-awareness.ts`, `apps/web/src/features/brain/hooks/use-brain-visualization-atlas-awareness.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 16:15] - [ARCH]

What: Added reusable Flow definitions, per-Space Flow installations, compact Manage install metadata, expandable install rows, and visible drag-to-Loop composer chips.
Why: Flows should behave like reusable automation definitions that can be installed into multiple Spaces, while Loop drag/drop should attach clear context without jumping into old conversations or hiding the selected Flow.
Impact: Admin Manage now groups org/campaign Flow views by definition, Space scope still opens the concrete installation, drag/drop carries definition and automation IDs, single-install drops select the Space without reopening stored conversations, and Loop receives the attached Flow context in its awareness prompt.
Files: `supabase/migrations/20260624175438_flow_definitions_installations.sql`, `apps/api/src/modules/spaces/repositories/space-flow-definitions.repository.ts`, `apps/api/src/modules/spaces/services/org-automation-flows.service.ts`, `apps/api/src/modules/spaces/services/org-automation-flows.service.test.ts`, `apps/api/src/modules/spaces/spaces.module.ts`, `apps/web/src/features/flows/containers/FlowsPage.tsx`, `apps/web/src/features/flows/components/FlowInstallationSummary.tsx`, `apps/web/src/features/flows/components/FlowsManageGridView.tsx`, `apps/web/src/features/flows/components/FlowsManageListView.tsx`, `apps/web/src/features/flows/lib/flow-chat-drag.ts`, `apps/web/src/features/flows/lib/__tests__/flow-chat-drag.test.ts`, `apps/web/src/features/flows/lib/__tests__/flows-grouping.test.ts`, `apps/web/src/features/flows/lib/flows-filters.ts`, `apps/web/src/features/flows/lib/flows-grouping.ts`, `apps/web/src/features/flows/lib/flows-loop-awareness-context.ts`, `apps/web/src/features/flows/lib/flows-loop-awareness-context.test.ts`, `apps/web/src/features/flows/types/flow-automation.types.ts`, `documentation/features/spaces-automation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 16:39] - [ARCH]

What: Added a mounted BrainHome guard, moved the parent off direct cross-feature imports, and extracted pure BrainHome state helpers.
Why: `BrainHome.tsx` still depended directly on Mission Control, Org, and Team-2 feature paths and owned sort/filter/section/Atlas awareness logic inline.
Impact: `BrainHome.tsx` now uses shared agent/org/side-chat boundaries, the parent direct cross-feature scan is clean, the file is down to 565 LOC, and mounted render-stability coverage passes.
Files: `apps/web/src/features/brain/containers/BrainHome.tsx`, `apps/web/src/features/brain/containers/BrainHome.test.tsx`, `apps/web/src/features/brain/lib/brain-home-state.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 16:50] - [ARCH]

What: Moved Brain scope hooks and BrainHome child components off private Mission Control, Org, Settings, Studio, and Team-2 imports.
Why: The cleaned BrainHome parent still depended on child hooks/components that crossed feature boundaries for agent, org, billing, campaign, and team-permission contracts.
Impact: Brain scope loading, trainable target derivation, agent menu permissions, and add-agent billing now use existing shared `@/lib` surfaces with mounted hook coverage; full web typecheck also passes after a type-only observability helper unblock.
Files: `apps/web/src/features/brain/components/BrainHomeAddAgentCard.tsx`, `apps/web/src/features/brain/components/BrainHomeListView.tsx`, `apps/web/src/features/brain/hooks/use-brain-scope-nav-options.ts`, `apps/web/src/features/brain/hooks/use-brain-scope-menu-actions.ts`, `apps/web/src/features/brain/hooks/use-trainable-brains.ts`, `apps/web/src/features/brain/hooks/use-brain-scope-boundaries.test.tsx`, `apps/web/src/features/brain/lib/brain-train-permissions.ts`, `apps/web/src/features/brain/components/AddAgentBrainModals.tsx`, `apps/web/src/lib/observability/request-trace-event.server.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 16:56] - [ARCH]

What: Split BrainHome toolbar and grid-section rendering into private Brain components.
Why: `BrainHome.tsx` was still above the 400-line frontend component cap after the shared-boundary cleanup.
Impact: `BrainHome.tsx` is now 393 LOC, toolbar/grid rendering is covered by mounted list-grid toggle tests, and the new render components are small and clean of direct cross-feature imports.
Files: `apps/web/src/features/brain/containers/BrainHome.tsx`, `apps/web/src/features/brain/containers/BrainHome.test.tsx`, `apps/web/src/features/brain/components/BrainHomeToolbar.tsx`, `apps/web/src/features/brain/components/BrainHomeGridSections.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 16:59] - [ARCH]

What: Moved secondary Brain campaign, org, and settings imports to shared frontend surfaces.
Why: Brain campaign icon updates, recurring Fathom billing UI, training settings links, node deletion, and campaign knowledge import panels still imported private Studio, Org, or Settings modules.
Impact: Those Brain surfaces now use `@/lib/campaigns`, `@/lib/org`, and `@/lib/settings`; focused service and mounted Brain tests pass, while the large modal/panel LOC debt remains tracked separately.
Files: `apps/web/src/features/brain/services/campaign-brain-icon.service.ts`, `apps/web/src/features/brain/services/campaign-brain-icon.service.test.ts`, `apps/web/src/features/brain/components/training/recurring/rule-cards/FathomRuleCard.tsx`, `apps/web/src/features/brain/components/training/TrainingModal.tsx`, `apps/web/src/features/brain/components/NodeDetailModal.tsx`, `apps/web/src/features/brain/components/CampaignAddInfoPanel.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 16:51] - [FEATURE]

What: Completed the Agent Learning Loops integration for Jaime recommendations across persistence, proposal generation, route-out handling, apply/checkpoint flow, experiment evaluation, and the web review surface.
Why: Jaime needed to improve org-owned skills and ROLE/IDENTITY/SOUL agent files from platform evidence without exposing platform/system issues to end users or creating duplicate proposals for the same artifact.
Impact: Agent learning proposals now persist artifact metadata, hidden route-outs, locks, priorities, patches, experiments, checkpoints, and apply/evaluate state; Jaime can propose skill/resource/agent-file changes, patch pending proposals, avoid active experiments, restore from checkpoints on revert, and expose customer-visible reviews through shared web APIs.
Files: `apps/api/src/modules/skill-recommendations/repositories/agent-learning-loop.repository.ts`, `apps/api/src/modules/skill-recommendations/repositories/skill-recommendations.repository.ts`, `apps/api/src/modules/skill-recommendations/services/agent-learning-loop-apply.service.ts`, `apps/api/src/modules/skill-recommendations/services/agent-learning-loop-policy.service.ts`, `apps/api/src/modules/skill-recommendations/services/skill-recommendation-jaime.service.ts`, `apps/api/src/modules/skill-recommendations/services/skill-recommendation-jobs.service.ts`, `apps/api/src/modules/skill-recommendations/controllers/skill-recommendations.controller.ts`, `apps/api/src/modules/skill-recommendations/skill-recommendations.module.ts`, `apps/api/src/modules/missions/repositories/agent-checkpoints.repository.ts`, `apps/api/src/modules/missions/services/agent-checkpoints.service.ts`, `apps/web/src/lib/skill-recommendations`, `apps/web/src/features/home/components/cards/SkillRecommendationsCard.tsx`, `apps/web/src/features/settings/components/settings-content/SkillRecommendationsPageContent.tsx`, `supabase/migrations/20260624160952_hr_agent_learning_loop_readiness.sql`, `supabase/migrations/20260624163000_agent_learning_loop_full_integration.sql`, `docker/agents/hr/ROLE.md`, `documentation/features/skill-recommendations.md`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/agent-learning-loops-v2.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-24 17:00] - [FEATURE]

What: Added full request-route and source-code observability across schema, shared reporters, frontend proxy/client errors, agent chat/OpenClaw paths, mission gateway events, source-map artifact metadata, and admin trace lookup.
Why: Daily trace triage needs a stable cross-layer request ID plus route events and source pointers so it can connect browser/API/runtime/tool failures to the exact turn and repo location.
Impact: New request trace events, source pointer columns, private source-map artifact metadata, `x-vibey-*` propagation, best-effort route event writes, normalized tool failure event fields, hidden source-map upload support, and admin request trace detail are available without making observability writes block user traffic.
Files: `supabase/migrations/20260624133616_request_route_source_observability.sql`, `packages/api-shared/src/observability`, `packages/api-shared/src/services/error-reporter.service.ts`, `apps/web/src/lib/api/backend-client.ts`, `apps/web/src/app/api/proxy/[...path]/route.ts`, `apps/web/src/lib/log-client-error.ts`, `apps/web/src/lib/observability`, `apps/api/src/modules/client-errors/controllers/client-errors.controller.ts`, `apps/api/src/modules/admin/services/admin-service-errors-traces.base.ts`, `apps/agent-api/src/modules/chat`, `apps/mission-worker/src/modules/missions/services/gateways/mission-openclaw.gateway.ts`, `scripts/observability/upload-source-maps.ts`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 17:19] - [ARCH]

What: Promoted the artifact inline preview card into the shared artifact UI boundary and rewired Brain knowledge-source previews to it.
Why: Brain still imported Studio chat artifact preview internals for knowledge-source cards, keeping a direct cross-feature edge and copied debug fetch debris in the preview click path.
Impact: Brain artifact-preview imports now go through `@/components/artifacts` and `@/lib/artifacts`, the old Studio preview folder is compatibility-only, focused mounted coverage locks link/event behavior and render stability, and full web typecheck passes.
Files: `apps/web/src/features/brain/components/KnowledgeSourcePreview.tsx`, `apps/web/src/features/brain/components/KnowledgeSourcePreview.test.tsx`, `apps/web/src/features/brain/lib/knowledge-source-preview.ts`, `apps/web/src/components/artifacts/artifact-inline-preview-card`, `apps/web/src/components/artifacts/index.ts`, `apps/web/src/features/studio/components/chat/artifact-inline-preview-card`, `apps/web/src/lib/artifacts/artifact-preview-api.ts`, `apps/web/src/lib/artifacts/artifact-preview-api.test.ts`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 17:35] - [ARCH]

What: Moved Brain live-session chat runtime imports behind the shared adapter and promoted the generated-image modal into shared media UI.
Why: Brain still imported Studio chat store/types directly, and Brain/Org image pickers reused the Spaces doc-cover generation modal through a private feature path.
Impact: Brain production direct cross-feature imports are clean except test mocks, generated media UI now lives under `@/components/media`, `MediaGenerateModal.tsx` is under the frontend component cap after a presentational split, and focused mounted tests, ESLint, style/import scans, full web typecheck, stale changelog scan, and `git diff --check` pass.
Files: `apps/web/src/features/brain/hooks/use-brain-live-session.ts`, `apps/web/src/features/brain/hooks/__tests__/use-brain-live-session-reconnect.test.ts`, `apps/web/src/features/brain/components/BrainImagePickerHost.tsx`, `apps/web/src/features/brain/components/CampaignBrainIconPicker.tsx`, `apps/web/src/features/org/components/OrgLogoPicker.tsx`, `apps/web/src/components/media/MediaGenerateModal.tsx`, `apps/web/src/components/media/MediaGeneratePreviewStage.tsx`, `apps/web/src/components/media/MediaGenerateCountMenu.tsx`, `apps/web/src/components/media/MediaGenerateCreationsGrid.tsx`, `apps/web/src/components/media/use-media-image-generation.ts`, `apps/web/src/components/media/index.ts`, `apps/web/src/features/spaces/components/docs/DocCoverPickerModal.tsx`, `apps/web/src/features/spaces/components/docs/use-doc-image-gen.ts`, `apps/web/src/features/spaces/views/media/MediaGenerateModal.tsx`, `apps/web/src/features/spaces/components/docs/DocCoverPickerModal.test.tsx`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 17:41] - [ARCH]

What: Split the BrainHome grid-card menu into a private component and added direct mounted card coverage.
Why: `BrainHomeGridCard.tsx` was still above the 400-line frontend component cap after the BrainHome parent split.
Impact: `BrainHomeGridCard.tsx` is now 295 LOC, the menu lives in a focused 170 LOC component, touched card/list color classes use token utilities, and focused mounted tests, ESLint, style/import scans, and full web typecheck pass.
Files: `apps/web/src/features/brain/components/BrainHomeGridCard.tsx`, `apps/web/src/features/brain/components/BrainHomeGridCardMenu.tsx`, `apps/web/src/features/brain/components/BrainHomeGridCard.test.tsx`, `apps/web/src/features/brain/components/BrainHomeListView.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 17:57] - [FEATURE]

What: Added daily trace-to-bug intake that clusters last-24h trace/app-error/runtime/route-event failures and creates or refreshes Development Space bug tasks by fingerprint.
Why: Trace triage needs to hand actionable, deduplicated platform failures to the existing bug-fix automation queue instead of only reporting error maps.
Impact: API cron now runs daily trace bug intake, known platform clusters are promoted into `space_items` bugs with evidence and fix-area context, existing `pr_review`/QA tasks keep their status, and a partial unique index prevents duplicate intake bugs for the same fingerprint.
Files: `apps/api/src/modules/trace-bug-intake`, `apps/api/src/cron.service.ts`, `apps/api/src/app.module.ts`, `supabase/migrations/20260624144914_trace_bug_intake_fingerprint.sql`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 17:59] - [ARCH]

What: Added mounted TrainingModal characterization coverage and split its source rail and add-content pane into private Brain components.
Why: `TrainingModal.tsx` remained a Phase 3 frontend god-file target after the Brain shared-boundary import cleanup.
Impact: The modal is down from 2,227 to 1,909 LOC, source switching/settings delegation and pasted link/text staging are behavior-locked, and the parent remains tracked for further LOC decomposition.
Files: `apps/web/src/features/brain/components/training/TrainingModal.tsx`, `apps/web/src/features/brain/components/training/TrainingSourceRail.tsx`, `apps/web/src/features/brain/components/training/TrainingAddPane.tsx`, `apps/web/src/features/brain/components/training/TrainingModal.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 18:11] - [ARCH]

What: Split TrainingModal staging panel, queue rows, and metadata menus into private Brain training components with mounted staging metadata coverage.
Why: `TrainingModal.tsx` still owned staging layout and row/menu rendering after the first modal split.
Impact: The modal is down from 1,909 to 1,409 LOC, staging select-all, bulk metadata apply, and staged-row removal are behavior-locked, and unrelated web typecheck blockers are logged separately.
Files: `apps/web/src/features/brain/components/training/TrainingModal.tsx`, `apps/web/src/features/brain/components/training/TrainingStagingPanel.tsx`, `apps/web/src/features/brain/components/training/TrainingStagingQueue.tsx`, `apps/web/src/features/brain/components/training/TrainingStagingMetadataMenu.tsx`, `apps/web/src/features/brain/components/training/TrainingModal.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 18:18] - [ARCH]

What: Split TrainingModal Fathom and Fireflies source panes into a private Brain training integration pane module.
Why: `TrainingModal.tsx` still owned integration pane rendering, search input state, meeting-time formatting, and the in-brain badge inline.
Impact: The modal is down from 1,409 to 1,141 LOC, connected Fathom meeting staging is behavior-locked, and broad web typecheck is now blocked only by unrelated agent-feedback matcher typings.
Files: `apps/web/src/features/brain/components/training/TrainingModal.tsx`, `apps/web/src/features/brain/components/training/TrainingIntegrationPanes.tsx`, `apps/web/src/features/brain/components/training/TrainingModal.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 18:15] - [FEATURE]

What: Added per-agent-turn feedback across shared assistant messages, task agent execution rows, and mission progress rows.
Why: Agent Learning Loops need human signal attached to the exact agent turn, not session-level ratings or mission-only feedback.
Impact: Completed assistant/agent turns now show Copy, optional Fork, Thumbs Up, and Thumbs Down actions; thumbs save immediately, details can add chips/text, feedback is stored in `agent_turn_feedback`, Jaime receives feedback summaries, and experiment evaluation uses negative/trusted feedback as a guardrail without generating candidates from thumbs alone.
Files: `supabase/migrations/20260624182000_agent_turn_feedback.sql`, `apps/api/src/modules/agent-feedback`, `apps/api/src/app.module.ts`, `apps/api/src/modules/skill-recommendations/repositories/agent-learning-loop.repository.ts`, `apps/api/src/modules/skill-recommendations/repositories/skill-recommendations.repository.ts`, `apps/api/src/modules/skill-recommendations/services/agent-learning-loop-apply.service.ts`, `apps/api/src/modules/skill-recommendations/services/skill-recommendation-jobs.service.ts`, `apps/api/src/modules/skill-recommendations/services/skill-recommendation-jaime.service.ts`, `apps/web/src/components/chat/AgentTurnFeedbackActions.tsx`, `apps/web/src/lib/agent-feedback`, `apps/web/src/features/studio/components/message-bubble/AssistantActions.tsx`, `apps/web/src/features/spaces/components/task-detail/TaskActivity.tsx`, `apps/web/src/features/mission-control/components/dialogs/ActivityTimelineLogItem.tsx`, `documentation/features/skill-recommendations.md`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-06-24 18:27] - [ARCH]

What: Split TrainingModal queue item dispatch into a private Brain training helper with mounted queue-submit coverage.
Why: `TrainingModal.tsx` still owned the service-facing text/link/file/media/Fathom/Fireflies dispatch switch inline after the earlier render splits.
Impact: The modal is down from 1,141 to 1,005 LOC, staged link/text queue submission is behavior-locked, direct cross-feature and style scans are clean for the touched files, and full web typecheck passes on the current tree.
Files: `apps/web/src/features/brain/components/training/TrainingModal.tsx`, `apps/web/src/features/brain/components/training/training-queue-dispatch.ts`, `apps/web/src/features/brain/components/training/TrainingModal.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 18:35] - [ARCH]

What: Split TrainingModal staging/link/default/signature/duplicate/preview helpers into a private Brain training helper.
Why: `TrainingModal.tsx` still owned pure staging helper logic inline after the queue-dispatch split.
Impact: The modal is down from 1,005 to 837 LOC, normalized duplicate link skipping and existing-source warnings are behavior-locked, and focused web tests/lint/typecheck pass.
Files: `apps/web/src/features/brain/components/training/TrainingModal.tsx`, `apps/web/src/features/brain/components/training/TrainingIntegrationPanes.tsx`, `apps/web/src/features/brain/components/training/training-staging-helpers.ts`, `apps/web/src/features/brain/components/training/TrainingModal.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 18:41] - [ARCH]

What: Split TrainingModal one-time source rail, main source pane, and staging panel composition into a private render-only tab component.
Why: `TrainingModal.tsx` still owned one-time tab layout JSX inline after the helper and dispatch splits.
Impact: The modal is down from 837 to 747 LOC, the moved body is covered by the mounted TrainingModal suite, and focused web tests/lint/typecheck pass.
Files: `apps/web/src/features/brain/components/training/TrainingModal.tsx`, `apps/web/src/features/brain/components/training/TrainingOneTimeTab.tsx`, `apps/web/src/features/brain/components/training/TrainingModal.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 18:44] - [ARCH]

What: Split TrainingModal integration/source status loading into a private hook.
Why: `TrainingModal.tsx` still owned source refresh, cloud attach status, Fathom/Fireflies status, connected rail derivation, and disconnected-source reset inline.
Impact: The modal is down from 747 to 657 LOC, integration rail/source behavior remains covered by the mounted TrainingModal suite, and focused web tests/lint/typecheck pass.
Files: `apps/web/src/features/brain/components/training/TrainingModal.tsx`, `apps/web/src/features/brain/components/training/use-training-modal-integrations.ts`, `apps/web/src/features/brain/components/training/TrainingModal.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 18:59] - [ARCH]

What: Split TrainingModal staging state, bulk metadata, duplicate-warning refresh, staging helpers, and paste handling into a private Brain training hook.
Why: `TrainingModal.tsx` was still above the frontend component cap after the integration-status hook split.
Impact: `TrainingModal.tsx` is down from 657 to 398 LOC, `use-training-staging-state.ts` is 285 LOC, staging behavior remains covered by mounted TrainingModal tests, and focused web tests/lint/typecheck pass.
Files: `apps/web/src/features/brain/components/training/TrainingModal.tsx`, `apps/web/src/features/brain/components/training/use-training-staging-state.ts`, `apps/web/src/features/brain/components/training/training-staging-helpers.ts`, `apps/web/src/features/brain/components/training/TrainingModal.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 19:11] - [FEATURE]

What: Added shared Dream Ops scheduling, run tracking, and outbox routing for Atlas Company Dreams and Jaime Agent Learning Dreams.
Why: Atlas and Jaime needed one evidence-gated nightly/background intelligence pattern instead of separate cron-like paths, and Jaime needed a real scheduled loop for agent skill/file improvement proposals.
Impact: Company Cortex settings now sync into `dream_ops_settings`, Brain Ops no longer queues company dreams directly, Jaime dreams materialize from the existing skill recommendation opt-in, empty evidence windows do not queue work, Atlas and Jaime runs are persisted in `dream_ops_runs`, and Jaime proposals still flow through `skill_recommendations`.
Files: `supabase/migrations/20260624203000_shared_dream_ops.sql`, `apps/mission-worker/src/modules/dream-ops`, `apps/mission-worker/src/modules/brain-ops/brain-ops-night-janitor.service.ts`, `apps/mission-worker/src/modules/brain-ops/brain-ops.module.ts`, `apps/mission-worker/src/app.module.ts`, `apps/mission-worker/src/config/configuration.ts`, `apps/api/src/modules/brain/repositories/company-cortex.repository.ts`, `apps/api/src/modules/brain/services/company-cortex.service.ts`, `apps/api/src/modules/skill-recommendations/repositories/skill-recommendations.repository.ts`, `apps/api/src/modules/skill-recommendations/services/skill-recommendations.service.ts`, `documentation/features/dream-ops.md`, `documentation/features/skill-recommendations.md`

## [2026-06-24 19:26] - [ARCH]

What: Added mounted CampaignAddInfoPanel characterization coverage and split its pure helpers plus Fathom dialog rendering into private Brain files.
Why: `CampaignAddInfoPanel.tsx` remained a Phase 3 frontend god-file target after the TrainingModal cleanup.
Impact: `CampaignAddInfoPanel.tsx` is down from 1,356 to 1,188 LOC, manual text/link/Fathom import behavior is covered by mounted tests, the new files are under frontend caps and scan clean for cross-feature/style findings, and full web typecheck passes after aligning an already-dirty Studio prop contract blocker.
Files: `apps/web/src/features/brain/components/CampaignAddInfoPanel.tsx`, `apps/web/src/features/brain/components/CampaignAddInfoFathomDialog.tsx`, `apps/web/src/features/brain/components/campaign-add-info-helpers.ts`, `apps/web/src/features/brain/components/CampaignAddInfoPanel.test.tsx`, `apps/web/src/features/brain/components/campaign-add-info-helpers.test.ts`, `apps/web/src/features/studio/components/message-bubble/MessageBubbleOrderedBlocks.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 19:36] - [ARCH]

What: Added mounted Fireflies import coverage and split CampaignAddInfoPanel Fireflies dialog rendering into a private Brain component.
Why: `CampaignAddInfoPanel.tsx` still owned Fireflies modal JSX inline after the Fathom dialog split.
Impact: `CampaignAddInfoPanel.tsx` is down from 1,188 to 1,126 LOC, Fireflies transcript loading/import queuing is behavior-locked, and focused web tests/lint/typecheck pass.
Files: `apps/web/src/features/brain/components/CampaignAddInfoPanel.tsx`, `apps/web/src/features/brain/components/CampaignAddInfoFirefliesDialog.tsx`, `apps/web/src/features/brain/components/CampaignAddInfoPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 19:41] - [ARCH]

What: Added mounted import-menu provider coverage and split CampaignAddInfoPanel import dropdown rendering into a private Brain component.
Why: `CampaignAddInfoPanel.tsx` still owned the import trigger, portaled menu, cloud rows, provider rows, and hidden file input inline.
Impact: `CampaignAddInfoPanel.tsx` is down from 1,126 to 1,056 LOC, Drive/Dropbox/Media Library menu actions are behavior-locked, and focused web tests/lint/typecheck pass.
Files: `apps/web/src/features/brain/components/CampaignAddInfoPanel.tsx`, `apps/web/src/features/brain/components/CampaignAddInfoImportMenu.tsx`, `apps/web/src/features/brain/components/CampaignAddInfoPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 19:45] - [ARCH]

What: Added mounted domain-selection coverage and split CampaignAddInfoPanel domain dropdown rendering into a private Brain component.
Why: `CampaignAddInfoPanel.tsx` still owned the domain selector portal, positioning, and click-outside state inline.
Impact: `CampaignAddInfoPanel.tsx` is down from 1,056 to 972 LOC, selected-domain import payload behavior is locked, and focused web tests/lint/typecheck pass.
Files: `apps/web/src/features/brain/components/CampaignAddInfoPanel.tsx`, `apps/web/src/features/brain/components/CampaignAddInfoDomainSelect.tsx`, `apps/web/src/features/brain/components/CampaignAddInfoPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 19:54] - [ARCH]

What: Added mounted image import coverage and split CampaignAddInfoPanel text/link/image tab rendering into a private Brain component.
Why: `CampaignAddInfoPanel.tsx` still owned the tab panel body inline after the Fathom, Fireflies, import-menu, and domain splits.
Impact: `CampaignAddInfoPanel.tsx` is down from 972 to 780 LOC, text/link/image import behavior is covered by mounted tests, and focused web tests/lint/typecheck pass.
Files: `apps/web/src/features/brain/components/CampaignAddInfoPanel.tsx`, `apps/web/src/features/brain/components/CampaignAddInfoTabPanels.tsx`, `apps/web/src/features/brain/components/CampaignAddInfoPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 20:08] - [ARCH]

What: Moved CampaignAddInfoPanel local/cloud/media/image import orchestration into a private hook and added mounted local-file import coverage.
Why: Continue Phase 3 frontend LOC decomposition without changing Brain campaign import behavior.
Impact: CampaignAddInfoPanel drops to 605 LOC; file/media/image import behavior remains covered by mounted tests and focused verification.
Files: `apps/web/src/features/brain/components/CampaignAddInfoPanel.tsx`, `apps/web/src/features/brain/components/use-campaign-add-info-media-imports.ts`, `apps/web/src/features/brain/components/CampaignAddInfoPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 20:12] - [FEATURE]

What: Replaced Jaime Agent Learning Dream strict JSON output with a Dream Ops tool loop and internal `dream_*` proposal actions.
Why: Jaime needs to inspect evidence, create multiple proposals, route platform/system issues, and finish dreams through reliable tools instead of one model JSON response.
Impact: Dream Ops sessions now use dedicated session keys and lanes, HR dream sessions expose proposal tools dynamically, proposal rows link to `source_dream_run_id`, the runner counts tool-created recommendations, normal HR chat remains without dream actions, and HR runtime guidance now documents the proposal-only boundary.
Files: `apps/mission-worker/src/modules/dream-ops`, `apps/mission-worker/src/modules/missions/services/agent-runtime.service.ts`, `apps/mission-worker/src/modules/missions/services/gateways/mission-openclaw.gateway.ts`, `apps/agent-api/src/modules/artifacts`, `apps/agent-api/src/modules/agent-sync`, `packages/agent-policy/src`, `docker/tools/vibey-backend/index.ts`, `docker/agents/hr/skills`, `supabase/migrations/20260624214500_dream_ops_skill_recommendation_link.sql`, `documentation/features/dream-ops.md`, `documentation/features/skill-recommendations.md`

## [2026-06-24 20:18] - [ARCH]

What: Finished CampaignAddInfoPanel LOC decomposition by moving call-import and text/recording orchestration into private hooks.
Why: Phase 3 frontend cleanup required the Brain campaign add-info panel to fall under the 400-line component cap without changing import behavior.
Impact: CampaignAddInfoPanel is down to 327 LOC; mounted tests cover 13 CampaignAddInfo behaviors, and focused lint/typecheck pass without a max-lines override.
Files: `apps/web/src/features/brain/components/CampaignAddInfoPanel.tsx`, `apps/web/src/features/brain/components/use-campaign-add-info-call-imports.ts`, `apps/web/src/features/brain/components/use-campaign-add-info-text-imports.ts`, `apps/web/src/features/brain/components/CampaignAddInfoPanel.calls.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 20:37] - [FEATURE]

What: Renamed Jaime learning-loop candidate, job, and proposal storage from legacy skill-recommendation table names to Agent Improvement names.
Why: Agent file and skill-resource proposals now share the same approval pipeline, so the physical proposal tables should not imply skill-only storage.
Impact: Code now reads and writes `agent_improvement_candidates`, `agent_improvement_jobs`, and `agent_improvement_proposals`; the migration renames tables, indexes, constraints, policies, triggers, dedupe keys, and the candidate enqueue function while keeping `skill_recommendation_events` as the repeatable-skill evidence stream.
Files: `supabase/migrations/20260624173214_rename_agent_improvement_proposal_tables.sql`, `supabase/migrations/20260624214500_dream_ops_skill_recommendation_link.sql`, `apps/api/src/modules/skill-recommendations/repositories/skill-recommendations.repository.ts`, `apps/api/src/modules/skill-recommendations/repositories/agent-learning-loop.repository.ts`, `apps/api/src/modules/skill-recommendations/services/skill-recommendation-jobs.service.ts`, `apps/api/src/modules/skill-recommendations/services/__tests__/skill-recommendation-detection.service.test.ts`, `apps/api/src/modules/skill-recommendations/services/__tests__/skill-recommendation-jobs.service.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-dream-ops.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-dream-ops.service.test.ts`, `apps/mission-worker/src/modules/dream-ops/dream-ops.repository.ts`, `apps/admin/src/app/(protected)/errors/page.tsx`, `documentation/features/skill-recommendations.md`, `documentation/features/dream-ops.md`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 20:38] - [ARCH]

What: Added mounted TrainingPanel characterization coverage and split its text/link/image tab UI into private Brain components.
Why: `TrainingPanel.tsx` is the remaining active Brain upload/import god-file target after TrainingModal and CampaignAddInfoPanel were decomposed.
Impact: `TrainingPanel.tsx` is down from 1,436 to 1,092 LOC; new tab/dropdown files are under the component cap, manual text/link/image behavior is covered by mounted tests, and focused tests/lint/typecheck pass.
Files: `apps/web/src/features/brain/components/TrainingPanel.tsx`, `apps/web/src/features/brain/components/TrainingPanelTabPanels.tsx`, `apps/web/src/features/brain/components/TrainingPanelMetadataFields.tsx`, `apps/web/src/features/brain/components/TrainingPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 20:54] - [ARCH]

What: Split TrainingPanel import-menu, local/cloud file, media-library, and image import orchestration into private Brain files.
Why: `TrainingPanel.tsx` still owned import/media state and handlers inline after the first tab-rendering split.
Impact: `TrainingPanel.tsx` is down from 1,092 to 779 LOC; import menu routing and local text-file import behavior are covered by mounted tests, and focused tests/lint/typecheck pass.
Files: `apps/web/src/features/brain/components/TrainingPanel.tsx`, `apps/web/src/features/brain/components/TrainingPanelImportMenu.tsx`, `apps/web/src/features/brain/hooks/use-training-panel-imports.ts`, `apps/web/src/features/brain/hooks/training-panel-file-import.ts`, `apps/web/src/features/brain/components/TrainingPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 20:58] - [FIX]

What: Normalized task activity agent mentions so `@` shows agent display names and `@@` agent chips carry `agent_key` for the existing task-agent comment trigger.
Why: `@` mentions were rendering agent internal keys, while `@@` agent entity mentions only stored `entity_id`, so they were saved as mentions but skipped by the Spaces API agent-work trigger.
Impact: Task activity and Send to agent composers now use display names for agents, scoped `@@` People can use the same member source as `@`, and both mention syntaxes flow through the same backend invocation path without adding a second frontend invoke.
Files: `apps/web/src/lib/channels/mention-parser.ts`, `apps/web/src/lib/channels/mention-parser.test.ts`, `apps/web/src/features/spaces/lib/task-composer-members.ts`, `apps/web/src/features/spaces/lib/__tests__/task-composer-members.test.ts`, `apps/web/src/features/channels/components/ChannelComposer.tsx`, `apps/web/src/features/spaces/components/task-detail/TaskActivity.tsx`, `apps/web/src/features/spaces/components/task-detail/SendTaskToAgentModal.tsx`, `documentation/features/lists.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 21:11] - [FEATURE]

What: Added a stop control for running task-agent work from task activity rows.
Why: Users could send work to an agent from task activity but had no way to stop the active process.
Impact: Running agent rows reveal a stop icon from the timestamp area on hover, the Spaces API exposes `cancel-agent` behind the same edit permission check, Agent API aborts the active task-agent stream through a cancel registry, and stopped runs persist as `cancelled` instead of generic failures.
Files: `apps/web/src/features/spaces/components/task-detail/TaskActivity.tsx`, `apps/web/src/features/spaces/components/task-detail/TaskDetailModal.tsx`, `apps/web/src/features/spaces/services/spaces.service.ts`, `apps/web/src/lib/spaces/space-item-types.ts`, `apps/api/src/modules/spaces/controllers/space-item-agent-actions.controller.ts`, `apps/api/src/modules/spaces/controllers/space-item-actions.controller.ts`, `apps/api/src/modules/spaces/services/spaces-service-01.base.ts`, `apps/api/src/modules/spaces/services/spaces-service-06.base.ts`, `apps/api/src/modules/spaces/spaces.module.ts`, `apps/agent-api/src/modules/task-agent/controllers/task-agent.controller.ts`, `apps/agent-api/src/modules/task-agent/controllers/agents-automation.controller.ts`, `apps/agent-api/src/modules/task-agent/services/task-agent-cancel-registry.service.ts`, `apps/agent-api/src/modules/task-agent/services/task-agent-cancel-registry.service.test.ts`, `apps/agent-api/src/modules/task-agent/services/task-agent-progress.service.ts`, `apps/agent-api/src/modules/task-agent/services/task-agent.service.ts`, `apps/agent-api/src/modules/task-agent/task-agent.module.ts`, `apps/agent-api/src/modules/task-agent/task-agent.types.ts`, `supabase/migrations/20260624210500_space_task_execution_cancelled.sql`, `documentation/features/lists.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 21:01] - [FEATURE]

What: Added a proper Jaime suggestion review modal for Home Agent Improvements and seeded a live demo recommendation for `sefy@olympus-digital.com` in the active Vibey org.
Why: Jaime suggestions need a real review surface before users apply or dismiss proposed skill and agent improvements.
Impact: Home suggestions now open a modal showing source, evidence count, target, proposal type, confidence, summary, recommended actions, patch preview, resources, apply/check/dismiss actions, and the demo row is available for live review.
Files: `apps/web/src/features/home/components/cards/SkillRecommendationsCard.tsx`, `apps/web/src/features/home/components/cards/AgentImprovementSuggestionModal.tsx`, `apps/web/src/features/home/components/cards/SkillRecommendationsCard.test.tsx`, `apps/web/src/features/home/config/agent-improvement-suggestions.config.ts`, `documentation/features/skill-recommendations.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 21:08] - [ARCH]

What: Split TrainingPanel Fathom and Fireflies call-import ownership into private Brain hook and dialog files.
Why: `TrainingPanel.tsx` still owned call import state, effects, and modal JSX inline after the import/media split.
Impact: `TrainingPanel.tsx` is down from 779 to 400 LOC; Fathom and Fireflies import behavior is covered by mounted tests, and focused tests/lint/typecheck pass.
Files: `apps/web/src/features/brain/components/TrainingPanel.tsx`, `apps/web/src/features/brain/components/TrainingPanelFathomDialog.tsx`, `apps/web/src/features/brain/components/TrainingPanelFirefliesDialog.tsx`, `apps/web/src/features/brain/hooks/use-training-panel-call-imports.ts`, `apps/web/src/features/brain/hooks/training-panel-call-import-helpers.ts`, `apps/web/src/features/brain/components/TrainingPanel.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 21:17] - [FIX]

What: Fixed the Agent Improvements Home card showing "Learning loops are off" when the Home endpoint failed during the proposal-table rename rollout.
Why: Settings reads `organizations.settings`, but Home reads proposal rows. Environments that had not applied the `agent_improvement_proposals` rename migration made Home throw and the card incorrectly converted that failure into a disabled setting.
Impact: The API now falls back to legacy `skill_recommendations` / `skill_recommendation_candidates` tables and normalizes rows to the proposal shape, while the Home card shows a load-error state if loading really fails.
Files: `apps/api/src/modules/skill-recommendations/repositories/skill-recommendations.repository.ts`, `apps/api/src/modules/skill-recommendations/repositories/skill-recommendations-legacy-tables.ts`, `apps/api/src/modules/skill-recommendations/services/__tests__/skill-recommendations.service.test.ts`, `apps/web/src/features/home/components/cards/SkillRecommendationsCard.tsx`, `apps/web/src/features/home/components/cards/SkillRecommendationsCard.test.tsx`, `documentation/features/skill-recommendations.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 21:27] - [ARCH]

What: Started NodeDetailModal LOC decomposition by moving delete confirmation and transfer destination dialogs into private Brain components.
Why: `NodeDetailModal.tsx` remains the largest active Brain Phase 3 frontend god-file after TrainingPanel reached the component cap.
Impact: `NodeDetailModal.tsx` is down from 1,272 to 1,098 LOC; mounted tests now cover direct delete and copy transfer behavior, and focused tests/lint/typecheck pass.
Files: `apps/web/src/features/brain/components/NodeDetailModal.tsx`, `apps/web/src/features/brain/components/NodeDetailDeleteDialog.tsx`, `apps/web/src/features/brain/components/NodeDetailTransferDialog.tsx`, `apps/web/src/features/brain/components/NodeDetailModal.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 21:41] - [ARCH]

What: Continued NodeDetailModal LOC decomposition by moving memory body, media preview, metric, progress, row, label, and section rendering into private Brain components.
Why: `NodeDetailModal.tsx` remains an active Phase 3 Brain god-file after the delete and transfer dialog split.
Impact: `NodeDetailModal.tsx` is down from 1,098 to 889 LOC; the new memory/primitives files are under the component cap, style and cross-feature scans are clean for the new files, and mounted coverage now locks the memory body plus existing delete/copy behavior.
Files: `apps/web/src/features/brain/components/NodeDetailModal.tsx`, `apps/web/src/features/brain/components/NodeDetailBodyPrimitives.tsx`, `apps/web/src/features/brain/components/NodeDetailMemorySection.tsx`, `apps/web/src/features/brain/components/NodeDetailModal.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 21:56] - [ARCH]

What: Continued NodeDetailModal LOC decomposition by moving knowledge-source, snapshot, structured-knowledge entry/source, and date/source formatting into private Brain files.
Why: `NodeDetailModal.tsx` still owned multiple read-only detail branches inline after the memory-body extraction.
Impact: `NodeDetailModal.tsx` is down from 889 to 662 LOC; mounted tests now cover knowledge, snapshot, SK entry, and SK source rendering; new files are under cap with clean style and cross-feature scans.
Files: `apps/web/src/features/brain/components/NodeDetailModal.tsx`, `apps/web/src/features/brain/components/NodeDetailKnowledgeSections.tsx`, `apps/web/src/features/brain/components/node-detail-formatters.ts`, `apps/web/src/features/brain/components/NodeDetailModal.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 21:56] - [FIX]

What: Fixed shared agent-turn feedback so task activity, chat, and mission rows keep selected thumbs, chips, text, and the Save button stable while saves run in the background.
Why: The detail popover was rebuilding visible chip state from the last server response, so a failed or stale initial thumb save could clear the selected thumb, remove the chips, and leave Save disabled.
Impact: Feedback now keeps a local draft as the UI truth while persistence is async, Save stays pressable, thumb buttons stay usable during in-flight saves, lookup responses no longer overwrite active drafts, and slower older saves cannot replace newer tag/text saves.
Files: `apps/web/src/components/chat/AgentTurnFeedbackActions.tsx`, `apps/web/src/components/chat/AgentTurnFeedbackActions.test.tsx`, `apps/web/src/lib/agent-feedback/use-agent-turn-feedback.ts`, `documentation/frontend-shared-surfaces.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 22:08] - [ARCH]

What: Continued NodeDetailModal LOC decomposition by moving company object/signal, belief, perspective, and experience rendering into a private Brain section file.
Why: `NodeDetailModal.tsx` still owned the remaining read-only cognition body branches inline after the knowledge-section split.
Impact: `NodeDetailModal.tsx` is down from 662 to 516 LOC; mounted cognition coverage locks the moved branches, new files stay under cap, and focused tests/lint/typecheck plus import/style scans pass.
Files: `apps/web/src/features/brain/components/NodeDetailModal.tsx`, `apps/web/src/features/brain/components/NodeDetailCognitionSections.tsx`, `apps/web/src/features/brain/components/NodeDetailModal.test.tsx`, `apps/web/src/features/brain/components/NodeDetailModal.cognition.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 22:13] - [ARCH]

What: Completed NodeDetailModal LOC decomposition by moving speaker lookup and node metadata branching into private Brain helpers.
Why: `NodeDetailModal.tsx` was still above the 400-line frontend component cap after the cognition section split.
Impact: `NodeDetailModal.tsx` is down from 516 to 383 LOC; mounted tests cover async speaker resolution and the moved render sections, and focused tests/lint/typecheck plus import/style scans pass.
Files: `apps/web/src/features/brain/components/NodeDetailModal.tsx`, `apps/web/src/features/brain/components/node-detail-meta.tsx`, `apps/web/src/features/brain/components/use-node-detail-speaker-name.ts`, `apps/web/src/features/brain/components/NodeDetailModal.test.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 22:38] - [ARCH]

What: Completed CortexMaxBrainView LOC decomposition by moving item modeling, search, section grouping, section rendering, and empty-shelf rendering into private Brain files.
Why: `CortexMaxBrainView.tsx` was still above the 400-line frontend component cap and mixed data shaping with view rendering.
Impact: `CortexMaxBrainView.tsx` is down from 675 to 201 LOC; mounted Cortex Max coverage locks customer-scope rendering, selection, member resolution, search filtering, and render stability, while `CortexMaxDetailPanel.tsx` remains the next logged Cortex LOC target.
Files: `apps/web/src/features/brain/components/CortexMaxBrainView.tsx`, `apps/web/src/features/brain/components/CortexMaxBrainView.test.tsx`, `apps/web/src/features/brain/components/CortexMaxSectionList.tsx`, `apps/web/src/features/brain/components/CortexMaxEmptyShelfMockup.tsx`, `apps/web/src/features/brain/components/cortex-max-view-model.ts`, `apps/web/src/features/brain/components/cortex-max-section-model.ts`, `apps/web/src/features/brain/components/cortex-max-search.ts`, `apps/web/src/features/brain/components/CortexMaxDetailPanel.tsx`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 22:51] - [ARCH]

What: Completed CortexMaxDetailPanel LOC decomposition by moving detail sections, meters, metadata, and formatters into private Brain files.
Why: `CortexMaxDetailPanel.tsx` was the next Cortex Max Phase 3 frontend god-file after the parent view split.
Impact: `CortexMaxDetailPanel.tsx` is down from 1,234 to 29 LOC; extracted files are under the component cap, mounted detail/view tests pass, and moved static palette styling now uses token/badge utilities.
Files: `apps/web/src/features/brain/components/CortexMaxDetailPanel.tsx`, `apps/web/src/features/brain/components/CortexMaxDetailPanel.test.tsx`, `apps/web/src/features/brain/components/CortexMaxCoreDetails.tsx`, `apps/web/src/features/brain/components/CortexMaxCustomerDetails.tsx`, `apps/web/src/features/brain/components/CortexMaxAvatarDetail.tsx`, `apps/web/src/features/brain/components/CortexMaxDetailMeters.tsx`, `apps/web/src/features/brain/components/CortexMaxDetailMetadataSection.tsx`, `apps/web/src/features/brain/components/cortex-max-detail-formatters.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 23:01] - [ARCH]

What: Started ForceGraph LOC decomposition by moving graph types, constants, helpers, shape primitives, and hover-card rendering into private Brain files.
Why: `ForceGraph.tsx` is the largest remaining Brain component after the Cortex Max cleanup.
Impact: `ForceGraph.tsx` is down from 1,516 to 1,101 LOC; mounted canvas smoke coverage now locks basic mount/control behavior, and the remaining render-loop/controller split is logged as the next ForceGraph slice.
Files: `apps/web/src/features/brain/components/ForceGraph.tsx`, `apps/web/src/features/brain/components/ForceGraph.test.tsx`, `apps/web/src/features/brain/components/BrainGraphHoverPeek.tsx`, `apps/web/src/features/brain/components/force-graph.types.ts`, `apps/web/src/features/brain/components/force-graph.constants.ts`, `apps/web/src/features/brain/components/force-graph-helpers.ts`, `apps/web/src/features/brain/components/force-graph-shapes.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 23:12] - [ARCH]

What: Continued ForceGraph LOC decomposition by moving simulation data shaping and organize-layout placement into private Brain helpers.
Why: `ForceGraph.tsx` still owned pure node/edge construction and layout algorithms inline after the first canvas split.
Impact: `ForceGraph.tsx` is down from 1,101 to 908 LOC; data/layout helper tests and the mounted canvas smoke test pass, while render-loop and pointer/controller extraction remain logged.
Files: `apps/web/src/features/brain/components/ForceGraph.tsx`, `apps/web/src/features/brain/components/force-graph-data.ts`, `apps/web/src/features/brain/components/force-graph-data.test.ts`, `apps/web/src/features/brain/components/force-graph-layouts.ts`, `apps/web/src/features/brain/components/force-graph-layouts.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 23:17] - [ARCH]

What: Continued ForceGraph LOC decomposition by moving force simulation physics into a private Brain helper.
Why: `ForceGraph.tsx` still owned velocity integration, edge attraction, repulsion, damping, and invalid-coordinate recovery inline.
Impact: `ForceGraph.tsx` is down from 908 to 835 LOC; physics helper tests and the mounted canvas smoke test pass, while frame drawing and pointer/controller extraction remain logged.
Files: `apps/web/src/features/brain/components/ForceGraph.tsx`, `apps/web/src/features/brain/components/force-graph-physics.ts`, `apps/web/src/features/brain/components/force-graph-physics.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 23:25] - [ARCH]

What: Continued ForceGraph LOC decomposition by moving canvas frame drawing and monochrome spotlight state into a private Brain renderer.
Why: `ForceGraph.tsx` still owned grid, edge, node, media-badge, and spotlight drawing inline after the physics split.
Impact: `ForceGraph.tsx` is down from 835 to 530 LOC; renderer helper tests and the mounted canvas smoke test pass, while pointer/viewport controller extraction remains logged.
Files: `apps/web/src/features/brain/components/ForceGraph.tsx`, `apps/web/src/features/brain/components/force-graph-renderer.ts`, `apps/web/src/features/brain/components/force-graph-renderer.test.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 23:31] - [ARCH]

What: Completed ForceGraph LOC decomposition by moving pointer hit testing, drag/pan handlers, hover id handling, and wheel zoom wiring into a private Brain controller.
Why: `ForceGraph.tsx` was still above the 400-line component cap after the frame renderer split.
Impact: `ForceGraph.tsx` is down from 530 to 379 LOC; mounted pointer coverage locks empty-canvas selection clearing, and the ForceGraph LOC follow-up is resolved.
Files: `apps/web/src/features/brain/components/ForceGraph.tsx`, `apps/web/src/features/brain/components/ForceGraph.test.tsx`, `apps/web/src/features/brain/components/force-graph-pointer.ts`, `apps/web/src/features/brain/components/force-graph-pointer.test.ts`, `apps/web/src/features/brain/components/force-graph.types.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 23:43] - [ARCH]

What: Completed LegendPanel LOC decomposition by moving legend row primitives, default/scope-specific sections, agent stats rendering, and label/color helpers into private Brain files.
Why: `LegendPanel.tsx` was the remaining Brain component above the 400-line component cap after ForceGraph.
Impact: `LegendPanel.tsx` is down from 744 to 252 LOC; mounted LegendPanel coverage now locks user, campaign, and agent Knowledge modes, and moved section headings use the existing `typo-section-label` utility.
Files: `apps/web/src/features/brain/components/LegendPanel.tsx`, `apps/web/src/features/brain/components/LegendPanel.test.tsx`, `apps/web/src/features/brain/components/LegendPanelDefaultSection.tsx`, `apps/web/src/features/brain/components/LegendPanelRows.tsx`, `apps/web/src/features/brain/components/LegendPanelScopeSections.tsx`, `apps/web/src/features/brain/components/LegendPanelSourcesSection.tsx`, `apps/web/src/features/brain/components/legend-panel-helpers.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`

## [2026-06-24 23:53] - [ARCH]

What: Completed Brain type LOC decomposition by splitting Customer Brain contracts and graph metadata out of `brain.types.ts`.
Why: `brain.types.ts` was still above the 500-line type target and mixed core graph/domain types with Customer Brain view contracts and render metadata constants.
Impact: `brain.types.ts` is down from 825 to 422 LOC; existing Brain type barrel imports remain compatible, and focused Brain graph/detail/Cortex tests plus full web typecheck pass.
Files: `apps/web/src/features/brain/types/brain.types.ts`, `apps/web/src/features/brain/types/brain-customer.types.ts`, `apps/web/src/features/brain/types/brain-graph-metadata.ts`, `apps/web/src/features/brain/types/brain-graph-metadata.test.ts`, `apps/web/src/features/brain/types/index.ts`, `apps/web/src/features/brain/index.ts`, `.docs/plans/architecture-compliance-remediation.md`, `.docs/plans/agent-follow-up-work.md`, `.docs/logs/changelog2026-06-24.md`
