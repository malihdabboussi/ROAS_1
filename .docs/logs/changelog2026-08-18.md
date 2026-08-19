# Changelog - August 18, 2026

## [2026-08-18 16:40] - [DOCS]
What: Recorded the 11.3 production Brain audit findings in the North Star plan: personal Brain 500 is a Vercel payload-size issue on the largest brain, ROAS org has 2 portal members (so "empty user brains" is mostly no users), Company Brain has had no writes since Jul 20, campaign brains are healthy and already contained the Yasir Aug 7 stats (retrieval miss, not ingestion), Fathom meetings land in the user brain instead of the client's campaign brain.
Why: 11.3 was the first step of the build order; the findings reorder the fixes.
Impact: Docs only. New open question 11.12 Q10 on portal accounts for team members.
Files: `.docs/plans/pixel-slack-north-star-2026-08-18.md`

## [2026-08-18 16:00] - [DOCS]
What: Recorded Dylan's decisions on the nine open North Star questions (§11.12): internal/admin share in mixed DMs, files to ROAS storage + client Drive, Slack Pixel = full Pixel capability incl. browser, add all agents to the org rather than hire per capability, harness channel `2`, Fathom-only calls, Portal client status, placeholder budgets accepted, build order accepted.
Why: Unblocks 11.6, 11.10, 11.4, 11.7 and R08/R13 without further clarification.
Impact: Docs only.
Files: `.docs/plans/pixel-slack-north-star-2026-08-18.md`

## [2026-08-18 15:40] - [DOCS]
What: Added §11.11 Client Context Bundle + channel-scoped Slack search to the North Star plan, and put it right after telemetry in the build order.
Why: Pixel could not name Yasir's Slack channel from a DM (no client→channel tool) and could not search that channel end-to-end (`search_slack_messages` has no channel filter). This is the shared root cause behind the Yasir, Master Your Kraft, and 1DS misses.
Impact: Docs only. Defines the deterministic client bundle every ladder step reads from.
Files: `.docs/plans/pixel-slack-north-star-2026-08-18.md`

## [2026-08-18 15:05] - [DOCS]
What: Added §11.10 to the North Star plan — Service Requests / ClickUp tasks created from forwarded Slack messages must carry direct asset links (re-hosted Slack files, Drive URLs), not only the gated Slack thread URL.
Why: MFS Elite landing-page SR linked the Slack archive; the assignee may not have channel access to open the PDF.
Impact: Docs only; slotted after N1 in the build order.
Files: `.docs/plans/pixel-slack-north-star-2026-08-18.md`

## [2026-08-18 21:48] - [FIX]
What: Unblocked Vercel `roas-web` typecheck after #308/#309. Calendar materialize now calls `cachedFetch(key, fetcher, { ttlMs })`. Removed unused `SpaceItem` import. Test fixtures use `as unknown as Space`.
Why: `next build` typechecks `apps/web`. The one-room hook passed TTL as the fetcher argument, so agenda events never typed and the cache never actually TTL'd. Incomplete Space casts failed after adding `schema.custom_data`.
Impact: `pnpm --filter @vibey/web typecheck` passes so `app.roas.io` can ship Meetings one-room and client General routing.
Files: `use-meetings-calendar-materialize.ts`, `SpaceFieldIdCell.tsx`, `SidebarHqSpacesGroupedList.test.tsx`, `group-other-spaces-by-campaign.test.ts`

