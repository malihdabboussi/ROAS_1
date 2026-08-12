# Changelog - August 10, 2026

## [2026-08-10 09:43] - [FEATURE]

What: Rebased and shipped local Home Agenda WIP onto current `origin/main`: persisted agenda minimize/exclusions (Fathom settings + webhook gate), impromptu instant meetings, Delegation Desk as `/home/delegation-desk`, Pixel legacy-name suffix normalization + seed migration, and Slack Active/Shadow copy polish. Kept main’s OpenClaw model routing and minimized-row UI.

Why: Valuable local work was parked behind a stale main and needed to land cleanly after fast-forwarding 51 upstream commits.

Impact: Users can hide agenda occurrences across sessions (and skip Fathom ingest for those), start impromptu calls without a calendar, open Delegation Desk as a home route, and see “Vibey · CEO”-style defaults as Pixel.

Files: fathom agenda-exclusion API/helpers, meeting instant create path, home agenda/instant host, delegation desk page/workspace, default-agent-identity, pixel seed migration, docs/follow-up/changelog

## 2026-08-10 20:14 - [FIX]

What: Restored Pixel's scheduled Slack observation loop, made BullMQ automation routing and in-process schedule polling explicit persistent-host opt-ins, split cron parsing from next-fire persistence failures, and added automatic repair for enabled schedules with a null next-fire timestamp.

Why: Vercel was enqueueing scheduled work to a Railway-private Redis queue with no deployed automation consumer, while the scheduler's recovery path could erase a valid next-fire timestamp when a transient database write failed.

Impact: Pixel completed a fresh production run with 469 observations after the outage. Vercel now executes scheduled automations inline through the authenticated cron endpoint; transient persistence failures remain due for retry; valid enabled schedules self-heal after a null next-fire incident.

Files: `apps/api/src/cron.service.ts`, `apps/api/src/cron.service.test.ts`, `apps/api/src/modules/spaces/services/space-automation-service-01.base.ts`, `apps/api/src/modules/spaces/services/space-automation-service-08.base.ts`, `apps/api/src/modules/spaces/services/space-automation-scheduler.service.ts`, `apps/api/src/modules/spaces/repositories/space-automations.repository.ts`, related tests, `documentation/features/spaces-automation.md`.
## [2026-08-10 21:06] - [FEATURE]

What: Added daily-deduped schedule recovery notices and Pixel owner DMs, persisted scheduled-run skip reasons and recipient delivery-gate outcomes, and exposed a 24-hour ran/skipped/delivered/held summary in Team Intelligence.

Why: Enabled schedules could recover after a silent period without reporting missed fires, while successful run rows did not explain safety-gate skips or held recipients.

Impact: Administrators can see why Pixel did or did not act without weakening quiet hours, internal-only delivery, allowlists, or person-level Active gates. The migration is included but was not applied to production.

Files: `supabase/migrations/20260811033000_space_automation_liveness_observability.sql`, `apps/api/src/modules/spaces/services/space-automation-liveness.service.ts`, `apps/api/src/modules/spaces/services/space-automation-scheduler.service.ts`, `apps/api/src/modules/spaces/services/space-automation-service-08.base.ts`, `apps/api/src/modules/spaces/services/slack-team-signal-delivery.service.ts`, `apps/api/src/modules/slack/services/slack-automation-health.service.ts`, `apps/web/src/features/team-2/components/people/SlackAutomationHealthCard.tsx`, `documentation/features/spaces-automation.md`

## [2026-08-10 21:20] - [FIX]

What: Restored manual Delegation Desk thought capture and removed a stale Home flyout prop left behind by its contract change.

Why: The production frontend build failed because one component imported a missing capture function and another passed a removed prop.

Impact: Vercel can compile the Home flyout contract again, and rough thoughts entered in Delegation Desk persist as unassigned review-mode Holding tank items.

Files: `apps/web/src/features/spaces/services/delegation-desk.service.ts`, `apps/web/src/features/spaces/services/__tests__/delegation-desk.service.test.ts`, `apps/web/src/components/layout/sidebar/SidebarHqFlyouts.tsx`
## [2026-08-10 21:31] - [FEATURE]

What: Added timezone-correct Slack Team daily caps, raised default limits to 40, and added a full send-safe manual preview pipeline with isolated cursors/dedupe, Preview-badged admin proposals, and a server-side no-send guard.

Why: Pixel's cap reset at UTC midnight during the Pacific workday, and render-only dry runs could not exercise or review the real analysis/composition path safely.

Impact: Administrators can run the real Slack Team pipeline without consuming live evidence, compounding Brain memory, counting against the live cap, or delivering a message. Preview proposals remain reviewable/dismissible and are visibly marked.

Files: `apps/api/src/modules/spaces`, `apps/api/src/modules/slack/services`, `apps/web/src/features/spaces`, `apps/web/src/features/team-2`, `documentation/features/spaces-automation.md`, `.docs/plans/agent-follow-up-work.md`.

## [2026-08-10 22:19] - [FEATURE]

What: Extracted Slack signal routing from the team loop, added a shared Pixel Slack voice pack, and composed evidence-grounded proactive briefings with continuity, scoped offers, validation, usage logging, preview rendering, and deterministic fallback.

Why: Pixel's fixed digest copy could not match Viktor's specificity or natural variation, while routing and orchestration had reached the service's planned extraction boundary.

Impact: Preview and eligible internal delivery now use exact source names, channels, quotes, figures, and local-day context without weakening internal-only, confidence, quiet-hour, cap, or evidence safety rails. Model or validation failures preserve the existing deterministic copy.

Files: `packages/agent-policy/src/pixel-slack-voice.ts`, `apps/api/src/modules/spaces/services/slack-team-message-composer.service.ts`, signal routing/delivery services and tests, `documentation/features/spaces-automation.md`.

## [2026-08-10 22:31] - [FEATURE]

