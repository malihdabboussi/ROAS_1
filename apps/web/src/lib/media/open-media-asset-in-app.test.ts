import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openMediaAssetInApp, VIBEY_OPEN_MEDIA_EVENT } from './open-media-asset-in-app'

describe('openMediaAssetInApp', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      dispatchEvent: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('dispatches vibey-open-media for a valid asset id', () => {
    const id = '0f3fa1a4-6c8e-4282-bc68-00161152e039'
    expect(openMediaAssetInApp({ mediaAssetId: id, title: 'Horse', kind: 'image' })).toBe(true)
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: VIBEY_OPEN_MEDIA_EVENT,
        detail: { mediaAssetId: id, title: 'Horse', kind: 'image' },
        cancelable: true,
      }),
    )
  })

  it('rejects non-uuid ids', () => {
    expect(openMediaAssetInApp('not-a-uuid')).toBe(false)
    expect(window.dispatchEvent).not.toHaveBeenCalled()
  })
})
