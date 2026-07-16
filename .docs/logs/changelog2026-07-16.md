# Changelog - July 16, 2026

## [2026-07-16 11:50] - [FIX]

What: Redeployed Railway mission-worker + queue-worker and Vercel `roas-api`/`roas-web` (`6ac5af77`/`c463f69b`). Fixed plan save (`ad_artifact`/`funnel_artifact` enum). Removed broken Vercel `SUPABASE_DIRECT_DB_URL` that caused plan-create 503; confirmed plan save 201 and mission pending approval.

Why: Worker was not claiming outbox; playbook plans failed API validation then native-TX 503.

Impact: Dispatch LISTEN live; Webinar Fulfillment mission can be approved in UI. Local `RAILWAY_TOKEN` still Unauthorized for CLI-only.

Files: mission plan DTO/execute normalize, Vercel env, deploys

## [2026-07-16 11:48] - [FIX]

What: Seed missing `integrations_available` rows for Google Calendar, Google Sheets, HubSpot, Notion, and Salesforce.
Why: Composio connect got past auth-config creation, then failed FK `user_integrations_integration_id_fkey` because toolkit configs existed without catalog parents.
Impact: Google Calendar Connect can insert the pending `user_integrations` row and continue OAuth.
Files: `supabase/migrations/20260716184000_seed_missing_composio_integrations_available.sql`

## [2026-07-16 11:45] - [FIX]

What: Recreate ROAS Composio managed OAuth auth configs and update `project_composio_toolkit_config` IDs (Google Calendar/Drive/Sheets plus other Composio OAuth apps). Catch Composio initiate failures so connect returns a clear error instead of a raw 500.
Why: ROAS Composio project had zero auth configs; DB still pointed at Vibey leftover IDs, so Google Calendar Connect 404'd into "Internal server error".
Impact: Google Calendar Connect should open the OAuth popup again. Same fix covers Drive, Sheets, Outlook, HubSpot, Notion, GitHub, LinkedIn, Instagram, YouTube, Zoom, Salesforce, Airtable. ElevenLabs still needs API-key auth config separately.
Files: `supabase/migrations/20260716183000_roas_composio_google_auth_configs.sql`, `apps/api/src/modules/integrations/services/integrations-composio.service.ts`

## [2026-07-16 11:38] - [FEATURE]

What: Home dashboard reorder mode now supports per-card width — half (1 column) or full (span both columns). Toggle appears on each card while Reorder is active; sizes persist in `vibey-home-layout`.
Why: Users wanted to resize cards when customizing layout, not only drag-reorder.
Impact: Open Reorder → hover a card → pick half/full. Full-width cards stretch across the dashboard grid on desktop; mobile stays single column.
Files: `home-cards.ts`, `home-cards.config.ts`, `use-home-layout.ts`, `HomeSortableCardsGrid.tsx`, `HomeCardsGrid.tsx`, `globals.css`, `home-cards.config.test.ts`

## [2026-07-16 11:35] - [FIX]

What: Home dashboard Mission Approval queue and My tasks rows show the full title in a hover tooltip when the label is truncated.
Why: Long titles were cut off with ellipsis and had no way to read the full text without opening the item.
Impact: Hover any truncated queue/task title to see the full name; click still opens the item.
Files: `ApprovalQueueCard.tsx`, `MyTasksCard.tsx`, `.docs/logs/changelog2026-07-16.md`

## [2026-07-16 11:32] - [FIX]

What: Home minimize now also hides the recommendation carousel (sliding "For you" cards), so collapsed Home starts at Your dashboard with only the tiny Chat expand control.
Why: Minimize left the carousel visible; day-to-day use wanted that block tucked away too.
Impact: Collapsed = Chat chip + dashboard cards; Expand restores greeting, composer, templates, and carousel.
Files: `home-dashboard-content.tsx`, `.docs/logs/changelog2026-07-16.md`

## [2026-07-16 11:30] - [FIX]

What: Clicking task artifact cards in Space/global Vibey chat now opens `TaskDetailModal` (via the existing `?space=&item=` deep link + modal opener). Cross-space opens switch the active Space first.
Why: Cards dispatched `vibey-open-artifact` with `artifactType: 'task'`, but the Spaces listener only handled mapped view types (funnels/docs/…) and silently no-op'd tasks.
Impact: Task cards in chat open the task popup again; docs path unchanged. Preference for space switch uses the same URL deep-link as list opens.
Files: `apps/web/src/features/spaces/containers/SpaceItemsContainer.tsx`, `.docs/logs/changelog2026-07-16.md`

