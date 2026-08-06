# Changelog - August 04, 2026

## [2026-08-04 16:46] - [REFACTOR]

What: Extracted `upsertProviderActions` into `meeting-provider-actions.repository.ts` so the meetings workspace repository stays under the 400 LOC gate.
Why: Pre-commit architecture check blocked the Fathom follow_up ingest commit.
Impact: Same merge/dedupe behavior; ingestion injects the new repository.
Files: `meeting-provider-actions.repository.ts`, `meeting-workspace.repository.ts`, `meeting-source-ingestion.service.ts`, `meetings.module.ts`, tests

## [2026-08-04 16:34] - [DOCS]

What: Closed action-item Phases 4–5 documentation and verification. Product loop, file map, and Decision log now state ingest→follow_up + grounded `agent_suggest_tasks` (no invent). Prod data check: N Fathom actions ↔ N follow_ups; 0↔0; live Meetings automation has suggest-tasks. Domain/catalog unit tests green (9).
Why: Phases 4–5 were the remaining plan items after Phase 1–3 code/data work.
Impact: Contract locked in docs/tests. New webhook path still needs `api.roas.io` deploy for ingest bridge + empty-action refetch to run in production.
Files: `meeting-follow-up-slack.md`, focused tests, changelog

## [2026-08-04 16:31] - [FIX]

What: Restored Fathom action items onto Programs/Home follow_ups. Ingest now mirrors exact provider actions into `follow_up` space_items (merging manual rows by title). Webhook does one list refetch when `action_items` is empty (no transcript invention). Live **Fathom Meeting Log** again runs grounded `agent_suggest_tasks` (enrich only; empty Fathom → empty tasks). Existing-call attach also runs that automation. Backfilled 14 follow_ups from the last 14 days of `meeting_actions`.
Why: Jul 28 stripped suggest-tasks and left actions only in `meeting_actions` while Aug 4 UI reads follow_ups — Action items looked empty despite live Fathom payloads.
Impact: Hard-refresh Programs → Action items (1DS weekly already shows 5). New webhooks need API deploy for ingest bridge + refetch; live automation rule is already updated in prod.
Files: `upsert-provider-follow-ups.ts`, `meeting-workspace-state.repository.ts`, `meeting-source-ingestion.service.ts`, `fathom-webhook.service.ts`, `space-automation-service-06/13.base.ts`, `agent-suggest-follow-up-match.ts`, `task-agent-suggestions.service.ts`, Personal Dashboard template, `meeting-follow-up-slack.md`, tests; prod automation `ef3975a7-…` + data backfill

## [2026-08-04 16:19] - [FIX]

What: Completed the authenticated mobile shell and reachable-route pass. The shell top bar now collapses desktop-only controls into a full-width phone search row, the desktop HQ rail no longer reserves 72px on mobile, compact controls and pills meet the 32px phone interaction floor, chat rows expose full-height selection/action targets on touch, and artifact view toggles use phone-safe sizing.
Why: Live 375px testing found clipped shell controls, a persistent desktop rail shrinking every page, and repeated 21–28px controls across Inbox, Chats, Contacts, Artifacts, All Tasks, and Admin Usage.
Impact: Reachable authenticated pages use the full viewport with zero document overflow or offscreen elements at 375px and 768px; sampled desktop routes remain unchanged at 1440px.
Files: `ShellTopBar.tsx`, `ShellMenuDockLayout.tsx`, `InboxFeed.tsx`, `SpaceConversationRows.tsx`, `GlobalArtifactsPage.tsx`, both product `globals.css` files, focused tests

## [2026-08-04 16:18] - [FIX]

