import { describe, expect, it, vi } from 'vitest'
import { SearchService } from '../search.service'

describe('SearchService', () => {
  it('uses the default user brain and returns memory text matches when embeddings are unavailable', async () => {
    const supabase = {}
    const searchRepository = {
      resolveBrainId: vi.fn().mockResolvedValue('brain-1'),
      findMemoryTextMatches: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'mem-1',
            content: 'Pricing anchor is customer-approved.',
            memory_type: 'customer_signal',
            confidence: 0.9,
            significance: 0.8,
            tags: ['pricing'],
          },
        ],
        error: null,
      }),
      findSimilarSnapshots: vi.fn().mockResolvedValue([]),
      searchSkEntries: vi.fn(),
    }
    const service = new SearchService(
      { getEmbedding: vi.fn().mockResolvedValue(null) } as never,
      { getBoostMap: vi.fn().mockResolvedValue({}) } as never,
      searchRepository as never,
    )

    const result = await service.search(supabase as never, 'user-1', {
      query: 'pricing',
      mode: 'semantic',
      limit: 5,
      orgId: null,
    })

    expect(searchRepository.resolveBrainId).toHaveBeenCalledWith(
      supabase,
      'user-1',
      undefined,
      undefined,
      null,
    )
    expect(searchRepository.findMemoryTextMatches).toHaveBeenCalledWith(
      supabase,
      'brain-1',
      'pricing',
      5,
    )
    expect(result.results).toEqual([
      expect.objectContaining({
        id: 'mem-1',
        node_type: 'memory',
        score: 0.6,
      }),
    ])
  })
})
