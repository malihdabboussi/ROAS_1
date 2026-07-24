# Program-level Permissions — Implementation Plan

Date: 2026-07-24
Status: Ready for implementation (phased)
Related: `documentation/features/programs.md`, `.docs/plans/programs-hierarchy-and-all-tasks.md`

## Architect Summary

Programs today are **org-wide nav containers** with no ACL. Any org member who can hit `/api/programs` sees every program; campaigns under them are listed for all org members (campaign `org_campaign_permissions` mainly annotates edit grants, not hide); spaces keep their own `visibility` + `space_shares` model independent of Programs.

This plan adds **Program as the permission boundary**:

| Mode | Who can see the Program (and inherit into its Campaigns + Spaces) |
|------|-------------------------------------------------------------------|
| **Workspace** | All active org members (current default behavior) |
| **Private** | Program owner/creator + people on the Program ACL |
| **Selected people** | Explicit Program ACL only |

Roles at Program: **Viewer** / **Editor** (API values `view` / `edit` to match existing share tables; UI labels Viewer / Editor).

**Inheritance rule (locked):** Campaigns and Spaces under a Program are reachable only if the user has Program access. Effective level = intersection of Program role and any existing campaign/space grant. Program access never expands a tighter space private share; a space share that grants someone **without** Program access is a **compat conflict** — Program gate wins (deny), and migration must call this out.

**Agents:** no agent-specific ACL. Agent tools use the invoking user’s Program access; service-role / policy paths must not bypass Program checks.

**DnD reorganize** (campaign↔program, space↔campaign drag-reorder) is Phase 2 adjacent only — move-via-menu already exists (`PATCH /api/campaigns/:id { program_id }`); do not expand into a full tree DnD plan.

---

## Evidence Pack

### Programs (no ACL today)

- `supabase/migrations/20260722130000_programs.sql` — `programs` table; RLS = personal owner OR `is_org_member(org_id)`; no `visibility`, no shares table; `campaigns.program_id` FK.
- `supabase/migrations/20260723120000_programs_grants.sql` — GRANTs for `authenticated` / `service_role` after RLS-without-grants outage.
- `apps/api/src/modules/programs/dto/programs.dto.ts` — CRUD fields only (`name`, `slug`, `icon`, `icon_color`, `sort_order`); no visibility/ACL.
- `apps/api/src/modules/programs/services/programs.service.ts` — list/get/create/update/delete + `assertProgramInScope` (existence in org only).
- `apps/api/src/modules/programs/repositories/programs.repository.ts` — lists all programs in org/personal scope; org create sets `user_id: null` (no stored creator).
- `apps/api/src/modules/programs/controllers/programs.controller.ts` — `AuthGuard` + `OrgContextGuard` + `OrgRoleGuard`; create `@RequireOrgRole('creator')`; update/delete `'editor'`.
- `apps/web/src/lib/programs/programs-api.ts` — frontend `Program` type mirrors DTO; no ACL fields.
- `documentation/features/programs.md` — hierarchy + UI; Decision Log has no permission model.

### Existing share patterns (to mirror / gate against)

- `supabase/migrations/20260329160000_org_campaign_permissions.sql` + `20260506130200_standardize_share_levels_campaigns.sql` — `org_campaign_permissions` (`org_member_id`, `campaign_id`, `permission` in `admin|edit|view`).
- `supabase/migrations/20260401100000_replace_team_with_org_permissions.sql` — `has_org_campaign_access(campaign_id, min)`: **view = any active org member**; edit requires ocp edit or owner/admin/creator. Campaign list does not hide “unshared” campaigns.
- `apps/api/src/modules/org/controllers/org-sharing.controller.ts` — `GET/PUT/DELETE …/sharing/campaigns/:campaignId/permissions…` (admin manages; editor lists).
- `apps/api/src/modules/org/services/org-sharing.service.ts` + `repositories/org-sharing.repository.ts` — campaign + brain sharing.
- `apps/api/src/modules/campaigns/repositories/campaign-access.repository.ts` — `listOrgCampaignPermissions`.
- `apps/api/src/modules/campaigns/services/campaigns-service-01.base.ts` — annotates `permission` owner/editor/viewer; non-admins without a row still get `viewer` for listed campaigns.
- `apps/web/src/lib/org/org-resource-sharing.ts` — `ShareResourceType = 'campaign' | 'brain'` only; UI labels View only / Full edit.
- `apps/web/src/components/org/ShareModal.tsx` — org ShareModal; not wired for program.
- `documentation/frontend-shared-surfaces.md` — Org UI (`@/components/org`) + `@/lib/org` are the shared sharing surfaces.

