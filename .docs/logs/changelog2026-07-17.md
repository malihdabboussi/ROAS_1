# Changelog - July 17, 2026

## [2026-07-17 21:00] - [FIX]

What: Entering or switching a Space route auto-expands the Space work dock (`setSpaceWorkOpen(true)`).
Why: A prior collapse was persisted, so clicking into a Space showed chat-only until the user manually reopened the dock.
Impact: Hard-refresh. Navigate to `/spaces` or change `?space=` → Space dock opens; collapse still works until you leave/switch Space.
Files: `apps/web/src/components/shell/ShellWorkspace.tsx`, `ShellWorkspace.test.tsx`

## [2026-07-17 20:37] - [FEATURE]

What: Space work dock beside chat with persisted open tabs for docs/tasks; collapse hides the dock without unmounting Space; expand restores the last active tab via `?item=`.
Why: Collapse previously swapped away the Space page and dropped open docs/tasks; users need Cursor/ChatGPT-style continuity next to chat.
Impact: Hard-refresh. On `/spaces`, open a doc or task → tab strip appears; collapse Space → full chat; expand → same tab/item. List summary panel unchanged.
Files: `ShellWorkspace.tsx`, `SpaceWorkDock.tsx`, `SpaceWorkTabStrip.tsx`, `space-work-tabs.ts`, `use-shell-store.ts`, `use-space-work-tab-sync.ts`, `SpaceItemsContainer.tsx`, `globals.css` (web + website), `documentation/features/claude-chatgpt-shell.md`

## [2026-07-17 20:25] - [FEATURE]

What: Shipped Page Grader → ROAS brain import end-to-end: Lovable deployed Portal `roas-api` `GET /clients/:id/brain-package`; pushed feature branch; cherry-picked Import brain API+UI onto `main` via PR #1; production `roas-api` + `roas-web` Ready on `be1dfffa`.
Why: ROAS should be the control center for pulling a mapped Page Grader client intelligence package into a campaign/space brain (Christian Osgood / Multifamily Strategy first).
Impact: Settings → Page Grader client map → **Import brain** is live against Portal. Verified brain-package for Multifamily Strategy (`9e1226dc-…`) returns ~2.5MB package; prod import route responds 401 without auth (route present, not 404).
Files: Page Grader `supabase/functions/roas-api` + `_shared/roasBrainPackage.ts` (Lovable/main `773dc460f`); ROAS `page-grader-brain-import.service.ts`, controller/DTO/integration, `PageGraderClientScopeMapModal.tsx`, `page-grader-scope-api.ts`; PR https://github.com/dylanvanas1/roas-platform/pull/1

## [2026-07-17 20:23] - [FIX]

What: Restored `resolveSpaceChatScope` in `space-vibey-chat-panel.logic.ts` (override → conversation → panel fallback).
Why: Partial chat revert left `SpaceVibeyChatPanel` importing a helper that was never put back into the logic module.
Impact: Hard-refresh. Space/global chat panel builds again; header scope picker keeps using effective campaign/space.
Files: `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.logic.ts`, `space-vibey-chat-panel.logic.test.ts`

## [2026-07-17 20:22] - [FIX]

What: Added `assignConversationScope` to conversations API and barrel-exported `conversation-assets`.
Why: After a partial chat revert, scope-picker / summary code imported helpers that never landed in `@/lib/conversations`, so Turbopack failed on missing exports.
Impact: Hard-refresh. Conversation scope picker and chat summary file extraction resolve from the conversations barrel again.
Files: `apps/web/src/lib/conversations/conversations-api.ts`, `apps/web/src/lib/conversations/index.ts`

## [2026-07-17 20:21] - [FIX]

What: Re-exported `shell-artifact-viewer` (`SHELL_ARTIFACT_OPEN_EVENT`, `ShellArtifactViewerTarget`, etc.) from `@/lib/artifacts`.
Why: `ShellArtifactViewerAdapter` imports the open event from the barrel, but the module was never barrel-exported, so Turbopack failed the client build.
Impact: Hard-refresh. Shell artifact viewer adapter loads again without the missing-export build error.
Files: `apps/web/src/lib/artifacts/index.ts`

## [2026-07-17 20:19] - [FIX]

What: Re-exported `ConversationHeaderTitle` and `ConversationScopePicker` from `@/components/conversations`.
Why: `SpaceVibeyChatPanel` imports them from the barrel, but the barrel only exported share/list helpers, so Turbopack failed the client build.
Impact: Hard-refresh. Global/Space chat shell loads again without the missing-export build error.
Files: `apps/web/src/components/conversations/index.ts`

## [2026-07-17 16:55] - [FIX]

What: Made Space Doc Fields collapsed by default and replaced hover-only title actions with a persistent header group for Google Docs, Copy, remaining exports, and Share.
Why: The mission deliverable preview had the new action hierarchy, but opening the underlying document in Spaces still hid exports until title hover, buried Google Docs in a menu, omitted Copy, and expanded every field on open.
Impact: Space Docs now open focused on document content while keeping the same primary document actions visible beside the title; Google export continues to reuse the saved Google Doc link and other formats remain in the export menu.
Files: `apps/web/src/features/spaces/components/docs/DocEditorPanel.tsx`, `DocEditorPanel.test.tsx`, `DocEditorPanelInner.tsx`, `editor/DocEditorHeaderActions.tsx`, `DocEditorHeaderActions.test.tsx`, `DocEditorExportDropdown.tsx`, `documentation/features/space-items-custom-data-drive.md`

## [2026-07-17 16:48] - [FIX]

What: Moved the Space document Google Docs action into the mission deliverable header beside Open in Space and Copy, replaced the generic external-link glyph with the Google Docs logo, and routed document creation through the managed Composio Google Drive action.
Why: The action was detached inside the document body, and its direct Google API upload bypassed the connected integration execution path, producing a blank tab and `Failed to create Google Doc` when Google rejected the request.
Impact: Mission document previews now group the Google action with the other file actions; successful exports create and open an editable Google Doc while preserving the existing one-time export metadata behavior.
Files: `apps/web/src/components/deliverables/DeliverablePreviewActions.tsx`, `DeliverablePreviewModal.tsx`, `DeliverablePreviewBody.tsx`, `SpaceDocDeliverablePreview.tsx`, `SpaceDocGoogleExportButton.tsx`, tests, `apps/api/src/modules/integrations/google-drive/services/google-drive-composio-files.service.ts`, `google-drive-api.service.test.ts`, `documentation/features/space-items-custom-data-drive.md`

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
## [2026-07-17 16:42] - [FIX]