What: Added evidence-woven personal-moment composition, an explicit belated variant after 20 hours, and delivery reuse of the validated preview copy.

Why: Personal moments were safe but still sounded templated and discarded their composed proposal at send time.

Impact: Dylan-first personal outreach can naturally reference one or two public details, says “belated” when appropriate, creates no offers, and still falls back deterministically behind the unchanged evidence validator.

Files: `apps/api/src/modules/spaces/services/slack-team-message-composer.service.ts`, `slack-team-personal-moment-propose.ts`, signal routing/delivery services, tests, `documentation/features/spaces-automation.md`.

## [2026-08-10 22:34] - [FEATURE]

What: Added the `slack_open_items` ledger, signal writer, periodic source-thread resolution, and bounded retention.

Why: Evidence fingerprints prevented duplicates but also erased unanswered work from Pixel's memory after the first analysis window.

Impact: Questions, risks, and commitments persist across days, resolve from later Slack replies/reactions, retain their source evidence, and remain bounded to 500 open rows per organization with 14-day resolved/stale cleanup.

Files: `supabase/migrations/20260811054500_slack_open_items.sql`, `slack-open-items.repository.ts`, `slack-open-items.service.ts`, signal router/module wiring, tests, `documentation/features/spaces-automation.md`.

## [2026-08-10 22:38] - [FEATURE]

What: Added staged open-item resurfacing and a recipient continuity pack spanning due open work, newly resolved work, and recent Pixel digests.

Why: Permanent evidence dedupe prevented useful cross-day reminders and made Pixel forget its own prior briefings.

Impact: Open work returns at 8h/24h/72h with compact ages, respects an eight-hour cooldown and four-surface cap, emits a terminal going-quiet note, and mentions resolutions once before retiring them from continuity.

Files: Slack open-item repository/service/tests, signal routing and delivery services, `documentation/features/spaces-automation.md`.

## [2026-08-10 22:40] - [FEATURE]

What: Added the pending-offer ledger and persisted machine-readable composer offers after confirmed Slack delivery.

Why: Pixel's scoped offers were visible prose but had no durable acceptance or fulfillment identity.

Impact: Every delivered offer is linked to its recipient, source Shadow action, Slack thread, deliverable kind, exact scope, and 72-hour expiry window.

Files: `supabase/migrations/20260811055500_slack_pending_offers.sql`, pending-offer repository/service/tests, signal delivery/module wiring, `documentation/features/spaces-automation.md`.

## [2026-08-10 22:42] - [FEATURE]

What: Added exact-thread pending-offer acceptance for ✅/👍 reactions and affirmative replies.

Why: Scoped offers needed a zero-plumbing conversion from Slack intent into durable accepted work.

Impact: Matching offered rows atomically become accepted with their acceptance path recorded; unrelated reactions and replies continue through existing handlers.

Files: pending-offer acceptance service/repository, Slack reaction and thread-enrichment integration, module wiring, `documentation/features/spaces-automation.md`.

## [2026-08-10 22:47] - [FEATURE]

What: Added accepted-offer runtime fulfillment for recap briefs, case studies, and spend breakdowns, with same-thread acknowledgement/delivery and missed-promise reporting.

Why: Accepted Pixel offers needed to become delivered work without human plumbing or silent promise failure.

Impact: Acceptance acknowledges the exact promise, queues only when a persistent consumer is explicitly enabled, runs inline on Vercel, posts evidence-grounded artifacts to the source thread, records delivery references, and reports overdue work.

Files: Slack offer fulfillment service/repository/tests, pending-offer acceptance, automation runtime processor, composer schema, module wiring, docs.

## [2026-08-10 22:54] - [FEATURE]

What: Added configurable Pixel delivery cadence: weekday EOD consolidation, urgent-only interrupts, high-bar weekends, and a Sunday open-ledger check-in.

Why: Five-minute detection should preserve awareness without creating five-minute message behavior.

Impact: Ordinary work stays cooling until the local 17:00–18:00 digest, urgent work can interrupt, weekend output is rare, and Sunday produces one deduped Monday-readiness check-in from the ledger. Existing deterministic gates still run first.

Files: Slack cadence/delivery-policy services and tests, loop/routing/delivery wiring, automation schema/editor defaults, docs.

## [2026-08-10 22:59] - [FEATURE]

What: Added client-label joins for upcoming Google Calendar stakes and Fathom-created follow-up state in Pixel's composer context.

Why: Slack topics lacked the timing and meeting-follow-up context that makes an executive digest actionable.

Impact: Matching topics can mention the next relevant event and current call follow-up state, while unlabeled items perform no cross-context lookup and lookup failures retain the Slack/ledger-only fallback.

Files: Slack context-stakes service/tests, signal delivery/module wiring, docs.

## [2026-08-10 23:28] - [FIX]

What: Disabled Nest in-process timers on Vercel, moved automation scans out of maintenance slots, and moved cron ingress into a standalone function with no Nest/BullMQ imports.

Why: Vercel cron-origin requests initialized the monolith's unreachable Railway-private Redis socket and reset Supabase connections after Pixel's schedule claim; maintenance timers amplified the failure.

Impact: Cron ingress imports no application runtime, performs no database/Redis work, and dispatches the existing awaited execution path as a normal request, with at most one minute of pickup latency. Persistent deployments retain their timer behavior; queue opt-in and delivery safety gates are unchanged.

Files: `apps/api/src/app.module.ts`, `apps/api/vercel.json`, cron runtime policy/config tests, `documentation/features/spaces-automation.md`.
# Changelog - August 10, 2026

## 2026-08-10 09:59 - [FEATURE]

What: Added Home “Suggested next moves” sourced from recent unresolved meeting follow-ups, including source-call navigation plus seven-day snooze and durable dismiss controls.

Why: Surface useful, grounded work recommendations from ROAS call context without inventing tasks or taking actions automatically.

