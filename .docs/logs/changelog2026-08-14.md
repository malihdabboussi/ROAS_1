# Changelog - August 14, 2026

## 2026-08-14 10:35 - [FEATURE]

What: Added in-selector Mission and More submenus to chat Create, context-specific guided Mission names and visual treatment, exact Output-to-chat navigation, responsive Mission/subtask Overview and Activity views, a visible artifact-pane resize grip, and exact-message Reply in place of chat feedback thumbs.

Why: Mission launches, simultaneous receipts, narrow detail panes, and output/message navigation were ambiguous or difficult to use from the chat workspace.

Impact: Users can choose a Mission playbook without leaving Create, distinguish runs by playbook and Space, resize or switch narrow Mission details cleanly, reopen Outputs or locate their receipt, and reply to one assistant message with durable agent context.

Files: `apps/web/src/components/shell/*`, `apps/web/src/components/global-chat/lib/global-chat-seed-match*`, `apps/web/src/components/chat/AgentTurnFeedbackActions*`, `apps/web/src/features/mission-control/components/dialogs/MissionDetailDesktopShell*`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/playbooks/QuickMissionsHubModal*`, `apps/web/src/features/studio/components/ChatInput*`, `apps/web/src/features/studio/components/message-bubble/*`, `apps/web/src/lib/agent-feedback/use-agent-turn-feedback.ts`, `apps/agent-api/src/modules/chat/repositories/chat-runtime.repository.ts`, `apps/agent-api/src/modules/chat/services/chat-reference-context.service.ts`, `apps/agent-api/src/modules/chat/services/conversation-reference.util*`, `documentation/features/missions.md`, `documentation/features/claude-chatgpt-shell.md`.

## 2026-08-14 10:54 - [FIX]

What: Routed exact-message Reply seeds through the selected conversation's authoritative Space/Campaign scope so the mounted composer restores the referenced message chip before send.

Why: Production verification showed that the shell work context could lag the selected conversation, causing the Space-scoped chat panel to reject a Reply seed for the wrong panel.

Impact: Reply now visibly attaches the selected assistant message in the active conversation and sends that exact reference to the agent context pipeline.

Files: `apps/web/src/features/studio/components/message-bubble/AssistantActions.tsx`, `apps/web/src/features/studio/components/message-bubble/AssistantActions.test.tsx`.
