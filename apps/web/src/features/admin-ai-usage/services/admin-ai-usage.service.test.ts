import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet } from '@/lib/api/backend-client'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { loadAdminAiUsage, normalizeAdminAiUsageReport } from './admin-ai-usage.service'

vi.mock('@/lib/api/backend-client', () => ({ backendGet: vi.fn() }))
vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: vi.fn(),
  invalidateCachedFetch: vi.fn(),
}))

const legacyReport = {
  generatedAt: '2026-07-26T22:00:00.000Z',
  days: 7,
  summary: {
    traces: 1,
    completed: 1,
    failed: 0,
    tokens: 100,
    traceCostUsd: 0.01,
    providerAttempts: 1,
    providerCostUsd: 0.02,
  },
  routes: [],
  models: [],
  openRouterModels: [
    {
      workload: 'media · generate_image',
      requestedModel: 'google/gemini-image',
      resolvedModel: 'google/gemini-image',
      attempts: 1,
      tokens: 100,
      costUsd: 0.02,
      unsettled: 0,
    },
  ],
  opportunities: {
    oversizedContext: { count: 0, tokens: 0, costUsd: 0 },
    failedWithCost: { count: 0, costUsd: 0 },
    unlinkedPaidAttempts: { count: 0, costUsd: 0 },
    missingTraceUsage: 0,
    unsettledAttempts: 0,
    reconciliationStale: false,
  },
  coverage: {
    attempts: 1,
    correlatedAttempts: 1,
    usageLinkedAttempts: 1,
  },
  reconciliation: [],
  recentCostlyTraces: [],
}

const cachedFetchMock = vi.mocked(cachedFetch)
const backendGetMock = vi.mocked(backendGet)
const invalidateCachedFetchMock = vi.mocked(invalidateCachedFetch)

describe('normalizeAdminAiUsageReport', () => {
  beforeEach(() => {
    cachedFetchMock.mockReset()
    backendGetMock.mockReset()
    invalidateCachedFetchMock.mockReset()
  })

  it('fills image validation metrics missing from a legacy cached report', () => {
    const report = normalizeAdminAiUsageReport(legacyReport)

    expect(report.opportunities.paidOutputInvalid).toEqual({ count: 0, costUsd: 0 })
    expect(report.openRouterModels[0]?.outputIssues).toBe(0)
    expect(report.daily).toEqual([])
    expect(report.modelSpend).toEqual([])
    expect(report.dailyModelSpend).toEqual([])
    expect(report.comparison.providerCostUsd).toEqual({
      current: 0.02,
      previous: 0,
      changePercent: null,
    })
    expect(report.range).toEqual({
      startDate: '2026-07-20',
      endDate: '2026-07-26',
      previousStartDate: '2026-07-13',
      previousEndDate: '2026-07-19',
    })
  })

  it('normalizes a legacy report returned directly from the request cache', async () => {
    cachedFetchMock.mockResolvedValue(legacyReport)

    const report = await loadAdminAiUsage({ days: 7 })

    expect(report.opportunities.paidOutputInvalid).toEqual({ count: 0, costUsd: 0 })
    expect(report.openRouterModels[0]?.outputIssues).toBe(0)
  })

  it('uses the complete custom range in the URL and cache key', async () => {
    cachedFetchMock.mockImplementation(async (_key, fetcher) => fetcher())
    backendGetMock.mockResolvedValue(legacyReport)

    await loadAdminAiUsage({ startDate: '2026-07-10', endDate: '2026-07-11' })

    expect(cachedFetchMock).toHaveBeenCalledWith(
      'admin-ai-usage:start=2026-07-10&end=2026-07-11',
      expect.any(Function),
      { ttlMs: 60000 },
    )
    expect(backendGetMock).toHaveBeenCalledWith(
      '/api/admin/ai-usage?start=2026-07-10&end=2026-07-11',
    )
  })

  it('distinguishes ranges and invalidates the feature cache on force refresh', async () => {
    cachedFetchMock.mockImplementation(async (_key, fetcher) => fetcher())
    backendGetMock.mockResolvedValue(legacyReport)

    await loadAdminAiUsage({ days: 7 })
    await loadAdminAiUsage({ days: 30 }, true)

    expect(cachedFetchMock.mock.calls.map(([key]) => key)).toEqual([
      'admin-ai-usage:days=7',
      'admin-ai-usage:days=30',
    ])
    expect(invalidateCachedFetchMock).toHaveBeenCalledWith('admin-ai-usage:')
  })
})
