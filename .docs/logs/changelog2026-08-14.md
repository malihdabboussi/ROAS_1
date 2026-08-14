# Changelog - August 14, 2026

## [2026-08-14 10:53] - [FEATURE]

What: Replaced the work-summary Campaign & space header with a Connections section above Outputs, routed Choose Space through the click-stable conversation scope picker (program headings → click campaign → spaces), defaulted Recents identity to Slack/meeting logos, and stopped route/HQ-rail/meeting-workspace background pages from stamping work context onto an already-open chat.

Why: Choose Space opened the composer plus-menu hover submenu and flashed shut; Recents used a generic identity dot; the summary treated scope as a header chip instead of a list section; and navigating Meetings/spaces while a chat was open attached that page to the thread.

Impact: Connections lists linked campaign/space with the same heading/row pattern as Sources/Tasks. New Chat Choose Space stays open until click-outside or Escape. Slack and meeting Recents rows show logos; activity dots stay for unread/work only. An open conversation keeps its own context while the user browses other pages.

Files: `apps/web/src/components/shell/ShellRightPanel.tsx`, `apps/web/src/components/shell/ShellRightPanelConnections.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/conversations/ConversationScopePicker.tsx`, `apps/web/src/components/conversations/ConversationScopePickerMenus.tsx`, `apps/web/src/components/conversations/conversation-scope-groups.ts`, `apps/web/src/components/conversations/SpaceConversationRows.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqRail.tsx`, `apps/web/src/features/home/components/MeetingWorkspaceDialog.tsx`, `apps/web/src/components/global-chat/store/use-global-chat-store.ts`, `documentation/features/claude-chatgpt-shell.md`, `documentation/frontend-shared-surfaces.md`.

## [2026-08-14 10:30] - [FIX]

What: Split pinned chats into a collapsible Pinned section above Recents, matched Recents/Pinned section labels to Favorites (`hub-menu-section-label` + hover chevron beside the title), and persisted pin metadata through the conversation patch plus live chat-store merges so pinned rows actually leave Recents.

Why: Pinning only showed a pin icon inside the flat Recents list because history grouping was `none`, Recents used a different title class than Favorites, and the Recents chevron sat with far-right utilities. Store merges could also drop `metadata.pinned`.

Impact: Simple sidebar pinning moves the chat into Pinned above Recents. Pinned and Recents collapse independently. Favorites, Pinned, and Recents share the same section typography and hover chevron.

Files: `apps/web/src/lib/conversations/conversation-list-query.ts`, `apps/web/src/lib/conversations/conversation-list-sections.ts`, `apps/web/src/components/conversations/SpaceConversationsList.tsx`, `apps/web/src/components/conversations/SpaceConversationsHeader.tsx`, `apps/web/src/components/conversations/SpaceConversationSections.tsx`, `apps/web/src/components/layout/sidebar/SidebarSimpleRecents.tsx`, `apps/web/src/components/layout/sidebar/SidebarSimpleSection.tsx`, `apps/web/src/components/shell/ShellChatMenu.tsx`, `apps/web/src/components/shell/shell-chat-menu-pin.ts`, `documentation/features/claude-chatgpt-shell.md`, `documentation/features/programs.md`.
