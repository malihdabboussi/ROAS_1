# Changelog - August 13, 2026

## 2026-08-13 11:54 - [FIX]

What: Moved fresh Home-chat conversation reset ownership from the composer into the shell's `chat=starting` transition and added regression coverage for preventing a previously active conversation from replacing the new chat route.

Why: Signed-in Home sends could restore the prior conversation before the seeded message created its new thread, dropping the submitted message from the visible flow.

Impact: Home now preserves the previous conversation as a routing baseline, clears it when the starting surface mounts, and routes only after the newly created conversation becomes active.

Files: `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.test.tsx`, `apps/web/src/components/shell/ShellWorkspace.tsx`, `apps/web/src/components/shell/ShellWorkspace.test.tsx`
