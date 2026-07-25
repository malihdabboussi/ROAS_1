import { describe, expect, it, vi } from 'vitest'
import { FunnelHistoryRepository } from '../funnel-history.repository'

function createHistoryQuery(result: unknown) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {}
  for (const method of ['select', 'update', 'eq', 'or', 'is', 'in', 'order', 'limit']) {
    query[method] = vi.fn(() => query)
  }
  query.maybeSingle = vi.fn(async () => result)
  return query
}

describe('FunnelHistoryRepository', () => {
  it('selects the oldest undone change for redo', async () => {
    const query = createHistoryQuery({ data: { id: 'change-1' }, error: null })
    const supabase = { from: vi.fn(() => query) }
    const repository = new FunnelHistoryRepository()

    await repository.findNextUndone(supabase as never, {
      funnelId: 'funnel-1',
      funnelPageId: 'page-1',
    })

    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: true })
    expect(query.limit).toHaveBeenCalledWith(1)
  })

  it('limits the newest timeline entries in the database query', async () => {
    const query = createHistoryQuery({ data: [], error: null })
    query.limit = vi.fn(async () => ({ data: [], error: null }))
    const supabase = { from: vi.fn(() => query) }
    const repository = new FunnelHistoryRepository()

    await repository.listRestorableChangeSets(supabase as never, {
      funnelId: 'funnel-1',
      funnelPageId: 'page-1',
      ascending: false,
      limit: 50,
    })

    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(query.limit).toHaveBeenCalledWith(50)
  })

  it('scopes bookmark updates to both the funnel and change set', async () => {
    const query = createHistoryQuery({
      data: { id: 'change-1', is_bookmarked: true },
      error: null,
    })
    const supabase = { from: vi.fn(() => query) }
    const repository = new FunnelHistoryRepository()

    await repository.setBookmarked(supabase as never, {
      funnelId: 'funnel-1',
      changeSetId: 'change-1',
      bookmarked: true,
    })

    expect(query.update).toHaveBeenCalledWith({ is_bookmarked: true })
    expect(query.eq).toHaveBeenNthCalledWith(1, 'id', 'change-1')
    expect(query.eq).toHaveBeenNthCalledWith(2, 'funnel_id', 'funnel-1')
  })
})
