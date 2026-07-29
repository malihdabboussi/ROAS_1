import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VIBEY_OPEN_MEDIA_EVENT } from '@/lib/media/open-media-asset-in-app'
import { useSpaceOpenMediaEvent } from './use-space-open-media-event'

const storeMocks = vi.hoisted(() => ({
  activeViewId: null as string | null,
  spaces: [
    {
      id: 'space-1',
      schema: { views: [{ id: 'media-view', type: 'media' }] },
    },
  ],
}))

vi.mock('../store/use-spaces-store', () => ({
  useSpacesStore: {
    getState: () => storeMocks,
  },
}))

describe('useSpaceOpenMediaEvent', () => {
  beforeEach(() => {
    storeMocks.activeViewId = null
  })

  it('syncs Space media state without consuming the shell viewer event', () => {
    const setActiveView = vi.fn()
    const setMediaDeepDetail = vi.fn()
    renderHook(() =>
      useSpaceOpenMediaEvent({
        activeSpaceId: 'space-1',
        setActiveSpace: vi.fn(),
        setActiveView,
        setMediaDeepDetail,
        setMediaDetailQuery: vi.fn(),
        refresh: vi.fn().mockResolvedValue(undefined),
      }),
    )

    const event = new CustomEvent(VIBEY_OPEN_MEDIA_EVENT, {
      cancelable: true,
      detail: {
        mediaAssetId: '4b041c8d-cd29-4ee1-8841-dadd52f36aac',
        title: 'Static 1 — Light',
        spaceId: 'space-1',
      },
    })
    act(() => window.dispatchEvent(event))

    expect(event.defaultPrevented).toBe(false)
    expect(setMediaDeepDetail).toHaveBeenCalledWith({
      id: '4b041c8d-cd29-4ee1-8841-dadd52f36aac',
      title: 'Static 1 — Light',
    })
    expect(setActiveView).toHaveBeenCalledWith('media-view')
  })
})
