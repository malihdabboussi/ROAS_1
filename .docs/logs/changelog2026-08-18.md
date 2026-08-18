# Changelog - August 18, 2026

## [2026-08-18 17:35] - [FEATURE]
What: All Meetings gained a Client / Campaign column. Operators map a call to a Page Grader client and that client’s campaign without moving the row. Mapped names link to the client and campaign Space; an Agenda link opens that meeting’s workspace. Call Kind stays independent. The same field id upgrades Delegation Desk from free text to the picker.
Why: Meetings could classify Call Kind but could not tag which client and campaign a call belonged to, so later training and reference had no durable client/campaign label. There was also no explicit Agenda control on the All Meetings row.
Impact: `custom_data.client_campaign` stores client_id/name, campaign_id/name, and optional roas_space_id. Agents hydrate that mapping on meeting items. Existing All Meetings spaces and the personal-dashboard template show the column after Call Kind.
Files: `ClientCampaignCell.tsx`, `SpaceCell.tsx`, `client-campaign-mapping.ts`, `use-client-campaign-groups.ts`, `space-template-catalog-personal-dashboard.ts`, `20260818173000_meetings_client_campaign_field.sql`, `artifact-space-item-hydrate.helper.ts`, `documentation/features/meeting-follow-up-slack.md`


## [2026-08-18 16:20] - [FIX]
What: Meetings Agenda Mine now DWD-pulls the signed-in user's Workspace Directory calendar (linked/suggested portal user, not login Gmail first). Team Google Calendar fetches paginate `nextPageToken` (page size 2500, `singleEvents=true`) and pin the caller inside the Directory people cap.
Why: Mine only listed caller-owned Composio rows, so Dylan's work invites showed under Team (Directory mailbox) and disappeared on Mine. Recurring instances such as ROAS x Christian Osgood Weekly Standup were truncated when a covering-month `events.list` stopped at 250 events with no page token.
Impact: Mine includes the caller's Workspace calendar. Team no longer drops later recurring instances after the first page, and the signed-in Directory user is not sliced off by alphabetical email order.
Files: `integrations-calendar.service.ts`, `integrations-calendar-parse.ts`, `integrations-calendar-team.service.ts`, `google-workspace-calendar.service.ts`, `google-workspace-google.client.ts`, `google-workspace-calendar-pages.ts`, `google-workspace-calendar-pull.ts`, `integrations-calendar-workspace-map.ts`, `loc-allowlist.json`, `documentation/features/integration-connections.md`

## [2026-08-18 16:20] - [DOCS]
What: Revised the Pixel Slack North Star spine to classify ask kind (client / team / general / Pixel-thread continuation) before any client resolve, and mapped already-shipped Viktor-parity work as keep/expand.
Why: Not every Slack message is a client request. Starting at client lookup would overwrite retrieve-then-draft, User Brain, and Team Intelligence paths already on main.
Impact: Client Resolve (N1) is a client-class branch only. Quote inherit remains the first runtime gap. Voice pack, CONNECTIONS bind, composer, and Service Request routing are explicitly out of rewrite scope.
Files: `.docs/plans/pixel-slack-north-star-2026-08-18.md`

## [2026-08-18 15:55] - [DOCS]
What: Corrected the leftover Data Flow sentence that still said post-call is client-only.
Why: The live rule is Team + Client run; Personal never enters the bot.
Impact: Docs match the shipped trigger.
Files: `documentation/features/meeting-follow-up-slack.md`

## [2026-08-18 15:50] - [FIX]
What: Post-call bot now runs Team and Client calls. Personal calls never enter the bot. Team titles (weekly team, launch calendar) stay Team even when Fathom tagged one speaker.
Why: The live Fathom Meeting Log was client-only, and internal team reviews were auto-labeled Personal, so the bot skipped the calls that should run and treated team work as confidential personal.
Impact: Fathom Meeting Log scope is `client_and_team`. Personal stays off. Existing automatic Team-titled Personal rows are relabeled Team.
Files: `post-call-meeting-scope.ts`, `meeting-call-kind.ts`, `space-template-catalog-personal-dashboard.ts`, `space-automation-action.dto.ts`, `supabase/migrations/20260818155000_post_call_team_not_personal.sql`, `documentation/features/meeting-follow-up-slack.md`

