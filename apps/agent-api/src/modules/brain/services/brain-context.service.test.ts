import { describe, expect, it, vi } from 'vitest'
import { FIRST_PERSON_FILL_USER_BRAIN_QUERY } from '@vibey/agent-policy'
import { BrainContextService } from './brain-context.service'

function makeQuery(result: unknown) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: result, error: null })),
    then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
      Promise.resolve(resolve({ data: result, error: null })),
  }
  return query
}

describe('BrainContextService', () => {
  it('builds legacy user context from default brain memories and snapshots without retrieval', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ns_brains') return makeQuery({ id: 'brain-user' })
        if (table === 'ns_memories') {
          return makeQuery([
            {
              id: 'memory-1',
              content: 'Launch copy should stay calm.',
              memory_type: 'preference',
              significance: 0.8,
              tags: [],
            },
          ])
        }
        if (table === 'ns_snapshots') {
          return makeQuery([
            {
              id: 'snapshot-1',
              name: 'Positioning rule',
              core: 'Avoid pushy launch language.',
              confidence: 0.9,
            },
          ])
        }
        return makeQuery([])
      }),
    }
    const service = new BrainContextService(
      { client: supabase } as any,
      { getEmbedding: vi.fn() } as any,
      { buildSpotlightContext: vi.fn(), buildBrainSpotlightContext: vi.fn() } as any,
      { buildCompanyContext: vi.fn(async () => '') } as any,
      undefined,
    )

    const result = await service.buildUserBrainContext('user-1', undefined, undefined, null)

    expect(result).toContain('USER BRAIN — Key Memories:')
    expect(result).toContain('- [preference] Launch copy should stay calm.')
    expect(result).toContain('USER BRAIN — Neural Snapshots:')
    expect(result).toContain('- Positioning rule: Avoid pushy launch language.')
    expect(supabase.from).toHaveBeenCalledWith('ns_brains')
    expect(supabase.from).toHaveBeenCalledWith('ns_memories')
    expect(supabase.from).toHaveBeenCalledWith('ns_snapshots')
  })

  it('does not use legacy agents_registry brain access when policy is unavailable', async () => {
    const spotlight = { buildSpotlightContext: vi.fn(), buildBrainSpotlightContext: vi.fn() }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'user_addons') return makeQuery(null)
        if (table === 'agents_registry') throw new Error('legacy agents_registry access used')
        return makeQuery([])
      }),
    }
    const service = new BrainContextService(
      { client: supabase } as any,
      { getEmbedding: vi.fn() } as any,
      spotlight as any,
      { buildCompanyContext: vi.fn(async () => '') } as any,
      undefined,
    )

    const result = await service.buildFullContext('user-1', 'zara', 'hello', 'org-1')

    expect(result).toBe('')
    expect(spotlight.buildSpotlightContext).not.toHaveBeenCalled()
  })

  it('includes own agent Cortex spotlight in agent brain context', async () => {
    const spotlight = {
      buildSpotlightContext: vi.fn(),
      buildBrainSpotlightContext: vi.fn(async () => 'AGENT SPOTLIGHT — zara'),
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'user_addons') return makeQuery({ brain_id: 'brain-zara' })
        if (table === 'ns_sk_entries') return makeQuery([])
        if (table === 'ns_snapshots') return makeQuery([])
        return makeQuery(null)
      }),
    }
    const service = new BrainContextService(
      { client: supabase } as any,
      { getEmbedding: vi.fn() } as any,
      spotlight as any,
      { buildCompanyContext: vi.fn(async () => '') } as any,
      undefined,
    )

    const result = await service.buildAgentBrainContext('user-1', 'zara', undefined, 'org-1')

    expect(result).toContain('AGENT SPOTLIGHT — zara')
    expect(spotlight.buildBrainSpotlightContext).toHaveBeenCalledWith(
      'brain-zara',
      "AGENT SPOTLIGHT — zara's active Cortex for this turn:",
      undefined,
      'user-1',
      'org-1',
      undefined,
    )
  })

  it('resolves active agent brain presence', async () => {
    const supabase = {
      from: vi.fn(() => makeQuery({ brain_id: 'brain-zara' })),
    }
    const service = new BrainContextService(
      { client: supabase } as any,
      { getEmbedding: vi.fn() } as any,
      { buildSpotlightContext: vi.fn(), buildBrainSpotlightContext: vi.fn() } as any,
      { buildCompanyContext: vi.fn(async () => '') } as any,
      undefined,
    )

    const result = await service.resolveAgentBrainPresence('user-1', 'zara', 'org-1')

    expect(result).toEqual({ hasAgentBrain: true, brainId: 'brain-zara' })
  })

  it('injects insufficient-context status from retrieval context', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ns_brains') return makeQuery({ id: 'brain-user' })
        return makeQuery([])
      }),
    }
    const retrieval = {
      search: vi.fn(async () => ({
        success: true,
        query: 'pricing',
        family: 'user',
        count: 0,
        context_sufficient: false,
        sufficiency: {
          sufficient: false,
          confidence: 0,
          reason: 'No Brain evidence was retrieved.',
          missing: ['No matching Brain context found.'],
          suggested_next_queries: ['pricing source evidence'],
        },
        missing: ['No matching Brain context found.'],
        suggested_next_queries: ['pricing source evidence'],
        results: [],
      })),
    }
    const service = new BrainContextService(
      { client: supabase } as any,
      { getEmbedding: vi.fn() } as any,
      { buildSpotlightContext: vi.fn(), buildBrainSpotlightContext: vi.fn() } as any,
      { buildCompanyContext: vi.fn(async () => '') } as any,
      undefined,
      retrieval as any,
    )

    const result = await service.buildUserBrainContext('user-1', undefined, 'pricing', 'org-1')

    expect(result).toContain('BRAIN CONTEXT STATUS:')
    expect(result).toContain('No matching Brain context found.')
    expect(result).toContain('pricing source evidence')
  })

  it('starts four brain retrieval preloads before the shared embedding resolves', async () => {
    let resolveEmbedding!: (value: number[]) => void
    const embeddingPromise = new Promise<number[]>((resolve) => {
      resolveEmbedding = resolve
    })
    let completed = false
    const search = vi.fn(
      async (input: {
        family: string
        limit: number
        query: string
        embedding?: number[] | Promise<number[] | null>
        includeKinds?: string[]
      }) => {
        await input.embedding
        return {
          success: true,
          query: input.query,
          family: input.family,
          count: 1,
          context_sufficient: true,
          sufficiency: {
            sufficient: true,
            confidence: 1,
            reason: '',
            missing: [],
            suggested_next_queries: [],
          },
          missing: [],
          suggested_next_queries: [],
          results: [
            {
              id: 'candidate-1',
              kind: 'memory',
              title: 'Hit',
              snippet: 'Snippet',
              related: [],
            },
          ],
        }
      },
    )
    const retrieval = {
      search,
      resolveUserBrainId: vi.fn(async () => 'brain-user'),
    }
    const agentPolicy = { canAgentUseCapability: vi.fn(async () => true) }
    const companyContext = { buildCompanyContext: vi.fn(async () => 'LEGACY COMPANY') }
    const embedding = { getEmbedding: vi.fn(() => embeddingPromise) }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'user_addons') return makeQuery({ brain_id: 'brain-vibey' })
        return makeQuery(null)
      }),
    }

    const service = new BrainContextService(
      { client: supabase } as any,
      embedding as any,
      { buildSpotlightContext: vi.fn(), buildBrainSpotlightContext: vi.fn() } as any,
      companyContext as any,
      agentPolicy as any,
      retrieval as any,
    )

    const buildPromise = service
      .buildFullContext('user-1', 'vibey', 'retainer cap', 'org-1', false, true)
      .then((result) => {
        completed = true
        return result
      })

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(completed).toBe(false)
    expect(embedding.getEmbedding).toHaveBeenCalledTimes(1)
    expect(search).toHaveBeenCalledTimes(4)
    const sharedEmbeddingInput = search.mock.calls[0]?.[0].embedding
    expect(sharedEmbeddingInput).toBeDefined()
    for (const call of search.mock.calls) {
      expect(call[0].limit).toBe(20)
      expect(call[0].query).toBe('retainer cap')
      expect(call[0].embedding).toBe(sharedEmbeddingInput)
    }
    expect(search.mock.calls.map((call) => call[0].family).sort()).toEqual([
      'agent',
      'company',
      'customer',
      'user',
    ])
    const customerCall = search.mock.calls.find((call) => call[0].family === 'customer')?.[0]
    expect(customerCall?.includeKinds).toEqual([
      'memory',
      'evidence_chunk',
      'customer_avatar',
      'narrative_page',
      'belief_pattern',
      'perspective',
    ])
    expect(customerCall?.includeKinds).not.toContain('avatar_axis')

    resolveEmbedding([0.1])
    await buildPromise

    expect(completed).toBe(true)
    expect(companyContext.buildCompanyContext).not.toHaveBeenCalled()
  })

  it('limits full context retrieval to policy-allowed brain families', async () => {
    const search = vi.fn(async (input: { family: string; query: string }) => ({
      success: true,
      query: input.query,
      family: input.family,
      count: 1,
      context_sufficient: true,
      sufficiency: {
        sufficient: true,
        confidence: 1,
        reason: '',
        missing: [],
        suggested_next_queries: [],
      },
      missing: [],
      suggested_next_queries: [],
      results: [
        {
          id: 'agent-hit',
          kind: 'skill_knowledge',
          title: 'Agent profile',
          snippet: 'Use the MDM coaching method.',
          related: [],
        },
      ],
    }))
    const retrieval = { search }
    const agentPolicy = {
      canAgentUseCapability: vi.fn(async () => false),
      listAllowedBrainSearchFamilies: vi.fn(async () => ['agent']),
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'user_addons') return makeQuery({ brain_id: 'brain-zara' })
        return makeQuery(null)
      }),
    }
    const service = new BrainContextService(
      { client: supabase } as any,
      { getEmbedding: vi.fn(async () => [0.1]) } as any,
      { buildSpotlightContext: vi.fn(), buildBrainSpotlightContext: vi.fn() } as any,
      { buildCompanyContext: vi.fn(async () => 'LEGACY COMPANY') } as any,
      agentPolicy as any,
      retrieval as any,
    )

    const result = await service.buildFullContext(
      'user-1',
      'zara',
      'How do you work?',
      'org-1',
      true,
      false,
    )

    expect(agentPolicy.listAllowedBrainSearchFamilies).toHaveBeenCalledWith('zara', {
      orgId: 'org-1',
      userId: null,
    })
    expect(search.mock.calls.map((call) => call[0].family)).toEqual(['agent'])
    expect(result).toContain('AGENT BRAIN — Retrieved Context:')
    expect(result).toContain('Use the MDM coaching method.')
  })

  it('uses retrieval-only user path with query and does not fetch legacy memories', async () => {
    const search = vi.fn(async () => ({
      success: true,
      query: 'pricing',
      family: 'user',
      count: 1,
      context_sufficient: true,
      sufficiency: {
        sufficient: true,
        confidence: 1,
        reason: '',
        missing: [],
        suggested_next_queries: [],
      },
      missing: [],
      suggested_next_queries: [],
      results: [
        {
          id: 'mem-1',
          kind: 'memory',
          title: 'Pricing',
          snippet: 'Cap is 4k',
          related: [],
        },
      ],
    }))
    const rpc = vi.fn(async () => ({ data: [], error: null }))
    const supabase = {
      from: vi.fn(() => makeQuery([])),
      rpc,
    }
    const retrieval = { search, resolveUserBrainId: vi.fn(async () => 'brain-user') }
    const service = new BrainContextService(
      { client: supabase } as any,
      { getEmbedding: vi.fn() } as any,
      { buildSpotlightContext: vi.fn(), buildBrainSpotlightContext: vi.fn() } as any,
      { buildCompanyContext: vi.fn(async () => '') } as any,
      undefined,
      retrieval as any,
    )

    const result = await service.buildUserBrainContext('user-1', undefined, 'pricing', 'org-1')

    expect(result).toContain('USER BRAIN — Retrieved Context:')
    expect(result).toContain('Cap is 4k')
    expect(rpc).not.toHaveBeenCalled()
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ family: 'user', limit: 20, query: 'pricing' }),
    )
  })

  it('retrieves user brain with identity query for first-person fill requests', async () => {
    const search = vi.fn(
      async (input: { family: string; query: string; embedding?: unknown }) => ({
        success: true,
        query: input.query,
        family: input.family,
        count: 1,
        context_sufficient: true,
        sufficiency: {
          sufficient: true,
          confidence: 1,
          reason: '',
          missing: [],
          suggested_next_queries: [],
        },
        missing: [],
        suggested_next_queries: [],
        results: [
          {
            id: `${input.family}-hit`,
            kind: 'memory',
            title: 'Hit',
            snippet: 'Snippet',
            related: [],
          },
        ],
      }),
    )
    const retrieval = {
      search,
      resolveUserBrainId: vi.fn(async () => 'brain-user'),
    }
    const agentPolicy = { canAgentUseCapability: vi.fn(async () => true) }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'user_addons') return makeQuery({ brain_id: 'brain-vibey' })
        return makeQuery(null)
      }),
    }
    const service = new BrainContextService(
      { client: supabase } as any,
      { getEmbedding: vi.fn(async () => [0.1]) } as any,
      { buildSpotlightContext: vi.fn(), buildBrainSpotlightContext: vi.fn() } as any,
      { buildCompanyContext: vi.fn(async () => '') } as any,
      agentPolicy as any,
      retrieval as any,
    )

    const userMessage =
      "Hey, here's a link. I need some help on this, filling this out https://docs.google.com/forms/d/abc"
    await service.buildFullContext('user-1', 'vibey', userMessage, 'org-1', false, true)

    const userCall = search.mock.calls.find((call) => call[0].family === 'user')?.[0]
    const companyCall = search.mock.calls.find((call) => call[0].family === 'company')?.[0]
    expect(userCall?.query).toBe(FIRST_PERSON_FILL_USER_BRAIN_QUERY)
    expect(companyCall?.query).toBe(userMessage)
    expect(userCall?.embedding).toBeUndefined()
  })
})
