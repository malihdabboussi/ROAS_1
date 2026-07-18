import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useFunnelUndoRedo } from './useFunnelUndoRedo'

const fetchStateMock = vi.hoisted(() => vi.fn())
const fetchHistoryMock = vi.hoisted(() => vi.fn())
const undoMock = vi.hoisted(() => vi.fn())
const redoMock = vi.hoisted(() => vi.fn())
const restoreMock = vi.hoisted(() => vi.fn())
const toastErrorMock = vi.hoisted(() => vi.fn())
const toastSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/studio/services/funnel-history.service', () => ({
  fetchFunnelHistoryState: fetchStateMock,
  fetchFunnelHistory: fetchHistoryMock,
  undoFunnelChange: undoMock,
  redoFunnelChange: redoMock,
  restoreFunnelVersion: restoreMock,
}))

vi.mock('sonner', () => ({
  toast: { error: toastErrorMock, success: toastSuccessMock },
}))

describe('useFunnelUndoRedo', () => {
  beforeEach(() => {
    fetchStateMock.mockReset()
    fetchHistoryMock.mockReset()
    undoMock.mockReset()
    redoMock.mockReset()
    restoreMock.mockReset()
    toastErrorMock.mockReset()
    toastSuccessMock.mockReset()
  })

  it('loads state and refreshes the active page after undo', async () => {
    fetchStateMock
      .mockResolvedValueOnce({ can_undo: true, can_redo: false })
      .mockResolvedValueOnce({ can_undo: false, can_redo: true })
    undoMock.mockResolvedValueOnce({
      success: true,
      changed: true,
      can_undo: false,
      can_redo: true,
    })
    const onRestored = vi.fn(async () => undefined)

    const { result } = renderHook(() =>
      useFunnelUndoRedo({
        funnelId: 'funnel-1',
        funnelPageId: 'page-1',
        pageUpdatedAt: '2026-06-16T00:00:00.000Z',
        onRestored,
      }),
    )

    await waitFor(() => expect(result.current.canUndo).toBe(true))

    await act(async () => {
      await result.current.undo()
    })

    expect(undoMock).toHaveBeenCalledWith('funnel-1', 'page-1')
    expect(onRestored).toHaveBeenCalledTimes(1)
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(true)
  })

  it('does not call the API without a funnel id', async () => {
    const { result } = renderHook(() =>
      useFunnelUndoRedo({ funnelId: null, funnelPageId: 'page-1' }),
    )

    await act(async () => {
      await result.current.redo()
    })

    expect(fetchStateMock).not.toHaveBeenCalled()
    expect(redoMock).not.toHaveBeenCalled()
  })

  it('loads saved revisions on demand and restores the selected version', async () => {
    fetchStateMock.mockResolvedValue({ can_undo: true, can_redo: false })
    fetchHistoryMock
      .mockResolvedValueOnce({
        entries: [{ id: 'change-1', label: 'Updated index.html', status: 'applied' }],
        current_change_set_id: 'change-1',
      })
      .mockResolvedValueOnce({
        entries: [{ id: 'change-1', label: 'Updated index.html', status: 'applied' }],
        current_change_set_id: 'change-1',
      })
    restoreMock.mockResolvedValueOnce({
      success: true,
      changed: true,
      can_undo: true,
      can_redo: true,
    })
    const onRestored = vi.fn(async () => undefined)
    const { result } = renderHook(() =>
      useFunnelUndoRedo({
        funnelId: 'funnel-1',
        funnelPageId: 'page-1',
        onRestored,
      }),
    )

    await act(async () => {
      await result.current.loadHistory()
    })
    await act(async () => {
      await result.current.restore('change-1')
    })

    expect(fetchHistoryMock).toHaveBeenCalledWith('funnel-1', 'page-1')
    expect(restoreMock).toHaveBeenCalledWith('funnel-1', 'change-1', 'page-1')
    expect(onRestored).toHaveBeenCalledTimes(1)
    expect(toastSuccessMock).toHaveBeenCalled()
  })
})
