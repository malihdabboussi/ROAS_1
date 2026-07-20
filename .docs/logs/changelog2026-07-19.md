# Changelog - July 19, 2026

## [2026-07-19 21:23] - [FIX]

What: Top-bar pencil on workspace restores the last chat when the drawer is closed and starts a fresh chat only when the drawer is already open; sidebar/Chat-menu New still always open a fresh chat; Chat tab restores when closed.
Why: Pencil should pull chat back up when collapsed, not force a new thread; new chat is only when chat is already visible.
Impact: Closed drawer + pencil → last conversation; open drawer + pencil → blank docked chat; + New always blank docked chat on workspace.
Files: `ShellTopBar.tsx`, `ShellMenuChrome.tsx`, `ShellChatMenu.tsx`, shell unit tests, `documentation/features/claude-chatgpt-shell.md`

## [2026-07-19 21:21] - [FIX]

What: Pencil, sidebar New, and Chat-menu New always start a fresh chat on workspace routes (`openFreshChatDrawer`); Chat tab restores the drawer when closed and only switches the chat menu when already open.
Why: Pencil previously restored the last chat when the drawer was closed, so “new chat” controls did not reliably open a new thread beside Space work.
Impact: On Spaces/campaigns, pencil/New start a blank docked chat; Chat tab pulls chat up without clearing the thread; Home still uses `/home?chat=new`.
Files: `ShellTopBar.tsx`, `ShellMenuChrome.tsx`, `ShellChatMenu.tsx`, shell unit tests, `documentation/features/claude-chatgpt-shell.md`

## [2026-07-19 19:20] - [FIX]

What: Forced OpenClaw ensure-ready + skill sync for all newly imported ROAS org agents (and Lux/Mara/Rex merges) on Dylan's active shared runtime; marked `agents_registry.sync_status = ready`.
Why: Import left agents at `pending`; chatting once was needed to materialize org workspaces — user asked to do that without manual per-agent chats.
Impact: ROAS Team agents Cole/Ivy/Jett/Jordan/Nico/Niko/Nova/Orion/Pixel/Rio/Wren (+ Lux/Mara/Rex) should open chat without the setup gate.
Files: prod `agents_registry.sync_status` (ROAS org); runtime sync via profile `agent_runtime_url`

## [2026-07-19 19:09] - [FEATURE]

What: Copied Dylan's personal-account agents + skills/definitions/resources into the ROAS org (`788cfdba…`): imported 11 missing agents (Cole, Ivy, Jett, Jordan, Nico, Niko, Nova, Orion, Pixel, Rio, Wren) and merged personal skill packs into existing Lux/Mara/Rex. Skipped brains/spaces; left org-only skills intact.
Why: Personal team build-out lived only under `user_id` scope; ROAS org needed the same agents and trained skills without migrating Spaces content.
Impact: Open ROAS → Team — the personal roster agents should appear with their skills. Chat once with each newly imported agent to trigger org OpenClaw sync (`sync_status` starts as `pending`).
Files: prod `agents_registry` / `agent_skills` / `agent_skill_resources` / `agent_definitions` (ROAS org)

## [2026-07-19 18:58] - [FIX]

What: Fixed dashboard shell hydration mismatch on the sidebar toggle by deferring persisted shell prefs until after mount (`ShellStoreHydrator`, `useShellPrefsHydrated`) and keeping SSR-safe zustand defaults.
Why: `sidebarPinned` was read from `localStorage` during client init while the server rendered collapsed defaults, so React reported mismatched `title` / `aria-pressed` / class on `ShellTopBar` when opening a space.
Impact: Hard-refresh and open Brain/Spaces — the sidebar pin button should no longer log hydration errors; pinned state still restores immediately after mount.
Files: `use-shell-store.ts`, `ShellStoreHydrator.tsx`, `use-shell-prefs-hydrated.ts`, `ShellTopBar.tsx`, `Sidebar.tsx`, `providers.tsx`, shell unit tests

## [2026-07-19 18:21] - [FIX]