## [2026-07-16 11:28] - [FEATURE]

What: Home dashboard chat hero (greeting + composer + template fan) can collapse to a tiny "Chat" chevron so the page starts at the recommendation carousel / dashboard cards. Preference persists in localStorage.
Why: Day-to-day use doesn't need the hero UI dominating the viewport; users still need a one-click way to expand chat when they want it.
Impact: Click Minimize under the templates to hide the top block; click Chat at the top to bring it back. Collapsed state also dims the hero glow/grid and tightens top padding.
Files: `home-dashboard-content.tsx`, `HomeDashboardV4Shell.tsx`, `use-home-chat-hero-collapsed.ts`, `apps/web/src/app/globals.css`, `.docs/logs/changelog2026-07-16.md`

## [2026-07-16 11:25] - [FIX]

What: Accept playbook output contracts `ad_artifact`, `funnel_artifact`, and `media_artifact` on mission plan create + execute normalize.

Why: Webinar Fulfillment plan expansion succeeded but `POST /internal/missions/plan` 400'd on artifact_kind enum — missions failed with "Had trouble saving the plan".

Impact: Playbook missions with ads/funnel contracts can save plans after roas-api + mission-worker redeploy.

Files: `mission-plan.dto.ts`, `mission-deliverables.repository.ts`, `mission-execute-phase.service.ts`

## [2026-07-16 11:20] - [FIX]

What: Pushed `6ac5af77` and redeployed production — Railway `roas-platform` (mission-worker) + `queue-worker` SUCCESS; Vercel `roas-api` + `roas-web` READY on that commit. Confirmed mission-worker `LISTEN mission_outbox_new` on ROAS DB.

Why: Worker was not claiming outbox; API/web needed the outbox + description fixes live.

Impact: Mission dispatch path is live again. Local `RAILWAY_TOKEN` in secrets remains Unauthorized for CLI logs (GitHub-connected deploys still work).

Files: deploy `6ac5af77`

## [2026-07-16 11:10] - [FIX]

What: Fixed personal-user mission create never enqueueing `mission.plan.requested` (RLS blocked `mission_outbox` writes; Vercel API had no `SUPABASE_DIRECT_DB_URL`). Outbox enqueue now uses service role; added personal outbox write RLS; mission description is expandable; list status label aligned to Queue. Manually expanded both stuck Webinar Fulfillment missions to `pending_approval` with plans/subtasks. Added `SUPABASE_DIRECT_DB_URL` on Vercel `roas-api`.

Why: Deleting a Space does not delete campaign missions; Playbook create succeeded for the mission row then failed to enqueue planning, so missions sat in Queue with empty execution plans. Description used `md:truncate` with only a tooltip.

Impact: Refresh Missions — both Webinar Fulfillment rows should show pending approval with an Execution Plan. Approve to continue. **Agent execution still needs mission-worker claiming outbox** (worker is not connected to ROAS DB right now; Railway token in secrets is unauthorized). Deploy `roas-api` for service-role outbox path; RLS already live so user-JWT enqueue works after deploy of web description UI optional.

Files: `20260716183000_mission_outbox_personal_write_rls.sql`, `mission-outbox.service.ts`, `MissionMetaRow.tsx`, `mission-list-config.ts`, `missions.native-pg.test.ts`

## [2026-07-16 11:03] - [FIX]

What: Sanitize Fathom call summaries before they land in (and when shown in) Space task descriptions. Unwraps long timestamp links to plain takeaway text, repairs mid-URL newlines, and strips `##` headers so the plain-text description UI is readable.
Why: Fathom's `markdown_formatted` wraps every takeaway in a long `fathom.video` link and often breaks URLs across lines; we stored that raw and rendered it as plain text, so meetings looked like broken markdown.
Impact: Existing Fathom meeting descriptions clean up on view; new webhook-created meetings store the cleaned text. Recording URL still lives on `custom_data.recording_url`.
Files: `packages/api-shared/src/utils/sanitize-fathom-summary-markdown.ts`, `packages/api-shared/package.json`, `apps/api/.../space-automation-service-19.base.ts`, `apps/web/.../TaskDescription.tsx`, `.docs/logs/changelog2026-07-16.md`