What: Applied production ROAS migrations for chat last-message timeline + Slack archive/search coverage (`last_message_at`, calendar `space_items` source already present, Slack capability/TOOLS guidance, observation archive FTS/backfill columns). Hardened the Slack TOOLS.md migration to insert a section when the old anchor text is missing.
Why: Sidebar ages needed the DB column live; Pixel Slack archaeology WIP depended on capability copy + archive schema that had not been applied.
Impact: Production `lhfgtsjetcardinpgouq` now has `conversations.last_message_at` (184/230 backfilled), Slack history params/guidance, and archive search index/columns. API code for archive/history still needs deploy if not already live.
Files: applied SQL on prod; `20260804133000_slack_search_evidence_coverage.sql` made resilient

## [2026-08-04 16:05] - [FIX]

What: Chat history ages and newest-first order now use `conversations.last_message_at` (maintained by a messages insert trigger + backfill), not `updated_at`.
Why: Opening chats, auto-title, pin/scope/metadata writes bumped `updated_at`, so the sidebar looked like “last opened” instead of last conversation turn.
Impact: Apply migration `20260804161000_conversations_last_message_at.sql`. History timestamps stay tied to the last message; opens and non-message edits no longer reshuffle the timeline.
Files: migration, `conversation-last-activity.ts`, conversation list query/sections/rows, api + agent-api conversation repos, `chat.service.ts` optimistic bump, tests, `claude-chatgpt-shell.md`

## [2026-08-04 16:01] - [STYLE]

What: Agenda minimize is a thin restoreable hairline (no strikethrough). Meeting Workspace is a single middle column (sidebar removed); Deliverables renamed Attachments (one-wide); attachments open in the shell document viewer; linked space/campaign chips use chat-style purple pills with fetched real names.
Why: Minimize was rendering a useless struck-out row; workspace split left/right was cluttered; attachment clicks navigated into Meetings space instead of previewing the doc.
Impact: Soft-refresh Home — minimize collapses to a line; open a meeting for the consolidated layout; transcript/recap should slide open in-shell.
Files: `AgendaMinimizedEventEntry.tsx`, `MeetingWorkspaceDialog.tsx`, `MeetingWorkspaceAttachments.tsx`, `MeetingWorkspaceContextLinks.tsx`, `resolve-meeting-workspace-links.ts`, removed `MeetingContextSidebar.tsx`, tests

## [2026-08-04 15:56] - [REFACTOR]

What: Consolidated empty-chat starters into one 7-item quick-start row above the composer (Deep Search, Task, Image, Slides, Doc, Daily Brief, Delegate). Removed the hero capability scroller/marquee and the separate verb action pills.
Why: Duplicate starter rows plus a broken wrap layout made empty chat noisy; the sliding marquee was already retired for clipping, and restoring it would add confusion.
Impact: Empty AI chat shows Pixel/agent identity only in the hero, with one pickable quick-start strip above the input.
Files: `shell-empty-chat-prompts.config.ts`, `ShellEmptyChatQuickStartPills.tsx`, deleted `ShellEmptyChatActionPills.tsx` / `ShellEmptyChatCapabilityScroller.tsx`, `SpaceChatAgentEmptyState.tsx`, `SpaceVibeyChatPanel.tsx`, both `globals.css`, tests, `claude-chatgpt-shell.md`

## [2026-08-04 15:56] - [FIX]

What: Opening a meeting from Home Agenda no longer sticks the left chat on Delegator or “Loading conversation…”. Meeting attach switches agent/scope to vibey+Meetings before the drawer opens; panel key ignores timelineVersion remounts; empty threads count as hydrated (`[]`); concurrent `selectConversation` uses a generation guard.
Why: Leftover Delegator filter hid the meeting thread, remounts on snippet count raced message loads, and empty meeting chats were treated as never-fetched so loading could stick until click-away/back.
Impact: Soft-refresh local web, open a meeting from Agenda — history should select the meeting thread (Pixel/vibey) and the chat should finish loading without a second click.
Files: `MeetingWorkspaceDialog.tsx`, `GlobalChatPanel.tsx`, `use-global-chat-store.ts`, `SpaceVibeyChatPanel.tsx`, `space-vibey-chat-panel.logic.ts`, `chat.service.ts`, tests

