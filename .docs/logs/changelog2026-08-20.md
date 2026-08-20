# Changelog - August 20, 2026

## [2026-08-20 01:10] - [FIX]
What: All Meetings now shows Client / Campaign, Host, and Call status (Live / Completed / No Show / Rescheduled) instead of Priority, Space, and the name-column task Status dots. Existing Meetings spaces get those fields on load and persist.
Why: The stored All Meetings view never received Host/Call status/Client, while the read-path injected a Space column and left Priority + task Status in place. Enabling Status still only opened the name-column picker because list columns strip `status`.
Impact: Opening Meetings rewrites the All Meetings columns to the one-room set. Priority and task Status remain as fields (Hidden). Space is no longer a default column.
Files: `all-meetings-list-columns.ts`, `use-ensure-all-meetings-columns.ts`, `SpaceItemRow.tsx`, `space-template-catalog-personal-dashboard.ts`, `20260820004500_meetings_all_meetings_one_room_columns.sql`
