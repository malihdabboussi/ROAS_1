# Changelog - July 17, 2026

## [2026-07-17 16:33] - [FIX]

What: Replaced the partial Studio search route with server-backed global search for tasks, Space and conversation docs, mission deliverables, conversations, campaigns, and campaign artifacts; added progressive core/artifact loading, stale-request cancellation, explicit failure text, correct deep links, and trigram indexes for every searched title field.
Why: Global Search only filtered the current in-memory conversation list while a 16-query artifact fan-out ran separately, so docs/tasks/deliverables were invisible and searches appeared stuck.
Impact: Search results now reflect workspace data instead of whichever chat list last populated the client store. Core results can appear before artifact lookup finishes, failed searches explain what happened, and deployed indexes accelerate substring matching.
Files: `apps/api/src/modules/entity-search/**`, removed `apps/api/src/modules/studio-search/**`, `apps/api/src/app.module.ts`, `apps/api/src/test/contract/__snapshots__/route-inventory.test.ts.snap`, `apps/web/src/features/studio/components/StudioSearchModal.tsx`, `StudioSearchModal.test.tsx`, `studio-search-api.service.ts`, `studio-search-messages.config.ts`, `open-studio-search-result.ts`, `Sidebar.tsx`, `useSidebarController.ts`, `supabase/migrations/20260717233000_global_search_trigram_indexes.sql`, `documentation/features/claude-chatgpt-shell.md`

## [2026-07-17 16:12] - [FEATURE]

What: Moved global Search from Home sidebar into the top bar (icon next to Tasks); Chat menu keeps Search using the same hub-row control that opens StudioSearchModal; removed Home-menu Search row.
Why: Search belongs in chrome, not the Home nav list; Chat’s old inline search looked weaker than the Home search entry.
Impact: Hard-refresh. Top-bar Search opens the studio search modal; Chat tab shows the Search row; Home menu no longer lists Search.
Files: `ShellTopBar.tsx`, `SidebarHqHubMenu.tsx`, `ShellChatMenu.tsx`, `SpaceConversationsList.tsx`, `SpaceConversationsHeader.tsx`

## [2026-07-17 16:06] - [STYLE]

What: Campaigns flyout — remove chevrons, fix icon/label gap; spaces sub-flyout header gets New space +; More flyout moves New project + onto the Projects row (not the flyout header).
Why: Rows looked squished; create actions belonged next to their targets.
Impact: Hard-refresh. Hover Campaigns / a campaign / More → spacing and + placement match the intended layout.
Files: `SidebarHqSpacesRows.tsx`, `SidebarHqSpacesGroupedList.tsx`, `SidebarHqMoreFlyoutBody.tsx`, `SidebarHqFlyouts.tsx`, `SidebarHqHubMenuContent.tsx`, `globals.css`

## [2026-07-17 16:03] - [FIX]

What: Conversations no longer stick as "Untitled conversation" after a failed/errored first send — set a first-message title at create/send time, fall back when Gemini suggest-title fails, and mirror live titles into the shell Chat list.
Why: Title was only applied after a successful stream (or LLM suggest); errors left DB title as "New Conversation", which the UI strips to "Untitled".
Impact: New chats show a snippet of the first message immediately; LLM can still upgrade the title later when suggest succeeds.
Files: `conversation-title.ts`, `chat.service.ts`, `SpaceVibeyChatPanel.tsx`, `TeamHrSideChatPanel.tsx`, `agent-chat-panel.send.ts`, `ShellChatMenu.tsx`, tests

## [2026-07-17 16:03] - [FEATURE]

What: Contextual top-bar new-chat pencil — Home still opens `/home?chat=new`; on section routes opens a fresh docked chat drawer (`openFreshChatDrawer`), switches to Chat menu, closes the right summary panel, stays on the current page. Also: purple active rail labels; remove Campaigns flyout Favourite caption; More chevron 13px.
Why: Pencil must start a chat from a collapsed sidebar without leaving Team/Brain/Spaces/etc.
Impact: Hard-refresh, collapse sidebar, open a space → pencil slides out empty chat drawer; on Home → full new-chat screen.
Files: `use-shell-store.ts`, `ShellTopBar.tsx`, `SidebarHqRail.tsx`, `SidebarHqSpacesGroupedList.tsx`, `SidebarHqHubMenuContent.tsx`, `globals.css`, `claude-chatgpt-shell.md`