What: Made image briefs and generated ad assets qualification-safe across campaigns with Audience/Offer Locks, approved-asset readiness, two independent audience cues, factual live-platform treatment, and a two-second who/offer/why-now check.
Why: The prior schema could faithfully produce polished generic metaphors that preserved brand colors and copy while failing to show who the ad was for or that a webinar was live on a known platform.
Impact: Future Webinar Fulfillment image briefs block on missing promised identity assets, reject category-ambiguous concepts, use official logos only from approved references, and require the generated asset to qualify a cold viewer without relying on surrounding body copy.
Files: `webinar-fulfillment.creative.ts`, `webinar-fulfillment.playbook.test.ts`, `roas-image-brief/SKILL.md`, `references/design-prompt-spec.md`, `20260719182102_qualify_image_briefs_before_generation.sql`, `documentation/features/missions.md`

## [2026-07-19 18:05] - [FIX]

What: Org create now inserts the owner membership via the service role, hard-deletes the org if that step fails, and checks slug uniqueness with the service role. Repaired the orphan `ROAS` / `roas` org for dylan@dylanvanas.com (owner membership + core agents + starter credits).
Why: User-scoped RLS could create the `organizations` row then fail on first `org_members` insert, leaving a slug-blocking orphan that never appeared in the account switcher.
Impact: Refresh and open the account menu — **ROAS** should appear under organizations. After `roas-api` deploy, failed creates no longer leave stuck slugs.
Files: `org.service.ts`, `org.repository.ts`, `org.service.test.ts`, ROAS prod `org_members` / `agents_registry` / `org_credit_purchases` repair

## [2026-07-19 17:44] - [FIX]

What: Mission multi-tab Google Doc export no longer double-posts H1 titles; secondary tabs render markdown tables as native Docs `insertTable` grids; blank markdown paragraphs and mashed bold field labels keep more vertical spacing.
Why: Bulk export prepended the deliverable title even when `doc_body` already had an H1, and secondary-tab table rows were flattened to tab-separated paragraphs that wrapped into unreadable blocks.
Impact: After `roas-api` deploy, re-run Export to Google Docs — titles should appear once, competitor/scope tables should be real grids on every tab, and labeled sections should breathe more.
Files: `mission-deliverables-google-export.service.ts`, `markdown-to-google-docs-tab-requests.ts`, `html-to-google-docs-markdown.ts`, related unit tests, `space-items-custom-data-drive.md`

## [2026-07-19 15:58] - [FIX]

What: Fixed Page Grader Map clients modal scroll/search by adding the missing `modal-nested-scroll-body` utility and constraining the card with `max-h-[90vh]` so the header (search) stays visible and the list scrolls inside.
Why: The modal referenced a CSS class that was never added to `globals.css`, and the card had no max height, so ~100+ clients overflowed the viewport and clipped the search chrome — looking like a short non-scrollable list.
Impact: Hard-refresh after `roas-web` deploy. Open Map clients → search + scroll the full roster; footer shows total client count.
Files: `PageGraderClientScopeMapModal.tsx`, `apps/web` + `apps/website` `globals.css`

## [2026-07-19 15:14] - [FIX]

What: Home dashboard card order/size persists on the user account (`profiles.preferences.home_layout`) via `PATCH /api/profile/preferences`, with a per-user localStorage cache and one-shot migrate from the old global key. Agent profile context skips UI preference blobs.
Why: Reorder only wrote device-local `vibey-home-layout`, so layouts were lost across browsers/devices and could leak between accounts on a shared browser.
Impact: After `roas-api` + `roas-web` deploy, reorder Home once; the same layout loads when you sign in elsewhere.
Files: `profile.controller.ts`, `profile.service.ts`, `profile-preferences.dto.ts`, `use-home-layout.ts`, `home-layout-api.ts`, `home-cards.config.ts`, agent preference dump filters

## [2026-07-19 15:09] - [FEATURE]

What: Added a gated Meta Ads Launch mission, a read-only PageGrader account-context bridge, aligned Meta action contracts, and the `roas-meta-ads-launch` agent skill.
Why: Approved ad assets need a reliable path from campaign context into correctly mapped, paused Meta campaigns without asking Blaze to design creative or activating spend before human review.
Impact: Teams can start a dedicated Meta launch playbook, reconcile supplied or Space assets, confirm the mapped Meta setup, build paused campaign assets, and approve activation separately. PageGrader remains read-only and written outputs use Dylan Super Voice rules.
Files: Meta Ads mission playbook and tests, Missions picker and PageGrader context service, Meta action schemas/docs/tests, `20260719143000_meta_ads_launch_skill.sql`, missions documentation

