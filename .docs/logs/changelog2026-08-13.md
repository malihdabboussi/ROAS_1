# Changelog - August 13, 2026

## [2026-08-13 18:25] - [FIX]

What: Added the canonical Expand/Collapse control to the Mission artifact pane, kept it available in both parent Mission and subtask headers without adding a duplicate shell header, and normalized the touched Mission title field to the foreground utilities.

Why: Production verification showed Mission cards opened the correct third pane, but the Mission-specific renderer bypassed `ShellArtifactViewerPanel`, leaving only More and Close while documents and other artifacts exposed the requested pane expansion control.

Impact: Background Missions remain interactive beside chat, can expand over the work surface for focused review, collapse back to the resizable third column, and retain the existing close action.

Files: `apps/web/src/components/shell/ShellMissionArtifactViewerAdapter.tsx`, `apps/web/src/components/shell/ShellMissionArtifactViewerAdapter.test.tsx`, Mission detail modal/header/view files, `documentation/features/missions.md`.

## [2026-08-13 16:52] - [ARCH]

What: Added a unified company/client/campaign `agent_cases` ledger; decoupled complete Slack operational detection from the five-item briefing cap; made EOD refresh source threads before compilation; added one-time hard 24-hour unanswered-ask escalation; and routed Page Grader QC, Proactive Launch, Campaign QC, and Pixel offers through the same scoped lifecycle.

Why: Slack capture existed, but delivery ranking could permanently discard Bonnie-style client asks, QC producers sent separate messages without shared state, and the Slack-only ledger could not roll work up through the Clients Program, client campaign container, and campaign Spaces.

Impact: Every qualifying Slack ask is retained before delivery selection, resolved threads disappear before EOD, a still-open ask escalates at 24 hours, Page Grader actions synchronize with the shared case, offers resolve when delivered, and the legacy Slack table remains as a rollback copy until production verification is complete.

Files: `supabase/migrations/20260813170000_unified_agent_cases.sql`, Slack Team analysis/routing/delivery/open-item services and repositories, Page Grader Slack ingest and QC bridge, Pixel offer services, focused tests, `documentation/features/spaces-automation.md`, `documentation/features/integration-connections.md`, `documentation/features/page-grader-campaign-brain-sync.md`, `.docs/plans/agent-follow-up-work.md`.

## 2026-08-13 09:00 - [REFACTOR]

What: Centralized Quick Missions browser events in the missions domain utility and routed empty-chat Mission quick starts through the existing quick-start hook.

Why: Keep Mission launches consistent across Home, Space chat, and the shell Create catalog while removing branch-owned LOC growth from the allowlisted Space chat panel.

Impact: Mission quick starts still open the background-mission picker without seeding composer text; the Space chat panel returns to its architecture-baseline line count.

Files: `apps/web/src/lib/missions/quick-missions-events.ts`, `apps/web/src/lib/missions/index.ts`, `apps/web/src/components/shell/use-shell-chat-quick-start.ts`, `apps/web/src/components/shell/use-shell-chat-quick-start.test.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.test.tsx`, `apps/web/src/components/shell/ShellRightPanel.tsx`, `apps/web/src/components/global-chat/components/QuickMissionsHubHost.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/playbooks/QuickMissionsHubModal.tsx`, `documentation/utilities/quick-missions-events.md`, `documentation/utilities/README.md`, `.docs/plans/agent-follow-up-work.md`

## 2026-08-13 11:51 - [FIX]

What: Aligned the Chat conversation and artifact panes with one ownership model, added persisted artifact-pane resizing, routed every final-output card into the in-app artifact viewer, moved conversation actions beside the summary toggle, and made the left-side rename pencil hover/focus-only. Repaired the broad web test harness gaps exposed by the verification run.

Why: Mission and creation outputs must remain interactive beside their originating chat without duplicate pane toggles, browser-tab escapes, immovable panels, or stale navigation/test contracts.

Impact: Chat can keep multiple background Missions conversational while their Mission/artifact workspace opens, resizes, expands, collapses, and closes predictably. PDF, DOCX, project, widget, document, media, and typed artifact outputs all use the shell viewer. The complete web test suite now resolves the context workspace package and isolates sidebar data dependencies.

