# Changelog - August 20, 2026

## [2026-08-20 02:35] - [FIX]
What: All Meetings keeps the name-column status dropdown (Call status) while Call status stays its own column. Default columns are now Client Workspace and Campaign Space like All Tasks, mapped from the call’s client/campaign space. Host is a people dropdown. Removed the Map + Agenda Client / Campaign default column.
Why: Status as a column should not hide the ClickUp-style name picker. Client / Campaign was a mapper control, not the All Tasks Client Workspace / Campaign Space pair.
Impact: Existing All Meetings views splice in those two columns and keep Host / Call status. Mapping payload stays on `custom_data.client_campaign`.
Files: `all-meetings-list-columns.ts`, `MeetingLocationCell.tsx`, `HostCell.tsx`, `SpaceItemRow.tsx`, `space-template-catalog-personal-dashboard.ts`, `20260820031500_meetings_client_workspace_columns.sql`

## [2026-08-20 01:10] - [FIX]
What: All Meetings now shows Client / Campaign, Host, and Call status (Live / Completed / No Show / Rescheduled) instead of Priority, Space, and the name-column task Status dots. Existing Meetings spaces get those fields on load and persist.
Why: The stored All Meetings view never received Host/Call status/Client, while the read-path injected a Space column and left Priority + task Status in place. Enabling Status still only opened the name-column picker because list columns strip `status`.
Impact: Opening Meetings rewrites the All Meetings columns to the one-room set. Priority and task Status remain as fields (Hidden). Space is no longer a default column.
Files: `all-meetings-list-columns.ts`, `use-ensure-all-meetings-columns.ts`, `SpaceItemRow.tsx`, `space-template-catalog-personal-dashboard.ts`, `20260820004500_meetings_all_meetings_one_room_columns.sql`

## [2026-08-20 00:56] - [FIX]
What: Unblocked `roas-web` typecheck and stopped React #185 max-update-depth crashes on Choose Space / home shell.
Why: Production showed the branded error boundary (`SOMETHING WENT WRONG`). `app_errors` logged React #185 on `/` and `/home/inbox`. Vercel `roas-web` deploys after #335 were failing typecheck (`agency-client-pipeline` slug typing + MissionTrackActions test cast), so later fixes could not ship.
Impact: Web typecheck passes again. Conversation scope menu layout no longer re-setState on identical geometry; spaces fetch callback is stable; chat menu merge skips no-op updates.
Files: `agency-client-pipeline.ts`, `MissionTrackActions.test.tsx`, `ConversationScopePicker.tsx`, `use-conversation-scope-spaces.ts`, `ShellChatMenu.tsx`, `shell-chat-menu-pin.ts`
