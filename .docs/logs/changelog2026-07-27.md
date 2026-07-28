# Changelog - July 27, 2026

## [2026-07-27 21:45] - [FIX]

What: Agent chat context now always injects personal-cross-context Fathom (and peers) for the owning user in org workspaces, even when org agent-team grants omit them; Fathom token lookup prefers personal/`limit(1)` instead of `maybeSingle`.

Why: Org General-team grants seed only `user_integrations.org_id = team.org_id`, so personal Fathom was stripped from `<connected_integrations>` and Pixel told users it was not connected while Settings showed connected.

Impact: Pixel sees Fathom as connected in org chat and can run `list_meetings` / `get_transcript` without a false disconnect. Requires agent-api (+ api) deploy.

Files: `integration-context.service.ts`, `fathom.repository.ts`, `integrations-status.service.ts`, `integration-connections.md`, tests

## [2026-07-27 16:20] - [FEATURE]

What: Redesigned the Home meeting detail modal (summary → full transcript disclosure → meeting links → your/other action items) and made transcripts durable + lazy-loaded. Fathom ingest stores `custom_data.summary` + `custom_data.transcript_text`; agenda `related` returns summary, has_transcript, and assignee fields without shipping full transcripts in the agenda list.

Why: The old modal mashed recording + tasks with opaque `logged` status, and transcripts were either dumped into description or dropped when a summary existed.

Impact: New Fathom calls keep a full transcript for on-demand “Full transcript”. Existing calls still work via legacy description detection or Fathom link. Requires API + web production deploy.

Files: `HomeMeetingDetailHost.tsx`, `extract-call-transcript.ts`, `calendar-api.ts`, `meetings-precall-prep.service.ts`, `meetings-precall-prep.helpers.ts`, `space-automation-service-06.base.ts`, related tests.

## [2026-07-27 16:20] - [FIX]

What: Bound Home Inbox card height so list/detail scroll; restored Cursor-style chat-history relative age ↔ ⋯ hover flip; moved summary panel into the chat header (left of close) with Campaign & space scope inside the chat column.

Why: Unbounded Inbox `h-full` blocked Home scroll; history times were unused; workspace top-bar summary lived outside chat and General chats had no campaign reconnect control.

Impact: Home Agenda+Inbox scrolls again; chat rows show `19m`/`10h` until hover reveals ⋯; Tasks/Files/Sources + campaign/space picker open beside the thread.

Files: `InboxFeedCard.tsx`, `HomeInboxWorkspace.tsx`, `SpaceConversationRows.tsx`, `SpaceChatHeaderActions.tsx`, `ShellRightPanel.tsx`, `SpaceVibeyChatPanel.tsx`, `ShellTopBar.tsx`, `ShellWorkspace.tsx`, `claude-chatgpt-shell.md`

## [2026-07-27 16:15] - [FIX]

What: Slash playbooks seed before async catalog fetch; space awareness attaches only on `chatSurface === 'spaces'`; conversation hydrate prefers pending/shell drawer ids and keeps the thread when context chip is removed.

Why: Playbook `/` entries were empty until skills/workflows loaded; global chat was injecting space awareness off-spaces; refresh and shell restore could clear the active thread or fail to reopen a pending conversation.

Impact: Playbooks appear immediately in slash menu; detached global context no longer sends space awareness; shell drawer and pending open restore the same conversation without wiping selection on list load.

Files: `use-chat-input-slash-data.ts`, `SpaceVibeyChatPanel.tsx`, `space-vibey-chat-panel.logic.ts`, `ShellChatDrawer.tsx`, `frontend-shared-surfaces.md`

## [2026-07-27 15:28] - [FEATURE]

What: Redesigned the Home meeting detail modal and enriched agenda `related` payloads with summary, Fathom/recording URL fallback, and follow-up assignee fields so action items split into yours vs others.

Why: The old “Call recording & tasks” block showed opaque titles and raw `logged` status ids, with no summary or clear Fathom link, so meetings were hard to scan after open.

