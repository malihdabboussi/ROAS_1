import type { OrgMembership, OrgRole } from '@/lib/org'
import type { TransferMode } from './transfer-api'

const MOVE_ROLES: ReadonlySet<OrgRole> = new Set(['owner', 'admin'])
const COPY_TARGET_ROLES: ReadonlySet<OrgRole> = new Set(['owner', 'admin', 'creator'])

export function roleForOrg(orgId: string | null, memberships: OrgMembership[]): OrgRole | null {
  if (!orgId) return null
  const membership = memberships.find((m) => m.org_id === orgId && m.status === 'active')
  return membership?.role ?? null
}

export function canMoveAcrossContext(
  sourceOrgId: string | null,
  targetOrgId: string | null,
  memberships: OrgMembership[],
): boolean {
  const sourceRole = roleForOrg(sourceOrgId, memberships)
  const targetRole = roleForOrg(targetOrgId, memberships)
  if (sourceOrgId && (!sourceRole || !MOVE_ROLES.has(sourceRole))) return false
  if (targetOrgId && (!targetRole || !MOVE_ROLES.has(targetRole))) return false
  return true
}

export function canCopyAcrossContext(
  sourceOrgId: string | null,
  targetOrgId: string | null,
  memberships: OrgMembership[],
): boolean {
  const sourceRole = roleForOrg(sourceOrgId, memberships)
  const targetRole = roleForOrg(targetOrgId, memberships)
  if (sourceOrgId && !sourceRole) return false
  if (targetOrgId && (!targetRole || !COPY_TARGET_ROLES.has(targetRole))) return false
  return true
}

export function canTransferAcrossContext(
  mode: TransferMode,
  sourceOrgId: string | null,
  targetOrgId: string | null,
  memberships: OrgMembership[],
): boolean {
  if (mode === 'move') return canMoveAcrossContext(sourceOrgId, targetOrgId, memberships)
  return canCopyAcrossContext(sourceOrgId, targetOrgId, memberships)
}
