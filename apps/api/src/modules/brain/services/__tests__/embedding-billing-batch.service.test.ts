import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmbeddingService } from '../embedding.service'

describe('EmbeddingService billing batches', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('charges accumulated embedding usage once when the batch settles', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          embedding: { values: [0.1, 0.2] },
          usageMetadata: { promptTokenCount: 10, totalTokenCount: 10 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          embedding: { values: [0.3, 0.4] },
          usageMetadata: { promptTokenCount: 20, totalTokenCount: 20 },
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const config = {
      get: vi.fn((key: string) => (key === 'GEMINI_API_KEY' ? 'test-key' : undefined)),
    }
    const credits = { processDirectTextUsage: vi.fn().mockResolvedValue(null) }
    const service = new EmbeddingService(config as never, credits as never)
    const batch = service.createEmbeddingBillingBatch({ userId: 'user-1', orgId: 'org-1' })

    await service.getEmbedding('first', { billingBatch: batch })
    await service.getEmbedding('second', { billingBatch: batch })

    expect(credits.processDirectTextUsage).not.toHaveBeenCalled()

    await service.settleEmbeddingBillingBatch(batch)

    expect(credits.processDirectTextUsage).toHaveBeenCalledTimes(1)
    expect(credits.processDirectTextUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        orgId: 'org-1',
        feature: 'brain',
        action: 'embedding',
        modelName: 'gemini-embedding-2',
        usage: {
          input: 30,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 30,
        },
      }),
    )
  })

  it('returns Gemini text usage and the actual provider cost used for credit tracking', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: '{"signals":[]}' }] } }],
          usageMetadata: {
            promptTokenCount: 80,
            candidatesTokenCount: 20,
            totalTokenCount: 100,
          },
        }),
      }),
    )
    const config = {
      get: vi.fn((key: string) => (key === 'GEMINI_API_KEY' ? 'test-key' : undefined)),
    }
    const credits = {
      processDirectTextUsage: vi.fn().mockResolvedValue({ apiCost: 0.004, credits: 1 }),
    }
    const service = new EmbeddingService(config as never, credits as never)

    const result = await service.callGeminiWithUsage('Analyze Slack', undefined, {
      userId: 'user-1',
      orgId: 'org-1',
    })

    expect(result).toEqual({
      text: '{"signals":[]}',
      usage: { inputTokens: 80, outputTokens: 20, totalTokens: 100 },
      providerCostUsd: 0.004,
    })
  })
})
