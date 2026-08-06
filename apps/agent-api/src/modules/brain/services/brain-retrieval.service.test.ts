import { describe, expect, it, vi } from 'vitest'
import { BrainRetrievalService } from './brain-retrieval.service'

function makeQuery(table: string, rows: unknown, single: unknown = null) {
  const filters: Array<{ method: 'eq' | 'in' | 'overlaps'; column: string; value: unknown }> = []
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: unknown) => {
      filters.push({ method: 'eq', column, value })
      return query
    }),
    is: vi.fn(() => query),
    in: vi.fn((column: string, value: unknown) => {
      filters.push({ method: 'in', column, value })
      return query
    }),
    overlaps: vi.fn((column: string, value: unknown) => {
      filters.push({ method: 'overlaps', column, value })
      return query
    }),
    neq: vi.fn(() => query),
    or: vi.fn(() => query),
    textSearch: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: single, error: null })),
    then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
      Promise.resolve(resolve({ data: filterRows(rows, filters), error: null })),
  }
  return query
}

function filterRows(
  rows: unknown,
  filters: Array<{ method: 'eq' | 'in' | 'overlaps'; column: string; value: unknown }>,
) {
  if (!Array.isArray(rows)) return rows
  return rows.filter((row) => {
    if (!row || typeof row !== 'object') return true
    const record = row as Record<string, unknown>
    return filters.every((filter) => {
      if (filter.method === 'eq') return record[filter.column] === filter.value
      if (filter.method === 'in') {
        return Array.isArray(filter.value) && filter.value.includes(record[filter.column])
      }
      if (filter.method === 'overlaps') {
        const rowValue = record[filter.column]
        const filterValue = filter.value
        return (
          Array.isArray(filterValue) &&
          Array.isArray(rowValue) &&
          rowValue.some((value) => filterValue.includes(value))
        )
      }
      return true
    })
  })
}

