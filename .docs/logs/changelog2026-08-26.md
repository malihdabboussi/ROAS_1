# Changelog - August 26, 2026

## 2026-08-26 10:28 - [FIX]

What: Made the Home New Chat composer inherit the globally selected Client Workspace campaign and prefer its mapped General Space, with a mapped-Space fallback.

Why: New Chat remained unscoped even while the platform-wide client filter was active.

Impact: The composer displays the selected client context immediately and seeds new conversations with the same client campaign and Space IDs.

Files: `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.tsx`, `apps/web/src/components/home-dashboard-v4/HomeDashboardV4Composer.test.tsx`, `documentation/utilities/client-scope.md`