What: Replaced unsupported Space item path links with the canonical query route, centralized Space item link building/parsing, and added backward normalization for previously saved links.
Why: Mission deliverable `Open in Space` links used `/spaces/{spaceId}/{itemId}`, but the app only serves `/spaces?space={spaceId}&item={itemId}`, causing a 404 for the user's Static Ads document and the same class of link from Brain, Flow tests, document mentions, task menus, and doc menus.
Impact: Existing legacy links and all newly generated links now open the requested Space item instead of a 404. API-generated Mission document metadata now stores the supported route.
Files: `space-item-href.ts`, `space-item-href.test.ts`, `mission-deliverable-from-block.ts`, `mission-deliverable-from-block.test.ts`, `DeliverablePreviewActions.tsx`, `DeliverablePreviewActions.test.tsx`, `space-doc-deliverable.ts`, `spaces-api.ts`, `use-task-menu-actions.ts`, `use-doc-menu-actions.ts`, `doc-mention-link-previews.ts`, `doc-mention-link-previews.test.ts`, `collect-task-deliverables.ts`, `flow-builder-test.utils.ts`, `flow-builder-test.utils.test.ts`, `node-detail-formatters.ts`, `KnowledgeSourcePreview.tsx`, `KnowledgeSourcePreview.test.tsx`, `artifact-document-mission-deliverables.service.ts`, `documentation/features/missions.md`, `documentation/utilities/space-item-href.md`, `documentation/utilities/README.md`

## [2026-07-17 16:48] - [FIX]

What: Portaled `Team2FilterDropdown` (fixed + viewport clamp) with tokenized `dropdown-menu-solid` foreground/background so Chat filter labels are readable and not clipped. Chat menu Search is local conversation filter again; Studio search stays top-bar / Cmd-K. Removed unused `ShellSidebarSearchButton`.
Why: Filter menu was clipped by sidebar overflow (looked blank/white-on-white); Chat Search opened global Studio search by mistake.
Impact: Filter options visible and fully on-screen; typing in Chat Search narrows the list only.
Files: `Team2FilterDropdown.tsx`, `ShellChatMenu.tsx`, `ShellMenuChrome.tsx`, `globals.css`, `documentation/features/claude-chatgpt-shell.md`

## [2026-07-17 16:51] - [FIX]

What: Made the sidebar New button open a fresh docked chat on workspace routes while preserving the current Space or section, and centralized the shell route policy shared by the sidebar, top bar, and workspace renderer.
Why: The sidebar action always navigated to `/home?chat=new`, even though the top-bar action already kept workspace content open.
Impact: Clicking New inside a Space now leaves that Space visible and opens a blank side chat; Home still opens the full new-chat screen.
Files: `ShellMenuChrome.tsx`, `ShellMenuChrome.test.tsx`, `ShellTopBar.tsx`, `ShellWorkspace.tsx`, `shell-route-policy.ts`, `documentation/features/claude-chatgpt-shell.md`
## [2026-07-17 17:24] - [FEATURE]

What: Added a visible campaign / Space scope tag to docked Space chats, shared the existing scope picker across Team and Spaces, added an explicit General reset, and made campaign + Space moves atomic. Chat sends, edits, voice sessions, composer context, and artifact references now follow the selected conversation scope instead of silently inheriting only the visible route.

Why: Conversations were scoped internally but gave users no visible indication or way to move or clear that scope, making it unclear where agent-created work would be saved.

Impact: Users can see where a chat belongs, move it to another Space, or clear it into General without closing the Space currently on screen. Existing saved scope is honored on future turns, and unrelated visible-Space context is withheld after a move.

Files: `apps/web/src/components/conversations/ConversationScopePicker.tsx`, `apps/web/src/components/conversations/ConversationScopeTrigger.tsx`, `apps/web/src/components/conversations/conversation-scope-picker-layout.ts`, `apps/web/src/components/conversations/ConversationScopePicker.test.tsx`, `apps/web/src/components/conversations/index.ts`, `apps/web/src/features/team-2/components/Team2AgentChatWithConversations.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.logic.ts`, `apps/web/src/features/spaces/components/chat/space-vibey-chat-panel.logic.test.ts`, `apps/web/src/lib/conversations/conversations-api.ts`, `apps/web/src/lib/conversations/conversations-api.test.ts`, `documentation/features/claude-chatgpt-shell.md`, `documentation/frontend-shared-surfaces.md`.

## [2026-07-17 17:33] - [FIX]