### Space ACL (independent today — inheritance conflict surface)

- `supabase/migrations/20260429135500_spaces_space_shares_phase2.sql` + `20260506130000_standardize_share_levels_spaces.sql` — `space_shares` levels `admin|edit|view`.
- `apps/api/src/modules/spaces/services/space-permissions.service.ts` — `resolveSpaceLevelFromSpaceRow`: owner=admin; `private` → shares only; `team` → org-role baseline + shares.
- `apps/api/src/modules/spaces/controllers/space-sharing.controller.ts` — share CRUD + make-private; gated by space effective level.
- `apps/web/src/features/spaces/components/ShareModal.tsx` — space-local share UI (separate from org ShareModal).

### UI surfaces lacking Share/Lock

- `apps/web/src/components/layout/sidebar/SidebarProgramMenuPortal.tsx` — Rename / Copy link / New campaign / Delete only; **no Share or visibility**.
- `apps/web/src/components/layout/sidebar/SidebarProgramFolder.tsx` + hub menus — consume portal; no ACL entry points.
- Move already works: `CampaignsHub` / campaign update → `PATCH /api/campaigns/:id` with `program_id` (`campaigns-service-01.base.ts`).

### Downstream consumers that must respect Program access

- `apps/api/src/modules/programs/services/task-rollup.service.ts` — All Tasks loads campaigns by `program_id` without Program ACL filter.
- Sidebar: `useSidebarCampaignsCore.ts`, `group-sidebar-campaigns-by-program.ts`.
- Agent: `apps/agent-api/.../artifact-legacy-runtime-core.service.ts` + `findOrgCampaignPermission` — campaign permission checks; must inherit user Program gate (no agent bypass).
- Programs module export: `ProgramsModule` exports `ProgramsService` / `ProgramsRepository` for other Nest modules to call.

### Guidelines (shape of change)

- Backend 3-layer vertical slice under `apps/api/src/modules/programs/` (controller → service → repository); Zod DTOs; user-scoped Supabase + RLS (`.docs/guidelines/development/code-guidelines-backend.md`, backend-architecture AuthZ §10).
- Feature docs update when behavior ships (`documentation/features/programs.md`).
- Shared org ShareModal lives in `@/components/org` / `@/lib/org` (`documentation/frontend-shared-surfaces.md`) — extend there rather than a one-off Programs-only modal.

### Schema gap that blocks “Private = owner + selected”

- Org programs are created with `user_id: null` and `org_id` set (`ProgramsRepository.create`). There is **no `created_by`** column today. Private mode requires a durable owner/creator field.

---

## Recommended Approach

**Single source of truth at Program; gate inheritance; do not replace space/campaign share UIs in MVP.**

1. **Schema**
   - Add `programs.visibility` ∈ `workspace | private | selected` (default `workspace`).
   - Add `programs.created_by` uuid (nullable for backfill; set on create).
   - New table `program_shares` (mirror `space_shares` shape simplified): `program_id`, `org_id`, `entity_type` (`user` MVP; allow `org` only if needed later), `entity_id`, `level` (`view` | `edit`), `created_by`, unique `(program_id, entity_type, entity_id)`.
   - RLS helpers: `has_program_access(program_id, min_level)` used by programs SELECT and by campaign/space inheritance.

2. **AuthZ semantics**
   - `workspace`: any active org member → at least `view`; org role maps Editor baseline for owner/admin/creator/editor the same way space team baseline maps (reuse `OrgRole` → level pattern from `space-permissions.service.ts` `ORG_BASELINE_LEVEL`, but Program roles stop at Viewer/Editor — map space `admin` baseline → Program `edit`).
   - `private`: `created_by` always `edit`; plus matching `program_shares` rows.
   - `selected`: only matching `program_shares` (+ `created_by` always retains manage ability so the Program cannot be locked out).
   - Org **owner/admin** can always manage Program ACL / visibility (break-glass), consistent with campaign share `@RequireOrgRole('admin')`.

