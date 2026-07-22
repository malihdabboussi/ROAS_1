# Programs Hierarchy + All Tasks — Implementation Plan

Date: 2026-07-22  
Status: Ready for implementation (phased)

## Architect Summary

Add **Programs** as a ClickUp **Space shell** above Campaigns:

| ClickUp | ROAS |
|--------|------|
| Space | **Program** (nav shell / bucket) |
| Folder | **Campaign** |
| List | **Space** |
| All Tasks | **All Tasks** rollup (later) |

Create campaign **inside a program** → `program_id` set automatically. Campaigns stay campaigns (Page Grader / knowledge unchanged).

**ROAS-org-first:** seed **Clients** + **ROAS Ops**. Skip personal-account program backfill. Ungrouped = `program_id` null.

**Default views (All Tasks later):** My Tasks + All Tasks only.

---

## Default Views Decision

**Seed defaults: yes, two only.**

Why:

- ClickUp’s All Tasks is useful because it ships with a usable starting point; empty boards feel broken.
- **My Tasks** already matches how people work (and overlaps Your Turn’s job, but as a full board with columns, not only an inbox).
- **All Tasks** is the manager/ops view across clients.
- Extra defaults (QA, Workload, Overdue) should be **user-created** once saved views exist — seeding too many creates noise and rename debt.

Scope behavior:

- Open **All Tasks** with no program selected → org-wide (or personal-account-wide).
- Open All Tasks **inside** program Clients → same two tabs, scoped to that program’s campaigns.
- Campaign / Space keep existing space views; no forced new defaults there in v1.

---

## Evidence Pack

- `apps/api/src/modules/campaigns/repositories/campaigns.repository.ts` — campaigns listed by `org_id` / personal; `system_kind` via `config` (`general`, `personal`).
- `apps/web/src/lib/campaigns/campaign-api.ts` — `Campaign` type; no `program_id` today.
- `apps/web/src/app/(dashboard)/campaigns/_components/CampaignsHub.tsx` — flat campaign list + expand → spaces; Personal injected in org context.
- `apps/web/src/components/layout/sidebar/SidebarHqSpacesRows.tsx` — hover flyout lists campaigns/spaces flat.
- `supabase/migrations/20260525113500_your_turn_exclude_archived.sql` (+ later recreations) — `your_turn_items` is assignee=`auth.uid()` only; not “all org tasks”.
- `apps/api/src/modules/your-turn/*` — person-scoped inbox API, optional campaign filter.
- `supabase/migrations/20260401100000_replace_team_with_org_permissions.sql` — org RLS pattern on `campaigns`.
- `supabase/migrations/20260525214800_org_general_campaign_singleton.sql` — General system campaign conventions.
- `documentation/features/page-grader-campaign-brain-sync.md` — client = ROAS campaign; must not break.
- No existing `programs` table / `program_id` in repo (search confirmed).

---

## Recommended Approach

1. **New table `programs`** + **`campaigns.program_id`** FK (nullable).
2. Seed system programs per org (and personal account): Clients, ROAS Ops, Personal.
3. Backfill: Page Grader / client campaigns → Clients; Personal system campaign → Personal; leave others Ungrouped or ROAS Ops by heuristic only where evidence is clear.
4. UI: group Campaigns hub + sidebar by program; All Tasks page with two default views.
5. Defer: custom saved views at Program/Campaign levels; workload; QA presets.

---

## Data And Contract Map

### New table: `programs`

```sql
programs (
  id uuid PK default gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  org_id uuid NULL REFERENCES organizations(id),  -- null = personal account
  name text NOT NULL,
  slug text NOT NULL,                             -- clients | roas-ops | personal | custom
  system_kind text NULL,                          -- 'clients' | 'roas_ops' | 'personal' | null
  icon text NULL,
  icon_color text NULL,
  sort_order int NOT NULL default 0,
  config jsonb NOT NULL default '{}',
  created_at timestamptz NOT NULL default now(),
  updated_at timestamptz NOT NULL default now(),
  deleted_at timestamptz NULL
)
```

Constraints:

- Unique active `(org_id, slug)` where `org_id IS NOT NULL` and `deleted_at IS NULL`
- Unique active `(user_id, slug)` where `org_id IS NULL` and `deleted_at IS NULL`
- Unique active system program per scope: one `system_kind` per `(org_id)` / personal user

RLS: mirror campaigns — owner + org members view/edit per existing org helpers.

### Alter: `campaigns`

```sql
ALTER TABLE campaigns
  ADD COLUMN program_id uuid REFERENCES programs(id) ON DELETE SET NULL;

CREATE INDEX idx_campaigns_program_id ON campaigns(program_id) WHERE deleted_at IS NULL;
```

Semantics:

- `program_id NULL` → UI bucket **Ungrouped**
- Moving campaign updates `program_id` only; spaces/brains/knowledge untouched

### Optional later (phase 2 schema stub, not required for v1 UI hardcode):

`program_views` / reuse space schema pattern for saved All Tasks views:

```text
scope_type: 'all_tasks' | 'program' | 'campaign'
scope_id: uuid | null  -- null for org-wide All Tasks
name, is_system, filters jsonb, display jsonb, sort_order
```

v1 can hardcode My Tasks / All Tasks in the frontend without a views table; add persistence when users need custom views.