## [2026-07-16 10:50] - [ARCH]

What: Deployed `e9983486` — Railway `roas-platform` (mission-worker) + `queue-worker` SUCCESS. Synced Nate’s runtime skills from DB (`/api/agents/nate/sync` → 57 files healthy).

Why: Playbook Phase B/C expansion and seeded skills needed live mission-worker + agent workspace materialization.

Impact: New Webinar Fulfillment missions expand through Gates 1–3. Nate has updated `roas-market-research`. Hire copywriter/designer/ads_manager when those roles are needed (template skills already in `skill_library`).

Files: push `e9983486`, Fly runtime sync for Nate

## [2026-07-16 10:45] - [FEATURE]

What: Seeded Agency Ops Phase B/C skills from the packaged zip into agent templates + `skill_library` / assignments, and wired Pre-B → Copy Package → Gate 2 → Phase C → Gate 3 → deck build into `webinar-fulfillment`.

Why: Spine was live; production skills needed owners, DB seed, and playbook step keys so missions invoke real capabilities.

Impact: New webinar missions expand through research/copy/creative with Gates 1–3. **Blocked:** `roas-webinar-emails` missing (Copy Package section 2). Gate 2 surgical re-run is encoded in gate ecology only (no auto fan-out yet). Redeploy mission-worker for playbook; agents need skill sync / re-hire to pick up new skills.

Files: `docker/agents/templates/{ads_manager,copywriter,designer,strategist}/skills/*`, `20260716120000_webinar_pipeline_skills.sql`, `generate-webinar-pipeline-skills-migration.ts`, `seed-webinar-pipeline-skills.ts`, `webinar-fulfillment.playbook.ts`, helpers + tests, web playbook description

## [2026-07-16 10:40] - [FIX]

What: Truncated space list/table task names now show the full title in a hover tooltip (wide Tooltip on the name cell).
Why: Long task and subtask names were cut off with ellipsis and had no way to read the full text without widening the column.
Impact: Hovering a truncated Name cell in Spaces list/table (and other views using the same TextCell path) reveals the full task name.
Files: `apps/web/src/features/spaces/components/cells/TextCell.tsx`, `.docs/logs/changelog2026-07-16.md`

## [2026-07-16 10:27] - [FIX]

What: Template-seeded Docs now write/backfill `doc_body` (cards were empty because instantiate only stored `custom_data.body`). Agency Client (Webinar) create opens Vibey chat with kickoff guidance and the Start Playbook modal; Missions empty state CTA points at Webinar Fulfillment.

Why: First-run after instantiate looked blank and unclear — Docs had no preview and Missions empty state never explained Playbook.

Impact: Refresh Docs on existing Agency Client (Webinar) Spaces to see content; new instantiates get chat + playbook kickoff. Deploy web for UI; playbook expansion still needs mission-worker.

Files: `20260716104000_instantiate_space_template_doc_body.sql`, `UseTemplateConfirmDialog.tsx`, `MissionsViewEmptyState.tsx`, `SpaceItemsContainer.tsx`, `MissionsView.tsx`

## [2026-07-16 10:13] - [FEATURE]

What: Shipped Agency Ops Phase 1–2 spine — `agency-client-webinar` Space template (+ DB seed), deterministic `webinar-fulfillment` mission playbook (Phase A skills 1→2→3 + Gate 1), and Missions **Playbook** kickoff UI.

Why: Start webinar client fulfillment as guided missions without freeform invent or Flow playbook editor.

Impact: Instantiate Agency Client (Webinar) → Missions → Playbook → kickoff; mission-worker expands `input.playbook_id` into a fixed plan. Phase B/C copy+creative still TBD.

Files: `space-template-catalog-agency-client-webinar.ts`, `20260716102000_seed_agency_client_webinar_space_template.sql`, `webinar-fulfillment.playbook.ts`, `mission-plan-phase.service.ts`, `StartPlaybookModal.tsx`, `MissionsView.tsx`, `MissionsToolbar.tsx`

## [2026-07-16 10:05] - [DOCS]

What: Revised Agency Ops plan — Mission Playbook as runtime UI; v1 = canned Space template + Start playbook; Flow “mission playbook” type deferred.

Why: Align on one living mission entity now; use Flows later only as the config surface for custom playbooks.

Impact: Build order is template → guided mission phases/gates → copy/creative; no Add Flow chooser in v1.

