# Programs

Last Modified: July 22, 2026

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

- Campaigns hub groups under program sections (empty programs still shown)
- Per-program **Campaign** control creates into that program
- Menu: Move to program / Ungrouped
- Sidebar HQ spaces list uses program headers above campaign rows

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
