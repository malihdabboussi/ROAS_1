# Claude/ChatGPT shell (apps/web)

Last Modified: 2026-07-17

## Overview

Dashboard chrome inspired by Claude/ChatGPT: top bar, pin/peek sidebar, Home/Chat menus, persistent chat drawer on workspace routes, and a right summary panel (Tasks / Files / Sources).

Design reference: `.docs/design/claude-chatgpt-shell-v4/` (HTML prototype + `shell-state.md`).

## Data Flow

1. `useShellStore` (`components/shell/use-shell-store.ts`) owns pin/peek, menu mode, chat drawer, space work collapse, right panel, and page breadcrumbs.
2. `DashboardFrame` renders a full-width `ShellTopBar`, then a row of HQ sidebar + `ShellWorkspace` (T-junction — sidebar under the top bar, never overlaying it).
3. Feature pages publish rich breadcrumbs with `ShellBreadcrumb`; `ShellTopBar` renders them in place of the path-label fallback. Publishers today: Team, Spaces, Flows, Skills.
4. HQ sidebar expand follows `sidebarPinned` / `sidebarPeek` (top-bar PanelLeft); peek overlays under the top bar (layout stays 72px); pin expands in-flow to 272px. Shared grace timer on peek leave.
4b. Global Search lives in the top bar (opens `StudioSearchModal`); Chat menu keeps a Search row with the same control. Home menu does not list Search. Search is server-backed through `/api/entity-search`, progressively merges tasks, Space/conversation docs, mission deliverables, conversations, campaigns, and campaign artifacts, and cancels stale terms.
5. Chat menu opens conversations in the left drawer on workspace routes (`/spaces`, `/campaigns`, `/team`, …) or full conversation on Home (`/home?conv=`). Plain `/home` always shows the dashboard.
6. **New** / pencil: on Home → `/home?chat=new`; on workspace routes (spaces/campaigns/brain/team/projects/flows) → `openFreshChatDrawer()` (docked left chat + Chat menu + right panel closed; stay on page).
7. Open in ▾ resolves Drive / Google Docs / Canva targets from the focused space `?item=` (and optional media focus).
8. Top-bar ⋯ only renders when there is chat or space-detail context with actions.

## Key files

- `apps/web/src/components/shell/*`
- `apps/web/src/app/(dashboard)/dashboard-shell.tsx`
- `apps/web/src/components/layout/sidebar/SidebarHqRail.tsx` (pin/peek sync)
- `apps/web/src/components/layout/sidebar/SidebarHqHubMenu.tsx` (Home/Chat chrome)

## Decision Log

- Peek overlays as a fixed solid column under the top bar (does not push main); pin is in-flow 272px. Collapsed rail keeps inset `card-glass`.
- Sources tab is stubbed until a dedicated ontology ships.
- Top-bar ⋯ omitted until real section/chat actions are wired.
- Home flyout rows (Team/Campaigns/Brain/More) have no trailing chevrons — hover still opens the docked flyout.
- Collapsed rail More (•••) hosts Projects + Flows (same `HubDockFlyout` as expanded More). Projects opens a nested projects sub-flyout on row hover (same pattern as Campaigns → spaces); create lives in that nested header `+`, not inline under More.
- Campaigns flyout uses a nested spaces sub-flyout on campaign-row hover (400ms grace); not an inline accordion. No Favourite/Campaigns captions inside the flyout body. Campaign rows share the same `hub-dock-flyout-row` gap as nested space rows.
- Dock flyouts use a left hover bridge + tight offsets (primary 2px / nested 0) and ignore leave when the pointer moves into another `[data-hub-dock-flyout]`, so parent → nested paths stay reachable. Vertical position is clamped to the viewport after measure.
- Disabled Brain scopes show muted “Enable in Manage Brains” rows linking to Manage Brains.
- Collapsed top-bar pencil is contextual (full new-chat on Home; docked fresh chat on section routes).
- Chat menu conversation toolbar is `[all-agents] [filter] [Search]` on one row (defaults to current-agent conversations). Agent picker stays in the main chat header (`ShellNewChatAgentBar`). Chat panel keeps a single collapse control; shell drawer has no separate minimize bar.
- Global Search uses the shared entity-search boundary. Core entities paint independently from the heavier artifact lane; the retired `/api/studio/search` route must not be reintroduced.
- Home is dashboard-only (cards). New Chat (`+ New` / `?chat=new`) is the full former Home hero: greeting, composer, templates, recommendations.