Files: `.docs/plans/agency-operations-webinar-fulfillment.md`

## [2026-07-16 09:45] - [DOCS]

What: Wrote Agency Operations webinar fulfillment plan — Space template + Flow `human_gate` spine, skill-4 / webinar copy gaps, build order.

Why: Align CEO dashboard → client fulfillment with existing Ad Kit / strategist skills before coding.

Impact: Plan at `.docs/plans/agency-operations-webinar-fulfillment.md`; implementation not started.

Files: `.docs/plans/agency-operations-webinar-fulfillment.md`

## [2026-07-16 10:13] - [DOCS]

What: Planned Manage Agents as an employee work surface (idle/working focus, assign mission, agent Work desk, phased Autopilot).
Why: Humans need one place to see what agents are doing and send them to work without campaign/chat babysitting.
Impact: Plan at `.docs/plans/manage-agents-work-surface.md`; implementation not started.
Files: `.docs/plans/manage-agents-work-surface.md`

## [2026-07-16 10:16] - [DOCS]

What: Extended Manage Agents plan — default landing is Vibey Ops Desk (named greeting, live “what’s happening” summary, composer to deploy work); Jaime stays HR; roster/assign/desks remain secondary.
Why: User wants to talk to Vibey first and have Vibey deploy the team, not start from a cold employee grid.
Impact: Plan Phase 1 is now Ops Desk; visibility/assign/desks follow.
Files: `.docs/plans/manage-agents-work-surface.md`

## [2026-07-16 10:18] - [DOCS]

What: Locked Ops Desk campaign rule — if campaign is unclear, Vibey asks before creating a mission (no silent General default).
Why: User confirmed product decision for Vibey-deployed work from Manage Agents.
Impact: Plan + ops awareness instructions include ask-when-unclear.
Files: `.docs/plans/manage-agents-work-surface.md`

## [2026-07-16 10:25] - [FEATURE]

What: Shipped Manage Agents Vibey Ops Desk — named greeting, live team summary, Vibey chat with ops awareness (ask campaign when unclear), Autopilot toggle, roster always below with Working/Idle filters, focus lines, and Assign work modal.
Why: Turn `/team` from a chat roster into an ops floor where Vibey briefs and deploys work.
Impact: Opening Manage Agents shows Vibey first; specialists stay visible and assignable; Phase 3 Work desks still pending.
Files: `apps/web/src/features/team-2/components/VibeyOpsDesk.tsx`, `VibeyOpsDeskBriefing.tsx`, `AgentAssignWorkModal.tsx`, `Team2ManageContent.tsx`, `AgentsGrid.tsx`, `AgentGridCard.tsx`, `Team2Toolbar.tsx`, `ChatTab.tsx`, `Team2AgentChatWithConversations.tsx`, `agents-grid-utils.ts`, `lib/ops-desk-summary.ts`, `lib/build-team-ops-awareness-context.ts`, `config/messages.config.ts`, tests, `.docs/plans/manage-agents-work-surface.md`

## [2026-07-16 10:33] - [FIX]

What: Fixed janky Vibey Ops Desk layout (compact briefing + composer, no empty-thread scroll void) and shipped Phase 3 agent Work desks (Now / Queue / Recent) with mission detail open.
Why: Half-height full AgentChatPanel left a giant empty scroll area; desks still lacked work visibility.
Impact: `/team` Ops Desk is compact; opening a specialist defaults to Work tab.
Files: `VibeyOpsDesk.tsx`, `AgentChatPanel.tsx`, `AgentChatThread.tsx`, `ChatTab.tsx`, `Team2AgentChatWithConversations.tsx`, `Team2DetailView.tsx`, `tabs/AgentWorkTab.tsx`, `Team2ManageContent.tsx`

## [2026-07-16 10:22] - [FEATURE]

What: Meetings now ingest all team Fathom recordings (cleared Dylan-only recorded_by filter), tag each call Personal vs Team by whether Dylan was on it (`call_kind`), dedupe by Fathom meeting_id, and nest follow-ups under All Meetings via `parent_item_id` (Follow-ups / Action items still show them as main tasks).
Why: CEO needs team calls without duplicates, Group by Personal/Team, and per-meeting action visibility without leaving All Meetings.
Impact: Hard-refresh All Meetings — Call Kind column; Group by Call Kind; expand a call to see action items. New team-hosted recordings that hit the Fathom webhook will land. Deploy roas-api for ingest path.
Files: fathom-call-kind.ts, space-automation-service-06/13, space-items.repository, catalog-ceo, ListView/KanbanView, apply-space-toolbar-filters, live ROAS Meetings schema/trigger/backfill, tests

