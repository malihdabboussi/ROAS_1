import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { SpacesRepository } from './spaces.repository'

type SpaceRow = {
  id: string
  title: string
  user_id: string
  org_id: string | null
  campaign_id: string | null
  updated_at: string
}

class FakeSpacesQuery {
  private readonly filters: Array<(row: SpaceRow) => boolean> = []
  private readonly orders: Array<{ column: keyof SpaceRow; ascending: boolean }> = []
  private limitCount: number | null = null
  private cursor: { updated_at: string; id: string } | null = null

  constructor(private readonly rows: SpaceRow[]) {}

  select() {
    return this
  }

  order(column: keyof SpaceRow, options: { ascending: boolean }) {
    this.orders.push({ column, ascending: options.ascending })
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  eq(column: keyof SpaceRow, value: string) {
    this.filters.push((row) => row[column] === value)
    return this
  }

  is(column: keyof SpaceRow, value: null) {
    this.filters.push((row) => row[column] === value)
    return this
  }

  or(condition: string) {
    const match =
      /^updated_at\.lt\.(.*),and\(updated_at\.eq\.(.*),id\.lt\.(.*)\)$/.exec(condition)
    if (!match?.[1] || !match[2] || !match[3]) {
      throw new Error(`Unsupported fake OR condition: ${condition}`)
    }
    this.cursor = { updated_at: match[1], id: match[3] }
    return this
  }

  then<TResult1 = { data: SpaceRow[]; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: SpaceRow[]; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    const filtered = this.rows
      .filter((row) => this.filters.every((filter) => filter(row)))
      .filter((row) => {
        if (!this.cursor) return true
        if (row.updated_at < this.cursor.updated_at) return true
        return row.updated_at === this.cursor.updated_at && row.id < this.cursor.id
      })
      .sort((a, b) => {
        for (const order of this.orders) {
          const left = String(a[order.column])
          const right = String(b[order.column])
          const comparison = left.localeCompare(right)
          if (comparison !== 0) return order.ascending ? comparison : -comparison
        }
        return 0
      })
    const data = this.limitCount === null ? filtered : filtered.slice(0, this.limitCount)
    return Promise.resolve({ data, error: null }).then(onfulfilled, onrejected)
  }
}

function fakeSupabase(rows: SpaceRow[]): SupabaseClient {
  return {
    from(table: string) {
      if (table !== 'spaces') throw new Error(`Unexpected table: ${table}`)
      return new FakeSpacesQuery(rows)
    },
  } as unknown as SupabaseClient
}

describe('SpacesRepository.findSpacesPage', () => {
  it('returns a cursor for the next ordered page', async () => {
    const repo = new SpacesRepository()
    const supabase = fakeSupabase([
      {
        id: 'space-c',
        title: 'Newest',
        user_id: 'user-1',
        org_id: null,
        campaign_id: null,
        updated_at: '2026-06-28T12:00:00.000Z',
      },
      {
        id: 'space-b',
        title: 'Middle',
        user_id: 'user-1',
        org_id: null,
        campaign_id: null,
        updated_at: '2026-06-28T11:00:00.000Z',
      },
      {
        id: 'space-a',
        title: 'Oldest',
        user_id: 'user-1',
        org_id: null,
        campaign_id: null,
        updated_at: '2026-06-28T11:00:00.000Z',
      },
    ])

    const firstPage = await repo.findSpacesPage(
      supabase,
      'user-1',
      { limit: 2, paginated: true },
      null,
    )

    expect(firstPage.items.map((space) => space.id)).toEqual(['space-c', 'space-b'])
    expect(firstPage.next_cursor).toEqual(expect.any(String))

    const secondPage = await repo.findSpacesPage(
      supabase,
      'user-1',
      { limit: 2, paginated: true, cursor: firstPage.next_cursor ?? undefined },
      null,
    )

    expect(secondPage.items.map((space) => space.id)).toEqual(['space-a'])
    expect(secondPage.next_cursor).toBeNull()
  })

  it('rejects invalid cursors', async () => {
    const repo = new SpacesRepository()

    await expect(
      repo.findSpacesPage(
        fakeSupabase([]),
        'user-1',
        { limit: 2, paginated: true, cursor: 'invalid' },
        null,
      ),
    ).rejects.toThrow('Invalid spaces cursor')
  })
})