3. **Inheritance (intersection)**
   - Campaign: extend `has_org_campaign_access` (or wrap in Nest assert) so if `campaigns.program_id` is set, Program access is required; if `program_id` is null (**General**), keep today’s org-member view semantics.
   - Space: in `SpacePermissionsService.resolveSpaceAccessScope` / `assertCanAccessSpace`, after resolving space level, load `spaces.campaign_id` → `campaigns.program_id` → require Program access; effective level = min(programLevel, spaceLevel).
   - List endpoints filter invisible Programs first; campaigns/spaces under invisible Programs omit from sidebar, hub, All Tasks rollup, and agent `list_campaigns`.

4. **API ownership**
   - Keep Program ACL under `programs` module (not `org-sharing.controller`), with routes parallel to space sharing:
     - `GET /programs/:id/shares`
     - `PUT/POST /programs/:id/shares`
     - `DELETE /programs/:id/shares/:shareId`
     - `PATCH /programs/:id` accepts `visibility`
   - Reuse org member roster UX via extending `ShareResourceType` with `'program'` in `@/lib/org` + ShareModal labels Viewer/Editor.

5. **Why not fold into `org_campaign_permissions`?**
   - Product boundary is Program, not Campaign. Propagating ACL rows to every campaign on each change duplicates data and fights space-local private shares. Gate-at-Program + intersection is smaller and matches “inherit.”

6. **What not to do in MVP**
   - No Campaign/Space visibility modes as the primary ACL.
   - No agent entity shares on `program_shares`.
   - No full sidebar DnD plan (mention only).
   - No deleting or rewriting space ShareModal; document conflict when space shareee lacks Program access.

---

## Step-By-Step Implementation Plan

### Phase 0 — Product/schema locks (pre-code)

1. Confirm Private vs Selected distinction for implementers:
   - **Private** = deny-by-default except `created_by` + ACL.
   - **Selected people** = ACL-only visibility (same deny-by-default; UI copy differs; both use `program_shares`).
   - Both store ACL the same way; `visibility` discriminates intent and default create behavior.
2. Confirm system programs (`clients`, `roas_ops`): default `workspace`; visibility changes allowed for org admin only (recommended).
3. Confirm General (`program_id` null): remains workspace-equivalent (all org members who see org campaigns).

### Phase 1 — Schema + RLS helper (MVP foundation)

4. **New migration** `supabase/migrations/YYYYMMDDHHMMSS_program_permissions.sql` (timestamp at implement time)
   - Change:
     - `ALTER TABLE programs ADD COLUMN visibility text NOT NULL DEFAULT 'workspace' CHECK (visibility IN ('workspace','private','selected'));`
     - `ALTER TABLE programs ADD COLUMN created_by uuid REFERENCES auth.users(id);`
     - Backfill `created_by` where discoverable (leave null if unknown; treat null + workspace as today; for private/selected require created_by or org admin).
     - `CREATE TABLE program_shares (...);` indexes; RLS; GRANTs.
     - `CREATE OR REPLACE FUNCTION has_program_access(p_program_id uuid, p_min_level text DEFAULT 'view')` SECURITY DEFINER.
     - Replace `programs_select` / update policies to use `has_program_access` (insert stays creator/admin patterns).
     - Update `has_org_campaign_access` to AND Program access when `c.program_id IS NOT NULL`.
   - Why: Programs RLS is currently org-wide SELECT; without DB-level gate, Nest filters alone are incomplete under user-scoped clients.
   - Contract: visibility default `workspace` → zero behavior change until users flip modes.
   - Tests: SQL/pgTAP or Nest tests against helper via service; migration applied on develop first.

5. **`apps/api/src/modules/programs/dto/programs.dto.ts`**
   - Change: extend `ProgramRow`, `CreateProgramSchema`, `UpdateProgramSchema` with `visibility`; add share DTOs (`ProgramShareLevelSchema` = `view|edit`, upsert/delete param schemas).
   - Why: Zod is the Nest contract boundary.
   - Tests: schema unit tests for invalid visibility/level.

6. **New** `apps/api/src/modules/programs/repositories/program-permissions.repository.ts`
   - Change: load program for access; list/upsert/delete `program_shares`; set visibility.
   - Why: 3-layer split; keep `programs.repository.ts` CRUD focused (LOC).
   - Tests: repository mocked in service tests.

