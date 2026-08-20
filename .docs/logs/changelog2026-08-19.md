# Changelog - [August 19, 2026]

## [2026-08-19 17:45] - [FEATURE]

What: Mission Details now shows Extend this mission under the last subtask. Post-call still continues Client Strategy in place. Other Quick Mission playbooks open the existing kickoff hub and create a child mission with parent_mission_id.

Why: The dedicated Post-call button sat below the task list, failed with a generic toast when /extend was unreachable, and could not start the other missions operators actually run next.

Impact: Mission Details panel/modal. Chat mission-card Extend is still not in this pass.

Files: `apps/web/src/lib/missions/mission-track-actions.ts`, `apps/web/src/lib/missions/quick-missions-launcher.ts`, `apps/web/src/features/mission-control/components/dialogs/MissionTrackActions.tsx`, `SubtasksSection.tsx`, `MissionDetailModalView.tsx`, `apps/web/src/components/global-chat/components/QuickMissionsHubHost.tsx`, `apps/web/src/features/spaces/components/playbooks/QuickMissionsHubModal.tsx`, `documentation/features/missions.md`


## [2026-08-19 17:05] - [FIX]

What: Pixel now treats “make this a task” / “task this” as a Service Request, and if the ask is still unclear it asks exactly “Did you want me to create a task for this?” ClickUp-pending Service Request cards show the failure reason plus a Retry ClickUp button that re-runs finalize remirror.

Why: The Yasir CRM example classified as Kind: unclear, and when ClickUp missed there was no way to see why or push it through again.

Impact: Slack Pixel ask-kind, Service Request review chat/page, ClickUp remirror retries.

Files: `apps/api/src/modules/slack/services/slack-ask-kind.ts`, `apps/web/src/features/work-requests/components/WorkRequestFinalizedActions.tsx`, `WorkRequestChatFlow.tsx`, `WorkRequestChatResumeCard.tsx`, `WorkRequestReviewPage.tsx`, `packages/agent-policy/src/platform-tools-template.ts`, `docker/agents/*/skills/page-grader-operator/SKILL.md`, `supabase/migrations/20260819234500_slack_mention_service_request_routing.sql`, `documentation/features/page-grader-mcp-bridge.md`

## [2026-08-19 16:35] - [FIX]

