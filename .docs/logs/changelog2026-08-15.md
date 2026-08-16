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

## [2026-08-15 15:20] - [STYLE]

What: Made the work summary sections collapsible and turned the stack into one banded surface.

- Added `ShellRightPanelSection`, a shared collapsible band. The chevron sits beside the label rather than at the far edge, so the disclosure reads as part of the heading and the right edge stays reserved for the section's own action.
- Kept the accessible accordion pattern: the `h3` wraps the trigger button, so each section is still reachable by heading navigation as well as by tab, and carries `aria-expanded` / `aria-controls`.
- Moved horizontal padding off the scroll container and onto each section so dividers run the full card width while content stays inset. That is what makes the four sections read as one surface instead of a column of loose lists.
- Collapse state is hoisted into `ShellRightPanel`, which returns null while closed but stays mounted — so a section the user collapsed is still collapsed when they reopen the panel.
- `ShellRightPanelConnections` now renders through the shared section and takes `open` / `onOpenChange`. Its scope picker deliberately renders outside the collapsible body: collapsing must not unmount it, or both the "+" and the shell's open-picker request would break. Adding from a collapsed section expands it first so the new row is not added out of sight.
- Fixed a broken import introduced in the earlier density pass: `LucideIcon` was being imported from `react` instead of `lucide-react`, which failed typecheck.

Why: The panel's sections were fixed-height lists with no way to fold away the ones you are not using, so a long Tasks list pushed everything else out of reach. Collapsibility is also the structural prerequisite for adding a task-progress section, which needs to coexist with Outputs/Sources/Tasks without making the card unusable.

Impact: Sections fold independently and remember their state; the card sizes to content. No API or data change. 220 shell tests pass, including three new Connections tests and a new collapse test; lint and typecheck clean on the touched files. Verified running locally: collapse, reflow, persistence across panel close/reopen, and no console errors.

Files:

- apps/web/src/components/shell/ShellRightPanelSection.tsx (new)
- apps/web/src/components/shell/ShellRightPanel.tsx
- apps/web/src/components/shell/ShellRightPanel.test.tsx
- apps/web/src/components/shell/ShellRightPanelConnections.tsx
- apps/web/src/components/shell/ShellRightPanelConnections.test.tsx (new)

## [2026-08-15 16:05] - [FEATURE]

What: Added a Progress section to the work summary showing mission steps and human gates for the current thread.

- New `ShellRightPanelProgress`: lists missions started from this conversation, each expanding to its numbered steps.
- Steps come from `mission_subtasks` in `sort_order`, numbered by position. Status uses the existing `formatSubtaskStatusLabel`, including the dependency-blocked "Waiting" derivation.
- Human gates surface as "Your turn". A gate is `assignee_type === 'human'`; it is *currently* holding the mission up when `status === 'awaiting_human'`. There is no `requires_approval` flag in the schema — the assignee is the gate — so `isHumanGateSubtask` / `isBlockingHumanGate` name that rule in one place instead of restating the predicate at each call site.
- The mission row summarises as `done/total`, or "Your turn" when any step is gated, so a blocked mission reads as blocked without expanding it.
- Steps are fetched per mission and only on expand. A conversation can start several missions, and loading every step list up front would fire N requests for rows nobody asked to see.
- Promoted `formatSubtaskStatusLabel` from `features/mission-control/components/subtask-status.ts` to `@/lib/missions`, updating its three importers. The shell cannot import feature internals per `documentation/frontend-shared-surfaces.md`, and copying the mapping would have been a third copy.
- Added `extractConversationMissionRows`, which reads mission receipts from the thread.

Why: The panel's "Tasks" section shows completed tool calls scraped from message blocks — useful, but it is not mission progress, and mission steps were only visible by leaving the chat for Mission Control. Missions already carry ordered steps, statuses, and human gates; none of it was reachable from the conversation that started them.

Impact: A thread that starts a mission now shows its steps and what is waiting on you, without leaving the chat. Read-only — approving a gate still happens in Mission Control. No API or schema change; uses the existing `GET /api/missions/:id/subtasks`. 324 tests pass across shell, mission-control, and lib/missions, including 9 new tests. Lint and typecheck clean.