7. **New** `apps/api/src/modules/programs/services/program-permissions.service.ts`
   - Change: `resolveProgramLevel`, `assertProgramAccess`, `listShares`, `upsertShare`, `deleteShare`, `setVisibility`; LEVEL_WEIGHT `view < edit`.
   - Why: mirror `SpacePermissionsService` resolve/assert pattern without importing space module into programs for the core gate (spaces will call programs).
   - Contract: throws `ForbiddenException` on insufficient access; returns effective level for UI.
   - Tests: `program-permissions.service.test.ts` — workspace / private / selected / owner / ACL / org admin break-glass.

8. **`apps/api/src/modules/programs/services/programs.service.ts`**
   - Change: `list`/`getById` filter or assert via permissions service; `create` sets `created_by = userId`, default `visibility: 'workspace'` (or accept create-time visibility); `update` visibility only if caller has `edit` (or org admin); `assertProgramInScope` upgraded to access-aware or call sites switch to `assertProgramAccess`.
   - Why: list must not return private programs to non-ACL members.
   - Tests: extend `programs.service.test.ts`.

9. **`apps/api/src/modules/programs/controllers/programs.controller.ts`** (+ optional new `program-sharing.controller.ts` if LOC pushes)
   - Change: share routes; pass `CurrentUser` + `scope.orgRole` into asserts; keep `@RequireOrgRole` floors but **do not** rely on org role alone for private programs.
   - Why: controller stays thin; AuthZ in service.
   - Tests: controller route-order test if new parameterized routes risk colliding with `:id`.

10. **`apps/api/src/modules/programs/programs.module.ts`**
    - Change: register permissions repository/service; export `ProgramPermissionsService` for campaigns/spaces/agent consumers.
    - Why: inheritance callers need DI.

11. **`apps/api/src/modules/programs/repositories/programs.repository.ts`**
    - Change: create payload includes `created_by`, `visibility`; optional filtered list helpers if not done purely in service after fetch.
    - Why: durable owner for Private.

### Phase 2 — Inheritance into Campaigns, Spaces, All Tasks, Agents

12. **`supabase` helper + Nest campaign list**
    - Change: `has_org_campaign_access` (migration above) + `campaigns-service-01.base.ts` list/get: omit or 404 campaigns whose Program is inaccessible; map Program `edit` into annotated permission when present.
    - Why: evidence shows list currently annotates everyone as viewer.
    - Tests: campaign list tests for private program exclusion.

13. **`apps/api/src/modules/spaces/services/space-permissions.service.ts`**
    - Change: after space-level resolve, require Program access via injected `ProgramPermissionsService` (or shared SQL helper through repo). Effective = min(program, space).
    - Why: product inherit; prevents space `team` visibility from leaking Program-private trees.
    - Contract: user with space share but no Program access → Forbidden.
    - Tests: extend `space-permissions.service.test.ts` with program gate cases.
    - Compat: document existing shares that become unreachable until Program ACL updated.

14. **`apps/api/src/modules/programs/services/task-rollup.service.ts` + `task-rollup.repository.ts`**
    - Change: filter campaigns/programs by `has_program_access` before loading spaces/items.
    - Why: All Tasks must not leak private Program tasks.
    - Tests: extend `task-rollup.service.test.ts`.

15. **Move campaign into Program** (`campaigns-service-01.base.ts` program_id patch path)
    - Change: moving into a Program requires Program `edit`; moving out of inaccessible Program blocked; moving into Private Program does not auto-grant movers beyond their Program role.
    - Why: move already exists; must not become an ACL bypass.
    - Tests: update campaign program_id forbidden without Program edit.

16. **Agent paths** (`apps/agent-api` campaign access / `list_campaigns` / `findOrgCampaignPermission`)
    - Change: when resolving accessible campaigns, apply Program gate for the **invoking user** (same as Nest). No `program_shares.entity_type = agent`.
    - Why: locked product rule — agents inherit user access, never bypass.
    - Tests: artifact RBAC / list_campaigns tests for private program exclusion.

### Phase 3 — UI

17. **`apps/web/src/lib/org/org-resource-sharing.ts` + org API helpers**
    - Change: `ShareResourceType` += `'program'`; permission labels **Viewer** / **Editor**; load/save via `/api/programs/:id/shares` (and visibility PATCH).
    - Why: shared surface registry requires extending `@/lib/org`, not a feature-private modal.
    - Tests: extend `ShareModal.test.tsx` / hook tests for program resource type.

