import { ForbiddenException } from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BrainEvalProbeController } from './controllers/brain-eval-probe.controller'
import { BrainEvalProbeService } from './services/brain-eval-probe.service'

interface QueryResult {
  data?: unknown
  error?: { message: string } | null
  count?: number | null
}

function makeQuery(result: QueryResult) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    or: vi.fn(() => query),
    in: vi.fn(() => query),
    ilike: vi.fn(() => query),
    then(
      onFulfilled: (value: QueryResult) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(result).then(onFulfilled, onRejected)
    },
  }
  return query
}

function makeSupabase(tableQueries: Record<string, any[] | any>) {
  return {
    from: vi.fn((table: string) => {
      const tableQuery = tableQueries[table]
      if (Array.isArray(tableQuery)) {
        const next = tableQuery.shift()
        if (!next) throw new Error(`No query left for ${table}`)
        return next
      }
      return tableQuery
    }),
  }
}

function makeController(supabase: unknown) {
  const brainContext = {
    buildFullContext: vi.fn(async () => 'preload context'),
  }
  const retrieval = {
    search: vi.fn(async ({ family }: { family: string }) => ({
      count: 1,
      context_sufficient: true,
      results: [{ id: `${family}-candidate` }],
      missing: [],
    })),
  }
  const service = new BrainEvalProbeService(
    brainContext as any,
    retrieval as any,
    { client: supabase } as any,
  )
  const controller = new BrainEvalProbeController(service)
  return { controller, brainContext, retrieval }
}

describe('BrainEvalProbeController', () => {
  beforeEach(() => {
    process.env.BRAIN_EVAL_PROBE_ENABLED = '1'
  })

  afterEach(() => {
    delete process.env.BRAIN_EVAL_PROBE_ENABLED
    delete process.env.BRAIN_LLM_RERANKER
    vi.restoreAllMocks()
  })

  it('rejects probe requests when the eval probe is disabled', async () => {
    delete process.env.BRAIN_EVAL_PROBE_ENABLED
    const { controller } = makeController(makeSupabase({}))

    await expect(
      controller.probe(
        { query: 'demo' },
        { id: 'user-1', email: 'user@example.com' },
        {} as any,
        { userId: 'user-1', orgId: null, orgRole: null },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('runs preload, family retrieval, and phrase ground-truth checks', async () => {
    const supabase = makeSupabase({
      ns_brains: [makeQuery({ data: [{ id: 'brain-1' }], error: null })],
      ns_memories: [makeQuery({ count: 1, error: null })],
      company_cortex_objects: [makeQuery({ count: 2, error: null })],
      ns_narrative_pages: [makeQuery({ count: 3, error: null })],
    })
    const userSupabase = { from: vi.fn() }
    const { controller, brainContext, retrieval } = makeController(supabase)

    const result = await controller.probe(
      { query: ' demo query ', agentKey: 'ivy', limit: 99, phrases: ['needle'] },
      { id: 'user-1', email: 'user@example.com' },
      userSupabase as any,
      { userId: 'user-1', orgId: 'org-1', orgRole: null },
    )

    expect(brainContext.buildFullContext).toHaveBeenCalledWith(
      'user-1',
      'ivy',
      'demo query',
      'org-1',
      false,
      true,
      false,
    )
    expect(supabase.from).toHaveBeenCalledWith('ns_brains')
    expect(retrieval.search).toHaveBeenCalledTimes(4)
    expect(retrieval.search).toHaveBeenCalledWith(
      expect.objectContaining({
        supabase,
        userClient: userSupabase,
        family: 'user',
        query: 'demo query',
        userId: 'user-1',
        orgId: 'org-1',
        requiredAccess: 'query',
        agentKey: 'ivy',
        limit: 50,
      }),
    )
    expect(result).toMatchObject({
      preloadText: 'preload context',
      preloadTextLength: 'preload context'.length,
      brainIdsScanned: ['brain-1'],
      groundTruth: {
        needle: {
          in_memories: 1,
          in_cortex: 2,
          in_pages: 3,
          total: 6,
        },
      },
      perFamily: {
        user: {
          count: 1,
          context_sufficient: true,
          candidates: [{ id: 'user-candidate' }],
          missing: [],
        },
      },
    })
    expect(typeof result.latencyMs).toBe('number')
  })

  it('applies only allowed runtime config keys', async () => {
    const { controller } = makeController(makeSupabase({}))

    const result = await controller.configure({
      env: {
        BRAIN_LLM_RERANKER: '1',
        SECRET_KEY: 'not-allowed',
      },
    })

    expect(result.applied).toEqual({ BRAIN_LLM_RERANKER: '1' })
    expect(process.env.BRAIN_LLM_RERANKER).toBe('1')
    expect(process.env.SECRET_KEY).toBeUndefined()
  })
})
