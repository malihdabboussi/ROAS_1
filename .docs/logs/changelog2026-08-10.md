# Changelog - August 10, 2026

## [2026-08-10 09:43] - [FEATURE]

What: Rebased and shipped local Home Agenda WIP onto current `origin/main`: persisted agenda minimize/exclusions (Fathom settings + webhook gate), impromptu instant meetings, Delegation Desk as `/home/delegation-desk`, Pixel legacy-name suffix normalization + seed migration, and Slack Active/Shadow copy polish. Kept main’s OpenClaw model routing and minimized-row UI.

Why: Valuable local work was parked behind a stale main and needed to land cleanly after fast-forwarding 51 upstream commits.

Impact: Users can hide agenda occurrences across sessions (and skip Fathom ingest for those), start impromptu calls without a calendar, open Delegation Desk as a home route, and see “Vibey · CEO”-style defaults as Pixel.

Files: fathom agenda-exclusion API/helpers, meeting instant create path, home agenda/instant host, delegation desk page/workspace, default-agent-identity, pixel seed migration, docs/follow-up/changelog
