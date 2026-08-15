# Changelog - August 15, 2026

## [2026-08-15 15:51] - [FEATURE]

What: Recents Filter now uses the same campaign/space picker as chat. Clicking a campaign or client name selects it without a nested Space, and the Filter row plus Choose Space control show that real name instead of "Space".

Why: Filtering Recents by a client required a Space, and the selected context stayed labeled Space so you could not see which campaign you were in.

Impact: Recents and Chats Filter include a Campaign row. Composer Choose Space and attached context chips show the campaign or Space name after selection. Chevron still opens nested spaces.

Files: `apps/web/src/components/conversations/ConversationScopePicker.tsx`, `apps/web/src/components/conversations/ConversationScopePickerMenus.tsx`, `apps/web/src/components/conversations/ChatHistoryFilterMenu.tsx`, `apps/web/src/components/conversations/ChatHistoryFilterScopeRow.tsx`, `apps/web/src/lib/conversations/conversation-list-query.ts`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-15 11:43] - [FEATURE]

What: Added idle chat Try tips above empty-composer quick starts. Hovering Try shows "Opens as a new task"; clicking it seeds a fresh Pixel chat with the matching prompt.

Why: People miss capabilities that already exist (@ mentions, /, Brain, decks, tasks). The streaming typewriter tips only appear while Pixel is answering.

Impact: Empty Home and Pixel chats show one dismissible tip at a time. Try opens a new task without replacing the current thread's draft after dismiss. Existing quick-start pills are unchanged.

Files: `apps/web/src/lib/chat/composer-try-tips.ts`, `apps/web/src/components/chat/ComposerTryTipBanner.tsx`, `apps/web/src/components/global-chat/components/ChatComposerTryTip.tsx`, `apps/web/src/components/global-chat/lib/global-chat-storage.ts`, `apps/web/src/components/shell/ShellEmptyChatQuickStartPills.tsx`, `documentation/frontend-shared-surfaces.md`

## [2026-08-15 11:55] - [FIX]

What: Render chat mermaid diagrams as React nodes instead of innerHTML placeholders that stay on "Rendering diagram…" and never hydrate.

Why: Hydration was skipped while the reply streamed, and every token refresh wiped any SVG that had started. The loading orb therefore often never resolved even though a finished diagram looks fine.

Impact: Pixel, agent-thread, channel, and tool-preview chats mount a real diagram as soon as the mermaid fence closes. Incomplete fences show a quiet Diagram label. Failed renders get Try again instead of disappearing.

Files: `apps/web/src/lib/utils/chat-markdown.utils.ts`, `apps/web/src/components/chat/ChatMarkdownDocument.tsx`, `apps/web/src/components/ui/mermaid-diagram.tsx`, `apps/web/src/features/studio/components/message-bubble/MarkdownContent.tsx`, `apps/web/src/features/studio/components/chat/AgentConversationThread.tsx`, `apps/web/src/features/channels/components/ChannelMessageBody.tsx`, `apps/web/src/features/studio/components/chat/ToolContentPreview.tsx`, `apps/web/src/features/studio/components/chat/ChatAttachmentPreviews.tsx`

## [2026-08-15 14:25] - [FIX]

What: Recents unread marks now overlay Slack, Telegram, and meeting logos instead of occupying a second left-column slot. Rows without a logo keep the standalone left-edge activity dot, and empty logo slots no longer reserve space.

Why: Unread chats without a channel/meeting icon were sliding their titles right into the logo column, and unread Slack/calendar rows stacked a dot plus the logo.

Impact: Identity-icon rows stay one column wide with a corner unread bubble. Plain chats still show the left unread dot.

Files: `apps/web/src/components/conversations/SpaceConversationRows.tsx`, `apps/web/src/components/conversations/ConversationRowLeadingIcon.tsx`, `apps/web/src/components/conversations/ConversationActivityIndicator.tsx`, `apps/web/src/lib/conversations/conversation-activity.ts`, `documentation/features/claude-chatgpt-shell.md`, `documentation/frontend-shared-surfaces.md`

## [2026-08-15 14:45] - [STYLE]

What: Removed the inline pin icon from conversation rows that already sit under a Pinned section header.

Why: The Pinned heading already marks those chats; the extra pin shifted the title and made pinned rows look different from Recents.

Impact: Simple-sidebar Pinned chats match Recents row chrome. Pin/unpin stays in the overflow menu. Mixed lists that do not use a Pinned heading still show the inline pin.

Files: `apps/web/src/components/conversations/SpaceConversationRows.tsx`, `apps/web/src/components/conversations/SpaceConversationsList.tsx`, `documentation/features/claude-chatgpt-shell.md`
