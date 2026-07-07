import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet, backendPost } from '@/lib/api/backend-client'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { getActiveOrgIdFromStorage } from '@/lib/utils/org-storage'
import type { BillingStatusResponse } from './billing.types'
import {
  getAgentBrainStatus,
  getAutoRechargeSettings,
  getBillingStatus,
  getBillingStatusCached,
  purchaseCredits,
  updateAutoRechargeSettings,
} from './billing-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendFetch: vi.fn(),
  backendGet: vi.fn(),
  backendPost: vi.fn(),
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: vi.fn((_key: string, fetcher: () => Promise<unknown>) => fetcher()),
  invalidateCachedFetch: vi.fn(),
}))

vi.mock('@/lib/utils/org-storage', () => ({
  getActiveOrgIdFromStorage: vi.fn(),
}))

const backendGetMock = vi.mocked(backendGet)
const backendPostMock = vi.mocked(backendPost)
const cachedFetchMock = vi.mocked(cachedFetch)
const invalidateCachedFetchMock = vi.mocked(invalidateCachedFetch)
const getActiveOrgIdFromStorageMock = vi.mocked(getActiveOrgIdFromStorage)

const balance = {
  baseCredits: 1000,
  baseCreditsUsed: 100,
  rolloverCredits: 200,
  purchasedCredits: 300,
  purchasedCreditsUsed: 50,
  totalAvailable: 1350,
  totalUsed: 150,
}

const autoRecharge = {
  is_enabled: true,
  trigger_credits: 500,
  topup_credits: 2000,
  last_recharged_at: null,
  monthly_cap_cents: 10_000,
}

const personalStatus: BillingStatusResponse = {
  balance,
  subscription: null,
  plan: null,
  role: 'member',
  creditDiscountPercent: 0,
  usage: {
    campaigns: 0,
    publishedFunnels: 0,
    customDomains: 0,
    presentations: 0,
    offers: 0,
    sequences: 0,
    brainEntries: 0,
    storageBytes: 0,
    customThemes: 0,
  },
  autoRecharge,
}

describe('billing api', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
    backendPostMock.mockReset()
    cachedFetchMock.mockReset()
    invalidateCachedFetchMock.mockReset()
    getActiveOrgIdFromStorageMock.mockReset()
    cachedFetchMock.mockImplementation((_key: string, fetcher: () => Promise<unknown>) =>
      fetcher(),
    )
  })

  it('fetches personal billing status from the existing route', async () => {
    getActiveOrgIdFromStorageMock.mockReturnValue(null)
    backendGetMock.mockResolvedValue(personalStatus)

    await expect(getBillingStatus()).resolves.toEqual(personalStatus)

    expect(backendGetMock).toHaveBeenCalledWith('/api/billing/status')
  })

  it('maps org billing status into the existing billing status shape', async () => {
    getActiveOrgIdFromStorageMock.mockReturnValue('org-1')
    backendGetMock.mockResolvedValue({
      success: true,
      balance,
      plan: {
        name: 'Enterprise',
        slug: 'enterprise-year',
        price: 9900,
        billingPeriod: 'annual',
        baseCredits: 10000,
      },
      autoRecharge,
    })

    await expect(getBillingStatus()).resolves.toMatchObject({
      balance,
      subscription: null,
      role: 'enterprise',
      creditDiscountPercent: 0,
      autoRecharge,
      plan: {
        slug: 'enterprise-year',
        name: 'Enterprise',
        price_amount: 9900,
        interval: 'year',
        base_credits: 10000,
      },
    })

    expect(backendGetMock).toHaveBeenCalledWith('/api/org/org-1/billing/status')
  })

  it('uses the existing billing status cache key and force invalidation', async () => {
    getActiveOrgIdFromStorageMock.mockReturnValue('org-1')
    backendGetMock.mockResolvedValue(personalStatus)

    await getBillingStatusCached({ force: true })

    expect(invalidateCachedFetchMock).toHaveBeenCalledWith('billing-status')
    expect(cachedFetchMock).toHaveBeenCalledWith(
      'billing-status:org-1',
      expect.any(Function),
      { ttlMs: 60_000 },
    )
  })

  it('purchases credits through personal and org routes', async () => {
    backendPostMock.mockResolvedValue({ sessionId: 'session-1', url: 'https://checkout.test' })
    getActiveOrgIdFromStorageMock.mockReturnValueOnce(null).mockReturnValueOnce('org-1')

    await purchaseCredits('pack-medium', 3)
    await purchaseCredits('pack-medium', 3, 'https://success.test', 'https://cancel.test')

    expect(backendPostMock).toHaveBeenNthCalledWith(1, '/api/billing/purchase-credits', {
      packId: 'pack-medium',
      quantity: 3,
      successUrl: undefined,
      cancelUrl: undefined,
    })
    expect(backendPostMock).toHaveBeenNthCalledWith(
      2,
      '/api/org/org-1/billing/purchase-credits',
      {
        packId: 'pack-medium',
        quantity: 3,
        successUrl: 'https://success.test',
        cancelUrl: 'https://cancel.test',
      },
    )
  })

  it('loads and updates auto recharge settings through existing personal and org routes', async () => {
    backendGetMock.mockResolvedValue(autoRecharge)
    backendPostMock.mockResolvedValue(autoRecharge)
    getActiveOrgIdFromStorageMock
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('org-1')
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('org-1')

    await expect(getAutoRechargeSettings()).resolves.toEqual(autoRecharge)
    await expect(getAutoRechargeSettings()).resolves.toEqual(autoRecharge)
    await updateAutoRechargeSettings({ enabled: true, triggerCredits: 500, topupCredits: 2000 })
    await updateAutoRechargeSettings({
      enabled: true,
      triggerCredits: 500,
      topupCredits: 2000,
      monthlyCap: null,
    })

    expect(backendGetMock).toHaveBeenNthCalledWith(1, '/api/billing/auto-recharge')
    expect(backendGetMock).toHaveBeenNthCalledWith(2, '/api/org/org-1/billing/auto-recharge')
    expect(backendPostMock).toHaveBeenNthCalledWith(1, '/api/billing/auto-recharge', {
      enabled: true,
      triggerCredits: 500,
      topupCredits: 2000,
    })
    expect(backendPostMock).toHaveBeenNthCalledWith(
      2,
      '/api/org/org-1/billing/auto-recharge',
      {
        enabled: true,
        triggerCredits: 500,
        topupCredits: 2000,
        monthlyCap: null,
      },
    )
  })

  it('adds the active org id to agent brain status query params', async () => {
    getActiveOrgIdFromStorageMock.mockReturnValue('org-1')
    backendGetMock.mockResolvedValue({ hasBrain: true, brainId: 'brain-1' })

    await expect(getAgentBrainStatus('agent-1')).resolves.toEqual({
      hasBrain: true,
      brainId: 'brain-1',
    })

    expect(backendGetMock).toHaveBeenCalledWith(
      '/api/billing/agent-brain/status?agentId=agent-1&orgId=org-1',
    )
  })
})
