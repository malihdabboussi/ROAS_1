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

What: Routed exact-message Reply seeds through the active chat Space/Campaign context so the mounted composer restores the referenced message chip before send.

Why: Production verification showed that contextless Reply seeds were correctly rejected by the Space-scoped chat panel, leaving the composer unchanged.

Impact: Reply now visibly attaches the selected assistant message in the active conversation and sends that exact reference to the agent context pipeline.

Files: `apps/web/src/features/studio/components/message-bubble/AssistantActions.tsx`, `apps/web/src/features/studio/components/message-bubble/AssistantActions.test.tsx`.
