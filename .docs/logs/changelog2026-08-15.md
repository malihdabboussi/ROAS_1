# Changelog - August 15, 2026

## [2026-08-15 16:20] - [FIX]

What: The Home chat artifact pane now opens the real editors at an editor-sized width, can be dragged past the old 720px cap, and uses its Artifacts / files / title crumbs to browse inside that same right pane.

Why: Opening a document or deck from chat dropped into a cramped lightweight viewer that could not grow with the chat column, so the presentation, designer, image, document, and funnel editors were unusable beside chat.

Impact: Docs, presentations, funnels, and media keep their canonical editors in the side view; the pane has a 420px minimum and no maximum, so chat can shrink as the editor grows; breadcrumb clicks stay on the right instead of navigating away.

Files: `apps/web/src/lib/artifacts/artifact-viewer-layout.ts`, `apps/web/src/components/shell/use-shell-store.ts`, `apps/web/src/components/shell/ShellArtifactViewerColumn.tsx`, `apps/web/src/components/shell/ShellArtifactViewerPanel.tsx`, `apps/web/src/components/shell/ShellArtifactViewerBrowse.tsx`, `apps/web/src/features/studio/components/preview/ShellArtifactViewerAdapter.tsx`, `apps/web/src/components/deliverables/PresentationFullPreview.tsx`, `apps/web/src/features/artifacts/components/GlobalArtifactsPage.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-15 15:51] - [FEATURE]

What: Recents Filter now uses the same campaign/space picker as chat. Clicking a campaign or client name selects it without a nested Space, and the Filter row plus Choose Space control show that real name instead of "Space".

Why: Filtering Recents by a client required a Space, and the selected context stayed labeled Space so you could not see which campaign you were in.

Impact: Recents and Chats Filter include a Campaign row. Composer Choose Space and attached context chips show the campaign or Space name after selection. Chevron still opens nested spaces.

Files: `apps/web/src/components/conversations/ConversationScopePicker.tsx`, `apps/web/src/components/conversations/ConversationScopePickerMenus.tsx`, `apps/web/src/components/conversations/ChatHistoryFilterMenu.tsx`, `apps/web/src/components/conversations/ChatHistoryFilterScopeRow.tsx`, `apps/web/src/lib/conversations/conversation-list-query.ts`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-15 11:43] - [FEATURE]

What: Added idle chat Try tips above empty-composer quick starts. Hovering Try shows "Opens as a new task"; clicking it seeds a fresh Pixel chat with the matching prompt.

Why: People miss capabilities that already exist (@ mentions, /, Brain, decks, tasks). The streaming typewriter tips only appear while Pixel is answering.

Impact: Empty Home and Pixel chats show one dismissible tip at a time. Try opens a new task without replacing the current thread's draft after dismiss. Existing quick-start pills are unchanged.

Files: `apps/web/src/lib/chat/composer-try-tips.ts`, `apps/web/src/components/chat/ComposerTryTipBanner.tsx`, `apps/web/src/components/global-chat/components/ChatComposerTryTip.tsx`, `apps/web/src/components/global-chat/lib/global-chat-storage.ts`, `apps/web/src/components/shell/ShellEmptyChatQuickStartPills.tsx`, `documentation/frontend-shared-surfaces.md`

## [2026-08-15 11:55] - [FIX]

What: Render chat mermaid diagrams as React nodes instead of innerHTML placeholders that stay on "Rendering diagram…" and never hydrate.

Why: Hydration was skipped while the reply streamed, and every token refresh wiped any SVG that had started. The loading orb therefore often never resolved even though a finished diagram looks fine.

Impact: Pixel, agent-thread, channel, and tool-preview chats mount a real diagram as soon as the mermaid fence closes. Incomplete fences show a quiet Diagram label. Failed renders get Try again instead of disappearing.

Files: `apps/web/src/lib/utils/chat-markdown.utils.ts`, `apps/web/src/components/chat/ChatMarkdownDocument.tsx`, `apps/web/src/components/ui/mermaid-diagram.tsx`, `apps/web/src/features/studio/components/message-bubble/MarkdownContent.tsx`, `apps/web/src/features/studio/components/chat/AgentConversationThread.tsx`, `apps/web/src/features/channels/components/ChannelMessageBody.tsx`, `apps/web/src/features/studio/components/chat/ToolContentPreview.tsx`, `apps/web/src/features/studio/components/chat/ChatAttachmentPreviews.tsx`

## [2026-08-15 14:25] - [FIX]

What: Recents unread marks now overlay Slack, Telegram, and meeting logos instead of occupying a second left-column slot. Rows without a logo keep the standalone left-edge activity dot, and empty logo slots no longer reserve space.

Why: Unread chats without a channel/meeting icon were sliding their titles right into the logo column, and unread Slack/calendar rows stacked a dot plus the logo.

Impact: Identity-icon rows stay one column wide with a corner unread bubble. Plain chats still show the left unread dot.

Files: `apps/web/src/components/conversations/SpaceConversationRows.tsx`, `apps/web/src/components/conversations/ConversationRowLeadingIcon.tsx`, `apps/web/src/components/conversations/ConversationActivityIndicator.tsx`, `apps/web/src/lib/conversations/conversation-activity.ts`, `documentation/features/claude-chatgpt-shell.md`, `documentation/frontend-shared-surfaces.md`

## [2026-08-15 14:45] - [STYLE]

What: Removed the inline pin icon from conversation rows that already sit under a Pinned section header.

Why: The Pinned heading already marks those chats; the extra pin shifted the title and made pinned rows look different from Recents.

Impact: Simple-sidebar Pinned chats match Recents row chrome. Pin/unpin stays in the overflow menu. Mixed lists that do not use a Pinned heading still show the inline pin.

Files: `apps/web/src/components/conversations/SpaceConversationRows.tsx`, `apps/web/src/components/conversations/SpaceConversationsList.tsx`, `documentation/features/claude-chatgpt-shell.md`

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
