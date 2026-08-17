# Changelog - August 17, 2026

## [2026-08-17 21:35] - [FIX]
What: Service Request finalize and Portal send now pass the Page Grader campaign id, mark origin as From Pagegrader, and omit empty assignees so Portal assignment rules can run.
Why: Finalized Page Grader tasks landed unlinked and unassigned. Send always posted `assignees: []`, which overrode Portal From Pagegrader rules, and never sent `campaign_id`.
Impact: New Portal tasks from a known campaign arrive linked. Unassigned Service Requests no longer force Unassigned in the Portal. Manual Portal "Link" on already-created rows is still a Portal-side update.
Files: `apps/api/src/modules/integrations/page-grader/services/page-grader-send-work.service.ts`, `page-grader-api.helpers.ts`, `page-grader.dto.ts`, `apps/api/src/modules/work-requests/services/work-request-mirror.ts`, `apps/web/src/features/work-requests/lib/work-request-chat-steps.ts`, `docker/agents/vibey/skills/page-grader-operator/SKILL.md`, `docker/agents/atlas/skills/page-grader-operator/SKILL.md`, `documentation/features/page-grader-mcp-bridge.md`

## [2026-08-17 21:20] - [FIX]
What: Service Request review cards now open in the Pixel thread under the review link. Public host keeps one composer. Signed-in `/home?conv=&wr=` hydrates the conversation immediately and seeds messages from the token chat API when the pane would be blank.
Why: The previous host mounted the finalize flow below the composer (plus a second Message Pixel). Signed-in review redirected to a blank `/home?conv=` pane.
Impact: Guest and signed-in review show the same Q&A cards in chat; only the real composer remains for talking to Pixel.
Files: `apps/web/src/features/work-requests/components/WorkRequestReviewChatHost.tsx`, `WorkRequestChatResumeCard.tsx`, `WorkRequestChatFlow.tsx`, `apps/web/src/components/global-chat/hooks/useWorkRequestHomeChatSeed.ts`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/global-chat/containers/GlobalChatPanel.tsx`, `documentation/features/page-grader-mcp-bridge.md`

## [2026-08-17 20:43] - [STYLE]
What: Meeting workspace header now has Continue in chat instead of the phase badge and close X. After a call ends, Start call sits next to Recap message. Recordings and attachments share one card with looser spacing.
Why: The header X emptied the work area. The status badge duplicated call-state copy. Accidental End call hid Start call. Recordings and attachments were two tight stacked cards.
Impact: Back still returns to Agenda. Continue in chat is top-right. You can start the call again after ending it. Recordings, transcripts, and other deliverables sit in one section.
Files: `apps/web/src/features/home/components/MeetingWorkspaceDialog.tsx`, `MeetingCallStatusSection.tsx`, `MeetingWorkspaceBody.tsx`, `MeetingRecordingsSection.tsx`, `MeetingWorkspaceAttachments.tsx`, `documentation/features/meeting-follow-up-slack.md`

## [2026-08-17 20:40] - [STYLE]
What: Simple sidebar collapse now lives on ROAS logo hover, the compact rail matches expanded nav (icons + selected purple on a white `surface-card`), and the expanded Simple menu can be dragged 75% wider than the 272px default (max 476px).
Why: Compact used Search/Favorites/Chats instead of the real destinations, logo hover flickered because the R and drawer glyph swapped sizes, and the drag max stopped at 420px.
Impact: Hovering the wordmark or R reveals collapse/expand without a layout jump. Compact shows New chat, Inbox, Meetings, All Tasks, Clients, Client Campaigns, and More. Recents can be widened without taking the full frame.
Files: `apps/web/src/components/layout/sidebar/SidebarSimpleSection.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqHubLogoButton.tsx`, `apps/web/src/components/shell/use-shell-menu-dock.ts`, `apps/web/src/app/globals.css`, `apps/website/src/app/globals.css`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-17 20:33] - [FIX]
What: Summary stays on the chat title bar. Show page sits beside it only while the work card is closed; when the page is open, the expand/collapse control lives on that card. Recents Filter pins the compact Recents action bar so the portaled menu cannot jump on hover.
Why: The page control belonged with the open work card so it can expand over chat, while Summary must stay on chat. Hovering a portaled filter row left the Recents hover group, hid the toolbar, and Floating UI re-anchored the menu mid-screen.
Impact: Closed page = Summary + Show page on chat. Open page = Summary on chat, page control on the work card. Filter stays under the Recents icon.
Files: `apps/web/src/components/shell/ShellChatDrawer.tsx`, `apps/web/src/components/shell/ShellTopBar.tsx`, `apps/web/src/components/conversations/ChatHistoryFilterMenu.tsx`, `apps/web/src/components/conversations/SpaceConversationsHeader.tsx`, `apps/web/src/components/shell/ShellChatMenu.tsx`, `documentation/features/claude-chatgpt-shell.md`


## [2026-08-17 20:33] - [STYLE]
What: Meeting workspace action items now render through the same All Tasks native list (status, name, priority, assignee, due date, Client Workspace, Campaign Space, Add task).
Why: The stacked caption + "this space" rows did not match the All Tasks table, so meeting follow-ups felt like a different product.
Impact: Opening a meeting shows the All Tasks table for action items. Follow-up priority, assignee, and due date come through the workspace bundle so those columns are real.
Files: `apps/web/src/features/home/components/MeetingActionItemsSection.tsx`, `apps/web/src/components/work-views/AllTasksNativeList.tsx`, `apps/api/src/modules/meetings/domain/meeting-follow-up-actions.ts`, `documentation/features/meeting-follow-up-slack.md`

## [2026-08-17 20:22] - [FIX]
What: All Tasks no longer opens as the retired My Tasks screen. The page defaults to every open task, the leftover overlay is gone, and Assigned to me is only a filter.
Why: #272 redirected `/home/my-tasks`, but `/all-tasks` still selected a My Tasks tab and Home expand still opened the old My Tasks overlay.
Impact: Sidebar All Tasks shows All Tasks. Home card expand goes to `/all-tasks?scope=my`. There is no My Tasks page or dialog left.
Files: `apps/web/src/features/all-tasks/components/AllTasksBoard.tsx`, `AllTasksScopeFilters.tsx`, `apps/web/src/features/home/components/HomeCardsGrid.tsx`, `documentation/features/programs.md`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-17 20:20] - [FIX]
What: Screen navigation no longer closes or forgets the open artifact. HQ rail, Show page history, Open meeting workspace, campaign/space open keep it; explicit close, flow navigate-away, and drag-to-edge collapse still close it.
Why: Pathname-change and page-pick handlers called `closeArtifactViewer()`, which also forgot the chat’s last artifact, so restoring a chat’s work screen raced the artifact closed.
Impact: Moving screens keeps the artifact on the pin-like default for that chat. Closing it still means it stays closed until the user opens one again.
Files: `apps/web/src/features/studio/components/preview/ShellArtifactViewerAdapter.tsx`, `apps/web/src/components/shell/ShellWorkAreaControl.tsx`, `apps/web/src/components/shell/ShellRightPanel.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-17 20:19] - [FIX]
What: Meetings now skeleton-loads the agenda in place (no centered green orb flash, no duplicate loader). Meeting chats list the meeting workspace inside Connections by name, without an unlink control. Inbox, My Tasks, All Tasks, Programs, Clients, and Client Campaigns use the same list skeleton.
Why: The Meetings orb started between chat and agenda, then jumped into the agenda body. Open meeting workspace sat above Connections instead of being the named meeting connection.
Impact: Agenda chrome stays put while meetings load. The meeting workspace is a permanent Connections row; campaign/Space rows stay removable.
Files: `MeetingsUnifiedSurface.tsx`, `AgendaCard.tsx`, `ShellRightPanel.tsx`, `ShellRightPanelConnections.tsx`, `ListSkeleton.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-17 20:15] - [FIX]
What: Chat working status now types a live line and rotates Cursor-style phrases after a short hold instead of freezing on Brain/tool labels.
Why: Turns that said they were reading Brain looked stuck even while the agent was still working.
Impact: Composer chat keeps an animated working line (`Planning next moves...` and similar) while Pixel is thinking or a Brain/tool step sits open.
Files: `apps/web/src/lib/chat/chat-working-status.ts`, `apps/web/src/lib/chat/use-working-status-label.ts`, `apps/web/src/components/chat/ChatWorkingStatusLabel.tsx`, `apps/web/src/components/chat/TypewriterShimmer.tsx`, `apps/web/src/features/studio/components/chat/StatusIndicator.tsx`, `apps/web/src/features/studio/components/chat/LockedInGroup.tsx`, `apps/web/src/features/studio/components/chat/ThinkingTranscriptBlock.tsx`


## [2026-08-17 20:05] - [STYLE]
What: Chat assistant-turn actions now show Reply first, then Copy, then Fork.
Why: Reply is the primary next step in a conversation, so it should be the first control you see.
Impact: Pixel and other agent message action rows lead with Reply; Copy and Fork stay immediately after.
Files: `apps/web/src/components/chat/AgentTurnFeedbackActions.tsx`, `apps/web/src/components/chat/AgentTurnFeedbackActions.test.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-17 20:01] - [FEATURE]
What: Retired the dedicated My Tasks page. All Tasks is now the primary task destination, and opening a rollup row keeps the list mounted with the same right-side task card My Tasks used.
Why: Simple/Advanced nav had both My Tasks and All Tasks, while All Tasks sent people into the Space overlay instead of a side card.
Impact: Sidebar and Home flyout go to `/all-tasks`. `/home/my-tasks` redirects there. Campaign Tasks list still opens Space. Home My Tasks card is unchanged.
Files: `apps/web/src/app/(dashboard)/all-tasks/_components/AllTasksWorkspace.tsx`, `apps/web/src/app/(dashboard)/home/my-tasks/page.tsx`, `apps/web/src/components/work-views/AllTasksNativeList.tsx`, `apps/web/src/features/all-tasks/components/AllTasksBoard.tsx`, `apps/web/src/components/layout/sidebar/SidebarSimpleSection.tsx`, `apps/web/src/components/layout/sidebar/manage-rail-items.tsx`, `documentation/features/programs.md`

