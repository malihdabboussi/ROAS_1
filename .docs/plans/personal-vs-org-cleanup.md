# Personal vs Org Encoding — Architectural Cleanup Plan

**Author:** Cursor agent (analysis), pending Sefy approval
**Date drafted:** 2026-05-08
**Status:** EXECUTED — 2026-05-08
**Related incident:** [2026-05-08 14:55 changelog] — false 403 on `space_items` deletion caused by `org_id = user_id` mismatch

---

## 1. Goal

Make every code path and every DB row consistently and correctly encode the **personal account** vs **organization** context, so that:

- Personal-account flows are clean (`org_id IS NULL`, owner does everything, no permission machinery).
- Org flows are clean (`org_id = <real org uuid>`, full RBAC via `org_members` + `space_shares`).
- Cross-mode queries cannot leak (personal context can't see org rows; org context can't see personal rows).
- The codebase has **one** place that defines "what is personal vs org", instead of 5 copies of `applyOwnerScope` and 9+ `?? userId` fallbacks scattered everywhere.

This is the long-term fix that follows the hotfix shipped on 2026-05-08.

---

## 2. Source of truth: how personal/org is supposed to work

From `apps/docs/content/organization/how-organizations-work.mdx`:

> Vibey has two contexts: your personal account and your organization. You switch between them from the sidebar. Almost everything in Vibey is scoped to whichever context you're in.

| Concept | Personal | Organization |
|---|---|---|
| `campaigns.org_id` | **NULL** | real org uuid |
| `missions.org_id` | NULL | real org uuid |
| `spaces.org_id` | **`user_id` (workaround for NOT NULL)** ❌ | real org uuid |
| `space_items.org_id` | **`user_id` (workaround for NOT NULL)** ❌ | real org uuid |
| Permission resolver | `space.user_id === userId → admin`, no other checks | `org_role` baseline + `space_shares` + `space_view_shares` + `space_item_shares` + `is_private` gating |
| Frontend signal | omit `X-Org-Id` header | send `X-Org-Id: <orgUuid>` |
| Backend `RequestScope` | `{ orgId: null, orgRole: null }` | `{ orgId, orgRole }` |

**The system is 95% already on the right model.** The only schema offenders are `spaces` and `space_items`. Code-side, ~9 places encode the workaround; ~5 places have the cross-mode leak in `applyOwnerScope`.

---

## 3. Audit findings (DB)

Ran on production `qfrvykscoymiwwgysvsr` on 2026-05-08.

### 3.1 Every table that has both `org_id` and `user_id`

90 tables total. Of those:

- **4 tables have `org_id NOT NULL`** and need to be migrated to nullable:
  - `spaces` — 8 of 21 rows have `org_id = user_id` (personal)
  - `space_items` — 166 of 264 rows have `org_id = user_id` (personal — likely all owned by `space.user_id`, will verify)
  - `space_drive_folder_mappings` — drive integrations, **must support personal** (Sefy confirmed 2026-05-08)
  - `space_drive_push_channels` — drive integrations, **must support personal** (Sefy confirmed 2026-05-08)
- **1 table is infrastructure** (no personal/org concept, leave alone):
  - `org_members` — join table, NOT NULL is correct
- **86 tables already have `org_id NULLABLE`** and use `NULL` for personal correctly. Examples:
  - `campaigns` (132/182 personal use NULL ✓)
  - `missions` (120/190 NULL ✓)
  - `forms`, `funnels`, `sequences`, `ads`, `ad_sets`, `ad_campaigns`
  - `agent_skills`, `agent_definitions`, `agent_teams`, `agents_registry`
  - `user_widgets`, `user_workspaces`, `user_addons`, `user_integrations`
  - `conversations`, `messages`, `channels`, `channel_members`
  - `contacts`, `leads`, `segments`, `presentations`, `offers`, `branding_themes`
  - `media_assets`, `vault_secrets`, `vb_agent_traces`, `ai_usage_events`
  - …and ~60 more

**So the schema migration scope is exactly: `spaces` + `space_items` + `space_drive_folder_mappings` + `space_drive_push_channels`.**

### 3.2 Existing RLS already handles `org_id IS NULL`

Critical finding: the existing RLS policies on `spaces` and `space_items` ALREADY treat `org_id IS NULL` as the personal marker correctly:

