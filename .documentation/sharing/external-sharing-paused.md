# External Sharing Paused

Last updated: 2026-06-10

## Update 2026-06-10: Item/Doc Public Links Re-Enabled

Public share links for individual Space items/docs are live again:

- `POST /api/spaces/:id/items/:itemId/share-link` and the `DELETE` counterpart are restored in `space-sharing.controller.ts`.
- `GET /api/spaces/shared/item/:token` resolves tokens again, now with a narrowed column set (`SHARED_ITEM_PUBLIC_COLUMNS` in `space-permissions.service.ts`): only `id, space_id, title, status, due_date, notes, doc_body, custom_data` leave the workspace, and `custom_data` is filtered to `_doc_*` keys before returning to unauthenticated viewers.
- `/shared/item/:token` renders `SharedItemView` again.
- `ShareModal` has a rebuilt "Share link with anyone" toggle + copy-link box (docMode items only).

Still paused: whole-space public links, view-scoped public links, external email invites, and the Docs view "Allow opening docs" switch. The rest of this document describes that remaining paused scope.

## Decision

Public/external sharing for Spaces and Views is paused. (Item/doc links were re-enabled on 2026-06-10, see above.)

We are splitting sharing into two separate use cases:

1. Internal sharing: organization owners/admins share specific spaces and views with people on their team.
2. External sharing: public token links for people outside the workspace.

Phase one pauses external sharing so we can focus on the internal sharing model first.

## Why This Was Paused

The external sharing flow was expanding into multiple overlapping concerns:

- Public space links.
- Public view-scoped links via `/shared/space/:token?v=:viewId`.
- Public item/doc links via `/shared/item/:token`.
- Email invite links for external recipients.
- Docs-view-specific public access controls.
- Public rendering rules for mixed Docs sources: Space, Studio, Mission, and Drive.

This made the use case too broad for the current need. The current product need is internal team sharing.

## What Was Paused

### Frontend Public Link UI

File: `apps/web/src/features/spaces/components/ShareModal.tsx`

Paused/commented:

- `Share link with anyone`.
- `Public space link`.
- `Public view link`.
- `Private link` for item links.
- `Copy link` for `/shared/*` URLs.
- Docs view `Allow opening docs` switch for public viewers.
- External email invite branch for item sharing.

Still active:

- Workspace/team member sharing rows.
- Space share records.
- Item share records for internal users/orgs.

### Public Shared Pages

Files:

- `apps/web/src/app/shared/space/[token]/page.tsx`
- `apps/web/src/app/shared/item/[token]/page.tsx`

Paused/commented:

- Rendering `SharedSpaceItemsView`.
- Rendering `SharedItemView`.

Current behavior:

- Pages render a paused notice instead of resolving public tokens.

### Backend Public Token Resolution

File: `apps/api/src/modules/spaces/controllers/space-sharing.controller.ts`

Paused/commented:

- `GET /api/spaces/shared/item/:token`
- `GET /api/spaces/shared/space/:token`

Current behavior:

- These endpoints return `External sharing is paused`.

### Backend Public Link Mutation Endpoints

File: `apps/api/src/modules/spaces/controllers/space-sharing.controller.ts`

Paused/commented:

- `POST /api/spaces/:id/share-link`
- `DELETE /api/spaces/:id/share-link`
- `POST /api/spaces/:id/items/:itemId/share-link`
- `DELETE /api/spaces/:id/items/:itemId/share-link`
- `POST /api/spaces/:id/items/:itemId/share-invite`

Current behavior:

- Access checks still run where applicable.
- External token creation/deletion and email invite logic are not executed.
- Endpoints return `External sharing is paused`.

## Dormant Code Kept For Future Reference

The following files/components remain in the repo as dormant reference code:

- `apps/web/src/features/spaces/components/shared/SharedSpaceItemsView.tsx`
- `apps/web/src/features/spaces/components/shared/SharedItemView.tsx`
- `apps/web/src/features/spaces/components/shared/SharedSpaceView.tsx`
- Shared fetch helpers in `apps/web/src/features/spaces/services/spaces.service.ts`:
  - `fetchSharedItem`
  - `fetchSharedSpace`
  - `enableSpaceShareLink`
  - `disableSpaceShareLink`
  - `enableSpaceItemShareLink`
  - `disableSpaceItemShareLink`
- Permission service helpers in `apps/api/src/modules/spaces/services/space-permissions.service.ts`:
  - `resolveSharedItemByToken`
  - `resolveSharedSpaceByToken`
  - `enableSpaceShareLink`
  - `disableSpaceShareLink`
  - `enableItemShareLink`
  - `disableItemShareLink`
  - `createItemEmailInvite`

These were not deleted because the user asked to comment out/pause external sharing and preserve the work for future reference.

## Restore Plan For External Sharing Later

When we revisit external sharing:

1. Define the public sharing model separately from internal sharing.
2. Decide whether public links are allowed for:
   - Whole spaces.
   - Individual views.
   - Individual docs/items.
   - Docs view with readable document bodies.
3. Add explicit database/config flags for each public capability.
4. Restore the paused UI in `ShareModal`.
5. Restore public `/shared/*` pages.
6. Restore backend public token endpoints.
7. Add tests for:
   - Existing tokens while paused.
   - Public token enable/disable.
   - View-scoped token behavior.
   - Docs source coverage: Space, Studio, Mission, Drive.
   - Private item exclusion.
8. Add rate/security review before shipping externally.

## Internal Sharing Next

Internal sharing should be treated as the active path:

- Organization owner/admin can share spaces and specific views with workspace/team members.
- The target viewer must be authenticated.
- Authorization should use org membership and share records, not public tokens.
- View-scoped access should not expose unrelated views.

Implementation for internal sharing is intentionally not included in this phase.
