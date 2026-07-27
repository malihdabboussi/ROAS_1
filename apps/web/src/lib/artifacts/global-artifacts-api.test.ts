import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet } from '@/lib/api/backend-client'
import { fetchCampaignArtifacts, fetchGlobalArtifacts } from './global-artifacts-api'

vi.mock('@/lib/api/backend-client', () => ({ backendGet: vi.fn() }))

const mockedBackendGet = vi.mocked(backendGet)

describe('fetchGlobalArtifacts', () => {
  beforeEach(() => {
    mockedBackendGet.mockReset()
  })

  it('merges docs, campaign artifacts, and media into one recent account-wide list', async () => {
    mockedBackendGet.mockImplementation(async (path: string) => {
      if (path.includes('types=doc')) {
        return {
          results: [
            {
              kind: 'doc',
              id: 'doc-1',
              label: 'Launch brief',
              subtitle: 'Doc',
              url: '/spaces?space=space-1&item=doc-1',
              updatedAt: '2026-07-16T12:00:00.000Z',
            },
          ],
        }
      }
      if (path.includes('types=artifact')) {
        return {
          results: [
            {
              kind: 'artifact',
              id: 'presentation-1',
              label: 'Q3 deck',
              subtitle: 'Presentation',
              url: null,
              campaignId: 'campaign-1',
              artifactKind: 'presentation',
              updatedAt: '2026-07-17T12:00:00.000Z',
            },
          ],
        }
      }
      if (path.startsWith('/api/media/assets')) {
        return {
          assets: [
            {
              id: 'image-1',
              name: 'Clock image',
              original_filename: 'clock.png',
              asset_type: 'image',
              public_url: 'https://example.com/clock.png',
              mime_type: 'image/png',
              category: 'ai-generated',
              source: 'generated',
              tags: ['ai-generated'],
              campaign_id: 'campaign-1',
              space_id: 'space-1',
              conversation_id: null,
              created_at: '2026-07-18T12:00:00.000Z',
            },
          ],
          total: 1,
        }
      }
      if (path === '/api/campaigns') {
        return [{ id: 'campaign-1', name: 'Q3 Launch' }]
      }
      if (path.startsWith('/api/spaces')) {
        return [{ id: 'space-1', title: 'Creative Space', campaign_id: 'campaign-1' }]
      }
      throw new Error(`Unexpected path: ${path}`)
    })

    const items = await fetchGlobalArtifacts('')

    expect(items.map((item) => item.id)).toEqual(['image-1', 'presentation-1', 'doc-1'])
    expect(items[0]).toMatchObject({
      category: 'images',
      contextLabel: 'Creative Space',
      badge: 'Image',
      sourceKind: 'generated',
      thumbnailUrl: 'https://example.com/clock.png',
      viewer: { type: 'image', fileUrl: 'https://example.com/clock.png' },
    })
    expect(items[1]).toMatchObject({
      category: 'presentations',
      contextLabel: 'Q3 Launch',
      sourceKind: 'created',
      viewer: { type: 'presentation', entityId: 'presentation-1' },
    })
    expect(items[2]).toMatchObject({
      category: 'docs',
      contextLabel: 'Creative Space',
      sourceKind: 'created',
      viewer: { type: 'doc', entityTable: 'space_items', entityId: 'doc-1' },
    })
  })

  it('keeps funnels and presentations as first-class library categories', async () => {
    mockedBackendGet.mockImplementation(async (path: string) => {
      if (path.includes('types=artifact')) {
        return {
          results: [
            {
              kind: 'artifact',
              id: 'funnel-1',
              label: 'Registration funnel',
              subtitle: 'Funnel',
              url: null,
              artifactKind: 'funnel',
            },
            {
              kind: 'artifact',
              id: 'presentation-1',
              label: 'Sales deck',
              subtitle: 'Presentation',
              url: null,
              artifactKind: 'presentation',
            },
          ],
        }
      }
      if (path.includes('types=doc')) return { results: [] }
      if (path.startsWith('/api/media/assets')) return { assets: [], total: 0 }
      if (path === '/api/campaigns' || path.startsWith('/api/spaces')) return []
      throw new Error(`Unexpected path: ${path}`)
    })

    await expect(fetchGlobalArtifacts('')).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'funnel-1', category: 'funnels' }),
        expect.objectContaining({ id: 'presentation-1', category: 'presentations' }),
      ]),
    )
  })

  it('keeps videos as a first-class library category with their playable preview URL', async () => {
    mockedBackendGet.mockImplementation(async (path: string) => {
      if (path.includes('types=doc') || path.includes('types=artifact')) return { results: [] }
      if (path.startsWith('/api/media/assets')) {
        return {
          assets: [
            {
              id: 'video-1',
              name: 'Launch teaser',
              original_filename: 'launch-teaser.mp4',
              asset_type: 'video',
              public_url: 'https://example.com/launch-teaser.mp4',
              mime_type: 'video/mp4',
              source: 'generated',
              campaign_id: null,
              created_at: '2026-07-18T12:00:00.000Z',
            },
          ],
          total: 1,
        }
      }
      if (path === '/api/campaigns' || path.startsWith('/api/spaces')) return []
      throw new Error(`Unexpected path: ${path}`)
    })

    await expect(fetchGlobalArtifacts('')).resolves.toMatchObject([
      {
        id: 'video-1',
        category: 'videos',
        badge: 'Video',
        sourceKind: 'generated',
        viewer: {
          type: 'video',
          fileUrl: 'https://example.com/launch-teaser.mp4',
          mimeType: 'video/mp4',
        },
      },
    ])
  })

  it('keeps successful artifact sources when one source returns a server error', async () => {
    mockedBackendGet.mockImplementation(async (path: string) => {
      if (path.includes('types=doc')) throw new Error('Internal server error')
      if (path.includes('types=artifact')) return { results: [] }
      if (path.startsWith('/api/media/assets')) {
        return {
          assets: [
            {
              id: 'image-1',
              name: 'Clock image',
              original_filename: 'clock.png',
              asset_type: 'image',
              public_url: 'https://example.com/clock.png',
              mime_type: 'image/png',
              campaign_id: null,
              created_at: '2026-07-18T12:00:00.000Z',
            },
          ],
          total: 1,
        }
      }
      if (path === '/api/campaigns' || path.startsWith('/api/spaces')) return []
      throw new Error(`Unexpected path: ${path}`)
    })

    await expect(fetchGlobalArtifacts('')).resolves.toMatchObject([
      { id: 'image-1', category: 'images' },
    ])
  })

  it('loads later media pages instead of silently stopping at the first 100 assets', async () => {
    const mediaRows = Array.from({ length: 101 }, (_, index) => ({
      id: `image-${index}`,
      name: `Image ${index}`,
      original_filename: `image-${index}.png`,
      asset_type: 'image',
      public_url: `https://example.com/image-${index}.png`,
      mime_type: 'image/png',
      campaign_id: null,
      created_at: '2026-07-18T12:00:00.000Z',
    }))
    mockedBackendGet.mockImplementation(async (path: string) => {
      if (path.includes('types=doc') || path.includes('types=artifact')) return { results: [] }
      if (path === '/api/media/assets?limit=100') {
        return { assets: mediaRows.slice(0, 100), total: 101 }
      }
      if (path === '/api/media/assets?limit=100&offset=100') {
        return { assets: mediaRows.slice(100), total: 101 }
      }
      if (path === '/api/campaigns' || path.startsWith('/api/spaces')) return []
      throw new Error(`Unexpected path: ${path}`)
    })

    const items = await fetchGlobalArtifacts('')

    expect(items).toHaveLength(101)
    expect(mockedBackendGet).toHaveBeenCalledWith(
      '/api/media/assets?limit=100&offset=100',
      undefined,
    )
  })
})

