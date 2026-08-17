# Changelog - August 17, 2026

## [2026-08-17 00:00] - [FIX]

What: Connections / Choose Space / Recents Filter now default to Programs (hover to select a campaign), keep a searchable Clients list, pin General first in every client/campaign list, and label a connected General as `{parent} General`. Removed the composer context chip so Connections is the only attachment control.

Why: The picker started at clients, General was an ambiguous duplicate across ~100 spaces, and the composer pill duplicated Connections.

Impact: Users pick a program or search a client, then select that client's campaigns. A Yasir Khan General connection no longer reads as just General. Chat no longer shows an unrelated context pill.

Files: `apps/web/src/components/conversations/ConversationScopePicker.tsx`, `ConversationScopePickerMenus.tsx`, `conversation-scope-groups.ts`, `conversation-scope-sort.ts`, `conversation-scope-picker-layout.ts`, `apps/web/src/components/shell/ShellRightPanelConnections.tsx`, `apps/web/src/components/global-chat/containers/GlobalChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, docs

## [2026-08-17 00:04] - [REFACTOR]

What: Removed leftover `composerContextSlot` wiring and unused composer-chip label helpers after deleting the chat-input context pill.

Why: The pill duplicated Connections; keeping the slot and label helpers would leave a dead path to put it back.

Impact: Chat input no longer has a path to render a campaign/Space contacts pill. Attachment stays in Connections.

Files: `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `space-vibey-chat-panel.types.ts`, `apps/web/src/components/global-chat/config/work-context.config.ts`, `work-context.config.test.ts`