## [2026-08-17 19:56] - [FIX]
What: Home Suggested next moves now keep only the signed-in user's assigned follow-ups and unassigned items from meetings they actually attended.
Why: The list was org-wide, so teammates saw each other's Fathom follow-ups (for example a Master Your Craft deck action from a team call they were not on). The tooltip said "your meeting" even when they were not an attendee.
Impact: Each user sees their own actions and follow-ups from their meetings. Teammate-owned items from other people's calls no longer appear under the composer.
Files: `apps/api/src/modules/home/repositories/next-moves.repository.ts`, `apps/api/src/modules/home/repositories/next-moves-audience.ts`, `apps/api/src/modules/home/repositories/next-moves-audience.test.ts`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-17 19:49] - [FIX]
What: Made meeting breadcrumbs clickable (Agenda returns to the list), removed duplicate in-page titles on Inbox / Meetings / My Tasks / All Tasks / Clients / Client Campaigns, moved Portal into the work-card header, and added an All Tasks shell crumb.
Why: Header already named the page, so repeating H1s cluttered the work area; meeting ancestor crumbs were inert spans; Portal sat beside the page title instead of the top bar; All Tasks had no crumb.
Impact: Ancestor crumbs navigate; page bodies start at search/filters; Portal is in the header action cluster; `/all-tasks` shows All Tasks in the top bar.
Files: `apps/web/src/components/shell/ShellHeaderAction.tsx`, `ShellTopBar.tsx`, `shell-breadcrumb.ts`, `use-shell-store.ts`, `HomeMeetingDetailHost.tsx`, `MyTasksPanel.tsx`, `InboxFeed.tsx`, `AgendaCardChrome.tsx`, `AgencyClientsPage.tsx`, `ClientCampaignsPage.tsx`, `AllTasksBoard.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-17 19:35] - [FIX]
What: More → Programs now lists every program on hover and opens `/programs` on click instead of `/campaigns`.
Why: Programs was wired to the campaigns hub, so the More item skipped the programs overview and had no hover list.
Impact: Clicking Programs opens the programs overview. Hovering it shows the same program list. Each program still opens `/programs/[id]`.
Files: `apps/web/src/components/layout/sidebar/SidebarHqMoreFlyoutBody.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqMoreProgramsFlyout.tsx`, `apps/web/src/app/(dashboard)/programs/page.tsx`, `apps/web/src/app/(dashboard)/programs/_components/ProgramsIndex.tsx`, `apps/web/src/middleware.ts`, `documentation/features/programs.md`

## [2026-08-17 17:43] - [FEATURE]
What: Chat now restores the last work screen for that conversation (meeting agenda pops back), and meeting prep is split into Start agenda / Prep for call / Google agenda. Removed the in-app precall-prep Space-item path.
Why: Switching Recents sent meeting chats to `/home?conv=` so the agenda disappeared; Open agenda prep never worked; Google Doc / Page Grader kickoff was mixed into the same controls as the Space Doc agenda.
Impact: Recents and Show page reopen the remembered meeting (or other work page) beside chat; Prep for call seeds the composer; Google agenda opens a linked Doc or seeds a Page Grader Google Doc prompt; Start agenda still writes the right-side Space Doc.
Files: `apps/web/src/components/shell/shell-work-area-page.ts`, `apps/web/src/components/shell/use-shell-store.work-area-conversation.ts`, `apps/web/src/components/shell/use-shell-artifact-conversation-sync.ts`, `apps/web/src/components/shell/ShellChatMenu.tsx`, `apps/web/src/features/home/hooks/use-meeting-workspace-surface.ts`, `apps/web/src/features/home/config/meeting-post-call-actions.config.ts`, `apps/web/src/features/home/components/MeetingAgendaPrepSection.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-17 17:31] - [FIX]
What: Connections now shows the specific meeting name (not the Meetings space) and opens that meeting on row click; X still removes. Campaign/Space rows are likewise clickable to open.
Why: Connections was labeling the host space generically and was not an open affordance for the linked artifact.
Impact: Meeting chats show the real meeting title in Connections; click opens the meeting workspace; remove stays on X.
Files: `apps/web/src/components/shell/ShellRightPanelConnections.tsx`, `apps/web/src/components/shell/ShellRightPanel.tsx`, `apps/web/src/components/shell/ShellRightPanelConnections.test.tsx`, `apps/web/src/components/shell/ShellRightPanel.test.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-17 17:25] - [FIX]
What: Service Request review links now always show the finalize flow on the public chat host, synthesize a work_request resume card from pasted review URLs in in-app chat, harden MCP UI-block extraction for nested fulfillment results, and pass `/home?conv=` into the chat panel as preferredConversationId so authenticated resume does not open blank.
Why: Pixel often replied with only a markdown `/request-review/` URL (no work_request UI block), so opening the link looped the same chat with no finalize UI; signed-in redirect to `/home?conv=` could remount an empty Pixel pane.
Impact: Guest review pages show chat + finalize steps; authenticated `/home?conv=&wr=` keeps the conversation selected and shows a resume card from the pasted URL; new fulfillment tool results emit work_request blocks more reliably.
Files: `apps/web/src/features/work-requests/components/WorkRequestReviewChatHost.tsx`, `WorkRequestChatResumeCard.tsx`, `apps/web/src/lib/work-requests/work-request-resume.ts`, `MessageBubbleOrderedBlocks.tsx`, `GlobalChatPanel.tsx`, `apps/agent-api/src/modules/shared/ui-block-extractor.ts`

## [2026-08-17 17:24] - [FEATURE]
What: Meeting workspace chat now writes the agenda into an editable Space Doc on the right, and action items always use the shared work-item list with an inline add row.
Why: "Prep the agenda" only seeded a chat draft fence, so the Agenda & prep card stayed empty; action items used an empty-card + header button instead of the Spaces list UI.
Impact: Opening a meeting creates/links `agenda_doc_item_id`; Pixel `update_document` updates the right-pane Doc; Start agenda points at that id; action items are a list with a last-row Add action composer.
Files: `apps/api/src/modules/meetings/repositories/meeting-workspace-agenda.repository.ts`, `apps/api/src/modules/meetings/services/meeting-workspace.service.ts`, `apps/api/src/modules/meetings/repositories/meeting-workspace-read.repository.ts`, `apps/web/src/features/home/components/MeetingAgendaDocEditor.tsx`, `apps/web/src/features/home/components/MeetingAgendaPrepSection.tsx`, `apps/web/src/features/home/components/MeetingActionItemsSection.tsx`, `apps/web/src/features/home/lib/build-meeting-awareness-context.ts`, `apps/web/src/features/home/config/meeting-post-call-actions.config.ts`

## [2026-08-17 17:12] - [FIX]
What: Fixed Home Choose Space mapping and picker grouping. Clients are a single folder (not duplicated under Programs as Client Spaces); search placeholder is "Search". Scope attach now clears stale space/campaign ids, campaign-only picks resolve General space, and seeds/host keep the selected campaign so Connections and the agent match the chosen location.
Why: Selecting a space could leave a prior Power Circle General connection attached, and Pixel asked which campaign despite a Choose Space selection. Picker also listed client campaigns under Programs and again under Clients.
Impact: Choose Space → send attaches the selected client/program space; Connections shows that location; agent chat receives the campaign/space scope. Picker shows Programs vs Clients folder hierarchy.
Files: `apps/web/src/components/conversations/conversation-scope-groups.ts`, `ConversationScopePickerMenus.tsx`, `ConversationScopePicker.tsx`, `conversation-scope-picker.messages.config.ts`, `conversation-scope-general-space.ts`, `conversation-scope-select.ts`, `use-conversation-scope-spaces.ts`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/global-chat/config/work-context.config.ts`, `global-chat-seed-match.ts`, `global-chat-panel-host.ts`

