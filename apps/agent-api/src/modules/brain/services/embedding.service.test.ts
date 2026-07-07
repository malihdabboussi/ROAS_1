import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmbeddingService } from './embedding.service'

function makeService(
  processDirectTextUsage = vi.fn(async () => ({
    credits: 1,
    balance: { totalAvailable: 99 },
    apiCost: 0.001,
  })),
) {
  const config = {
    get: vi.fn((key: string) => {
      if (key === 'GEMINI_API_KEY') return 'test-gemini-key'
      if (key === 'BRAIN_EMBEDDING_TIMING_LOGS') return '1'
      return undefined
    }),
  }
  const credits = {
    processDirectTextUsage,
  }
  const service = new EmbeddingService(config as any, credits as any)
  const log = vi.fn()
  ;(service as any).logger.log = log
  ;(service as any).logger.warn = vi.fn()
  return { service, credits, log }
}

describe('EmbeddingService', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('logs detailed embedding timing and charges usage before returning the vector', async () => {
    let resolveCharge!: (value: {
      credits: number
      balance: { totalAvailable: number }
      apiCost: number
    }) => void
    const chargePromise = new Promise<{
      credits: number
      balance: { totalAvailable: number }
      apiCost: number
    }>((resolve) => {
      resolveCharge = resolve
    })
    const processDirectTextUsage = vi.fn(() => chargePromise)
    const { service, credits, log } = makeService(processDirectTextUsage)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn(async () => ({
          embedding: { values: [0.1, 0.2, 0.3] },
          usageMetadata: {
            promptTokenCount: 8,
            candidatesTokenCount: 0,
            totalTokenCount: 8,
          },
        })),
      })),
    )

    const pendingResult = service.getEmbedding(' retainer cap ', {
      taskType: 'RETRIEVAL_QUERY',
      billing: { userId: 'user-1', orgId: 'org-1' },
    })
    let returned = false
    void pendingResult.then(() => {
      returned = true
    })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(returned).toBe(false)
    expect(credits.processDirectTextUsage).toHaveBeenCalledWith({
      userId: 'user-1',
      orgId: 'org-1',
      feature: 'brain',
      action: 'embedding',
      modelName: 'gemini-embedding-2',
      usage: {
        input: 8,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 8,
      },
      costSource: 'runtime_tokens',
    })

    let entries = log.mock.calls.map(([message]) => JSON.parse(String(message)))
    const stages = entries.map((entry) => entry.stage)
    expect(stages).toEqual(
      expect.arrayContaining([
        'start',
        'fetch_start',
        'headers_received',
        'json_parsed',
        'usage_recorded',
        'usage_charge_started',
      ]),
    )
    expect(entries.some((entry) => entry.stage === 'usage_charge_done')).toBe(false)
    resolveCharge({ credits: 1, balance: { totalAvailable: 99 }, apiCost: 0.001 })
    const result = await pendingResult

    expect(result).toEqual([0.1, 0.2, 0.3])
    entries = log.mock.calls.map(([message]) => JSON.parse(String(message)))
    expect(entries.map((entry) => entry.stage)).toEqual(expect.arrayContaining(['done']))
    expect(entries.find((entry) => entry.stage === 'usage_charge_started')).toMatchObject({
      action: 'embedding',
      model_name: 'gemini-embedding-2',
    })
    expect(entries.find((entry) => entry.stage === 'usage_charge_done')).toMatchObject({
      action: 'embedding',
      charged: true,
    })
    expect(new Set(entries.map((entry) => entry.request_id)).size).toBe(1)
    expect(entries.find((entry) => entry.stage === 'headers_received')).toMatchObject({
      feature: 'brain_embedding_timing_v1',
      ok: true,
      status: 200,
    })
    expect(entries.find((entry) => entry.stage === 'json_parsed')).toMatchObject({
      embedding_present: true,
      dimensions: 3,
      input_tokens: 8,
      total_tokens: 8,
    })
  })
})
