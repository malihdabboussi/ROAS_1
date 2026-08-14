# Changelog - August 14, 2026

## [2026-08-14 11:20] - [FIX]

What: Chat `@` Campaigns tab now lists every accessible campaign (system campaigns last), typing after `@` jumps to the first tab with matches, and clicking a campaign tags it. The chevron still opens that campaign's artifacts.

Why: Empty `@` only showed the first three campaigns, so Personal / org-named rows hid real work. Search stayed on People, so campaign names looked missing. Clicking a campaign drilled in instead of tagging it.

Impact: Users can search and tag campaigns from `@`, and still browse another campaign's artifacts from the chevron.

Files: `apps/web/src/features/studio/components/ChatInput/*`, `apps/web/src/features/studio/types/index.ts`, `apps/agent-api/src/modules/chat/services/chat-reference-context.service.ts`, `apps/agent-api/src/modules/chat/services/chat-stream-http.service.ts`

## [2026-08-14 11:00] - [FIX]

What: Pixel first-person fill (guest prep, fill-this-out, check my user brain) now searches User Brain for identity instead of the form URL, and Pixel is no longer told it cannot read personal Brain.

Why: Chat used the last user message as the Brain query, so a Google Form link retrieved nothing useful. ACCESS POLICY also hid `search_user_brain` when org policy denied personal brain for system agents, so Pixel claimed it could not access User Brain and asked for bullets.

Impact: Pixel drafts as the user from User Brain and only asks for true gaps.

Files: `packages/agent-policy/src/first-person-fill.ts`, `packages/agent-policy/src/platform-tools-template.ts`, `apps/agent-api/src/modules/brain/services/brain-context.service.ts`, `apps/agent-api/src/modules/agent-policy/services/agent-policy.service.ts`, `apps/agent-api/src/modules/agent-sync/contracts/agent-instruction-contracts.ts`, `docker/agents/atlas/skills/vibey-api/references/protocols/brain-knowledge-protocol.md`, `apps/agent-api/src/modules/artifacts/services/vibey-api-action-docs.ts`

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