## [2026-08-17 16:47] - [FIX]
What: Wrapped artifact viewer close handler so `onClick` does not pass a mouse event into `closeArtifactViewer(conversationId?)`.
Why: Vercel `roas-web` typecheck failed on PR #263.
Impact: Production web build can complete for artifact pin/restore.
Files: `apps/web/src/components/shell/ShellArtifactViewerPanel.tsx`

## [2026-08-17 16:38] - [FEATURE]
What: Shell artifact viewer now restores each chat’s last-open artifact on conversation switch, with an optional pin that keeps the current artifact open while browsing other chats.
Why: Match ChatGPT/Codex chat↔artifact memory without blocking cross-chat navigation on one artifact.
Impact: Switching chats restores that chat’s artifact by default; pin freezes the panel across switches; summary panel / explicit close still clears and unpins.
Files: `apps/web/src/components/shell/use-shell-store.ts`, `apps/web/src/components/shell/use-shell-store.artifact-conversation.ts`, `apps/web/src/components/shell/shell-artifact-conversation.ts`, `apps/web/src/components/shell/use-shell-artifact-conversation-sync.ts`, `apps/web/src/components/shell/ShellArtifactViewerPanel.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/features/studio/components/preview/ShellArtifactViewerAdapter.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-17 05:49] - [FIX]
What: Guaranteed Service Request review links resume the originating Pixel chat. Agent-api now injects the active session `conversation_id` into Page Grader fulfillment MCP args and stamps the draft via an internal API after create. Review/chat load also backfills from Slack channel+thread provenance when the id was missing, and idempotent create replays merge an incoming conversation id.
Why: Slack-created drafts still opened the step wizard because provenance lacked `resume_conversation_id`; skill-only stamping was insufficient.
Impact: Existing Slack review links with channel/thread provenance open the shared chat host after API deploy; new Slack/Pixel fulfillment creates stamp the conversation at the platform chokepoint.
Files: `apps/agent-api/src/modules/artifacts/services/artifact-mcp.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-mcp-fulfillment-stamp.ts`, `apps/api/src/modules/work-requests/services/work-request.service.ts`, `apps/api/src/modules/work-requests/services/work-request-chat.service.ts`, `apps/api/src/modules/work-requests/services/work-request-conversation-stamp.ts`, `apps/api/src/modules/work-requests/controllers/work-request.controller.ts`, `apps/api/src/modules/work-requests/dto/work-request.dto.ts`, `documentation/features/page-grader-mcp-bridge.md`


## [2026-08-17 04:21] - [FEATURE]

What: Public Service Request review links now open the same Pixel conversation chat (MessageBubble + ChatInput) instead of a parallel faux wizard. Added token-scoped GET/POST `/work-requests/review/:token/chat` (bootstrap + SSE send via owner session mint → channel-chat). Logged-in users still deep-link to `/home?conv=&wr=`; anonymous users get the shared chat host with force-open resume/finalize card; wizard remains fallback when no `resume_conversation_id`. Create webhook also accepts top-level `conversation_id`; Page Grader operator skill requires stamping it from ROAS chat.

Why: Review links must be the same chat session everywhere — same UI, same components, full messaging, finalize in-place.

Impact: Anonymous review is a real conversation when provenance includes conversation id; authenticated review remains in-app chat; finalize UX is the same WorkRequestChatResumeCard/flow inline.

Files: `apps/api/src/modules/work-requests/services/work-request-chat.service.ts`, `apps/api/src/modules/work-requests/controllers/work-request.controller.ts`, `apps/api/src/modules/work-requests/work-requests.module.ts`, `apps/api/src/modules/work-requests/dto/work-request.dto.ts`, `apps/web/src/lib/work-requests/work-request-api.ts`, `apps/web/src/features/work-requests/hooks/useWorkRequestReviewChat.ts`, `apps/web/src/features/work-requests/components/WorkRequestReviewChatHost.tsx`, `apps/web/src/features/work-requests/components/WorkRequestReviewPage.tsx`, `apps/web/src/features/work-requests/components/WorkRequestChatResumeCard.tsx`, `docker/agents/atlas/skills/page-grader-operator/SKILL.md`, `documentation/frontend-shared-surfaces.md`

## [2026-08-17 04:56] - [FIX]

What: Locked Summary and Show/Collapse page into the conversation title bar on every chat surface, including `/home?conv=`.

Why: Those controls floated under a stacked work-card header, jumped when the summary opened, and Show page disappeared after opening a chat so the page could not be restored.

Impact: One title bar with the chat name. Top-right is always Summary, then Show/Collapse page. `/home?conv=` no longer stacks a Simple header above chat. Show page from that surface opens the drawer and restores the last work page.

Files: `apps/web/src/features/spaces/components/chat/SpaceChatPanelHeader.tsx`, `SpaceChatPanelHeader.test.tsx`, `SpaceVibeyChatPanel.tsx`, `apps/web/src/components/shell/ShellChatHeaderPageControl.tsx`, `ShellChatHeaderPageControl.test.tsx`, `shell-chat-header-page.ts`, `shell-chat-header-page.test.ts`, `ShellChatDrawer.tsx`, `ShellChatDrawer.test.tsx`, `ShellWorkspace.tsx`, `ShellWorkspace.test.tsx`, `ShellWorkspaceRestoreControls.test.tsx`, `ShellTopBar.tsx`, `ShellTopBar.test.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-17 03:18] - [STYLE]

