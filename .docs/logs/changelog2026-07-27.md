# Changelog - July 27, 2026

## [2026-07-27 15:00] - [FIX]

What: Moved `statusField` `useMemo` above the loading early-return in `HomeSpaceTaskDetailHost` so opening a home task (including meeting prep from agenda) no longer violates Rules of Hooks.

Why: Production crashed with a blank client-side exception when agenda → open meeting → start/open prep mounted the host through loading → ready.

Impact: Home meeting prep and Fathom-related agenda opens load the task detail instead of killing the app shell.

Files: `apps/web/src/features/home/components/HomeTaskDetailHost.tsx`, `HomeTaskDetailHost.test.tsx`

## [2026-07-27 00:01] - [FIX]

What: Replaced the duplicated, edge-clipped AI capability marquee with a stable responsive capability group, and made selected-agent layouts give the agent profile the work area while the canonical AI Chat is open.

Why: Authenticated browser testing showed half-rendered capability labels in narrow chat layouts and a redundant team overview compressed between the selected-agent chat and profile.

Impact: Every AI capability remains fully visible at shared-screen widths. Agent pages now use one composer and one clear detail surface while AI Chat is open, then restore the team overview when chat is collapsed.

Files: `apps/web/src/components/shell/ShellEmptyChatCapabilityScroller.tsx`, `ShellEmptyChatPrompts.test.tsx`, `apps/web/src/features/team-2/components/Team2DetailView.tsx`, `Team2DetailView.test.tsx`, and both product `globals.css` files.

## [2026-07-27 08:55] - [FEATURE]

What: Added persisted HQ menu docking (left/right/top/bottom via hold-on-R-logo), simplified right-panel motion ownership, and aligned feature toolbars/filters with the shared shell chrome. Also fixed clipped AI capability labels and selected-agent work-area layout while chat is open.

Why: Users need a movable menu without losing Home on click, and feature toolbars were inconsistently dense/clipped against the new shell.

Impact: Desktop menu placement is a personal preference; mobile stays left. Toolbars across Campaigns, Programs, Tasks, Brain, Contacts, Flows, Artifacts, Media, and Paid Ads share denser scoped controls. Capability chips stay fully readable.

Files: `ShellMenuDockLayout`, `use-shell-menu-dock`, sidebar HQ rail/logo overlay, feature toolbar/filter modules, both product `globals.css`, and `documentation/features/claude-chatgpt-shell.md`.

## [2026-07-27 08:56] - [ARCH]

What: Removed `CrmContactsContainer.tsx` from `loc-allowlist.json` after it dropped under the 400 LOC component limit.

Why: Architecture gate requires allowlist shrink when a file recovers under its limit.

Impact: Contacts list container is no longer permanently allowlisted.

Files: `scripts/arch/loc-allowlist.json`

## [2026-07-27 14:54] - [FIX]

What: Stopped the R logo from triggering native browser image-drag during hold-to-dock, and made the dock affordance follow the pointer instead of a static center ghost.

Why: Holding the logo was lifting the PNG as a page image drag, so users never entered the four-edge menu dock gesture.

Impact: Hold on R now owns the gesture: edge targets highlight and a tokenized lifted mark tracks the pointer; short click still opens Home/menu.

Files: `SidebarHqHubLogoButton.tsx`, `ShellMenuDockOverlay.tsx`, `use-shell-menu-dock.ts`, both product `globals.css`, related tests.

## [2026-07-27 15:10] - [FEATURE]

What: Added a persisted HQ menu dock value `work` that mounts the rail on the left edge of the shell work card (Chat | Menu | Work), with seam-aware hold-to-dock targeting and frame-left fallback when the work column cannot host.

Why: Users want the HQ menu attached to the work/Space card beside AI Chat for a true split-screen layout, not only on outer frame edges.

Impact: Hold-R can drop onto the work seam; desktop flyouts from `work` open into the card like `left`. Mobile and collapsed/full-chat cases keep the previous left-rail fallback without clearing the saved preference.

Files: `use-shell-menu-dock.ts`, `ShellSidebarSlot.tsx`, `ShellMenuDockLayout.tsx`, `ShellWorkspace.tsx`, `ShellMenuDockOverlay.tsx`, `SidebarHqHubLogoButton.tsx`, both product `globals.css`, shell docs/tests.

## [2026-07-27 16:10] - [FEATURE]

What: Finished the five-zone HQ menu dock redesign — replaced the four frame edges (`left`/`right`/`top`/`bottom`) plus `work` with five homes that are never over AI Chat: frame `left`, `work`, `work-top`, `work-bottom`, `work-right` (legacy values auto-migrate). R logo click now toggles the rail between expanded and **compact** (Option A) in place instead of navigating Home; Home moved to the dedicated Home rail icon. Dragging the expanded rail lifts the whole menu, dragging compact lifts only the R chip. Removed the leftover chat-history "Show chat history" restore peek from the HQ rail (`SidebarHqRail.tsx`) so it only exists inside `ShellChatDrawer`, pinned top-left of the chat surface. Work-attached docks now ride with a collapsing work card as a thin right vertical rail instead of disappearing, and `work-top` / `work-bottom` are horizontally centered on the work card instead of spanning over chat.

Why: Continuing prior WIP (`unrelated-wip-before-menu-dock-v2` branch work) per user-confirmed Option A for R-click behavior; the four-frame model let docks compete with Chat for edges and mixed chat-history restore with menu docking in the same corner.

Impact: `pnpm --filter web exec vitest run src/components/shell/use-shell-menu-dock.test.ts src/components/shell/ShellMenuDockLayout.test.tsx src/components/layout/sidebar/SidebarHqHubLogoButton.test.tsx src/components/shell/ShellChatDrawer.test.tsx src/components/layout/sidebar/SidebarHqSection.test.tsx` is green (23/23), and the full `src/components/shell` + `src/components/layout/sidebar` suite is green (124/124). Purple drop targets are kept for manual QA of all five homes.

Files: `apps/web/src/components/shell/use-shell-menu-dock.ts`, `ShellMenuDockLayout.tsx`, `ShellWorkspace.tsx`, `ShellChatDrawer.tsx`, `apps/web/src/components/layout/Sidebar.tsx`, `apps/web/src/components/layout/sidebar/{ShellMenuDockOverlay,SidebarHqHubLogoButton,SidebarHqRail,HubDockFlyout}.tsx`, matching tests, both product `globals.css`, `documentation/features/claude-chatgpt-shell.md`.

