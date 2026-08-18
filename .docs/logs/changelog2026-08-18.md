# Changelog - August 18, 2026

## [2026-08-18 02:33] - [FEATURE]
What: Pixel defaults to Power for chat and always loads Dylan Super Voice for "write this message" / send-ready drafts. Draft card Use in composer now seeds a Claude-style acknowledgment ("I used option B and made some edits. Here it is.") plus the draft body.
Why: Message writing was weaker without Super Voice, and users were manually switching to Power. After editing a draft version, sending bare copy into chat gave Pixel no context to acknowledge.
Impact: New and existing vibey/Pixel agents get `auto:power` plus the `dylans-super-voice` skill; TOOLS guidance requires the skill for drafts. Composer seed after Use in composer matches Claude's edit handoff.
Files: `apps/web/src/features/studio/components/message-bubble/DraftVersionsCard.tsx`, `draft-versions.utils.ts`, `packages/agent-policy/src/platform-tools-template.ts`, `docker/agents/templates/shared/TOOLS.md`, `docker/agents/vibey/skills/dylans-super-voice`, `apps/api/src/modules/missions/services/agent-management.service.ts`, `supabase/migrations/20260818023000_pixel_super_voice_power_defaults.sql`

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
