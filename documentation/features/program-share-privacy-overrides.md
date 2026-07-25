# Program privacy overrides (share compat)

Last Modified: July 24, 2026

## Why

Program access is inherited by every Campaign and Space under a Program, and the
**Program gate wins** (see `programs.md` → Permissions → Inheritance). A user can
be granted a space share directly, yet still be blocked from the space because the
space's campaign lives inside a **private** / **selected** Program they are not on.
That silent override is confusing — the invitee "has a share" but sees nothing.

This surface detects and communicates those conflicts. It makes **no destructive
changes**: it never revokes shares or edits Program ACLs.

## Detection

Pure helper: `apps/api/src/modules/programs/services/program-share-compat.ts`
→ `detectProgramShareConflicts(...)`.

A space share is a **conflict** when all of the following hold:

- the space's `campaign_id` maps to a `program_id`, and
- that Program's `visibility !== 'workspace'` (i.e. `private` or `selected`), and
- the shared `user_id` is **not** an org owner/admin (break-glass bypass), and
- the shared `user_id` is **not** the Program `created_by` (owner always retains access), and
- the shared `user_id` has **no** explicit `program_shares` ACL entry for that Program.

Everything is passed in as plain maps/sets so the function is unit-tested in
isolation (`__tests__/program-share-compat.test.ts`) and reused by both the report
endpoint and (indirectly) the Share UI notice.

## Data flow

```
program-share-compat.repository.ts   (Supabase reads)
  ├─ listUserSpaceShares(orgId)   → space shares + space.campaign_id
  ├─ listAdminUserIds(orgId)      → org owners/admins (bypass gate)
  └─ listProgramAclUserIds(...)   → program_shares user entries
        │
        ▼
program-share-compat.service.ts  → listConflicts(orgId)
        │  builds programByCampaign / programsById maps, calls
        ▼  detectProgramShareConflicts(...)
programs.controller.ts  → GET /api/programs/share-conflicts  (RequireOrgRole('admin'))
```

## API

- `GET /api/programs/share-conflicts` — org-admin only. Read-only list of
  `ProgramShareConflict` rows (`space_id`, `space_title`, `user_id`, `program_id`,
  `program_name`, `program_visibility`). No side effects.

## Share UI notice

- Hook: `apps/web/src/features/spaces/hooks/use-space-program-privacy.ts`
  derives `{ restricted, programName, visibility }` from the org-scoped campaign +
  program caches for the active space.
- `SpaceModalsHost.tsx` passes `programPrivacyNotice={{ programName }}` into the
  shared `ShareModal` when the space's Program is restricted.
- `ShareModal` renders a tokenized lock banner (design tokens only, `Lock` icon)
  above the people list for `entityType === 'space'`: *"This Program is private;
  people won't get access unless they're added to the Program."*

## Decision log

- **2026-07-24:** Ship detection + read-only report + Share-UI notice rather than
  auto-granting Program access on share. Auto-granting would silently widen a
  private Program's membership; surfacing the conflict keeps the Program owner in
  control. Org admins/owners and the Program `created_by` are never flagged.
