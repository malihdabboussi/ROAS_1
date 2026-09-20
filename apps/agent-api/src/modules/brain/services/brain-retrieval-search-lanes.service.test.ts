import { describe, expect, it, vi } from 'vitest'
import { BrainRetrievalService } from './brain-retrieval.service'

type Filter = { method: 'eq' | 'in' | 'overlaps'; column: string; value: unknown }

function makeQuery(rows: unknown, single: unknown = null) {
  const filters: Filter[] = []
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

function filterRows(rows: unknown, filters: Filter[]) {
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
        return (
          Array.isArray(filter.value) &&
          Array.isArray(rowValue) &&
          rowValue.some((value) => filter.value.includes(value))
        )
      }
      return true
    })
  })
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

describe('BrainRetrievalService search lane data access', () => {
  it('returns evidence, timeline, narrative, belief, and perspective lanes', async () => {
    const originalEvidenceFlag = process.env.BRAIN_EVIDENCE_CHUNKS
    process.env.BRAIN_EVIDENCE_CHUNKS = '1'
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
        if (table === 'ns_brains') return makeQuery([], userBrain)
        if (table === 'brain_shares') return makeQuery([], null)
        if (table === 'agent_team_members') return makeQuery([])
        if (table === 'ns_brain_evidence_chunks') {
          return makeQuery([
            {
              id: 'evidence-1',
              brain_id: 'brain-user',
              source_type: 'conversation',
              source_id: 'conv-1',
              source_title: 'Launch discovery',
              contextual_prefix: 'Pricing question',
              content: 'The original evidence says the launch should stay subtle.',
              metadata: {},
            },
          ])
        }
        if (table === 'ns_narrative_pages') {
          return makeQuery([
            {
              id: 'page-1',
              brain_id: 'brain-user',
              title: 'Launch narrative',
              page_type: 'strategy',
              summary: 'The launch story should be understated.',
              content_md: 'The launch story should be understated.',
              status: 'active',
              tags: [],
            },
          ])
        }
        if (table === 'ns_memory_connections') return makeQuery([])
        if (table === 'ns_memories') return makeQuery([])
        if (table === 'ns_snapshots') return makeQuery([])
        if (table === 'ns_belief_patterns') return makeQuery([])
        return makeQuery([])
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === 'search_ns_memories_lexical') return { data: [], error: null }
        if (name === 'search_ns_snapshots_lexical') return { data: [], error: null }
        if (name === 'search_brain_timeline_items_lexical') {
          return {
            data: [
              {
                id: 'timeline-1',
                brain_id: 'brain-user',
                title: 'Launch feedback',
                description: 'The team chose an understated launch message.',
                source_type: 'conversation',
                source_id: 'conv-1',
                timeline_title: 'Launch timeline',
                lexical_rank: 1,
              },
            ],
            error: null,
          }
        }
        if (name === 'search_ns_belief_patterns_lexical') {
          return {
            data: [
              {
                id: 'belief-1',
                brain_id: 'brain-user',
                pattern_name: 'Understated launch language',
                description: 'Launch language should stay precise and understated.',
                supporting_memories: [],
                strength: 0.8,
                status: 'active',
                lexical_rank: 1,
              },
            ],
            error: null,
          }
        }
        if (name === 'search_ns_perspectives_lexical') {
          return {
            data: [
              {
                id: 'perspective-1',
                brain_id: 'brain-user',
                name: 'Customer-first launch',
                description: 'Speak from the customer outcome, not hype.',
                status: 'active',
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

    try {
      const result = await service.search({
        supabase: supabase as any,
        userClient: userClient as any,
        family: 'user',
        brainId: 'brain-user',
        query: 'understated launch copy',
        userId: 'user-1',
        orgId: null,
        requiredAccess: 'query',
        limit: 10,
      })

      expect(result.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'evidence-1', kind: 'evidence_chunk' }),
          expect.objectContaining({ id: 'timeline-1', kind: 'timeline_item' }),
          expect.objectContaining({ id: 'page-1', kind: 'narrative_page' }),
          expect.objectContaining({ id: 'belief-1', kind: 'belief_pattern' }),
          expect.objectContaining({ id: 'perspective-1', kind: 'perspective' }),
        ]),
      )
    } finally {
      restoreEnv('BRAIN_EVIDENCE_CHUNKS', originalEvidenceFlag)
    }
  })

  it('returns SK entries for agent-family retrieval', async () => {
    const agentBrain = {
      id: 'brain-agent',
      owner_id: 'user-1',
      org_id: null,
      scope: 'agent',
      agent_id: 'agent-1',
      created_by: 'user-1',
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ns_brains') return makeQuery([], agentBrain)
        if (table === 'brain_shares') return makeQuery([], null)
        if (table === 'agent_team_members') return makeQuery([])
        if (table === 'ns_sk_entries') {
          return makeQuery([
            {
              id: 'sk-1',
              brain_id: 'brain-agent',
              title: 'Launch copy principle',
              content: 'Keep launch copy understated and concrete.',
              entry_type: 'principle',
              domain: 'messaging',
              mastery: 0.8,
              confidence: 0.9,
              tags: [],
              metadata: {},
            },
          ])
        }
        if (table === 'ns_narrative_pages') return makeQuery([])
        if (table === 'ns_memory_connections') return makeQuery([])
        if (table === 'ns_belief_patterns') return makeQuery([])
        return makeQuery([])
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === 'search_brain_timeline_items_lexical') return { data: [], error: null }
        if (name === 'search_ns_belief_patterns_lexical') return { data: [], error: null }
        if (name === 'search_ns_perspectives_lexical') return { data: [], error: null }
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
      family: 'agent',
      brainId: 'brain-agent',
      query: 'understated launch copy',
      userId: 'user-1',
      orgId: null,
      requiredAccess: 'query',
      limit: 10,
    })

    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'sk-1',
          kind: 'sk_entry',
          title: 'Launch copy principle',
        }),
      ]),
    )
  })

  it('returns SK entries trained into a user brain', async () => {
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
        if (table === 'ns_brains') return makeQuery([], userBrain)
        if (table === 'brain_shares') return makeQuery([], null)
        if (table === 'agent_team_members') return makeQuery([])
        if (table === 'ns_sk_entries') {
          return makeQuery([
            {
              id: 'sk-webinar',
              brain_id: 'brain-user',
              title: 'Tuesday Webinar Scheduling Rule',
              content: 'Webinars generally achieve peak performance when scheduled on Tuesdays.',
              entry_type: 'technique',
              domain: 'marketing',
              mastery: 0.3,
              confidence: 0.9,
              tags: ['webinars'],
              metadata: {},
            },
          ])
        }
        return makeQuery([])
      }),
      rpc: vi.fn(async () => ({ data: [], error: null })),
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
      query: 'which day is the best day for webinar',
      userId: 'user-1',
      orgId: null,
      requiredAccess: 'query',
      limit: 10,
    })
    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'sk-webinar',
          kind: 'sk_entry',
          family: 'user',
          title: 'Tuesday Webinar Scheduling Rule',
        }),
      ]),
    )
  })

  it('returns company signals and attaches company object edges', async () => {
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
        if (table === 'ns_brains') return makeQuery([], companyBrain)
        if (table === 'brain_shares') return makeQuery([], null)
        if (table === 'agent_team_members') return makeQuery([])
        if (table === 'company_cortex_objects') {
          return makeQuery([
            {
              id: 'object-primary',
              brain_id: 'brain-company',
              org_id: 'org-1',
              object_type: 'protocol',
              title: 'Approval protocol',
              truth: 'The company asks before mutating workspaces.',
              status: 'active',
              confidence: 0.9,
              evidence_refs: [],
              retrieval_rule: {},
              metadata: {},
            },
            {
              id: 'object-related',
              brain_id: 'brain-company',
              org_id: 'org-1',
              object_type: 'standard',
              title: 'Workspace consent standard',
              truth: 'Workspace mutations require consent.',
              status: 'active',
              confidence: 0.8,
              evidence_refs: [],
              retrieval_rule: {},
              metadata: {},
            },
          ])
        }
        if (table === 'company_cortex_object_edges') {
          return makeQuery([
            {
              brain_id: 'brain-company',
              source_object_id: 'object-primary',
              target_object_id: 'object-related',
              relation_type: 'supports',
              confidence: 0.95,
            },
          ])
        }
        return makeQuery([])
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === 'search_company_cortex_signals_lexical') {
          return {
            data: [
              {
                id: 'signal-1',
                brain_id: 'brain-company',
                org_id: 'org-1',
                signal_type: 'decision',
                truth: 'Mutation work should require explicit approval.',
                reason: 'Protects workspace intent.',
                confidence: 0.9,
                source_signal_ids: [],
                lexical_rank: 1,
              },
            ],
            error: null,
          }
        }
        if (name === 'search_brain_timeline_items_lexical') return { data: [], error: null }
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
      query: 'workspace approval protocol',
      userId: 'user-1',
      orgId: 'org-1',
      requiredAccess: 'query',
      limit: 10,
    })

    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'signal-1', kind: 'company_signal' }),
        expect.objectContaining({
          id: 'object-primary',
          kind: 'company_object',
          related: expect.arrayContaining([
            {
              kind: 'company_object',
              id: 'object-related',
              relation: 'supports',
              title: 'Workspace consent standard',
            },
          ]),
        }),
      ]),
    )
  })
})