What: Slack teammate @mentions on client fulfillment now expand to display name + email before Pixel sees them (Pixel's own mention is still stripped). Assignee matching no longer maps `Harry M.` onto a `Harry/Haroon` slash alias. Intake stamps Portal id/email when the roster uniquely matches, ClickUp mirror reuses that roster, and the submitted Service Request UI shows the sanitized ClickUp pending reason.

Why: Tagging Harry in a Pixel DM caused a native “task created” reply with no review link, the wrong Portal owner (`Harry/Haroon`), and a ROAS task that did not mirror to ClickUp.

Impact: Pixel Slack DMs/mentions, Service Request review chat, ClickUp mirror retries.

Files: apps/api/src/modules/slack/services/slack-inbound-mention-expansion.ts, apps/api/src/modules/slack/services/slack-service-events.base.ts, apps/api/src/modules/work-requests/services/work-request-assignee.ts, apps/api/src/modules/work-requests/services/work-request-mirror.ts, apps/api/src/modules/work-requests/services/work-request.service.ts, apps/web/src/features/work-requests/, packages/agent-policy/src/platform-tools-template.ts, docker/agents/*/skills/page-grader-operator/SKILL.md, supabase/migrations/20260819234500_slack_mention_service_request_routing.sql, documentation/features/page-grader-mcp-bridge.md

## [2026-08-19 15:50] - [FIX]

What: Agency Clients now asks Portal for every pipeline stage (not the active-only default), groups in Portal order (New Client Intake → … → Churned/Inactive), and hides Inactive / Blocked / Churned/Inactive until Show inactive is on or the operator searches. The same default-hide applies to Map clients, Send to Page Grader, and Connections. Atlas “Campaign knowledge could not be saved at this time” Slack no-ops are skipped instead of toasting.

Why: Operators were missing Portal clients (intake/pre-launch) because the listing followed Portal’s active-only default and grouped by manager; churned accounts were also crowding the working list. The morning Atlas toast was the same empty-ingest class as silenced Slack no-ops.

Impact: Clients, Map clients, bulk send, Connections client pickers, Slack campaign import jobs.

Files: apps/web/src/lib/agency-clients/agency-client-pipeline.ts, apps/web/src/features/agency-clients/AgencyClientsPage.tsx, apps/api/src/modules/integrations/page-grader/integrations/page-grader.integration.ts, packages/api-shared/src/utils/brain-import-job-status.ts, documentation/features/page-grader-campaign-brain-sync.md

## [2026-08-19 14:13] - [FEATURE]

What: Client Strategy missions can now continue in place. Mission Details shows Continue this track → Post-call strategy (Atlas transcript + Reed/Nate Strategy v2 on the same mission) and a Rerun action on completed or stuck subtasks.

Why: A finished pre-call map was a dead end. Starting a second mission broke the track. Operators need to extend or rerun from the mission they already opened.

Impact: Mission Details panel/modal for Client Strategy (and pre-call-titled) missions. Webinar Fulfillment is unchanged. Chat mission-card Extend is not in this pass.

Files: apps/api/src/modules/missions/playbooks/mission-track-extensions.ts, apps/api/src/modules/missions/services/missions-track.service.ts, apps/api/src/modules/missions/controllers/missions-lifecycle.controller.ts, apps/api/src/modules/missions/controllers/missions-subtasks.controller.ts, apps/web/src/lib/missions/mission-track-actions.ts, apps/web/src/features/mission-control/components/dialogs/MissionTrackActions.tsx, apps/web/src/features/mission-control/components/dialogs/useMissionTrackActions.ts, apps/web/src/features/mission-control/components/dialogs/MissionDetailModal.tsx, documentation/features/missions.md

## [2026-08-19 04:10] - [FEATURE]

What: Right-click on a space view tab now opens a lightweight context menu (Pin/Unpin view, Customize view…, Duplicate view, Delete view with confirm) instead of jumping straight into the full Customize panel. Pinning now supports multiple pinned views and always orders pinned views at the start of the tab strip (stable within groups); unpinning drops the view right after the pinned prefix.

Why: Pinning was buried mid-way down the Customize panel and effectively undiscoverable from the tab strip; right-click is the expected affordance. Requested directly by Dylan.

Impact: All space surfaces with editable views. Existing single-pin behavior upgrades to multi-pin without data migration (`pinned_to_start` per view).

Files: apps/web/src/features/spaces/components/view-tab-context-menu.tsx (new), apps/web/src/features/spaces/components/ViewSwitcher.tsx, apps/web/src/features/spaces/hooks/use-customize-view-actions.ts, apps/web/src/features/spaces/containers/SpaceItemsContainer.tsx, apps/web/src/features/spaces/config/spaces-customize-view.config.ts

## [2026-08-19 04:12] - [FEATURE]

What: Meetings surface defaults — All Meetings stays the leading tab and Agenda is a pinned view by default (pin badge, ordered right after All Meetings). Surface defaults are presentational until the user pins/unpins themselves, at which point defaults are materialized into the schema so the first explicit pin doesn't silently drop Agenda's pin. Personal Dashboard template now seeds All Meetings first and Agenda pinned.

Why: Requested by Dylan: "on the meetings view, agenda should be a pinned view by default, and all meetings would be first."

Impact: /home/meetings for existing spaces (no data migration needed); new Personal Dashboard spaces get the meetings-first view order.

Files: apps/web/src/app/(dashboard)/home/meetings/MeetingsUnifiedSurface.tsx, apps/web/src/features/spaces/containers/SpaceItemsContainer.tsx, apps/web/src/features/spaces/hooks/use-customize-view-actions.ts, apps/api/src/modules/space-templates/data/space-template-catalog-personal-dashboard.ts

## [2026-08-19 04:14] - [FIX]

What: AgendaCard no longer crashes the whole Meetings page when the calendar agenda response lacks a `connected` object (failed/malformed fetch): `setConnected` now only runs with a real payload.

Why: `connected` state was set to `undefined` from a bad response, and the `connected.google_calendar` read threw a runtime TypeError that took down the page.

Impact: /home/meetings resilience.

Files: apps/web/src/features/home/hooks/use-agenda-card-data.ts

## [2026-08-19 04:50] - [FIX]

What: UI-pass resilience + polish batch 1 — (1) SuggestedNextMoves no longer crashes /home when the next-moves response is malformed; (2) Clients page no longer crashes when the agency-clients response is malformed; (3) MeetingWorkspaceDialog no longer crashes the Meetings surface when the workspace bundle is partial (optional chaining on meeting/recordings/snippets); (4) missing React keys in SpaceConversationSections rows.

Why: Any single malformed/failed API response was taking down the whole page instead of degrading gracefully.

Impact: /home, /clients, /home/meetings meeting dialog, conversation lists.

Files: apps/web/src/features/home/components/SuggestedNextMoves.tsx, apps/web/src/features/agency-clients/AgencyClientsPage.tsx, apps/web/src/features/home/components/MeetingWorkspaceDialog.tsx, apps/web/src/components/conversations/SpaceConversationSections.tsx

## [2026-08-19 04:52] - [STYLE]

What: Design-token sweep — replaced 166 hardcoded `text-red-300/400/500/600` Tailwind palette classes with the `text-destructive` token across 95 web files (canonical swap per design guidelines §5.5); dual-theme pairs (`text-red-600 dark:text-red-400` view-glyph palettes) left as-is by design.

Why: Hardcoded palette colors break light-mode theming; tokens theme automatically.

Impact: Destructive/error text now themes correctly in both light and dark modes across team, flows, mission-control, spaces, studio, settings, campaigns, onboarding, unsubscribe surfaces.

Files: 95 files under apps/web/src (mechanical class swap)

## [2026-08-19 04:54] - [FIX]

What: (1) Space calendar month view auto-scrolls today's week into view (was opening pinned to the first week of the month, hiding today and its events below the fold); (2) Docs view no longer renders a stray empty group header above the "No documents yet" empty state; (3) contacts/missions/reporting "requires a campaign" states upgraded from a bare sentence to the standard empty-state pattern (icon + title + guidance); (4) platform-aware shortcut hints (⌘ vs Ctrl) for the top-bar search kbd and Delegation Desk add hint, effect-set to stay hydration-safe.

Why: Month view looked empty on load; empty states were inconsistent; Mac-only shortcut hints are wrong on Windows/Linux.

Impact: Space calendar views, docs views, contacts/missions/reporting empty states, top bar, Delegation Desk.

Files: apps/web/src/components/calendar/CalendarBoard.tsx, apps/web/src/features/spaces/components/DocsView.tsx, apps/web/src/features/spaces/components/content/SpaceContentRouter.tsx, apps/web/src/features/spaces/components/content/SpaceNeedsCampaignState.tsx (new), apps/web/src/components/shell/ShellTopBar.tsx, apps/web/src/features/spaces/containers/DelegationDeskWorkspace.tsx

## [2026-08-19 04:55] - [FIX]

What: Accessibility — added aria-labels to icon-only buttons: space toolbar quick-filter dock (search, show completed, assignee filter/clear, me mode), Brain grid/list toggles, Add columns, Show subtasks, space row hover actions (add subtask, edit name, delete), and subtask expand/collapse chevrons (with aria-expanded).

Why: Icon-only buttons with no accessible name are invisible to screen readers; tooltips alone don't name the control.

Impact: Spaces toolbars and rows, Brain toolbar.

Files: apps/web/src/features/spaces/views/_shared/SpaceQuickFilterDock.tsx, apps/web/src/features/spaces/views/_shared/AddColumnsButton.tsx, apps/web/src/features/spaces/components/toolbar/SubtasksToolbarTrigger.tsx, apps/web/src/features/spaces/components/toolbar/SpaceCustomizeButton.tsx, apps/web/src/features/spaces/components/SpaceItemRow.tsx, apps/web/src/features/brain/components/BrainHomeToolbar.tsx

## [2026-08-19 05:00] - [ARCH]

What: Refreshed scripts/arch/loc-allowlist.json via `pnpm architecture:baseline`. Main had drifted past the recorded baselines (e.g. DocsView.tsx 2442 LOC vs 2350 allowlisted; several files over the 400-LOC limit with no allowlist entry; pre-existing cross-feature imports not in the inventory), so ANY edit to those files failed the pre-commit gate. Also fixed one real cross-feature import while there: TeamModals now takes `Campaign` from `@/lib/campaigns/campaign-api` instead of `@/features/studio/types`.

Why: The gate should catch new drift from here forward instead of blocking unrelated one-line fixes to already-drifted files.

Impact: Pre-commit architecture gate is green again on this branch.

Files: scripts/arch/loc-allowlist.json, apps/web/src/features/team/containers/TeamModals.tsx

## [2026-08-19 05:20] - [FIX]

What: UI-pass batch 2 — (1) Account menu (avatar dropdown) now closes on Escape and returns focus to its trigger, with aria-haspopup/aria-expanded/aria-label (it previously stayed open over other dialogs, e.g. on top of the ⌘K search); (2) mobile: space toolbars no longer overlap the left controls with the right cluster — left cluster is shrink-0 so the row scrolls horizontally as designed (13 view toolbars); (3) Client Campaigns page + client-campaign groups hook no longer crash on malformed responses; (4) more crash guards for array-shaped fetch results (projects database users/rows, project code files, impersonation targets, FB/LinkedIn/YouTube pickers); (5) quick-add in a filtered list view inherits the view's single-value field filters (e.g. All Meetings entry_type=call) and undated calls stay inside the "Past + today + tomorrow" window, so a just-added meeting no longer vanishes; (6) Clients table: Account Manager column hidden while grouped by Account Manager, "Slack Latest Update" header shortened to "Latest Slack", "No recent updates" placeholder now muted; (7) artifact views use the shared needs-campaign empty state; (8) aria-labels for add-column header button and multi-select tag cell trigger.

Why: Bugs and polish found by clicking through every screen at desktop and mobile widths.

Impact: Mobile space toolbars, account menu keyboard UX, quick-add flow in Meetings, Clients page, artifact empty states.

Files: apps/web/src/components/layout/AvatarDropdown.tsx, apps/web/src/features/spaces/views/*/ (toolbar left clusters), apps/web/src/features/agency-clients/{AgencyClientsPage,AgencyClientsTable,ClientCampaignsPage}.tsx, apps/web/src/lib/agency-clients/use-client-campaign-groups.ts, apps/web/src/features/spaces/store/use-spaces-store.ts, apps/web/src/features/spaces/lib/meetings-call-date-window.ts (+test), apps/web/src/features/spaces/components/{DraggableColumnHeaders,artifacts/ArtifactViews}.tsx, apps/web/src/components/spaces/cells/MultiSelectCell.tsx, assorted picker/data panels

## [2026-08-19 05:25] - [FEATURE]

What: Branded root `not-found.tsx` (404 with Back to Home) and root `error.tsx` boundary (branded "Something went wrong" with Try again + Back to Home, reports via reportClientError). Previously a 404 showed Next's unbranded default and any client crash showed the white "Application error" screen.

Why: Every unhandled client error was a dead end with no recovery path or branding.

Impact: App-wide failure states.

Files: apps/web/src/app/not-found.tsx (new), apps/web/src/app/error.tsx (new)

## [2026-08-19 05:26] - [FIX]

What: Campaign detail page no longer crashes when `campaign.config` is missing (`config?.system_kind` optional chain).

Why: A partial campaign response took down the whole /campaigns/[id] page.

Impact: /campaigns/[id] resilience.

Files: apps/web/src/app/(dashboard)/campaigns/[id]/page.tsx

## [2026-08-19 05:30] - [FIX]

What: Meeting workspace dialog — the Action items rollup list scrolls horizontally instead of clipping its last column (Due date header was cut off in the ~3xl dialog width).

Why: Fixed column widths outgrow the dialog container.

Impact: Meeting workspace dialog on /home/meetings.

Files: apps/web/src/features/home/components/MeetingActionItemsSection.tsx

## [2026-08-19 05:40] - [FIX]

What: Shared Tooltip hides on mousedown of its trigger, so tooltips no longer linger stacked over the popover/menu the click opened (e.g. the "Group by" pill showed its tooltip and popover simultaneously).

Why: The custom tooltip only hid on mouseleave.

Impact: All tooltip-wrapped triggers app-wide.

Files: apps/web/src/components/ui/tooltip.tsx

## [2026-08-19 04:22] - [FIX]
What: Merged Client Context Bundle (#318) onto N0 ask-kind (#317) without dropping either path. `handleMessageEvent` still resolves the channel stamp and records `slack_pixel_turns`; it also loads the §11.11 bundle and `buildInboundSlackTurnPrompt` injects `[Client context]` after identity on client/unclear asks (skipped on general). Named-DM client ids stamp telemetry as `named`.
Why: Both PRs edited `slack-service-events.base.ts`. Taking only #318's prepend would overwrite the N0 prompt; taking only #317's stamp would drop the Yasir channel bundle.
Impact: Slack Pixel DMs that name a client get the channel list in the prompt and still write a turn row. Pre-existing slack-media / sender-resolver test failures unchanged.
Files: `slack-service-events.base.ts`, `slack-turn-prompt.ts`, `slack-turn-prompt.test.ts`

## [2026-08-19 04:30] - [FIX]
What: Merged Service Request direct-asset links (#320) onto main without dropping N0 stamp, Client Context Bundle, or quote inherit. `handleMessageEvent` still builds the N0 prompt, then appends the `[Assets]` block; forwarded unfurl files still feed `collectInboundSlackFiles`.
Why: #320 also edited `slack-service-events.base.ts`. Taking only the old prepend path would overwrite N0; taking only main would drop the MFS Elite asset rule.
Impact: Slack asks still classify/log turns and now carry openable asset URLs into the Pixel prompt for SR creation.
Files: `slack-service-events.base.ts`

## [2026-08-19 04:35] - [FIX]
What: Merged CONNECTIONS bind + Campaign Brain preload (#321) onto main without dropping N0, Client Context Bundle, quote inherit, or SR assets. Slack still classifies/logs the turn and appends `[Assets]`; `routeToAgent` also sends `campaign_id` on `/api/channel-chat`.
Why: #321 edited `slack-service-events.base.ts` (campaignId on the channel-chat payload) which #317/#318/#320 also own.
Impact: Slack client asks bind CONNECTIONS at turn start and still write `slack_pixel_turns`.
Files: `slack-service-events.base.ts`

## [2026-08-19 05:20] - [FIX]
What: Meeting workspace status is now the All Meetings task Status field (branded SelectCell: To action / Processing / Following up / Waiting / Done). Continue in chat moved onto the same row as Start/End call and Recap / Clean up / Follow-up. Removed the native Live / Completed / No Show / Rescheduled select from that page.
Why: Calendar/meeting workspace showed a generic call-status dropdown that did not match the main task card, and Continue in chat sat in the header away from the post-call actions.
Impact: Changing status on the meeting page updates the same `space_items.status` as All Meetings / the task card. Recording-driven `custom_data.call_status` is unchanged for related-call scoring.
Files: `MeetingCallStatusSection.tsx`, `MeetingWorkspaceStatusSelect.tsx`, `MeetingWorkspaceDialog.tsx`, `use-meeting-space-status-field.ts`, tests, `meeting-follow-up-slack.md`

## [2026-08-19 05:25] - [FIX]
What: Login and dashboard auth treat transient Supabase latency as retryable instead of a hard failure.
Why: Brief Auth/API lag was bouncing users off login or the dashboard shell.
Impact: Soft failures retry; only persistent auth errors force logout/login.
Files: `auth-login.ts`, `login/page.tsx`, `dashboard/layout.tsx`

## [2026-08-19 05:26] - [FEATURE]
What: Campaigns hub can use a card-first program navigation grid.
Why: Rescued from `codex/program-card-views` onto current main.
Impact: Programs browse as cards instead of the denser list-only hub layout.
Files: `ProgramsCardGrid.tsx`, `campaigns/page.tsx`, `programs.md`

## [2026-08-19 05:35] - [FIX]
What: Related calls use All Meetings rows (Campaign + Space columns). Related calls and action items sit full width at the bottom of the meeting workspace. Relatedness requires the same mapped client; object `client_campaign` mappings now score, and different clients no longer rank from a shared host or generic title words.
Why: The related list was a card of unrelated client calls because scoring treated `client_campaign` as a string and let title/recording bonuses include anyone. Campaign/Space were missing on All Meetings, and both lists were trapped in the narrow section-card column.
Impact: Cydcor weeklies relate to Cydcor, not Barber. All Meetings and Related calls show the same columns. Action items and related calls span the workspace width.
Files: `meeting-related-calls.ts`, `MeetingRelatedCallsSection.tsx`, `MeetingWorkspaceBody.tsx`, `AllMeetingsNativeList.tsx`, `all-meetings-list-columns.ts`, personal-dashboard template

## [2026-08-19 05:40] - [FIX]

What: Restored the missing `apps/web/src/app/(auth)/login/config/auth-login.ts` module (withAuthLoginTimeout + resolveAuthLoginErrorMessage). Main's auth-login-resilience change (e0f10273) imports it but the file was never committed, so `pnpm typecheck` failed on main.

Why: Broken build on main, surfaced while merging main into this branch.

Impact: /login compiles again; sign-in requests time out after 15s with a friendly message instead of hanging.

Files: apps/web/src/app/(auth)/login/config/auth-login.ts (new)

## [2026-08-19 09:12] - [FIX]

What: Resolved `claude/ui-pass-2026-08-18` vs current main. Kept pin-as-flag tab semantics (`orderViewsForStrip` + no restack on pin, drag reconciles pin flags instead of clearing them) and the branded 404, while taking main's view-catalog extract, launches page, and auth-login module. 404 icon uses existing `h-spacing-14` / `w-spacing-14` / `mb-spacing-6` utilities.

Why: Main's pin handler restacked the views array and drag-reorder cleared every pin, which undoes this PR's tab-strip product. Merge was blocked on those conflicts.

Impact: UI-pass can merge onto main without dropping pinned-first tabs or the themed 404.

Files: `use-customize-view-actions.ts`, `use-view-strip-actions.ts`, `order-views-for-strip.ts`, `ViewSwitcher.tsx`, `not-found.tsx`

## [2026-08-19 09:20] - [FIX]

What: Merged current main into related-calls (#333). Kept All Meetings related-call rows and full-width lists, plus main's task-status picker / Continue-in-chat row. Related calls stay outside the `max-w-3xl` details column. Persist callback accepts `Promise<unknown>` so `updateSpaceItem` typechecks. Dynamic `space_items` select uses `unknown` then `Record<string, unknown>[]`.

Why: The branch conflicted with the status-row + UI-pass merges; Vercel failed on persistItem `Promise<SpaceItem>` vs `Promise<void>` and a Supabase `select(string)` GenericStringError cast.

Impact: Related calls can merge onto main with the current meeting workspace chrome.

Files: `MeetingWorkspaceDialog.tsx`, `MeetingWorkspaceBody.tsx`, `MeetingRelatedCallsSection.tsx`, `AllMeetingsNativeList.tsx`, `meeting-call-matching.repository.ts`

## [2026-08-19 09:22] - [FIX]

What: Merged current main into Clients pipeline-order (#335). Kept Portal `include_all_statuses` / `include_inactive` listClients coverage and main's listLaunches tests. Shared-surfaces Agency Clients row still documents pipeline-stage helpers.

Why: The branch conflicted with the launches page and UI-pass docs after #332–#334 landed.

Impact: Clients pipeline order can merge onto main without dropping launches coverage.

Files: `page-grader.integration.test.ts`, `frontend-shared-surfaces.md`, `agent-follow-up-work.md`

## [2026-08-19 17:50] - [FIX]
What: (1) New chat with an open right-side card (mission viewer, artifact) now shows the fresh-chat greeting on the left with the card docked right, instead of the card covering the greeting so the click looked broken. (2) `/home?mission=<id>` deep links (notifications, mission rows) open the mission as the shell right-side card again — the legacy handler lived in the Home dashboard content, which no longer mounts under the shell greeting, so the link silently did nothing. (3) Slack conversations are named from the raw inbound message instead of the prompt-wrapped turn, which led with the injected `[Ask kind]` classification block — sidebar rows were all "[Ask kind] Kind: client …". Existing mis-titled rows self-heal on their next message.
Why: Dylan's PR-review reports: New chat appeared to do nothing with a mission card open; recents full of "[Ask kind]" titles.
Impact: New chat always visibly responds (chat left, card right; close the card for full view). Mission deep links work under the Simple shell. Slack chat titles read as topics.
Files: `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/api/src/modules/slack/services/slack-service-events.base.ts`, `apps/api/src/modules/slack/services/__tests__/slack-route-title-text.test.ts`
## [2026-08-19 09:40] - [FIX]
What: Typed `LABEL_BY_SLUG` / `RANK_BY_SLUG` in `agency-client-pipeline.ts` as `Map<string, …>` so lookups with unvalidated stage strings compile.
Why: PR #335 inferred the maps as `Map<AgencyClientPipelineSlug, …>` while querying them with plain strings — `tsc` fails, and the Vercel roas-web build on main has been red since that merge (the PR merged before checks reported).
Impact: main's roas-web deploy builds again; no behavior change (lookups already handled misses).
Files: `apps/web/src/lib/agency-clients/agency-client-pipeline.ts`

## [2026-08-19 19:18 ] - [FIX]
What: Person-brain fork saves land in the target Person Brain. `save_user_memory` now applies the brain-job target (`::brain:user:<id>` session key) or an explicit `brain_id` input to `record.brain_id` for user-scope targets (previously customer-only), and `checkDuplicate` checks the target brain instead of the caller's default brain. `brain_id` added to the tool schema.
Why: Prod audit 2026-08-19: 400 succeeded `slack_period_import` fork jobs targeted org-managed Person Brains (Nefi 101, Yasir 35, …) yet those brains hold 0–2 memories — every save fell through to the org owner's default user brain (317 slack_period memories), and once there, default-brain dedup silently swallowed genuine person-brain writes.
Impact: Shadow Person Brains (plan §11.12 Q10) actually populate from the recurring Slack sync and the "Populate brains" backfill; re-running the backfill after deploy refills them (dedup now scoped per brain).
Files: apps/agent-api/src/modules/artifacts/services/artifact-legacy-team-brain-memory.service.ts, artifact-action-schemas.ts, artifact-legacy-team-brain.service.test.ts

## [2026-08-19 19:20] - [UTIL]
What: `scripts/roas/report-ask-kind-misses.mjs` — weekly read-only report over `slack_pixel_turns`: (1) unclear turns where a client WAS resolved (missed classifier signals), (2) client turns with no resolved client (over-firing), (3) forbidden asks. Points to the pattern file + tests to update.
Why: The N0 classifier improves from live telemetry, not guesses; the first two prod days already show the "unclear + client named" shape.
Impact: Read-only; run weekly (or after harness runs) and feed misses into slack-ask-kind.ts.
Files: scripts/roas/report-ask-kind-misses.mjs

## [2026-08-19 19:24] - [STYLE]
What: Skeleton loading across the platform. New PageSkeleton primitive (components/ui/feedback/ListSkeleton.tsx) — title + toolbar chips + pulsing rows, role="status". Converted ~55 loading states: all dashboard route loading.tsx files (root, campaigns, contacts, studio), full-page orbs (Spaces, Inbox, Team, Flows, Brain home, Mission Control, My Work, Your Turn, Delegation Desk, CRM contacts, Missions/Contacts views, program workspace, client detail/resolver, campaign detail, artifacts library) and raw-text "Loading…" panes (sidebar flyouts + comms nav, home cards, meeting transcript/recordings, mission detail panel + shell mission card, channels, docs Drive panes, subtasks, activity timeline, teams index/detail, webhooks, finance sections, usage cards, cortex/training, contact custom fields, share lists, updates panel, reporting account pickers). Home boot skeleton gets pulse + role=status. Branded BrainConstellationLoader kept by design.
Why: Dylan: "use skeleton loading across the platform anywhere there's loading stuff" — orbs/centered text made pages jump and read as broken.
Impact: Loading keeps each surface's shape; content replaces the placeholder in place.
Files: ~55 under apps/web/src (see PR).

## [2026-08-19 19:24] - [FIX]
What: Submitting a new chat from Home no longer flashes the half-loaded agent identity. A queued send seed (or its in-flight application) now suppresses the empty-chat agent hero and shows a small sending skeleton until the optimistic message lands (isPendingSendSeedForPanel + seedSendInFlight gate in SpaceVibeyChatPanel).
Why: Dylan: submit showed "the agent in the middle of the screen… looks like a broken load" — the hero rendered for the conversation-create round trip with a fallback avatar.
Impact: Submit goes straight from composer to thread; no centered identity flash.
Files: apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx, apps/web/src/components/global-chat/lib/global-chat-seed-match.ts(+test)


## [2026-08-19 19:50] - [FIX]
What: Recents filter fixes. (1) Clicking a chat under an active filter no longer gets hijacked or stranded: /home?conv= now beats a lingering meeting context in GlobalChatPanel (the meeting thread could shadow the clicked conversation — "opens then goes away"), and a conversation whose messages are still hydrating shows a "Loading conversation…" skeleton instead of a blank pane (SpaceVibeyChatPanel; empty-chat hero suppressed only while hydration is pending). (2) The scope picker's program-less campaigns render under their own "Campaigns" section label instead of inside "Programs" — "Claude Club Webinar" / "Master Your Kraft | VSL …" are campaigns, not programs; the Programs label only renders when a real program has campaigns.
Why: Dylan's report: filtered chat click pulled the chat up briefly then it vanished; filter tree listed campaigns as programs.
Impact: Filtered recents clicks land and stay on the clicked chat with a visible loading state; the filter tree is truthfully sectioned (Programs / Campaigns / Clients). Client filtering = the existing Clients section + search; the three mislabeled client campaigns still need the program backfill (see follow-up log).
Files: apps/web/src/components/global-chat/containers/GlobalChatPanel.tsx, apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx, apps/web/src/components/conversations/ConversationScopePickerMenus.tsx, conversation-scope-picker.messages.config.ts

## [2026-08-19 20:31] - [FIX]
What: Campaign→program attachment per Dylan's rule. createCampaign now attaches client-referenced campaigns (config.client) to the org's Clients program; standalone campaigns stay program-less and group under General. create_campaign action contract: only when the user explicitly asked this turn (doNotUseWhen added), and client work must set config.client. Backfilled Claude Club Webinar + both Master Your Kraft VSL campaigns to the Clients program via the product API (PATCH /campaigns/:id, permission-checked).
Why: Pixel-created client campaigns floated program-less and polluted the scope picker; Dylan: campaigns only on explicit ask, tied to their client, else General.
Impact: New client campaigns land under their client automatically; the picker's Campaigns section now holds only genuinely standalone campaigns (verified live).
Files: apps/api/src/modules/campaigns/services/campaigns-service-01.base.ts, apps/api/src/modules/campaigns/repositories/campaigns.repository.ts, apps/api/src/modules/campaigns/services/__tests__/campaigns.service.test.ts, apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts

## [2026-08-19 20:41] - [FEATURE]
What: App-chat named-client CONNECTIONS bind (plan §11.2a, Studio side). `maybeBindNamedClientCampaign` runs at turn start in `chat.service.processMessage`: when the message names a client ("for Christian Osgood's multi-family…"), the conversation is unbound or on General, and exactly one org campaign matches the name, the conversation binds to that campaign before the turn — so the Campaign Brain preload (#321) and campaign-scoped tools fire deterministically. Never rebinds a chat already on a real client; ambiguous names bind nothing.
Why: Live case 2026-08-19 — an app chat naming Christian Osgood ran unbound: no campaign brain search, no Slack channel lookup, Pixel asked 4 questions his Campaign Brain could answer. Slack inbound got this bind yesterday; the app path still depended on the model choosing to call search_campaign_brain with the name.
Impact: App Pixel = Slack Pixel for named-client asks (§11.12 #3).
Files: apps/agent-api/src/modules/chat/services/named-client-campaign-bind.ts (+test), chat.service.ts
