# Programs

Last Modified: August 17, 2026 (All Tasks is the primary task destination; My Tasks page retired)

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
- `program_user_state` — per-user Program favorites
- `campaigns.program_id` — nullable FK; null = **General** (UI folder; internal key `__ungrouped__`)
- `campaign_canvases` — one free-form board identity and viewport per Campaign; normalized items, connectors, and operation history inherit campaign access
- System kinds: `clients`, `roas_ops`, `personal` (unique per scope when set)

Migrations:

- `supabase/migrations/20260722130000_programs.sql`
- `supabase/migrations/20260724190155_program_permissions.sql`
- `supabase/migrations/20260724204707_programs_insert_returning_rls.sql` — SELECT policy row-local checks so `INSERT…RETURNING` works; INSERT allows org `creator`+
- `supabase/migrations/20260810130000_program_user_state.sql` — per-user Program favorite state and RLS
- `supabase/migrations/20260810220000_program_user_state_grants.sql` — grants application roles table access; RLS still limits authenticated users to their own favorite rows

API:

- `GET/POST/PATCH/DELETE /api/programs`
- `PATCH /api/programs/:id/user-state` with `{ is_favorite }`
- `GET/POST /api/programs/:id/shares`, `DELETE /api/programs/:id/shares/:shareId`
- Move campaign: `PATCH /api/campaigns/:id` with `{ program_id }` (requires Program `edit` on the target program; `null` = General)
- Move space: `PATCH /api/spaces/:id` with `{ campaign_id }` (requires Program `edit` on both the source and destination campaign's Program — see `assertSpaceCampaignMoveAccess`)
- Reorder programs: `PATCH /api/programs/:id` with `{ sort_order }`
- Reorder spaces within a campaign: `PATCH /api/spaces/:id` with `{ sort_order }` (`spaces.sort_order`; migration `20260725074000_spaces_sort_order.sql`)
- Whiteboard: `GET /api/canvas/campaigns/:campaignId/whiteboard`; versioned mutations use `POST /api/canvas/campaigns/:campaignId/whiteboard/operations`
- Share compat report: `GET /api/programs/share-conflicts` (org admin) — read-only list of space shares overridden by Program privacy

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

### Programs overview (`/programs`)

- Lists every accessible program
- Each row opens `/programs/[id]`
- More → Programs click lands here (not `/campaigns`)
- Hovering More → Programs lists the same programs

### Campaigns hub (`/campaigns`)

- Groups under program sections (empty programs still shown)
- Per-program **Campaign** control creates into that program
- Program name links to `/programs/[id]`
- Menu: Move to program / General

### Program overview (`/programs/[id]`)

- Same hub tree scoped to one program (Clients, ROAS Ops, …)
- Top **New campaign** creates into that program
- Link back to **All campaigns**
- Uses the same configurable work-view model as Campaigns: Overview, List, Board, Calendar, and Canvas.
- **Canvas** opens the selected campaign's persistent free-form whiteboard. Programs with multiple campaigns use the existing campaign filter; an empty Program prompts the user to add a campaign first.
- Canvas uses versioned item/connector operations, revision-conflict recovery, realtime operation refresh, and batch Undo/Redo. Its Miro-style shell provides Select/Hand modes, sticky notes, text, shapes, cards, frames, connectors, resizing, locking, duplication, multi-select alignment/distribution, keyboard shortcuts, minimap, pan, and zoom. The resource library places funnels, email sequences, ads, presentations, offers, and avatars as editable linked resource cards without copying their source records.
- Canvas embeds the canonical Pixel chat panel and attaches campaign ID, board ID, revision, viewport, and selected item IDs to every prompt. Pixel uses `get_canvas_board` followed by `apply_canvas_operations`, so prompted funnels, email sequences, and campaign maps are created as the same editable objects humans manipulate. Agent batches refresh in realtime and focus the viewport on their affected bounds. The legacy `create_strategy_node` action remains specific to Workflow and is not a Canvas write path.

### Sidebar Programs panel (rail flyout + hub menu)

ClickUp Spaces–style **fixed-width** panel (label **Programs**, not Campaigns):

| Element      | Behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| First paint  | Instant folders from org-scoped memory/local cache when available; otherwise a stable program-row skeleton. Never flashes a flat campaign list.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| All Tasks    | Top row → `/all-tasks`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Header +     | Create menu: New Program / New Campaign / New Space                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Footer       | **+ New Program**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Icon area    | Colored square tile (`badge-glass-*`) from stored `icon_color`, or a stable deterministic palette pick when `icon_color` is empty; icon swaps to chevron on hover; click expands/collapses                                                                                                                                                                                                                                                                                                                                                                                                             |
| Name         | `body-2` label navigates to program / campaign / space overview; lock icon when `visibility !== workspace`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Hover ⋯ / +  | Program: Add/remove favorite / Share / Rename / Copy link / New campaign / Delete; Campaign: existing campaign menu + new space; Space: existing space menu                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Layout       | ClickUp-style primary flyout aligned below the top bar, 360px wide and nearly full viewport height; long names truncate with ellipsis. Section hairlines separate All Tasks, the Programs tree, and **+ New Program**.                                                                                                                                                                                                                                                                                                                                                                                 |
| Expand state | Persisted in `localStorage` (`roas.sidebar.expandedProgramIds`, `expandedSpaceCampaignIds`). Default = collapsed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Drag-reorder | ClickUp-style `@dnd-kit/sortable` + drop targets: **reorder programs** (persist `programs.sort_order`), **reorder spaces** within a campaign (persist `spaces.sort_order`), **move space** onto another campaign, **move campaign** onto another program/General (drag the campaign header row after an 8px pointer threshold — clicks still navigate). Optimistic UI + rollback + error toast; Program `edit` still gates moves server-side. See `sidebar-tree-dnd.tsx` (`resolveSidebarDrop`, `resolveSidebarReorder`). Campaign same-list reorder is not shipped (`campaigns` has no `sort_order`). |

Campaigns with no `program_id` appear under a **General** folder when present.
Share opens the shared org `ShareModal` with Program visibility (Workspace / Private / Selected) and Viewer/Editor people list (`@/components/org` + `@/lib/org`).
The Programs tree automatically finishes paginating stored spaces in the background, so older
Personal, calendar, client, and operations spaces do not depend on a manual **Load more** click.
Campaign, program, and user-state caches are scoped to the active organization and refresh when
the user switches workspaces. Hovering Programs reuses the programs cache (60s TTL) and does not
refetch campaigns/programs/spaces on every mouseenter; remaining space pages load only after a
campaign/program is expanded.

## All Tasks

- Route: `/all-tasks` (primary sidebar destination; Programs panel also links here)
- Shell breadcrumb: **All Tasks** (path fallback; no duplicate in-page H1)
- API: `GET /api/tasks/rollup?view=my|all&program_id=&campaign_id=`
- Tabs: **My Tasks** | **All Tasks**
- Open top-level space tasks only (status not done/archived)
- Row opens a right-side task card (`HomeTaskDetailHost` panel) and keeps the rollup list mounted. Campaign Tasks list still navigates to `/spaces?space=…&item=…`
- `/home/my-tasks` redirects to `/all-tasks`. The Home dashboard My Tasks card remains.
- Your Turn remains the personal inbox
- Rollup filters campaigns by Program access before loading spaces/items

## Decision Log

- **2026-08-17:** All Tasks is the primary task destination in Simple and Advanced nav. Opening a rollup row keeps the list mounted and shows canonical task detail in a right-side card. `/home/my-tasks` redirects to `/all-tasks`; the Home My Tasks card stays.
- **2026-08-17:** All Tasks uses the shell breadcrumb **All Tasks** and no longer repeats the H1/subtitle in the page body.
- **2026-08-17:** More → Programs hover lists all programs. Clicking Programs opens `/programs` instead of `/campaigns`.
- **2026-08-10:** Program favorites require both row-level policies and table privileges. The repair migration grants authenticated/service roles CRUD access to `program_user_state`; per-user RLS remains the authorization boundary.
- **2026-08-10:** Simple is the default menu style and combines navigation, actual favorite Programs/campaigns/Spaces, Programs, More, and Recents in one sidebar. Pinned chats sit above Recents as their own collapsible section. Programs is a hover-only destination that opens the canonical Programs tree with its existing row menus; Favorites, Pinned, and Recents expand inline. Its collapsed R rail hover-previews the expanded menu. Advanced exposes Home, Inbox, Meetings, My Tasks, Delegation Desk, Favorites, Programs, and More; Team and Brain live under More with their previous nested hover menus. Programs can be favorited per user and appear with campaign/Space favorites.
- **2026-08-10:** Canvas is a first-class free-form whiteboard across Campaign, Program, and Space navigation. Campaign owns the board record; Program selects one child campaign through its campaign filter, and Space resolves its linked campaign. Workflow remains a separate specialized automation graph.
- **2026-08-10:** Canvas persistence is normalized into items, connectors, and versioned operation history. Human and Pixel mutations share one transactional RPC; operation batches support optimistic revisions, realtime refresh, and inverse-operation Undo.
- **2026-08-10:** Canvas exposes native campaign resource cards, inverse-operation Redo, and the live viewport in embedded Pixel context.
- **2026-08-10:** Space, Campaign, and Program hierarchy pages use the same full-width view-strip pattern. Shared core views keep one visual and interaction contract; Campaign-only Brand & Knowledge and Reporting behavior remains level-owned data rather than a separate navigation implementation.
- **2026-07-22:** Programs are a ClickUp Space shell; Campaigns stay folders. Create-in-program auto-sets `program_id`. Org-first seed Clients + ROAS Ops; skip personal backfill. Page Grader campaigns backfill into Clients via `config.source = 'page_grader'` / `external_sources.page_grader`.
- **2026-07-22:** All Tasks rollup ships with My Tasks / All Tasks; space_items only (mission subtasks later).
- **2026-07-23:** Sidebar Campaigns uses Program → Campaign → Space tree (expand in-menu). Program name opens `/programs/[id]` overview. Nested hover spaces flyout removed from Campaigns dock.
- **2026-07-23:** Programs sidebar v2 — rename nav to Programs; fixed-width panel; programs-first load (no flat flash); collapsed default; icon→chevron hover; header create menu; row ⋯/+; All Tasks top; + New Program footer.
- **2026-07-23:** Programs sidebar v3 — All Tasks lives only inside Programs; primary dock flyouts use the tall top-aligned shell; all space pages load in the background; campaign/program caches follow the active organization; Personal campaign detail resolves safely while viewing an organization.
- **2026-07-24:** Program-level permissions MVP — `visibility` + `created_by` + `program_shares`; Nest `ProgramPermissionsService`; inherit into campaign list/get/move, space access intersection, All Tasks rollup; org ShareModal extended for Program; Workspace keeps ACL rows inert; flipping creator-less Program to Private/Selected sets `created_by` to acting user. Compat: space shares outside Program ACL no longer grant access.
- **2026-07-24:** UI rename: program folder **Ungrouped** → **General** (null `program_id`). Canonical ROAS Meetings / CEO HQ / Sales Pipeline live on org General campaign (not cross-org personal injection).
- **2026-07-24:** Create Program failed on prod because `INSERT…RETURNING` evaluated `has_program_access(id)` before the new row was visible to that self-join. Fixed SELECT RLS with row-local `created_by` / workspace-member checks; INSERT aligned to creator+.
- **2026-07-24 (part 2):** Sidebar drag-reorder (dnd-kit) — space→campaign and campaign→program/General from the Programs tree, optimistic with rollback + toast. Inherit harden — space moves assert Program `edit` on source+target (`assertSpaceCampaignMoveAccess`); program access resolution batched via `programsRepo.listByIds` (kills N+1 in `filterAccessibleCampaignsByProgram`). Compat — `detectProgramShareConflicts` + `GET /programs/share-conflicts` (org-admin, read-only) surface space shares that lose access to the Program gate; Share modal shows a lock notice when a space sits in a private Program. See `documentation/features/program-share-privacy-overrides.md`.
- **2026-07-24:** Personal campaigns — **no parallel ACL**. Each org member gets an auto-ensured Private Program (`visibility=private`, `config.personal_default=true`, `created_by=user`). Sidebar **Make personal** moves a campaign into that Program (inherits Program gate). The existing personal-account Home campaign (`org_id` null, `config.system_kind=personal`) stays separate.
- **2026-07-24 (part 3):** Programs flyout visual polish — `body-2` row labels, All Tasks / tree / New Program section dividers, larger flyout title, ClickUp-style colored program icon tiles via `badge-glass-*`. Missing `icon_color` resolves to a stable palette pick (`resolveProgramIconColorId`); explicit picks including `default` are preserved. New Program modal defaults to a random colorful swatch.
- **2026-07-25:** Sidebar same-list reorder — Programs via `programs.sort_order`; Spaces within a campaign via new `spaces.sort_order` + `UpdateSpaceSchema.sort_order`. Campaign header is the discoverable drag source for reparent (replaced opacity-0 grip). Campaign reorder within a program deferred — no `campaigns.sort_order` column yet.