What: Top-bar pencil on Spaces/workspace routes opens/restores the chat drawer when closed; only starts a fresh new chat when the drawer is already open.
Why: Pencil always called `openFreshChatDrawer()`, forcing the heavy new-chat greeting even when the user only needed to reopen chat.
Impact: Closed chat → reopen last conversation; open chat → new chat. Stay on the Space page.
Files: `ShellTopBar.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-07-17 17:34] - [FIX]

What: Extended the shared agent runtime chat warm-up retry window from six attempts to eight while preserving the existing SSE readiness updates and tenant-safe shared-runtime routing.
Why: A shared Fly runtime restart could outlast the proxy's 31-second retry schedule, causing chat to show an agent-ready error even though the runtime recovered shortly afterward.
Impact: Chat now remains connected through longer shared-runtime restarts and can complete on a later recovery attempt without resending the user's message or falling back to a dedicated Fly machine.
Files: `apps/web/src/app/api/proxy/[...path]/route.ts`, `apps/web/src/app/api/proxy/[...path]/route.test.ts`

## [2026-07-17 17:34] - [STYLE]

What: Chat menu conversation search is a plain left-aligned “Search” row (hub-menu style, no glass container); agent/filter sit after it.
Why: Bordered “Search conversations…” field looked heavy and truncated in the Chat sidebar.
Impact: Cleaner Chat toolbar; filtering behavior unchanged.
Files: `SpaceConversationsHeader.tsx`, `SpaceConversationsList.test.tsx`
## [2026-07-17 17:37] - [STYLE]

What: Split conversation header presentation into full and compact modes. Full chat now mirrors the conversation name into the shell breadcrumb, shows the name beside the agent, and supports inline rename; docked chat hides the conversation name and renders an 80px Space-only scope tag with the full campaign / Space path retained in its tooltip.

Why: The full-width title placement was useful, but reusing it inside the narrow docked chat forced the title, scope tag, and collapse control to collide and clip during resize.

Impact: Full chat retains a clear, editable identity in both breadcrumb and header. Docked chat keeps the agent, location, and collapse control stable down to the drawer's minimum width without dismissing the visible Space.

Files: `apps/web/src/components/conversations/ConversationHeaderTitle.tsx`, `ConversationHeaderTitle.test.tsx`, `ConversationScopePicker.tsx`, `ConversationScopePicker.test.tsx`, `ConversationScopeTrigger.tsx`, `conversation-scope-picker-layout.ts`, `index.ts`, `apps/web/src/components/global-chat/containers/GlobalChatPanel.tsx`, `apps/web/src/components/shell/ShellTopBar.tsx`, `ShellWorkspace.tsx`, `shell-chat-breadcrumb.ts`, `shell-chat-breadcrumb.test.ts`, `apps/web/src/features/spaces/components/chat/SpaceChatAgentPicker.tsx`, `SpaceChatAgentPicker.test.tsx`, `SpaceVibeyChatPanel.tsx`, `documentation/features/claude-chatgpt-shell.md`, `documentation/frontend-shared-surfaces.md`.

## [2026-07-17 17:39] - [STYLE]

What: Collapsed HQ rail uses symmetric inset padding and a full-width icon layer (no fixed 72px column), so icons aren’t biased left with empty space on the right.
Why: Left-only shell padding + `w-[72px]` layer made the collapsed menu look padded on the right.
Impact: Tighter, centered collapsed rail.
Files: `globals.css`, `SidebarHqRail.tsx`

## [2026-07-17 17:45] - [FIX]

What: Connected the Home new-chat composer to a temporary full-chat route, forced submitted Home messages into a fresh conversation, replaced the temporary route with the created conversation URL, and removed the redundant “New chat” label beside the agent picker.
Why: Home sends were only queued in the global chat store while no chat panel was mounted to consume them, so the screen stayed on the composer and the message could appear later when another chat surface mounted.
Impact: Sending from Home now opens the chat immediately, creates a new thread, keeps the user on that thread while the response streams, and leaves the new-chat header visually cleaner.
Files: `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.test.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/ShellWorkspace.test.tsx`, `apps/web/src/components/shell/ShellNewChatAgentBar.tsx`, `apps/web/src/components/shell/ShellNewChatAgentBar.test.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-07-17 17:48] - [FIX]

What: Docked empty chat drawer no longer renders Home template fan / “For you” chrome; HQ rail vs Chat menu layers share one `hubExpanded` visibility signal; persisted chat-drawer width is clamped on hydrate.
Why: Wide drawers looked like a second Home new-chat page beside Spaces, and a one-frame rail/menu desync could flash Chat list UI in the collapsed shell.
Impact: Empty drawer matches shell empty-chat (greeting + composer); collapsed rail stays the icon column only.
Files: `ShellNewChatGreeting.tsx`, `SidebarHqRail.tsx`, `use-shell-store.ts`, `documentation/features/claude-chatgpt-shell.md`

## [2026-07-17 17:49] - [FEATURE]

What: Added one resizable shell artifact viewer for document, artifact, file, Brain-source, and media entry points; added an Artifacts entry under the existing More hover menu; connected image history, download, aspect-ratio edit prompts, and Edit in chat without replacing the existing Space editor or Media UI.
Why: Artifact references opened through inconsistent modals and feature-specific panels, so chat, Spaces, Brain, and the summary panel did not feel like one system. The supplied Claude/ChatGPT exploration established the desired slide-out interaction while the current ROAS navigation and editors needed to remain intact.
Impact: Clicking supported artifacts now opens a consistent right-side card, keeps the surrounding page in place, swaps files in the same viewer, and offers Open in Space for full editing. The More entry is the shell access point for the artifact library added in the follow-up change below.
Files: `apps/web/src/lib/artifacts/shell-artifact-viewer.ts`, `apps/web/src/components/shell/ShellArtifactViewerPanel.tsx`, `use-shell-store.ts`, `ShellWorkspace.tsx`, `ShellRightPanelFiles.tsx`, `apps/web/src/features/studio/components/preview/ShellArtifactViewerAdapter.tsx`, `ShellMediaArtifactViewer.tsx`, artifact/file/source/output/Space trigger consumers, `SidebarHqArtifactsFlyout.tsx`, focused tests, `documentation/features/claude-chatgpt-shell.md`, `documentation/frontend-shared-surfaces.md`

## [2026-07-17 17:53] - [FIX]

What: Unblocked Vercel builds for the pre-Page-Grader baseline tip by fixing ShellChatMenu null agent_key indexing and Fathom OAuth webhookMeta.triggered_for typing.
Why: Latest roas-web/roas-api deploys for d3589542 failed TypeScript compile, so production stayed on older 628f2fb9.
Impact: These two compile errors are cleared in the working tree; commit + successful deploy still required before prod picks them up.
Files: `apps/web/src/components/shell/ShellChatMenu.tsx`, `apps/api/src/modules/integrations/fathom/services/fathom-oauth.service.ts`

## [2026-07-17 17:54] - [STYLE]

What: Made the top-bar pencil/new-chat action permanently visible in both expanded and collapsed sidebar states.
Why: New chat is a high-frequency global action and should remain within reach regardless of the current HQ menu layout.
Impact: Users can start or restore chat from the same top-bar position on every shell view; its existing Home and workspace behavior is unchanged.
Files: `apps/web/src/components/shell/ShellTopBar.tsx`, `apps/web/src/components/shell/ShellTopBar.test.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-07-17 18:28] - [FEATURE]

What: Wired the right summary panel to the active conversation. Chat Tasks now shows persisted agent actions, Files shows saved conversation documents/artifacts plus chat attachments and media, and Sources shows explicit references and links. Generic Home now exposes only the personal Tasks queue.
Why: The panel previously mixed a global task feed with Space-level files and a placeholder Sources tab, so it did not describe the chat beside it.
Impact: Opening the summary panel during a chat now answers what the agent did, what the chat produced or received, and what context was connected. Opening it without a chat avoids irrelevant empty Files and Sources tabs.
Files: `apps/web/src/components/shell/ShellRightPanel.tsx`, `ShellRightPanel.test.tsx`, `ShellRightPanelTasks.tsx`, `ShellRightPanelFiles.tsx`, `ShellRightPanelFiles.test.tsx`, `ShellRightPanelSources.tsx`, `shell-conversation-summary.ts`, `shell-conversation-summary.test.ts`, `shell-right-panel.messages.config.ts`, `ShellWorkspace.tsx`, `apps/web/src/lib/conversations/conversation-assets.ts`, `index.ts`, `apps/web/src/features/team/hooks/useConversationMedia.ts`, `useAgentMedia.ts`, `index.ts`, deleted `apps/web/src/features/team/lib/chat-conversation-assets.utils.ts`, `documentation/features/claude-chatgpt-shell.md`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/agent-follow-up-work.md`

