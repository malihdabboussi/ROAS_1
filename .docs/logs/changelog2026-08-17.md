# Changelog - August 17, 2026

## [2026-08-17 02:35] - [FIX]

What: Closing a composer Try tip now hides the banner in that chat instead of cycling to the next tip.

Why: The X control was implemented as "skip this tip," so the same conversation immediately showed another banner.

Impact: Dismiss removes the banner here. Other chats can still show a remaining tip. Auto-rotate while a tip is visible is unchanged.

Files: `apps/web/src/components/global-chat/components/ChatComposerTryTip.tsx`, `apps/web/src/components/global-chat/components/ChatComposerTryTip.test.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-17 00:45] - [FIX]

What: Fixed the chat HTML artifact PR so `next build` typecheck passes: `ChatMarkdownDocument` now types the mermaid/code/markdown segment union, and unused download mock params are prefixed.

Why: Vercel `roas-web` failed on PR #243 because `flatMap` inferred an incompatible segment union and `noUnusedParameters` flagged the artifact download mocks.

Impact: Preview deploy for clickable chat HTML/CSS/SVG cards can compile. Merge of `main` into `claude/chat-code-artifacts` is included.

Files: `apps/web/src/components/chat/ChatMarkdownDocument.tsx`, `apps/web/src/lib/chat/chat-code-artifact.test.ts`

## [2026-08-17 00:09] - [FIX]

What: Stop Spaces `?space=&item=` deep-link crash (React #185) by ending the missing-space reload storm, preferring URL space on load, resolving missing spaces via fetch-by-id once, and stabilizing org/work-context updates on Open ROAS task links.

Why: Opening a finalized Service Request task white-screened the app. Console showed Maximum update depth exceeded; `useSpaceUrlViewSync` reloaded on every `spaces` identity change when the target space was absent (wrong org / beyond first page), cascading setStates.

Impact: Open ROAS task / `/spaces?space=&item=` deep links no longer infinite-loop; org-param switches clear stale space snapshots; work-context updates no-op when unchanged.

Files: apps/web/src/features/spaces/hooks/use-space-url-view-sync.ts, apps/web/src/features/spaces/hooks/use-space-url-view-sync.test.ts, apps/web/src/features/spaces/store/use-spaces-store.ts, apps/web/src/features/spaces/containers/SpacesContainer.tsx, apps/web/src/components/global-chat/store/use-global-chat-store.ts, apps/web/src/components/shell/ShellRightPanelConnections.tsx, apps/web/src/app/(dashboard)/providers.tsx

## [2026-08-17 00:04] - [FIX]

What: Slack Recents seed from the first message again. Gemini still replaces that snippet with a short topic title when it returns; empty/placeholder `Slack Chat` rows fall back to the snippet instead of staying unlabeled.

Why: Seeding every Slack thread as `Slack Chat` until Gemini finished was harder to scan than the original first-message titles.

Impact: New Slack chats show the inbound text immediately. Generated topic titles still overwrite that snippet. Existing `Slack Chat` rows get the first-message title if Gemini does not return one.

Files: `apps/api/src/modules/slack/services/slack-service-conversation.base.ts`, `apps/api/src/modules/slack/services/slack-conversation-title.ts`, `apps/api/src/modules/conversations/utils/conversation-title.util.ts`, `apps/web/src/features/studio/services/conversation-title-scheduler.ts`, `documentation/features/claude-chatgpt-shell.md`

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
