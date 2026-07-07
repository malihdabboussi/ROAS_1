import { afterEach, describe, expect, it, vi } from 'vitest'
import { VibeyMcpDocsSearchService } from './vibey-mcp-docs-search.service'

describe('VibeyMcpDocsSearchService', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('posts docs search input to the configured docs endpoint', async () => {
    vi.stubEnv('VIBEY_DOCS_BASE_URL', 'https://docs.example.com/')
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        citations: [
          {
            slug: 'campaigns/campaign-dashboard',
            title: 'Campaign Dashboard',
            snippet: 'Campaign dashboard docs',
            chunk_index: 0,
            similarity: 0.82,
          },
        ],
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await new VibeyMcpDocsSearchService().search({
      query: 'campaign dashboard',
      match_count: 3,
      min_similarity: 0.4,
    })

    expect(fetchMock).toHaveBeenCalledWith('https://docs.example.com/api/docs-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'campaign dashboard',
        match_count: 3,
        min_similarity: 0.4,
      }),
    })
    expect(result.citations).toHaveLength(1)
  })

  it('throws the upstream docs error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: 'query is required' }),
      })),
    )

    await expect(new VibeyMcpDocsSearchService().search({ query: '' })).rejects.toThrow(
      'query is required',
    )
  })
})
