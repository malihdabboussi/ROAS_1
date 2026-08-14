# Changelog - August 14, 2026

## [2026-08-14 10:50] - [FIX]

What: Unified Clients navigation, breadcrumbs, and Portal context so agency Clients always open the Page Grader-backed `/clients` screen.

Why: Simple-menu Favorites and the system Program named Clients were competing with agency Clients, breadcrumbs fell through to Inbox on `/programs`, and Portal always opened generic `/clients`.

Impact: Clients and Client Campaigns are reachable in Simple and HQ navigation. The system clients Program is labeled Client Spaces. Breadcrumbs follow the active client/campaign route. Portal opens the matching Page Grader client or campaign without replacing the open Pixel chat.

Files: `apps/web/src/components/layout/sidebar/SidebarSimpleSection.tsx`, `apps/web/src/components/layout/sidebar/SidebarFavoritesFlyout.tsx`, `apps/web/src/components/shell/ShellTopBar.tsx`, `apps/web/src/components/shell/PageGraderPortalSurface.tsx`, `apps/web/src/components/shell/shell-breadcrumb.ts`, `apps/web/src/components/shell/portal-target-path.ts`, `apps/web/src/lib/programs/program-display-name.ts`, `apps/web/src/features/agency-clients/*`
