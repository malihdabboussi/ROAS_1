# Changelog - August 14, 2026

## [2026-08-14 10:30] - [FIX]

What: Split pinned chats into a collapsible Pinned section above Recents, matched Recents/Pinned section labels to Favorites (`hub-menu-section-label` + hover chevron beside the title), and persisted pin metadata through the conversation patch plus live chat-store merges so pinned rows actually leave Recents.

Why: Pinning only showed a pin icon inside the flat Recents list because history grouping was `none`, Recents used a different title class than Favorites, and the Recents chevron sat with far-right utilities. Store merges could also drop `metadata.pinned`.

Impact: Simple sidebar pinning moves the chat into Pinned above Recents. Pinned and Recents collapse independently. Favorites, Pinned, and Recents share the same section typography and hover chevron.

Files: `apps/web/src/lib/conversations/conversation-list-query.ts`, `apps/web/src/lib/conversations/conversation-list-sections.ts`, `apps/web/src/components/conversations/SpaceConversationsList.tsx`, `apps/web/src/components/conversations/SpaceConversationsHeader.tsx`, `apps/web/src/components/conversations/SpaceConversationSections.tsx`, `apps/web/src/components/layout/sidebar/SidebarSimpleRecents.tsx`, `apps/web/src/components/layout/sidebar/SidebarSimpleSection.tsx`, `apps/web/src/components/shell/ShellChatMenu.tsx`, `apps/web/src/components/shell/shell-chat-menu-pin.ts`, `documentation/features/claude-chatgpt-shell.md`, `documentation/features/programs.md`.

## 2026-08-14 10:35 - [FEATURE]

What: Added in-selector Mission and More submenus to chat Create, context-specific guided Mission names and visual treatment, exact Output-to-chat navigation, responsive Mission/subtask Overview and Activity views, a visible artifact-pane resize grip, and exact-message Reply in place of chat feedback thumbs.

Why: Mission launches, simultaneous receipts, narrow detail panes, and output/message navigation were ambiguous or difficult to use from the chat workspace.

Impact: Users can choose a Mission playbook without leaving Create, distinguish runs by playbook and Space, resize or switch narrow Mission details cleanly, reopen Outputs or locate their receipt, and reply to one assistant message with durable agent context.

Files: `apps/web/src/components/shell/*`, `apps/web/src/components/global-chat/lib/global-chat-seed-match*`, `apps/web/src/components/chat/AgentTurnFeedbackActions*`, `apps/web/src/features/mission-control/components/dialogs/MissionDetailDesktopShell*`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/playbooks/QuickMissionsHubModal*`, `apps/web/src/features/studio/components/ChatInput*`, `apps/web/src/features/studio/components/message-bubble/*`, `apps/web/src/lib/agent-feedback/use-agent-turn-feedback.ts`, `apps/agent-api/src/modules/chat/repositories/chat-runtime.repository.ts`, `apps/agent-api/src/modules/chat/services/chat-reference-context.service.ts`, `apps/agent-api/src/modules/chat/services/conversation-reference.util*`, `documentation/features/missions.md`, `documentation/features/claude-chatgpt-shell.md`.

## [2026-08-14 10:53] - [FEATURE]

What: Replaced the work-summary Campaign & space header with a Connections section above Outputs, routed Choose Space through the click-stable conversation scope picker (program headings → click campaign → spaces), defaulted Recents identity to Slack/meeting logos, and stopped route/HQ-rail/meeting-workspace background pages from stamping work context onto an already-open chat.

Why: Choose Space opened the composer plus-menu hover submenu and flashed shut; Recents used a generic identity dot; the summary treated scope as a header chip instead of a list section; and navigating Meetings/spaces while a chat was open attached that page to the thread.

Impact: Connections lists linked campaign/space with the same heading/row pattern as Sources/Tasks. New Chat Choose Space stays open until click-outside or Escape. Slack and meeting Recents rows show logos; activity dots stay for unread/work only. An open conversation keeps its own context while the user browses other pages.

Files: `apps/web/src/components/shell/ShellRightPanel.tsx`, `apps/web/src/components/shell/ShellRightPanelConnections.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/conversations/ConversationScopePicker.tsx`, `apps/web/src/components/conversations/ConversationScopePickerMenus.tsx`, `apps/web/src/components/conversations/conversation-scope-groups.ts`, `apps/web/src/components/conversations/SpaceConversationRows.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqRail.tsx`, `apps/web/src/features/home/components/MeetingWorkspaceDialog.tsx`, `apps/web/src/components/global-chat/store/use-global-chat-store.ts`, `documentation/features/claude-chatgpt-shell.md`, `documentation/frontend-shared-surfaces.md`.

## 2026-08-14 10:54 - [FIX]

What: Routed exact-message Reply seeds through the selected conversation's authoritative Space/Campaign scope so the mounted composer restores the referenced message chip before send.

Why: Production verification showed that the shell work context could lag the selected conversation, causing the Space-scoped chat panel to reject a Reply seed for the wrong panel.

Impact: Reply now visibly attaches the selected assistant message in the active conversation and sends that exact reference to the agent context pipeline.

Files: `apps/web/src/features/studio/components/message-bubble/AssistantActions.tsx`, `apps/web/src/features/studio/components/message-bubble/AssistantActions.test.tsx`.

## 2026-08-14 11:30 - [FIX]

What: Matched global chat seeds against the selected conversation's effective Space scope, the same scope used by the mounted composer.

Why: Home chat can host a Space-scoped conversation while the shell panel itself has no `spaceId`; matching against the shell prop rejected exact-message Reply seeds before the composer could restore them.

Impact: Exact-message Reply references now reach the visible composer even when a Space conversation is opened from the general home shell.

Files: `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`.

## 2026-08-14 11:42 - [FIX]

What: Restored exact-message references directly in the mounted composer when an attach seed targets that composer's conversation id.

Why: Production showed that panel-level seed orchestration could still drop a reference-only Reply handoff even after its Space scope matched; the composer already owns the authoritative conversation id and reference-chip state.

Impact: Reply reliably renders the selected assistant message as a removable composer chip without depending on shell scope or global active-conversation timing.

Files: `apps/web/src/features/studio/components/ChatInput.tsx`, `apps/web/src/features/studio/components/ChatInput/use-restored-message-references.ts`, `apps/web/src/features/studio/components/ChatInput/use-restored-message-references.test.ts`.

## 2026-08-14 11:51 - [FIX]

What: Routed assistant Reply and Fork actions through `MessageBubble`'s effective conversation id, including ordered-block messages.

Why: Space/Home chat already supplies an active conversation override for message rendering, but assistant actions still targeted each stored message row's conversation id, which could differ from the mounted composer.

Impact: Reply seeds target the visible conversation and are accepted by that conversation's composer instead of being silently ignored as belonging to another chat.

Files: `apps/web/src/features/studio/components/MessageBubble.tsx`, `apps/web/src/features/studio/components/MessageBubble.test.tsx`, `apps/web/src/features/studio/components/message-bubble/MessageBubbleOrderedBlocks.tsx`.