## [2026-07-17 18:00] - [FEATURE]

What: Rebuilt Webinar Fulfillment with Atlas context and transcript intake, pre-call/strategy/copy/production human gates separated by agent work, one complete Copy Package using Dylan's Super Voice, Lux-owned native ads/funnel/image briefs/Deck Bones, and a Blaze-owned media plan. Added Meta Ads, Funnels, and Presentations to the webinar Space template; reassigned ad-design and ad-copy skills; removed the legacy human-written-copy skill; updated live-now email and Deck Bones instructions; and migrated current runtime skill records.

Why: The previous mission assigned static creative production to Blaze, used consecutive or misplaced gates, built a full deck, lacked native asset views, and allowed stale copy and export behavior to block or degrade the mission.

Impact: New webinar missions follow the approved ownership model, stop at a production approval gate before activation, keep artifacts editable inside Space views, and do not produce PDF/PPTX/DOCX/XLSX companions. The old Webinar Fulfillment mission and its generated/obsolete docs were removed from the Impact webinar Space for a clean rerun.

Files: `apps/mission-worker/src/modules/missions/playbooks/webinar-fulfillment.playbook.ts`, `webinar-fulfillment.helpers.ts`, playbook tests, `apps/api/src/modules/space-templates/data/space-template-catalog-builders.ts`, `space-template-catalog-agency-client-webinar.ts`, `apps/web/src/features/spaces/components/playbooks/webinar-fulfillment.ts`, `apps/web/src/lib/missions/webinar-fulfillment-titles.ts`, webinar skill files under `docker/agents/templates`, `scripts/generate-webinar-pipeline-skills-migration.ts`, `scripts/seed-webinar-pipeline-skills.ts`, `supabase/migrations/20260717200000_webinar_pipeline_flow_alignment.sql`, `documentation/features/missions.md`.

## [2026-07-17 18:11] - [FEATURE]

What: Added an organization-wide `/artifacts` library with search, type filters, campaign/Space labels, and shared slide-out previews; changed More → Artifacts to open this global destination instead of listing the active Space's views; enabled blank artifact queries to return recent campaign artifacts with timestamps.
Why: Artifacts needed one discoverable place outside any individual Space or campaign while preserving the existing Space-specific editors and views.
Impact: Users can browse docs, images, sheets, files, and campaign artifacts across their accessible organization, then open any supported row in the same resizable side viewer. The implementation uses bounded parallel requests rather than querying every Space individually.
Files: `apps/web/src/app/(dashboard)/artifacts/page.tsx`, `apps/web/src/features/artifacts/**`, `apps/web/src/lib/artifacts/global-artifacts-api.ts`, `SidebarHqArtifactsFlyout.tsx`, shell route/top-bar/right-panel files, entity-search repository/services/types/tests, `documentation/features/claude-chatgpt-shell.md`, `documentation/frontend-shared-surfaces.md`

## [2026-07-17 18:22] - [FIX]

What: Stopped media previews from silently attaching to the active conversation, made image edits and aspect-ratio changes start fresh chats, restored visual ratio glyphs and values, replaced the Space Media composer with a contextual New image action, made single Open actions direct, and isolated account-wide artifact source failures.
Why: Opening an image polluted the current chat, resize reused the wrong thread, the ratio menu lost its visual affordances, Media duplicated the chat composer, and one backend failure crashed the entire artifact library.
Impact: Media previews remain passive until the user chooses an action; resize behaves like a new ChatGPT image task; Space Media is cleaner; Open only expands when there are multiple choices; available artifacts remain usable during a partial service failure.
Files: `ShellMediaArtifactViewer.tsx`, `ShellMediaArtifactViewer.test.tsx`, `ShellArtifactViewerPanel.tsx`, `ShellArtifactViewerPanel.test.tsx`, `SpaceMediaView.tsx`, `use-space-media-composer-collapsed.ts`, `global-artifacts-api.ts`, `global-artifacts-api.test.ts`, `documentation/features/claude-chatgpt-shell.md`

## [2026-07-17 18:24] - [STYLE]

What: Hide sidebar `+ New` on the Home menu tab; keep it on Chat only.
Why: Redundant with Chat-tab New and the top-bar pencil when the rail is collapsed.
Impact: Home sidebar goes toggle → nav; new chat still available from Chat tab and pencil.
Files: `SidebarHqHubMenu.tsx`, `documentation/features/claude-chatgpt-shell.md`

## [2026-07-17 18:28] - [FIX]

What: More → Artifacts is a direct `/artifacts` link; removed the nested “View all artifacts” sub-flyout and `SidebarHqArtifactsFlyout`.
Why: One-item nested menu was unnecessary friction.
Impact: Clicking Artifacts in More goes straight to the account-wide library (same as Flows).
Files: `SidebarHqMoreFlyoutBody.tsx`, deleted `SidebarHqArtifactsFlyout.tsx` + test, `documentation/features/claude-chatgpt-shell.md`

## [2026-07-17 18:33] - [STYLE]

What: Mission detail subtask list is denser list rows — removed row chevron + GitBranch icon, tighter padding/type, compact assignee chips.
Why: Rows read as long stretched cards with a redundant disclosure chevron.
Impact: Subtasks scan more like a task list; click title still opens detail; reassign pills unchanged in behavior.
Files: `SubtasksSection.tsx`

## [2026-07-17 18:34] - [FIX]