What: Docked work summary now sits flush under the chat header, and the three-line summary toggle stays in that header's top-right cluster immediately left of Show page.

Why: The summary was a sibling of the whole thread column, so `pt-spacing-12` left a gap under the header and the toggle sat on the inner edge instead of the pane's top-right.

Impact: Wide panes show one header bar with Summary then Show page at the far right, and the rounded card touching that bar. Narrow overlay still drops from the header over the thread.

Files: `apps/web/src/features/spaces/components/chat/SpaceChatPanelHeader.tsx`, `SpaceChatPanelHeader.test.tsx`, `SpaceVibeyChatPanel.tsx`, `SpaceChatHeaderActions.test.tsx`, `apps/web/src/components/shell/ShellRightPanel.tsx`, `ShellRightPanel.test.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-17 02:35] - [FIX]

What: Closing a composer Try tip now hides the banner in that chat instead of cycling to the next tip.

Why: The X control was implemented as "skip this tip," so the same conversation immediately showed another banner.

Impact: Dismiss removes the banner here. Other chats can still show a remaining tip. Auto-rotate while a tip is visible is unchanged.

Files: `apps/web/src/components/global-chat/components/ChatComposerTryTip.tsx`, `apps/web/src/components/global-chat/components/ChatComposerTryTip.test.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-17 02:30] - [STYLE]