## [2026-08-18 15:26] - [FIX]
What: Unblocked Vercel `roas-web` typecheck after merging #290–#298. Removed leftover unused `isStreaming` on Team `AgentChatThread`. Typed the Connections `fetchCampaign` test mock with the real `(id: string)` arity.
Why: `next build` typechecks `apps/web` with unused locals. #290 deleted the composer tip that used `isStreaming`; #291 added a one-arg `fetchCampaign` mockImplementation on a zero-arg `vi.fn`. Every production web deploy failed.
Impact: `pnpm --filter @vibey/web typecheck` passes so `app.roas.io` can ship the merged chat/Slack/campaign PRs.
Files: `AgentChatThread.tsx`, `AgentChatPanel.tsx`, `ConversationScopePicker.test.tsx`

## [2026-08-18 14:40] - [FIX]
What: Service Request confirmation now shows the created ROAS/ClickUp task links after submit. Portal campaign drafts must post the same kind of openable chat/review URL instead of a Slack questionnaire.
Why: After Nate submitted a review, the in-thread card treated `finalized` as an invalid link because it had no `message`. Campaign requests created a draft in Slack with no clickable portal URL.
Impact: Submit shows SERVICE REQUEST SUBMITTED plus Open ROAS task / Open ClickUp task. Pixel posts `review_url` or `url` for campaign drafts. Native `create_campaign` returns `https://app.roas.io/campaigns/{id}`.
Files: `WorkRequestChatResumeCard.tsx`, `artifact-north-star.service.ts`, `ui-block-extractor.ts`, `artifact-mcp-fulfillment-stamp.ts`, `platform-tools-template.ts`, `docker/agents/*/skills/page-grader-operator/SKILL.md`, `documentation/features/page-grader-mcp-bridge.md`

## [2026-08-18 14:20] - [DOCS]
What: Wrote the Pixel Slack North Star plan: current vs proposed Slack→answer flow, 14 existing Slack processes, 10 proposed processes, Dylan’s 30 asks plus 25 stamp-derived requests with ladders, and a wave-based stress harness.
Why: Slack Pixel still asks which client and skips retrieval even when `#roas-*` channels are mapped; we needed one resolve→retrieve→act spine before more skills.
Impact: Implementation starts with quote/unfurl identity inherit (1DS group-DM class), then depth-ladder tests. Live 14-day Slack histogram is listed as missing evidence until production secrets are in the environment.
Files: `.docs/plans/pixel-slack-north-star-2026-08-18.md`

## [2026-08-18 13:40] - [FIX]
What: Service Request Slack follow-ups now reply in the original task thread and also post to the channel. The first reminder is 3 hours after create and says so; the second is 22 hours after create and says the review expires in 2 hours.
Why: Follow-ups landed as easy-to-miss channel-only posts, and the late nudge still said "about one hour" while firing 1 hour before expiry.
Impact: New drafts get a 3-hour then 22-hour Slack nudge in-thread and in-channel. Existing drafts already marked `reminder_1h_sent_at` are unchanged.
Files: `work-request.service.ts`, `work-request-reminders.ts`, `work-request-conversation-stamp.ts`, `work-request.repository.ts`, `slack-agent-tools.service.ts`, `documentation/features/page-grader-mcp-bridge.md`

## [2026-08-18 02:33] - [FEATURE]
What: Pixel defaults to Power for chat and always loads Dylan Super Voice for "write this message" / send-ready drafts. Draft card Use in composer now seeds a Claude-style acknowledgment ("I used option B and made some edits. Here it is.") plus the draft body.
Why: Message writing was weaker without Super Voice, and users were manually switching to Power. After editing a draft version, sending bare copy into chat gave Pixel no context to acknowledge.
Impact: New and existing vibey/Pixel agents get `auto:power` plus the `dylans-super-voice` skill; TOOLS guidance requires the skill for drafts. Composer seed after Use in composer matches Claude's edit handoff.
Files: `apps/web/src/features/studio/components/message-bubble/DraftVersionsCard.tsx`, `draft-versions.utils.ts`, `packages/agent-policy/src/platform-tools-template.ts`, `docker/agents/templates/shared/TOOLS.md`, `docker/agents/vibey/skills/dylans-super-voice/SKILL.md`, `apps/api/src/modules/missions/services/agent-management.service.ts`, `agent-onboarding.service.ts`, `supabase/migrations/20260818023000_pixel_super_voice_power_defaults.sql`, `.gitignore`
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