What: Removed the Webinar Fulfillment pre-call/post-call/launch-brief start selector and the matching worker skip branches. The launch payload no longer sends `start_at`, and legacy start values are ignored by the worker.
Why: Every webinar mission must gather context and create the pre-call strategy map before the human supplies the call; existing links and transcripts should enrich that sequence, not bypass it.
Impact: Every new or legacy Webinar Fulfillment kickoff now expands into Atlas context, pre-call strategy, the human call gate, transcript intake, post-call strategy, and THE PLAN before downstream production.
Files: `apps/web/src/features/spaces/components/StartPlaybookModal.tsx`, `StartPlaybookModal.test.tsx`, `playbooks/webinar-fulfillment.ts`, `playbooks/webinar-fulfillment.test.ts`, `apps/mission-worker/src/modules/missions/playbooks/mission-playbook.types.ts`, `webinar-fulfillment.playbook.ts`, `__tests__/webinar-fulfillment.playbook.test.ts`, `documentation/features/missions.md`

## [2026-07-17 18:35] - [STYLE]

What: Subtask detail status uses proper `badge-glass` tones (Done = green) with padding; tightened step intent card, agent notes, and header hierarchy.
Why: Neutral chip without padding made “Done” look clipped/broken; step cards had heavy nested grey blocks and loose spacing.
Impact: Status reads correctly; step detail feels denser and cleaner.
Files: `SubtaskDetailContent.tsx`, `SubtaskPlanIntent.tsx`, `SubtaskDetailHeader.tsx`, `detail-helpers.tsx` (+test)

## [2026-07-17 18:40] - [FIX]

What: Replaced the lightweight shell preview for Space-backed documents with the canonical inline Space document editor, while retaining the generic read-only preview for non-Space files. Added explicit owning-Space save routing for documents opened from chat or another Space.
Why: Chat-created docs were being reconstructed as a separate paper-card deliverable preview, so they lacked the real editor controls and could not safely behave as the same document users see inside a Space.
Impact: Opening a Space doc from chat or the account-wide artifact library now shows the actual rich document surface with title editing, Doc/Visual views, fields, export/settings/share actions, and autosave. The extra preview container is gone.
Files: `apps/web/src/features/studio/components/preview/ShellArtifactViewerAdapter.tsx`, `ShellArtifactViewerAdapter.test.tsx`, `apps/web/src/components/spaces/SpaceDocEditorPanelAdapter.tsx`, `SpaceDocEditorPanelAdapter.test.tsx`, `apps/web/src/features/spaces/components/docs/DocEditorPanel.tsx`, `DocEditorPanel.test.tsx`, `apps/web/src/components/shell/ShellArtifactViewerPanel.tsx`, `documentation/features/claude-chatgpt-shell.md`, `documentation/frontend-shared-surfaces.md`

## [2026-07-17 18:52] - [FIX]

What: New-chat agent bar (Vibey · CEO) now sits inside the HomeDashboardV4 hero glow/grid; softened glow fade; reduced column top padding when top bar is present.
Why: Agent bar lived above the gradient shell, so the wash cut off in a hard seam under the name.
Impact: Gradient runs continuously behind the agent picker into the greeting.
Files: `HomeDashboardV4Shell.tsx`, `ShellNewChatGreeting.tsx`, `globals.css`

## [2026-07-17 18:56] - [FIX]

What: Reopened an `awaiting_human` Mission to `todo` before enqueueing agent tasks newly unlocked by human approval, with regression coverage for the transition and enqueue ordering.
Why: Gate 1 could complete while the parent Mission remained `awaiting_human`, causing the worker to dead-letter Task 3 because that parent state intentionally blocks agent execution.
Impact: Approving a human gate now resumes its eligible downstream agent work without weakening the protection that prevents agents from running through an open gate.
Files: `apps/api/src/modules/missions/services/mission-human-subtask.service.ts`, `mission-human-subtask.service.test.ts`, `apps/api/src/modules/missions/repositories/mission-human-subtask.repository.ts`, `documentation/features/missions.md`

## [2026-07-17 18:55] - [FEATURE]

What: Unified Mission, chat-shell, account-wide artifact, and direct Space document viewing around the canonical editable Space editor. Mission documents now slide in from the right; inline documents expose the fixed rich-text toolbar, persistent Google Docs and grouped Copy/download actions; shell and direct Space panels can expand to full screen. Removed the duplicate read-only Space-document deliverable renderer.
Why: The same Space document had three incompatible presentations: a polished but read-only Mission modal, a lightweight chat preview, and the real editable Space editor.
Impact: A Space-backed document is now the same editable artifact wherever it opens, while Mission chrome keeps its author metadata, Brain, discuss-with-agent, destination, export, expand, and close actions.
Files: `apps/web/src/components/deliverables/DeliverablePreviewModal.tsx`, `SpaceDocDeliverablePreview.tsx`, `SpaceDocDeliverablePreview.test.tsx`, `apps/web/src/components/spaces/SpaceDocEditorPanelAdapter.tsx`, `SpaceDocEditorPanelAdapter.test.tsx`, `apps/web/src/components/shell/ShellArtifactViewerPanel.tsx`, `ShellArtifactViewerPanel.test.tsx`, `apps/web/src/features/mission-control/components/dialogs/MissionDetailOverlayModals.tsx`, `MissionDetailOverlayModals.test.tsx`, `apps/web/src/features/spaces/components/docs/DocEditorPanel.tsx`, `DocEditorPanelInner.tsx`, `DocEditorPanelPortalShell.tsx`, `editor/DocEditorHeaderActions.tsx`, `editor/DocEditorExportDropdown.tsx`, `documentation/features/claude-chatgpt-shell.md`, `documentation/features/missions.md`, `documentation/frontend-shared-surfaces.md`

## [2026-07-17 19:10] - [FIX]

What: Tightened the shared deliverable slide-out to a 45%-viewport dock, added left-edge resizing, preserved the selected width across full-screen expansion, and made the title/actions header wrap cleanly at dock width.
Why: The first unified Mission implementation animated from the right but retained its old fixed `max-w-5xl` width, making it look like a large overlay and clipping its action bar when narrowed.
Impact: Mission documents now visibly behave like the described artifact dock: the Mission stays in place, the document occupies the right side, the edge is draggable, all header controls remain visible, and expand/collapse returns to the docked width.
Files: `apps/web/src/components/deliverables/DeliverablePreviewModal.tsx`, `DeliverablePreviewModal.test.tsx`, `DeliverablePreviewModalHeader.tsx`, `apps/web/src/components/layout/ResizableDivider.tsx`, `documentation/features/missions.md`

## [2026-07-17 19:20] - [STYLE]