## [2026-08-18 19:50] - [FEATURE]
What: Meetings one room — calendar events materialize onto All Meetings rows; Host + Call status; default past+today+tomorrow chip; All Meetings is the default tab (standard task card) and Agenda keeps the specialized card; related calls feed Pixel so last week’s recording is not a Recordings + ask; Prep tab/button gone; impromptu defaults to Team; completing a call runs the existing post-call path.
Why: Calendar, All Meetings, and the meeting workspace were three homes for one call. Pixel asked users to re-link Fathom that already lived on a related row.
Impact: Opening Meetings shows All Meetings first. Calendar events become rows without opening the card. Recording landing and Call status Completed both run post-call. Existing Spaces get host/call_status via migration.
Files: `meeting-item-materialize.service.ts`, `meeting-host.ts`, `meeting-call-status.ts`, `meeting-related-calls.ts`, `space-template-catalog-personal-dashboard.ts`, `20260818194000_meetings_one_room_fields.sql`, `MeetingsUnifiedSurface.tsx`, `MeetingWorkspaceDialog.tsx`, `build-meeting-awareness-context.ts`, `MeetingsCallDateWindowChip.tsx`, `HostCell.tsx`

## [2026-08-18 18:55] - [FIX]
What: Declared `fieldRowVariant` on All Meetings `ClientCampaignCell` so SpaceCell can pass the shared kanban/default row variant.
Why: #304 used `fieldRowVariant` in the cell and forwarded it from `SpaceCell`, but the props type omitted it. `next build` typecheck failed every `roas-web` deploy.
Impact: `pnpm --filter @vibey/web typecheck` passes so `app.roas.io` can ship #304/#305.
Files: `ClientCampaignCell.tsx`

## [2026-08-18 18:46] - [DOCS]
What: Wrote the Meetings one-room plan: one All Meetings row per call, two doors (standard task card vs specialized meeting card), Live/Completed/No Show/Rescheduled only, related calls so Pixel can read last week’s recording without Recordings +.
Why: Calendar, All Meetings, and the meeting workspace were three homes. Agenda opening a different card than All Meetings was the intended split; New/Upcoming is unnecessary because date already means upcoming.
Impact: Implementation waits for approval. Mapping PR stays separate. Phase order is materialize rows → status/host/filter → two doors → related calls + Pixel context → both post-call automatics → card/tab cleanup.
Files: `.docs/plans/meetings-one-room-2026-08-18.md`

## [2026-08-18 18:14] - [FIX]
What: Fathom webhook now dual-writes each client meeting into the client's Campaign Brain via the existing idempotent `campaign_fathom_import` job, keyed off the Space route's `campaign_id` (General/Personal skipped). New `FathomCampaignBrainRouteService` + tests; webhook e2e tests cover routed / no-transcript cases.
Why: Prod audit: 1,046 `fathom_meeting` memories in the user brain vs ~21 in all campaign brains — client meetings only reached the client brain if a human accepted an LLM suggestion. Client-scoped asks (R10/R11) missed even when the recording existed.
Impact: New recordings land in both brains automatically; re-delivered webhooks are safe (dedupe key). Existing backlog can be backfilled by re-enqueueing `campaign_fathom_import` for routed meetings (follow-up).
Files: `apps/api/src/modules/integrations/fathom/services/fathom-campaign-brain-route.service.ts` (+test), `fathom-webhook.service.ts`, `fathom.module.ts`, `fathom.controller.test.ts`, `documentation/features/integration-connections.md`

## [2026-08-18 17:42] - [FIX]
What: Brain graph endpoint now clamps the memory window to 2,000 nodes and ships a slim node projection (content ≤1,000 chars, `metadata` reduced to the preview keys the web reads). Stats report `node_window_capped`; the web treats a capped window as complete and stops re-requesting `limit=10000`.
Why: The personal Brain page 500'd. Every DB call behind it is fast; the response for the largest prod brain (3.1k memories) serialised to 5.4 MB as full memory records, over the serverless response cap, so the API returned a bare 500. Measured against the same rows, the fix returns 2.99 MB and is bounded regardless of brain growth.
Impact: Personal Brain graph loads again. Canvas shows at most 2,000 memory nodes; legend/stat totals still come from DB counts so nothing under-reports. Companion to §11.3 in `.docs/plans/pixel-slack-north-star-2026-08-18.md`.
Files: `apps/api/src/modules/brain/services/graph-node-window.ts`, `graph-request.service.ts`, `graph.service.ts`, `graph-node-builders.ts`, `apps/api/src/modules/brain/controllers/graph.controller.test.ts`, `apps/web/src/features/brain/store/use-brain-store.ts`, `apps/web/src/features/brain/types/brain.types.ts`