## [2026-07-16 10:23] - [FEATURE]

What: Follow-up action items now get the same Attendees multi_select tag as the inferred Fathom owner (match existing tags by name/email, else upsert). Live ROAS backfilled 23 follow-ups; Follow-ups / Action items views show Attendees.
Why: System Assignee only works for resolvable internal profiles; CEO triage needs Nate/Bryce/etc. as the same people tags used on calls.
Impact: Hard-refresh Follow-ups / Action items — owner chip on tagged tasks. New Fathom suggestions tag owners automatically after API deploy.
Files: fathom-follow-up-enrichment.ts, space-automation-service-13.base.ts, space-template-catalog-ceo.ts, live ROAS Meetings, tests

## [2026-07-16 10:28] - [FIX]

What: Row “Ask in chat” (was Attach to ROAS chat) expands the global chat panel before attaching the task, so the composer opens with the task chip.
Why: Attach only mutated composer state while chat stayed collapsed — especially broken on mobile where the panel unmounts.
Impact: Click the link icon on a Meetings row — chat opens with that task attached so you can ask whether Nouman completed it.
Files: SpaceItemRow.tsx, MediaCell.tsx

## [2026-07-16 10:38] - [FEATURE]

What: Replaced Ops Desk embedded composer with **Talk to Vibey** — opens sidebar global chat as Vibey and attaches live Ops Desk awareness (same attach idea as Spaces task → ROAS). Team work surface defaults to Vibey; chip shows "Ops Desk". Roster `agents_registry` status now patches live (missions refetch for focus); no more waiting on 60s list cache for idle/working.
Why: Embedded chat made the Ops Desk feel like another DM; sidebar attach is cleaner and matches existing platform attach patterns.
Impact: `/team` Ops Desk is briefing + CTA + floor; continue the conversation in the rail with team context. Working/idle badges update in realtime.
Files: `VibeyOpsDesk.tsx`, `VibeyOpsDeskTalkButton.tsx`, `GlobalChatPanel.tsx`, `SpaceVibeyChatPanel.tsx`, `work-context.config.ts`, `global-chat-storage.ts`, `use-team-roster-realtime.ts`, `apply-agents-registry-realtime-delta.ts`, messages/plan/changelog


## [2026-07-16 10:41] - [FIX]

What: Fixed Manage Agents Ops Desk roster clip (floor wrapper is now a flex column so AgentsGrid can scroll). Default agent group-by is **none**. Hardened `min-h-0` on Team / Brain / Flows / Spaces page roots after a cross-page scroll-chain audit.
Why: Ops Desk floor used `overflow-hidden` without flex, so `flex-1` + inner `overflow-auto` never got a height bound and the roster was clipped. Group-by team was a poor default when most orgs have no real teams.
Impact: `/team` roster scrolls under the briefing; agents render flat unless you group. Brain/Flows/Spaces page shells less likely to break nested scroll.
Files: `VibeyOpsDesk.tsx`, `AgentsGrid.tsx`, `AgentsGrid.test.tsx`, `team/page.tsx`, `brain/page.tsx`, `flows/page.tsx`, `spaces-page-client.tsx`


## [2026-07-16 10:49] - [FIX]

What: Clarified ROAS Autopilot on Manage Agents Ops Desk — enable modal explains what Autopilot does (watch campaigns, create/assign missions, retry stuck work); when on, Ops Desk shows an Autopilot badge, status hint, and Set strategy link into workspace Autopilot. Deduped Talk-to-Vibey copy. Added 10,000 org credits to dylan+vibeytest@roas.co.
Why: Turning Autopilot on felt like a dead switch — no explanation of what happens next.
Impact: Users see what Autopilot means and where to set campaign strategy; test account has more runway.
Files: `AwarenessToggle.tsx`, `VibeyOpsDesk.tsx`, `VibeyOpsDeskBriefing.tsx`, `messages.config.ts`, org_credit_purchases (prod)


## [2026-07-16 11:13] - [FIX]