## [2026-07-19 14:40] - [FEATURE]

What: Shipped Page Grader Create & import brain, full client pagination, and `campaign_type: get-more-leads` create-path fix onto a main-based branch; split `page-grader-api` send-work/helpers and client-map row to pass LOC gates.
Why: Multi-agent WIP left those fixes uncommitted while changelog already described them; agents need one branch from current main.
Impact: After merge + `roas-api`/`roas-web` deploy, Map clients lists the full roster and unmapped **Create & import brain** works.
Files: page-grader API/integration/DTO/brain-import/client-import, `PageGraderClientScopeMapModal.tsx`, `PageGraderClientScopeMapRow.tsx`, helpers/send-work split, unit tests

## [2026-07-19 14:31] - [FEATURE]

What: Connected the administrator Shadow Mode test loop: create a harmless proposal, approve or dismiss it, and explicitly send an approved message only after the target person is Active.
Why: Admins need to validate the complete review experience safely before automated observation and proposal generation are introduced.
Impact: Proposal creation and review never send Slack messages. Off blocks proposals, Shadow blocks delivery, approval is mandatory, and Slack receives a DM only when an admin clicks Send now for an Active person.
Files: Slack people controller/service/repository/DTO/types/tests, Team People UI/hook/service/messages/tests, integration documentation, follow-up plan

## [2026-07-19 14:20] - [FEATURE]

What: Added an organization-admin Slack people directory and Shadow Mode foundation: workspace identities persist as platform teammates, external contacts, or ghost profiles; per-person delivery intent defaults to Shadow; proposed messages and workflows have a durable review ledger; and Team now has a People + Shadow inbox view.
Why: Proactive team help needs durable person memory and an observable, reversible rollout path before any automated Slack outreach is allowed to send.
Impact: Admins share one view of Slack-discovered people and can record Off, Shadow, or Active intent. No proactive outbound runner was enabled in this slice, so existing Slack messaging behavior is unchanged.
Files: `20260719142000_slack_people_shadow_mode.sql`, Slack people controller/service/repository/types/tests, Slack sender resolution, Team People UI/hook/service/navigation/tests, integration documentation

## [2026-07-19 13:42] - [FIX]

What: Added an authoritative current UTC timestamp and temporal-comparison rule to every Mission OpenClaw instruction packet.
Why: Ivy correctly received the July 22, 2026 webinar date but labeled it past during a July 19, 2026 run because Mission execution supplied no current-date reference.
Impact: Mission agents compare full calendar dates against the execution timestamp before describing deadlines or events as past, current, or upcoming.
Files: `apps/mission-worker/src/modules/missions/services/gateways/mission-openclaw.gateway.ts`, `apps/mission-worker/src/modules/missions/services/__tests__/mission-tool-access-smoke.test.ts`, `documentation/features/missions.md`

## [2026-07-19 13:43] - [FIX]

What: Preserve TipTap `<br>` / hard breaks as separate Markdown paragraphs during Google Docs export (also treat `<div>` like block paragraphs).
Why: Soft breaks inside a single `<p>` were stripped, so labels like Subject/Preview and Webinar date/Event collapsed onto one line in Docs.
Impact: Re-export docs after API deploy — field lines and section spacing stay separated.
Files: `html-to-google-docs-markdown.ts`, unit tests


## [2026-07-19 13:42] - [FIX]

What: Added an authoritative current UTC timestamp and temporal-comparison rule to every Mission OpenClaw instruction packet.
Why: Ivy correctly received the July 22, 2026 webinar date but labeled it past during a July 19, 2026 run because Mission execution supplied no current-date reference.
Impact: Mission agents compare full calendar dates against the execution timestamp before describing deadlines or events as past, current, or upcoming.
Files: `apps/mission-worker/src/modules/missions/services/gateways/mission-openclaw.gateway.ts`, `apps/mission-worker/src/modules/missions/services/__tests__/mission-tool-access-smoke.test.ts`, `documentation/features/missions.md`

## [2026-07-19 13:35] - [FIX]