What: Hide the desktop Mission card while its deliverable slide-out is open, then restore the same Mission surface when the dock closes or returns back.
Why: Keeping the full Mission modal visible beneath the active document dock made two workspaces compete visually.
Impact: Mission deliverables keep the resizable right-side dock, while the background returns to a clean modal backdrop until the user goes back.
Files: `apps/web/src/features/mission-control/components/dialogs/MissionDetailDesktopShell.tsx`, `MissionDetailDesktopShell.test.tsx`, `MissionDetailModalView.tsx`, `documentation/features/missions.md`

## [2026-07-17 19:25] - [STYLE]

What: Moved the direct Space document actions above the editable title, removed the title fade mask, and aligned the heading scale with the shared document editor.
Why: Long document names competed with the action bar and appeared as clipped snippets.
Impact: The complete document title remains visible at the normal slide-out width while the existing Google Docs, Copy, share, expand, and close actions stay grouped above it.
Files: `apps/web/src/features/spaces/components/docs/DocEditorPanelInner.tsx`, `editor/DocEditorTitleHeaderLayout.tsx`, `editor/DocEditorTitleHeaderLayout.test.tsx`

## [2026-07-17 19:29] - [STYLE]

What: Routed Mission and subtask deliverable previews to the shared centered presentation and removed the obsolete Mission-surface hiding behavior.
Why: Documents should open in the middle while reviewing a Mission or task, with right-side slide-outs reserved for the rest of the platform.
Impact: Mission context remains visible behind a centered document modal with no resize rail; chat, Artifacts, and Space preview behavior is unchanged.
Files: `apps/web/src/features/mission-control/components/dialogs/MissionDetailOverlayModals.tsx`, `MissionDetailModalView.tsx`, `MissionDetailDesktopShell.tsx`, related tests, `apps/web/src/components/deliverables/DeliverablePreviewModal.test.tsx`, `documentation/features/missions.md`

## [2026-07-17 20:16] - [FIX]

What: Docked / space-collapsed chat empty states always use `GlobalChatPanel` (normal chat empty UI). Removed Home new-chat greeting from those paths.
Why: Null-conversation drawer and collapsed Space work were rendering the Home greeting + transparent composer, which looked broken vs normal chats.
Impact: Workspace empty chat matches the usual Vibey chat empty state; Home `/home?chat=new` greeting unchanged.
Files: `ShellChatDrawer.tsx`, `ShellWorkspace.tsx`

## [2026-07-17 20:36] - [FIX]

What: Made Dylan's Super Voice mandatory and verifiable across webinar topics, email/SMS, Meta ads, video scripts, and landing-page copy. Split Phase B into `WEB#5A - Copy Package` and `WEB#5B - Landing Page Copy`, simplified ads to continuous ad text, and simplified client-filmed scripts to Script, Shooting instructions, Overlays, and one shared Post-production section.
Why: The package assembler relied on child skills to self-enforce the voice, allowing em dashes and AI-looking Hook/Body/CTA formatting to leak into otherwise usable client copy.
Impact: New webinar missions reject copy sections that fail the Dylan Super Voice scan, give landing pages their own skill-backed Mission step, and produce cleaner client-ready ad and filming handoffs.
Files: `apps/mission-worker/src/modules/missions/playbooks/webinar-fulfillment.playbook.ts`, `webinar-fulfillment.helpers.ts`, `__tests__/webinar-fulfillment.playbook.test.ts`, `apps/web/src/lib/missions/webinar-fulfillment-titles.ts`, `webinar-fulfillment-titles.test.ts`, `apps/api/src/modules/space-templates/data/space-template-catalog-agency-client-webinar.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-document-mission-deliverables.service.ts`, `docker/agents/templates/copywriter/skills/*`, `docker/agents/templates/ads_manager/skills/roas-ad-copy/*`, `supabase/migrations/20260718033000_webinar_copy_voice_and_handoff.sql`, `documentation/features/missions.md`

## [2026-07-17 21:28] - [FIX]

What: Restored the unified canonical document viewer after a partial file regression: non-Mission documents use the 45%-viewport right dock with a draggable left edge and remembered full-screen restore width; Mission/task documents retain the centered presentation. Restored the full-title header below persistent Google Docs, grouped Copy/download, share, expand, and close actions; collapsed Fields by default; and removed the duplicate read-only Space-document preview again.
Why: Tracked editor and deliverable files had reverted to older implementations while the newer shared adapters and tests remained, splitting the document surface across incompatible contracts.
Impact: Space, chat, and account-wide artifact documents now reopen as the same editable rich Space document, with the complete title visible and the Space kept in view. Mission review remains centered as requested.
Files: `apps/web/src/components/deliverables/DeliverablePreviewActions.tsx`, `DeliverablePreviewBody.tsx`, `DeliverablePreviewModal.tsx`, `DeliverablePreviewModalHeader.tsx`, `SpaceDocDeliverablePreview.tsx`, `apps/web/src/components/spaces/SpaceDocEditorPanelAdapter.tsx`, `apps/web/src/features/spaces/components/docs/DocEditorPanel.tsx`, `DocEditorPanelInner.tsx`, `DocEditorPanelPortalShell.tsx`, `editor/DocEditorExportDropdown.tsx`, `editor/DocEditorHeaderActions.tsx`, `editor/DocEditorTitleHeaderLayout.tsx`, and focused regression tests

## [2026-07-17 21:50] - [FIX]

What: Campaigns hub now scrolls inside the shell (`h-full min-h-0 overflow-y-auto`), and the search field uses a single `input-glass` on the input (removed nested `input-glass` wrapper).
Why: Shell main pane is `overflow-hidden`, so the hub could not scroll; search showed a double bordered container.
Impact: Campaign list scrolls; search bar renders as one field.
Files: `apps/web/src/app/(dashboard)/campaigns/_components/CampaignsHub.tsx`

## [2026-07-17 22:14] - [FEATURE]

What: Added a browsable 50-entry page-version timeline for funnels and websites, with Studio/Vibey attribution, arbitrary restore, and correct oldest-first redo after multiple undos.
Why: Durable change sets already existed, but users could only step backward or forward one edit at a time and could not see or select saved page versions.
Impact: HTML-bundle funnel and website pages now expose Undo, Redo, and Version history in the Studio toolbar. Restoring a saved entry replays the existing durable snapshots and refreshes the preview.
Files: `apps/api/src/modules/funnels/controllers/funnel-history.controller.ts`, `apps/api/src/modules/funnels/services/funnel-history.service.ts`, `apps/api/src/modules/funnels/repositories/funnel-history.repository.ts`, `apps/web/src/features/studio/components/preview/FunnelHistoryControls.tsx`, `FunnelHistoryMenu.tsx`, `hooks/useFunnelUndoRedo.ts`, `apps/web/src/features/studio/services/funnel-history.service.ts`, related tests and config, `documentation/features/website-artifacts.md`