18. **`apps/web/src/components/org/ShareModal.tsx` (+ people list if needed)**
    - Change: support program resource; visibility mode control (Workspace / Private / Selected people) for program only.
    - Why: campaign|brain modal today has no visibility enum; Program needs it.
    - Contract: toggling to Workspace may keep ACL rows but ignore them until mode changes back (or clear ACL — pick one in implementation and document; recommend **keep rows, ignore when workspace** for undo-friendly UX).

19. **`apps/web/src/lib/programs/programs-api.ts`**
    - Change: types + `listProgramShares` / `upsertProgramShare` / `deleteProgramShare` / visibility on update.
    - Tests: none required beyond typed callers.

20. **`apps/web/src/components/layout/sidebar/SidebarProgramMenuPortal.tsx`**
    - Change: add **Share** / **Access** menu item → open ShareModal for program; optional lock icon when `visibility !== 'workspace'`.
    - Why: evidence — menu has no Share today.
    - Tests: portal unit test for menu item presence (non-system vs system rules).

21. **Sidebar + hub filtering**
    - Change: consumers of `fetchPrograms` / campaign lists already get filtered API data; ensure UI does not cache stale all-programs across org switch (existing org-scoped caches — verify).
    - Files: `useSidebarCampaignsCore.ts`, `CampaignsHub.tsx`, `/programs/[id]/page.tsx` (404/forbidden empty state if no access).
    - Why: client must not assume every program id is listable.

22. **Feature messages**
    - Change: add Program share errors/toasts via existing org toast errors or Programs-local config if present; otherwise extend `ORG_TOAST_ERRORS` / programs messages.
    - Why: AGENTS.md feature user-facing states.

### Phase 4 — Docs, changelog, harden

23. **`documentation/features/programs.md`**
    - Change: Data model (visibility, program_shares, created_by); AuthZ; inheritance; Decision Log entries; Last Modified.
    - Include migration/compat note: space shares to users outside Program ACL no longer grant access.

24. **Changelog** `.docs/logs/changelogYYYY-MM-DD.md` on implement day.

25. **Harden**
    - Audit all `from('programs')` / campaign list / space list call sites for missing gates.
    - Perf: batch Program access for sidebar (avoid N+1 share queries) — list accessible program ids once per request.
    - Follow-up log if `space-permissions.service.ts` (509 LOC) or ShareModal grows past architecture limits.

### Phase 2 adjacent (out of this plan’s build steps)

26. **Drag-reorder** campaign↔program / space↔campaign
    - Evidence: move-via-API exists; tree DnD is not half-built for Programs (dnd-kit used in spaces list/docs/home, not Program tree).
    - Mention only: future UX can reuse `program_id` patch + space `campaign_id` updates; still must call Program `edit` asserts. No file-level DnD plan here.

---

## Data And Contract Map

| Concern | Contract |
|--------|----------|
| **Input** | Create/update Program: optional `visibility`. Share upsert: `{ entity_type: 'user', entity_id: userId, level: 'view'\|'edit' }`. |
| **Validation** | Zod in `programs.dto.ts`; visibility enum; level enum; entity must be active org member. |
| **AuthN** | Existing `AuthGuard` + user-scoped Supabase. |
| **AuthZ** | `has_program_access` (RLS) + Nest `ProgramPermissionsService.assert*`; org admin break-glass for ACL management; Program `edit` required to change visibility/ACL and to move campaigns into Program. |
| **Storage** | `programs.visibility`, `programs.created_by`, `program_shares`. |
| **Output** | Program payloads include `visibility`, `created_by`, optional `effective_level`, `campaign_count` (counts only accessible campaigns). Share list returns rows + effective level. |
| **Side effects** | Optional: gateway sync not required for Program ACL (campaign share triggers agent sync today — only add if product needs runtime refresh). |
| **Idempotency** | Share upsert unique `(program_id, entity_type, entity_id)`. |
| **Inheritance** | Campaign/Space access requires Program access when `program_id` set; effective level = min(program, local). |
| **Agents** | Invoke as user; no agent rows on `program_shares`. |
| **General** | `program_id` null → no Program gate (existing org campaign access). |

### Role vocabulary mapping

| Product | API / DB | Space analog | Org ShareModal today |
|---------|----------|--------------|----------------------|
| Viewer | `view` | `view` | “View only” → relabel Viewer for program |
| Editor | `edit` | `edit` (space also has `admin`) | “Full edit” → Editor; Program has no separate Admin role — manage ACL = owner/`created_by` or org admin |

---

## Test Plan

