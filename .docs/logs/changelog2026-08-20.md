# Changelog - August 20, 2026

## [2026-08-20 22:43] - [FIX]
What: Stamp Portal `pipeline_stage` onto ROAS campaign Page Grader config on import and catch-up (including hash-unchanged skips). Retry Portal `/clients` without `include_all_statuses` / `include_inactive` on 400/422. Hide Inactive/Blocked/Churned parent clients on Client Campaigns with Show inactive. Split `page-grader.integration.ts` under the integration LOC cap.
Why: Connections could not hide churned clients because campaign config never stored pipeline. Portal unknown query params could 400 the whole Clients list. Client Campaigns still listed campaigns for hidden parents. The integration file was over the 400 LOC cap.
Impact: Connections can hide/order from stamped config. Clients listing survives Portal rejecting the extra flags. Client Campaigns matches Clients default-hide. Page Grader HTTP/types live in focused files.
Files: `page-grader-client-import.service.ts`, `page-grader-brain-package-ingest.service.ts`, `page-grader.integration.ts`, `page-grader.integration.http.ts`, `page-grader.integration.types.ts`, `agency-client-pipeline.ts`, `ClientCampaignsPage.tsx`, `page-grader-campaign-brain-sync.md`

## [2026-08-20 02:50] - [FIX]
What: Meeting workspace status now uses All Meetings Call status (`custom_data.call_status`: Live / Completed / No Show / Rescheduled). Connections labels the linked meeting with the meeting name, not the recap/chat title. Meeting threads no longer get first-message title autogen.
Why: Call notes showed Following up (task Status) while All Meetings showed Completed (Call status) for the same Samin Yassar calls. Recap prompts renamed the meeting chat, so CONNECTIONS looked like a message linked to itself.
Impact: Workspace picker and All Meetings share Call status. Recap chats still connect to the calendar meeting, labeled with that meeting’s title. Follow-up work keeps task Status.
Files: `use-meeting-space-status-field.ts`, `MeetingWorkspaceDialog.tsx`, `ShellRightPanel.tsx`, `conversation-meeting-link.ts`, `conversation-title.ts`, `conversation-title-scheduler.ts`, `chat.service.ts`, `meeting-workspace.service.ts`

## [2026-08-20 00:56] - [FIX]
What: Unblocked `roas-web` typecheck and stopped React #185 max-update-depth crashes on Choose Space / home shell.
Why: Production showed the branded error boundary (`SOMETHING WENT WRONG`). `app_errors` logged React #185 on `/` and `/home/inbox`. Vercel `roas-web` deploys after #335 were failing typecheck (`agency-client-pipeline` slug typing + MissionTrackActions test cast), so later fixes could not ship.
Impact: Web typecheck passes again. Conversation scope menu layout no longer re-setState on identical geometry; spaces fetch callback is stable; chat menu merge skips no-op updates.
Files: `agency-client-pipeline.ts`, `MissionTrackActions.test.tsx`, `ConversationScopePicker.tsx`, `use-conversation-scope-spaces.ts`, `ShellChatMenu.tsx`, `shell-chat-menu-pin.ts`

## [2026-08-20 01:10] - [FIX]
What: All Meetings now shows Client / Campaign, Host, and Call status (Live / Completed / No Show / Rescheduled) instead of Priority, Space, and the name-column task Status dots. Existing Meetings spaces get those fields on load and persist.
Why: The stored All Meetings view never received Host/Call status/Client, while the read-path injected a Space column and left Priority + task Status in place. Enabling Status still only opened the name-column picker because list columns strip `status`.
Impact: Opening Meetings rewrites the All Meetings columns to the one-room set. Priority and task Status remain as fields (Hidden). Space is no longer a default column.
Files: `all-meetings-list-columns.ts`, `use-ensure-all-meetings-columns.ts`, `SpaceItemRow.tsx`, `space-template-catalog-personal-dashboard.ts`, `20260820004500_meetings_all_meetings_one_room_columns.sql`

## [2026-08-20 03:36] - [DOCS]
What: Appended already-applied 20260818200000/230000/233000/234500 migrations to scripts/roas/migration-order.txt (before 20260819014500).
Why: Order file ended at 20260819014500 and omitted four migrations that are already on prod.
Impact: Migration bookkeeping matches prod for those four; 20260819020000_campaign_delegation_preview still withheld until Portal delegation tool is live.
Files: scripts/roas/migration-order.txt

## [2026-08-20 03:29] - [FIX]
What: Company Cortex daily dream auto-promotes signals with confidence >= 0.8 to active and enqueues formation; leaves lower confidence as proposed for human review. Warns on zero-signal dream completions and empty formation eligibility.
Why: Dream always inserted `proposed` signals, formation only reads `active`, and the only promoter was a human approve click — so formation never ran and Company Cortex produced 0 objects.
Impact: High-confidence Atlas signals form without waiting for review; operators still review low-confidence proposals. Logs no longer treat empty dream/formation runs as silent successes.
Files: `company-daily-dream-atlas.service.ts`, `company-cortex-signal.repository.ts`, `company-cortex-formation.service.ts`, `company-daily-dream-runner.service.ts`, `company-cortex.repository.ts` (api), `dream-ops.md`

## [2026-08-20 03:34] - [FIX]
What: Attribute Fathom meetings to client Campaign Brains via Page Grader matched clients + client_scope_map (Space route is fallback only). Persist matched_client_ids on meeting_recordings.metadata. Add dry-run/live backfill script for succeeded fathom_meeting_import jobs.
Why: One-room Meetings always lands recordings on General, so Space-route campaign brain dual-write exited as system_campaign and produced 0 campaign_fathom_import jobs.
Impact: New Fathom webhooks enqueue client campaign imports when invitees/clients match a mapped campaign. Operators can backfill historical meetings with scripts/roas/backfill-fathom-campaign-brains.mjs.
Files: fathom-campaign-brain-route.service.ts, fathom-webhook.service.ts, page-grader-meeting-sync.service.ts, backfill-fathom-campaign-brains.mjs, integration-connections.md
