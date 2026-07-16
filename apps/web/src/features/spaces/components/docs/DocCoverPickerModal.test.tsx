import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DocCoverGenerateModal } from './DocCoverPickerModal'

const mediaApiMocks = vi.hoisted(() => ({
  deleteAsset: vi.fn(),
  fetchImageGenerationModels: vi.fn(),
  generateImageStream: vi.fn(),
  listAssets: vi.fn(),
}))

vi.mock('@/lib/services/media-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/media-api')>()
  return {
    ...actual,
    deleteAsset: mediaApiMocks.deleteAsset,
    fetchImageGenerationModels: mediaApiMocks.fetchImageGenerationModels,
    generateImageStream: mediaApiMocks.generateImageStream,
    listAssets: mediaApiMocks.listAssets,
  }
})

describe('DocCoverGenerateModal', () => {
  beforeEach(() => {
    mediaApiMocks.fetchImageGenerationModels.mockResolvedValue({
      success: true,
      defaultModel: 'gpt-5.4-image-2',
      tier: 'pro',
      models: [
        {
          id: 'gpt-5.4-image-2',
          name: 'ChatGPT',
          tier: 'pro',
          description: 'Strong detail',
          supportedAspectRatios: ['1:1', '16:9'],
          defaultAspectRatio: '16:9',
        },
      ],
    })
    mediaApiMocks.listAssets.mockResolvedValue({
      assets: [
        {
          id: 'asset-1',
          public_url: 'https://assets.example/generated.png',
          source_prompt: 'Blue gradient',
          description: null,
        },
      ],
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders existing generated images and closes from the modal chrome', async () => {
    const onClose = vi.fn()
    render(
      <DocCoverGenerateModal
        open
        onClose={onClose}
        onSelect={vi.fn()}
        campaignId="campaign-1"
        title="Generate brain icon"
        extraTags={['campaign-brain-icon']}
      />,
    )

    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.getByText('Generate brain icon')).toBeTruthy()
    expect(await screen.findByText('Your creations')).toBeTruthy()
    await waitFor(() => expect(mediaApiMocks.listAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        campaign_id: 'campaign-1',
        category: 'ai-generated',
        asset_type: 'image',
      }),
    ))
    expect(mediaApiMocks.fetchImageGenerationModels).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not render while closed and settles without repeated render churn', async () => {
    const onRender = vi.fn()
    const { rerender } = render(
      <Profiler id="doc-cover-generate-modal" onRender={onRender}>
        <DocCoverGenerateModal open={false} onClose={vi.fn()} onSelect={vi.fn()} />
      </Profiler>,
    )

    expect(screen.queryByRole('dialog')).toBeNull()

    rerender(
      <Profiler id="doc-cover-generate-modal" onRender={onRender}>
        <DocCoverGenerateModal
          open
          onClose={vi.fn()}
          onSelect={vi.fn()}
          title="Generate image"
        />
      </Profiler>,
    )

    expect(await screen.findByRole('dialog')).toBeTruthy()
    await waitFor(() => expect(mediaApiMocks.fetchImageGenerationModels).toHaveBeenCalledTimes(1))
    expect(onRender.mock.calls.length).toBeLessThanOrEqual(8)
  })
})
