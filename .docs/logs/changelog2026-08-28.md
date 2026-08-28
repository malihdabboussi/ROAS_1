# Changelog - August 28, 2026

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
