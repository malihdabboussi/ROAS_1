import { describe, expect, it, vi } from 'vitest'
import { SpaceRetrievalRepository } from './space-retrieval.repository'

class PagedQuery {
  private from = 0
  private to = Number.MAX_SAFE_INTEGER
  private filters: Array<(row: Record<string, unknown>) => boolean> = []

  constructor(private readonly rows: Array<Record<string, unknown>>) {}

  select() {
    return this
  }

  order() {
    return this
  }

  limit() {
    return this
  }

  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]))
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value)
    return this
  }

  is(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value || (value === null && row[column] == null))
    return this
  }

  or() {
    return this
  }

  range(from: number, to: number) {
    this.from = from
    this.to = to
    return this
  }

  then(resolve: (value: { data: unknown[]; error: null }) => void) {
    const filtered = this.rows.filter((row) => this.filters.every((filter) => filter(row)))
    return Promise.resolve({ data: filtered.slice(this.from, this.to + 1), error: null }).then(
      resolve,
    )
  }
}

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
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
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

  it('paginates graph objects past the Supabase 1,000-row response ceiling', async () => {
    const rows = Array.from({ length: 1_709 }, (_, index) => ({
      id: `object-${index}`,
      space_id: 'space-1',
      updated_at: `2026-07-20T00:${String(index % 60).padStart(2, '0')}:00.000Z`,
    }))
    const supabase = {
      from: vi.fn(() => new PagedQuery(rows)),
    }

    const result = await new SpaceRetrievalRepository().listGraphObjects(supabase as never, {
      spaceId: 'space-1',
      limit: 5_000,
    })

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1_709)
    expect(supabase.from).toHaveBeenCalledTimes(2)
  })

  it('paginates scoped graph edges past the Supabase 1,000-row response ceiling', async () => {
    const rows = Array.from({ length: 1_320 }, (_, index) => ({
      id: `edge-${index}`,
      space_id: 'space-1',
      deleted_at: null,
    }))
    const supabase = {
      from: vi.fn(() => new PagedQuery(rows)),
    }

    const result = await new SpaceRetrievalRepository().listGraphEdges(supabase as never, {
      spaceIds: ['space-1'],
      objectIds: rows.map((row) => row.id),
      limit: 5_000,
    })

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1_320)
    expect(supabase.from).toHaveBeenCalledTimes(2)
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
