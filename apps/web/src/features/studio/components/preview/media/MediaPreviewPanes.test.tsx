import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MediaAsset } from '@/lib/services/media-api'
import { FilePreview, ImagePreview, VideoPreview } from './MediaPreviewPanes'

vi.mock('./MediaExportToolbar', () => ({
  MediaExportToolbar: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))

function assetFixture(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id: 'asset-1',
    user_id: 'user-1',
    name: 'Launch asset',
    original_filename: 'launch.png',
    file_path: 'campaigns/launch.png',
    bucket_name: 'media',
    file_size: 1024,
    mime_type: 'image/png',
    width: 1200,
    height: 628,
    asset_type: 'image',
    category: 'upload',
    subcategory: null,
    campaign_id: 'campaign-1',
    tags: [],
    description: null,
    is_public: true,
    public_url: 'https://media.example.com/launch.png',
    source: null,
    source_model: null,
    source_prompt: null,
    usage_count: 0,
    last_used_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('MediaPreviewPanes', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it.each([
    ['image', ImagePreview, assetFixture(), 'Open image preview'],
    [
      'video',
      VideoPreview,
      assetFixture({ mime_type: 'video/mp4', asset_type: 'video' }),
      'Open video preview',
    ],
    [
      'file',
      FilePreview,
      assetFixture({ mime_type: 'application/zip', asset_type: 'file' }),
      'Open file',
    ],
  ])(
    'gives the %s open action an accessible name and isolates its new tab',
    (_, Preview, asset, label) => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      render(<Preview asset={asset} campaignId="campaign-1" />)
      fireEvent.click(screen.getByRole('button', { name: label }))

      expect(openSpy).toHaveBeenCalledWith(asset.public_url, '_blank', 'noopener,noreferrer')
    },
  )

  it('names the image and video copy controls without requiring hover', () => {
    const { rerender } = render(<ImagePreview asset={assetFixture()} campaignId="campaign-1" />)
    expect(screen.getByRole('button', { name: 'Copy image' })).toBeTruthy()

    rerender(
      <VideoPreview
        asset={assetFixture({ mime_type: 'video/mp4', asset_type: 'video' })}
        campaignId="campaign-1"
      />,
    )
    expect(screen.getByRole('button', { name: 'Copy video' })).toBeTruthy()
  })
})
