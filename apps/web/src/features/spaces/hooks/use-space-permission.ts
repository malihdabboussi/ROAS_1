'use client'

import { useMemo } from 'react'
import { useOrgStore, type OrgRole } from '@/lib/org/org-context-store'
import { useSpacesStore } from '../store/use-spaces-store'
import type { Space } from '../types'

export type ResourceShareLevel = 'admin' | 'edit' | 'view'

const LEVEL_WEIGHT: Record<ResourceShareLevel, number> = {
  admin: 3,
  edit: 2,
  view: 1,
}

const ORG_ROLE_BASELINE: Record<OrgRole, ResourceShareLevel> = {
  owner: 'admin',
  admin: 'admin',
  creator: 'edit',
  editor: 'edit',
  viewer: 'view',
}

/**
 * Resolve the effective share level for the current viewer on a given space.
 * Mirrors backend `SpacePermissionsService.resolveSpaceLevelFromSpaceRow`.
 *
 * Prefer `space.effective_level` when it's present (returned by GET /spaces/:id);
 * fall back to client-side derivation for list views and stale state.
 */
function deriveEffectiveLevel(
  space: Space | null | undefined,
  currentUserId: string | null,
  currentOrgId: string | null,
  currentOrgRole: OrgRole | null,
): ResourceShareLevel | null {
  if (!space) return null
  if (space.effective_level) return space.effective_level
  if (currentUserId && space.user_id === currentUserId) return 'admin'

  const shareLevel = space.share_meta?.level ?? null

  if (space.visibility === 'private') return shareLevel

  if (
    space.visibility === 'team' &&
    currentOrgId &&
    space.org_id === currentOrgId &&
    currentOrgRole
  ) {
    const baseline = ORG_ROLE_BASELINE[currentOrgRole] ?? null
    return maxLevel([baseline, shareLevel])
  }

  return shareLevel
}

function maxLevel(levels: Array<ResourceShareLevel | null>): ResourceShareLevel | null {
  const cleaned = levels.filter((level): level is ResourceShareLevel => Boolean(level))
  if (cleaned.length === 0) return null
  return cleaned.sort((a, b) => LEVEL_WEIGHT[b] - LEVEL_WEIGHT[a])[0] ?? null
}

function meets(actual: ResourceShareLevel | null, required: ResourceShareLevel): boolean {
  if (!actual) return false
  return LEVEL_WEIGHT[actual] >= LEVEL_WEIGHT[required]
}

export interface SpacePermission {
  /** Effective level: 'admin' | 'edit' | 'view' | null (null = no access). */
  level: ResourceShareLevel | null
  /** Read access (any level). */
  canRead: boolean
  /** Edit items, post comments, push to agent, accept/dismiss suggestions. */
  canEdit: boolean
  /** Manage shares, schema, fields, views, visibility. Renaming, description, icon. */
  canAdmin: boolean
  /**
   * Delete the entire space. Stricter than canAdmin: requires org admin/owner role
   * (a non-org-admin with an explicit space-admin share cannot delete).
   */
  canDeleteSpace: boolean
  /**
   * Edit/delete a specific automation. Edit-level callers can only touch
   * automations they authored. Admin can touch any.
   */
  canMutateAutomation: (automation: { created_by?: string | null } | null | undefined) => boolean
}

export function useSpacePermission(space: Space | null | undefined): SpacePermission {
  const currentUserId = useSpacesStore((state) => state.currentUserId)
  const activeOrgId = useOrgStore((state) => state.activeOrgId)
  const myRole = useOrgStore((state) => state.myRole)

  return useMemo<SpacePermission>(() => {
    const level = deriveEffectiveLevel(space, currentUserId, activeOrgId, myRole)
    const isOwner = !!(currentUserId && space?.user_id === currentUserId)

    const canDeleteSpace = (() => {
      if (space?.can_delete_space !== undefined) return space.can_delete_space
      if (!activeOrgId) return isOwner
      return myRole === 'admin' || myRole === 'owner'
    })()

    const canEdit = meets(level, 'edit')
    const canAdmin = meets(level, 'admin')

    return {
      level,
      canRead: meets(level, 'view'),
      canEdit,
      canAdmin,
      canDeleteSpace,
      canMutateAutomation: (automation) => {
        if (canAdmin) return true
        if (!canEdit) return false
        if (!automation) return false
        if (!currentUserId) return false
        const createdBy = automation.created_by ?? null
        return createdBy === currentUserId
      },
    }
  }, [space, currentUserId, activeOrgId, myRole])
}
