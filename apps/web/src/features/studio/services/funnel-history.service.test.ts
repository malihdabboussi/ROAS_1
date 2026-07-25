import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchFunnelHistory,
  fetchFunnelHistoryState,
  redoFunnelChange,
  restoreFunnelVersion,
  undoFunnelChange,
} from './funnel-history.service'

const backendGetMock = vi.hoisted(() => vi.fn())
const backendPostMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: backendGetMock,
  backendPost: backendPostMock,
}))

describe('funnel history service', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
    backendPostMock.mockReset()
  })

  it('loads page-scoped undo state', async () => {
    backendGetMock.mockResolvedValueOnce({ can_undo: true, can_redo: false })

    const state = await fetchFunnelHistoryState('funnel-1', 'page-1')

    expect(state).toEqual({ can_undo: true, can_redo: false })
    expect(backendGetMock).toHaveBeenCalledWith(
      '/api/funnels/funnel-1/history/state?funnel_page_id=page-1',
    )
  })

  it('posts undo and redo requests with the active page scope', async () => {
    backendPostMock.mockResolvedValue({ success: true, changed: true })

    await undoFunnelChange('funnel-1', 'page-1')
    await redoFunnelChange('funnel-1', 'page-1')

    expect(backendPostMock).toHaveBeenNthCalledWith(1, '/api/funnels/funnel-1/history/undo', {
      funnel_page_id: 'page-1',
    })
    expect(backendPostMock).toHaveBeenNthCalledWith(2, '/api/funnels/funnel-1/history/redo', {
      funnel_page_id: 'page-1',
    })
  })

  it('loads the revision timeline and restores a selected version', async () => {
    backendGetMock.mockResolvedValueOnce({
      entries: [
        {
          id: 'change-1',
          metadata: { is_bookmarked: true },
        },
      ],
      current_change_set_id: 'change-1',
    })
    backendPostMock.mockResolvedValueOnce({ success: true, changed: true })

    const timeline = await fetchFunnelHistory('funnel-1', 'page-1')
    await restoreFunnelVersion('funnel-1', 'change-1', 'page-1')

    expect(timeline.entries[0]?.is_bookmarked).toBe(true)
    expect(backendGetMock).toHaveBeenCalledWith(
      '/api/funnels/funnel-1/history?funnel_page_id=page-1',
    )
    expect(backendPostMock).toHaveBeenCalledWith('/api/funnels/funnel-1/history/restore', {
      change_set_id: 'change-1',
      funnel_page_id: 'page-1',
    })
  })
})