What: Wide-screen work summary uses the same rounded overlay card as the narrow overlay, inset inside the chat pane, with no full-height divider.

Why: The docked column was flush to the edges with a vertical rule, which did not match the popped-up small-screen card.

Impact: Summary sits off to the side of chat as a contained rounded card on wide panes; overlay behavior on narrow panes is unchanged.

Files: `apps/web/src/components/shell/ShellRightPanel.tsx`, `apps/web/src/components/shell/ShellRightPanel.test.tsx`, `documentation/features/claude-chatgpt-shell.md`
## [2026-08-17 01:30] - [FIX]

What: Empty Slack Brain imports no longer toast "Nothing to save from that Slack period." The notifier still acknowledges those skipped/empty jobs so they do not repeat.

Why: Daily Slack channel sync can finish several empty windows seconds apart. Each one toasted the same info message on top of chat.

Impact: Chat is not interrupted when Slack had nothing to save. Real import successes and real failures still toast.

Files: `apps/web/src/features/brain/components/brain-import-job-toast.ts`, `BrainImportJobNotifier.tsx`, `documentation/features/page-grader-campaign-brain-sync.md`

## [2026-08-17 00:45] - [FIX]

What: Fixed the chat HTML artifact PR so `next build` typecheck passes: `ChatMarkdownDocument` now types the mermaid/code/markdown segment union, and unused download mock params are prefixed.

