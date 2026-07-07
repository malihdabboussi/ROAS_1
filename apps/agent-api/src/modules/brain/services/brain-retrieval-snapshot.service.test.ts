import { describe, expect, it, vi } from 'vitest'
import { BrainRetrievalService } from './brain-retrieval.service'

function makeQuery(rows: unknown, single: unknown = null) {
  const filters: Array<{ method: 'eq' | 'in'; column: string; value: unknown }> = []
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
  filters: Array<{ method: 'eq' | 'in'; column: string; value: unknown }>,
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
      return true
    })
  })
}

describe('BrainRetrievalService snapshot graph retrieval', () => {
  it('expands semantic snapshot seeds through graph traversal', async () => {
    const brain = {
      id: 'brain-user',
      owner_id: 'user-1',
      org_id: null,
      scope: 'user',
      agent_id: null,
      created_by: 'user-1',
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'ns_brains') return makeQuery([], brain)
        if (table === 'brain_shares') return makeQuery([], null)
        if (table === 'agent_team_members') return makeQuery([])
        if (table === 'ns_snapshots') {
          return makeQuery([
            {
              id: 'snap-direct',
              brain_id: 'brain-user',
              name: 'Direct signal',
              core: 'The direct snapshot matched the query.',
              confidence: 0.9,
              tags: [],
            },
            {
              id: 'snap-related',
              brain_id: 'brain-user',
              name: 'Related signal',
              core: 'The related snapshot came from graph traversal.',
              confidence: 0.8,
              tags: [],
            },
          ])
        }
        return makeQuery([])
      }),
      rpc: vi.fn(async (name: string) => {
        if (name === 'find_similar_snapshots') {
          return { data: [{ id: 'snap-direct', similarity: 0.82 }], error: null }
        }
        if (name === 'traverse_edges') {
          return {
            data: [{ snapshot_id: 'snap-related', depth: 1, strength: 0.7 }],
            error: null,
          }
        }
        return { data: [], error: null }
      }),
    }
    const userClient = {
      rpc: vi.fn(async () => ({ data: true, error: null })),
    }
    const service = new BrainRetrievalService({ getEmbedding: vi.fn(async () => [0.1, 0.2]) } as any)

    const result = await service.search({
      supabase: supabase as any,
      userClient: userClient as any,
      family: 'user',
      brainId: 'brain-user',
      query: 'direct signal',
      userId: 'user-1',
      orgId: null,
      requiredAccess: 'query',
      limit: 10,
    })

    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'snap-direct',
          kind: 'snapshot',
          scores: expect.objectContaining({ semantic: 0.82 }),
        }),
        expect.objectContaining({
          id: 'snap-related',
          kind: 'snapshot',
          scores: expect.objectContaining({ graph: 0.7 }),
        }),
      ]),
    )
  })
})
