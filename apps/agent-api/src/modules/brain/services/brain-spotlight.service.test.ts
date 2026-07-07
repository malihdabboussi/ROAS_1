import { describe, expect, it, vi } from 'vitest'
import { BrainRuntimeRepository } from '../repositories/brain-runtime.repository'
import { BrainSpotlightService } from './brain-spotlight.service'

function makeQuery(
  table: string,
  rows: unknown,
  calls: Array<{ table: string; field: string; value: unknown }>,
) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn((field: string, value: unknown) => {
      calls.push({ table, field, value })
      return query
    }),
    is: vi.fn((field: string, value: unknown) => {
      calls.push({ table, field, value })
      return query
    }),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: rows, error: null })),
    then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
      Promise.resolve(resolve({ data: rows, error: null })),
  }
  return query
}

describe('BrainSpotlightService', () => {
  it('reads beliefs and perspectives by brain_id for agent Cortex spotlight', async () => {
    const calls: Array<{ table: string; field: string; value: unknown }> = []
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ns_brains') return makeQuery(table, { cortex_max: true }, calls)
        if (table === 'ns_perspectives') {
          return makeQuery(
            table,
            [
              {
                id: 'p1',
                name: 'Support Operator',
                description: 'Handles tennis support with structure.',
                strength: 0.8,
                status: 'active',
              },
            ],
            calls,
          )
        }
        if (table === 'ns_belief_patterns') {
          return makeQuery(
            table,
            [
              {
                id: 'b1',
                pattern_name: 'Always Check IPIN First',
                description: 'IPIN is the first lookup.',
                strength: 0.7,
                status: 'active',
                supporting_memories: [],
              },
            ],
            calls,
          )
        }
        return makeQuery(table, [], calls)
      }),
    }
    const service = new BrainSpotlightService(
      { client: supabase } as any,
      { getEmbedding: vi.fn() } as any,
      new BrainRuntimeRepository(),
    )

    const result = await service.buildBrainSpotlightContext('brain-zara', 'AGENT SPOTLIGHT — Zara')

    expect(result).toContain('AGENT SPOTLIGHT — Zara')
    expect(result).toContain('Support Operator')
    expect(result).toContain('Always Check IPIN First')
    expect(calls).toContainEqual({
      table: 'ns_perspectives',
      field: 'brain_id',
      value: 'brain-zara',
    })
    expect(calls).toContainEqual({
      table: 'ns_belief_patterns',
      field: 'brain_id',
      value: 'brain-zara',
    })
    expect(calls).not.toContainEqual({
      table: 'ns_perspectives',
      field: 'subject_id',
      value: expect.anything(),
    })
  })

  it('searches narrative pages when user spotlight has Cortex Max and an embedding', async () => {
    const calls: Array<{ table: string; field: string; value: unknown }> = []
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ns_brains') return makeQuery(table, { id: 'brain-user', cortex_max: true }, calls)
        if (table === 'ns_perspectives') return makeQuery(table, [], calls)
        if (table === 'ns_belief_patterns') return makeQuery(table, [], calls)
        return makeQuery(table, [], calls)
      }),
      rpc: vi.fn(async () => ({
        data: [
          {
            title: 'Pricing Capsule',
            summary: 'Custom pricing rules.',
            content_md: 'Full pricing page',
          },
        ],
        error: null,
      })),
    }
    const service = new BrainSpotlightService(
      { client: supabase } as any,
      { getEmbedding: vi.fn() } as any,
      new BrainRuntimeRepository(),
    )

    const result = await service.buildSpotlightContext(
      'user-1',
      'pricing',
      'org-1',
      [0.2, 0.3],
    )

    expect(result).toContain('Relevant Cortex pages:')
    expect(result).toContain('Pricing Capsule: Custom pricing rules.')
    expect(supabase.rpc).toHaveBeenCalledWith('search_narrative_pages', {
      p_brain_id: 'brain-user',
      p_query_embedding: '[0.2,0.3]',
      p_match_threshold: 0.3,
      p_match_count: 2,
    })
  })
})
