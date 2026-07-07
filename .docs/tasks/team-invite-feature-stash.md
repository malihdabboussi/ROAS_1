# Team Invite Feature — Stashed

**Stashed on:** 2026-03-26
**Stash name:** `team-invite-feature`
**Stash ref:** `stash@{0}` (at time of stash)
**Total:** 24 files, 4,981 lines

---

## How to Restore

```bash
# 1. Find the stash
git stash list | grep team-invite

# 2. Pop it (brings back all new files + patch + this guide)
git stash pop "stash@{0}"

# 3. Re-apply the small changes to existing files
git apply team-invite-layer2.patch

# 4. Cleanup helper files
rm team-invite-layer2.patch team-invite-restore.md
```

---

## What's in the Stash

### New Files (Layer 1) — restored by `git stash pop`

**Backend API** (`apps/api/src/modules/team/`) — 12 files:
- `controllers/team-invitations.controller.ts`
- `controllers/team.controller.ts`
- `decorators/team-permission.decorator.ts`
- `dto/index.ts`
- `guards/team-credits.guard.ts`
- `guards/team-permission.guard.ts`
- `repositories/team.repository.ts`
- `services/team-brain.service.ts`
- `services/team-credits.service.ts`
- `services/team-invitation.service.ts`
- `services/team.service.ts`
- `team.module.ts`

**Frontend team-management** (`apps/web/src/features/team-management/`) — 6 files:
- `components/ShareModal.tsx`
- `config/permission-toast.config.ts`
- `hooks/use-team-permission.ts`
- `services/team.service.ts`
- `store/use-team-permission-store.ts`
- `types/index.ts`

**Settings UI:**
- `apps/web/src/features/settings/components/settings-content/TeamContent.tsx`

**Invite acceptance page:**
- `apps/web/src/app/(auth)/invite/[token]/page.tsx`

**Database migrations:**
- `supabase/migrations/20260326100000_team_members_permissions_foundation.sql`
- `supabase/migrations/20260326101000_team_permissions_rls_scope.sql`

**Helper files:**
- `team-invite-layer2.patch`
- `team-invite-restore.md`

---

### Modified Files (Layer 2) — restored by `git apply team-invite-layer2.patch`

These are small changes injected into existing files. The patch re-applies them.

| File | Change |
|------|--------|
| `apps/api/src/app.module.ts` | `TeamModule` import + registration (2 lines) |
| `apps/web/src/features/settings/components/AccountSettingsModal.tsx` | `Users` icon, `TeamContent` dynamic import, `'team'` nav item, `case 'team'` render (~10 lines) |
| `apps/web/src/features/settings/contexts/AccountSettingsModalContext.tsx` | Added `'team'` to `AccountSettingsSection` type (1 line) |
| `apps/web/src/app/(auth)/invite/page.tsx` | `AuthOrbShell` wrapper, `INVITE_QUOTES`, CSS class updates (~50 lines) |
| `apps/web/src/lib/api/backend-client.ts` | `maybeShowPermissionToast` function + 403 toast integration (~25 lines) |
| `apps/web/src/app/(dashboard)/campaigns/[id]/page.tsx` | `useTeamPermission` hook + view-only access gating |
| `apps/web/src/app/(dashboard)/campaigns/page.tsx` | `ShareModal` import + share campaign UI |
| `apps/web/src/app/(dashboard)/providers.tsx` | `useTeamPermissionStore` + permission fetch on mount |
| `apps/web/src/components/layout/sidebar/SidebarCampaignMenuPortal.tsx` | `ShareModal` in sidebar menu |
| `apps/web/src/features/brain/components/BrainVisualization.tsx` | `ShareModal` + share brain UI |