Note on scoping: `missions` has no `conversation_id`, so "missions started here" is derived from the receipt messages the chat already writes. This is exact for missions launched from the thread; a mission started elsewhere in the same space will not appear.

Files:

- apps/web/src/components/shell/ShellRightPanelProgress.tsx (new)
- apps/web/src/components/shell/ShellRightPanelProgress.test.tsx (new)
- apps/web/src/components/shell/ShellRightPanel.tsx
- apps/web/src/components/shell/shell-conversation-summary.ts
- apps/web/src/components/shell/shell-conversation-summary.test.ts
- apps/web/src/components/shell/shell-right-panel.messages.config.ts
- apps/web/src/lib/missions/subtask-status.ts (moved from features/mission-control)
- apps/web/src/lib/missions/index.ts
- apps/web/src/features/mission-control/components/MissionListCell.tsx
- apps/web/src/features/mission-control/components/dialogs/SubtaskDetailContent.tsx
- apps/web/src/features/mission-control/components/dialogs/SubtasksSection.tsx

## [2026-08-15 17:20] - [FIX]

What: Mission steps that are human gates are now marked as gates for the whole run, not only once they start blocking.

- `StepIcon` shows the person icon for any step with `assignee_type === 'human'`. Colour emphasis (`text-primary`) is still reserved for the gate that is actually holding the mission up (`status === 'awaiting_human'`), and a completed gate reads as Done.
- The icon is labelled ("Needs your approval") rather than `aria-hidden`, because it is the only thing marking the step as a gate — hiding it from assistive tech would lose that fact entirely.
- Reworded the section hint from 'Steps marked "Your turn" wait for you in Mission Control.' to 'Steps with a person icon pause for your approval in Mission Control.' The old wording referred to a marker that was not present when no step was currently blocking.

Why: Found by running a real mission in the browser. The Meta Ads Audit playbook has "Gate 1 - Approve optimization actions" as step 4 of 6, but it rendered identically to every agent step because `isBlockingHumanGate` is false until the mission reaches it. The point of showing a plan is seeing where it will stop for you before it gets there, so gate-ness must be a property of the step, not of its current status.

Impact: A queued mission now shows where it will pause for you. Verified against a live 6-step mission: step 4 carries the person icon while still reading "Waiting". 326 tests pass, including two new ones (gate marked before blocking, completed gate not marked). Lint and typecheck clean.

Files:

- apps/web/src/components/shell/ShellRightPanelProgress.tsx
- apps/web/src/components/shell/ShellRightPanelProgress.test.tsx
- apps/web/src/components/shell/shell-right-panel.messages.config.ts

## [2026-08-15 17:55] - [FEATURE]

What: Reworked the work summary's mission section into "Mission Progress" and cleaned up the panel around it.

- Renamed the section to Mission Progress.
- Added a filter row: a live count plus a Show done / Hide done toggle. "Live" is any mission that has not reached a resting state; `error`/`failed`/`dead_letter` count as live on purpose, since hiding them would hide the ones that most need a person.
- Mission rows now fetch a summary up front (`fetchMissionById`), which carries status and step counts. That lets the list filter and show `done/total` without expanding anything; steps are still fetched only on expand.
- Step rows rebuilt as two columns instead of four. The leading badge *replaces* the number when a step has something more specific to say (done, in progress, blocked, human gate), rather than sitting beside it. At the panel's width the old number + icon + title + status layout wrapped every row onto three lines.
- Strip the authored `Task 1 - ` / `Gate 2 - ` prefix for display via `formatMissionStepTitle`. Against a numbered list the ordinal was said twice and cost the width the actual step name needed. The stored title is untouched and still shown in full on hover.
- Mission rows carry a timestamp, because missions are named after the playbook that produced them: a thread that ran Client Strategy four times shows four identically named rows. Includes the time, not just the day, since runs sit minutes apart.
- Missions no longer appear in Outputs. They are not outputs, they produce them, and listing them in both made every run show up twice. Removed the now-dead mission icon branch in `ShellRightPanelFiles`.
- Connections rows show the name only. The icon already distinguishes a campaign from a space, so the type suffix made every row read "General Campaign".
- Added `ShellRightPanelEmpty`, one empty state shared by Progress, Outputs, Sources, and Connections: a centred icon over a short message, so an empty section reads as deliberate rather than as a gap.
- Sections now default to open when they have content and collapsed when they do not, so an empty section costs no height. An explicit toggle always wins over the default, which is why collapsed and expanded are tracked separately rather than derived from one boolean.