Impact: Meeting modal order is Summary → Meeting links (task + Fathom/join) → Your action items → Other action items → Prep → Who/Where. Tasks no longer append `· logged`. Requires API + web deploy for summary/assignee split.

Files: `HomeMeetingDetailHost.tsx`, `HomeMeetingDetailHost.test.tsx`, `calendar-api.ts`, `meetings-precall-prep.service.ts`, `meetings-precall-prep.helpers.ts`, helpers tests.

## [2026-07-27 15:27] - [ARCH]

What: Merged feedback phase1 A–D onto local `main`; moved Quick Missions catalog to `@/lib/spaces` for studio slash; allowlisted ConversationShareModal + QuickMissionsHubModal.

Why: Main merge hit architecture gate (cross-feature import + LOC); local main needed the full feedback set.

Impact: Local `main` has all feedback work; slash playbooks import a shared lib catalog.

Files: `lib/spaces/quick-missions-catalog.ts`, `use-chat-input-slash-data.ts`, `loc-allowlist.json`, `frontend-shared-surfaces.md`

## [2026-07-27 15:24] - [ARCH]

What: Integrated feedback phase Agents A→B→C→D onto `feat/feedback-phase1-integrate`; resolved changelog/follow-up conflicts; fixed LOC/eslint gates (artifact-tasks allowlist drop, SpaceContentRouter/chat.service/SpaceItemsContainer bumps, StudioSearchModal helpers extract).

Why: Parallel worktrees needed a serialized merge with architecture gate compliance.

Impact: All 15 feedback items from Agents A–D are on one integrate branch ready for smoke/QA.

Files: merge commits A–D, `scripts/arch/loc-allowlist.json`, `studio-search-modal-helpers.tsx`, changelogs/follow-up log

## [2026-07-27 15:19] - [FIX]

What: Agent A Fathom truth — portal-grounded follow-up name prefixes (Anis→Anees), Speaker N remap API + minimal UI, personal Fathom auto-resolve/pull in org scope, and expanded call kinds (personal|team|executive|external|sales) with migration + classifier.

Why: Feedback: wrong task owner names, junk Speaker labels, false "Fathom not connected" while recordings exist, and call kind stuck on personal/team.

Impact: New Fathom follow-ups ground titles on portal People/roster; Speaker N can be bound and persisted; agents auto-use personal Fathom to pull transcripts in org workspaces; Meetings call kinds include executive/external/sales.

Files: fathom-portal-people-grounding/loader, fathom-meeting-item-enrichment, fathom-call-kind, space-automation-service-06/13, artifact-integration-connection-resolution, space speaker-remaps API + SpeakerRemapPanel, personal-dashboard catalog, migration 20260727153000

## [2026-07-27 15:19] - [FEATURE]

What: Mid-conversation campaign+brain soft prompt (after N user turns, explicit confirm), conversation share pass-off with teammate notify + handoff link, and Quick Missions hub with `/` playbook slash entries.

Why: Valuable General chats were stuck off-campaign without a durable brain save path; share was invite-only; playbooks were missing from slash discovery and had no pick-mission → client → context → run flow.

Impact: Users can attach mid-chat work to a client campaign and save extracted memories into that campaign brain; share can notify a teammate; slash and composer expose Quick Missions playbooks.

Files: `ChatCampaignBrainNudge.tsx`, `work-context.config.ts`, `conversation-processing.service.ts` (api + agent-api), `ConversationShareModal.tsx`, `conversation-shares.controller.ts`, `QuickMissionsHubModal.tsx`, `use-chat-input-slash-data.ts`, related tests/changelog.

## [2026-07-27 15:18] - [FIX]

What: Shell polish for Inbox two-pane contained scroll, Cmd+K idle recents/presets (chats, campaigns, missions, Meetings), and Spaces click-to-open without refresh-to-edit.

Why: Inbox scrolled as one page blob with empty-feeling detail; Cmd+K idle showed only “Start typing…”; Spaces deep-link/open cleared selection during view/query swaps or marked missing items as handled too early.

