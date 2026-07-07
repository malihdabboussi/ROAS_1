import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendDelete, backendGet, backendPost } from '@/lib/api/backend-client'
import {
  deleteCampaignKnowledgeNode,
  enqueueCampaignKnowledgeFileImport,
  fetchCampaignKnowledgeGraph,
  KNOWLEDGE_DOMAINS,
  searchCampaignKnowledge,
  syncCampaignKnowledgeAssets,
} from './campaign-knowledge.service'

vi.mock('@/lib/api/backend-client', () => ({
  backendDelete: vi.fn(),
  backendGet: vi.fn(),
  backendPost: vi.fn(),
}))

const backendDeleteMock = vi.mocked(backendDelete)
const backendGetMock = vi.mocked(backendGet)
const backendPostMock = vi.mocked(backendPost)

describe('campaign-knowledge.service', () => {
  beforeEach(() => {
    backendDeleteMock.mockReset()
    backendGetMock.mockReset()
    backendPostMock.mockReset()
  })

  it('searches campaign knowledge with the current query and domain contract', async () => {
    const result = { seeds: [], traversed: [], nodes: [] }
    backendGetMock.mockResolvedValue(result)

    await expect(
      searchCampaignKnowledge('campaign-1', 'launch plan', {
        domains: ['strategy', 'marketing'],
      }),
    ).resolves.toEqual(result)

    expect(backendGetMock).toHaveBeenCalledWith(
      '/api/campaigns/campaign-1/knowledge/search?query=launch+plan&domains=strategy%2Cmarketing',
    )
  })

  it('fetches and deletes campaign graph knowledge through the existing endpoints', async () => {
    const graph = { nodes: [], edges: [] }
    backendGetMock.mockResolvedValue(graph)
    backendDeleteMock.mockResolvedValue(undefined)

    await expect(fetchCampaignKnowledgeGraph('campaign-1')).resolves.toEqual(graph)
    await deleteCampaignKnowledgeNode('campaign-1', 'node-1')

    expect(backendGetMock).toHaveBeenCalledWith('/api/campaigns/campaign-1/knowledge/graph')
    expect(backendDeleteMock).toHaveBeenCalledWith(
      '/api/campaigns/campaign-1/knowledge/nodes/node-1',
    )
  })

  it('enqueues file imports and asset sync with the current payload shape', async () => {
    backendPostMock.mockResolvedValueOnce({ success: true, jobId: 'job-1', status: 'queued' })
    backendPostMock.mockResolvedValueOnce({ created: { upload: 1 } })

    await enqueueCampaignKnowledgeFileImport({
      campaignId: 'campaign-1',
      title: 'Brief',
      content: 'Launch brief',
      sourceType: 'upload',
      domain: 'strategy',
      assetId: undefined,
      assetRef: undefined,
    })
    await syncCampaignKnowledgeAssets('campaign-1')

    expect(backendPostMock).toHaveBeenNthCalledWith(1, '/api/brain/import-jobs/campaign-file', {
      campaignId: 'campaign-1',
      title: 'Brief',
      content: 'Launch brief',
      sourceType: 'upload',
      domain: 'strategy',
      assetId: null,
      assetRef: null,
    })
    expect(backendPostMock).toHaveBeenNthCalledWith(
      2,
      '/api/campaigns/campaign-1/knowledge/sync-assets',
      {},
    )
  })

  it('keeps the shared knowledge domain options stable', () => {
    expect(KNOWLEDGE_DOMAINS.map((domain) => domain.value)).toEqual([
      'general',
      'strategy',
      'marketing',
      'finance',
      'operations',
      'creative',
    ])
  })
})