```
"Org members can read team spaces":
  (visibility = 'team') AND (org_id IS NOT NULL) AND is_org_member(org_id)

"Users can read own spaces":
  (auth.uid() = user_id)

"Org members can read team space items":
  (is_private = false) AND (org_id IS NOT NULL) AND is_org_member(org_id) AND ...
```

The org policies all guard with `org_id IS NOT NULL`, and the personal policies use `auth.uid() = user_id`. **The DB layer is already ready for `NULL`-encoded personal — the only thing stopping us is the `NOT NULL` constraint and the application code that assumes a value.**

### 3.3 Code: `?? userId` poison fallback

Found in 9 places (in addition to the spaces module already audited):

| File | Line | Tables affected | Status |
|---|---|---|---|
| `apps/api/src/modules/spaces/spaces.repository.ts` | 159 | spaces | Required today (NOT NULL); remove after schema change |
| `apps/api/src/modules/spaces/spaces.repository.ts` | 253 | space_items | Required today (NOT NULL); remove after schema change |
| `apps/api/src/modules/spaces/spaces.service.ts` | 792 | space_items (transfer copy) | Required today; remove after schema change |
| `apps/api/src/modules/spaces/spaces.service.ts` | 979 | missions | **Bug today** — `missions.org_id` IS nullable; should already be NULL not userId |
| `apps/agent-api/src/modules/artifacts/services/artifact-tasks.service.ts` | 357 | spaces | Required today |
| `apps/agent-api/src/modules/artifacts/services/artifact-tasks.service.ts` | 572 | space_items | Required today |
| `apps/api/src/modules/missions/services/mission-lifecycle-native-tx.service.ts` | 36, 163, 179, 195, 367, 385 | missions, missions_logs, agent_definitions | **Bugs today** — uses `||` (worse than `??`); all those tables are nullable |
| `apps/agent-api/src/modules/artifacts/services/artifact-social-posts.service.ts` | 714, 720 | social_posts (query) | Cross-mode leak helper |
| `apps/api/src/modules/integrations/google-drive/sync/drive-sync.service.ts` | 100 | drive_folder_mappings | Needs review |
| `apps/api/src/modules/transfer/transfer.service.ts` | 1365 | transfer logic | Needs review |

### 3.4 Code: `applyOwnerScope` duplication

Found 5 copies of essentially the same helper:

1. `apps/api/src/modules/spaces/spaces.repository.ts:19`
2. `apps/api/src/modules/missions/repositories/missions.repository.ts:145`
3. `apps/api/src/modules/missions/repositories/agent-checkpoints.repository.ts:35`
4. `apps/agent-api/src/modules/artifacts/services/artifact-offers-ads.service.ts:7`
5. `apps/agent-api/src/modules/chat/services/agent-edit-checkpoint.service.ts:171`

All implement:
```ts
if (orgId) return query.eq('org_id', orgId)
return query.eq('user_id', userId)
```

### 3.5 Cross-mode isolation leak (the subtle bug)

In personal mode (`orgId === null`), `applyOwnerScope` filters by `user_id = userId`. **This returns rows the user created in any context — including org rows where they're the creator.**

Worst case: user is in personal mode looking at their personal missions list. They created a mission inside Vibey org earlier today. That org mission has `user_id = sefy` and `org_id = vibey-uuid`. The personal-mode query `WHERE user_id = sefy` matches it. They see an org mission in their personal context.

Why this hasn't blown up:
- RLS catches some of it for tables with strict org-team policies.
- Most personal users only have one mode of operation.
- The agent-api comment in `artifact-tasks.service.ts:331-333` explicitly says:
  > "Mirrors applyOwnerScope: when there's an active org, scope by org_id; otherwise scope by user_id. RLS handles the rest, so we don't add an extra `is('org_id', null)` clause."

This is "RLS as a safety net" — works most of the time, but creates two sources of truth and leaks when the service-role client (which bypasses RLS) is used.

**Fix:** in personal mode, always add `org_id IS NULL`:
```ts
if (orgId) return query.eq('org_id', orgId)
return query.eq('user_id', userId).is('org_id', null)
```

---

## 4. Plan — phased

### Phase 0 — Land the hotfix (DONE 2026-05-08)