## [2026-08-04 15:42] - [STYLE]

What: Completed the first application-wide mobile hardening batch: inventoried all 48 web page entries and 11 dynamic route families, audited every public/auth route at four phone/tablet viewports, expanded undersized auth password/link actions to the 32px interaction floor, and raised shared compact icon buttons to 32px on phone widths across both product stylesheets.
Why: Mobile auditing found repeated 17–24px interactive targets across auth screens and shared card, toolbar, chat, and modal controls even where the surrounding layout fit correctly.
Impact: Public authentication flows now have no automated tap-target findings, and more than 200 shared compact icon-button usages gain safer phone-sized hit areas without changing desktop density.
Files: auth login/forgot/reset/verify/invite/join pages, `apps/web/src/app/globals.css`, `apps/website/src/app/globals.css`

## [2026-08-04 15:32] - [FIX]

What: Made the mobile shell mutually exclusive across the work page, chat history, active chat, and artifact working card. Mobile chat now fills the available shell, history selection replaces history with the chat, restore returns to history, resize controls stay desktop-only, and an open working card takes priority over chat.
Why: The desktop split-pane composition was still active at mobile widths, so narrow screens could show the history, chat, and work surface at the same time.
Impact: Mobile users see one primary surface at a time without changing the desktop split-pane and resize behavior.
Files: `ShellWorkspace.tsx`, `ShellChatDrawer.tsx`, `ShellChatMenu.tsx`, focused shell tests

## [2026-08-04 13:32] - [FIX]

What: Home meeting resolve now links to an existing Meetings call (Fathom / prior stub with recording) before creating a new `source: 'calendar'` row. Upserts `meeting_workspaces.calendar_event_id` onto that same `meeting_item_id`.
Why: [Trace Meetings vs Home link](97757252-73ac-42d7-af69-0174dfaaa959) showed resolve forked identity so recordings/actions lived on a different call than Programs → Meetings.
Impact: Deployed to `api.roas.io`. Opening a calendar agenda card reuses the Meetings call when one already exists nearby with a Fathom recording.
Files: `meeting-workspace.service.ts`, `meeting-workspace-resolution.repository.ts`, tests


## [2026-08-04 13:30] - [FIX]

What: Fixed Fathom→Meetings ingest rejecting numeric `recording_id` / `meeting_id` (all Aug 3–4 webhooks failed with “Fathom recording id is required”). Home Meeting Workspace action items now read the same Meetings-space follow_up `space_items` (not empty `meeting_actions`). Manual Home actions write follow_ups. Replayed failed webhooks; linked Impromptu recording `170082749` onto AARON X DYLAN X NATE.
Why: Home was treating meeting workspace as a parallel store while the real Meetings pipeline was hard-failing before call rows/actions landed.
Impact: New Fathom recordings ingest again. Hard-refresh Home + Meetings — AARON should show the Fathom recording. This Impromptu call has 0 Fathom action items, so Action items stay empty until Fathom provides them or you add one.
Files: `fathom-meeting-source.ts`, `meeting-workspace-read.repository.ts`, `meeting-workspace-state.repository.ts`, `meeting-follow-up-actions.ts`, `meeting-source-ingestion.service.ts`, `space-automation-service-06.base.ts`, tests


## [2026-08-04 13:18] - [FIX]

What: Treated Home Agenda’s Fathom→card link as canonical again. Opening a meeting copies that link into `meeting_recordings` (related recording id/url or merged Fathom `video_url`, including when `source` stays `google_calendar`). Merge upgrade keeps Fathom `related` when the calendar row only had a no-recording stub. Deployed attach/hydrate + merge fix to `api.roas.io`.
Why: An earlier filter/match path stripped agenda Fathom badges; workspace was matching Fathom separately and stayed at Recordings 0 even when Agenda already had the recording.
Impact: Hard-refresh Home (local web has the sync). Open a Fathom-linked agenda card → Recordings should populate from the same agenda link. Use Recordings + only when Agenda never had a Fathom URL/id.
Files: `sync-agenda-fathom-recording.ts`, `MeetingWorkspaceDialog.tsx`, `HomeMeetingDetailHost.tsx`, `integrations-calendar-dedupe.ts`, `meetings-precall-prep.helpers.ts`, `meeting-workspace.service.ts`, `fathom-meeting-workspace-attach.service.ts`, tests