What: Page Grader client listing now supports `offset` (max page 500) and ROAS Settings auto-pages until all clients are loaded (113 today), with dedupe if offset is ignored.
Why: Map clients only fetched the first 50 alphabetically, so the list stopped around “Ak…” and later clients (e.g. Multifamily Strategy) never appeared.
Impact: After `roas-api` deploy (+ Portal `roas-api` already live), Map clients shows the full Portal roster; search can find every client.
Files: Page Grader `supabase/functions/roas-api/index.ts` (deployed); ROAS `page-grader.integration.ts`, `page-grader-api.service.ts`, `page-grader.dto.ts`, api service unit test

## [2026-07-19 13:31] - [FIX]

What: Page Grader create/import now inserts campaigns with `campaign_type: 'get-more-leads'` (valid CHECK value) instead of `'strategy'`, and surfaces DB failures as `BadRequestException` instead of opaque 500s.
Why: Create & import brain failed with Internal server error because `campaigns.campaign_type` only allows `get-more-leads` | `book-more-calls` | `launch-a-webinar`.
Impact: After `roas-api` deploy, unmapped clients (e.g. 7-Figure CEOs) can create a campaign + space and import brain successfully.
Files: `apps/api/src/modules/brain/services/page-grader-client-import.service.ts`, `page-grader-client-import.service.test.ts`

## [2026-07-19 13:23] - [FIX]

What: Export Open in Google Docs via `GOOGLEDOCS_CREATE_DOCUMENT_MARKDOWN` after converting space-doc HTML to Markdown (headings, lists, tables, links, marks).
Why: `GOOGLEDRIVE_CREATE_FILE_FROM_TEXT` wrote the HTML source as plain text, so Docs showed raw tags instead of formatted content.
Impact: New exports open as real formatted Google Docs. Re-export existing docs to replace ugly HTML dumps.
Files: `html-to-google-docs-markdown.ts`, `google-drive-composio-files.service.ts`, unit tests

## [2026-07-19 13:05] - [FIX]

What: Create Google Docs via Composio `GOOGLEDRIVE_CREATE_FILE_FROM_TEXT` instead of a raw Drive upload using a Composio-extracted OAuth token; treat Composio `REDACTED` tokens as missing.
Why: Composio now redacts access tokens from `connectedAccounts.get`, so Open in Google Docs got a fake token and Google returned 401 → “Failed to create Google Doc”.
Impact: Open in Google Docs works again with a connected Google Drive account. Hard-refresh after API deploy.
Files: `google-drive-composio-files.service.ts`, `composio.service.ts` (api + agent-api), google-drive-api unit test

## [2026-07-19 12:45] - [FIX]

What: Home dashboard card order/size now persists on the user account (`profiles.preferences.home_layout`) via `PATCH /api/profile/preferences`, with a per-user localStorage cache (`vibey-home-layout:{userId}`) and one-shot migrate from the old global key.
Why: Reorder only wrote device-local `vibey-home-layout`, so layouts were lost across browsers/devices and could leak between accounts on a shared browser.
Impact: After API + web deploy, reorder Home once; the same layout loads when you sign in elsewhere. First Home visit claims any leftover global local layout into the signed-in account, then removes it.
Files: `profile.controller.ts`, `profile.service.ts`, `profile-preferences.dto.ts`, `use-home-layout.ts`, `home-layout-api.ts`, `home-cards.config.ts`, agent preference dump skip for UI blobs

## [2026-07-19 12:44] - [FIX]

What: Stopped integrations overview from remapping collapsed/disconnected Composio rows back to `connected`, clear shared `composio_connected_account_id` on duplicates, prefer active rows during personal sync, filter Manage + composio accounts to active statuses.
Why: After disconnecting Google Calendar duplicates, overview still forced every row sharing the active Composio account id to `connected`, so Manage kept showing 5× the same gmail account.
Impact: Manage shows one row per live connection (gmail + dylan@). Hard-refresh Settings → Integrations → Manage after API/web deploy.
Files: `integrations-overview.service.ts`, `integrations-overview-personal-composio-sync.ts`, `integrations-composio.service.ts`, `IntegrationsManage.tsx`, overview unit tests

## [2026-07-19 12:40] - [FEATURE]