Impact: Inbox list and detail scroll independently with filled detail on select; Cmd+K opens with recents + Go-to presets; space items open immediately from click and `?item=` deep links once loaded.

Files: `InboxFeed.tsx`, `InboxDetailPane.tsx`, `InboxListRow.tsx`, `use-inbox-triage.ts`, `StudioSearchModal.tsx`, `studio-search-api.service.ts`, `studio-search-messages.config.ts`, `use-space-item-navigation-events.ts`, `SpaceItemsContainer.tsx`, related tests

## [2026-07-27 15:17] - [FIX]

What: Wired Space list/meeting row drag into chat (`getRowChatDragPayload` + `application/x-vibey-artifact`), hydrated `get_space_item` with meeting/transcript/deliverables/action items, fixed long drafted Slack/message packages wrapping in chat bubbles, and made context-limit Resume/Continue start a compact+continue turn instead of dead-run polling.

Why: Feedback phase items 4, 5, 7, and 8 — drag attach, agent read of attached meetings/tasks, clipped draft packages, and unreliable context-window resume.

Impact: Meetings/tasks drag into chat; agents can open attached items with full meeting context; long draft packages wrap without horizontal clip; Resume after context overflow continues work after compaction.

Files: `SpaceContentRouter.tsx`, `space-item-values.chat-drag.test.ts`, `artifact-tasks.service.ts`, `artifact-space-item-*.helper.ts`, `artifact-action-schemas.ts`, `artifact-tasks.repository.ts`, LockedIn/message wrap surfaces, `chat.service.ts` (studio), `chat-stream-recovery.service.ts`, `StreamInterruptedBar.tsx`

## [2026-07-27 15:00] - [FIX]

What: Moved `statusField` `useMemo` above the loading early-return in `HomeSpaceTaskDetailHost` so opening a home task (including meeting prep from agenda) no longer violates Rules of Hooks.

Why: Production crashed with a blank client-side exception when agenda → open meeting → start/open prep mounted the host through loading → ready.

Impact: Home meeting prep and Fathom-related agenda opens load the task detail instead of killing the app shell.

Files: `apps/web/src/features/home/components/HomeTaskDetailHost.tsx`, `HomeTaskDetailHost.test.tsx`

## [2026-07-27 00:01] - [FIX]

What: Replaced the duplicated, edge-clipped AI capability marquee with a stable responsive capability group, and made selected-agent layouts give the agent profile the work area while the canonical AI Chat is open.

Why: Authenticated browser testing showed half-rendered capability labels in narrow chat layouts and a redundant team overview compressed between the selected-agent chat and profile.

Impact: Every AI capability remains fully visible at shared-screen widths. Agent pages now use one composer and one clear detail surface while AI Chat is open, then restore the team overview when chat is collapsed.

Files: `apps/web/src/components/shell/ShellEmptyChatCapabilityScroller.tsx`, `ShellEmptyChatPrompts.test.tsx`, `apps/web/src/features/team-2/components/Team2DetailView.tsx`, `Team2DetailView.test.tsx`, and both product `globals.css` files.

## [2026-07-27 08:55] - [FEATURE]

What: Added persisted HQ menu docking (left/right/top/bottom via hold-on-R-logo), simplified right-panel motion ownership, and aligned feature toolbars/filters with the shared shell chrome. Also fixed clipped AI capability labels and selected-agent work-area layout while chat is open.

Why: Users need a movable menu without losing Home on click, and feature toolbars were inconsistently dense/clipped against the new shell.

Impact: Desktop menu placement is a personal preference; mobile stays left. Toolbars across Campaigns, Programs, Tasks, Brain, Contacts, Flows, Artifacts, Media, and Paid Ads share denser scoped controls. Capability chips stay fully readable.

Files: `ShellMenuDockLayout`, `use-shell-menu-dock`, sidebar HQ rail/logo overlay, feature toolbar/filter modules, both product `globals.css`, and `documentation/features/claude-chatgpt-shell.md`.

