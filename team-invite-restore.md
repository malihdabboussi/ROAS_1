# Team Invite Feature — Restoration Guide

**Stashed on:** 2026-03-26
**Stash name:** `team-invite-feature`

---

## How to Restore

### Step 1: Pop the stash

```bash
git stash pop "stash@{N}"   # replace N with the stash index
# or find it by name:
git stash list | grep team-invite
```

This restores all **Layer 1** (new files) + this MD + the patch file.

### Step 2: Re-apply Layer 2 changes

```bash
git apply team-invite-layer2.patch
```

### Step 3: Cleanup

```bash
rm team-invite-layer2.patch team-invite-restore.md
```

---

## Layer 1 — New Files (restored by stash pop)

### Backend API (`apps/api/src/modules/team/`)

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

### Frontend team-management (`apps/web/src/features/team-management/`)

- `components/ShareModal.tsx`
- `config/permission-toast.config.ts`
- `hooks/use-team-permission.ts`
- `services/team.service.ts`
- `store/use-team-permission-store.ts`
- `types/index.ts`

### Settings UI

- `apps/web/src/features/settings/components/settings-content/TeamContent.tsx`

### Invite acceptance page

- `apps/web/src/app/(auth)/invite/[token]/page.tsx`

### Database migrations

- `supabase/migrations/20260326100000_team_members_permissions_foundation.sql`
- `supabase/migrations/20260326101000_team_permissions_rls_scope.sql`

---

## Layer 2 — Modified Files (restored by patch)

### 1. `apps/api/src/app.module.ts`

- Added `import { TeamModule } from './modules/team/team.module'`
- Added `TeamModule` to the imports array

### 2. `apps/web/src/features/settings/components/AccountSettingsModal.tsx`

- Added `Users` to lucide-react import
- Added `TeamContent` dynamic import
- Added `{ id: 'team', label: 'My Human Team', icon: Users }` to navItems
- Added `case 'team': return <TeamContent />` to render switch

### 3. `apps/web/src/features/settings/contexts/AccountSettingsModalContext.tsx`

- Added `| 'team'` to `AccountSettingsSection` type

### 4. `apps/web/src/app/(auth)/invite/page.tsx`

- Added `AuthOrbShell` wrapper + `INVITE_QUOTES`
- Updated CSS classes to use spacing utilities

### 5. `apps/web/src/lib/api/backend-client.ts`

- Added `maybeShowPermissionToast` function + 403 toast integration (~25 lines)

### 6. `apps/web/src/app/(dashboard)/campaigns/[id]/page.tsx`

- Added `useTeamPermission` hook + view-only access gating

### 7. `apps/web/src/app/(dashboard)/campaigns/page.tsx`

- Added `ShareModal` import + share campaign UI

### 8. `apps/web/src/app/(dashboard)/providers.tsx`

- Added `useTeamPermissionStore` + permission fetch on mount

### 9. `apps/web/src/components/layout/sidebar/SidebarCampaignMenuPortal.tsx`

- Added `ShareModal` import + share option in sidebar menu

### 10. `apps/web/src/features/brain/components/BrainVisualization.tsx`

- Added `ShareModal` import + share brain UI