What: One-click Page Grader **Create & import brain** for unmapped clients — creates campaign + space named after the client, queues brain import, and persists the client→campaign/space mapping.
Why: Most portal clients (e.g. 1DS Collective) have no ROAS campaign yet; Import brain looked like it required a pre-mapped campaign and did not sync mappings after create.
Impact: Unmapped rows show **Create & import brain**; mapped rows keep **Import brain**. After success the modal selects the new campaign/space without a separate Save.
Files: `page-grader-brain-import.service.ts`, `page-grader-api.service.ts` (`mergeClientScopeEntry`), `PageGraderClientScopeMapModal.tsx`, `page-grader-scope-api.ts`, brain-import unit tests

## [2026-07-19 12:36] - [FIX]

What: Shortened the webinar Copy Package instruction packet to fit the mission-plan API contract, restored the shared Dylan Super Voice rule for agent-owned steps, and added regression coverage for every generated intent field's 1,000-character limit.
Why: The V3 Webinar Fulfillment mission generated all 21 steps but Task 10's `intent.ecology` exceeded the API limit, so the worker retried the same invalid plan three times and marked the mission failed.
Impact: New webinar plans pass API validation without losing the copy formatting, review-map, or voice requirements.
Files: `apps/mission-worker/src/modules/missions/playbooks/webinar-fulfillment.playbook.ts`, `apps/mission-worker/src/modules/missions/playbooks/__tests__/webinar-fulfillment.playbook.test.ts`

## [2026-07-19 12:34] - [FIX]

What: Rebuilt Page Grader client map as a nested Radix dialog (`z-modal-layer-4`) with an explicit scroll pane utility and search.
Why: The createPortal popup sat under Workspace Settings’ focus/pointer trap, so clicks and scrolling did not work even though the UI appeared.
Impact: Hard-refresh. Map clients → dialog is interactive, searchable, and the client list scrolls.
Files: `PageGraderClientScopeMapModal.tsx`, `page-grader-client-scope-map.ts`, `globals.css` (web + website)

## [2026-07-19 12:30] - [FIX]

What: Page Grader client map modal scrolls reliably (`overflow-hidden` on the card + scrollable body) and includes a client search field.
Why: Long client lists could not be scrolled, and there was no way to find a client by name.
Impact: Hard-refresh. Open Map Page Grader clients → search and scroll the list; save still applies all draft mappings.
Files: `PageGraderClientScopeMapModal.tsx`, `page-grader-client-scope-map.ts`, `page-grader-client-scope-map.test.ts`

## [2026-07-19 12:54] - [FIX]

What: Typed collapse metadata as `Record<string, unknown>` so deleting `composio_connected_account_id` typechecks on Vercel.
Why: `roas-api` production build failed TS2551 on PR #20 merge tip.
Impact: Unblocks API deploy of the Google Calendar duplicate remap fix.
Files: `integrations-overview-personal-composio-sync.ts`

## [2026-07-19 15:12] - [FEATURE]

What: Ship mission Deliverables export to one multi-tab Google Doc (Export to Google Docs + Docs logo), plus compact subtask assignee chips.
Why: Recovered unfinished stash work so prod can run the export path users already see in UI.
Impact: After API+web deploy, mission Export to Google Docs creates `{Mission} — Deliverables` with each Space doc as a native Docs tab.
Files: multi-tab Drive services, mission export endpoint, DeliverablesCarousel, SubtasksSection, docs/tests


## [2026-07-19 15:17] - [ARCH]

What: Consolidated `space-template-picker` onto local main via cherry-pick.
Why: Multi-agent WIP was scattered across branches/stashes.
Impact: Feature commit now lives on local main.
Files: cherry-picked ad406337

## [2026-07-19 15:17] - [ARCH]

What: Consolidated `mission-branch-access` onto local main via cherry-pick.
Why: Multi-agent WIP was scattered across branches/stashes.
Impact: Feature commit now lives on local main.
Files: cherry-picked f700224d

## [2026-07-19 15:18] - [ARCH]

What: Consolidated mission branch-access fix onto local main; extracted outbox dispatcher mapping to clear the 600 LOC gate.
Why: Multi-agent WIP was on a side branch/worktree; commit was blocked by pre-existing outbox LOC debt.
Impact: `awaiting_access_approval` outbox dispatch lives on local main.
Files: mission access cherry-pick, `missions.outbox-dispatcher.mapping.ts`

