# Changelog - August 20, 2026

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

## [2026-08-20 03:34] - [FIX]
What: Attribute Fathom meetings to client Campaign Brains via Page Grader matched clients + client_scope_map (Space route is fallback only). Persist matched_client_ids on meeting_recordings.metadata. Add dry-run/live backfill script for succeeded fathom_meeting_import jobs.
Why: One-room Meetings always lands recordings on General, so Space-route campaign brain dual-write exited as system_campaign and produced 0 campaign_fathom_import jobs.
Impact: New Fathom webhooks enqueue client campaign imports when invitees/clients match a mapped campaign. Operators can backfill historical meetings with scripts/roas/backfill-fathom-campaign-brains.mjs.
Files: fathom-campaign-brain-route.service.ts, fathom-webhook.service.ts, page-grader-meeting-sync.service.ts, backfill-fathom-campaign-brains.mjs, integration-connections.md
