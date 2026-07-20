import { describe, expect, it } from 'vitest'
import { MemoryStatsRepository } from './memory-stats.repository'

type QueryResult = { data?: unknown; count?: number | null; error: null }

function query(result: QueryResult) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    neq: () => chain,
    in: () => chain,
    maybeSingle: async () => result,
    then: (resolve: (value: QueryResult) => unknown) => Promise.resolve(result).then(resolve),
  }
  return chain
}

describe('MemoryStatsRepository Company Cortex health', () => {
  it('returns the durable object counts and the last successful company dream', async () => {
    const client = {
      from: () =>
        query({
          data: {
            id: 'brain-company',
            scope: 'company',
            org_id: 'org-1',
          },
          error: null,
        }),
    }
    const aggregateClient = {
      from: (table: string) => {
        if (table === 'company_cortex_objects') return query({ count: 4, error: null })
        if (table === 'company_cortex_signals') return query({ count: 60, error: null })
        if (table === 'company_cortex_object_edges') return query({ count: 3, error: null })
        if (table === 'company_cortex_settings') {
          return query({
            data: { last_successful_dream_at: '2026-07-20T09:00:00.000Z' },
            error: null,
          })
        }
        throw new Error(`Unexpected table: ${table}`)
      },
      rpc: async () => ({ data: {}, error: null }),
    }
    const repository = new MemoryStatsRepository({ client: aggregateClient } as never, {} as never)

    const result = await repository.getHealthStats(
      client as never,
      'user-1',
      undefined,
      'brain-company',
      'org-1',
    )

    expect(result).toMatchObject({
      total_memories: 4,
      total_connections: 3,
      experience_sources: 60,
      last_capture: '2026-07-20T09:00:00.000Z',
    })
  })
})