## [2026-07-17 22:26] - [FIX]

What: Hardened post-auth destination routing, preserved existing destination queries when adding callback state, replaced the duplicate login password-reset overlay with the canonical recovery page, added recovery loading/error/accessibility polish and auth browser metadata, and removed orphaned legacy layout navigation plus unreachable settings sections.
Why: Raw auth destinations could leave the app after email auth, promo/message concatenation could create malformed URLs, the duplicate mobile recovery overlay visually collided with the sign-in card, and unused navigation/settings implementations kept stale behavior in the codebase.
Impact: Sign-in and sign-up now stay on validated in-app destinations, callback state merges without corrupting URLs, password recovery is one consistent mobile-safe flow, auth pages expose clearer browser/assistive labels, and dead navigation/settings code no longer competes with the active shell.
Files: `apps/web/src/lib/auth/access-routing.ts`, `access-routing.test.ts`, `apps/web/src/app/(auth)/callback/route.ts`, `login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`, `layout.tsx`, `config/auth-messages.config.ts`, `apps/web/src/components/auth/auth-orb-shell.tsx`, `apps/web/src/features/settings/containers/WorkspaceSettingsModal.tsx`, `apps/web/src/lib/settings/workspace-settings-modal-context.tsx`, `documentation/utilities/auth-access-routing.md`, `documentation/utilities/README.md`, removed `apps/web/src/components/layout/MobileNav.tsx`, `TopBar.tsx`, `index.ts`, and `apps/web/src/features/settings/components/settings-content/ApiKeysPageContent.tsx`

## [2026-07-17 22:34] - [FIX]

What: Made All Artifacts load blank-query campaign assets instead of returning none, expanded each campaign-artifact family, paginated document and media sources, promoted Presentations and Funnels to dedicated filters, and added a source filter that hides uploads by default while exposing Uploaded and Everything views.
Why: The library reused a search-only artifact service whose blank-query guard returned zero funnels, presentations, and other campaign outputs; first-page caps also silently omitted older documents and media.
Impact: The account-wide library now acts as a reliable discovery surface for created docs, generated media, presentations, funnels, other campaign assets, and optional uploaded files across the current account.
Files: `apps/api/src/modules/entity-search/repositories/entity-artifact-search.repository.ts`, `services/entity-artifact-search.service.ts`, `services/entity-search.service.ts`, related tests, `apps/web/src/lib/artifacts/global-artifacts-api.ts`, `global-artifacts-contracts.ts`, related tests, `apps/web/src/features/artifacts/components/GlobalArtifactsPage.tsx`, `GlobalArtifactsPage.test.tsx`, `config/artifact-library-messages.config.ts`, `documentation/features/claude-chatgpt-shell.md`, `documentation/utilities/global-artifacts-api.md`, `documentation/utilities/README.md`

## [2026-07-17 22:43] - [FIX]

What: Expanded account artifact scoping to combine the active organization with legacy personal artifacts owned by the signed-in user, while retaining strict user ownership for unassigned records.
Why: The missing Impact presentation and funnel were valid personal records with `org_id` unset. The library's organization-only predicate excluded them even though they belonged to the same signed-in account.
Impact: Impact's legacy presentation and funnel now appear alongside current organization assets in All Artifacts without exposing another user's personal records.
Files: `apps/api/src/modules/entity-search/repositories/entity-artifact-search.repository.ts`, `services/entity-artifact-search.service.ts`, `services/entity-search.service.ts`, related tests, `documentation/features/claude-chatgpt-shell.md`, `documentation/utilities/global-artifacts-api.md`

## [2026-07-17 22:44] - [FIX]

What: Finished the app entry-route cleanup across direct joins, direct and organization invitations, OAuth completion, settings deep links, and protected dashboard routes. Added safe continuation through login/recovery, friendly config-backed auth errors, accessible form labels/statuses, standard lightweight loaders, honest disabling of the future public-agent voice control, and regression coverage for rejected invitations, settings forwarding, session fallback, route protection, and deep-link queries.
Why: Several links looked valid but dropped their destination, `/settings?tab=manage` landed on Home without opening Settings, newer dashboard routes skipped middleware access classification, an invitation rejection could spin forever, malformed invite query values could crash, and multiple controls either exposed technical errors or appeared interactive without behavior.
Impact: Signed-out users return to the exact requested in-app screen after authentication; Settings links open Integrations; all dashboard destinations share the same access gate; invitation failures settle into recoverable states; auth forms and loading states are consistent for assistive and visual users; and future voice mode no longer presents a false affordance.
Files: `apps/web/src/middleware.ts`, `middleware.test.ts`, `apps/web/src/app/(dashboard)/providers.tsx`, `settings/page.tsx`, `settings/page.test.tsx`, `apps/web/src/app/(auth)/config/auth-messages.config.ts`, `join/page.tsx`, `invite/page.tsx`, `invite/[token]/page.tsx`, `invite/[token]/page.test.tsx`, `invite/[token]/InviteAcceptSections.tsx`, `oauth-callback/page.tsx`, `reset-password/page.tsx`, `verify-email/page.tsx`, `apps/web/src/features/public-agent/containers/PublicAgentContainer.tsx`, `documentation/utilities/auth-access-routing.md`

## [2026-07-17 22:52] - [FIX]

What: Removed the inert shell breadcrumb ellipsis and its unused CSS, disabled the unwired public-agent voice control with honest accessible copy, and made shared reporting presets format local calendar dates without a UTC conversion shift.
Why: The ellipsis and microphone appeared interactive without behavior, while rolling/month/quarter reporting ranges could move by a day depending on the user's timezone and omit spend at a boundary.
Impact: Shell breadcrumbs no longer advertise nonexistent options, future voice mode is clearly unavailable, and Team/campaign/reporting date windows resolve to the same local calendar boundaries on either side of UTC.
Files: `apps/web/src/components/shell/ShellTopBar.tsx`, `ShellTopBar.test.tsx`, `apps/web/src/app/globals.css`, `apps/web/src/features/public-agent/containers/PublicAgentContainer.tsx`, `apps/web/src/lib/reporting/resolve-reporting-dates.ts`, `resolve-reporting-dates.test.ts`, `apps/web/src/features/spaces/components/reporting/shared/resolve-reporting-dates.test.ts`, `apps/web/src/features/team-2/components/teams/TeamAnalyticsView.test.tsx`, `documentation/utilities/reporting-date-ranges.md`, `documentation/utilities/README.md`