describe('fetchCampaignArtifacts', () => {
  it('returns only artifacts and media belonging to the requested Campaign', async () => {
    vi.mocked(backendGet).mockImplementation(async (path: string) => {
      if (path.startsWith('/api/entity-search?') && path.includes('types=doc')) {
        return { results: [] } as never
      }
      if (path.startsWith('/api/entity-search?') && path.includes('types=artifact')) {
        return {
          results: [
            {
              kind: 'artifact',
              id: 'asset-1',
              label: 'Campaign one ad',
              subtitle: 'Ad',
              url: null,
              campaignId: 'campaign-1',
              artifactKind: 'ad',
            },
            {
              kind: 'artifact',
              id: 'asset-2',
              label: 'Campaign two ad',
              subtitle: 'Ad',
              url: null,
              campaignId: 'campaign-2',
              artifactKind: 'ad',
            },
          ],
        } as never
      }
      if (path.startsWith('/api/media/assets')) return { assets: [], total: 0 } as never
      if (path === '/api/campaigns') {
        return [
          { id: 'campaign-1', name: 'One' },
          { id: 'campaign-2', name: 'Two' },
        ] as never
      }
      if (path.startsWith('/api/spaces')) return [] as never
      throw new Error(`Unexpected path: ${path}`)
    })

    const items = await fetchCampaignArtifacts('campaign-1', '')
    expect(items.map((item) => item.id)).toEqual(['asset-1'])
  })
})
