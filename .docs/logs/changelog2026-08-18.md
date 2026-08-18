# Changelog - August 18, 2026

## [2026-08-18 02:05] - [FIX]
What: Home New chat no longer invents the org Meetings/General workspace. An `@` campaign chip (last campaign mention) becomes the Connection. Enter on `/home?chat=starting` stays on the new thread and does not reuse a leftover Meetings host.
Why: Blank Home send used the newest space on the org General campaign (often Meetings). `@1DS Collective` only became a Source. Sticky host plus Recents/drawer restore then opened or stamped that Meetings workspace while Pixel talked about 1DS.
Impact: Talking about a campaign with `@` attaches that campaign in Connections. A blank Home send stays unscoped. The previous Recents row does not swallow the new message.
Files: `apps/web/src/components/conversations/conversation-scope-from-mentions.ts`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/global-chat/containers/global-chat-panel-host.ts`, `GlobalChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.logic.ts`, `SpaceVibeyChatPanel.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-18 01:34] - [FIX]
What: Connections now names a General location with its client/program (`Master Your Kraft General`) instead of a bare General. Campaign pages register clickable `Campaigns / client / campaign` crumbs. Home chats send that attached location into agent awareness.
Why: Qualify-General stopped at another General campaign and never walked up to the client. Campaign detail only showed the path label Campaigns. Home chats skipped Space awareness unless the work area was already on a Space route, so Brain stopped pulling from Connections.
Impact: The connection row shows the client plus space. Opening it shows clickable crumbs. Pixel receives the attached client/space on Home chats.
Files: `apps/web/src/components/conversations/conversation-scope-sort.ts`, `conversation-scope-picker-layout.ts`, `use-conversation-location-label.ts`, `ConversationScopePicker.tsx`, `apps/web/src/components/shell/ShellRightPanelConnections.tsx`, `apps/web/src/app/(dashboard)/campaigns/[id]/page.tsx`, `CampaignWorkspaceBreadcrumb.tsx`, `apps/web/src/features/spaces/components/header/SpaceBreadcrumbHeader.tsx`, `apps/web/src/features/spaces/components/chat/use-chat-send-awareness.ts`, `build-space-awareness-context.ts`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-18 00:17] - [FEATURE]
What: Added Create with AI on Agenda & prep. It seeds the existing Start agenda prompt so Pixel writes the agenda Space Doc from open action items, launches, client reports, and related meeting context.
Why: Agenda & prep had an empty or manual doc with no way to generate the agenda in place. Start agenda lived only in the call-status row and did not ask Pixel to pull launches or reports onto the page.
Impact: Create with AI and Start agenda share one prompt. Pixel writes 3-6 agenda points into the Space Doc and omits missing sources instead of inventing them.
Files: `apps/web/src/features/home/components/MeetingAgendaPrepSection.tsx`, `MeetingWorkspaceBody.tsx`, `MeetingWorkspaceDialog.tsx`, `apps/web/src/features/home/config/meeting-post-call-actions.config.ts`, `home-agenda-messages.config.ts`, `documentation/features/meeting-follow-up-slack.md`

## [2026-08-18 00:04] - [FIX]
What: Stopped the meeting agenda Space Doc from remounting on every autosave. Open transcript is now a text link beside Open recording. Link recording sits under those links. Action items sit in the top row beside Recordings & attachments.
Why: Realtime UPDATE on the agenda row remounted the editor after the 1s autosave, so "Loading document..." flickered every 1-2 seconds. Transcript used a button under the recording link, Link recording lived in the section header, and action items were buried at the bottom.
Impact: Agenda stays open while it saves. Recording actions read as Open recording · Open transcript, then Link recording. Action items are in the top-right column under that row.
Files: `apps/web/src/features/home/components/MeetingAgendaDocEditor.tsx`, `MeetingRecordingsSection.tsx`, `MeetingWorkspaceBody.tsx`, `documentation/features/meeting-follow-up-slack.md`