What: Personal Slack connections are now visible and usable in org/workspace context — same cross-context pattern as Fathom/Fireflies. Status/overview/agent integration context include personal Slack; `getIntegration` (and metadata/error updates) fall back to the personal row when org-scoped lookup misses.
Why: Slack OAuth saved as `scope_mode: personal` / `org_id: null`, but chat/agent status checks filtered by org and reported disconnected even when Settings showed connected.
Impact: Agent `check_integration_connection` and Slack tools see a personally connected Slack workspace while the user is in an org workspace.
Files: `integrations-status.service.ts`, `integrations-overview.service.ts`, `integration-context.service.ts`, `slack.repository.ts`, tests

## [2026-07-16 11:15] - [DOCS]

What: Drafted Page Grader native send-tasks API contract + implementation plan (locked decisions: bulk bar, pick client, sync-back, assignee mapping).
Why: Need a shared contract before ROAS + Page Grader build the handoff.
Impact: Plan ready at `.docs/plans/page-grader-send-tasks.md`.
Files: `.docs/plans/page-grader-send-tasks.md`

## [2026-07-16 11:33] - [FEATURE]

What: Implemented Page Grader native send-tasks end-to-end — Page Grader `roas-api` edge function (list clients + idempotent workload create); ROAS connect/status/clients/send module; Settings catalog card; Spaces bulk bar **Page Grader** send panel with client picker; sync-back on `custom_data.page_grader`.
Why: Locked product path: multi-select Space tasks → Page Grader client work without inventing a second task system.
Impact: After deploying `roas-api` + setting `ROAS_API_KEY`, and shipping ROAS api/web, users can connect Page Grader and send selected tasks.
Files: `page-grader/supabase/functions/roas-api/`, `apps/api/.../page-grader/`, `BulkActionBar.tsx`, `PageGraderBulkSendPanel.tsx`, `useIntegrations.ts`, plan/docs

## [2026-07-16 11:36] - [FEATURE]

What: Notification feed rows now have **Ask in chat** (same Link2 pattern as Space tasks) — opens global chat, attaches a notification chip, prefills the composer with that item’s type/title/body; agent context resolves `user_notifications` / `agent_awareness_points` for the chip.
Why: Users need to talk to ROAS about a specific feed item without copy-paste.
Impact: Hover a notification → Ask in chat → composer ready with that context.
Files: `NotificationFeedRowMeta.tsx`, `NotificationFeedRow.tsx`, `ask-notification-in-chat.ts`, `use-chat-input-external-attachments.ts`, `attached-artifact.ts`, `chat-reference-context.service.ts`


## [2026-07-16 11:18] - [FIX]

What: Home My tasks detail loads personal team roster (self + agents) instead of forcing `roster=[]` for non-org spaces; Assignee falls back to “Me” when assignee_id is the current user.
Why: CEO HQ tasks are personal — opening from Home left Assignee Empty and activity showed a raw user UUID even though assignee_id was set correctly.
Impact: Open a My tasks item from Home — Assignee shows Me, not Empty.
Files: HomeTaskDetailHost.tsx, task-meta-fields-helpers.ts, TaskMetaFields.tsx, TaskMetaCoreFields.tsx

## [2026-07-16 11:24] - [FIX]

What: Restored Fathom→Brain auto-ingest and stuck “Crystallize beliefs and perspectives” processing for ROAS. Railway workers now use the IPv4 Supabase session pooler (direct DB host is IPv6-only and was ENETUNREACH), AGENT_API_URL points at Fly, and OpenClaw config no longer references a missing whatsapp plugin that disabled `/v1/responses` (404). Requeued failed Fathom imports — both succeeded.
Why: Auto-crystallize was ON and webhooks arrived, but workers could not claim outbox rows and Atlas calls hit a broken gateway, so last capture stayed ~22 days old and crystallize jobs sat In queue forever.
Impact: New Fathom meetings enqueue and complete into User Brain again; night-janitor crystallize jobs drain instead of stacking. Deploy Fly with updated `docker/openclaw.json` so whatsapp does not return on image rebuild.
Files: Railway env (SUPABASE_DIRECT_DB_URL/DATABASE_URL/AGENT_API_URL), `apps/mission-worker/.../database.service.ts`, `apps/queue-worker/.../database.service.ts`, `docker/openclaw.json`, `scripts/roas/roas-secrets.env`, Fly live `/home/node/.openclaw/openclaw.json`
