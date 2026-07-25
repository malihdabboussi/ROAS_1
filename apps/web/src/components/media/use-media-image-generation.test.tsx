import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { editImageStream, fetchImageGenerationModels, listAssets } from '@/lib/services/media-api'
import { useMediaImageGeneration } from './use-media-image-generation'

vi.mock('@/lib/services/media-api', () => ({
  deleteAsset: vi.fn(),
  editImageStream: vi.fn(),
  fetchImageGenerationModels: vi.fn(),
  generateImageStream: vi.fn(),
  listAssets: vi.fn(),
}))

describe('useMediaImageGeneration', () => {
  beforeEach(() => {
    vi.mocked(listAssets).mockResolvedValue({ assets: [], total: 0 })
    vi.mocked(fetchImageGenerationModels).mockResolvedValue({
      success: true,
      models: [],
      defaultModel: 'gpt-5.4-image-2',
      tier: 'pro',
    })
    vi.mocked(editImageStream).mockImplementation(async (_params, callbacks) => {
      callbacks.onStart?.()
      const completion = {
        url: 'https://example.com/edited.png',
        asset: { id: 'edited-asset', public_url: 'https://example.com/edited.png' } as never,
      }
      callbacks.onComplete?.(completion)
      return completion
    })
  })

  it('edits the selected parent asset directly and returns the persisted version', async () => {
    const onGenerationComplete = vi.fn()
    const { result } = renderHook(() =>
      useMediaImageGeneration({
        open: true,
        spaceId: 'space-1',
        campaignId: 'campaign-1',
        loadCreations: false,
        onGenerationComplete,
      }),
    )

    await waitFor(() => expect(fetchImageGenerationModels).toHaveBeenCalled())
    act(() => {
      result.current.setReference('parent-asset', 'https://example.com/original.png')
      result.current.setPrompt('Put the dog in a city park')
    })
    await act(async () => {
      await result.current.handleGenerate()
    })

    expect(editImageStream).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'Put the dog in a city park',
        parent_image_asset_id: 'parent-asset',
        space_id: 'space-1',
        campaign_id: 'campaign-1',
      }),
      expect.any(Object),
      expect.any(AbortSignal),
    )
    expect(onGenerationComplete).toHaveBeenCalledWith({
      url: 'https://example.com/edited.png',
      assetId: 'edited-asset',
    })
  })
})
