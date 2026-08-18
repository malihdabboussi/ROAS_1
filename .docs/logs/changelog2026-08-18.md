# Changelog - August 18, 2026

## [2026-08-18 01:20] - [FIX]
What: Removed the streaming composer typewriter tip (`Tip: Ask any agent for campaign performance…` and the rest of that rotating strip).
Why: The dismissible Try-tip banner is the composer tip surface. The old lightbulb strip duplicated it and sat on the input while the agent was working.
Impact: Pixel, Studio, Team, HR, and Project composers no longer show that bar. Active chats still get the Try-tip banner when idle.
Files: deleted shared `ComposerActiveRunTipCard.tsx`, `TypewriterTipReveal.tsx`, `composer-active-run-tips.ts`; `SpaceVibeyChatPanel.tsx`, `ChatInterface.tsx`, `AgentChatThread.tsx`, `TeamHrSideChatPanel.tsx`; Studio wrapper is a no-op for Project chat; `documentation/features/claude-chatgpt-shell.md`


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
