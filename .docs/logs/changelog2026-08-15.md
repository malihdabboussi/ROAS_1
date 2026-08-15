# Changelog - August 15, 2026

## [2026-08-15 11:15] - [STYLE]

What: Refined the agent chat header and work summary panel toward a single, calmer control surface.

- Removed the pencil icon from `ConversationHeaderTitle`; the title itself still opens inline rename.
- Moved the conversation three-dots menu out of the absolute top-right cluster and inline next to the agent picker, where the pencil used to sit.
- Pinned the summary-panel toggle in the chat top bar so it no longer hides behind the hover-reveal cluster; it is now the panel's only open/close control.
- Dropped the work summary card's own `+`/`X` chrome row and offset the card below the header row (`top-spacing-12`); the create `+` now rides the Outputs section header, matching the `+` already on Connections.
- Replaced the stacked "Back to summary" / "Back to create" rows in the create/missions drawer with a single "Back" row per view, via a new `onBack` prop on `ShellCreateMenuPanel`.
- Connections rows now resolve the real campaign name: added `useConversationScopeFallbackCampaign`, a by-id fetch mirroring the existing space fallback, so a campaign missing from the cached org list no longer renders the generic "Campaign" label.
- Removed the "+ Add context" / "Add or change context" controls from the chat composer; attaching context now lives solely on the Connections `+` in the summary panel. The composer keeps the attached-context chip with its detach action. Deleted the now-unused `use-global-chat-work-context-menu.ts`.

Why: The panel had two competing `+` buttons and a close button duplicating the top-bar toggle, the rename affordance was split across a pencil and a menu, the drawer showed two stacked back labels, and context attachment was offered in two places at once. Consolidating each control to one home removes the duplication rather than restyling around it.

Impact: Chat header and work summary read as one control surface; the summary toggle is always reachable; connection rows name the actual campaign; context attachment has a single entry point. No API or schema changes. 20 scoped tests pass; lint and typecheck clean on the touched files.

Files:

- apps/web/src/components/conversations/ConversationHeaderTitle.tsx
- apps/web/src/components/conversations/ConversationHeaderTitle.test.tsx
- apps/web/src/components/conversations/use-conversation-scope-data.ts
- apps/web/src/components/global-chat/components/GlobalChatComposerFooter.tsx
- apps/web/src/components/global-chat/components/use-global-chat-work-context-menu.ts (deleted)
- apps/web/src/components/shell/ShellCreateMenuPanel.tsx
- apps/web/src/components/shell/ShellCreateMenuPanel.test.tsx
- apps/web/src/components/shell/ShellRightPanel.tsx
- apps/web/src/components/shell/ShellRightPanel.test.tsx
- apps/web/src/components/shell/ShellRightPanelConnections.tsx
- apps/web/src/features/spaces/components/chat/SpaceChatHeaderActions.tsx
- apps/web/src/features/spaces/components/chat/SpaceChatPanelHeader.tsx
- apps/web/src/features/spaces/components/chat/SpaceChatPanelHeader.test.tsx
