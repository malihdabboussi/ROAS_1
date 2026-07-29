import { describe, expect, it } from 'vitest'
import { authorizeOrganizationWideAiData } from './ai-data-access-policy'

const activeAdmin = {
  id: 'member-1',
  userId: 'user-1',
  orgId: 'org-1',
  role: 'admin',
  status: 'active',
  aiDataAdmin: true,
} as const

describe('authorizeOrganizationWideAiData', () => {
  it('allows an explicitly enabled active organization member', () => {
    expect(
      authorizeOrganizationWideAiData({
        requestedOrgId: 'org-1',
        resourceOrgId: 'org-1',
        resourceKind: 'organization_knowledge',
        membership: activeAdmin,
      }),
    ).toEqual({ allowed: true, reason: 'organization_data_access_allowed' })
  })

  it('treats the organization owner as enabled defensively', () => {
    expect(
      authorizeOrganizationWideAiData({
        requestedOrgId: 'org-1',
        resourceOrgId: 'org-1',
        resourceKind: 'observed_slack_channel',
        membership: { ...activeAdmin, role: 'owner', aiDataAdmin: false },
      }),
    ).toEqual({ allowed: true, reason: 'organization_data_access_allowed' })
  })

  it('denies members without the explicit capability', () => {
    expect(
      authorizeOrganizationWideAiData({
        requestedOrgId: 'org-1',
        resourceOrgId: 'org-1',
        resourceKind: 'organization_knowledge',
        membership: { ...activeAdmin, aiDataAdmin: false },
      }),
    ).toEqual({ allowed: false, reason: 'capability_missing' })
  })

  it('denies cross-organization access even with the capability', () => {
    expect(
      authorizeOrganizationWideAiData({
        requestedOrgId: 'org-1',
        resourceOrgId: 'org-2',
        resourceKind: 'organization_knowledge',
        membership: activeAdmin,
      }),
    ).toEqual({ allowed: false, reason: 'cross_org' })
  })

  it('never grants access to private conversations', () => {
    expect(
      authorizeOrganizationWideAiData({
        requestedOrgId: 'org-1',
        resourceOrgId: 'org-1',
        resourceKind: 'private_conversation',
        membership: activeAdmin,
      }),
    ).toEqual({ allowed: false, reason: 'private_conversation' })
  })

  it('fails closed for inactive or unavailable memberships', () => {
    expect(
      authorizeOrganizationWideAiData({
        requestedOrgId: 'org-1',
        resourceOrgId: 'org-1',
        resourceKind: 'organization_knowledge',
        membership: null,
      }),
    ).toEqual({ allowed: false, reason: 'membership_unavailable' })

    expect(
      authorizeOrganizationWideAiData({
        requestedOrgId: 'org-1',
        resourceOrgId: 'org-1',
        resourceKind: 'organization_knowledge',
        membership: { ...activeAdmin, status: 'suspended' },
      }),
    ).toEqual({ allowed: false, reason: 'membership_inactive' })
  })
})