## [2026-08-04 12:06] - [FIX]

What: Restarted stale local API so `POST /api/integrations/fathom/attach-to-meeting` is live (was 404 from a 3-day-old `dist/main`). Recording picker now renames generic Fathom titles like “Impromptu Zoom Meeting” using invitee names, and surfaces the real link error in the toast.
Why: Link failed because the running API process never loaded the new route; picker also showed raw Zoom placeholders instead of people names.
Impact: Hard-refresh web. Recordings + → select a call should link. Impromptu titles show as e.g. “Aaron + Dylan” when invitees exist. Auto-map still only attaches when calendar/time match is unambiguous — manual link remains the fallback.
Files: API restart, `display-fathom-recording-title.ts`, `MeetingRecordingsSection.tsx`, focused tests

## [2026-08-04 12:03] - [FEATURE]

What: Top-right work-area memory menu now shows specific surfaces (e.g. the open agenda meeting title, `Campaign / Space` instead of generic path crumbs) and can reopen a remembered meeting via restore payload.
Why: After accidentally toggling away, the history only said “Agenda” / “Campaigns / Meetings” with no way back to the exact meeting or campaign space.
Impact: Hard-refresh. Open a meeting, visit another surface, hover the panel control — pick the meeting name to return. Spaces remember `CampaignName / SpaceName`.
Files: `use-shell-store.ts`, `ShellBreadcrumb.tsx`, `ShellTopBar.tsx`, `ShellWorkAreaControl.tsx`, `HomeMeetingDetailHost.tsx`, `SpaceBreadcrumbHeader.tsx`, home restore hook, focused tests

## [2026-08-04 11:37] - [FIX]

What: Meeting chat awareness now reports linked recordings (or none), and when empty steers Pixel to Fathom `list_meetings` → `get_transcript` plus the Recordings **+** picker — no vague “check now” dead-end.
Why: Pixel only saw the empty workspace meeting row, so asking for action items produced a useless clarification and “wait for the recording” instead of pulling Fathom or guiding the link UI.
Impact: Hard-refresh and reopen the meeting chat (or send a new message after refresh). Empty-recording asks should try Fathom / point at Recordings +.
Files: `build-meeting-awareness-context.ts`, focused tests, `meeting-follow-up-slack.md`

## [2026-08-04 11:36] - [FEATURE]

What: Meeting workspace Recordings sidebar has **+** → click-to-select a Fathom recording → links it to this meeting via `POST /api/integrations/fathom/attach-to-meeting` (forced ingest onto the open workspace).
Why: Ended/live meetings with Recordings=0 had no way to attach a catching-up or missed Fathom call without waiting on auto-reconcile.
Impact: Restart/redeploy `apps/api` and hard-refresh web. Open a meeting → Recordings → + → pick a call. Already-linked ids show as linked.
Files: `fathom-meeting-workspace-attach.service.ts`, `fathom-meetings.controller.ts`, `MeetingRecordingsSection.tsx`, `MeetingContextSidebar.tsx`, `meeting-workspace-api.ts`, home toast config, focused tests, `meeting-follow-up-slack.md`

## [2026-08-04 11:31] - [FEATURE]

