# Open In New Tab Utility

Last updated: 2026-06-11

## Purpose

`open-in-new-tab.ts` centralizes internal app new-tab navigation while preserving active organization context.

Use it when opening a same-origin Vibey app route from client code. It appends the current `org` query parameter from the session-scoped org store and opens with `noopener,noreferrer`.

## When To Use

Use this utility for internal app routes such as:

- `/team?agent=...`
- `/brain?scope=...`
- `/spaces?space=...`
- `/campaigns/...`
- same-origin absolute URLs built from `window.location.origin`

Do not use it for OAuth popups, invoice links, public artifact live URLs, file previews, Meta manager links, or other external URLs unless mixed internal/external input is unavoidable. External URLs are passed through unchanged.

## API

- `withActiveOrgParam(target)`: returns `target` with `org=<activeOrgId>` merged when `target` is same-origin.
- `openInNewTab(target)`: opens `withActiveOrgParam(target)` in `_blank` with `noopener,noreferrer`.

## Behavior

The active org is read from `vibey-active-org` in `sessionStorage`. If no active org exists, the URL is unchanged.

Same-origin absolute URLs stay absolute. Relative URLs stay relative. Existing stale `org` query params are replaced with the current active org.

## Used By

- Agent, skill, team, person, campaign, channel, space, task, mission, doc, media, paid-ads, and conversation new-tab menu actions in `apps/web`.
- Studio artifact, deliverable, and strategy shortcuts that open `/team`.

## Testing

Tests live in `apps/web/src/lib/utils/__tests__/open-in-new-tab.test.ts`.

## Change History

- 2026-06-11: Added to preserve org context across `noopener` new-tab flows.
