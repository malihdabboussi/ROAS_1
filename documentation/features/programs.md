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

### Sidebar Campaigns tree (rail flyout + hub menu)

ClickUp-style expandable folders in the Campaigns menu (not section labels only):

| Action              | Result                                                   |
| ------------------- | -------------------------------------------------------- |
| Chevron on Program  | Expand/collapse campaigns under that program (persisted) |
| Click Program name  | Navigate to `/programs/[id]`                             |
| Chevron on Campaign | Expand/collapse spaces under that campaign (persisted)   |
| Click Campaign name | Navigate to `/campaigns/[id]`                            |
| Click Space         | Open space (same as today)                               |
| Favourite campaigns | Stay pinned at top of the list                           |

Ungrouped campaigns (no `program_id`) appear under an **Ungrouped** folder when present. First visit expands all programs by default; later expand state is stored in `localStorage`.

## All Tasks

- Route: `/all-tasks` (hub nav + Campaigns hub link)
- API: `GET /api/tasks/rollup?view=my|all&program_id=&campaign_id=`
- Tabs: **My Tasks** | **All Tasks**
- Open top-level space tasks only (status not done/archived)
- Row opens `/spaces?space=…&item=…`
- Your Turn remains the personal inbox

## Decision Log

- **2026-07-22:** Programs are a ClickUp Space shell; Campaigns stay folders. Create-in-program auto-sets `program_id`. Org-first seed Clients + ROAS Ops; skip personal backfill. Page Grader campaigns backfill into Clients via `config.source = 'page_grader'` / `external_sources.page_grader`.
- **2026-07-22:** All Tasks rollup ships with My Tasks / All Tasks; space_items only (mission subtasks later).
- **2026-07-23:** Sidebar Campaigns uses Program → Campaign → Space tree (expand in-menu). Program name opens `/programs/[id]` overview. Nested hover spaces flyout removed from Campaigns dock.
