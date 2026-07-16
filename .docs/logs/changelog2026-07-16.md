# Changelog - July 16, 2026

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