- Removed `org_id` filter from `loadItem` in `space-permissions.service.ts`.
- Added space-owner short-circuit in `resolveEffectiveLevel`.
- Backfilled 13 cross-context `space_items` rows.
- Restored `?? userId` encoding in 4 spots (with explanatory comments) — required while schema still has `NOT NULL`.

### Phase 1 — Centralize the scoping helper

**Goal:** one `OrgScope` service in `@vibey/api-shared` that encodes "what is personal vs org" once.

1. Create `packages/api-shared/src/services/org-scope.service.ts` (likely already partially exists — verify).
2. Add `applyOwnerScope(query, { userId, orgId })`:
   - org mode: `.eq('org_id', orgId)`
   - personal mode: `.eq('user_id', userId).is('org_id', null)` ← **closes the leak**
3. Add `personalEncodingFor(table, { userId, orgId })`:
   - tables in the "nullable" list → returns `null`
   - tables in the "NOT NULL legacy" list (`spaces`, `space_items`) → returns `userId` (until Phase 2)
4. Add a unit test covering both modes + cross-mode isolation.
5. Replace all 5 local copies of `applyOwnerScope` with the shared one.
6. Replace all 9 `?? userId` writes with `personalEncodingFor(...)`.

**Risk:** moderate. Affects every spaces / missions / artifacts / agent-edit-checkpoint query. Run full test suite + manual smoke test of personal + org modes.

**Rollback:** revert the import sites; original logic is preserved.

### Phase 2 — Migrate `spaces`, `space_items`, and the two `space_drive_*` tables to nullable `org_id`

**Pre-flight (before running migration):**

1. Inspect the 8 personal `spaces` rows — confirm with Sefy each one is genuinely personal (not a forgotten org space). Per Sefy 2026-05-08: do this *after* the plan is otherwise ready, before running Phase 2.
2. Audit `space_drive_folder_mappings` and `space_drive_push_channels` rows for any `org_id = user_id` workarounds already present (this is the equivalent of the `space_items` 166-row cleanup, scoped to drive).
3. Grep for any service-role queries that filter `.eq('org_id', userId)` on these 4 tables — those would silently break after the migration.

**Schema migration** (apply via Supabase `apply_migration`):

```sql
alter table public.spaces                       alter column org_id drop not null;
alter table public.space_items                  alter column org_id drop not null;
alter table public.space_drive_folder_mappings  alter column org_id drop not null;
alter table public.space_drive_push_channels    alter column org_id drop not null;

-- Per Sefy 2026-05-08: hard-guard against the user-UUID-as-org-id workaround returning
alter table public.spaces
  add constraint spaces_org_id_not_user_id
  check (org_id is null or org_id <> user_id);
alter table public.space_items
  add constraint space_items_org_id_not_user_id
  check (org_id is null or org_id <> user_id);
alter table public.space_drive_folder_mappings
  add constraint space_drive_folder_mappings_org_id_not_user_id
  check (org_id is null or user_id is null or org_id <> user_id);
alter table public.space_drive_push_channels
  add constraint space_drive_push_channels_org_id_not_user_id
  check (org_id is null or user_id is null or org_id <> user_id);
```

**Backfill** (after schema change):

```sql
-- 8 personal spaces: org_id = user_id → NULL
update public.spaces
set    org_id = null, updated_at = now()
where  org_id = user_id;

-- 166 personal space_items: items whose parent space is now personal
update public.space_items si
set    org_id = null, updated_at = now()
from   public.spaces s
where  si.space_id = s.id
  and  s.org_id is null;

-- Drive mappings/channels: any rows where org_id = user_id (count TBD during pre-flight)
update public.space_drive_folder_mappings set org_id = null where org_id = user_id;
update public.space_drive_push_channels   set org_id = null where org_id = user_id;
```

**Update `personalEncodingFor` registry:**
- Remove all four tables from the "NOT NULL legacy" list. They now use `null` like the other 86.

**Verify** RLS still works (it already references `org_id IS NOT NULL` for the org-team paths — good). Run smoke tests:
- Create personal space → `org_id IS NULL`. Query spaces in personal context → returns it. Query in org context → does not return it. ✓
- Create org space → `org_id = orgUuid`. Query in org context → returns it. Query in personal context → does not return it. ✓
- Add an org member → org member can read team-visibility org spaces. ✓
- Personal user: owner can do anything on their own personal items, no permission code runs (short-circuit fires). ✓

