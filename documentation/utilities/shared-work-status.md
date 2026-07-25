# Shared Work Status

Last Modified: 2026-07-25

## Purpose

`@/lib/spaces` exposes schema-aware task status labels and dot colors, plus a shared single-Space fetcher. `@/lib/notifications` exposes notification and mission status labels. These boundaries let Home, Inbox, and Space surfaces render the same work state without importing another feature's private modules.

## Public API

- `fetchSpaceById(spaceId, backend?)`
- `resolveStatusLabelFromId(statusId, statusField?)`
- `resolveStatusDotColorFromId(statusId, statusField?)`
- `resolveMissionSubtaskStatusDotColor(statusId)`
- `formatNotificationStatusLabel(status)`

## Consumers

- Home My Tasks modal and full-page view
- Inbox and notification surfaces
- Existing Space task status renderers through compatibility exports

## Decision

Status contracts and API wrappers are cross-feature data concerns, so they live in `src/lib`. Presentational status dots continue to use the shared `src/components/ui/status` surface.