Impact: Full Home new chat can show up to three personalized next moves. Suggestions respect active organization scope and existing user-level Home dismissal storage.

Files: `apps/api/src/modules/home/*`, `apps/web/src/features/home/components/SuggestedNextMoves.tsx`, `apps/web/src/features/home/services/next-moves.service.ts`, `apps/web/src/features/home/config/next-moves-messages.config.ts`, `apps/web/src/components/shell/ShellNewChatGreeting.tsx`, `documentation/features/claude-chatgpt-shell.md`.

## 2026-08-10 10:10 - [FIX]

What: Unified generic Fathom titles with purpose-first canonical names, added deterministic `Next Steps` action fallback when Fathom omits structured actions, made Continue in chat explicitly select and focus the meeting conversation, and replaced capped/primary-fallback Google Agenda loading with the unified all-calendars action.

Why: Meetings were named differently across picker/recording/attachments, transcript-rich calls displayed zero actions, Continue in chat appeared to refresh without selecting the thread, and secondary-calendar events could disappear from both Mine and Team.

Impact: New, re-ingested, and legacy Fathom calls render with one title convention and preserve provider-authored next steps as canonical follow-ups; legacy display correction does not rewrite production rows. Meeting chat transitions without navigation. Mine covers all visible Google calendars, and Team inherits the complete Mine result with observable account errors.

Files: `apps/api/src/modules/meetings/providers/fathom-meeting-source.ts`, `apps/api/src/modules/integrations/fathom/services/fathom-api.service.ts`, `apps/api/src/modules/integrations/services/integrations-calendar-google-agenda.ts`, `apps/web/src/components/global-chat/store/use-global-chat-store.ts`, `apps/web/src/features/home/components/MeetingWorkspaceDialog.tsx`, `apps/web/src/features/home/lib/display-fathom-recording-title.ts`, `apps/web/src/features/home/services/meeting-workspace-api.ts`, related tests, `documentation/features/integration-connections.md`, `documentation/features/meeting-follow-up-slack.md`.

## 2026-08-10 18:32 - [FEATURE]

What: Added Canvas as a configurable Campaign, Program, and Space view backed by a new free-form whiteboard with editable stickies, text, cards, shapes, connectors, pan/zoom, minimap, deletion, and autosave. Removed the temporary Studio workflow alias from Canvas.

Why: Canvas is a general Miro-style creation surface, not the specialized campaign automation workflow. It belongs alongside List, Board, Calendar, and Assets with one persistent board shared across hierarchy entry points.

Impact: Campaigns open their whiteboard directly; Programs select a child campaign through the existing campaign filter; Spaces open the board for their linked campaign and explain when no campaign is linked. Workflow remains independent. The new `campaign_canvases` table uses campaign access policies and stores graph and viewport state.

Files: `apps/web/src/components/canvas/*`, `apps/api/src/modules/canvas/*`, `supabase/migrations/20260810184500_campaign_canvases.sql`, Campaign navigation/page files, Program work-view/workspace files, Space view schema/switcher/router/tab metadata, related tests, `documentation/features/programs.md`, `documentation/frontend-shared-surfaces.md`, `.docs/plans/agent-follow-up-work.md`.

## 2026-08-10 20:08 - [ARCH]

What: Started the production Canvas foundation by adding normalized board items/connectors, board revisions, idempotent transactional operation batches, operation history, viewport operations, and a typed human-client operation queue. Removed the whole-graph Canvas PATCH path and added the Miro/Pixel implementation plan plus capability drift baseline.

Why: Human edits and Pixel edits need one conflict-aware operation contract; whole-document JSON autosave could silently overwrite concurrent work and could not support governed agent writes.

Impact: Canvas edits now target versioned item/connector operations with one revision increment per batch. The database migration, API schema/route, and client compile and pass focused tests. Pixel action exposure, inverse operations/Undo, realtime conflict recovery, and the Miro interaction shell remain active goal work.

Files: `supabase/migrations/20260810195000_canvas_operations_foundation.sql`, `apps/api/src/modules/canvas/*`, `apps/web/src/components/canvas/*`, `.docs/plans/miro-canvas-pixel-implementation-plan.md`, `.docs/plans/canvas-pixel-capability-drift-audit.md`, `documentation/features/programs.md`.

## 2026-08-10 18:33 - [FIX]

What: Removed camera glyphs from Agenda list and calendar presentations while retaining join/watch links, made the shared shell work-area wrapper a vertical-scroll fallback while preserving page-owned scroll regions, and reconciled uniquely matching Fathom recordings that begin up to 35 minutes before a calendar invite.

Why: Video-link icons added noise, long meeting and Space pages were clipped instead of scrollable, and an early-started Campaign Review recording appeared as a separate Fathom row because the fallback allowed only a 10-minute start offset.

Impact: Agenda no longer shows camera icons. Meeting workspaces scroll inside the shared work area, and all six Space reporting dashboards—Campaign, Funnel, Email, Ads, Finance, and Social—now have constrained view-owned vertical scroll regions instead of expanding beyond the Space viewport. A recording like the 10:01 Campaign Review attaches to its unique 10:30 invite while ambiguous overlaps remain separate and reusable Zoom URLs are not treated as meeting identity.