Files: `apps/web/src/components/conversations/ConversationHeaderTitle.tsx`, `apps/web/src/components/conversations/ConversationHeaderTitle.test.tsx`, `apps/web/src/components/conversations/index.ts`, `apps/web/src/components/shell/ShellArtifactViewerColumn.tsx`, `apps/web/src/components/shell/ShellArtifactViewerColumn.test.tsx`, `apps/web/src/components/shell/ShellArtifactViewerPanel.tsx`, `apps/web/src/components/shell/ShellArtifactViewerPanel.test.tsx`, `apps/web/src/components/shell/ShellTopBar.tsx`, `apps/web/src/components/shell/ShellTopBar.test.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/ShellWorkspace.test.tsx`, `apps/web/src/features/spaces/components/chat/SpaceChatHeaderActions.tsx`, `apps/web/src/features/spaces/components/chat/SpaceChatHeaderActions.test.tsx`, `apps/web/src/features/spaces/components/chat/SpaceChatPanelHeader.tsx`, `apps/web/src/features/spaces/components/chat/SpaceChatPanelHeader.test.tsx`, `apps/web/src/features/spaces/components/chat/SpaceConversationHeaderMenu.tsx`, `apps/web/src/features/spaces/components/chat/SpaceConversationHeaderMenu.test.tsx`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.types.ts`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/studio/components/message-bubble/FinalOutputCards.tsx`, `apps/web/src/features/studio/components/message-bubble/FinalOutputCards.test.tsx`, `apps/web/src/features/studio/components/message-bubble/open-final-output-in-shell.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-slash-data.test.ts`, `apps/web/tests/components.test.tsx`, `apps/web/vitest.config.ts`, `documentation/features/missions.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-08-13 12:05] - [FIX]

What: Reorganized Pixel's post-call Slack review into bold `Call Summary`, `Action Items`, and `Client Recap Message` sections; renamed the internal Fathom link to `Call Recording`; and kept legacy recording links out of the client-ready draft.

Why: The previous `Call report`, `Proposed action items`, and `Proposed shareable recap` labels did not clearly distinguish internal call context from the message intended for the client.

Impact: Review DMs are easier to scan, the client copy is visibly separated in the thread, and automatic internal-channel delivery retains a compact recording link without contaminating the client message.

Files: `apps/api/src/modules/spaces/services/meeting-follow-up-slack-message.ts`, `apps/api/src/modules/spaces/services/meeting-follow-up-slack-confirm.workflow.ts`, `apps/api/src/modules/spaces/services/__tests__/meeting-follow-up-slack-confirm.service.test.ts`, `docker/agents/vibey/skills/post-call-delivery/SKILL.md`, `supabase/migrations/20260813120500_update_post_call_delivery_message_boundaries.sql`, `documentation/features/meeting-follow-up-slack.md`.

## 2026-08-13 11:54 - [FIX]

What: Moved fresh Home-chat conversation reset ownership from the composer into the shell's `chat=starting` transition and added regression coverage for preventing a previously active conversation from replacing the new chat route.

Why: Signed-in Home sends could restore the prior conversation before the seeded message created its new thread, dropping the submitted message from the visible flow.

Impact: Home now preserves the previous conversation as a routing baseline, clears it when the starting surface mounts, and routes only after the newly created conversation becomes active.

Files: `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.test.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/ShellWorkspace.test.tsx`

## 2026-08-13 12:09 - [FIX]

What: Made the Home composer seed its existing default General Space instead of emitting a campaign-only seed, with regression coverage for the signed-in non-org-only account path.

Why: Campaign-only seeds cannot match the Space-backed global chat panel, so the queued Home message remained unconsumed on `chat=starting`.

Impact: Default Home sends now mount the matching General Space panel, create a fresh conversation, and stream the submitted message.

Files: `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.test.tsx`

## [2026-08-13 14:58] - [FIX]

What: Enabled Pixel's interactive browser for full funnel QC; preserved generated chat titles; required real Google Drive actions for Google Doc requests; added a connection preflight to manual Google Docs export; made the universal artifact column resizable; and removed the inert duplicate page-restore control.

Why: Pixel could scrape pages but could not click through JavaScript funnel states, successful turns overwrote concise generated titles with the first prompt, document artifacts were mistaken for Google Docs, disconnected exports opened and immediately closed a blank tab, and the right-side artifact host ignored its persisted width.

Impact: Funnel reviews can traverse buttons and rendered checkout states, Google Docs requests either return a real Drive document or a clear connection instruction, chat titles remain concise, and the bounded left history, chat, and right artifact columns are consistently resizable on desktop.

Files: `packages/agent-policy/src/platform-tools-template.ts`, `packages/agent-policy/src/platform-tools-template.test.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/agent-api/src/modules/shared/services/openclaw-gateway.service.ts`, `apps/agent-api/src/modules/shared/openclaw-gateway.visual-review.test.ts`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/ShellWorkspace.test.tsx`, `apps/web/src/components/shell/ShellWorkspaceRestoreControls.test.tsx`, `apps/web/src/features/spaces/components/docs/editor/DocEditorExportDropdown.tsx`, `apps/web/src/features/spaces/components/docs/editor/DocEditorHeaderActions.test.tsx`, `apps/web/src/features/studio/services/chat.service.ts`, `apps/web/src/lib/config/spaces-toast-errors.config.ts`, `apps/web/src/lib/conversations/conversation-title.ts`, `apps/web/src/lib/conversations/conversation-title.test.ts`, `documentation/features/claude-chatgpt-shell.md`.

## [2026-08-13 15:24] - [FIX]

What: Registered native Google Doc creation as a shared Google Drive agent capability and normalized Google Docs service aliases to the existing Drive connection.

Why: The UI correctly showed Google Drive enabled, but agent discovery treated Google Docs as a separate provider with no registered creation action, so Pixel falsely asked for another connection.

Impact: Pixel now reuses the enabled Google Drive account, discovers `create_google_doc`, and returns the created document ID/link. If that Drive account is genuinely unavailable, the existing integration repair card is shown instead.

Files: `supabase/migrations/20260813152000_google_drive_agent_doc_capability.sql`, `apps/agent-api/src/modules/shared/utils/integration-id.util.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/agent-api/src/modules/artifacts/services/google-drive-agent-doc-capability.test.ts`, `documentation/features/integration-connections.md`.

## [2026-08-13 15:34] - [FIX]

What: Simplified the universal chat `+` menu to photos/files, attachments, and integrations; removed Campaigns from Attach; made Home's Choose Space and Plugins buttons open their panels directly; and changed the microphone to present voice input versus live conversation before starting.

Why: The composer mixed creation, agent configuration, access policy, and context selection into one menu, dedicated shortcuts reopened that entire menu, and clicking voice input skipped the available mode choice.

Impact: Chat entry points now open focused, viewport-safe panels and users explicitly choose how they want to speak before audio begins.

Files: `apps/web/src/features/studio/components/ChatInput/chat-input-plus-menu-view.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-plus-menu.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-plus-controller.ts`, `apps/web/src/features/studio/components/ChatInput/chat-input-voice-send-controls.tsx`, related tests, `documentation/features/claude-chatgpt-shell.md`.

## [2026-08-13 15:43] - [FIX]

What: Added Program → Campaign → Space trees to Home and chat context selectors, changed shared program/campaign/space picker ordering to case-insensitive A–Z, and added direct detailed-workspace navigation for Programs, Brain, Team, Flows, and Meetings.

Why: Flat campaign/space lists produced indistinguishable `General` rows, selection order varied by surface, and high-level work context rows did not provide a clear route into their detailed workspace.

