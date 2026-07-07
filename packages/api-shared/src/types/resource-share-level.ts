import { z } from 'zod'
import type { OrgRole } from '../services/org-scope.service'

export const ResourceShareLevelSchema = z.enum(['admin', 'edit', 'view'])
export type ResourceShareLevel = z.infer<typeof ResourceShareLevelSchema>

export const RESOURCE_SHARE_LEVEL_WEIGHT: Record<ResourceShareLevel, number> = {
  admin: 3,
  edit: 2,
  view: 1,
}

export const ORG_ROLE_RESOURCE_BASELINE: Record<OrgRole, ResourceShareLevel> = {
  owner: 'admin',
  admin: 'admin',
  creator: 'edit',
  editor: 'edit',
  viewer: 'view',
}

export function maxResourceShareLevel(
  levels: Array<ResourceShareLevel | null | undefined>,
): ResourceShareLevel | null {
  const cleaned = levels.filter((level): level is ResourceShareLevel => Boolean(level))
  if (cleaned.length === 0) return null
  return cleaned.sort(
    (a, b) => RESOURCE_SHARE_LEVEL_WEIGHT[b] - RESOURCE_SHARE_LEVEL_WEIGHT[a],
  )[0] as ResourceShareLevel
}

export function meetsResourceShareLevel(
  actual: ResourceShareLevel | null | undefined,
  required: ResourceShareLevel,
): boolean {
  if (!actual) return false
  return RESOURCE_SHARE_LEVEL_WEIGHT[actual] >= RESOURCE_SHARE_LEVEL_WEIGHT[required]
}

export function baselineFromOrgRole(
  orgRole: OrgRole | null | undefined,
): ResourceShareLevel | null {
  if (!orgRole) return null
  return ORG_ROLE_RESOURCE_BASELINE[orgRole]
}
