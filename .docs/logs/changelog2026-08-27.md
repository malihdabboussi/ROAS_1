# Changelog - August 27, 2026

## 2026-08-27 11:05 - [FIX]

What: Ensured every opened meeting workspace has a persistent, dedicated conversation and enabled Continue in chat for scheduled meetings.
Why: Materialized meetings could have no conversation, leaving Continue in chat disabled; the existing recovery path intentionally skipped scheduled calls because it would incorrectly mark them live.
Impact: Opening a meeting now creates its deterministic chat when needed without changing call status or phase, and Continue in chat opens that exact conversation.
Files: apps/api/src/modules/meetings/controllers/meeting-workspace.controller.ts, apps/api/src/modules/meetings/services/meeting-workspace.service.ts, apps/web/src/features/home/components/MeetingWorkspaceDialog.tsx, apps/web/src/features/home/services/meeting-workspace-api.ts, documentation/features/meeting-follow-up-slack.md