describe('BrainRetrievalService', () => {
  it('returns shared-contract company candidates with lexical exact title scores', async () => {
    const companyBrain = {
      id: 'brain-company',
      owner_id: 'owner-1',
      org_id: 'org-1',
      scope: 'company',
      agent_id: null,
      created_by: 'owner-1',
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ns_brains') return makeQuery(table, [], companyBrain)
        if (table === 'brain_shares') return makeQuery(table, [], null)
        if (table === 'agent_team_members') return makeQuery(table, [])
        if (table === 'company_cortex_objects') {
          return makeQuery(table, [
            {
              id: 'object-approval',
              brain_id: 'brain-company',
              org_id: 'org-1',
              object_type: 'protocol',
              title: 'Approval before mutation',
              truth: 'Agents ask before creating workspace tasks.',
              status: 'active',
              confidence: 0.8,
              evidence_refs: [{ type: 'decision', id: 'signal-1' }],
              retrieval_rule: { trigger: 'workspace changes' },
              metadata: { source_path: 'company/standards' },
            },
          ])
        }
        return makeQuery(table, [])
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === 'search_ns_belief_patterns_lexical') {
          return {
            data: [
              {
                id: 'belief-subtle-copy',
                brain_id: 'brain-user',
                pattern_name: 'Subtle customer copy',
                description: 'Customer-facing copy should be understated.',
                supporting_memories: ['mem-direct'],
                strength: 0.8,
                status: 'active',
                lexical_rank: 1,
              },
            ],
            error: null,
          }
        }
        if (name === 'search_ns_memories_lexical') {
          return {
            data: [
              {
                id: 'mem-direct',
                brain_id: 'brain-user',
                content: 'Launch copy should stay subtle and non-pushy.',
                memory_type: 'preference',
                source_type: 'conversation',
                source_id: 'conv-1',
                source_title: 'Launch copy feedback',
                significance: 0.8,
                confidence: 0.9,
                metadata: {},
                lexical_rank: 1,
              },
              {
                id: 'mem-related',
                brain_id: 'brain-user',
                content: 'Avoid aggressive sales language.',
                memory_type: 'preference',
                significance: 0.7,
                confidence: 0.8,
                metadata: {},
                lexical_rank: 2,
              },
            ],
            error: null,
          }
        }
        return { data: [], error: null }
      }),
    }
    const userClient = {
      rpc: vi.fn(async () => ({ data: true, error: null })),
    }
    const service = new BrainRetrievalService({ getEmbedding: vi.fn(async () => null) } as any)

    const result = await service.search({
      supabase: supabase as any,
      userClient: userClient as any,
      family: 'company',
      brainId: 'brain-company',
      query: 'Approval before mutation',
      userId: 'user-1',
      orgId: 'org-1',
      requiredAccess: 'query',
      limit: 10,
    })

    expect(result).toMatchObject({
      success: true,
      family: 'company',
      count: 1,
      results: [
        {
          id: 'object-approval',
          brain_id: 'brain-company',
          kind: 'company_object',
          title: 'Approval before mutation',
          access_source: 'org_baseline',
          source_type: 'company_cortex_object',
          source_id: 'object-approval',
          source_title: 'Approval before mutation',
          metadata: {
            object_type: 'protocol',
            confidence: 0.8,
            retrieval_rule: { trigger: 'workspace changes' },
            source_path: 'company/standards',
          },
          evidence_refs: [{ type: 'decision', id: 'signal-1' }],
          scores: { lexical: 1 },
        },
      ],
    })
    expect(userClient.rpc).toHaveBeenCalledWith('can_access_brain', {
      p_brain_id: 'brain-company',
      p_min_level: 'query',
    })
    expect(result.results[0]!.scores.final).toBeGreaterThan(0.5)
  })

  it('uses supplied query embedding promise without recomputing it', async () => {
    const companyBrain = {
      id: 'brain-company',
      owner_id: 'owner-1',
      org_id: null,
      scope: 'company',
      agent_id: null,
      created_by: 'owner-1',
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ns_brains') return makeQuery(table, [], companyBrain)
        if (table === 'brain_shares') return makeQuery(table, [], null)
        if (table === 'agent_team_members') return makeQuery(table, [])
        return makeQuery(table, [])
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === 'search_company_cortex_objects') {
          return {
            data: [
              {
                id: 'object-vector',
                brain_id: 'brain-company',
                org_id: null,
                object_type: 'protocol',
                title: 'Vector matched protocol',
                truth: 'Use the precomputed query embedding for retrieval.',
                status: 'active',
                confidence: 0.9,
                evidence_refs: [],
                retrieval_rule: {},
                metadata: {},
                similarity: 0.91,
              },
            ],
            error: null,
          }
        }
        return { data: [], error: null }
      }),
    }
    const userClient = {
      rpc: vi.fn(async () => ({ data: true, error: null })),
    }
    const getEmbedding = vi.fn(async () => [0.99])
    const service = new BrainRetrievalService({ getEmbedding } as any)

    const result = await service.search({
      supabase: supabase as any,
      userClient: userClient as any,
      family: 'company',
      brainId: 'brain-company',
      query: 'precomputed vector',
      userId: 'user-1',
      orgId: null,
      requiredAccess: 'query',
      limit: 10,
      embedding: Promise.resolve([0.5, 0.25]),
    })

    expect(getEmbedding).not.toHaveBeenCalled()
    expect(supabase.rpc).toHaveBeenCalledWith('search_company_cortex_objects', {
      p_brain_id: 'brain-company',
      p_org_id: null,
      p_query_embedding: '[0.5,0.25]',
      p_match_count: 20,
      p_match_threshold: 0.35,
    })
    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'object-vector',
          kind: 'company_object',
          scores: expect.objectContaining({ semantic: 0.91 }),
        }),
      ]),
    )
  })

  it('filters retrieved candidates to requested kinds', async () => {
    const customerBrain = {
      id: 'brain-customer',
      owner_id: 'owner-1',
      org_id: 'org-1',
      scope: 'customer',
      agent_id: null,
      created_by: 'owner-1',
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ns_brains') return makeQuery(table, [], customerBrain)
        if (table === 'brain_shares') return makeQuery(table, [], null)
        if (table === 'agent_team_members') return makeQuery(table, [])
        if (table === 'ns_memories') {
          return makeQuery(table, [
            {
              id: 'mem-pricing',
              brain_id: 'brain-customer',
              content: 'Pricing anchor is customer-approved.',
              memory_type: 'customer_signal',
              source_type: 'conversation',
              source_id: 'conv-1',
              source_title: 'Pricing call',
              significance: 0.8,
              confidence: 0.9,
              metadata: {},
            },
          ])
        }
        return makeQuery(table, [])
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === 'search_ns_memories_lexical') {
          return {
            data: [
              {
                id: 'mem-pricing',
                brain_id: 'brain-customer',
                content: 'Pricing anchor is customer-approved.',
                memory_type: 'customer_signal',
                source_type: 'conversation',
                source_id: 'conv-1',
                source_title: 'Pricing call',
                significance: 0.8,
                confidence: 0.9,
                metadata: {},
                lexical_rank: 1,
              },
            ],
            error: null,
          }
        }
        if (name === 'search_avatar_discriminator_axes_lexical') {
          return {
            data: [
              {
                id: 'money',
                org_id: null,
                name: 'Money relationship',
                description: 'How the customer frames spend, risk, and return.',
                high_end_signature: 'ROI-confident',
                low_end_signature: 'cautious',
                status: 'active',
                recurrence_count: 0,
                lexical_rank: 1,
              },
            ],
            error: null,
          }
        }
        return { data: [], error: null }
      }),
    }
    const userClient = {
      rpc: vi.fn(async () => ({ data: true, error: null })),
    }
    const service = new BrainRetrievalService({ getEmbedding: vi.fn(async () => null) } as any)

    const result = await service.search({
      supabase: supabase as any,
      userClient: userClient as any,
      family: 'customer',
      brainId: 'brain-customer',
      query: 'pricing anchor',
      userId: 'user-1',
      orgId: 'org-1',
      requiredAccess: 'query',
      includeKinds: ['memory'],
      limit: 10,
    })

    expect(result.results).toEqual([
      expect.objectContaining({
        id: 'mem-pricing',
        kind: 'memory',
      }),
    ])
    expect(result.results).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'avatar_axis' })]),
    )
  })

  it('attaches related memories and beliefs to memory candidates', async () => {
    const userBrain = {
      id: 'brain-user',
      owner_id: 'user-1',
      org_id: null,
      scope: 'user',
      agent_id: null,
      created_by: 'user-1',
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ns_brains') return makeQuery(table, [], userBrain)
        if (table === 'brain_shares') return makeQuery(table, [], null)
        if (table === 'agent_team_members') return makeQuery(table, [])
        if (table === 'ns_memories') {
          return makeQuery(table, [
            {
              id: 'mem-direct',
              brain_id: 'brain-user',
              content: 'Launch copy should stay subtle and non-pushy.',
              memory_type: 'preference',
              source_type: 'conversation',
              source_id: 'conv-1',
              source_title: 'Launch copy feedback',
              significance: 0.8,
              confidence: 0.9,
              metadata: {},
            },
            {
              id: 'mem-related',
              brain_id: 'brain-user',
              content: 'Avoid aggressive sales language.',
              memory_type: 'preference',
              significance: 0.7,
              confidence: 0.8,
              metadata: {},
            },
          ])
        }
        if (table === 'ns_memory_connections') {
          return makeQuery(table, [
            {
              source_memory_id: 'mem-direct',
              target_memory_id: 'mem-related',
              relationship: 'supports',
              strength: 0.9,
            },
          ])
        }
        if (table === 'ns_belief_patterns') {
          return makeQuery(table, [
            {
              id: 'belief-subtle-copy',
              brain_id: 'brain-user',
              pattern_name: 'Subtle customer copy',
              description: 'Customer-facing copy should be understated.',
              supporting_memories: ['mem-direct'],
              strength: 0.8,
              status: 'active',
            },
          ])
        }
        return makeQuery(table, [])
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === 'search_ns_belief_patterns_lexical') {
          return {
            data: [
              {
                id: 'belief-subtle-copy',
                brain_id: 'brain-user',
                pattern_name: 'Subtle customer copy',
                description: 'Customer-facing copy should be understated.',
                supporting_memories: ['mem-direct'],
                strength: 0.8,
                status: 'active',
                lexical_rank: 1,
              },
            ],
            error: null,
          }
        }
        if (name === 'search_ns_memories_lexical') {
          return {
            data: [
              {
                id: 'mem-direct',
                brain_id: 'brain-user',
                content: 'Launch copy should stay subtle and non-pushy.',
                memory_type: 'preference',
                source_type: 'conversation',
                source_id: 'conv-1',
                source_title: 'Launch copy feedback',
                significance: 0.8,
                confidence: 0.9,
                metadata: {},
                lexical_rank: 1,
              },
              {
                id: 'mem-related',
                brain_id: 'brain-user',
                content: 'Avoid aggressive sales language.',
                memory_type: 'preference',
                significance: 0.7,
                confidence: 0.8,
                metadata: {},
                lexical_rank: 2,
              },
            ],
            error: null,
          }
        }
        return { data: [], error: null }
      }),
    }
    const userClient = {
      rpc: vi.fn(async () => ({ data: true, error: null })),
    }
    const service = new BrainRetrievalService({ getEmbedding: vi.fn(async () => null) } as any)

    const result = await service.search({
      supabase: supabase as any,
      userClient: userClient as any,
      family: 'user',
      brainId: 'brain-user',
      query: 'subtle launch copy',
      userId: 'user-1',
      orgId: null,
      requiredAccess: 'query',
      limit: 10,
    })

    const direct = result.results.find((candidate) => candidate.id === 'mem-direct')
    expect(direct).toMatchObject({
      kind: 'memory',
      source_type: 'conversation',
      source_id: 'conv-1',
      source_title: 'Launch copy feedback',
      related: expect.arrayContaining([
        {
          kind: 'memory',
          id: 'mem-related',
          relation: 'supports',
          title: 'Avoid aggressive sales language.',
        },
        {
          kind: 'belief_pattern',
          id: 'belief-subtle-copy',
          relation: 'supports_belief',
          title: 'Subtle customer copy',
        },
      ]),
    })
    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'belief-subtle-copy',
          kind: 'belief_pattern',
          title: 'Subtle customer copy',
        }),
      ]),
    )
  })

  it('uses user share access source for shared brain retrieval candidates', async () => {
    const sharedBrain = {
      id: 'brain-shared',
      owner_id: 'owner-1',
      org_id: null,
      scope: 'user',
      agent_id: null,
      created_by: 'owner-1',
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ns_brains') return makeQuery(table, [], sharedBrain)
        if (table === 'brain_shares') {
          return makeQuery(table, [], {
            id: 'share-user',
            brain_id: 'brain-shared',
            entity_type: 'user',
            entity_id: 'user-1',
            level: 'query',
          })
        }
        if (table === 'agent_team_members') return makeQuery(table, [])
        return makeQuery(table, [])
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === 'search_ns_memories_lexical') {
          return {
            data: [
              {
                id: 'mem-shared',
                brain_id: 'brain-shared',
                content: 'Shared launch context is available to this user.',
                memory_type: 'context',
                significance: 0.8,
                confidence: 0.9,
                metadata: {},
                lexical_rank: 1,
              },
            ],
            error: null,
          }
        }
        return { data: [], error: null }
      }),
    }
    const userClient = {
      rpc: vi.fn(async () => ({ data: true, error: null })),
    }
    const service = new BrainRetrievalService({ getEmbedding: vi.fn(async () => null) } as any)

    const result = await service.search({
      supabase: supabase as any,
      userClient: userClient as any,
      family: 'user',
      brainId: 'brain-shared',
      query: 'shared launch context',
      userId: 'user-1',
      orgId: null,
      requiredAccess: 'query',
      limit: 10,
    })

    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'mem-shared',
          access_source: 'user_share',
          effective_access: 'query',
        }),
      ]),
    )
  })

  it('builds deterministic multi-query variants only when the feature flag is enabled', () => {
    const previous = process.env.BRAIN_MULTI_QUERY_RETRIEVAL
    const service = new BrainRetrievalService({ getEmbedding: vi.fn(async () => null) } as any)

    process.env.BRAIN_MULTI_QUERY_RETRIEVAL = '0'
    expect(
      (service as any).shouldRunMultiQuery(
        'How is Helmsmark CFO connected to controller work?',
        [],
        false,
      ),
    ).toBe(false)

    process.env.BRAIN_MULTI_QUERY_RETRIEVAL = '1'
    expect(
      (service as any).shouldRunMultiQuery(
        'How is Helmsmark CFO connected to controller work?',
        [],
        false,
      ),
    ).toBe(true)
    expect(
      (service as any).buildDeterministicQueryVariants(
        'How is Helmsmark CFO connected to controller work?',
      ),
    ).toEqual(expect.arrayContaining([expect.stringContaining('helmsmark')]))

    if (previous === undefined) {
      delete process.env.BRAIN_MULTI_QUERY_RETRIEVAL
    } else {
      process.env.BRAIN_MULTI_QUERY_RETRIEVAL = previous
    }
  })

  it('searches personal default user brain in org chat without brain_id', async () => {
    const personalBrain = {
      id: 'brain-personal',
      owner_id: 'user-1',
      org_id: null,
      scope: 'user',
      agent_id: null,
      created_by: 'user-1',
    }
    let brainsQuery: ReturnType<typeof makeQuery> | undefined
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ns_brains') {
          brainsQuery = makeQuery(table, [], personalBrain)
          return brainsQuery
        }
        if (table === 'brain_shares') return makeQuery(table, [], null)
        if (table === 'agent_team_members') return makeQuery(table, [])
        return makeQuery(table, [])
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === 'search_ns_memories_lexical') {
          return {
            data: [
              {
                id: 'mem-webinar',
                brain_id: 'brain-personal',
                content: 'Founder webinars convert when proof leads the narrative.',
                memory_type: 'framework',
                significance: 0.9,
                confidence: 0.9,
                metadata: {},
                lexical_rank: 1,
              },
            ],
            error: null,
          }
        }
        return { data: [], error: null }
      }),
    }
    const userClient = {
      rpc: vi.fn(async () => ({ data: true, error: null })),
    }
    const service = new BrainRetrievalService({ getEmbedding: vi.fn(async () => null) } as any)

    const result = await service.search({
      supabase: supabase as any,
      userClient: userClient as any,
      family: 'user',
      query: 'webinar strategy for my offer',
      userId: 'user-1',
      orgId: 'org-1',
      requiredAccess: 'query',
      limit: 10,
    })

    expect(brainsQuery?.is).toHaveBeenCalledWith('org_id', null)
    expect(brainsQuery?.eq).not.toHaveBeenCalledWith('org_id', 'org-1')
    expect(userClient.rpc).toHaveBeenCalledWith('can_access_brain', {
      p_brain_id: 'brain-personal',
      p_min_level: 'query',
    })
    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'mem-webinar',
          brain_id: 'brain-personal',
          kind: 'memory',
        }),
      ]),
    )
  })

  it('resolves personal default user brain when orgId is present', async () => {
    const eq = vi.fn(function (this: unknown) {
      return chain
    })
    const is = vi.fn(function (this: unknown) {
      return chain
    })
    const chain: Record<string, unknown> = {}
    chain.select = vi.fn(() => chain)
    chain.eq = eq
    chain.is = is
    chain.order = vi.fn(() => chain)
    chain.limit = vi.fn(() => chain)
    chain.maybeSingle = vi.fn(async () => ({
      data: {
        id: 'brain-personal-user',
        owner_id: 'user-1',
        org_id: null,
        scope: 'user',
        agent_id: null,
        created_by: null,
      },
      error: null,
    }))
    const supabase = { from: vi.fn(() => chain) }
    const service = new BrainRetrievalService({ getEmbedding: vi.fn() } as any)

    const brainId = await service.resolveUserBrainId(supabase as any, 'user-1', 'org-1')

    expect(brainId).toBe('brain-personal-user')
    expect(is).toHaveBeenCalledWith('org_id', null)
    expect(eq).not.toHaveBeenCalledWith('org_id', 'org-1')
  })
})