## [2026-07-17 22:30] - [FEATURE]

What: Added native Canva design import for Space documents and presentations, preserved the existing high-quality image asset flow, changed fallback presentation PPTX generation from slide screenshots to editable text/shapes/images, and made shell Canva creation lazy with popup-safe editor navigation.
Why: Canva received only images, while documents and decks either had no handoff or risked arriving as flattened, choppy assets that were difficult to edit.
Impact: Users can choose Open in Canva from document and presentation exports. Standard docs import as DOCX, Visual docs as high-resolution PDF, and presentations as PPTX; the connected Canva account returns a ready editor URL without creating abandoned designs merely by opening a menu.
Files: `apps/api/src/modules/media/controllers/media-canva.controller.ts`, `integrations/media-canva.integration.ts`, `repositories/media-canva.repository.ts`, `services/media-canva-handoff.service.ts`, `media.module.ts`, related tests, `apps/web/src/lib/canva/*`, presentation export/menu files, Space document export/menu files, shell open-in files, `supabase/migrations/20260717222151_expand_canva_import_description.sql`, Canva/integration/utility docs

## [2026-07-17 22:56] - [FEATURE]

What: Added a canonical premium funnel/site design skill, Design Contract, responsive visual-critique workflow, builder backfill, scoped browser review for Designer/Lux, legacy skill retirement, and Opus 4.8 routing for specialist design passes.
Why: Funnel and website builders had structural and implementation guidance but no high-fidelity art-direction layer, and legacy instructions rewarded generic effects, forced hero sizing, and unverified conversion mechanics.
Impact: New and existing funnel/site builders receive subject-specific art direction before implementation and a fresh 1440px/390px screenshot critique afterward. Routine building stays on its existing efficient model; only the specialist design lane is pinned to Opus 4.8.
Files: `docker/agents/templates/designer/skills/funnel-site-design/*`, `supabase/migrations/20260718055800_premium_funnel_site_design_workflow.sql`, `docker/openclaw.json`, `apps/agent-api/src/modules/shared/services/openclaw-gateway.service.ts`, related tests, `documentation/features/website-artifacts.md`

## [2026-07-17 23:08] - [REFACTOR]

What: Forward-tested the premium funnel/site design skill against two realistic blind briefs and a no-skill baseline, then added Confirmed/Proposed/Missing decision status, relational layout guidance, and a five-minute scan target.
Why: The skill-driven run scored 93/100 and materially beat the 76/100 baseline, but it could still present fallback typography and arbitrary numeric layout rules as approved while repeating too much implementation context.
Impact: The enhanced blind rerun scored 97/100, preserved subject-specific art direction and mobile/proof rigor, removed invented agenda detail and arbitrary ratios, and produced a more efficient builder handoff.
Files: `docker/agents/templates/designer/skills/funnel-site-design/SKILL.md`, `references/design-contract.md`, `supabase/migrations/20260718055800_premium_funnel_site_design_workflow.sql`, `apps/agent-api/src/modules/agent-sync/services/funnel-site-design-skill-contract.test.ts`, `documentation/features/website-artifacts.md`

## [2026-07-17 23:22] - [FIX]

What: Audited the live agent inventory before rollout, expanded the premium design backfill to every existing designer-role agent and every currently enabled funnel/site builder template for future hires, preserved user-authored skill copies during managed updates, and granted screenshot review to trained custom designer roles without broadening browser access to other agents.
Why: The live inventory showed that the initial canonical-key backfill would miss 10 of 14 designer-role agents, while five user-authored builder skill rows needed explicit protection from platform workflow updates.
Impact: The migration now trains the full intended design and builder population without overwriting user-authored instructions. Runtime policy lets trained custom designers execute the required desktop/mobile review while keeping untrained designers and non-design agents browser-denied.
Files: `supabase/migrations/20260718055800_premium_funnel_site_design_workflow.sql`, `apps/agent-api/src/modules/agent-sync/services/agent-sync-all.service.ts`, `agent-sync-agent.service.ts`, `agent-sync-org-agent.service.ts`, `apps/agent-api/src/modules/shared/services/openclaw-gateway.service.ts`, related tests, `documentation/features/website-artifacts.md`

## [2026-07-17 23:56] - [FIX]

What: Completed a broad app-journey cleanup across authentication continuations, protected deep links, Settings routing, invitation failure states, shell menus, campaign creation, conversation sharing, Mission activity, reporting dates, finance/domain/media dialogs, preview/export actions, and form accessibility. Removed six unused legacy UI files; replaced inert or false affordances with real behavior or honest disabled states; corrected nested interactive controls and unsafe new-tab actions; added accessible dialog titles, descriptions, labels, focus/Escape behavior, and keyboard file selection; and split Mission activity renderers to stay inside the enforced component limit.
Why: The audit found destinations being dropped after sign-in, direct Settings links opening Home, invitations that could spin forever, controls that looked usable but were not wired, project terminology inside campaign creation, inaccessible modal/form controls, dead navigation implementations, timezone-sensitive report boundaries, and preview actions that could open unsafely or announce the wrong behavior.
Impact: Core entry and sharing flows now preserve the user's intended destination, Settings and campaign actions open the correct surfaces, error/loading states settle predictably, menus and dialogs work with keyboard and assistive technology, exports/previews use safer navigation, local reporting ranges no longer shift a day, and obsolete competing implementations are gone.
Files: `apps/web/src/lib/auth/access-routing.ts`, `apps/web/src/middleware.ts`, auth pages under `apps/web/src/app/(auth)`, Settings routing/modals, `apps/web/src/components/layout/NewCampaignModal.tsx`, `SidebarConversationMenuPortal.tsx`, `apps/web/src/components/conversations/ConversationShareModal.tsx`, `apps/web/src/components/shell/ShellChatMenu.tsx`, `apps/web/src/components/chat/MessageQueue.tsx`, billing/domain/email/media dialogs, Mission list/activity components, reporting utilities, theme import dialogs, Enterprise application, Brain dialogs, view sharing, pasted-text and feature-update dialogs, preview/export controls, focused regression tests, and removed legacy layout/channel/settings/Space files
