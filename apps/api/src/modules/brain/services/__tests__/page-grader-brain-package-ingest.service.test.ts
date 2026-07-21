import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { PageGraderMemoryRow } from '../page-grader-brain-package-build'
import { PageGraderBrainPackageIngestService } from '../page-grader-brain-package-ingest.service'

type IndexKnowledgeObjects = (
  supabase: SupabaseClient,
  input: {
    userId: string
    orgId: string | null
    spaceId: string
    campaignId: string
    pageGraderClientId: string
    rows: PageGraderMemoryRow[]
  },
) => Promise<number>

describe('PageGraderBrainPackageIngestService', () => {
  it('indexes Page Grader knowledge with bounded concurrency', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const spaceRetrievalIndex = {
      deleteSource: vi.fn(async () => ({ deleted: true })),
      indexSource: vi.fn(async () => {
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        await new Promise((resolve) => setTimeout(resolve, 5))
        inFlight -= 1
        return { indexed: 1 }
      }),
    }
    const billingBatch = { totalTokens: 0 }
    const embedding = {
      createEmbeddingBillingBatch: vi.fn(() => billingBatch),
      settleEmbeddingBillingBatch: vi.fn(async () => undefined),
    }
    const service = new PageGraderBrainPackageIngestService(
      spaceRetrievalIndex as never,
      embedding as never,
    )
    const indexKnowledgeObjects = (
      service as unknown as { indexKnowledgeObjects: IndexKnowledgeObjects }
    ).indexKnowledgeObjects.bind(service)
    const rows = Array.from({ length: 13 }, (_, index) => ({
      content: `Knowledge ${index}`,
      content_hash: String(index).padStart(64, '0'),
      memory_type: 'fact',
      source_type: 'page_grader_seed',
      source_id: `source-${index}`,
      source_title: `Offer: ${index}`,
      confidence: 1,
      significance: 1,
      tags: [],
      metadata: {},
    })) satisfies PageGraderMemoryRow[]

    const indexed = await indexKnowledgeObjects({} as SupabaseClient, {
      userId: 'user-1',
      orgId: 'org-1',
      spaceId: 'space-1',
      campaignId: 'campaign-1',
      pageGraderClientId: 'client-1',
      rows,
    })

    expect(indexed).toBe(13)
    expect(spaceRetrievalIndex.indexSource).toHaveBeenCalledTimes(13)
    expect(spaceRetrievalIndex.indexSource).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ billingBatch }),
    )
    expect(embedding.createEmbeddingBillingBatch).toHaveBeenCalledWith({
      userId: 'user-1',
      orgId: 'org-1',
    })
    expect(embedding.settleEmbeddingBillingBatch).toHaveBeenCalledTimes(1)
    expect(maxInFlight).toBeGreaterThan(1)
    expect(maxInFlight).toBeLessThanOrEqual(6)
  })
})
