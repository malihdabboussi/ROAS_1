# Reporting Date Ranges

Last updated: 2026-07-17

## Purpose

`apps/web/src/lib/reporting/resolve-reporting-dates.ts` converts reporting presets and custom date inputs into date-only `YYYY-MM-DD` boundaries shared by Team analytics, campaign reporting, Flow run history, Brain filters, contacts, and related reporting surfaces.

## Contract

- Custom start/end values take precedence over a preset.
- Presets use the viewer's local calendar day.
- Date-only results are formatted directly from local year, month, and day fields.
- Local calendar boundaries must not pass through `Date.prototype.toISOString()`, because that can shift the date backward or forward when the local timezone differs from UTC.
- `all` returns no boundaries; a missing config defaults to the previous 30 days.

## Compatibility

The previous Spaces helper path remains a re-export of the shared utility. Both the shared tests and the compatibility tests must use local calendar fixtures and assert the same results.

## Testing

Coverage lives in:

- `apps/web/src/lib/reporting/resolve-reporting-dates.test.ts`
- `apps/web/src/features/spaces/components/reporting/shared/resolve-reporting-dates.test.ts`
- `apps/web/src/features/team-2/components/teams/TeamAnalyticsView.test.tsx`

The core preset suite should be run under timezones on both sides of UTC when changing date formatting.

## Change History

- 2026-07-17: Removed UTC serialization from local calendar boundaries so month, quarter, and rolling-day presets no longer shift by timezone.