Impact: Scope selection now preserves its hierarchy, behaves consistently across shared chat, flow, mission, relocation, conversation, campaign hub, and sidebar selectors, and provides predictable detailed navigation.

Files: `apps/web/src/components/global-chat/components/GlobalChatComposerFooter.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, shared space/campaign/program grouping utilities and selectors, related tests, `documentation/features/claude-chatgpt-shell.md`.

## 2026-08-13 15:34 - [FIX]

What: Centered and widened the Spaces live-voice transcript, added minimize/restore controls with a floating in-chat voice player, and transparently retries one newly created session when the WebSocket reports an expired machine-local session.

Why: Live voice content rendered against the left edge, blocked navigation back to the normal chat, and occasionally exposed a transient `Voice session expired` failure that succeeded on manual retry.

Impact: Voice transcripts now occupy the central chat column, an active call can remain connected while the user works in the chat, and the first transient session-affinity failure recovers without user action.

Files: `apps/web/src/features/brain/hooks/use-brain-live-session.ts`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVoiceLiveTranscript.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVoiceSessionView.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVoiceSessionView.test.tsx`

## [2026-08-13 15:56] - [FIX]

What: Anchored the Home composer’s focused Choose Space and Plugins panels to the shelf buttons that opened them.

Why: The focused panels were correctly scoped after the composer cleanup, but they still calculated their position from the separate `+` trigger.

Impact: Each shelf shortcut now opens its panel beside the clicked control while the standard `+` catalog remains unchanged.

Files: `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input.types.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-plus-menu.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-plus-controller.ts`, related tests.

## [2026-08-13 15:57] - [FIX]

What: Moved the Quick Missions host to the persistent dashboard shell, made blank-chat Mission launches create and open their campaign/Space-scoped conversation before starting background work and saving the Mission receipt, and removed the disabled page-restore control when no restorable page exists.

Why: Production testing showed that the blank Home composer dispatched the Mission event while its only listener lived inside an active conversation panel, so the Mission quick start did nothing before a conversation existed. The post-merge shell matrix also exposed an inert second-pane restore control that contradicted its no-duplicate-control contract.

Impact: Mission works as the first action in a new chat, the created Mission retains its source conversation, the live Mission card appears in that same chat while work continues in the background, and the pane header shows only actionable controls.

Files: `apps/web/src/app/(dashboard)/dashboard-shell.tsx`, `apps/web/src/app/(dashboard)/dashboard-shell.test.tsx`, `apps/web/src/components/global-chat/components/QuickMissionsHubHost.tsx`, `apps/web/src/components/global-chat/components/QuickMissionsHubHost.test.ts`, `apps/web/src/components/global-chat/containers/GlobalChatPanel.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/features/spaces/components/playbooks/QuickMissionsHubModal.tsx`, `apps/web/src/features/spaces/components/playbooks/QuickMissionsHubModal.test.tsx`, `documentation/features/missions.md`, `.docs/plans/agent-follow-up-work.md`.

## [2026-08-13 16:05] - [FEATURE]

What: Added navigation-aware chat behavior for shared shell screens, including per-screen remembered conversations and a dismissible offer to switch when navigation finds a different prior chat. Removed the inert full-chat page restore control when no valid page exists.

Why: Sidebar navigation could restore an unrelated conversation because multiple screens shared the general chat pane and its persisted conversation state.

Impact: Navigation keeps the currently open chat, offers the destination screen's remembered chat without forcing a switch, and starts fresh when the open pane has no conversation. Space, Campaign, and channel chat scopes remain independent.

Files: `apps/web/src/components/shell/shell-screen-chat.config.ts`, `apps/web/src/components/shell/use-shell-store.screen-chat.ts`, `apps/web/src/components/shell/use-shell-workspace-screen-chat.ts`, `apps/web/src/components/shell/ShellScreenChatPrompt.tsx`, `apps/web/src/components/shell/ShellChatDrawer.tsx`, `apps/web/src/components/shell/use-shell-store.ts`, related shell tests, `documentation/features/claude-chatgpt-shell.md`.
## Meeting workspace hydration and follow-up quality

- Kept the meeting workspace in a visible loading state until recordings, recap, notes, and action items finish hydrating.
- Routed mirrored meeting follow-ups through the canonical Space task mutation and recorded completion provenance.
- Distinguished user-completed tasks from tasks reported complete by Fathom.
- Fixed newly added meeting notes returning a response wrapper instead of the saved note, and rendered relevant links immediately.
- Repaired provider Markdown embedded inside saved recap HTML and stripped Markdown emphasis from plain-text recap drafts.
- Updated recap and follow-up prompts to produce a useful first draft without stalling on missing dates.

## [2026-08-13 16:17] - [FIX]

What: Replaced the one-shot browser event used by Home, chat Create, and slash-command Mission launchers with shared reactive launcher state, and removed the obsolete event implementation.

Why: Production on the exact deployed commit proved the Mission button dispatched successfully while the persistent dashboard host did not observe the event, leaving the launcher closed. Event delivery was inherently lossy across shell mount and navigation timing.

Impact: Mission launch requests remain observable until the dashboard host closes them, including from blank Home chats, active-chat Create menus, and preset playbook slash commands.

