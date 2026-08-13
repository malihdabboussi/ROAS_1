# Changelog - August 13, 2026

## 2026-08-13 11:54 - [FIX]

What: Moved fresh Home-chat conversation reset ownership from the composer into the shell's `chat=starting` transition and added regression coverage for preventing a previously active conversation from replacing the new chat route.

Why: Signed-in Home sends could restore the prior conversation before the seeded message created its new thread, dropping the submitted message from the visible flow.

Impact: Home now preserves the previous conversation as a routing baseline, clears it when the starting surface mounts, and routes only after the newly created conversation becomes active.

Files: `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.test.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/ShellWorkspace.test.tsx`

## 2026-08-13 12:09 - [FIX]

What: Made the Home composer seed its existing default General Space instead of emitting a campaign-only seed, with regression coverage for the signed-in non-org-only account path.

Why: Campaign-only seeds cannot match the Space-backed global chat panel, so the queued Home message remained unconsumed on `chat=starting`.

Impact: Default Home sends now mount the matching General Space panel, create a fresh conversation, and stream the submitted message.

Files: `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.test.tsx`
