import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useResilientImageSrc } from './use-resilient-image-src'

const mocks = vi.hoisted(() => ({
  refreshAssetUrl: vi.fn(),
}))

vi.mock('@/lib/services/media-api', () => ({
  refreshAssetUrl: mocks.refreshAssetUrl,
}))

vi.mock('@/lib/utils/chat-markdown.utils', () => ({
  healRedactedSupabaseStorageUrls: (text: string) =>
    text.replace('https://abc123..co/storage/', 'https://abc123.supabase.co/storage/'),
}))

describe('useResilientImageSrc', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.refreshAssetUrl.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('heals redacted supabase storage hosts before loading', () => {
    const { result } = renderHook(() =>
      useResilientImageSrc('https://abc123..co/storage/v1/object/sign/media/x/images/a.png'),
    )
    expect(result.current.imgSrc).toBe(
      'https://abc123.supabase.co/storage/v1/object/sign/media/x/images/a.png',
    )
    expect(result.current.loadState).toBe('loading')
  })

  it('refreshes a signed asset url after retries fail', async () => {
    mocks.refreshAssetUrl.mockResolvedValue({
      url: 'https://cdn.example.com/fresh.png',
    })

    const { result } = renderHook(() =>
      useResilientImageSrc('https://cdn.example.com/stale.png', {
        maxAttempts: 2,
        mediaAssetId: 'asset-1',
      }),
    )

    act(() => {
      result.current.onError()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })
    await act(async () => {
      result.current.onError()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(mocks.refreshAssetUrl).toHaveBeenCalledWith('asset-1')
    expect(result.current.imgSrc).toBe('https://cdn.example.com/fresh.png')
    expect(result.current.loadState).toBe('loading')
  })

  it('surfaces error for empty urls', () => {
    const { result } = renderHook(() => useResilientImageSrc(''))
    expect(result.current.loadState).toBe('error')
    expect(result.current.imgSrc).toBe('')
  })
})