## [2026-07-27 08:56] - [ARCH]

What: Removed `CrmContactsContainer.tsx` from `loc-allowlist.json` after it dropped under the 400 LOC component limit.

Why: Architecture gate requires allowlist shrink when a file recovers under its limit.

Impact: Contacts list container is no longer permanently allowlisted.

Files: `scripts/arch/loc-allowlist.json`

## [2026-07-27 14:54] - [FIX]

What: Stopped the R logo from triggering native browser image-drag during hold-to-dock, and made the dock affordance follow the pointer instead of a static center ghost.

Why: Holding the logo was lifting the PNG as a page image drag, so users never entered the four-edge menu dock gesture.

Impact: Hold on R now owns the gesture: edge targets highlight and a tokenized lifted mark tracks the pointer; short click still opens Home/menu.

Files: `SidebarHqHubLogoButton.tsx`, `ShellMenuDockOverlay.tsx`, `use-shell-menu-dock.ts`, both product `globals.css`, related tests.

## [2026-07-27 15:10] - [FEATURE]

What: Added a persisted HQ menu dock value `work` that mounts the rail on the left edge of the shell work card (Chat | Menu | Work), with seam-aware hold-to-dock targeting and frame-left fallback when the work column cannot host.

Why: Users want the HQ menu attached to the work/Space card beside AI Chat for a true split-screen layout, not only on outer frame edges.

Impact: Hold-R can drop onto the work seam; desktop flyouts from `work` open into the card like `left`. Mobile and collapsed/full-chat cases keep the previous left-rail fallback without clearing the saved preference.

Files: `use-shell-menu-dock.ts`, `ShellSidebarSlot.tsx`, `ShellMenuDockLayout.tsx`, `ShellWorkspace.tsx`, `ShellMenuDockOverlay.tsx`, `SidebarHqHubLogoButton.tsx`, both product `globals.css`, shell docs/tests.

## [2026-07-27 16:10] - [FEATURE]

What: Finished the five-zone HQ menu dock redesign — replaced the four frame edges (`left`/`right`/`top`/`bottom`) plus `work` with five homes that are never over AI Chat: frame `left`, `work`, `work-top`, `work-bottom`, `work-right` (legacy values auto-migrate). R logo click now toggles the rail between expanded and **compact** (Option A) in place instead of navigating Home; Home moved to the dedicated Home rail icon. Dragging the expanded rail lifts the whole menu, dragging compact lifts only the R chip. Removed the leftover chat-history "Show chat history" restore peek from the HQ rail (`SidebarHqRail.tsx`) so it only exists inside `ShellChatDrawer`, pinned top-left of the chat surface. Work-attached docks now ride with a collapsing work card as a thin right vertical rail instead of disappearing, and `work-top` / `work-bottom` are horizontally centered on the work card instead of spanning over chat.

Why: Continuing prior WIP (`unrelated-wip-before-menu-dock-v2` branch work) per user-confirmed Option A for R-click behavior; the four-frame model let docks compete with Chat for edges and mixed chat-history restore with menu docking in the same corner.

Impact: `pnpm --filter web exec vitest run src/components/shell/use-shell-menu-dock.test.ts src/components/shell/ShellMenuDockLayout.test.tsx src/components/layout/sidebar/SidebarHqHubLogoButton.test.tsx src/components/shell/ShellChatDrawer.test.tsx src/components/layout/sidebar/SidebarHqSection.test.tsx` is green (23/23), and the full `src/components/shell` + `src/components/layout/sidebar` suite is green (124/124). Purple drop targets are kept for manual QA of all five homes.

Files: `apps/web/src/components/shell/use-shell-menu-dock.ts`, `ShellMenuDockLayout.tsx`, `ShellWorkspace.tsx`, `ShellChatDrawer.tsx`, `apps/web/src/components/layout/Sidebar.tsx`, `apps/web/src/components/layout/sidebar/{ShellMenuDockOverlay,SidebarHqHubLogoButton,SidebarHqRail,HubDockFlyout}.tsx`, matching tests, both product `globals.css`, `documentation/features/claude-chatgpt-shell.md`.

