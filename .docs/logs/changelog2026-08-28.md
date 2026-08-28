# Changelog - August 28, 2026

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