Files: `apps/web/src/features/home/components/AgendaCardEventEntry.tsx`, `apps/web/src/features/home/components/AgendaCalendarPanel.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, Space reporting view roots under `apps/web/src/features/spaces/components/reporting/`, `apps/api/src/modules/integrations/services/integrations-calendar-dedupe.ts`, related tests, `documentation/features/integration-connections.md`, `documentation/features/claude-chatgpt-shell.md`.

## 2026-08-10 18:47 - [FIX]

What: Made pasted-block clearing idempotent when a meeting, Space, or other chat context has no persisted pasted content, with a regression asserting that the no-op clear publishes no Zustand update.

Why: Opening a meeting Space mounted the shared chat composer, whose cleanup persisted an empty pasted-block collection. The store cloned and published its context map even when the key was absent, feeding the mount/cleanup cycle until React raised `Maximum update depth exceeded`.

Impact: Opening meeting and Space chats no longer crashes from recursive empty-composer synchronization. Contexts with real pasted blocks continue to clear normally.

Files: `apps/web/src/features/studio/store/use-chat-store.ts`, `apps/web/src/features/studio/store/use-chat-store.test.ts`.

## 2026-08-10 18:54 - [FIX]

What: Moved recordings to the top of the meeting workspace, separated pre-call agenda from post-call recap and notes, and replaced action cards with an interactive Space-style task table.

Why: Transcript-derived Fathom content was presented as meeting prep, Fathom follow-ups were mislabeled as manually added, and completed follow-ups could not be reopened because the backend preserved their `done` status on uncheck.

Impact: Calendar descriptions remain in Agenda & prep; Fathom summaries and snippets appear after the call; recording access is immediate; action rows show assignee, status, and correct source, open the underlying Space task, and toggle completion in either direction.

Files: `apps/web/src/features/home/components/MeetingWorkspaceDialog.tsx`, `apps/web/src/features/home/components/MeetingPostCallSections.tsx`, `apps/web/src/features/home/components/MeetingActionItemsSection.tsx`, `apps/web/src/features/home/lib/meeting-workspace-display.ts`, `apps/web/src/features/home/services/meeting-workspace-api.ts`, `apps/api/src/modules/meetings/domain/meeting-follow-up-actions.ts`, `apps/api/src/modules/meetings/repositories/meeting-workspace-state.repository.ts`, related tests, `documentation/features/meeting-follow-up-slack.md`.

## 2026-08-10 19:53 - [FEATURE]

What: Unified the Meetings page with the canonical Meetings Space view system. Agenda is the first/default tab and renders the existing live calendar list; the remaining meeting, prep, follow-up, action-item, calendar, log, people, mission, and custom tabs continue through their native Space renderers.

Why: Meetings were split between a live Agenda page and a separate Meetings Space, making the same workflow feel like two products and encouraging duplicate data-loading or UI implementations.

Impact: `/home/meetings` is now one navigation surface backed by the existing Agenda calendar loader and existing Meetings Space records, filters, realtime state, and interaction model. If no Meetings Space exists, the live Agenda remains available.

Files: `apps/web/src/app/(dashboard)/home/meetings/MeetingsUnifiedSurface.tsx`, `apps/web/src/app/(dashboard)/home/meetings/page.tsx`, `apps/web/src/features/spaces/containers/SpaceItemsContainer.tsx`, `apps/web/src/features/spaces/index.ts`, `apps/web/src/features/home/config/home-agenda-messages.config.ts`, related tests, `documentation/features/meeting-follow-up-slack.md`, `documentation/frontend-shared-surfaces.md`.

## 2026-08-10 19:00 - [FEATURE]

What: Put suggested next moves on the normal Home dashboard, reduced the primary HQ rail to Home, Inbox, Meetings, My Task, Delegation Desk, Favorites, Programs, and More, moved Team and Brain into More, and added per-user Program favorites including system Programs such as Clients.

Why: The suggestions were mounted only on the full new-chat empty state, the primary rail exposed the wrong top-level destinations, and Programs had no favorite-state contract despite campaigns and Spaces supporting favorites.

Impact: Suggestions now appear on local Home when the API returns eligible meeting follow-ups. Programs remains hover-expandable, Favorites shows favorited Programs alongside campaigns and Spaces, and the Clients menu can add or remove the Program from Favorites.

Files: `apps/web/src/app/(dashboard)/home/home-dashboard-content.tsx`, `apps/web/src/components/shell/ShellNewChatGreeting.tsx`, `apps/web/src/components/layout/sidebar/`, `apps/web/src/lib/programs/`, `apps/api/src/modules/programs/`, `supabase/migrations/20260810130000_program_user_state.sql`, related tests, `documentation/features/programs.md`.

## 2026-08-10 19:50 - [FIX]

What: Restored the previous Team and Brain menus as nested hover flyouts from their rows inside More, including their original header actions.

Why: Moving Team and Brain out of the primary rail had reduced them to plain links, so hovering the More options no longer exposed the menus users previously relied on.

Impact: Hovering Team or Brain inside More now opens the same detailed menu to the right; clicking the row still navigates normally. Projects and account retain their existing nested flyouts.

Files: `apps/web/src/components/layout/sidebar/SidebarHqMoreFlyoutBody.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqMoreTeamBrainFlyouts.tsx`, related test, `documentation/features/programs.md`.

## 2026-08-10 20:08 - [FEATURE]

What: Added a Simple-by-default menu style that combines the ROAS wordmark, chat search and filters, New chat, primary navigation, actual favorites, Programs, More, and chat history. Added a collapsed R icon rail that previews the full sidebar on hover and pins it open on click. Kept the existing movable rail as Advanced under Appearance, pluralized My Tasks, and applied the Program favorite migration to the verified ROAS database.

Why: Navigation and chat history previously felt like separate sidebars, favorites were represented as a destination instead of the items themselves, and Clients could not persist as a favorite because its backing table was absent from the live database.

Impact: New and existing users default to one ChatGPT-style sidebar while retaining Advanced as an opt-in. Favorited Programs such as Clients render alongside favorite campaigns and Spaces, chat controls remain connected to the canonical history state, and collapsing the menu preserves fast hover access without shifting the work area.

Files: `apps/web/src/components/layout/sidebar/SidebarSimpleSection.tsx`, `apps/web/src/components/shell/ShellChatMenu.tsx`, `apps/web/src/components/shell/ShellChatMenuFilterControls.tsx`, `apps/web/src/components/conversations/ChatHistoryFilterMenu.tsx`, `apps/web/src/components/shell/use-shell-menu-dock.ts`, `apps/web/src/features/settings/components/settings-content/AppearancePageContent.tsx`, related tests, `apps/api/src/modules/programs/`, `supabase/migrations/20260810130000_program_user_state.sql`, `documentation/features/claude-chatgpt-shell.md`, `documentation/features/programs.md`.

## 2026-08-10 20:20 - [FEATURE]

What: Rebuilt Simple mode as a three-surface ChatGPT-style shell. The left menu now owns global search, New chat, navigation, expandable Favorites, hover-only Programs with the canonical Programs tree, Recents chat controls/history, a persisted drag width, and the account control at the bottom. Removed the duplicate history selector from the chat drawer. Moved AI-chat and browser navigation into the left menu and moved work-surface controls into the work card.

Why: The global bar and duplicate history column made navigation, chat, and artifacts feel like stacked chrome instead of one left-to-right workspace. Programs also lost its established tree behavior by expanding inline.

Impact: Simple mode presents menu → chat → work/artifact as distinct adjacent surfaces. Opening chat closes the work card by default; opening an artifact keeps chat visible and reuses the right surface, whose existing expand control remains available. Advanced keeps its previous top bar, movable rail, and independent history column.

Files: `apps/web/src/components/layout/Sidebar.tsx`, `apps/web/src/components/layout/sidebar/SidebarSimpleSection.tsx`, `apps/web/src/components/layout/sidebar/SidebarSimpleProgramsMenu.tsx`, `apps/web/src/components/layout/sidebar/SidebarSimpleResizeHandle.tsx`, `apps/web/src/components/shell/ShellChatDrawer.tsx`, `apps/web/src/components/shell/ShellChatMenu.tsx`, `apps/web/src/components/shell/ShellTopBar.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/ShellWorkCardControls.tsx`, `apps/web/src/components/conversations/SpaceConversationsHeader.tsx`, `apps/web/src/components/conversations/SpaceConversationsList.tsx`, related tests, `documentation/features/claude-chatgpt-shell.md`, `documentation/features/programs.md`.

## 2026-08-10 20:14 - [FIX]

What: Restored Pixel's scheduled Slack observation loop, made BullMQ automation routing and in-process schedule polling explicit persistent-host opt-ins, split cron parsing from next-fire persistence failures, and added automatic repair for enabled schedules with a null next-fire timestamp.

Why: Vercel was enqueueing scheduled work to a Railway-private Redis queue with no deployed automation consumer, while the scheduler's recovery path could erase a valid next-fire timestamp when a transient database write failed.

Impact: Pixel completed a fresh production run with 469 observations after the outage. Vercel now executes scheduled automations inline through the authenticated cron endpoint; transient persistence failures remain due for retry; valid enabled schedules self-heal after a null next-fire incident.

Files: `apps/api/src/cron.service.ts`, `apps/api/src/cron.service.test.ts`, `apps/api/src/modules/spaces/services/space-automation-service-01.base.ts`, `apps/api/src/modules/spaces/services/space-automation-service-08.base.ts`, `apps/api/src/modules/spaces/services/space-automation-scheduler.service.ts`, `apps/api/src/modules/spaces/repositories/space-automations.repository.ts`, related tests, `documentation/features/spaces-automation.md`.

## 2026-08-10 20:21 - [FEATURE]

What: Rebuilt Campaign Canvas around normalized, revisioned item and connector operations; added conflict recovery, inverse-operation Undo, realtime refresh, frames and resizing, Miro-style Select/Hand/creation tools, selection duplicate/lock/delete controls, and governed Pixel Canvas read/write actions.

Why: The prior Canvas looked like a sparse workflow editor, persisted a whole serialized graph, and Pixel's strategy-node action wrote to an unrelated Workflow table, so AI output could not appear as editable Canvas content.

Impact: Campaign, Program, and Space Canvas views now share one transactional mutation model. Human edits and Pixel batches produce the same editable objects, concurrent revisions do not silently overwrite one another, and the latest batch can be undone atomically.

Files: `supabase/migrations/20260810195000_canvas_operations_foundation.sql`, `apps/api/src/modules/canvas/`, `apps/web/src/components/canvas/`, `apps/agent-api/src/modules/artifacts/services/artifact-strategy.service.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-strategy.repository.ts`, agent action schema/registry/policy/docs files, `packages/agent-policy/src/`, related tests, `documentation/features/programs.md`, `.docs/plans/miro-canvas-pixel-implementation-plan.md`, `.docs/plans/canvas-pixel-capability-drift-audit.md`.

## 2026-08-10 20:33 - [ARCH]

What: Split Canvas revision/Undo and realtime orchestration into focused hooks, embedded the real Pixel chat panel with live board and selection context, added agent-batch affected bounds with viewport focus, and enforced invoking-user Campaign/Program access plus cross-board semantic validation inside the service-role operation path.

Why: The main Canvas hook exceeded the architecture limit, the Pixel button left Canvas without reliable scope, and service-role or malformed operation batches needed independent database authorization and atomic reference validation.

Impact: The main hook is within the 300 LOC limit; prompts can build the open Canvas without leaving it; Pixel-created regions focus automatically; and neither agents nor clients can use Canvas operations to bypass effective access or link objects across boards.

Files: `apps/web/src/components/canvas/hooks/`, `apps/web/src/components/canvas/components/CanvasPixelPanel.tsx`, `apps/web/src/components/canvas/WhiteboardCanvas.tsx`, `apps/agent-api/src/modules/artifacts/`, `supabase/migrations/20260810195000_canvas_operations_foundation.sql`, related tests, `documentation/features/programs.md`.

## 2026-08-10 20:39 - [FEATURE]

What: Added Canvas multi-selection alignment and distribution commands, keyboard tool shortcuts, duplicate and Undo shortcuts, and a focused selection-action hook with behavior tests.

Why: A Miro-like whiteboard needs efficient spatial editing for groups of objects rather than forcing users to position every item individually.

Impact: Selected objects can align horizontally or vertically and distribute evenly across either axis as one atomic operation batch. V/H/N/T/F/C select common tools, Cmd/Ctrl+D duplicates, and Cmd/Ctrl+Z undoes the latest batch.

Files: `apps/web/src/components/canvas/hooks/useCanvasSelectionActions.ts`, `apps/web/src/components/canvas/hooks/useCampaignWhiteboard.ts`, `apps/web/src/components/canvas/components/WhiteboardSelectionToolbar.tsx`, `apps/web/src/components/canvas/WhiteboardCanvas.tsx`, related tests, `documentation/features/programs.md`.

## 2026-08-10 20:54 - [STYLE]

What: Made the Simple sidebar own the full-height left edge, consolidated its wordmark, Search, collapse, Back, and Forward controls into one header row, removed the standalone Search row, and forced the Programs hover panel to open to the sidebar's right.

Why: The page header was incorrectly spanning above the menu, the controls consumed a second row, and an old Advanced dock preference could make Programs open across the Simple menu.

Impact: Simple mode now reads as a distinct left column beside the page, with compact ChatGPT-style header controls and a Programs panel that preserves the menu while opening alongside it.

Files: `apps/web/src/components/shell/ShellMenuDockLayout.tsx`, `apps/web/src/components/layout/sidebar/SidebarSimpleSection.tsx`, `apps/web/src/components/layout/sidebar/SidebarSimpleProgramsMenu.tsx`, `apps/web/src/components/layout/sidebar/HubDockFlyout.tsx`, related tests, `documentation/features/claude-chatgpt-shell.md`.

## 2026-08-10 21:02 - [FIX]

What: Removed the Simple menu's collapsed hover-preview overlay, changed compact rail controls to explicit actions, and made the collapsed R swap to an open-drawer glyph on hover.

Why: Hovering the compact rail unexpectedly opened a full second menu; expansion should be an intentional click.

Impact: The compact rail remains stable during pointer movement. Clicking the R, Favorites, or Chats expands the sidebar, while Search opens search directly.

Files: `apps/web/src/components/layout/sidebar/SidebarSimpleSection.tsx`, `apps/web/src/components/layout/sidebar/SidebarHqHubLogoButton.tsx`, related tests, `documentation/features/claude-chatgpt-shell.md`.

## 2026-08-10 21:06 - [FIX]

What: Consolidated Simple mode's breadcrumb, Open in, Workspace/Portal switcher, and page-panel control into the single main top header, removed the duplicate work-card controls row, and reduced the expanded ROAS wordmark from 32px to 20px tall.

Why: Simple mode split persistent page chrome across two stacked headers, leaving the breadcrumb detached from its right-side workspace controls.

Impact: The content area now has one header with the breadcrumb on the left and all workspace/right-panel controls visible on the right at all times.

Files: `apps/web/src/components/shell/ShellTopBar.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/ShellWorkCardControls.tsx`, `apps/web/src/components/layout/sidebar/SidebarWordmark.tsx`, related tests, `documentation/features/claude-chatgpt-shell.md`.

## 2026-08-10 21:12 - [FIX]

What: Changed the Simple sidebar's More flyout from hover-open behavior to an explicit click toggle.

Why: The earlier click-only request referred specifically to More, whose trigger still opened on pointer hover.

Impact: Hovering More has no effect; clicking More opens it, and clicking it again closes it.

Files: `apps/web/src/components/layout/sidebar/SidebarSimpleSection.tsx`, its focused test, and `documentation/features/claude-chatgpt-shell.md`.

## 2026-08-10 21:24 - [STYLE]

What: Moved the Simple breadcrumb and workspace controls into the right work card, removed the global bar above chat, added compact Recents edge gutters, and removed empty filter spacing before the first conversation.

Why: The stretched header incorrectly coupled chat and work-card chrome, while the Recents list touched the sidebar edges and reserved excess blank space.

Impact: Chat now reaches the top of its column; the right card owns and hides its header with the card; Recents rows have consistent side padding and begin directly below their compact toolbar.

Files: `apps/web/src/components/shell/ShellMenuDockLayout.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/ShellChatMenuActiveFilters.tsx`, `apps/web/src/components/conversations/SpaceConversationsHeader.tsx`, `apps/web/src/components/conversations/SpaceConversationsList.tsx`, related tests, `documentation/features/claude-chatgpt-shell.md`.

## 2026-08-10 21:31 - [FIX]

What: Made ShellChatMenu's active-conversation store hook unconditional, replaced the overlapping compact Recents search animation with a full-width search row below the toolbar, and restored the required shared class-composition import for the compact list spacing.

Why: Short-circuiting the store hook after a drawer conversation ID changed React's hook order when New chat cleared that ID, while the fixed-width animated search shared insufficient space with toolbar actions.

Impact: Home and New chat render without the class-helper or hook-order runtime failures, and Recents search opens in a dedicated non-overlapping row with clear Search and Close controls.

Files: `apps/web/src/components/shell/ShellChatMenu.tsx`, `apps/web/src/components/conversations/SpaceConversationsHeader.tsx`, related tests.

## 2026-08-10 21:39 - [FIX]

What: Replaced browser-native right-click behavior on Simple favorite rows with an in-app action menu for copying links, opening new tabs, and removing Program, Campaign, or Space favorites.

Why: Favorite rows were plain links without an application context-menu handler, so Chrome displayed system link actions instead of ROAS actions.

Impact: Right-clicking a favorite now opens ROAS-owned actions and favorite removal uses the existing persisted entity mutation.

Files: `apps/web/src/components/layout/sidebar/SidebarFavoritesFlyout.tsx`, `apps/web/src/components/layout/sidebar/SidebarSimpleSection.tsx`.

## 2026-08-10 21:44 - [STYLE]

What: Tightened the Simple sidebar's navigation, Favorites, Programs, and More rows using the existing tokenized compact spacing utilities.

Why: The menu items had excessive vertical whitespace and read as separate blocks instead of one compact navigation stack.

Impact: Primary and favorite menu items sit substantially closer together while retaining their full-width click targets.

Files: `apps/web/src/components/layout/sidebar/SidebarSimpleSection.tsx`, `apps/web/src/components/layout/sidebar/SidebarSimpleProgramsMenu.tsx`, `apps/web/src/components/layout/sidebar/SidebarFavoritesFlyout.tsx`.

## 2026-08-10 21:49 - [FEATURE]

What: Added an independent Recents chevron that collapses and restores the conversation list, and removed the divider above Recents.

Why: Recents needed to be optionally compact without collapsing the entire menu, and the divider made it feel disconnected from the navigation stack.

Impact: Users can hide chat history while keeping the Simple sidebar open, with a cleaner continuous menu surface.

Files: `apps/web/src/components/layout/sidebar/SidebarSimpleRecents.tsx`, `apps/web/src/components/layout/sidebar/SidebarSimpleSection.tsx`, `apps/web/src/components/shell/ShellChatMenu.tsx`, related tests.

## 2026-08-10 21:18 - [FIX]

What: Corrected the Canvas operation migration's validation placement, transaction-tested the ordered Canvas migrations, and applied both the base Canvas schema and revisioned operation foundation to the canonical Supabase database.

Why: The first dry run exposed both an undeployed base dependency and batch validation that had been placed inside the realtime-publication block, where operation parameters are unavailable.

Impact: The production schema ledger now contains migrations `20260810184500` and `20260810195000`; Canvas boards, normalized items, operation history, and the `apply_canvas_operations` RPC are present. Local browser verification is separately limited by mismatched campaign data routing and missing local Redis, not by the Canvas database schema.

Files: `supabase/migrations/20260810184500_campaign_canvases.sql`, `supabase/migrations/20260810195000_canvas_operations_foundation.sql`.

## 2026-08-10 21:17 - [FIX]

What: Bound embedded Pixel Canvas chats to the open campaign as an explicit chat scope, repaired the shared conversation list's missing `cn` runtime import, and completed authenticated human Canvas create, edit, persistence, and Undo verification against the canonical database.

Why: System context described the Canvas but the chat session itself was created with `campaign_id=null`, which prevented the governed Canvas actions from resolving campaign scope. A separate missing import crashed the shared sidebar during the first live verification pass.

Impact: Pixel Canvas requests now carry the exact open campaign ID through conversation creation and streaming. Human-created objects persist as normalized Canvas items and Undo atomically restores the prior content. Focused Canvas and AgentChatPanel tests plus web typecheck pass.

Files: `apps/web/src/components/canvas/components/CanvasPixelPanel.tsx`, `apps/web/src/components/canvas/components/CanvasPixelPanel.test.tsx`, `apps/web/src/features/team/components/AgentChatPanel.tsx`, `apps/web/src/components/conversations/SpaceConversationsList.tsx`.

## 2026-08-10 21:21 - [FEATURE]

What: Added inverse-operation Redo, live viewport context for embedded Pixel, and a native Campaign resource library that places funnels, email sequences, ads, presentations, offers, and avatars as linked editable Canvas cards.

Why: The versioned RPC already produced invertible Undo operations but the client discarded the redo handle; Pixel lacked the visible pan/zoom region; and human users could create only generic cards despite the normalized model supporting resource references.

Impact: Canvas now preserves a Miro-style Undo/Redo loop, Pixel can arrange generated content inside the area the user is viewing, and campaign artifacts can be mapped visually without copying or detaching their source records. Canvas tests and focused lint pass.

Files: `apps/web/src/components/canvas/WhiteboardCanvas.tsx`, `apps/web/src/components/canvas/components/CanvasResourcePicker.tsx`, `apps/web/src/components/canvas/components/CanvasPixelPanel.tsx`, `apps/web/src/components/canvas/components/WhiteboardNode.tsx`, `apps/web/src/components/canvas/components/WhiteboardToolbar.tsx`, `apps/web/src/components/canvas/hooks/useCampaignWhiteboard.ts`, `apps/web/src/components/canvas/hooks/useCanvasOperationCommit.ts`, related tests, `documentation/features/programs.md`.

## 2026-08-10 21:12 - [STYLE]

What: Replaced the Home-only oversized new-chat composer treatment with the standard shared chat composer and quick-start row, moved Suggested next moves directly beneath it as a compact list, and removed the template fan and skill-promotion strip from the empty-chat page.

Why: New Chat should behave and read like the normal conversation experience instead of a separate dashboard or creation wizard.

Impact: Users now get the same input controls and placeholder as established chats, with grounded meeting suggestions immediately below; the Home dashboard no longer duplicates those suggestions above Agenda.

Files: `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/shell/ShellNewChatGreeting.tsx`, `apps/web/src/features/home/components/SuggestedNextMoves.tsx`, `apps/web/src/features/home/components/cards/ChatComposerCard.tsx`, `apps/web/src/app/(dashboard)/home/home-dashboard-content.tsx`, related tests, `documentation/features/claude-chatgpt-shell.md`.

## 2026-08-10 21:22 - [FEATURE]

What: Made full Home chats enter the focused conversation workspace with an automatically expanded Outputs/Sources/Tasks rail; automatically opened newly generated final outputs in the existing right-side artifact viewer/editor; moved the main-screen agent picker into the composer `+` menu; and reorganized the secondary composer row as Choose Space, Plugins, and the existing quick actions. Also moved the Recents chevron to the right, made it hover/focus-only, and muted the Recents label.

Why: The chat flow should behave like a focused ChatGPT workspace while retaining ROAS campaign/Space context and the platform's existing artifact editing tools.

Impact: A first message transitions cleanly into chat, campaign context is selectable before sending, outputs and sources are immediately visible, generated images/documents/artifacts open in their canonical editor, and the sidebar header is visually quieter.

Files: `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/shell/ShellNewChatGreeting.tsx`, `apps/web/src/components/shell/ShellRightPanel.tsx`, `apps/web/src/components/layout/sidebar/SidebarSimpleRecents.tsx`, `apps/web/src/components/shell/ShellChatMenu.tsx`, `apps/web/src/components/conversations/SpaceConversationsHeader.tsx`, `apps/web/src/components/conversations/SpaceConversationsList.tsx`, `apps/web/src/features/studio/components/ChatInput*`, `apps/web/src/features/studio/components/message-bubble/FinalOutputCards.tsx`, `apps/web/src/features/studio/components/message-bubble/MessageBubbleOrderedBlocks.tsx`, `apps/web/src/features/spaces/components/chat/SpaceVibeyChatPanel.tsx`, related tests and documentation.

## 2026-08-10 21:59 - [REFACTOR]

What: Added one shared hierarchy view strip and replaced the Campaign pill navigation and Program button navigation with that Space-style top-bar contract. Campaign and Program retain their existing view state, URL synchronization, visibility settings, and level-specific content.

Why: Space, Campaign, and Program exposed the same core work concepts through three unrelated navigation treatments, which made the hierarchy feel inconsistent and encouraged further duplicated view UI.

Impact: Campaign and Program views now use the same full-width icon tabs, active underline, horizontal overflow, and right-side settings placement as Spaces. Shared navigation UI is exported from the work-views domain and covered by focused tests.

Files: `apps/web/src/components/work-views/HierarchyViewBar.tsx`, `apps/web/src/components/work-views/HierarchyViewBar.test.tsx`, `apps/web/src/components/work-views/index.ts`, `apps/web/src/app/(dashboard)/campaigns/[id]/page.tsx`, `apps/web/src/app/(dashboard)/campaigns/[id]/_components/CampaignHeader.tsx`, `apps/web/src/app/(dashboard)/campaigns/[id]/_lib/campaign-nav-tabs.ts`, `apps/web/src/app/(dashboard)/programs/[id]/_components/ProgramWorkspace.tsx`, `documentation/features/programs.md`.

## 2026-08-10 22:01 - [FEATURE]

What: Replaced the separate Home dashboard destination with New chat, routed Simple-sidebar history directly into full conversations, removed the full-chat close action, added conversation-title breadcrumbs, and rebuilt the empty composer footer as an inset shelf with searchable Campaign/Space selection, integration plugins, wrapped quick actions, and clickable suggested prompts. The Simple sidebar now has a full-width account footer and the requested bare Recents chevron states.

Why: Chat is the product's primary workspace and needed one consistent entry, navigation, context, output, and artifact-opening model instead of dashboard and drawer variants.

Impact: Login/New chat opens a clean standard composer; history rows load as focused chats; Outputs/Sources/Tasks open alongside full chats; related artifacts use the existing right-side viewer; the composer controls no longer overflow; and suggested moves fill the input for review.

Files: `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/layout/AvatarDropdown.tsx`, `apps/web/src/components/layout/sidebar/SidebarSimpleRecents.tsx`, `apps/web/src/components/layout/sidebar/SidebarSimpleSection.tsx`, `apps/web/src/components/shell/ShellChatMenu.tsx`, `apps/web/src/components/shell/ShellEmptyChatQuickStartPills.tsx`, `apps/web/src/components/shell/ShellNewChatGreeting.tsx`, `apps/web/src/components/shell/ShellTopBar.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/use-shell-conversation-auto-titles.ts`, `apps/web/src/features/home/components/SuggestedNextMoves.tsx`, `apps/web/src/features/studio/components/ChatInput*`, related tests, `documentation/features/claude-chatgpt-shell.md`.

## 2026-08-10 22:01 - [FIX]

What: Restored the shared `min-h-0` constrained-flex ownership chain for shell page bodies and the Simple Recents region, and added the missing application-role grants for `program_user_state`.

Why: Unconstrained intermediate flex parents clipped Inbox, page, and chat-history overflow; Program favorite RLS policies existed but the table itself denied authenticated/service-role access.

Impact: Inbox and other shell pages can own vertical scrolling, Recents scrolls independently above the pinned account footer, and Program favorite mutations now have the required privileges on the verified canonical ROAS database. Both authenticated and service-role grants were verified after applying the repair.

Files: `apps/web/src/features/home/components/HomeShell.tsx`, `apps/web/src/components/layout/sidebar/SidebarSimpleSection.tsx`, `supabase/migrations/20260810220000_program_user_state_grants.sql`, related tests, `documentation/features/programs.md`.

## 2026-08-10 23:00 - [FIX]

What: Corrected shell route classification so only `/home` owns New Chat, forced non-collapsible full conversations to remain visible regardless of stale work-area preferences, and kept desktop artifacts in a constrained right-side column beside the active conversation.

Why: Prefix-matching every `/home/*` route replaced Inbox, Meetings, and My Tasks with the New Chat surface; persisted collapsed state could leave `/home?chat=starting` blank; and opening a generated image replaced chat with the full artifact editor instead of creating the intended three-pane workspace.

Impact: Nested Home tools render their real pages, first-message routing cannot inherit a hidden work card, and chat artifacts now open through the persistent left-menu / conversation / artifact flow. The current workspace frontend is running on port 3000 against the current local API on port 3001; focused shell, composer, suggestion, artifact, meeting, lint, and type checks pass.

Files: `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/ShellWorkspace.test.tsx`, `apps/web/src/components/shell/shell-route-policy.ts`, `apps/web/src/components/shell/shell-route-policy.test.ts`, `apps/web/src/components/layout/sidebar/SidebarSimpleRecents.tsx`, `apps/web/src/components/layout/sidebar/SidebarSimpleRecents.test.tsx`, `documentation/features/claude-chatgpt-shell.md`.