Why: Vercel `roas-web` failed on PR #243 because `flatMap` inferred an incompatible segment union and `noUnusedParameters` flagged the artifact download mocks.

Impact: Preview deploy for clickable chat HTML/CSS/SVG cards can compile. Merge of `main` into `claude/chat-code-artifacts` is included.

Files: `apps/web/src/components/chat/ChatMarkdownDocument.tsx`, `apps/web/src/lib/chat/chat-code-artifact.test.ts`

## [2026-08-17 00:42] - [FIX]

What: Hide the sidebar Favorites section when the user has no favorited programs, campaigns, or spaces. Removed the "No favorites yet" empty copy.

Why: An empty Favorites header above More made the simple sidebar look unfinished.

Impact: Favorites only appears after something is starred. Removing the last favorite hides the section again.

Files: `apps/web/src/components/layout/sidebar/SidebarSimpleSection.tsx`, `apps/web/src/components/layout/sidebar/SidebarFavoritesFlyout.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqFlyouts.tsx`, related tests

## [2026-08-17 00:36] - [FIX]

What: Locked the Agency Clients table to a real grid. Avatars are now a 36×36 square for logos and initials (`w-spacing-9` was a no-op). Groups share `table-fixed` column widths. Monday/Friday/Slack are single truncated lines instead of wrapping to ragged row heights.