## [2026-07-17 16:00] - [FEATURE]

What: Sidebar submenu pass — collapsed rail More (•••) flyout for Projects/Flows; Campaigns nested spaces sub-flyout (replaces accordion); Brain keeps captions with muted “Enable in Manage Brains” for disabled scopes; outside click + Home/Chat/New/pin close all dock flyouts.
Why: Match shared flyout spec for rail + expanded menu, nested Campaigns UX, and clear disabled-brain CTAs.
Impact: Hard-refresh. Hover rail More / Campaigns / Brain; hover a campaign row for spaces; pin/New/Home-Chat clears open popovers.
Files: `manage-rail-items.tsx`, `HubDockFlyout.tsx`, `SidebarHqFlyouts.tsx`, `SidebarHqMoreFlyoutBody.tsx`, `SidebarHqSpacesGroupedList.tsx`, `SidebarHqSpacesRows.tsx`, `SidebarBrainFlyout.tsx`, `SidebarHqHubMenuContent.tsx`, `use-shell-store.ts`, `globals.css`, tests/docs

## [2026-07-17 15:55] - [FIX]

What: Top-bar sidebar hover peek overlays the main area again (`hub-sidebar-shell-peek` fixed under the 52px top bar) instead of widening the layout like pin/Expand. Pin still expands in-flow to 272px; collapsed rail stays 72px during peek.
Why: Hover felt identical to clicking Expand (in-flow slide) instead of first popping the menu over the content.
Impact: Hard-refresh. Hover PanelLeft → menu floats over the dashboard; click PanelLeft → pins and pushes content. Rail Team/Campaigns/Brain hover still uses `HubDockFlyout` popovers only.
Files: `Sidebar.tsx`, `SidebarHqRail.tsx`, `globals.css`, `documentation/features/claude-chatgpt-shell.md`

## [2026-07-17 15:42] - [FIX]

What: Spaces/chat nav no longer full-page reloads on revisit — stale-while-revalidate for spaces list + items/overrides TTL, warm SpacesContainer paint, stop forcing sidebar Spaces dock refetch, cache shell chat menu conversations + roster TTL, invalidate item/conversation caches on mutations.
Why: Hover-menu navigation remounted cold paths (`loading: true`, TTL 0, dock `reloadSidebarLists`) and flashed spinners every visit.
Impact: Hard-refresh once; revisit Spaces / open Chat menu should paint cached data immediately and refresh in background.
Files: `use-spaces-store.ts`, `SpacesContainer.tsx`, `SidebarHqHubMenuContent.tsx`, `ShellChatMenu.tsx`, `use-global-chat-store.ts`, `keyed-fetch-cache.test.ts`, `use-spaces-store.test.ts`

## [2026-07-17 15:16] - [FIX]

What: Hub menu hover flyouts now portal to `document.body` (were clipped by overflow-hidden ancestors); More always hover-opens Projects/Flows; selected Home row keeps purple glass fill (was wiped to white + pink border by CSS).
Why: Docked menus never appeared; selected state looked wrong vs the sample.
Impact: Hard-refresh, pin sidebar, hover Team / Campaigns / Brain / More — panels should appear beside the row.
Files: `SidebarHqHubMenuContent.tsx`, `globals.css`

## [2026-07-17 15:14] - [STYLE]

What: Cleaner shell chrome to match design sample — quieter top-bar icons (no heavy glass), left-aligned + New, pill Home/Chat toggle, purple selected highlight on active menu rows, hidden scrollbars on sidebar flyouts + home Agenda/list cards.
Why: Current shell felt cluttered vs the sample (spacing, scrollbars everywhere, centered New, weak active color).
Impact: Hard-refresh. Expanded Home stays flat (hover docks Team/Campaigns/Brain/More); dashboard cards scroll without visible bars.
Files: `ShellTopBar.tsx`, `ShellMenuChrome.tsx`, `SidebarHqHubMenuContent.tsx`, `globals.css`, `AgendaCard.tsx`, `HomeListCardShell.tsx`, `RecentAgentConversationsRows.tsx`

## [2026-07-17 15:11] - [STYLE]

