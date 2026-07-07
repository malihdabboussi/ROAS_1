import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MediaSource } from '@/components/media/media-picker-modal.types'
import { useMediaPickerMeta } from './use-media-picker-meta'

const mocks = vi.hoisted(() => ({
  fetchMetaAdImages: vi.fn(),
}))

vi.mock('@/lib/artifacts/artifact-preview-api', () => ({
  fetchMetaAdImages: mocks.fetchMetaAdImages,
}))

type HookProps = {
  open: boolean
  mediaSource: MediaSource
  adAccountId: string | null
}

describe('useMediaPickerMeta', () => {
  beforeEach(() => {
    mocks.fetchMetaAdImages.mockResolvedValue([
      { id: 'image-1', hash: 'hash-1', url: 'https://cdn.example.com/image.jpg', name: 'Hero' },
    ])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('loads Meta images only for the open Meta source and settles without render churn', async () => {
    let renderCount = 0
    const { result, rerender } = renderHook(
      (props: HookProps) => {
        renderCount += 1
        return useMediaPickerMeta(props)
      },
      {
        initialProps: {
          open: false,
          mediaSource: 'library',
          adAccountId: 'act_1',
        },
      },
    )

    expect(result.current.metaImages).toEqual([])
    expect(result.current.metaImagesLoading).toBe(false)
    expect(mocks.fetchMetaAdImages).not.toHaveBeenCalled()

    rerender({ open: true, mediaSource: 'meta', adAccountId: 'act_1' })

    await waitFor(() =>
      expect(result.current.metaImages).toEqual([
        {
          id: 'image-1',
          hash: 'hash-1',
          url: 'https://cdn.example.com/image.jpg',
          name: 'Hero',
        },
      ]),
    )

    expect(result.current.metaImagesLoading).toBe(false)
    expect(mocks.fetchMetaAdImages).toHaveBeenCalledTimes(1)
    expect(mocks.fetchMetaAdImages).toHaveBeenCalledWith('act_1')
    expect(renderCount).toBeLessThan(6)
  })

  it('keeps an empty image list when Meta image loading fails', async () => {
    mocks.fetchMetaAdImages.mockRejectedValueOnce(new Error('Meta unavailable'))

    const { result } = renderHook(() =>
      useMediaPickerMeta({ open: true, mediaSource: 'meta', adAccountId: 'act_1' }),
    )

    await waitFor(() => expect(result.current.metaImagesLoading).toBe(false))

    expect(result.current.metaImages).toEqual([])
    expect(mocks.fetchMetaAdImages).toHaveBeenCalledTimes(1)
  })
})
