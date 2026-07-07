import { backendGet } from '@/lib/api/backend-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  hasActiveSubscriptionStatus,
  hasAnyActiveOrgMembershipFromResponse,
  hasRuntimeEligibleOrgMembershipFromResponse,
  resolveOnboardedHomeAccess,
  shouldSkipSubscribeStep,
} from './onboarding-access'

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
}))

const backendGetMock = vi.mocked(backendGet)

beforeEach(() => {
  backendGetMock.mockReset()
})

describe('onboarding subscribe gate', () => {
  it('skips subscribe for runtime-eligible org membership', () => {
    expect(
      shouldSkipSubscribeStep({
        hasRuntimeEligibleOrgMembership: true,
        hasDirectInviteCode: false,
        subscriptionStatus: null,
      }),
    ).toBe(true)
  })

  it('skips subscribe for active or trialing personal subscription', () => {
    expect(
      shouldSkipSubscribeStep({
        hasRuntimeEligibleOrgMembership: false,
        hasDirectInviteCode: false,
        subscriptionStatus: 'active',
      }),
    ).toBe(true)
    expect(
      shouldSkipSubscribeStep({
        hasRuntimeEligibleOrgMembership: false,
        hasDirectInviteCode: false,
        subscriptionStatus: 'trialing',
      }),
    ).toBe(true)
  })

  it('skips subscribe for direct invite code', () => {
    expect(
      shouldSkipSubscribeStep({
        hasRuntimeEligibleOrgMembership: false,
        hasDirectInviteCode: true,
        subscriptionStatus: null,
      }),
    ).toBe(true)
  })

  it('shows subscribe without invite, org membership, or active subscription', () => {
    expect(
      shouldSkipSubscribeStep({
        hasRuntimeEligibleOrgMembership: false,
        hasDirectInviteCode: false,
        subscriptionStatus: null,
      }),
    ).toBe(false)
  })

  it('detects active non-viewer membership in org response', () => {
    expect(
      hasRuntimeEligibleOrgMembershipFromResponse({
        success: true,
        memberships: [
          { status: 'suspended', role: 'admin' },
          { status: 'active', role: 'editor' },
        ],
      }),
    ).toBe(true)
  })

  it('does not treat viewer membership as runtime-eligible', () => {
    expect(
      hasRuntimeEligibleOrgMembershipFromResponse({
        success: true,
        memberships: [{ status: 'active', role: 'viewer' }],
      }),
    ).toBe(false)
  })
})

describe('onboarded home access', () => {
  it('detects any active org membership as access', () => {
    expect(
      hasAnyActiveOrgMembershipFromResponse({
        success: true,
        memberships: [{ status: 'active', role: 'viewer' }],
      }),
    ).toBe(true)
  })

  it('does not treat inactive org memberships as access', () => {
    expect(
      hasAnyActiveOrgMembershipFromResponse({
        success: true,
        memberships: [{ status: 'suspended', role: 'admin' }],
      }),
    ).toBe(false)
  })

  it('detects active and trialing subscription statuses as access', () => {
    expect(hasActiveSubscriptionStatus('active')).toBe(true)
    expect(hasActiveSubscriptionStatus('trialing')).toBe(true)
    expect(hasActiveSubscriptionStatus('past_due')).toBe(false)
    expect(hasActiveSubscriptionStatus(null)).toBe(false)
  })

  it('resolves granted access from active org membership', async () => {
    backendGetMock.mockImplementation(async (path: string) => {
      if (path === '/api/org/my') {
        return { success: true, memberships: [{ status: 'active', role: 'viewer' }] }
      }
      return { subscription: null }
    })

    await expect(resolveOnboardedHomeAccess()).resolves.toBe('granted')
  })

  it('resolves granted access from active personal subscription', async () => {
    backendGetMock.mockImplementation(async (path: string) => {
      if (path === '/api/org/my') {
        return { success: true, memberships: [] }
      }
      return { subscription: { status: 'trialing' } }
    })

    await expect(resolveOnboardedHomeAccess()).resolves.toBe('granted')
  })

  it('resolves denied access when org and subscription checks succeed without access', async () => {
    backendGetMock.mockImplementation(async (path: string) => {
      if (path === '/api/org/my') {
        return { success: true, memberships: [] }
      }
      return { subscription: null }
    })

    await expect(resolveOnboardedHomeAccess()).resolves.toBe('denied')
  })

  it('resolves unknown access when either access request fails', async () => {
    backendGetMock.mockImplementation(async (path: string) => {
      if (path === '/api/org/my') {
        throw new Error('org request failed')
      }
      return { subscription: null }
    })

    await expect(resolveOnboardedHomeAccess()).resolves.toBe('unknown')
  })
})