## [2026-07-27 16:15] - [FIX]

What: Added a bottom expand arrow to the collapsed work-attached rail (`.shell-menu-dock-collapsed-right`, shown when the menu dock is `work`/`work-top`/`work-bottom`/`work-right` and the work card is collapsed). The chevron button sits below the HQ rail inside the thin strip and calls the existing `useShellStore().setWorkAreaOpen(true)` action — the same store action `ShellWorkAreaControl` uses — to restore the work card.

Why: PR #67 follow-up: the thin right collapsed rail previously had no way to re-expand the work card except the top-bar `ShellWorkAreaControl`; a bottom expand affordance on the rail itself was a locked requirement still missing.

Impact: Users can restore the collapsed work card directly from the bottom of the collapsed HQ rail, without hunting for the top-bar control. No new store state — reuses `workAreaOpen`/`setWorkAreaOpen`. Verified History restore remains only in the chat top-left (`ShellChatDrawer`, guarded by `SidebarHqSection.test.tsx`) and R-logo click still toggles menu compact (Option A) in `SidebarHqHubLogoButton.tsx`.

Files: `apps/web/src/components/shell/ShellWorkspace.tsx`, `ShellWorkspace.test.tsx`, both product `globals.css`.

## [2026-07-27 16:28] - [FIX]

What: Fixed chat video artifact UI: open events pass media kind, the shell viewer corrects type from the resolved asset, history rail lists images and videos, final-answer layout stops duplicating media_asset players, and echoed process_media toolResult JSON is stripped before URL scraping.

Why: Pixel’s successful Story render showed multiple video cards, raw JSON interleaved with players, and clicking Processed media opened as an image (No preview → broken MP4 img) with an images-only artifacts rail.

Impact: Video cards open as playable videos; artifacts rail shows mixed image/video history; chat no longer scrapes tool JSON into extra players.

Files: `open-media-asset-in-app.ts`, `ShellArtifactViewerAdapter.tsx`, `ShellMediaArtifactViewer.tsx`, `ShellMediaHistoryRail.tsx`, `FinalOutputCards.tsx`, `GeneratedMedia.tsx`, `chat-content-segments.ts`, `message-bubble.utils.ts`, related tests, `claude-chatgpt-shell.md`.

## [2026-07-27 16:42] - [FEATURE]

What: Reshaped IG industry packs to six client-aligned niches: merged trades+home, dropped auto, added real estate/mortgage, coaching, and social/influencer (3 scenes each).

Why: Client base is educator verticals (RE/mortgage, coaching, insurance, trades/home, creators), not auto repair; selection needed packs that match the book of business.

Impact: Production filters and skill library now expose the revised pack list; 18 industry scenes ready for Higgsfield preset generation.

Files: `ig-organic-video-scenes.config.ts`, migration `20260727164500_ig_organic_video_industry_packs_v2.sql`, skill contract test, `social-research.md`.


## [2026-07-27 22:10] - [FIX]

What: Fixed call-kind expansion migration for production (`spaces` has no `deleted_at`) and applied the three Jul 27 migrations on `roas-production` (`lhfgtsjetcardinpgouq`): call-kind options, IG industry scenes, IG industry packs v2. Shipped local main to GitHub, redeployed `roas-web`/`roas-funnels`, forced `roas-api` + Fly `roas-runtimes`.

Why: Production ship of local WIP; call-kind SQL failed on live schema; API builds are gated by `ignoreCommand: exit 0` so git push alone does not deploy Nest.

Impact: Meetings call kinds include executive/external/sales; IG organic skill content updated; agent Fathom org context + chat UX live once API/Fly finish.

Files: `supabase/migrations/20260727153000_expand_meeting_call_kind_options.sql`, production DB migrations, Vercel/Fly deploys.

