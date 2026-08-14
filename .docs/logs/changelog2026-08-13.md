# Changelog - August 13, 2026

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
