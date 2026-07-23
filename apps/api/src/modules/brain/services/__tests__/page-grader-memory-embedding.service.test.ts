import { describe, expect, it, vi } from 'vitest'
import { PageGraderMemoryEmbeddingService } from '../page-grader-memory-embedding.service'

function createRepository(rows: Array<{ id: string; content: string }>) {
  const updates: Array<{ id: string; embedding: string }> = []
  return {
    updates,
    repository: {
      loadMissing: vi.fn(async () => ({ data: rows, error: null })),
      updateEmbedding: vi.fn(
        async (
          _supabase: unknown,
          input: {
            memoryId: string
            embedding: string
          },
        ) => {
          updates.push({ id: input.memoryId, embedding: input.embedding })
          return { error: null }
        },
      ),
    },
  }
}

describe('PageGraderMemoryEmbeddingService', () => {
  it('embeds only missing Page Grader memories and persists vectors', async () => {
    const stored = createRepository([
      { id: 'memory-1', content: 'Asura Group offer and positioning' },
      { id: 'memory-2', content: 'Asura Group audience' },
    ])
    const billingBatch = { totalTokens: 0 }
    const embedding = {
      createEmbeddingBillingBatch: vi.fn(() => billingBatch),
      getEmbedding: vi.fn(async () => [0.1, 0.2]),
      settleEmbeddingBillingBatch: vi.fn(async () => undefined),
    }
    const service = new PageGraderMemoryEmbeddingService(
      embedding as never,
      stored.repository as never,
    )

    const result = await service.repairBrain({} as never, {
      brainId: 'brain-asura',
      userId: 'user-1',
      orgId: 'org-1',
    })

    expect(result).toEqual({ found: 2, embedded: 2, failed: 0 })
    expect(embedding.getEmbedding).toHaveBeenCalledTimes(2)
    expect(embedding.getEmbedding).toHaveBeenCalledWith(
      'Asura Group offer and positioning',
      expect.objectContaining({
        taskType: 'RETRIEVAL_DOCUMENT',
        billingBatch,
      }),
    )
    expect(stored.updates).toHaveLength(2)
    expect(stored.updates[0]).toEqual({
      id: 'memory-1',
      embedding: '[0.1,0.2]',
    })
    expect(embedding.settleEmbeddingBillingBatch).toHaveBeenCalledWith(billingBatch)
  })

  it('reports provider failures without marking memories embedded', async () => {
    const stored = createRepository([{ id: 'memory-1', content: 'Client fact' }])
    const embedding = {
      createEmbeddingBillingBatch: vi.fn(() => ({ totalTokens: 0 })),
      getEmbedding: vi.fn(async () => null),
      settleEmbeddingBillingBatch: vi.fn(async () => undefined),
    }
    const service = new PageGraderMemoryEmbeddingService(
      embedding as never,
      stored.repository as never,
    )

    const result = await service.repairBrain({} as never, {
      brainId: 'brain-1',
      userId: 'user-1',
      orgId: null,
    })

    expect(result).toEqual({ found: 1, embedded: 0, failed: 1 })
    expect(stored.updates).toHaveLength(0)
  })
})
