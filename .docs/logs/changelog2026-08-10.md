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