What: Meeting workspace header and right “Linked” sidebar now include Space and Campaign links (space from the meeting’s space; campaign from space.campaign_id or meeting context links).
Why: While in a live meeting panel there was no way to jump to the owning space/campaign without leaving and hunting in nav.
Impact: Hard-refresh Home. Open a meeting — Space (+ Campaign when mapped) appear next to the Live badge and under Linked in the sidebar.
Files: `MeetingWorkspaceContextLinks.tsx`, `resolve-meeting-workspace-links.ts`, `MeetingWorkspaceDialog.tsx`, `MeetingContextSidebar.tsx`, focused tests

## [2026-08-04 10:45] - [FEATURE]

What: Meeting action items now cross-reference by normalized title/text — live **+** adds reuse an existing Fathom/manual row, and recording ingest merges into matching live rows instead of creating duplicates.
Why: Manual commitments captured during the call and later provider action items from the recording were separate `meeting_actions` rows with no text match.
Impact: Restart/redeploy `apps/api`. Adding the same action twice toasts “Already on the list”. When Fathom lands, matching live items get provider evidence rather than a second card.
Files: `meeting-action-dedupe.ts`, `meeting-workspace-state.repository.ts`, `meeting-workspace.repository.ts`, `MeetingActionItemsSection.tsx`, home toast config, focused tests, `meeting-follow-up-slack.md`

## [2026-08-04 10:42] - [FIX]

What: Shell chat conversation list loads now use a module-level mount epoch so remounted `SpaceVibeyChatPanel` instances cannot apply orphaned fetch completions. Post-load selection prefers preferred/drawer/meeting targets and the live store active id over wiping to a blank new chat.
Why: Instance `seq` refs reset on remount, so a stale `loadConversations` could still call `setActiveConversationId(null)` after the shell had already selected a thread — blank Pixel empty state across meetings and normal chats.
Impact: Hard-refresh web. Opening/switching chats and meetings should keep the selected thread instead of flashing a new empty Pixel pane.
Files: `space-vibey-chat-panel.logic.ts`, `SpaceVibeyChatPanel.tsx`, focused tests

## [2026-08-04 10:40] - [FEATURE]

What: Meeting workspace Action items header has a **+** that opens an inline composer to add manual action items during the call (`POST .../meetings/:id/actions`, `source_type: manual`).
Why: Live calls only showed provider-captured actions with no way to capture commitments by hand as they come up.
Impact: Hard-refresh web and restart/redeploy `apps/api` so the new create route is live. Click + → type → Add (Esc cancels without closing the workspace).
Files: `meeting-workspace.controller.ts`, `meeting-workspace.service.ts`, `meeting-workspace-state.repository.ts`, `MeetingActionItemsSection.tsx`, `MeetingWorkspaceDialog.tsx`, `meeting-workspace-api.ts`, home toast config, focused tests, `meeting-follow-up-slack.md`

## [2026-08-04 10:37] - [FIX]

What: Meeting open now forces the linked conversation onto the chat panel immediately (dedicated preferred-id sync), re-reads live drawer/meeting targets when a stale `loadConversations` finishes after remount, clears meeting context only on explicit close (not StrictMode cleanup), and hides the “save to campaign” nudge while a meeting is attached.
Why: Prod meeting `AARON X DYLAN X NATE` already has conversation `07d5b486…` with 8 messages, but the left pane stayed on a blank Pixel empty state — selection lived only inside list hydration, which could early-return or be wiped by an orphaned load after the meeting panel remount.
Impact: Hard-refresh Home, reopen the live meeting — left chat should show “Account Manager Process Review” (the meeting thread), not a new Pixel start screen.
Files: `SpaceVibeyChatPanel.tsx`, `MeetingWorkspaceDialog.tsx`, `ChatCampaignBrainNudge.tsx`, `resolve-meeting-chat-panel.ts`, focused tests

## [2026-08-04 10:33] - [FIX]

