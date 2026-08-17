# Changelog - August 17, 2026

## [2026-08-17 00:36] - [FIX]

What: Locked the Agency Clients table to a real grid. Avatars are now a 36×36 square for logos and initials (`w-spacing-9` was a no-op). Groups share `table-fixed` column widths. Monday/Friday/Slack are single truncated lines instead of wrapping to ragged row heights.

Why: Missing width utility + auto table layout made landscape logos, initials, and long Slack/update text size each row differently, so the screen looked broken.

Impact: Clients list rows align across pipeline/manager sections. Empty updates stay muted placeholders. Hover title still shows full Slack text plus date.

Files: `apps/web/src/features/agency-clients/AgencyClientsTable.tsx`, `apps/web/src/features/agency-clients/AgencyClientsTable.test.tsx`, `apps/web/src/features/agency-clients/config/messages.config.ts`, `apps/web/src/app/globals.css`, `apps/website/src/app/globals.css`
