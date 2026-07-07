import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet } from '@/lib/api/backend-client'
import { invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { listCrmContacts, listCrmFunnels } from './crm-contacts-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
}))

const backendGetMock = vi.mocked(backendGet)

describe('crm contacts api', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
    invalidateCachedFetch('crm-contacts:')
    invalidateCachedFetch('crm-funnels')
  })

  it('fetches CRM contacts with the existing query parameters', async () => {
    backendGetMock.mockResolvedValue({ contacts: [], total: 0, hasMore: false })

    await expect(
      listCrmContacts({
        limit: 25,
        offset: 50,
        sort: 'name.asc',
        search: 'ada',
        filters: {
          tagIds: { operator: 'is', value: ['vip'], multiSelectLogic: 'any' },
        },
        includeArchived: true,
        contactType: 'customer',
        campaignId: 'campaign-1',
        segmentId: 'segment-1',
      }),
    ).resolves.toEqual({ contacts: [], total: 0, hasMore: false })

    const calledUrl = new URL(String(backendGetMock.mock.calls[0]?.[0]), 'http://localhost')
    expect(calledUrl.pathname).toBe('/api/leads/crm/list')
    expect(calledUrl.searchParams.get('limit')).toBe('25')
    expect(calledUrl.searchParams.get('offset')).toBe('50')
    expect(calledUrl.searchParams.get('sort')).toBe('name.asc')
    expect(calledUrl.searchParams.get('search')).toBe('ada')
    expect(calledUrl.searchParams.get('includeArchived')).toBe('true')
    expect(calledUrl.searchParams.get('contactType')).toBe('customer')
    expect(calledUrl.searchParams.get('campaignId')).toBe('campaign-1')
    expect(calledUrl.searchParams.get('segmentId')).toBe('segment-1')
    expect(JSON.parse(calledUrl.searchParams.get('filters') ?? '{}')).toEqual({
      tagIds: { operator: 'is', value: ['vip'], multiSelectLogic: 'any' },
    })
  })

  it('omits the CRM contacts query string when no params are set', async () => {
    backendGetMock.mockResolvedValue({ contacts: [], total: 0, hasMore: false })

    await listCrmContacts({})

    expect(backendGetMock).toHaveBeenCalledWith('/api/leads/crm/list')
  })

  it('fetches CRM funnels through the org-scoped cache key', async () => {
    backendGetMock.mockResolvedValue({ funnels: [{ id: 'funnel-1', title: 'Main' }] })

    await expect(listCrmFunnels()).resolves.toEqual({
      funnels: [{ id: 'funnel-1', title: 'Main' }],
    })

    expect(backendGetMock).toHaveBeenCalledWith('/api/leads/crm/funnels')
  })
})