What: Opening a meeting now prefers the linked meeting conversation immediately (no longer waits for `activeConversationId` to already match). Clears stale “new chat” rail intent, clears meeting chat context on workspace close, and ensures a missing conversation for live/complete workspaces.
Why: The meeting panel could attach while GlobalChatPanel gated meeting context on an already-active matching conversation, so the left shell stayed on a blank Pixel empty state.
Impact: Hard-refresh Home, reopen the live meeting — left chat should select the meeting thread instead of a new chat. Close the workspace to detach meeting awareness.
Files: `GlobalChatPanel.tsx`, `resolve-meeting-chat-panel.ts`, `MeetingWorkspaceDialog.tsx`, `use-global-chat-store.ts`, `SpaceVibeyChatPanel.tsx`, focused tests

## [2026-08-04 12:46] - [FIX]

What: Restored web `BACKEND_URL` to `https://api.roas.io` (calendar toast was from local API mid-reload dropping agenda requests). Reverted agenda unmatched-Fathom filtering so Home keeps its existing Fathom→card mapping. Workspace hydrate now only copies the agenda-linked call item’s Fathom identity into `meeting_recordings` (no parallel Fathom list match).
Why: Agenda linking is the canonical process; pointing web at local Nest during reloads caused “Failed to load calendar”, and a separate Fathom API hydrate path diverged from agenda’s related-call link.
Impact: Hard-refresh Home — calendar should load again. Recording parity in the workspace still needs the hydrate/ingest path deployed to `api.roas.io`.
Files: `apps/web/.env.local`, `meetings-precall-prep.service.ts`, `meeting-workspace.service.ts`, `fathom-meeting-workspace-attach.service.ts`

## [2026-08-04 12:42] - [FIX]

What: Agenda Fathom badge now means a real recording URL (`source === 'fathom'` or `related.recording_url`), not calendar-only call rows. Backend matches related calls by `calendar_event_id`, and empty meeting Recordings hydrate from call-item Fathom data or the best matching connected Fathom recording on workspace open.
Why: Home showed Fathom / “Open recording” for calendar-resolved meetings that never wrote `meeting_recordings`, so the workspace looked unlinked.
Impact: Hard-refresh Home. Fake Fathom badges drop for calendar-only meetings. Open meeting on a call with a clear Fathom match populates Recordings. Ambiguous Impromptu titles still need Recordings +.
Files: `AgendaCardEventEntry.tsx`, `meetings-precall-prep.*`, `meeting-workspace.service.ts`, `fathom-meeting-workspace-attach.service.ts`, `build-fathom-event-from-call-item.ts`, tests

## [2026-08-04 12:41] - [FIX]

What: Agenda no longer labels calendar-only call items as Fathom (“Open recording”). Matching prefers `calendar_event_id`. Opening a meeting workspace with empty Recordings auto-hydrates from call-item Fathom custom_data or the unique/best matching connected Fathom recording into `meeting_recordings`.
Why: Home showed Fathom linked for calendar-resolved meetings that had no recording, while the workspace correctly showed Recordings = 0 — split read models with a false agenda signal.
Impact: Hard-refresh Home. Calendar meetings without a real Fathom recording show Open meeting (no fake Fathom badge). Meetings with a matching Fathom call get Recordings populated on open. Use Recordings + when Fathom match is ambiguous (e.g. Impromptu titles).
Files: `meetings-precall-prep.helpers.ts`, `meetings-precall-prep.service.ts`, `meeting-workspace.service.ts`, `fathom-meeting-workspace-attach.service.ts`, `build-fathom-event-from-call-item.ts`, controller/module, tests

## [2026-08-04 12:30] - [FIX]

What: Pointed local web `BACKEND_URL` / `NEXT_PUBLIC_BACKEND_URL` at `http://localhost:3001` (where `POST /api/integrations/fathom/attach-to-meeting` exists). Softened meeting awareness so Pixel prioritizes Recordings + and does not claim the user’s Fathom is broken when agent tools fail.
Why: Web was proxying to `api.roas.io`, which still 404s on attach-to-meeting (route not deployed), so Recordings + always toasted “Could not link that recording.”
Impact: Hard-refresh localhost:3000, retry Recordings + → link. Production linking still needs an API deploy. Pixel guidance updates on new meeting chat turns.
Files: `apps/web/.env.local`, `build-meeting-awareness-context.ts`, focused test