## [2026-08-18 17:40] - [FIX]
What: Restored Simple sidebar Recents resize, left-offset the expanded ROAS wordmark, and centered the compact R mark in the rail.
Why: The Recents drag handle sat under the menu and width used a 300ms transition, so dragging did nothing useful. The wordmark lived in a padded flex-1 row so it read centered. Compact R padding plus an unconstrained PNG spilled right of the 56px rail.
Impact: Drag the Simple menu right edge to widen Recents (272–476px). Expanded ROAS sits left. Collapsed R sits in the icon column center.
Files: `SidebarSimpleSection.tsx`, `SidebarSimpleResizeHandle.tsx`, `SidebarHqHubLogoButton.tsx`, `Sidebar.tsx`, `apps/web/src/app/globals.css`, `apps/website/src/app/globals.css`, `documentation/features/claude-chatgpt-shell.md`

## [2026-08-18 17:35] - [FEATURE]
What: All Meetings gained a Client / Campaign column. Operators map a call to a Page Grader client and that client’s campaign without moving the row. Mapped names link to the client and campaign Space; an Agenda link opens that meeting’s workspace. Call Kind stays independent. The same field id upgrades Delegation Desk from free text to the picker.
Why: Meetings could classify Call Kind but could not tag which client and campaign a call belonged to, so later training and reference had no durable client/campaign label. There was also no explicit Agenda control on the All Meetings row.
Impact: `custom_data.client_campaign` stores client_id/name, campaign_id/name, and optional roas_space_id. Agents hydrate that mapping on meeting items. Existing All Meetings spaces and the personal-dashboard template show the column after Call Kind.
Files: `ClientCampaignCell.tsx`, `SpaceCell.tsx`, `client-campaign-mapping.ts`, `use-client-campaign-groups.ts`, `space-template-catalog-personal-dashboard.ts`, `20260818173000_meetings_client_campaign_field.sql`, `artifact-space-item-hydrate.helper.ts`, `documentation/features/meeting-follow-up-slack.md`

## [2026-08-18 17:25] - [FIX]
What: Portal campaign create no longer dies on a guessed MCP tool name. Pixel lists live Page Grader writes, refreshes stale MCP catalogs, and falls back to native `create_campaign` plus tasks when that write is missing. Missing VSL/landing-page assets are campaign tasks, not create-blockers. MCP campaign-draft failures now return a fixable contract instead of an unclassified reject.
Why: After #298, Pixel tried `page_grader_create_campaign_draft`, the create was rejected before save, and instructions forbade native `create_campaign`, so Master Your Kraft never got a campaign or launch tasks.
Impact: Slack "create a portal campaign" either posts a Portal `review_url` or a ROAS campaign `url` with tasks for unverified VSL/LP/assets. Retrying the same guessed tool is no longer the only path.
Files: `artifact-mcp-tool-preflight.ts`, `artifact-mcp-fulfillment-stamp.ts`, `artifact-mcp.service.ts`, `artifact-action-preflight.ts`, `platform-tools-template.ts`, `page-grader-operator/SKILL.md`, `20260818173000_portal_campaign_create_fallback.sql`, `page-grader-mcp-bridge.md`

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