### API contracts (new)

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/programs` | List programs for current org/personal scope, with campaign counts |
| POST | `/programs` | Create custom program |
| PATCH | `/programs/:id` | Rename, icon, sort_order |
| DELETE | `/programs/:id` | Soft-delete; SET NULL campaign.program_id (or block if system_kind set) |
| PATCH | `/campaigns/:id` | Accept `program_id` (move) |
| GET | `/programs/:id/tasks` or `/tasks/rollup` | All Tasks query: filters `program_id`, `campaign_id`, `assignee=me\|all`, status open |

AuthZ: same OrgContextGuard / OrgRoleGuard as campaigns.

All Tasks data source (v1):

- Primary: `space_items` joined through `spaces.campaign_id` → `campaigns` → optional `programs`
- Include human `mission_subtasks` only if product wants parity with Your Turn; **recommend space_items first** to keep v1 simple; document mission subtasks as phase 2.

---

## Step-By-Step Implementation Plan

### Phase 0 — Product locks (done in this plan)

- Name: **Programs**
- Defaults on All Tasks: **My Tasks**, **All Tasks**
- System programs: Clients, ROAS Ops, Personal

### Phase 1 — Schema + API

1. `supabase/migrations/YYYYMMDDHHMMSS_programs.sql`
   - Create `programs`, RLS, indexes, `campaigns.program_id`
   - Seed function / migration SQL: for each org + each personal user with campaigns, insert three system programs
   - Backfill:
     - `config.system_kind = 'personal'` → Personal program
     - campaigns with Page Grader external source / mapped clients → Clients (evidence: `config.source = 'page_grader'` or `config.external_sources.page_grader`)
     - remaining org campaigns → Ungrouped (`program_id` null) **or** ROAS Ops only if name/heuristic is explicit — prefer null over wrong assignment
   - Tests: migration idempotency notes; RLS smoke via API tests

2. `apps/api/src/modules/programs/` (new Nest module)
   - `programs.controller.ts`, `programs.service.ts`, `programs.repository.ts`, Zod DTOs
   - Wire into app module
   - Tests: list/create/move campaign into program; system program cannot delete

3. `apps/api/src/modules/campaigns/`
   - Extend update DTO/service to accept `program_id`
   - Ensure `findByUserId` select includes `program_id`
   - Tests: move campaign between programs

4. Types
   - `apps/web/src/lib/campaigns/campaign-api.ts` — add `program_id`
   - New `apps/web/src/lib/programs/` API client + types

### Phase 2 — Navigation + Campaigns hub

5. `apps/web/src/app/(dashboard)/campaigns/_components/CampaignsHub.tsx` (+ card helpers)
   - Group campaigns under program sections (expandable)
   - Drag or menu: Move to program
   - Create campaign → optional program picker (default Clients for org)

6. Sidebar HQ spaces flyout
   - `SidebarHqSpacesRows.tsx`, `SidebarHqSpacesMenuLayers.tsx`, related utils
   - Nest: Program → Campaign → Spaces (or Program headers with campaign children)
   - Keep Personal injection behavior compatible with Personal program

7. Docs
   - `documentation/features/programs.md` (new) — hierarchy, defaults, mapping to ClickUp
   - Update `documentation/features/page-grader-campaign-brain-sync.md` Decision Log: campaign still = client; program = grouping only
   - Changelog on ship

### Phase 3 — All Tasks rollup UI

8. Route: `apps/web/src/app/(dashboard)/all-tasks/page.tsx` (or `/programs/all-tasks`)
   - Tabs: My Tasks | All Tasks (defaults)
   - Filters: program, campaign, due date, status
   - Columns: title, campaign, space, assignee, due, status
   - Deep link to existing space item URL pattern from Your Turn

9. API: `GET /tasks/rollup` (or under programs module)
   - Query params: `view=my|all`, `program_id?`, `campaign_id?`, `limit`
   - Org RLS via user supabase client
   - Tests: my vs all; program scope excludes other programs

10. Nav entry
    - Sidebar / Campaigns hub top row: **All Tasks** (like ClickUp)
    - Optional: Your Turn remains person-inbox; All Tasks is the board. Do not delete Your Turn in v1.

### Phase 4 — Later (out of v1)

- Persist custom views (`program_views`)
- Program-level and campaign-level saved views
- Mission subtasks in rollup
- Workload / QA preset views
- Auto-assign new Page Grader campaigns to Clients program on create (small follow-up in `page-grader-client-import.service.ts`)

---

## Test Plan

- Unit: programs service CRUD; campaign move; rollup filter my vs all
- Integration: RLS — org A cannot see org B programs; personal programs isolated
- Manual: seed Clients/ROAS Ops/Personal; move Sakha into Clients; All Tasks shows both campaigns’ open items; My Tasks shows only mine
- Regression: Page Grader sync still targets campaign id; Campaign Knowledge unchanged; Personal Meetings still under Personal campaign

---

## Rollout And Verification

1. Apply migration on staging → verify seed counts
2. Deploy `roas-api` then `roas-web`
3. Verify sidebar grouping + All Tasks defaults
4. Rollback: nullable `program_id` + soft-delete programs; UI can ignore program_id if column present

---

## Missing Evidence / Open Items

- Exact `campaigns` column list in live ROAS DB (Supabase MCP for ROAS host not available in this session): confirm no conflicting `program_id` before migration — **smallest experiment:** `\d campaigns` / `information_schema.columns` on ROAS prod.
- Whether Page Grader create path should auto-set `program_id` to Clients in the same PR — recommend **yes** as a one-liner once Clients system program id is resolvable.
- All Tasks include docs/folders or tasks-only — **recommend tasks-only** (`item_type` / schema type filter) for v1 clarity.

---

## Acceptance Criteria (v1)

- [x] Programs exist per org (Clients, ROAS Ops); Personal deferred
- [x] Campaigns can be assigned to a program; hub + sidebar group by program
- [x] All Tasks surface with default tabs **My Tasks** and **All Tasks**
- [ ] Campaign / Space / Page Grader / Campaign Knowledge behavior unchanged (verify after migration + deploy)
- [x] Docs + changelog updated