## [2026-07-19 15:19] - [ARCH]

What: Consolidated `slack-people-shadow` onto local main via cherry-pick.
Why: Multi-agent work was scattered off main.
Impact: Feature now lives on local main.
Files: cherry-picked 1e05f891

## [2026-07-19 15:19] - [ARCH]

What: Consolidated `meta-ads-launch` onto local main via cherry-pick.
Why: Multi-agent work was scattered off main.
Impact: Feature now lives on local main.
Files: cherry-picked 2acf0e6f

## [2026-07-19 15:19] - [ARCH]

What: Consolidated multi-agent finished work onto local `main`: home layout, space template picker note, mission branch-access, Slack people shadow mode, Meta ads launch playbook. Extracted outbox dispatcher mapping for LOC gate. Dropped superseded stashes.
Why: Agents had been stashing/branching WIP off main; local main is the consolidation point.
Impact: Local main is ahead of origin with those features. Webinar artifact-preview repair (`14d515e0`) still needs a manual merge (code conflicts). One broad snapshot stash kept.
Files: cherry-picks on main; `missions.outbox-dispatcher.mapping.ts`

## [2026-07-19 15:46] - [FIX]

What: Verified the premium funnel/site design migration against the actual ROAS production project, forced a fresh Lux runtime synchronization, confirmed the skill and all three references on the Fly machine, and ran the standard production smoke checks.
Why: An earlier audit used the generic Vibey production project instead of the ROAS production project and incorrectly reported that the training migration had not run.
Impact: ROAS production has one valid canonical design skill, three resources, three enabled agent skill copies, complete Lux registry assignment and Opus 4.8 routing, no managed legacy copy, a healthy synchronized runtime, and four passing production smoke checks.
Files: Operational verification of `supabase/migrations/20260718055800_premium_funnel_site_design_workflow.sql`, `docker/agents/templates/designer/skills/funnel-site-design/*`, `docker/openclaw.json`, and the `roas-runtimes` Fly deployment.

## [2026-07-19 16:00] - [FIX]

What: Replaced mission execution's incomplete local role-domain lookup with the shared agent-policy role defaults and additive team/agent policy resolution.
Why: Lux's managed marketing role already grants `generate_media`, but mission preflight omitted that domain and incorrectly paused generated concept images for human access approval.
Impact: Creative image subtasks proceed without approval when the assigned role already permits media generation; explicit agent denies still override defaults.
Files: `mission-action-policy.ts`, `mission-action-policy.test.ts`, `mission-execute-phase.service.ts`, `documentation/features/missions.md`
## [2026-07-19 17:29] - [FIX]

What: Stopped mission image generation from persisting a mission/subtask UUID as `media_assets.conversation_id`, while preserving normal chat conversation attribution.
Why: Generated artwork uploaded successfully but its media row failed the conversation foreign key, leaving Task 11 blocked with no image deliverables.
Impact: Mission-run `generate_image` calls can register images in Space Media and persist native mission image deliverables without requiring a chat-backed session.
Files: `artifact-legacy-media-generate.service.ts`, `artifact-legacy-media-generate.service.test.ts`, `documentation/features/missions.md`

## [2026-07-19 16:10] - [FIX]

What: Hardened `auto-skill-1-roas-precall-strategy` so every run must `save_document` the strategy map then `generate_visual_html` (one-pager) on that Doc's `item_id`, plus a separate agenda Doc — no Drive/Slack routing.
Why: Nate only saved Document cards; the skill already required an HTML one-pager, but taught unreachable Drive/Slack delivery instead of the Vibey visual-doc path.
Impact: Future Nate/precall runs are instructed to emit a Visual HTML one-pager in campaign Docs. Existing Impact docs are unchanged; re-run the skill to generate the HTML.
Files: docker/agents/templates/strategist/skills/auto-skill-1-roas-precall-strategy/SKILL.md, references/{html-onepager,output-template,team-runbook}.md; skill_library + Nate agent_skills/resources (ROAS prod)


