import { describe, expect, it, vi } from 'vitest'
import { SearchApiAgentService } from '../searchapi-agent.service'

describe('SearchApiAgentService', () => {
  it('maps meta page search to the SearchAPI engine and charges credits', async () => {
    const api = {
      search: vi.fn(async () => ({
        status: 200,
        body: { page_results: [{ page_id: '1', name: 'Acme' }] },
      })),
    }
    const credits = {
      processDirectTextUsage: vi.fn(async () => undefined),
    }
    const service = new SearchApiAgentService(api as any, credits as any, {} as any)

    const result = await service.run('user-1', 'meta_ads_page_search', { q: 'Acme' }, 'org-1')

    expect(api.search).toHaveBeenCalledWith('meta_ad_library_page_search', { q: 'Acme' })
    expect(credits.processDirectTextUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        orgId: 'org-1',
        feature: 'searchapi',
        action: 'meta_ads_page_search',
      }),
    )
    expect(result).toMatchObject({ success: true, action: 'meta_ads_page_search' })
  })

  it('requires page_id or q for meta ads search', async () => {
    const service = new SearchApiAgentService(
      { search: vi.fn() } as any,
      { processDirectTextUsage: vi.fn() } as any,
      {} as any,
    )

    await expect(service.run('user-1', 'meta_ads_search', {})).rejects.toMatchObject({
      response: { success: false },
    })
  })
})