## [2026-08-04 10:28] - [FIX]

What: Live meeting workspace CTA is **End call** (sets phase to `processing`) instead of **Rejoin call**; Zoom/meet link is a secondary “Open call link”. Live-call awareness now forces short brain-dump replies (1–3 bullets) unless the user asks for guidance.
Why: After Start call, Rejoin was the wrong primary action, and Pixel was writing full strategy essays while the user was dumping notes on the call.
Impact: End call → Ended badge + Continue in chat. Live chat style stays tight until guidance is requested. Refresh/reopen the meeting workspace to pick up the new awareness prompt.
Files: `MeetingWorkspaceDialog.tsx`, `build-meeting-awareness-context.ts`, `meeting-workspace-api.ts`, home toast config, focused tests

## [2026-08-04 10:26] - [FIX]

What: Chat image attachments now hydrate `mediaAssetId` → `public_url` before vision parts are built; image context only claims native inputs when a URL/data URL exists; missing vision parts fail closed; uploads without a public URL for images/video/audio are marked failed in the composer. Org chats also fall back to personal media assets when resolving URLs.
Why: Attachment chips could show on the bubble while the model received zero `input_image` parts (hydration only ran for text docs), so Pixel answered as if screenshots were missing.
Impact: Re-attach screenshots and resend after agent-api + web restart/deploy. Failed URL-less image uploads surface in the composer instead of a blind reply.
Files: `apps/agent-api/src/modules/chat/services/chat-message-enrichment.service.ts`, `chat-document-context.service.ts`, `chat-model-input.service.ts`, `apps/web/src/features/studio/components/ChatInput/use-chat-input-file-upload.ts`, focused tests

## [2026-08-04 10:15] - [FIX]

What: Removed the meeting workspace “Live notes & snippets” capture field and deleted `MeetingNoteCapture`. Notes belong in the linked left-side meeting chat.
Why: The separate form duplicated chat and told users to add the same content into the main conversation.
Impact: Workspace panel is start-call / actions / deliverables / sidebar only. Paste notes in the shell chat. Backend snippets API remains unused by web UI for now.
Files: `apps/web/src/features/home/components/MeetingWorkspaceDialog.tsx`, `apps/web/src/features/home/components/MeetingNoteCapture.tsx` (deleted), `apps/web/src/features/home/services/meeting-workspace-api.ts`, `apps/web/src/features/home/config/home-toast-errors.config.ts`, tests, `documentation/features/meeting-follow-up-slack.md`

## [2026-08-04 10:10] - [FIX]

What: Open meeting now fills the shell work area (right card) instead of a fullscreen modal, and still opens the linked meeting conversation in the left shell chat. Loading/error states use the same in-panel surface; resolve failures are sanitized.
Why: The curated workspace already called `openChatDrawer`, but Radix Dialog overlay covered the whole shell so the linked chat was invisible and the workspace felt like a popup.
Impact: Agenda **Open meeting** matches task-detail panel behavior — left chat + right workspace. Hard-refresh Home after web deploy.
Files: `apps/web/src/features/home/components/MeetingWorkspaceDialog.tsx`, `apps/web/src/features/home/components/HomeMeetingDetailHost.tsx`, `apps/web/src/app/(dashboard)/home/home-dashboard-content.tsx`, `apps/web/src/app/(dashboard)/home/meetings/page.tsx`, focused tests

## [2026-08-04 10:05] - [FIX]

