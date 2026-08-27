# Changelog - August 27, 2026

## 2026-08-27 16:20 - [FIX]

What: Made the Meetings surface deterministically select the active organization Meetings space when a legacy personal duplicate is present.

Why: Equal-ranked duplicate spaces let stale and refreshed space lists switch the visible call dataset, causing new calls to appear and disappear.

Impact: Meetings remains on one canonical dataset; production history was consolidated and the latest Yasir call was mapped to Yasir Khan Coaching LTD.

Files: `apps/web/src/app/(dashboard)/home/meetings/MeetingsUnifiedSurface.tsx`, `apps/web/src/app/(dashboard)/home/meetings/MeetingsUnifiedSurface.test.tsx`, `documentation/features/meeting-follow-up-slack.md`

## 2026-08-27 16:35 - [FIX]

What: Replaced the meeting workspace's recap-only shortcut with **Run post-call flow**.

Why: The meeting workspace should launch the same guided context, task delegation review, and editable follow-up-message cycle as Pixel's Slack review link.

Impact: Operators can start the complete human-controlled post-call workflow directly from a completed meeting.

Files: `apps/web/src/features/home/config/meeting-post-call-actions.config.ts`, related meeting tests, `documentation/features/meeting-follow-up-slack.md`
