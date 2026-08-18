# Changelog - August 18, 2026

## [2026-08-18 02:25] - [FIX]
What: Bound chat stream memory so heavy Pixel turns stop Chrome Aw Snap (error code 5). Cap tool progress tails and tool preview size; prune inactive conversation message caches on chat switch; clear message/stream maps on conversation remove; skip localStorage persist while any turn is streaming; slim persisted tool blocks; narrow StatusIndicator / useActiveMessages to the active conversation only.
Why: Mid-turn store updates were keeping unbounded tool progress/previews in heap and re-serializing multi‑MB chat graphs to localStorage on every stream tick. The tab renderer OOM'd while the server finished — refresh showed the completed message.
Impact: Heavy tool-heavy turns keep a bounded live footprint; localStorage only updates when the stream ends; switching chats drops inactive message arrays. Completed replies still land from the API after refresh.
Files: `apps/web/src/features/studio/store/use-chat-store.ts`, `use-chat-store.test.ts`, `apps/web/src/features/studio/components/chat/StatusIndicator.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-18 02:15] - [FIX]
What: Tightened the Studio static-ad routing guard so pasted conversations no longer force the production-type clarification card.
Why: The matcher treated any “ad” plus a distant “want” or “need” as an ad-creation request, so Slack pastes opened Validate messaging / Image brief / Static ad book.
Impact: Short asks like “I want some ads” still get the card. Long pastes only scan the first and last 240 characters, require the verb next to an ads phrase, and ignore ad-account language.
Files: `apps/agent-api/src/modules/chat/services/static-ad-chat-routing.ts`, `apps/agent-api/src/modules/chat/services/static-ad-chat-routing.test.ts`, `documentation/features/missions.md`


## [2026-08-18 02:05] - [FIX]
**What:** Home **New chat** no longer auto-attaches org Meetings/General; `@` campaign chip creates a Connection and keeps `campaignId`.
**Why:** Defaulting every Home thread to Meetings made `/home?conv=` look like a meeting chat and dropped campaign identity when creating from campaign pages.
**Impact:** Home composer chats stay unattached until you `@` a campaign; campaign-page chats keep `campaignId` and also attach as a Connection.
**Files:** `apps/web/src/features/chat/components/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/chat/lib/composer-campaign-chip.ts`, `apps/web/src/features/chat/lib/composer-campaign-chip.test.ts`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-18 01:34] - [FIX]
**What:** Connections names **General** with the client/program, shows campaign crumbs, and Home chats send attached location.
**Why:** The rail listed every client as **General**; Home New chat dropped `spaceId`/`campaignId` so `/home?conv=` opened as a meeting chat.
**Impact:** Client Connections look like **ROAS Media / General**. Campaign Connections show **Client / Campaign**. Home chats stay on `/home?conv=` with the attached campaign.
**Files:** `apps/web/src/features/chat/components/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/chat/lib/use-home-chat-attached-location.ts`, `apps/web/src/features/chat/lib/use-home-chat-attached-location.test.ts`, `apps/web/src/features/spaces/components/SpaceChatSessionNav.tsx`, `apps/web/src/features/spaces/components/space-chat-nav-utils.ts`, `apps/web/src/features/spaces/components/space-chat-nav-utils.test.ts`, `documentation/features/claude-chatgpt-shell.md`


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
