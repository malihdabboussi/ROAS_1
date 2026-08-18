# Changelog - August 18, 2026

## [2026-08-18 14:40] - [FIX]
What: Service Request confirmation now shows the created ROAS/ClickUp task links after submit. Portal campaign drafts must post the same kind of openable chat/review URL instead of a Slack questionnaire.
Why: After Nate submitted a review, the in-thread card treated `finalized` as an invalid link because it had no `message`. Campaign requests created a draft in Slack with no clickable portal URL.
Impact: Submit shows SERVICE REQUEST SUBMITTED plus Open ROAS task / Open ClickUp task. Pixel posts `review_url` or `url` for campaign drafts. Native `create_campaign` returns `https://app.roas.io/campaigns/{id}`.
Files: `WorkRequestChatResumeCard.tsx`, `artifact-north-star.service.ts`, `ui-block-extractor.ts`, `artifact-mcp-fulfillment-stamp.ts`, `platform-tools-template.ts`, `docker/agents/*/skills/page-grader-operator/SKILL.md`, `documentation/features/page-grader-mcp-bridge.md`

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
