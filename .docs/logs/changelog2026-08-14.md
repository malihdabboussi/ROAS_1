# Changelog - August 14, 2026

## [2026-08-14 17:05] - [FIX]

What: Stopped meeting workspaces from auto-opening the linked chat; Continue in chat (and recap/follow-up actions) is now the only switch. Seeded meeting prompts send into the linked conversation, and meeting-tagged threads restore meeting identity so Pixel does not ask which meeting.

Why: Opening a meeting while another chat was open stole that chat, fought the selected thread, and remounted the panel into an update-depth loop. Recap actions could also land in a new unlinked chat.

Impact: Users can open any meeting without losing the current conversation. Continue in chat and post-call actions still jump to the meeting thread with full awareness. Meeting recaps generated from that thread stay linked.

Files: `apps/web/src/features/home/components/MeetingWorkspaceDialog.tsx`, `apps/web/src/features/home/components/MeetingCallStatusSection.tsx`, `apps/web/src/components/global-chat/containers/GlobalChatPanel.tsx`, `apps/web/src/components/global-chat/hooks/use-meeting-conversation-awareness.ts`, `apps/web/src/components/global-chat/lib/meeting-conversation-awareness.ts`, `apps/web/src/lib/conversations/conversation-meeting-link.ts`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.logic.ts`, `documentation/features/meeting-follow-up-slack.md`, `documentation/features/claude-chatgpt-shell.md`.