Fixes found while verifying against live data:

- The default-expanded mission could land on a mission that then filtered out as done, leaving nothing expanded. The expansion now falls to the first visible mission when its target disappears.

Why: The section showed five identically named rows, duplicated every mission into Outputs, and wrapped each step across three lines, so the one thing it existed to answer — what is running and what is waiting on me — took the longest to find.

Impact: The panel answers that at a glance. Verified against live data: a thread with five missions shows "2 live / Show done (3)" matching the database, the six-step audit renders as six single-line steps with the approval gate marked at position 4, and Outputs no longer repeats the missions. 269 tests pass across shell and lib/missions, including 5 new helper tests and a new section-default test. Lint and typecheck clean.

Note: mission titles come from the playbook, so several runs genuinely share a name. The timestamp disambiguates them in the UI, but naming missions distinctly at creation is the real fix and is logged as follow-up.

Files:

- apps/web/src/components/shell/ShellRightPanelProgress.tsx
- apps/web/src/components/shell/ShellRightPanelEmpty.tsx (new)
- apps/web/src/components/shell/ShellRightPanel.tsx
- apps/web/src/components/shell/ShellRightPanelConnections.tsx
- apps/web/src/components/shell/ShellRightPanelFiles.tsx
- apps/web/src/components/shell/ShellRightPanelSources.tsx
- apps/web/src/components/shell/shell-conversation-summary.ts
- apps/web/src/components/shell/shell-right-panel.messages.config.ts
- apps/web/src/lib/missions/mission-step-title.ts (new)
- apps/web/src/lib/missions/subtask-status.ts

## [2026-08-15 18:20] - [FIX]

What: Reverted the Outputs change and replaced the icon-based empty states with illustrations.

- Missions appear in Outputs again. The previous entry removed them on the grounds that they are not outputs; that was not wanted. `ShellRightPanelFiles`, `shell-conversation-summary.ts`, and both test files are back to their `main` behaviour, including the rocket icon and the mission-receipt test.
- `ShellRightPanelEmpty` now renders a per-section illustration instead of an icon in a circle: layered cards at slight angles, a ticked checklist for Mission Progress, a document with a small chart for Outputs, two joined cards for Sources, and two linked cards for Connections.
- The illustrations take colour entirely from `currentColor`, inherited from the wrapper's `text-muted-foreground`, with opacity separating the layers. No fills, strokes, or palette values are hardcoded, so both themes are correct with no theme branching.
- Simplified the blocking-gate badge, which was stacking two conflicting background/text class pairs.

Why: Missions in Outputs is wanted behaviour, and the empty states were asked for as illustrations rather than a single glyph.

Impact: Outputs is back to its shipped behaviour; empty sections carry real artwork. 269 tests pass across shell and lib/missions. Lint and typecheck clean.

Note: the illustrations are verified structurally (the SVG renders when an empty section is expanded) but not visually — the browser pane stopped returning screenshots at the end of this pass, so they have not been eyeballed in situ.

Files:

- apps/web/src/components/shell/ShellRightPanelEmpty.tsx
- apps/web/src/components/shell/ShellRightPanelProgress.tsx
- apps/web/src/components/shell/ShellRightPanelConnections.tsx
- apps/web/src/components/shell/ShellRightPanelFiles.tsx
- apps/web/src/components/shell/ShellRightPanelSources.tsx
- apps/web/src/components/shell/shell-conversation-summary.ts