## [2026-07-19 17:33] - [FIX]
What: Prefetch HQ sidebar spaces and harden paginated spaces response parsing so Campaigns flyouts do not show empty "No spaces yet" while data exists.
Why: Production had Impact spaces in DB and on /campaigns, but the Campaigns hover flyout only fetched spaces after mouseenter and could render an empty list.
Impact: HQ sidebar warms the spaces cache before Campaigns hover; paginated list parsing tolerates bare arrays.
Files: apps/web/src/components/layout/sidebar/useSidebarController.ts, apps/web/src/lib/spaces/spaces-api.ts, apps/web/src/lib/spaces/spaces-api.test.ts

## [2026-07-19 17:34] - [FIX]
What: Updated Vercel roas-api REDIS_URL from redis.railway.internal to the Railway public TCP proxy host and triggered a production redeploy.
Why: Production API was throwing getaddrinfo ENOTFOUND redis.railway.internal on Vercel (internal Railway DNS is not reachable there).
Impact: API serverless instances can resolve Redis after the redeploy lands; reduces Redis connection error noise.
Files: Vercel project env REDIS_URL (roas-api)
## [2026-07-19 17:38] - [FIX]

What: Space Missions tab now fetches and realtime-filters by `space_id` (not campaign-wide).
Why: V2 and V3 under the same campaign both showed every campaign mission because `useMissionsViewListState` only passed `campaign_id` to `fetchMissions`.
Impact: Each Space Missions view lists only that space's missions. Create/playbook paths already set `space_id`.
Files: apps/web/src/features/spaces/components/useMissionsViewListState.ts, useMissionsViewRealtime.ts, MissionsView.tsx, MissionsView.test.tsx, useMissionsViewRealtime.test.ts

## [2026-07-19 18:33] - [FIX]

What: Scoped native Slack connections strictly to the active personal or organization account, changed the install welcome DM to introduce itself as “your new bot,” and granted authenticated/API access to the Shadow action table.
Why: A personal Slack connection could appear connected inside a new organization, while Team → People failed because the Shadow ledger migration enabled RLS without granting table privileges.
Impact: Settings, Slack runtime actions, and Team → People now agree on the selected workspace; the ROAS organization’s 303 synced people can load with an empty Shadow inbox; future installs receive the generic introduction.
Files: `apps/api/src/modules/slack/repositories/slack.repository.ts`, `apps/api/src/modules/integrations/services/integrations-status.service.ts`, `apps/api/src/modules/slack/services/slack-service-events.base.ts`, focused tests, `supabase/migrations/20260719183347_grant_slack_shadow_actions_access.sql`, `documentation/features/integration-connections.md`

## [2026-07-19 19:04] - [FEATURE]

What: Added Manage People to the Team flyout, moved the Shadow inbox above the Slack roster, revealed it after test-proposal creation, and added an explicit three-step explanation of Ghost, Shadow, approval, activation, and sending.
Why: Test proposals were created successfully but appeared below hundreds of Slack people, making the result invisible and leaving the current manual review capability unclear.
Impact: Admins can navigate directly to Manage People, immediately see a created proposal, and understand that this release is a safe manual review/send loop while automatic proposal discovery remains follow-up work.
Files: `apps/web/src/components/layout/sidebar/SidebarTeam2Flyout.tsx`, `apps/web/src/components/layout/sidebar/SidebarTeamManageLinks.tsx`, focused tests, `apps/web/src/features/team-2/components/people/SlackPeopleView.tsx`, `apps/web/src/features/team-2/config/messages.config.ts`, `documentation/features/integration-connections.md`

## [2026-07-19 19:45] - [FEATURE]

What: Expanded Manage People with safe exact-name identity suggestions, explicit Internal/External/Ignored classification, portal and Brain indicators, and a selected-person view containing the real Slack DM timeline beside its Shadow proposal ledger.
Why: Admins could create and send a proposal but could not see where it would land, distinguish portal users from Slack-only people, classify people independently from delivery mode, or review a likely name match when Slack and portal emails differed.
Impact: Active Slack humans remain the roster source; email matches link automatically, unique exact-name matches require confirmation, manual classifications persist across refreshes, and an admin can inspect the destination conversation before using the existing reviewed-send flow. User Brain attachment is visible without falsely claiming that DM-to-Brain learning is already automatic.
Files: `supabase/migrations/20260719204000_slack_people_identity_activity.sql`, Slack people DTO/types/controller/repositories/services/tests, Team People service/hook/config/components/tests, `documentation/features/integration-connections.md`

