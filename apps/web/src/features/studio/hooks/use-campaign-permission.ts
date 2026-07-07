'use client'

import { useMemo } from 'react'
import { useOrgStore, type OrgRole } from '@/features/org/store/use-org-store'

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

function meets(actual: ResourceShareLevel | null, required: ResourceShareLevel): boolean {
  if (!actual) return false
  return LEVEL_WEIGHT[actual] >= LEVEL_WEIGHT[required]
}

export interface CampaignPermission {
  /** Effective level for the current viewer on this campaign. */
  level: ResourceShareLevel | null
  /** Read access (any level). */
  canRead: boolean
  /** Edit campaign metadata (rename, description, color/icon, context). */
  canEdit: boolean
  /** Manage shares, hide/archive, manage team. */
  canAdmin: boolean
  /** Delete the entire campaign. Stricter than canAdmin: org admin/owner only. */
  canDeleteCampaign: boolean
}

/**
 * Resolve effective campaign permission for the current viewer.
 *
 * Mirrors the backend `@RequireOrgRole` decoration on `CampaignsController`:
 *   - `editor+` org role can update / update-context / generate-context.
 *   - `admin+` org role can delete / restore.
 *   - `creator+` can create new campaigns (handled at the create site, not here).
 *
 * In personal context (no `activeOrgId`), the caller is the implicit owner →
 * `admin` for everything.
 */
export function useCampaignPermission(): CampaignPermission {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const myRole = useOrgStore((s) => s.myRole)

  return useMemo<CampaignPermission>(() => {
    // Personal context: the user is the campaign owner. Full access.
    if (!activeOrgId) {
      return {
        level: 'admin',
        canRead: true,
        canEdit: true,
        canAdmin: true,
        canDeleteCampaign: true,
      }
    }

    const level: ResourceShareLevel | null = myRole ? ORG_ROLE_BASELINE[myRole] : null
    const canDeleteCampaign = myRole === 'admin' || myRole === 'owner'

    return {
      level,
      canRead: meets(level, 'view'),
      canEdit: meets(level, 'edit'),
      canAdmin: meets(level, 'admin'),
      canDeleteCampaign,
    }
  }, [activeOrgId, myRole])
}