Why: Missing width utility + auto table layout made landscape logos, initials, and long Slack/update text size each row differently, so the screen looked broken.

Impact: Clients list rows align across pipeline/manager sections. Empty updates stay muted placeholders. Hover title still shows full Slack text plus date.

Files: `apps/web/src/features/agency-clients/AgencyClientsTable.tsx`, `apps/web/src/features/agency-clients/AgencyClientsTable.test.tsx`, `apps/web/src/features/agency-clients/config/messages.config.ts`, `apps/web/src/app/globals.css`, `apps/website/src/app/globals.css`

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

## [2026-08-17 04:50] - [FIX]

What: Fixed Vercel typecheck failures for Service Request shared chat — source_context merge typing in create webhook DTO, and MessageBubble message cast at the public chat host boundary.

Why: Preview builds for roas-api and roas-web failed on PR #260.

Impact: Branch can build and merge/deploy.

Files: `apps/api/src/modules/work-requests/dto/work-request.dto.ts`, `apps/web/src/features/work-requests/components/WorkRequestReviewChatHost.tsx`

## [2026-08-17 20:17] - [DOCS]
What: Started gangbusters UX audit; logged Session A New Chat findings F-001–F-008, production AUTH block F-009, and confirmed P-ATTACH-01 from live clicks + code.
Why: User asked to run the audit with browser connected; production Dylan session missing in cloud browser; local pass still yielded Attach/@ IA evidence.
Impact: Findings file ready; Attach consolidation plan confirmed; remaining surfaces blocked until production sign-in.
Files: `.docs/plans/ux-gangbusters-findings-2026-08-17.md`

## [2026-08-17 19:44] - [DOCS]
What: Added the gangbusters ultra-detailed navigation/UX audit prompt plus a paste-ready kickoff for cloud agents.
Why: Need a reusable, high-depth click-through protocol (Attach/@ gold example) before running a full-platform menu audit and plan-before-fix loop.
Impact: Agents can execute exhaustive surface testing with consistent finding cards, stale-state hunts, and a reference Attach consolidation plan.
Files: `.docs/plans/ux-gangbusters-navigation-audit-prompt.md`, `.docs/plans/ux-gangbusters-audit-kickoff.md`
