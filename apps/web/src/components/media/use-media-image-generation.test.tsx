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
        conversationId: 'conversation-1',
        loadCreations: false,
        onGenerationComplete,
      }),
    )

    await waitFor(() => expect(fetchImageGenerationModels).toHaveBeenCalled())
    act(() => {
      result.current.setReference('parent-asset', 'https://example.com/original.png')
      result.current.addReferenceAsset('reference-asset')
      result.current.setPrompt('Put the dog in a city park')
    })
    await act(async () => {
      await result.current.handleGenerate()
    })

    expect(editImageStream).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'Put the dog in a city park',
        parent_image_asset_id: 'parent-asset',
        reference_image_asset_ids: ['reference-asset'],
        space_id: 'space-1',
        campaign_id: 'campaign-1',
        conversation_id: 'conversation-1',
      }),
      expect.any(Object),
      expect.any(AbortSignal),
    )
    expect(onGenerationComplete).toHaveBeenCalledWith({
      url: 'https://example.com/edited.png',
      assetId: 'edited-asset',
    })
  })

  it('keeps current model aspect ratios when the API returns stale capabilities', async () => {
    vi.mocked(fetchImageGenerationModels).mockResolvedValue({
      success: true,
      models: [
        {
          id: 'gpt-5.4-image-2',
          name: 'ChatGPT',
          tier: 'pro',
          description: 'ChatGPT images',
          supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3'],
          defaultAspectRatio: '16:9',
        },
      ],
      defaultModel: 'gpt-5.4-image-2',
      tier: 'pro',
    })

    const { result } = renderHook(() =>
      useMediaImageGeneration({
        open: true,
        loadCreations: false,
      }),
    )

    await waitFor(() => expect(result.current.availableModels).toHaveLength(1))
    expect(result.current.supportedAspectRatios).toContain('3:4')
    expect(result.current.supportedAspectRatios).toContain('4:5')
  })
})