- **Unit:** `program-permissions.service` modes; DTO zod; ShareModal/hook program type; sidebar menu Share entry.
- **Integration:** programs list hides private; getById 403; share upsert/delete; campaign list excludes; space assert denies without Program; task rollup excludes; move campaign into private Program requires edit.
- **Agent:** `list_campaigns` / campaign context denies private Program without user ACL.
- **Regression:** workspace default unchanged for existing orgs; system Clients/ROAS Ops still visible to all members; General folder unchanged; space private owner still works when Program is workspace.
- **Manual:** two org members — A creates Private Program + ACL B as Viewer; B sees Program read-only; C sees nothing; space inside remains inaccessible to C even if previously team-visible.

---

## Rollout And Verification

- Apply migration on develop → verify RLS with two test users.
- Deploy API before UI (UI without fields still works with defaults).
- Feature flag: **not required** if default `workspace` preserves behavior; optional flag only if wanting staged UI.
- Logs: Forbidden counts on `/api/programs` and space access after enable.
- Rollback: set all `visibility` back to `workspace` or revert migration; shares table can remain inert.

---

## Phases (MVP → harden)

| Phase | Ship |
|-------|------|
| **MVP** | Schema + RLS helper; Program CRUD awareness; share API; list/get filter; sidebar Share + ShareModal program mode; campaign list + All Tasks gate |
| **Inherit harden** | Space permissions intersection; move asserts; agent list/context; batch access resolution |
| **Compat** | Audit/report space shares that conflict with Program ACL; admin messaging in Share UIs |
| **Later** | DnD reorganize; Campaign/Space ACL UX simplification; team/group entity types on `program_shares`; Admin role if needed |

---

## Out of scope

- Campaign-level or Space-level as the primary permission boundary.
- Agent-specific Program ACL.
- Full Program tree drag-and-drop redesign.
- Reworking brain sharing or conversation sharing.
- Replacing `org_campaign_permissions` or deleting space ShareModal.
- Personal-account (`org_id` null) Program ACL redesign (personal programs already owner-scoped via `user_id`); org-context is the target.
- Changing ClickUp naming / General rename.

---

## Acceptance criteria

1. New org Programs default to **Workspace**; every active member sees them as today.
2. Setting a Program to **Private** or **Selected people** hides it from non-ACL members in sidebar, `/programs/[id]`, Campaigns hub grouping, All Tasks, and campaign/space APIs under that Program.
3. ACL grants **Viewer** (read) vs **Editor** (mutate Program metadata, manage shares if policy allows, create/move campaigns in Program).
4. Campaigns and Spaces under a restricted Program inherit the gate (intersection with existing space ACL).
5. Space share to a user **without** Program access does not grant entry (Program wins); documented as migration risk.
6. Agents cannot access content in a Program the invoking user cannot access.
7. System programs remain non-deletable; visibility policy for them follows Phase 0 lock (workspace default).
8. No DnD requirement to ship permissions MVP.
9. Docs + changelog updated when behavior ships.

---

## Open questions (blocking only)

1. **`created_by` backfill for existing programs:** Existing org programs have no creator. For MVP, keep them `visibility=workspace`. If an admin switches an existing Program to Private/Selected without `created_by`, **require setting an owner** (admin assigns) or treat org admins as sole managers until `created_by` is set. Implementer must pick one and encode in migration/UI — do not leave Private Programs with zero managers.

Non-blocking (decide during implement, document in Decision Log):

- Whether Workspace mode **ignores** vs **deletes** ACL rows.
- Whether Program Editor may manage shares or only `created_by` + org admin (recommend: Editor can add Viewer/Editor shares; only created_by/org admin can set visibility to Private/Selected or delete Program).
- Whether Clients/ROAS Ops visibility can leave Workspace.

---

## Missing Evidence

- None blocking for this plan. Supabase live row samples for existing `programs.created_by`-less rows are assumed empty of creator (schema evidence). If implementers need exact backfill candidates, smallest experiment: `SELECT id, org_id, name, system_kind FROM programs WHERE deleted_at IS NULL;` on develop — risk if skipped: none for workspace default.

---

## Quality gate checklist

- [x] Request-only scope (Program ACL + inherit; DnD mentioned not planned)
- [x] Every path exists or marked new
- [x] Claims backed by Evidence Pack
- [x] Old behavior replaced at RLS + Nest list gates (not additive-only UI hide)
- [x] Docs/changelog called out for ship
- [x] Compat risk (space shares vs Program) explicit
