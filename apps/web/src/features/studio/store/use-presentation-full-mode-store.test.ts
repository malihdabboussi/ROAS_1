import { afterEach, describe, expect, it, vi } from 'vitest'
import { PRESENTATION_CHAT_REQUEST_OPEN_EVENT } from '@/lib/presentations/presentation-chat-events'
import { usePresentationFullModeStore } from './use-presentation-full-mode-store'

describe('usePresentationFullModeStore', () => {
  afterEach(() => {
    usePresentationFullModeStore.getState().deactivate()
    vi.restoreAllMocks()
  })

  it('requests the Spaces chat panel when entering presentation edit modes', () => {
    const listener = vi.fn()
    window.addEventListener(PRESENTATION_CHAT_REQUEST_OPEN_EVENT, listener)

    try {
      usePresentationFullModeStore.getState().setMode('preview')
      expect(listener).not.toHaveBeenCalled()

      usePresentationFullModeStore.getState().setMode('edit')
      usePresentationFullModeStore.getState().setMode('comments')
      usePresentationFullModeStore.getState().setMode('tweaks')

      expect(listener).toHaveBeenCalledTimes(3)
    } finally {
      window.removeEventListener(PRESENTATION_CHAT_REQUEST_OPEN_EVENT, listener)
    }
  })
})
