import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import {
  computePageGraderPackageContentHash,
  type PageGraderMemoryRow,
} from '../page-grader-brain-package-build'
import { PageGraderBrainPackageIngestService } from '../page-grader-brain-package-ingest.service'
import { PageGraderKnowledgeIndexService } from '../page-grader-knowledge-index.service'

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
    const service = new PageGraderKnowledgeIndexService(
      spaceRetrievalIndex as never,
      embedding as never,
    )
    const indexKnowledgeObjects: IndexKnowledgeObjects = service.index.bind(service)
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

  it('repairs missing Brain embeddings even when the Page Grader package is unchanged', async () => {
    const pkg = {
      page_grader_client_id: 'pg-asura',
      client: { id: 'pg-asura', pipeline_stage: 'blocked', status: 'blocked' },
    }
    const contentHash = computePageGraderPackageContentHash(pkg)
    const campaignQuery: Record<string, unknown> = {
      select: vi.fn(() => campaignQuery),
      eq: vi.fn(() => campaignQuery),
      is: vi.fn(() => campaignQuery),
      maybeSingle: vi.fn(async () => ({
        data: {
          id: 'campaign-1',
          name: 'Asura Group',
          config: {
            external_sources: {
              page_grader: { content_hash: contentHash, campaign_space_hash: 'keep-me' },
            },
          },
          context: {},
        },
        error: null,
      })),
      update: vi.fn(() => campaignQuery),
      limit: vi.fn(() => campaignQuery),
    }
    const brainQuery: Record<string, unknown> = {
      select: vi.fn(() => brainQuery),
      eq: vi.fn(() => brainQuery),
      limit: vi.fn(() => brainQuery),
      maybeSingle: vi.fn(async () => ({ data: { id: 'brain-asura' }, error: null })),
    }
    const supabase = {
      from: vi.fn((table: string) => (table === 'campaigns' ? campaignQuery : brainQuery)),
    }
    const memoryEmbeddings = {
      repairBrain: vi.fn(async () => ({ found: 373, embedded: 373, failed: 0 })),
    }
    const service = new PageGraderBrainPackageIngestService(
      {} as never,
      {} as never,
      memoryEmbeddings as never,
    )
    const result = await service.ingestPackage(supabase as never, {
      userId: 'user-1',
      orgId: 'org-1',
      campaignId: 'campaign-1',
      package: pkg,
    })

    expect(memoryEmbeddings.repairBrain).toHaveBeenCalledWith(supabase, {
      brainId: 'brain-asura',
      userId: 'user-1',
      orgId: 'org-1',
    })
    expect(result).toMatchObject({
      skippedUnchanged: true,
      memoriesEmbedded: 373,
      memoryEmbeddingFailures: 0,
    })
    expect(campaignQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          external_sources: {
            page_grader: expect.objectContaining({
              content_hash: contentHash,
              campaign_space_hash: 'keep-me',
              pipeline_stage: 'blocked',
              status: 'blocked',
            }),
          },
        }),
      }),
    )
  })

  it('does not mark an unchanged package synced when Brain embeddings remain missing', async () => {
    const pkg = {
      page_grader_client_id: 'pg-prospecting-on-demand',
      client: { id: 'pg-prospecting-on-demand' },
    }
    const contentHash = computePageGraderPackageContentHash(pkg)
    const campaignQuery: Record<string, unknown> = {
      select: vi.fn(() => campaignQuery),
      eq: vi.fn(() => campaignQuery),
      is: vi.fn(() => campaignQuery),
      maybeSingle: vi.fn(async () => ({
        data: {
          id: 'campaign-1',
          name: 'Prospecting On Demand',
          config: { external_sources: { page_grader: { content_hash: contentHash } } },
          context: {},
        },
        error: null,
      })),
      update: vi.fn(() => campaignQuery),
      limit: vi.fn(() => campaignQuery),
    }
    const brainQuery: Record<string, unknown> = {
      select: vi.fn(() => brainQuery),
      eq: vi.fn(() => brainQuery),
      limit: vi.fn(() => brainQuery),
      maybeSingle: vi.fn(async () => ({ data: { id: 'brain-1' }, error: null })),
    }
    const supabase = {
      from: vi.fn((table: string) => (table === 'campaigns' ? campaignQuery : brainQuery)),
    }
    const service = new PageGraderBrainPackageIngestService(
      {} as never,
      {} as never,
      {
        repairBrain: vi.fn(async () => ({ found: 32, embedded: 0, failed: 32 })),
      } as never,
    )

    await expect(
      service.ingestPackage(supabase as never, {
        userId: 'user-1',
        orgId: 'org-1',
        campaignId: 'campaign-1',
        package: pkg,
      }),
    ).rejects.toThrow('32 Page Grader memories are missing retrieval embeddings')
    expect(campaignQuery.update).not.toHaveBeenCalled()
  })
})
