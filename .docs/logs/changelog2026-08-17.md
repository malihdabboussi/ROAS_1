# Changelog - August 17, 2026

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
