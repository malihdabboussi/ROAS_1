# Changelog - August 17, 2026

## [2026-08-17 00:09] - [FIX]

What: Stop Spaces `?space=&item=` deep-link crash (React #185) by ending the missing-space reload storm, preferring URL space on load, resolving missing spaces via fetch-by-id once, and stabilizing org/work-context updates on Open ROAS task links.

Why: Opening a finalized Service Request task white-screened the app. Console showed Maximum update depth exceeded; `useSpaceUrlViewSync` reloaded on every `spaces` identity change when the target space was absent (wrong org / beyond first page), cascading setStates.

Impact: Open ROAS task / `/spaces?space=&item=` deep links no longer infinite-loop; org-param switches clear stale space snapshots; work-context updates no-op when unchanged.

Files: apps/web/src/features/spaces/hooks/use-space-url-view-sync.ts, apps/web/src/features/spaces/hooks/use-space-url-view-sync.test.ts, apps/web/src/features/spaces/store/use-spaces-store.ts, apps/web/src/features/spaces/containers/SpacesContainer.tsx, apps/web/src/components/global-chat/store/use-global-chat-store.ts, apps/web/src/components/shell/ShellRightPanelConnections.tsx, apps/web/src/app/(dashboard)/providers.tsx

