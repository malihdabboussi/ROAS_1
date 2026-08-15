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

## [2026-08-15 11:40] - [STYLE]

What: Density and rhythm pass on the work summary panel, after reviewing it running locally.

- Section headings now use the canonical `typo-section-label` utility instead of `typo-caption` + manual `uppercase tracking-wide`. The panel was the outlier; 57 other call sites already use the canonical utility.
- Connections rows collapsed from two lines to one: name on the left, type right-aligned as the row's value, at canonical row padding (`px-spacing-3 py-spacing-1-5`). The old second line just repeated what the icon already said.
- Campaign and Space rows now carry distinct icons (`FolderKanban` / `Layers`, matching `ConversationScopeTrigger`) rather than both showing a campaign icon.
- The per-row remove control fades in on hover/focus instead of sitting permanently in every row, using the same opacity pattern as `ShellRightPanelFiles`.
- Sources rows collapsed to one line; the `kind` subtitle was a constant type word already conveyed by the link icon. Full title preserved as a `title` tooltip since the label truncates.
- Replaced `scrollbar-hide` with `scrollbar-thin`. `scrollbar-hide` is not defined anywhere in `globals.css` — it was a no-op class.

Why: The first pass removed duplicated controls but left the panel's own typography and row rhythm untouched, so it still read as a stack of loosely related lists rather than one designed surface. Two-line rows whose second line restates the type are the main source of the bulk.

Impact: Panel is materially shorter and scans faster; section labels match the rest of the app. No behavior or API change. 280 tests pass across the shell and chat suites; lint clean.

Files:

- apps/web/src/components/shell/ShellRightPanel.tsx
- apps/web/src/components/shell/ShellRightPanelConnections.tsx
- apps/web/src/components/shell/ShellRightPanelSources.tsx