What: Expanded `space_items_source_check` to allow `source = 'calendar'`, matching meeting workspace resolve inserts. Applied the same constraint change on production (`lhfgtsjetcardinpgouq`).
Why: Home Agenda **Open meeting** calls `/meetings/resolve`, which inserts a scheduled call row with `source: 'calendar'`. The check constraint still only allowed `manual|agent|agent_suggested|template|fathom`, so the insert failed and the modal showed the raw Postgres check-violation error.
Impact: Open meeting can create the scheduled meeting space item and open the workspace again. Retry Open meeting on the same calendar event without redeploying the API.
Files: `supabase/migrations/20260804101500_space_items_calendar_source.sql`

## [2026-08-04 13:27] - [FIX]

What: Replaced Pixel's shallow bot-token Slack search fallback with 120-day named-channel retrieval, thread expansion, relevance ranking, and explicit complete/partial coverage. Stored clean Team Intelligence findings separately so digest and thread follow-up copy cannot recursively repeat its subject, narrative wrapper, or CTA.
Why: Pixel missed an older book-funnel link that Viktor found, while proactive follow-up DMs repeated phrases such as “had a question” and “want a reply drafted” because an already-composed preview was composed a second time.
Impact: Named-channel Slack searches can recover older source links and thread evidence even on bot-token-only installs. Partial searches no longer look conclusive to Pixel. New and already-queued follow-up items render as one clean sentence per signal.
Files: `slack-channel-history-search.ts`, `slack-agent-tools.service.ts`, `slack-team-loop.service.ts`, `slack-team-signal-message.ts`, Slack capability/policy contracts, migration, focused tests, `integration-connections.md`

## [2026-08-04 14:05] - [FEATURE]

What: Added permalinked, date-aware, cursor-paginated Slack history; exposed full-search/fallback/reconnect status in Settings; and made the existing Slack observation ledger the durable named-channel search archive with coverage-aware backfill and freshness refresh.
Why: Live Slack search is unavailable on bot-token-only installations, and recent-history scans cannot reliably recover links or decisions from months of workspace history.
Impact: Pixel can search durable historical Slack evidence with verifiable source links, while users can see whether their Slack connection has native full search or is operating through the historical fallback.
Files: `slack-api-integration-history-search.base.ts`, `slack-agent-tools.service.ts`, `slack-archive-search.service.ts`, `slack-observation.service.ts`, `slack-observation.repository.ts`, Slack DTO/capability contracts, Settings integration UI, migrations, tests, `integration-connections.md`

## [2026-08-04 16:31] - [FIX]

What: Replaced narrow-screen wrapping in the Flows, Brain, Agents, Teams, and shared Space-view toolbars with a single non-wrapping horizontal control strip. Flows now converts its fixed desktop category rail into a horizontal mobile navigation strip, and both mobile contracts have regression coverage.
Why: The wrapped toolbar and permanently visible 220px Flows rail squeezed loop content into roughly 150px even though the document itself did not overflow.
Impact: Toolbars stay aligned and scroll horizontally. Flows navigation remains available above a full-width loop list, so names, states, triggers, and actions remain readable on phones.
Files: `FlowsBrowseHub.tsx`, `FlowsBrowseHub.test.tsx`, `FlowsToolbar.tsx`, `FlowsToolbar.test.tsx`, `BrainHomeToolbar.tsx`, `Team2Toolbar.tsx`, `TeamsToolbar.tsx`, `ToolbarShell.tsx`, `agent-follow-up-work.md`

## [2026-08-04 17:58] - [FIX]

What: Optimized remaining dense shared web surfaces for mobile with stacked or horizontal navigation rails, single-row scrollable toolbars, and compact responsive data rows.
Why: Desktop fixed-width rails, wrapped controls, and dense columns were competing for narrow phone widths and making content unreadable.
Impact: Mobile users retain compact navigation and horizontally scrollable controls; desktop layouts retain their existing split views. SpaceItemsContainer isolated-panel mobile swap deferred (LOC allowlist).
Files: Space channel/template/media/ads research views, shared `ToolbarShell.tsx`, Flows browse/toolbar, Brain and Team toolbars/detail views, focused tests