**Risk:** medium-high. Schema change is irreversible without restoring constraint. RLS already supports it but service-role queries that filter by `.eq('org_id', userId)` would break — need to grep for those before pulling the trigger.

**Rollback:** add the `NOT NULL` back, repopulate `org_id = user_id` from `spaces.user_id` for `org_id IS NULL` rows.

### Phase 3 — Fix the bug-class `?? userId` writes on already-nullable tables

These are bugs **today** (the column accepts NULL, but the code writes user UUID anyway):

1. `spaces.service.ts:979` — `pushToAgent` writes `missions.org_id = orgId ?? userId`. Should be `orgId ?? null`.
2. `mission-lifecycle-native-tx.service.ts:36, 163, 179, 195, 367, 385` — six `|| userId` writes that should be `|| null`. (`||` is also wrong — should be `??` to avoid empty-string falsiness.)
3. `artifact-social-posts.service.ts:714, 720` — query helper using `.eq(orgId ? 'org_id' : 'user_id', orgId ?? userId)`. The `eq(... userId)` part is fine; the issue is no `is('org_id', null)` for personal mode (cross-mode leak).
4. `drive-sync.service.ts:100` — `effectiveOrgId = orgId ?? userId`. Needs investigation; likely should be NULL.
5. `transfer.service.ts:1365` — `targetContext.org_id ?? userId`. Needs investigation.

These can be done in any order, independent of the schema migration.

### Phase 4 — Audit and burn-down all manual `org_id` writes

After the helper is in place, grep for any remaining `.insert({ ...org_id })` patterns and route them through `personalEncodingFor`. Goal: zero direct writes to `org_id` outside the central helper.

### Phase 5 — Frontend audit

Make sure the frontend org switcher cleanly reflects:
- Personal mode → no `X-Org-Id` header (already correct).
- Org mode → `X-Org-Id: <uuid>`.
- "Personal Account" UI in `AvatarDropdown.tsx`, `TransferDialog.tsx`, `SpaceConversationsList.tsx`, `use-team2-perms.ts` (`isPersonal`) — verify all branches.

### Phase 6 — Documentation

Add `.docs/architecture/personal-vs-org.md` describing the canonical pattern so the next engineer doesn't reinvent the user-UUID-as-org-id workaround.

---

## 5. What this DOES NOT change

- The permission model. Owner-does-everything in personal, full RBAC in org — both already exist in `space-permissions.service.ts`.
- The frontend mental model. `AvatarDropdown`, `TransferDialog`, `useTeam2Perms({ isPersonal })` already speak this language.
- The org membership tables (`org_members`, `org_invitations`, `organizations`).
- Tables that are already correct (~86 of them).

---

## 6. Approval gates

Each phase requires explicit go-ahead from Sefy:

- [x] Phase 1 — centralize helper
- [x] Phase 2 — schema migration + backfill
- [x] Phase 3 — fix bug-class writes on nullable tables
- [x] Phase 4 — burn-down audit
- [x] Phase 5 — frontend audit
- [x] Phase 6 — docs

Executed summary:

- Shared `applyOwnerScope` / `resolveScopedOrgId` now live in `@vibey/api-shared`.
- `spaces`, `space_items`, `space_drive_folder_mappings`, and `space_drive_push_channels` now allow `org_id IS NULL`.
- `spaces` personal rows: 8 rows moved to `org_id IS NULL`.
- `space_items` personal rows: 166 rows moved to `org_id IS NULL`.
- `org_id = user_id` verification returned 0 rows across all audited `(org_id, user_id)` tables.
- Canonical architecture doc added at `.docs/architecture/personal-vs-org.md`.

Suggested execution order: Phase 1 → Phase 3 (independent of schema) → Phase 2 (the big one, after the helper exists and bug-class writes are fixed) → Phase 4 → Phase 5 → Phase 6.

---

## 7. Open questions — RESOLVED

| # | Question | Decision (Sefy, 2026-05-08) |
|---|---|---|
| 1 | `space_drive_*` tables — org-only or personal too? | **Personal too.** Folded into Phase 2 schema migration. |
| 2 | Backfill the 8 personal spaces blindly or inspect first? | **Inspect first**, immediately before running Phase 2. |
| 3 | Add CHECK constraint forbidding `org_id = user_id`? | **Yes.** Added to all 4 tables in Phase 2 SQL. |
