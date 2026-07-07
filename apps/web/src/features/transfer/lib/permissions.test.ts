import { describe, expect, it } from 'vitest'
import type { OrgMembership } from '@/features/org/store/use-org-store'
import { canCopyAcrossContext, canMoveAcrossContext } from './permissions'

const memberships: OrgMembership[] = [
  membership('owner-org', 'owner'),
  membership('admin-org', 'admin'),
  membership('creator-org', 'creator'),
  membership('editor-org', 'editor'),
  membership('viewer-org', 'viewer'),
]

describe('transfer permissions', () => {
  it('allows only owner/admin to move into org contexts', () => {
    expect(canMoveAcrossContext(null, 'owner-org', memberships)).toBe(true)
    expect(canMoveAcrossContext(null, 'admin-org', memberships)).toBe(true)
    expect(canMoveAcrossContext(null, 'creator-org', memberships)).toBe(false)
    expect(canMoveAcrossContext(null, 'editor-org', memberships)).toBe(false)
  })

  it('allows creator+ to copy into org contexts', () => {
    expect(canCopyAcrossContext(null, 'owner-org', memberships)).toBe(true)
    expect(canCopyAcrossContext(null, 'admin-org', memberships)).toBe(true)
    expect(canCopyAcrossContext(null, 'creator-org', memberships)).toBe(true)
    expect(canCopyAcrossContext(null, 'editor-org', memberships)).toBe(false)
    expect(canCopyAcrossContext(null, 'viewer-org', memberships)).toBe(false)
  })

  it('requires owner/admin to move out of org contexts', () => {
    expect(canMoveAcrossContext('owner-org', null, memberships)).toBe(true)
    expect(canMoveAcrossContext('admin-org', null, memberships)).toBe(true)
    expect(canMoveAcrossContext('creator-org', null, memberships)).toBe(false)
  })
})

function membership(orgId: string, role: OrgMembership['role']): OrgMembership {
  return {
    id: `${orgId}-membership`,
    role,
    status: 'active',
    org_id: orgId,
    organizations: {
      id: orgId,
      name: orgId,
      slug: orgId,
      avatar_url: null,
      account_type: 'team',
      status: 'active',
    },
  }
}