What: Shell menu polish — hide "Open in" unless doc/media export targets exist (no broken empty pill); expanded Home menu matches mock (flat rows + docked hover flyouts for Team/Campaigns/Brain/More with Projects+Flows); Home/Chat toggle + New/Search spacing; remove Chat from collapsed rail (Chat only via expanded toggle); footer shows plan label.
Why: Open in looked broken on Home; expanded menu didn't match the design dock/hover pattern; Chat shouldn't appear on the collapsed rail.
Impact: Hard-refresh. Open a Drive/native doc to see Open in; pin sidebar and hover Team/More for docked micro-menus.
Files: `ShellOpenInMenu.tsx`, `ShellTopBar.tsx`, `ShellMenuChrome.tsx`, `SidebarHqHubMenuContent.tsx`, `SidebarHqShellFooter.tsx`, `Sidebar.tsx`, `globals.css`

## [2026-07-17 15:07] - [STYLE]

What: Shell polish pass — expanded sidebar is a solid in-flow column (`bg-background` + `border-r`) flush under the top bar (no floating `card-glass` overlay); widths ~72/272; peek grace 450ms; hide unused ⋯; rail Chat opens shell Chat menu; pinned campaigns in Home menu.
Why: Expanded menu still read as liquid-glass floating over the dashboard even after T-junction layout.
Impact: Hard-refresh. Click PanelLeft to pin a solid menu that pushes content; hover-peek no longer uses a translucent card over Agenda.
Files: `SidebarHqRail.tsx`, `Sidebar.tsx`, `globals.css`, `ShellTopBar.tsx`, `use-shell-store.ts`, `SidebarHqShellFooter.tsx`, `SidebarHqHubMenuContent.tsx`, `useSidebarController.ts`

## [2026-07-17 15:02] - [FIX]

What: Shell review fixes — hide top-bar ⋯ unless chat/space context has actions; stop Home from rendering a stale chat thread (only `?chat=new` / `?conv=` show chat); T-junction layout with full-width top bar above sidebar; remove fixed peek overlay that covered the top bar; shared peek hold/close timer + instant hub close to stop expand flicker.
Why: Home showed chat + useless ⋯; peek kept popping; glass sidebar sat on top of the chrome instead of stretching under it.
Impact: Hard-refresh. `/home` is the dashboard again; PanelLeft peek expands in-flow under the top bar.
Files: `dashboard-frame.client.tsx`, `layout.tsx`, `ShellTopBar.tsx`, `ShellWorkspace.tsx`, `use-shell-store.ts`, `Sidebar.tsx`, `SidebarHqRail.tsx`, `useSidebarController.ts`, `globals.css`

## [2026-07-17 14:59] - [FEATURE]

What: Shipped Claude/ChatGPT-inspired dashboard shell (Phases 0–7): design handoff in `.docs/design/claude-chatgpt-shell-v4/`, `useShellStore`, 52px `ShellTopBar` (pin/peek, New, Open in ▾, summary + space-work toggles), Home/Chat sidebar menus + More flyout, new-chat greeting + Home conversation surfaces, persistent left chat drawer with resize/minimize, space work collapse, right panel Tasks/Files/Sources (Files wired to space docs/media + Drive browse; Open in resolves Drive/Docs/Canva from `?item=`).
Why: Recreate the agreed shell prototype behaviors in `apps/web` with token-faithful styling and existing Drive/chat APIs.
Impact: Hard-refresh `roas-web`. Use top-bar PanelLeft to expand sidebar; Chat menu opens drawers on workspace routes; New → `/home?chat=new`.
Files: `apps/web/src/components/shell/*`, `dashboard-shell.tsx`, `Sidebar.tsx`, `SidebarHqRail.tsx`, `SidebarHqHubMenu*.tsx`, `useSidebarController.ts`, `globals.css`, `.docs/design/claude-chatgpt-shell-v4/`, `documentation/features/claude-chatgpt-shell.md`

## [2026-07-17 13:02] - [FIX]

What: Added plugin-aware OpenClaw config validation to the final Fly image build and switched Fly runtime checks plus ROAS deploy smoke checks from lightweight process health to deep gateway/auth readiness.
Why: A stale config could reference a missing plugin, crash OpenClaw, and still leave Fly reporting the agent-api process as healthy.
Impact: Invalid runtime plugin configurations now fail before release, and Fly marks machines unhealthy when the gateway or auth dependency cannot serve agent work.
Files: `docker/Dockerfile`, `docker/fly.roas.runtime.toml`, `docker/fly.runtime.toml`, `docker/fly.runtime.staging.toml`, `apps/agent-api/src/health.controller.test.ts`, `scripts/roas/deploy-fly-runtimes.sh`, `scripts/roas/smoke-deploy.sh`, `scripts/roas/README.md`

