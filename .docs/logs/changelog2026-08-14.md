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

## 2026-08-14 11:55 - [FIX]

What: Create-menu Funnel/Ad/Script/Sequence/Social now open in-chat type cards instead of pasting a prompt; chat funnel previews use the full funnel designer; HTML funnels no longer compile through the TSX mini-iframe; sending no longer silently assigns an existing thread to General.

Why: Clicking Funnel filled the composer with text, the shell viewer clipped funnel pages into a document preview, live HTML-as-TSX iframes were crashing the tab, and unassigned chats jumped to General on send.

Impact: Users pick a funnel type from embedded cards, open the real designer from the summary funnel, Programs/chat lists stay lighter, and existing chats keep their campaign unless the user changes it.

Files: `apps/web/src/components/shell/CreateTypePickerCard.tsx`, `apps/web/src/components/shell/shell-create-type-pickers.ts`, `apps/web/src/components/shell/shell-create-menu.config.ts`, `apps/web/src/components/shell/use-shell-chat-quick-start.ts`, `apps/web/src/components/deliverables/FunnelFullPreview.tsx`, `apps/web/src/features/studio/components/preview/ShellArtifactViewerAdapter.tsx`, `apps/web/src/features/studio/lib/funnel-view-mode.util.ts`, `apps/web/src/lib/artifacts/use-funnel-page-preview.ts`, `apps/web/src/features/studio/components/ChatInterface.tsx`, `apps/web/src/components/shell/ShellRightPanelFiles.tsx`.

## 2026-08-14 13:35 - [FIX]

What: Funnel page cards stay in final outputs instead of collapsing onto the parent funnel id, and agent tools that resolve `campaign_name`/`campaign_id` no longer overwrite an already attached conversation campaign.

Why: After a funnel turn, page artifacts disappeared into one summary card; talking about one campaign could silently rewrite the thread onto another.

Impact: Chat keeps each funnel page visible after the answer, and Campaign & space stays put unless the user moves it or the thread had no campaign yet.

Files: `apps/web/src/features/studio/components/message-bubble/message-bubble.utils.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-session-campaign.service.ts`.

## 2026-08-14 14:15 - [FIX]

What: Funnel preview page order uses `sort_order`, Create type-picker quick starts include `id`/`icon`, and existing-thread send null-checks the conversation id.

Why: The funnel PR preview failed Next typecheck on `FunnelFullPreview`, and local typecheck also failed on the new picker object and persisted-conversation guard.

Impact: Chat funnel preview and Create type cards typecheck so the web deploy can complete.

Files: `apps/web/src/components/deliverables/FunnelFullPreview.tsx`, `apps/web/src/components/shell/use-shell-chat-quick-start.ts`, `apps/web/src/features/studio/components/ChatInterface.tsx`.
