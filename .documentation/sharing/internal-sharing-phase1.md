# Internal Sharing Phase 1

Last updated: 2026-04-30

## Purpose

Internal sharing lets organization owners and admins share spaces, or specific views inside spaces, with teammates in the same organization.

External/public links remain paused. See `.documentation/sharing/external-sharing-paused.md`.

## User Model

- Owner/admin can share a whole space with a teammate.
- Owner/admin can share only the current view with a teammate.
- Recipient sees shared spaces in the Spaces sidebar under `Shared with me`.
- If a share is view-restricted, the recipient only sees the allowed view(s) in the space.
- If a share is unrestricted, the recipient sees the full space.

## Data Model

Existing table:

- `space_shares`

New column:

- `allowed_view_ids text[] null`

Meaning:

- `NULL`: unrestricted share, all views visible.
- non-empty array: recipient can only see those view ids.

Permission level still uses existing values:

- `view`
- `comment`
- `edit`
- `full_edit`

## Backend Flow

1. Admin creates a share row with `POST /api/spaces/:id/shares`.
2. Backend stores optional `allowed_view_ids`.
3. Recipient calls `GET /api/spaces/shared-with-me`.
4. Backend returns shared spaces with:
   - normal space fields
   - `share_meta.level`
   - `share_meta.allowed_view_ids`
5. When recipient opens a shared space:
   - backend verifies `SpacePermissionsService.resolveSpaceAccessScope`
   - frontend filters visible views using `share_meta.allowed_view_ids`

## Frontend Flow

1. `useSpacesStore.loadSpaces` fetches owned/team spaces and shared spaces.
2. Store merges both lists by `space.id`.
3. Sidebar renders normal buckets plus `Shared with me`.
4. Opening a shared space routes to `/spaces` like every other space.
5. `SpaceItemsView` hides views not in `allowed_view_ids`.
6. `ShareModal` only lets org owner/admin manage shares.

## Current Boundaries

Included:

- Space-level internal shares.
- View-restricted internal shares.
- Shared with me sidebar bucket.
- Owner/admin-only share management.

Not included:

- Public links.
- Email invites to non-members.
- Notifications.
- Bulk sharing.
- Separate public Docs rendering.
- Per-cell or per-field permissions.

## Testing Contract

Tests should cover:

- admin can create whole-space share.
- admin can create view-restricted share.
- editor cannot create shares.
- shared recipient sees shared space in `Shared with me`.
- view-restricted recipient only sees allowed views.
- unrestricted recipient sees all views.
- deleted view ids are ignored from `allowed_view_ids`.

## Future Work

- Notification when a space/view is shared.
- Bulk share to multiple teammates.
- Dedicated internal route/state for share previews.
- Per-item `Shared with me`.
- Revisit external sharing as a separate product surface.