## [2026-07-17 12:59] - [FIX]

What: Fathom webhook now listens for `shared_team_recordings` + `my_shared_with_team_recordings` (not only `my_recordings`). Recreated Dylan’s live webhook. Stopped absorbing teammate `recorded_by` emails into `fathom_aliases` (would force Call Kind=Personal).
Why: Meetings only showed Personal because Fathom never delivered teammate-hosted Team Plan recordings to ROAS.
Impact: New team Fathom calls will ingest into Meetings with call_kind Team when Dylan wasn’t on them. Hard-refresh after next teammate recording. Historical team calls still need a backfill if desired.
Files: `fathom-oauth.service.ts` (+test), `fathom-webhook.service.ts`, `fathom.repository.ts`

## [2026-07-17 12:54] - [FIX]

What: Fixed OpenClaw crash from missing `whatsapp` plugin in `docker/openclaw.json` (gateway was down → "Call (naming…)" + Gateway connection error: fetch failed). Added deterministic Meeting Purpose title fallback + gateway-error retries for task-agent. Redeployed Fly; renamed stuck personal weekly-wins call and re-invoked Vibey.
Why: Invalid plugins.entries.whatsapp made openclaw-gateway exit immediately (ECONNREFUSED :18789), so Fathom naming and Meeting Log agent work failed permanently.
Impact: Fly gateway healthy again. Hard-refresh Meetings — the stuck row should show a real title; agent retry is in progress for the meeting log.
Files: `docker/openclaw.json`, `fathom-meeting-title.ts`, `space-automation-service-06.base.ts`, `task-agent.service.ts`, tests

## [2026-07-17 12:51] - [STYLE]

What: Webinar Fulfillment subtasks use `Task 1–10 — …` titles (gates stay Gate 1–3); skill slugs removed from labels; UI maps legacy titles so the live mission list updates on refresh.
Why: Skill-slug titles were hard to scan; gates were numbered but work steps were not.
Impact: Hard-refresh `roas-web` for this mission’s list. Redeploy `mission-worker` so new missions persist Task N titles. Docs stay WEB#N.
Files: `webinar-fulfillment.helpers.ts`, `webinar-fulfillment.playbook.ts`, `webinar-fulfillment-titles.ts`, `MissionListCell.tsx`, `SubtasksSection.tsx`, `SubtaskDetailHeader.tsx`, `PlanDetailModal.tsx`

## [2026-07-17 12:49] - [FIX]

What: Finished subtask output no longer dumps raw JSON — shows the human/agent note text only (content or summary), labeled "Your note" / "Agent notes".
Why: Gate approve stores `{ summary, completed_by_human, deliverable_id, artifact_manifest }` without `content`, so the UI fell through to `JSON.stringify`.
Impact: Hard-refresh `roas-web`. Reopen an approved gate — you see the approval sentence, not JSON metadata.
Files: `subtask-detail.ts`, `SubtaskDetailContent.tsx`, `PlanDetailModal.tsx`, `messages.config.ts`

## [2026-07-17 12:48] - [FIX]

