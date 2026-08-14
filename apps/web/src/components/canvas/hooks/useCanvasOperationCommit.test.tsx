import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyCampaignCanvasOperations,
  fetchCampaignWhiteboard,
  undoCampaignCanvasOperation,
} from '../services/whiteboard.service'
import { useCanvasOperationCommit } from './useCanvasOperationCommit'

vi.mock('../services/whiteboard.service', () => ({
  applyCampaignCanvasOperations: vi.fn(),
  fetchCampaignWhiteboard: vi.fn(),
  undoCampaignCanvasOperation: vi.fn(),
}))

const boardResponse = {
  board: {
    id: 'board-1',
    campaign_id: 'campaign-1',
    title: 'Canvas',
    revision: 3,
    viewport: { x: 0, y: 0, zoom: 1 },
  },
  items: [],
  connectors: [],
}

describe('useCanvasOperationCommit', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reloads the latest revision and retries a conflicting operation once', async () => {
    vi.mocked(applyCampaignCanvasOperations)
      .mockRejectedValueOnce(new Error('CANVAS_REVISION_CONFLICT:3'))
      .mockResolvedValueOnce({
        operation_id: 'operation-4',
        committed_revision: 4,
        idempotent_replay: false,
      })
    vi.mocked(fetchCampaignWhiteboard).mockResolvedValue(boardResponse)
    const { result } = renderHook(() =>
      useCanvasOperationCommit({ campaignId: 'campaign-1', onUndoLoaded: vi.fn() }),
    )

    act(() => result.current.commit([{ op: 'delete_item', item_id: 'item-1' }]))

    await waitFor(() => expect(applyCampaignCanvasOperations).toHaveBeenCalledTimes(2))
    expect(result.current.saveState).toBe('saved')
    expect(applyCampaignCanvasOperations).toHaveBeenNthCalledWith(2, 'campaign-1', 3, [
      { op: 'delete_item', item_id: 'item-1' },
    ])
    expect(result.current.canUndo).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('undoes and redoes the acknowledged batch through inverse operations', async () => {
    const onUndoLoaded = vi.fn()
    vi.mocked(applyCampaignCanvasOperations).mockResolvedValue({
      operation_id: 'operation-1',
      committed_revision: 1,
      idempotent_replay: false,
    })
    vi.mocked(undoCampaignCanvasOperation)
      .mockResolvedValueOnce({
        operation_id: 'operation-2',
        committed_revision: 2,
        idempotent_replay: false,
      })
      .mockResolvedValueOnce({
        operation_id: 'operation-3',
        committed_revision: 3,
        idempotent_replay: false,
      })
    vi.mocked(fetchCampaignWhiteboard).mockResolvedValue(boardResponse)
    const { result } = renderHook(() =>
      useCanvasOperationCommit({ campaignId: 'campaign-1', onUndoLoaded }),
    )
    act(() => result.current.commit([{ op: 'delete_item', item_id: 'item-1' }]))
    await waitFor(() => expect(result.current.canUndo).toBe(true))

    await act(async () => result.current.undo())

    expect(undoCampaignCanvasOperation).toHaveBeenCalledWith('campaign-1', 'operation-1')
    expect(onUndoLoaded).toHaveBeenCalledWith(boardResponse)
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(true)

    await act(async () => result.current.redo())

    expect(undoCampaignCanvasOperation).toHaveBeenLastCalledWith('campaign-1', 'operation-2')
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })
})
