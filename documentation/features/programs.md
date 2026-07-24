# Programs

Last Modified: July 23, 2026

## Overview

**Programs** are a ClickUp Space–style shell over Campaigns:

| ClickUp | ROAS                         |
| ------- | ---------------------------- |
| Space   | Program (nav bucket / shell) |
| Folder  | Campaign                     |
| List    | Space                        |

Create a campaign **inside a program** → it is automatically assigned to that program (`program_id`). Global create can default to Clients in org context.

ROAS org-first system programs: **Clients**, **ROAS Ops**. Personal-account program seed/backfill is deferred.

## Data model

- `programs` — org-owned (`org_id` set, `user_id` null) or personal (`org_id` null, `user_id` set)
- `campaigns.program_id` — nullable FK; null = Ungrouped
- System kinds: `clients`, `roas_ops`, `personal` (unique per scope when set)

Migration: `supabase/migrations/20260722130000_programs.sql`  
API: `GET/POST/PATCH/DELETE /api/programs`  
Move campaign: `PATCH /api/campaigns/:id` with `{ program_id }`

## UI (hub + sidebar)

### Campaigns hub (`/campaigns`)

- Groups under program sections (empty programs still shown)
- Per-program **Campaign** control creates into that program
- Program name links to `/programs/[id]`
- Menu: Move to program / Ungrouped

### Program overview (`/programs/[id]`)

- Same hub tree scoped to one program (Clients, ROAS Ops, …)
- Top **New campaign** creates into that program
- Link back to **All campaigns**

### Sidebar Programs panel (rail flyout + hub menu)

ClickUp Spaces–style **fixed-width** panel (label **Programs**, not Campaigns):

| Element      | Behavior                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| First paint  | Stable program-row skeleton, then Program folders (Clients / ROAS Ops / Ungrouped). The panel never flashes blank or shows a flat campaign list. |
| All Tasks    | Top row → `/all-tasks`                                                                                                                           |
| Header +     | Create menu: New Program / New Campaign / New Space                                                                                              |
| Footer       | **+ New Program**                                                                                                                                |
| Icon area    | Leading icon swaps to chevron on hover; click expands/collapses                                                                                  |
| Name         | Navigates to program / campaign / space overview                                                                                                 |
| Hover ⋯ / +  | Program: menu + new campaign; Campaign: existing campaign menu + new space; Space: existing space menu                                           |
| Layout       | ClickUp-style primary flyout aligned below the top bar, 360px wide and nearly full viewport height; long names truncate with ellipsis.           |
| Expand state | Persisted in `localStorage` (`roas.sidebar.expandedProgramIds`, `expandedSpaceCampaignIds`). Default = collapsed.                                |

Ungrouped campaigns (no `program_id`) appear under an **Ungrouped** folder when present.
The Programs tree automatically finishes paginating stored spaces in the background, so older
Personal, calendar, client, and operations spaces do not depend on a manual **Load more** click.
Campaign, program, and user-state caches are scoped to the active organization and refresh when
the user switches workspaces.

## All Tasks

- Route: `/all-tasks` (Programs panel + Campaigns hub link; not a standalone main-sidebar item)
- API: `GET /api/tasks/rollup?view=my|all&program_id=&campaign_id=`
- Tabs: **My Tasks** | **All Tasks**
- Open top-level space tasks only (status not done/archived)
- Row opens `/spaces?space=…&item=…`
- Your Turn remains the personal inbox

## Decision Log

- **2026-07-22:** Programs are a ClickUp Space shell; Campaigns stay folders. Create-in-program auto-sets `program_id`. Org-first seed Clients + ROAS Ops; skip personal backfill. Page Grader campaigns backfill into Clients via `config.source = 'page_grader'` / `external_sources.page_grader`.
- **2026-07-22:** All Tasks rollup ships with My Tasks / All Tasks; space_items only (mission subtasks later).
- **2026-07-23:** Sidebar Campaigns uses Program → Campaign → Space tree (expand in-menu). Program name opens `/programs/[id]` overview. Nested hover spaces flyout removed from Campaigns dock.
- **2026-07-23:** Programs sidebar v2 — rename nav to Programs; fixed-width panel; programs-first load (no flat flash); collapsed default; icon→chevron hover; header create menu; row ⋯/+; All Tasks top; + New Program footer.
- **2026-07-23:** Programs sidebar v3 — All Tasks lives only inside Programs; primary dock flyouts use the tall top-aligned shell; all space pages load in the background; campaign/program caches follow the active organization; Personal campaign detail resolves safely while viewing an organization.