## [2026-08-18 13:17] - [DOCS]
What: Consolidated the Brain / Agent rework into the Pixel Slack North Star plan (§11): Auto-quality regression (Jul 30 Terra write), CONNECTIONS bind + Campaign Brain preload, Brain ingestion coverage (personal Brain 500, empty user brains, meetings/tasks/Slack → Brain), Pixel operator skill kit, QC producer health, 1DS quote inherit payload capture, live Slack audit + eval harness, and three corrections to the spine (N0 as an `apps/api` stamp, per-turn telemetry, two test tiers). Opened PRs #310 (Sonnet write) and #311 (fork context) for branches Cursor pushed on 08-17 but never PR'd.
Why: These items were diagnosed across several sessions and then dropped or stranded; one plan with a single build order stops that.
Impact: Docs only. Build order in §11.9 supersedes §10 sequencing where they differ.
Files: `.docs/plans/pixel-slack-north-star-2026-08-18.md`

## [2026-08-18 11:54] - [FIX]
What: Page Grader client General is a hidden space that opens the client overview. Switchers, HQ sidebar, and Choose Space flyouts omit it. `/spaces?space=` for that space replaces to `/campaigns/{id}?client=…`; Connections open that overview directly.
Why: Client General was never a second workspace and is not org system General. The Page Grader import already stamps `space_role: general`; navigating to it should show the client HQ.
Impact: Connections / deep links to a client General space land on Overview / Campaigns / Meetings. Org General and Portal campaign spaces (Webinar, Skool) are unchanged.
Files: `page-grader-client-general-space.ts`, `SpacesContainer.tsx`, `use-space-campaign-name.ts`, `ConversationScopePicker.tsx`, `group-other-spaces-by-campaign.ts`, `CampaignOverviewTab.tsx`, `SidebarHqSpacesGroupedList.tsx`, `ShellRightPanel.tsx`, `documentation/features/page-grader-campaign-brain-sync.md`

## [2026-08-18 10:44] - [FIX]
What: Connections no longer flash General while a space name loads, and clicking a space row opens that space instead of the parent campaign HQ. Org General HQ now says it is the unassigned catch-all. Space breadcrumbs use the client/program as the folder when the campaign itself is named General.
Why: A Meetings connection fell back to the parent General campaign for both the label and the click target, so the summary panel flickered and opened `Campaigns / General` with no client. That HQ is org-wide, not a client General.
Impact: Meetings opens `/spaces?space=…`. Org General overview explains the catch-all. Client-named General spaces crumb as `Campaigns / {client} / {space}`. Combining org General with per-client General is logged as follow-up.
Files: `ShellRightPanelConnections.tsx`, `use-conversation-location-label.ts`, `conversation-scope-sort.ts`, `CampaignOverviewTab.tsx`, `campaign-view-messages.config.ts`, `use-space-campaign-name.ts`, `space-breadcrumb-folder-label.ts`, `SpaceItemsContainer.tsx`, `documentation/features/claude-chatgpt-shell.md`

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

## [2026-08-18 19:15] - [FIX]
What: QC / Launch case ledger for personal Page Grader connections (plan §11.5). `PageGraderQcSlackBridgeService` now resolves the org for a connection whose `user_integrations.org_id` is NULL (`resolveQcConnectionOrg`: connection org → org of the finding's ROAS campaign (scope map) → the user's single active `org_members` row) before recording cases and choosing the Slack delivery anchor.
Why: Prod audit (read-only, 2026-08-18): the only Page Grader connection is personal (`org_id NULL`). Because every ledger/anchor call was gated on `connection.orgId`, ROAS has **zero** `page_grader_qc` cases ever, while the ROAS bot posted 53 "Launch Agent Check-in" DMs in 7 days and dozens of QC posts — the measure-once/follow-up dedup shipped in PR 288 could never engage. The QC producer is fine; the ledger was silently disabled.
Impact: QC/Launch findings land in `agent_cases` (quality_control / proactive_launch / campaign_quality_control), Launch check-ins dedupe into one thread per client, follow-ups thread instead of repeating.
Files: apps/api/src/modules/integrations/page-grader/services/page-grader-qc-slack-bridge.service.ts, page-grader-qc-connection-org.ts, tests
