# Programs

Last Modified: July 24, 2026

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
- `programs.visibility` — `workspace` | `private` | `selected` (default `workspace`)
- `programs.created_by` — durable Program owner (set on create; nullable for legacy rows)
- `program_shares` — ACL rows (`entity_type=user`, `level` `view`|`edit`)
- `campaigns.program_id` — nullable FK; null = **General** (UI folder; internal key `__ungrouped__`)
- System kinds: `clients`, `roas_ops`, `personal` (unique per scope when set)

Migrations:

- `supabase/migrations/20260722130000_programs.sql`
- `supabase/migrations/20260724190155_program_permissions.sql`

API:

- `GET/POST/PATCH/DELETE /api/programs`
- `GET/POST /api/programs/:id/shares`, `DELETE /api/programs/:id/shares/:shareId`
- Move campaign: `PATCH /api/campaigns/:id` with `{ program_id }` (requires Program `edit`)

## Permissions (MVP)

| Mode                | Who can see the Program (+ inherit into its Campaigns + Spaces) |
| ------------------- | --------------------------------------------------------------- |
| **Workspace**       | All active org members (default; current behavior)              |
| **Private**         | `created_by` + people on `program_shares`                       |
| **Selected people** | Explicit `program_shares` (+ `created_by` retains manage)       |

Roles (API `view`/`edit`, UI Viewer/Editor):

- **Viewer** — read Program tree / campaigns / spaces under it
- **Editor** — mutate Program metadata, manage shares, create/move campaigns into Program

**Inheritance:** Campaigns and Spaces under a Program require Program access. Effective level = intersection (min) of Program role and existing campaign/space grants. Program gate wins: a space share to someone without Program access does **not** grant entry.

**Agents:** no agent-specific Program ACL. Agent tools use the invoking user’s Program access (RLS `has_program_access` / `has_org_campaign_access`).

**Org admin/owner** break-glass: always manage Program ACL / visibility.

**Legacy `created_by` null:** left null for existing Programs. Flipping to Private/Selected sets `created_by` to the acting admin/user. Until then, org admins manage restricted modes.

**Workspace ACL rows:** kept when switching back to Workspace; ignored until Private/Selected again.

## UI (hub + sidebar)

### Campaigns hub (`/campaigns`)

- Groups under program sections (empty programs still shown)
- Per-program **Campaign** control creates into that program
- Program name links to `/programs/[id]`
- Menu: Move to program / General

### Program overview (`/programs/[id]`)

- Same hub tree scoped to one program (Clients, ROAS Ops, …)
- Top **New campaign** creates into that program
- Link back to **All campaigns**

### Sidebar Programs panel (rail flyout + hub menu)

ClickUp Spaces–style **fixed-width** panel (label **Programs**, not Campaigns):

| Element      | Behavior                                                                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| First paint  | Stable program-row skeleton, then Program folders (Clients / ROAS Ops / General). The panel never flashes blank or shows a flat campaign list. |
| All Tasks    | Top row → `/all-tasks`                                                                                                                         |
| Header +     | Create menu: New Program / New Campaign / New Space                                                                                            |
| Footer       | **+ New Program**                                                                                                                              |
| Icon area    | Leading icon swaps to chevron on hover; click expands/collapses                                                                                |
| Name         | Navigates to program / campaign / space overview; lock icon when `visibility !== workspace`                                                    |
| Hover ⋯ / +  | Program: Share / Rename / Copy link / New campaign / Delete; Campaign: existing campaign menu + new space; Space: existing space menu          |
| Layout       | ClickUp-style primary flyout aligned below the top bar, 360px wide and nearly full viewport height; long names truncate with ellipsis.         |
| Expand state | Persisted in `localStorage` (`roas.sidebar.expandedProgramIds`, `expandedSpaceCampaignIds`). Default = collapsed.                              |

Campaigns with no `program_id` appear under a **General** folder when present.
Share opens the shared org `ShareModal` with Program visibility (Workspace / Private / Selected) and Viewer/Editor people list (`@/components/org` + `@/lib/org`).
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
- Rollup filters campaigns by Program access before loading spaces/items

## Decision Log

- **2026-07-22:** Programs are a ClickUp Space shell; Campaigns stay folders. Create-in-program auto-sets `program_id`. Org-first seed Clients + ROAS Ops; skip personal backfill. Page Grader campaigns backfill into Clients via `config.source = 'page_grader'` / `external_sources.page_grader`.
- **2026-07-22:** All Tasks rollup ships with My Tasks / All Tasks; space_items only (mission subtasks later).
- **2026-07-23:** Sidebar Campaigns uses Program → Campaign → Space tree (expand in-menu). Program name opens `/programs/[id]` overview. Nested hover spaces flyout removed from Campaigns dock.
- **2026-07-23:** Programs sidebar v2 — rename nav to Programs; fixed-width panel; programs-first load (no flat flash); collapsed default; icon→chevron hover; header create menu; row ⋯/+; All Tasks top; + New Program footer.
- **2026-07-23:** Programs sidebar v3 — All Tasks lives only inside Programs; primary dock flyouts use the tall top-aligned shell; all space pages load in the background; campaign/program caches follow the active organization; Personal campaign detail resolves safely while viewing an organization.
- **2026-07-24:** Program-level permissions MVP — `visibility` + `created_by` + `program_shares`; Nest `ProgramPermissionsService`; inherit into campaign list/get/move, space access intersection, All Tasks rollup; org ShareModal extended for Program; Workspace keeps ACL rows inert; flipping creator-less Program to Private/Selected sets `created_by` to acting user. Compat: space shares outside Program ACL no longer grant access.
- **2026-07-24:** UI rename: program folder **Ungrouped** → **General** (null `program_id`). Canonical ROAS Meetings / CEO HQ / Sales Pipeline live on org General campaign (not cross-org personal injection).