What: Mission doc preview has "Back to mission"; gate approve no longer creates empty docs; webinar flow docs use WEB#N titles (playbook + Space template + dual-write aliases); hide human approval receipts from deliverable lists.
Why: X-only preview felt like a dead end; Gate 1 approval was fake docs; Copy Package stayed a template stub when title mismatch blocked overwrite; flow order was unclear without numbering.
Impact: Hard-refresh `roas-web`. Redeploy `roas-api` (gate complete) + Fly `agent-api` (dual-write aliases) + `mission-worker` (WEB#N contracts). Existing Spaces keep old titles until agents re-save (aliases still match). New Spaces get WEB#1–#8 stubs.
Files: `DeliverablePreviewModal*.tsx`, `MissionDetailOverlayModals.tsx`, `MissionDetailModal.tsx`, `MissionDetailModalView.tsx`, `subtask-detail.ts`, `mission-human-subtask.service.ts`, `webinar-fulfillment.*.ts`, `space-template-catalog-agency-client-webinar.ts`, `artifact-document-mission-deliverables.service.ts`, `roas-webinar-copy-package/SKILL.md`

## [2026-07-17 12:41] - [STYLE]

What: Gate review sidebar is one panel — Action required embeds inside Review/Activity (no stacked “No activity yet”); upstream checklist renamed; duplicate “Your turn” chip removed.
Why: Right column showed completed upstream steps above an empty Activity empty-state, which looked contradictory.
Impact: Hard-refresh `roas-web`. Open Gate 2 — one Review column with approve/request changes + composer.
Files: `MissionDetailDesktopShell.tsx`, `ActivityTimeline.tsx`, `ActivityTimelineLogList.tsx`, `HumanGateReviewPanel.tsx`, `SubtaskDetailContent.tsx`

## [2026-07-17 12:39] - [FIX]

What: Ops Desk working/idle badges now filter the agent roster; briefing lists presence-working agents even without a mission; cards show "Working now" instead of "Nothing assigned" when status is working.
Why: Counts used agent.status while cards only showed mission focus, so "1 working" looked like everyone was idle.
Impact: Click working/idle on the Ops Desk to see who matches; click again to clear.
Files: `ops-desk-summary.ts`, `VibeyOpsDeskBriefing.tsx`, `VibeyOpsDesk.tsx`, `AgentsGrid.tsx`, `Team2ManageContent.tsx`, `messages.config.ts`

## [2026-07-17 13:42] - [FIX]

What: Spaces rail / mobile Spaces now lands on `/campaigns` (all-campaigns overview) instead of auto-opening a single space; rail/hub/chat treat `/campaigns` as Spaces surface.
Why: Clicking Spaces jumped straight into one space with no campaigns overview entry point.
Impact: Spaces → CAMPAIGNS list → Open a campaign → space rows still open `/spaces`. Flyout space/campaign links unchanged.
Files: `SidebarHqRail.tsx`, `MobileNav.tsx`, `sidebar-hq-hub-menu.utils.ts`, `work-context.config.ts`, `GlobalChatLayout.tsx`, tests

## [2026-07-17 13:45] - [FEATURE]

What: Renamed side-menu Spaces → Campaigns; rebuilt `/campaigns` into a usable hub — search, create campaign, expand spaces per campaign, open space, Overview/Work, create space, share, delete.
Why: Rail landed on a dead Open/Dashboard card list; nav label still said Spaces.
Impact: Campaigns menu → hub with spaces + actions; flyout still opens individual spaces.
Files: `manage-rail-items.tsx`, `MobileNav.tsx`, `SidebarHqHubMenuContent.tsx`, `work-context.config.ts`, `campaigns/page.tsx`, `CampaignsHub.tsx`, `CampaignsHubCampaignCard.tsx`

## [2026-07-17 15:05] - [FIX]

What: Replaced mission preflight's duplicate partial action-domain map with the canonical `@vibey/agent-policy` registry and added a Webinar Fulfillment contract drift test.
Why: Static Ads was blocked before execution because mission preflight rejected the supported `create_ad` action; the same omission would have blocked `create_funnel` later.
Impact: Supported playbook output actions share one source of truth, Static Ads and Funnel Design pass action recognition, and future playbook drift fails tests before deployment.
Files: `mission-execute-helpers.ts`, `mission-output-contract-actions.test.ts`, `apps/mission-worker/package.json`, `pnpm-lock.yaml`, `documentation/features/missions.md`, `.docs/plans/mission-output-contract-capability-drift-audit.md`

## [2026-07-17 15:10] - [FIX]

What: Added `@vibey/agent-policy` to both synchronized mission-worker container build and runtime package sets.
Why: Railway correctly installed the new worker dependency from `package.json`, but its curated Docker build context did not copy or build that workspace package, causing `TS2307` during deployment.
Impact: Railway can compile the canonical preflight registry and the production worker can resolve it at runtime.
Files: `apps/mission-worker/Dockerfile`, `docker/mission-worker.Dockerfile`

## [2026-07-17 15:19] - [FEATURE]

What: Moved page breadcrumbs (icons + trail) into the shell top bar via a shared `ShellBreadcrumb` registration slot; Team, Spaces, Flows, and Skills no longer reserve an in-content breadcrumb row.
Why: Clear duplicate chrome and match the sample top-bar breadcrumb placement.
Impact: Top bar shows rich crumbs when a page registers them; path-label fallback remains for routes without a publisher.
Files: `ShellBreadcrumb.tsx`, `use-shell-store.ts`, `ShellTopBar.tsx`, `TeamManageBreadcrumbHeader.tsx`, `SpaceBreadcrumbHeader.tsx`, `FlowsBreadcrumbHeader.tsx`, `skills-breadcrumb-header.tsx`

## [2026-07-17 15:21] - [STYLE]

What: Removed right-side chevrons from Home-menu flyout nav rows (Team/Campaigns/Brain/More); Chat menu now has an inline search field with a filter control (all/pinned/campaign/general + by agent).
Why: Flyout affordance chevrons were noise; Chat needed real list search/filter instead of the Home studio-search button.
Impact: Cleaner Home nav rows; Chat tab can narrow conversations by text and agent/scope filters.
Files: `SidebarHqHubMenuContent.tsx`, `SidebarHqHubMenu.tsx`, `ShellChatMenu.tsx`

## [2026-07-17 15:22] - [STYLE]

What: Replaced the More flyout’s “New project” list row with a plus button on the Projects row (inline name field still opens below).
Why: Create action belongs on the Projects entry, not as a nested list item.
Impact: More flyout shows Projects + Flows cleanly; plus starts project creation.
Files: `SidebarHqHubMenuContent.tsx`

## [2026-07-17 15:25] - [FEATURE]

What: Removed Home minimized Chat pill; dropped the shell chat drawer’s duplicate minimize top bar (collapse stays in the chat header row); moved agent picker + conversation history chrome into the left Chat sidebar using the checkbox-row `SpaceConversationsList` pattern.
Why: History/search/agent belong in the Chat menu; Home and the drawer no longer need redundant minimize chrome.
Impact: Chat sidebar shows agent picker, search, all-agents toggle, New, and circle-icon history rows; chat panel keeps a single collapse control.
Files: `home-dashboard-content.tsx`, `ShellChatDrawer.tsx`, `ShellWorkspace.tsx`, `GlobalChatPanel.tsx`, `SpaceVibeyChatPanel.tsx`, `SpaceChatHeaderActions.tsx`, `ShellChatMenu.tsx`, `use-shell-store.ts`

## [2026-07-17 15:26] - [FEATURE]

What: Home is dashboard-only; the former Home hero (greeting, composer, templates, recommendations) is the full New Chat screen. Removed unused `ShellActiveWorkList`.
Why: New Chat should look like the expanded Home chat hero; dashboard widgets stay on Home.
Impact: `+ New` / `?chat=new` shows the full chat start UI; Home shows Your dashboard cards without the composer stack.
Files: `home-dashboard-content.tsx`, `ShellNewChatGreeting.tsx`, `ShellMenuChrome.tsx`, `SidebarHqHubMenuContent.tsx`, `ShellActiveWorkList.tsx` (deleted)

## [2026-07-17 15:34] - [STYLE]

What: Aligned shell chrome to the Claude/ChatGPT prototype: 52px top bar with 30×30 icon buttons, enabled/disabled back-forward, crumb icon + ⋯, Home/Chat segmented toggle, New chip sizing, nav row density + purple glass active, sidebar 12px padding / 32px wordmark / footer, Agenda NEXT→Tomorrow→rows with dedupe, card radius/shadow and text hierarchy tokens.
Why: Current build drifted from exact prototype values (flat active rows, faint icons, wrong Agenda order).
Impact: Shell and Agenda match the handoff specs via shared CSS utilities/tokens.
Files: `globals.css` (web + website tokens), `ShellTopBar.tsx`, `ShellMenuChrome.tsx`, `SidebarHqHubMenuContent.tsx`, `SidebarHqRail.tsx`, `SidebarHqShellFooter.tsx`, `AgendaCard.tsx`, `AgendaCardEventEntry.tsx`, `agenda-list-view.ts`

## [2026-07-17 15:37] - [FIX]

What: Made parent breadcrumbs clickable — Team → team overview (`/team`), Skills → `/team` + `/team/skills`, Space campaign folder → campaign/campaigns hub.
Why: Parent crumbs like Team were static text even though overview pages exist.
Impact: Team / Agents and Skills trails navigate; space campaign crumb opens the campaign.
Files: `TeamManageBreadcrumbHeader.tsx`, `Team2ManageShell.tsx`, `skills-breadcrumb-header.tsx`, `SpaceBreadcrumbHeader.tsx`

## [2026-07-17 15:41] - [FIX]

What: Moved chat agent selector from the Chat sidebar into the chat header (next to the conversation title / New chat); sidebar stack is search + all-agents toggle + list filter (New removed). Restored surface recommendation switcher — Brain → Atlas, Team/HR → Jaime — and wired new-chat composer to the selected agent.
Why: Agent switching belongs in the chat surface; sidebar New duplicated the top New control; recommendation banner was missing on new-chat.
Impact: Agent picker works on open chats and new chats; Chat menu filters without a second New button; Team recommends Jaime again.
Files: `ShellChatMenu.tsx`, `ShellNewChatAgentBar.tsx`, `ShellNewChatGreeting.tsx`, `SpaceVibeyChatPanel.tsx`, `SpaceConversationsHeader.tsx`, `SpaceConversationsList.tsx`, `HomeDashboardV4Composer.tsx`, `work-context.config.ts` (+ test)

## [2026-07-17 15:43] - [STYLE]

What: Full conversation chat is full-bleed (no max-width card frame); message/composer stay centered; scrollbar runs the full main column (far right). Sidebar uses a visible shell border divider; shell chat drops rounded card chrome.
Why: Centered 740px bordered panel left an empty gutter and put the scrollbar mid-screen instead of ChatGPT-style edge scroll.
Impact: Chat feels fluid against the sidebar divider; scrollbar sits at the right edge of the main area.
Files: `ShellWorkspace.tsx`, `SpaceVibeyChatPanel.tsx`, `SidebarHqRail.tsx`, `globals.css`

## [2026-07-17 15:44] - [STYLE]

What: Collapsed-sidebar new-chat control uses `SquarePen` (pencil-in-square) instead of bare `Pencil`; breadcrumb ⋯ only shows when a page registered a trail (hidden on Home).
Why: Bare pencil read as edit; Home does not need section options.
Impact: New-chat affordance matches ChatGPT-style compose icon; Home crumb is cleaner.
Files: `ShellTopBar.tsx`

## [2026-07-17 15:55] - [STYLE]

What: Unified HQ sidebar flyouts (rail + expanded menu) on shared `HubDockFlyout` — fixed 6px-right of trigger, card shell/shadow, header title + search/+, 300ms leave grace, pin on interact, close on navigate. Campaigns: header search/new, exclusive accordion spaces inline (no nested flyout / bottom search / New campaign row). Brain keeps existing subsections with shared row/caption styles.
Why: Collapsed and expanded menus used different flyout chrome and Campaigns nested a second hover panel.
Impact: Identical flyout UX from rail or expanded Home menu; Campaigns expands spaces in-place.
Files: `HubDockFlyout.tsx`, `SidebarHqFlyouts.tsx`, `SidebarHqHubMenuContent.tsx`, `SidebarHqHubMenuSpacesSection.tsx`, `SidebarHqSpacesGroupedList.tsx`, `SidebarHqSpacesRows.tsx`, `SidebarBrainFlyout.tsx`, `SidebarHqRail.tsx`, `SidebarHqSection.tsx`, `globals.css`

## [2026-07-17 16:01] - [FEATURE]

What: Captured structured deliverable IDs from successful mission tool results, kept receipt-linked artifacts visible on blocked subtasks, prefixed deliverable names with their originating non-human task number, and added local creation time to the deliverables list.
Why: Draft work was persisted but appeared missing after a subtask blocked, and deliverable rows showed neither their task position nor a precise creation timestamp.
Impact: Reviewers can see work as it is created, multiple artifacts retain the same task number, human gates do not consume task numbers, and every list row shows when the artifact was made.
Files: `mission-execute-helpers.ts`, `mission-execute-helpers.test.ts`, `mission-execute-phase.service.ts`, `subtask-detail.ts`, `subtask-detail.test.ts`, `MissionDetailModalView.tsx`, `DeliverablesCarouselListView.tsx`, `DeliverablesCarousel.test.tsx`, `documentation/features/missions.md`

## [2026-07-17 16:13] - [FEATURE]

What: Replaced the full-screen-only deliverable preview chrome with a right-docked artifact workspace below the app top bar, added canonical `Open in Space` routing, grouped Copy/download actions, and added expand/collapse controls.
Why: Mission documents obscured the Space navigation and scattered important actions across unlabeled icons and a floating footer control.
Impact: Reviewers can keep Space context visible, jump into the canonical editable doc, copy or export from one grouped control, expand for focused review, and collapse without closing the document.
Files: `DeliverablePreviewActions.tsx`, `DeliverablePreviewActions.test.tsx`, `DeliverablePreviewModal.tsx`, `DeliverablePreviewModal.test.tsx`, `DeliverablePreviewModalHeader.tsx`, `DeliverablePreviewModalToolbar.tsx`, `DeliverablePreviewModalToolbar.test.tsx`, `DeliverablePreviewExportFooter.tsx` (deleted), `use-deliverable-export-actions.ts`, `documentation/features/missions.md`

## [2026-07-17 16:32] - [FIX]

What: Centered deliverable previews launched from Missions, added native Space document export to Google Docs, persisted the created Google file metadata, and shared the existing HTML/Google metadata helpers across the full editor and preview.
Why: The docked preview left an awkward top shelf over an already-open Mission, and the preview omitted the configured create-a-Google-Doc capability because it only checked for pre-existing Google file links.
Impact: Mission reviews open as centered dialogs; native docs can create and open a Google Doc from the preview, and subsequent clicks reopen the saved Google Doc instead of creating duplicates. Editing remains explicit through `Open in Space`.
Files: `DeliverablePreviewModal.tsx`, `DeliverablePreviewModal.test.tsx`, `MissionDetailOverlayModals.tsx`, `SpaceDocDeliverablePreview.tsx`, `SpaceDocDeliverablePreview.test.tsx`, `SpaceDocGoogleExportButton.tsx`, `VisualDocFullMode.tsx`, `deliverable-preview-messages.config.ts`, `space-doc-export.ts`, `spaces-api.ts`, `spaces.service.ts`, `DocEditorExportDropdown.tsx`, `DocEditorPanelInner.tsx`, `export-space-doc.ts`, `export-space-doc-docx.server.ts`, `ShellOpenInProvider.tsx`, `google-doc-export.test.ts`, `documentation/features/missions.md`, `documentation/utilities/space-doc-export.md`, `documentation/utilities/README.md`

## [2026-07-17 16:13] - [FIX]

What: Matched Campaigns flyout row icon/label gap to nested space rows (`12px` shared `hub-dock-flyout-row` gap). More → Projects now opens a nested projects flyout (list + header `+` create) instead of inline statue rows; clears stuck create-project input on close. Removed unused `SidebarHqProjectList`.
Why: Campaigns icons sat too tight vs the spaces sub-menu; Projects create field stayed open under More after a click.
Impact: Campaigns and Projects flyouts use the same nested hover pattern and spacing rhythm.
Files: `SidebarHqSpacesRows.tsx`, `SidebarHqMoreFlyoutBody.tsx`, `SidebarHqHubMenuContent.tsx`, `SidebarHqFlyouts.tsx`, `globals.css`, `SidebarHqProjectList.tsx` (deleted), `documentation/features/claude-chatgpt-shell.md`

## [2026-07-17 16:20] - [STYLE]

What: Chat menu toolbar is now `[all-agents] [filter] [Search]` on one row (agent/filter left of Search). List still defaults to current-agent conversations.
Why: Agent toggle and filter sat on a separate right-aligned row under Search.
Impact: Cleaner Chat sidebar controls; Search stays the primary trailing control.
Files: `SpaceConversationsHeader.tsx`, `SpaceConversationsList.tsx`, `ShellChatMenu.tsx`, `ShellMenuChrome.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-07-17 16:21] - [STYLE]

What: Tightened Brain flyout subsection spacing (`gap-spacing-6` → `gap-spacing-1`) and slightly reduced caption padding.
Why: Large empty gaps between User / Customer / Agent / Campaign Knowledge sections.
Impact: Brain menu reads as a compact list without sparse section breaks.
Files: `SidebarBrainFlyout.tsx`, `globals.css`

## [2026-07-17 16:24] - [FIX]

What: Hardened HQ dock flyout pointer paths — left hover bridges, tighter offsets (2px / 0 nested), longer leave grace, viewport clamp after measure, and ignore leave when moving into another dock flyout (nav row, campaign row, Projects, rail wrapper).
Why: Dead zones / misaligned panels made it easy to drop the hover bridge before reaching nested menus.
Impact: Parent → nested (Campaigns spaces, More Projects) and rail/menu → flyout stays reachable without accidental close.
Files: `HubDockFlyout.tsx`, `globals.css`, `SidebarHqSpacesRows.tsx`, `SidebarHqMoreFlyoutBody.tsx`, `SidebarHqHubMenuContent.tsx`, `SidebarHqSection.tsx`, `documentation/features/claude-chatgpt-shell.md`