## [2026-07-19 21:24] - [FIX]

What: Reordered the Slack People identity migration to widen the legacy relationship constraint before converting Slack rows to `internal`.
Why: ROAS production correctly rejected `internal` while the old constraint was still active, causing the original transaction to roll back until the same migration intent was applied in the safe order.
Impact: Fresh environments can apply the committed migration atomically; ROAS production already has the corrected schema and 606 converted Slack people.
Files: `supabase/migrations/20260719204000_slack_people_identity_activity.sql`

## [2026-07-19 19:50] - [FEATURE]

What: Shipped Page Grader continuous campaign brain sync — deterministic dual-write ingest (ns_memories + Campaign Knowledge), content_hash cursors, PG push webhook + ROAS hourly catch-up, Map clients / Brain canvas Re-sync, and hardened nightly Client Intel refresh with hash push.
Why: Map clients → Create & import used Atlas campaign_file_import which could not write campaign memories (stuck Processing, Objects: 0); sync was one-shot and PG refresh did not notify ROAS.
Impact: Mapped clients sync without Atlas LLM; unchanged hashes no-op; manual force Re-sync available; Brain queue shows succeeded page_grader_brain_sync jobs. Requires API deploy + PG ROAS_BRAIN_WEBHOOK_* env + operator Re-sync for Multifamily.
Files: page-grader-brain-package-{build,ingest}.service.ts, page-grader-client-import.service.ts, page-grader-brain-sync.service.ts, page-grader-webhooks.controller.ts, CampaignAddInfo{Panel,ImportMenu}.tsx, PageGraderClientScopeMap*.tsx, page-grader scheduled-brain-refresh / roasBrain{Package,Push}.ts, documentation/features/page-grader-campaign-brain-sync.md

## [2026-07-19 21:02] - [FIX]

What: Made Page Grader client imports create and deterministically reuse a canonical General Space, normalized incomplete legacy Space schemas in the frontend, added an in-place repair migration for malformed Page Grader Spaces, and made successful Fathom connections reuse or instantiate the existing Meetings template with draft automations.
Why: Page Grader-created Spaces omitted required schema fields and crashed the Spaces view, while new client connections lacked dependable default General and Meetings destinations.
Impact: New and repaired client Spaces load safely, Page Grader maps to the intended General Space, and Fathom gets a ready Meetings Space without publishing automations before human confirmation.
Files: `page-grader-client-import.service.ts`, `page-grader-general-space-schema.ts`, `normalize-space-schema.ts`, `use-space-active-view.ts`, Fathom controller/service/module, integrations callback/messages, focused tests, `20260719210500_repair_page_grader_general_spaces.sql`, and feature documentation.

## [2026-07-19 21:04] - [FIX]

What: Replaced Task 16's blank Google Doc reconstruction with a native copy of the ROAS Webinar Launch Bible master, then mapped approved campaign content into the copied styled tabs.
Why: Blank reconstruction flattened the intended launch-bible design and did not preserve the master document's tables, emojis, or native tab hierarchy.
Impact: Future Webinar Launch Bible compilations retain the master template's 13-tab topology, including nested funnel pages, while ordinary mission-deliverables exports remain unchanged.
Files: `google-drive-composio-multi-tab-docs.service.ts`, `google-drive-api.service.ts`, `markdown-to-google-docs-tab-requests.ts`, `mission-deliverables-google-export.service.ts`, Task 16 action/playbook guidance, tests, and `documentation/features/missions.md`
## [2026-07-19 21:19] - [REFACTOR]

What: Removed Space work open-item tabs (strip, persistence, sync) while keeping the Space dock beside chat and collapse/auto-expand.
Why: Tab strip cluttered the Space column when opening docs/tasks; earlier removal never landed on main.
Impact: Hard-refresh. Docs/tasks open in normal Space UI only — no top tabs. Collapse still hides the dock without unmounting Space.
Files: SpaceWorkDock.tsx, use-shell-store.ts (+test), SpaceItemsContainer.tsx; deleted SpaceWorkTabStrip.tsx, space-work-tabs*.ts, use-space-work-tab-sync.ts, space-work-dock.messages.config.ts; globals.css (web + website); documentation/features/claude-chatgpt-shell.md; .docs/plans/right-sidebar-surface-picker.md