Files: `apps/web/src/lib/missions/quick-missions-launcher.ts`, `apps/web/src/lib/missions/quick-missions-launcher.test.ts`, `apps/web/src/lib/missions/quick-missions-events.ts`, `apps/web/src/lib/missions/index.ts`, `apps/web/src/components/global-chat/components/QuickMissionsHubHost.tsx`, `apps/web/src/components/global-chat/components/QuickMissionsHubHost.test.ts`, `apps/web/src/components/shell/use-shell-chat-quick-start.ts`, `apps/web/src/components/shell/use-shell-chat-quick-start.test.tsx`, `apps/web/src/components/shell/ShellRightPanel.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-selection-handlers.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-selection-handlers.test.ts`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.test.tsx`, `documentation/features/missions.md`.

## [2026-08-13 16:32] - [FEATURE]

What: Added the Visual Campaign Orchestrator plan and the first semantic Canvas slice: deterministic webinar-funnel stage layouts, linked existing/URL asset content, typed missing-asset placeholders, placeholder handoff actions, and empty-Canvas Pixel/resource entry points.

Why: Canvas needs to represent a client's real campaign journey and its missing work, not only generic whiteboard objects.

Impact: Campaign maps can now be expressed as existing normalized Canvas operations without a second persistence model. Placeholder metadata survives editing and exposes Create, Attach, Assign, and Dismiss callbacks for the upcoming governed workflow handoff layer.

Files: `.docs/plans/visual-campaign-orchestrator-plan.md`, `apps/web/src/components/canvas/**`.

## [2026-08-13 17:15] - [FEATURE]

What: Completed the Visual Campaign Orchestrator vertical slice with governed Pixel blueprint and
placeholder-completion actions, deterministic webinar/VSL/Skool layouts, safe visual URL embeds,
canonical asset handoffs, campaign-aware Canvas chat prompts, and live proof against Yasir Khan
Coaching LTD.

Why: A campaign Canvas must be an operational visual map that Pixel can build from real client
context, not a disconnected workflow label or a static diagram.

Impact: Pixel can now discover Campaign context, build a revisioned Miro-style journey in visible
batches, represent missing work as actionable gaps, create canonical funnels/sequences/ads/missions,
and replace those gaps in place with linked ready assets. The live proof covers three campaign styles,
six visual URL embeds, 19 emails, nine ads, three funnels, and the native webinar fulfillment mission.

Files: `.docs/plans/visual-campaign-orchestrator-plan.md`, `apps/agent-api/src/modules/artifacts/**`,
`apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/web/src/components/canvas/**`,
`apps/web/src/features/team/components/AgentChatPanel.tsx`, `docker/tools/vibey-backend/index.ts`,
`packages/agent-policy/src/**`.
## [2026-08-13 16:30] - [FIX]

What: Moved empty-chat Mission routing into the shared quick-start component itself, removed the replaced Mission branch from the composer-seeding hook, and added a real Quick Missions host/modal integration test.

Why: Production on the durable-launcher deployment still showed the shared Mission pill traversing its generic composer callback without rendering the dialog. The previous tests verified the callback and host separately while mocking the real modal boundary.

Impact: Home and Space empty-chat Mission pills invoke the launcher directly, composer quick starts remain limited to prompt/capability seeding, and regression coverage renders the actual portaled Quick Missions dialog with Client Strategy.

Files: `apps/web/src/components/shell/ShellEmptyChatQuickStartPills.tsx`, `apps/web/src/components/shell/ShellEmptyChatPrompts.test.tsx`, `apps/web/src/components/shell/use-shell-chat-quick-start.ts`, `apps/web/src/components/shell/use-shell-chat-quick-start.test.tsx`, `apps/web/src/components/global-chat/components/QuickMissionsHubHost.integration.test.tsx`, `documentation/features/missions.md`.

## [2026-08-13 16:39] - [FIX]

What: Moved the Quick Missions host from the outer dashboard shell into the actual blank Home and active global chat surfaces, with explicit ownership tests for both surfaces and the shell.

Why: Three exact-production deployments contained the launcher action, reactive store, modal, and compiled dashboard host, but clicking Mission still produced no dialog. The outer host was compiled without participating in the live interactive chat tree.

Impact: Blank Home, active, Space, and drawer chats now mount exactly one Mission launcher beside the component that triggers it, while the dashboard shell no longer owns an ineffective detached host.

Files: `apps/web/src/app/(dashboard)/dashboard-shell.tsx`, `apps/web/src/app/(dashboard)/dashboard-shell.test.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.test.tsx`, `apps/web/src/components/global-chat/containers/GlobalChatPanel.tsx`, `apps/web/src/components/global-chat/containers/GlobalChatPanel.test.tsx`, `documentation/features/missions.md`.

## [2026-08-13 16:39] - [FIX]

What: Consolidated full-chat drawer controls around the Summary panel, moved conversation details beside the clickable rename title, removed the pencil and redundant page drawer, excluded chats and duplicate names from recent work, added destination icons, and changed the composer add glyph to a paperclip.

Why: Full conversations exposed competing drawer controls and a hidden Show page fallback, while recent work repeated chats already available in the left history.

Impact: Full chat has one predictable summary drawer; the three-dot menu sits beside the title, clicking the name renames it, recent work contains unique work surfaces only, and attachments use a recognizable paperclip entry point.

Files: `apps/web/src/components/conversations/ConversationHeaderTitle.tsx`, `apps/web/src/components/shell/ShellTopBar.tsx`, `apps/web/src/components/shell/ShellWorkAreaControl.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/use-shell-store.ts`, `apps/web/src/features/spaces/components/chat/SpaceChatHeaderActions.tsx`, `apps/web/src/features/spaces/components/chat/SpaceChatPanelHeader.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/studio/components/ChatInput/chat-input-normal-footer.tsx`, related tests, `documentation/features/claude-chatgpt-shell.md`.

## [2026-08-13 17:01] - [FIX]

What: Replaced the module-global Quick Missions launcher singleton with an explicit provider inside the blank Home and active global chat surfaces, and routed quick starts, Create-menu selections, summary Create, and playbook slash commands through that surface-owned state.

Why: Exact-production testing on the merged surface-host deployment proved that ordinary creation quick starts hydrated and changed the composer while Mission's global state transition did not reach the mounted modal consumer.

Impact: Every Mission trigger and its modal host now share one deterministic React tree, with isolated launcher state per chat surface and no dependency on cross-chunk singleton identity.

Files: `apps/web/src/lib/missions/quick-missions-launcher.ts`, `apps/web/src/components/global-chat/components/QuickMissionsHubHost.tsx`, `apps/web/src/components/global-chat/containers/GlobalChatPanel.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/shell/ShellEmptyChatQuickStartPills.tsx`, `apps/web/src/components/shell/ShellRightPanel.tsx`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-selection-handlers.ts`, related tests, `documentation/features/missions.md`.

## [2026-08-13 17:09] - [FIX]

What: Routed Mission selections through the stable `create-mission` catalog id instead of optional action metadata, and added dialog expansion semantics to the Mission quick-start button.

Why: Exact-production testing on the tree-scoped launcher deployment still showed Mission falling through without a dialog while Document from the same catalog seeded the composer successfully.

Impact: Empty-chat and summary Create surfaces recognize Mission from the canonical catalog identity, while production verification can directly observe whether the launcher state opened through `aria-expanded`.

Files: `apps/web/src/components/shell/shell-create-menu.config.ts`, `apps/web/src/components/shell/ShellEmptyChatQuickStartPills.tsx`, `apps/web/src/components/shell/ShellEmptyChatPrompts.test.tsx`, `apps/web/src/components/shell/ShellRightPanel.tsx`, `documentation/features/missions.md`.

## [2026-08-13 17:20] - [FIX]

What: Added controlled open support to the Quick Missions host and passed blank Home's Mission open callback and state directly between the composer, quick-start trigger, and modal host.

Why: Exact-production testing showed the canonical Mission button had the new expansion semantics but stayed `aria-expanded=false` immediately after click, proving its launcher hook resolved to the default context across a Next client-chunk boundary.

Impact: Blank Home Mission launch no longer depends on shared module or React context identity; the click updates state owned by the same composer instance that controls the modal.

Files: `apps/web/src/components/global-chat/components/QuickMissionsHubHost.tsx`, `apps/web/src/components/shell/ShellEmptyChatQuickStartPills.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.test.tsx`, `documentation/features/missions.md`.

## [2026-08-13 17:25] - [FIX]

What: Removed the webinar, VSL call-booking, and free Skool community campaign archetypes from the
Canvas product contract and replaced them with chat-derived stages and optional branching
connections. Added a fourth live five-day-challenge-to-cohort-enrollment proof.

Why: The original three campaign shapes were validation scenarios, not templates users should have
to choose from.

Impact: Pixel can compose a visual journey for any campaign described in chat, including custom
stage names and non-linear paths, while the original examples remain test evidence only.

Files: `apps/agent-api/src/modules/artifacts/services/campaign-blueprint-operations.ts`, action
schema/preflight/docs/tests, `apps/web/src/components/canvas/**`, and the implementation plan.
## [2026-08-13 17:29] - [FIX]

What: Moved empty-chat Mission open state and its controlled modal host into the quick-start component that renders the Mission button, and removed the replaced Home-level host wiring.

Why: Exact-production testing showed that even direct Home composer props did not reach the rendered Mission trigger, while adjacent composer quick starts remained interactive.

Impact: Blank Home and empty active-chat Mission buttons now update and consume state inside the same component instance, with no module, context, or parent callback boundary.

Files: `apps/web/src/components/shell/ShellEmptyChatQuickStartPills.tsx`, `apps/web/src/components/shell/ShellEmptyChatPrompts.test.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `documentation/features/missions.md`.

## [2026-08-13 17:42] - [FIX]

What: Preloaded Quick Missions client Spaces when the host mounts instead of starting a Space-store refresh during the opening click.

Why: Production showed locally owned Mission state still collapsed immediately; the open-gated `loadSpaces()` effect was the remaining synchronous side effect capable of remounting the Home composer and resetting that state.

Impact: Space selection data is ready before interaction, and opening Quick Missions is now a side-effect-free state transition that survives production Home rendering.

Files: `apps/web/src/components/global-chat/components/QuickMissionsHubHost.tsx`, `apps/web/src/components/global-chat/components/QuickMissionsHubHost.test.ts`, `documentation/features/missions.md`.

## [2026-08-13 17:55] - [FIX]

What: Start-aligned the nonwrapping empty-chat quick-start row inside its horizontal scroll viewport.

Why: Production geometry showed the 768px container began at x=347, but centering its oversized catalog placed Mission at x=77 beneath the 272px docked menu; the real pointer target was Favorites, while later items such as Document remained clickable.

Impact: Mission, Offer, and every early Create quick start begin inside the work surface and are directly clickable; remaining items continue horizontally through the existing scroll viewport.

Files: `apps/web/src/components/shell/ShellEmptyChatQuickStartPills.tsx`, `apps/web/src/components/shell/ShellEmptyChatPrompts.test.tsx`, `documentation/features/missions.md`.

## [2026-08-13 17:08] - [FIX]

What: Changed Agenda list weeks to Monday–Sunday with current-day positioning and earlier-week scrollback, made meeting-to-meeting navigation ignore a stale URL during an explicit selection, replaced leaked Fathom naming placeholders, and added inline task status plus right-side task preview to My Tasks.

Why: Late-week Agenda visits hid prior weekdays, switching between open meeting workspaces could make the old and new meeting effects reopen each other until React crashed, failed title enrichment exposed `Call (naming…)`, and task triage required opening every item as a full work surface.

Impact: The full week remains reviewable in chronological order, meeting switching is stable, generic recordings have a user-facing fallback title, and users can update statuses or inspect task details without losing their task queue.

Files: `apps/web/src/features/home/components/AgendaCard.tsx`, `AgendaCardChrome.tsx`, `AgendaCardListBody.tsx`, `agenda-list-grouping.tsx`, `MyTasksPanel.tsx`, `MyTasksInlineStatus.tsx`, `apps/web/src/features/home/lib/agenda-fetch-window.ts`, `apps/web/src/features/home/hooks/use-home-meeting-work-restore.ts`, Home Meetings/My Tasks page hosts, `apps/api/src/modules/spaces/services/fathom-meeting-title.ts`, `meetings-precall-related-calls.ts`, related tests, `.docs/features/meeting-merge.md`, `documentation/features/claude-chatgpt-shell.md`.

## [2026-08-13 17:21] - [FIX]

What: Routed Atlas Campaign Brain imports through `atlas_save_brain_context`, taught Atlas the campaign save contract, parsed nested OpenResponses output on both import runtimes, and made missing or failed terminal statuses fail closed.

Why: Production Slack capture was healthy, but Atlas was told to call the user-only memory action for campaign imports. Atlas reported the rejection inside a nested response envelope; the importer missed that status, marked the job successful, and advanced the Slack cursor without saving recent messages.

Impact: Campaign-targeted Slack and source imports use the mapped client campaign, rejected or malformed runs remain retryable, failed multi-chunk runs stop at the failing chunk, and a Slack mapping cursor advances only after a real completed or intentionally skipped import.

Files: `apps/api/src/modules/brain/services/brain-import-jobs-execution.base.ts`, `apps/api/src/modules/brain/services/__tests__/brain-import-jobs.service.test.ts`, `apps/agent-api/src/modules/brain-import-runtime/services/brain-import-runtime.service.ts`, `apps/agent-api/src/modules/brain-import-runtime/brain-import-runtime.service.test.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/agent-api/src/modules/agent-sync/services/agent-capability-source-drift.test.ts`, `docker/agents/atlas/TOOLS.md`, `docker/agents/atlas/skills/vibey-api/SKILL.md`, `documentation/features/page-grader-campaign-brain-sync.md`.

## [2026-08-13 17:15] - [UTIL]

What: Added a production-locked Slack-to-Campaign-Brain audit that checks capture, mapped import receipts, cursor state, Campaign Brain memories, embedding coverage, and real retrieval RPCs. Added a dry-run-first, bounded replay for falsely successful imports that requires an explicit fixed-runtime deployment assertion, plus the consolidated Pixel architecture and rollout plan.

Why: Production proved that Slack capture could be healthy while the Campaign Brain stayed empty and database jobs claimed success without an exact Atlas terminal receipt. Recovery needed to distinguish poisoned jobs from intentional skips and prevent replay against the old runtime.

Impact: Operators can prove every stage of Slack knowledge flow, fail rollout health when evidence is missing, identify the six exact Wholesale Universe jobs needing post-deploy replay, and recover them without rewinding every mapping or exposing Brain content to an external retrieval provider by default.

Files: `scripts/roas/audit_slack_brain_pipeline.py`, `scripts/roas/test_audit_slack_brain_pipeline.py`, `scripts/roas/README.md`, `.docs/plans/unified-slack-agent-consolidation-2026-08-13.md`.

## [2026-08-13 17:38] - [FIX]

What: Made Slack Brain recovery choose only the newest false-success row per user and import-period dedupe key, replay rows individually, and treat a concurrent active import as a safe skip instead of aborting the whole bounded batch.

Why: The first post-deploy recovery write was rejected atomically because historical duplicate success rows would both violate the active-job uniqueness contract when changed to retry.

Impact: No partial replay occurred. A retry batch can now recover independent canonical periods while preserving a newer live import as the winner, and the audit reports the exact Slack period on every candidate.

Files: `scripts/roas/audit_slack_brain_pipeline.py`, `scripts/roas/test_audit_slack_brain_pipeline.py`, `scripts/roas/README.md`.

## [2026-08-13 18:20] - [STYLE]

What: Restored the standard left content inset on inline task-detail panels and added regression coverage for the panel presentation.

Why: Opening a task from My Tasks rendered the breadcrumb, title, and task content flush against the split-pane divider even though the modal presentation had the expected spacing.

Impact: Task details opened from My Tasks, Meetings, Inbox, and other inline panel hosts now have a consistent readable left gutter without changing modal spacing.

Files: `apps/web/src/features/spaces/components/task-detail/TaskDetailPresentationShell.tsx`, `apps/web/src/features/spaces/components/task-detail/TaskDetailModal.test.tsx`, `.docs/plans/agent-follow-up-work.md`.

## [2026-08-13 17:44] - [FIX]

What: Taught both Brain import runtimes to decode bounded JSON-encoded response envelopes recursively, and changed Campaign Brain instructions to invoke `atlas_save_brain_context` through the exposed `campaign_capability` or `vibey_backend` tool.

Why: The first bounded production replay returned an honest nested `JOB_STATUS:failed`, but the envelope was stored as a JSON string and the prompt named a backend action as though it were a standalone runtime tool.

Impact: A nested Atlas failure can no longer be recorded as a successful import, and platform-mode campaign imports receive the exact tool-and-action contract required to write Slack knowledge into the Campaign Brain.

Files: `apps/api/src/modules/brain/services/brain-import-jobs-execution.base.ts`, `apps/api/src/modules/brain/services/__tests__/brain-import-jobs.service.test.ts`, `apps/agent-api/src/modules/brain-import-runtime/services/brain-import-runtime.service.ts`, `apps/agent-api/src/modules/brain-import-runtime/brain-import-runtime.service.test.ts`, `.docs/plans/unified-slack-agent-consolidation-2026-08-13.md`.

## [2026-08-13 17:56] - [FIX]

What: Made the production Slack Brain audit recursively decode bounded JSON-encoded Atlas receipts before classifying terminal status or selecting recovery candidates.

Why: After the corrected runtime deployment, the audit still reported every replayed row as missing a terminal marker because the actual OpenResponses envelope was stored inside `atlasResponse` as JSON text.

Impact: Recovery now distinguishes real nested failures, completions, and intentional skips before changing any production job state, preventing false replays and false health reports.

Files: `scripts/roas/audit_slack_brain_pipeline.py`, `scripts/roas/test_audit_slack_brain_pipeline.py`, `scripts/roas/README.md`.

## [2026-08-13 18:12] - [FIX]

What: Replaced the Atlas campaign router's document fallback with a direct Campaign Brain memory write that preserves Slack source/temporal identity and requires an embedding, and anchored unanswered-ask due times to the Slack source timestamp.

Why: The bounded production replay proved Atlas was now choosing the correct wrapper action, but that action still delegated campaign knowledge to `save_document`, which needs conversation context and cannot populate `ns_memories`. Ask breaches were also starting from delayed analysis time instead of the original message time.

Impact: Campaign imports can become source-grounded and intelligently retrievable from the mapped client Brain after deployment, General remains blocked as a client Brain target, failed embeddings fail closed, and the 24-hour response SLA is measured from the actual client ask.

Files: `apps/agent-api/src/modules/artifacts/services/artifact-campaign-brain-context.service.ts`, `artifact-atlas-brain-context.service.ts`, `artifact-brain-scholar.service.test.ts`, `apps/agent-api/src/modules/artifacts/artifacts.module.ts`, `apps/api/src/modules/spaces/services/slack-open-items.service.ts`, `slack-open-items.service.test.ts`, `.docs/plans/unified-slack-agent-consolidation-2026-08-13.md`, `documentation/features/page-grader-campaign-brain-sync.md`.

## [2026-08-13 18:13] - [FIX]

What: Made Home Quick Missions use the visible `?conv=` route as their source conversation and create a new scoped conversation when the route is blank, even if the persisted chat store still holds the previous conversation id.

Why: Production launched Client Strategy successfully from blank `/home`, but the URL and transcript stayed blank because the mission and receipt were silently attached to a stale hidden conversation retained in client state.

Impact: A mission started as the first action from Home now opens its own chat, records that chat in mission input, and renders its durable receipt in the visible transcript; populated Home chats and non-Home chat surfaces keep their existing source behavior.

Files: `apps/web/src/components/global-chat/components/QuickMissionsHubHost.tsx`, `apps/web/src/components/global-chat/components/QuickMissionsHubHost.test.ts`, `apps/web/src/components/global-chat/components/QuickMissionsHubHost.integration.test.tsx`, `documentation/features/missions.md`.

## [2026-08-13 18:38] - [FIX]

What: Added the existing Atlas-owned `atlas_save_brain_context` action to the system Brain capability allowlist and added regression coverage for its production authorization path.

Why: The direct Campaign Brain writer was deployed and fully declared in the action contract, schema, lifecycle, preflight, MCP catalog, and runtime handler, but Atlas's local capability policy still hid the routed save workflow from chat imports.

Impact: Atlas can invoke the source-preserving, embedding-required Campaign Brain writer during mapped Slack imports without granting that action to any other agent profile.

Files: `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts`, `apps/agent-api/src/modules/artifacts/services/artifacts.service.rbac.test.ts`, `.docs/plans/unified-slack-agent-consolidation-2026-08-13.md`, `documentation/features/page-grader-campaign-brain-sync.md`.

## [2026-08-13 18:52] - [FIX]

What: Made Mission OpenClaw SSE consumption stop on the first completed or failed terminal receipt, and made independent quality evaluation load the canonical contents of Mission artifacts, including the current linked Space document body.

Why: A production Client Strategy run emitted a successful `response.completed` receipt and HTTP 200, but a later transport `terminated` error caused an unnecessary retry. The same run's evaluator received only subtask summaries, could not inspect two valid native documents, and sent both tasks through an unnecessary revision cycle.

Impact: Successful Mission work is no longer reclassified by connection teardown after completion, and quality evaluation scores the actual deliverables instead of self-reported summaries while retaining receipt provenance.

Files: `apps/mission-worker/src/modules/missions/services/gateways/mission-openclaw-sse.ts`, `mission-openclaw-sse.test.ts`, `mission-quality-eval-context.ts`, `mission-quality-eval-context.test.ts`, `apps/mission-worker/src/modules/missions/services/persistence/mission-quality-evidence.repository.ts`, `mission-quality-evidence.repository.test.ts`, `apps/mission-worker/src/modules/missions/services/gateways/mission-openclaw.gateway.ts`, `apps/mission-worker/src/modules/missions/missions.module.ts`, `apps/mission-worker/src/modules/missions/services/__tests__/mission-tool-access-smoke.test.ts`, `documentation/features/missions.md`.

## [2026-08-13 18:57] - [FIX]

What: Added the same canonical Mission artifact packet used by independent quality evaluation to manager subtask review.

Why: The first production Client Strategy revision reached manager review with valid native documents, but the manager saw only summary receipts and rejected both subtasks because their full contents were not present in its review context.

Impact: Manager approval now evaluates the current artifact itself and cannot reject a readable Mission document merely because its worker receipt is concise.

Files: `apps/mission-worker/src/modules/missions/services/gateways/mission-openclaw.gateway.ts`, `apps/mission-worker/src/modules/missions/services/gateways/mission-quality-eval-context.ts`, `mission-quality-eval-context.test.ts`, `documentation/features/missions.md`.

## [2026-08-13 18:59] - [FIX]

What: Registered Mission canonical-evidence loading in every worker module that constructs `MissionOpenclawGateway`, with a module-metadata regression test for Brain Ops and Dream Ops.

Why: The first Railway image built successfully but crashed at startup because Brain Ops and Dream Ops each construct their own Mission gateway and did not provide its new evidence repository dependency.

Impact: The Mission worker can boot with canonical manager/evaluator evidence available across Mission, Brain Ops, and Dream Ops gateway instances.

Files: `apps/mission-worker/src/modules/brain-ops/brain-ops.module.ts`, `apps/mission-worker/src/modules/dream-ops/dream-ops.module.ts`, `apps/mission-worker/src/modules/missions/services/persistence/mission-quality-evidence.module.test.ts`.

## [2026-08-13 18:58] - [FIX]

What: Added a database-backed completion postcondition for campaign Slack imports and strengthened Atlas's campaign prompt to require a successful routed-save receipt.

Why: The first post-policy production replay called the rejected user-memory action, created no Campaign Brain row, and still emitted `JOB_STATUS:completed`, proving model prose alone could not safely advance the import cursor.

Impact: A campaign Slack job can succeed only when the mapped Campaign Brain contains at least one exact-source memory and every matching memory has a retrieval embedding. Missing persistence or indexing now enters the normal retry/failure lifecycle before cursor advancement.

Files: `apps/api/src/modules/brain/repositories/brain-import-jobs-runtime.repository.ts`, `apps/api/src/modules/brain/services/brain-import-jobs-runtime.base.ts`, `apps/api/src/modules/brain/services/brain-import-jobs-execution.base.ts`, `apps/api/src/modules/brain/services/__tests__/brain-import-jobs.service.test.ts`, `.docs/plans/unified-slack-agent-consolidation-2026-08-13.md`, `documentation/features/page-grader-campaign-brain-sync.md`.

## [2026-08-13 19:25] - [FIX]

What: Removed mapped Page Grader synchronization from the three-second Brain import enqueue endpoint and scheduled it as its own hourly BullMQ job through the existing dedicated catch-up route.

Why: Production worker logs showed overlapping Page Grader catch-up requests synchronously scanning up to 50 external clients until the Vercel API returned `FUNCTION_INVOCATION_TIMEOUT`. The code described the work as hourly but attached it to the Brain sweep's three-second cadence.

Impact: Brain due-job discovery stays fast and bounded, Page Grader retains its intended hourly reconciliation, and repeated external package pulls can no longer saturate the Vercel function window every three seconds.

Files: `apps/api/src/modules/brain/services/brain-import-jobs-runtime.base.ts`, `apps/api/src/modules/brain/services/__tests__/brain-import-sweep-schedule.test.ts`, `apps/api/src/modules/internal/controllers/internal-brain-import-jobs.controller.ts`, `apps/api/src/modules/internal/internal.controller.test.ts`, `apps/mission-worker/src/modules/agent-runtime/processors/agent-runtime-brain-import.processor.ts`, `apps/mission-worker/src/modules/agent-runtime/processors/agent-runtime-brain-import.processor.test.ts`, `documentation/features/page-grader-campaign-brain-sync.md`.

## [2026-08-13 18:49] - [FIX]

What: Kept Mission viewer expansion inside the shell adapter and removed the shell-owned React action element from the Mission detail modal, view, desktop shell, and header prop chain. Strengthened the shell adapter regression test to reject reintroducing that injected prop.

Why: Production deployment `dpl_7zTJRg23S9WLeF4x3LceEwBEhgDL` began crashing `/home/my-tasks` with React error 185 after Mission pane expansion injected a newly created header action through the live Mission activity tree. The original test stubbed that tree and missed the render loop.

Impact: Persisted Mission viewers can render alongside My Tasks without taking down the page, while users retain the same expand/collapse control as a shell-owned overlay.

Files: `apps/web/src/components/shell/ShellMissionArtifactViewerAdapter.tsx`, `apps/web/src/components/shell/ShellMissionArtifactViewerAdapter.test.tsx`, `apps/web/src/features/mission-control/components/dialogs/MissionDetailModal.tsx`, `apps/web/src/features/mission-control/components/dialogs/MissionDetailModalView.tsx`, `apps/web/src/features/mission-control/components/dialogs/mission-detail-modal-view.types.ts`, `apps/web/src/features/mission-control/components/dialogs/mission-detail-modal-helpers.ts`, `apps/web/src/features/mission-control/components/dialogs/MissionDetailDesktopShell.tsx`, `apps/web/src/features/mission-control/components/dialogs/MissionDetailHeader.tsx`, `apps/web/src/features/mission-control/components/dialogs/SubtaskDetailHeader.tsx`, `apps/web/src/features/mission-control/components/dialogs/MissionDetailModal.test.tsx`.

## [2026-08-13 19:46] - [FIX]

What: Grounded Pixel's EOD Slack recap in current operational state by recognizing nearby non-thread channel answers, refusing to persist mixed completed/pending status recaps as one open commitment, supplying the exact local date to composition, and rejecting vague roadmap language or future claims tied to past dates. Repaired the two exact production cases behind the reported recap as answered/resolved.

Why: Pixel resurfaced an answered design request under the wrong client and changed a Yasir source update that explicitly said the ads were DONE/live on August 11 into “scheduled to go live” after that date.

Impact: The two incorrect items can no longer resurface, answered asks stop resurfacing when teammates respond normally in-channel, composite roadmaps cannot become stale commitments, and unsafe recap prose falls back to deterministic source-grounded text instead of being sent.

Files: `apps/api/src/modules/slack/services/slack-signal-resolution.service.ts`, `apps/api/src/modules/slack/services/__tests__/slack-signal-resolution.service.test.ts`, `apps/api/src/modules/spaces/services/slack-open-items.service.ts`, `apps/api/src/modules/spaces/services/__tests__/slack-open-items.service.test.ts`, `apps/api/src/modules/spaces/services/slack-team-message-composer.service.ts`, `apps/api/src/modules/spaces/services/__tests__/slack-team-message-composer.service.test.ts`, `documentation/features/spaces-automation.md`.

## [2026-08-13 19:53] - [FIX]

What: Restored the hover-only rename pencil before the conversation title and moved conversation details beside the summary controls in the full chat pane's top-right control group.

Why: A later header simplification regressed the ChatGPT-style placement delivered by the chat Missions work, leaving the three-dot menu beside the agent picker and removing the rename affordance the design requires.

Impact: Full chat headers again keep their pane controls together at the second pane's top-right, reserve enough title space for both controls, and reveal the left-side pencil on title hover or keyboard focus.

Files: `apps/web/src/components/conversations/ConversationHeaderTitle.tsx`, `apps/web/src/components/conversations/ConversationHeaderTitle.test.tsx`, `apps/web/src/features/spaces/components/chat/SpaceChatPanelHeader.tsx`, `apps/web/src/features/spaces/components/chat/SpaceChatPanelHeader.test.tsx`.
