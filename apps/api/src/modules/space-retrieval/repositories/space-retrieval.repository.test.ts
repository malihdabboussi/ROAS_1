import { describe, expect, it, vi } from 'vitest'
import { SpaceRetrievalRepository } from './space-retrieval.repository'

describe('SpaceRetrievalRepository.listGraphEdges', () => {
  it('loads campaign rollup edges by space_id instead of a huge from_object_id IN list', async () => {
    const inCalls: Array<[string, unknown[]]> = []
    const eqCalls: Array<[string, unknown]> = []
    const query = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn((column: string, values: unknown[]) => {
        inCalls.push([column, values])
        return query
      }),
      eq: vi.fn((column: string, value: unknown) => {
        eqCalls.push([column, value])
        return query
      }),
      is: vi.fn().mockReturnThis(),
    }
    const supabase = {
      from: vi.fn(() => query),
    }

    const repo = new SpaceRetrievalRepository()
    const objectIds = Array.from({ length: 800 }, (_, i) => `obj-${i}`)
    await repo.listGraphEdges(supabase as never, {
      spaceIds: ['space-1'],
      campaignId: 'campaign-1',
      objectIds,
    })

    expect(inCalls).toEqual([['space_id', ['space-1']]])
    expect(inCalls.some(([column]) => column === 'from_object_id')).toBe(false)
    expect(eqCalls).toEqual([])
  })

  it('chunks from_object_id lookups when no space/campaign scope is available', async () => {
    const inCalls: Array<[string, unknown[]]> = []
    const query = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn((column: string, values: unknown[]) => {
        inCalls.push([column, values])
        return query
      }),
      is: vi.fn().mockReturnThis(),
      then: undefined,
    }
    const supabase = {
      from: vi.fn(() => ({
        ...query,
        // Make the builder thenable so await resolves like PostgREST.
        then(resolve: (value: { data: unknown[]; error: null }) => void) {
          resolve({ data: [], error: null })
        },
      })),
    }

    const repo = new SpaceRetrievalRepository()
    const objectIds = Array.from({ length: 250 }, (_, i) => `obj-${i}`)
    const result = await repo.listGraphEdges(supabase as never, { objectIds })

    expect(result.error).toBeNull()
    expect(inCalls).toHaveLength(3)
    expect(inCalls.every(([column]) => column === 'from_object_id')).toBe(true)
    expect(inCalls[0]?.[1]).toHaveLength(100)
    expect(inCalls[1]?.[1]).toHaveLength(100)
    expect(inCalls[2]?.[1]).toHaveLength(50)
  })
})
