import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdSettingsPanel } from './AdSettingsPanel'
import { adFixture, setupAdSettingsPanelMocks } from './AdSettingsPanel.test-helpers'

const artifactPreviewServiceMock = vi.hoisted(() => ({
  fetchAd: vi.fn(),
  fetchAdCampaign: vi.fn(),
  fetchAdSet: vi.fn(),
  fetchMetaInstagramAccountsForPage: vi.fn(),
  fetchMetaPage: vi.fn(),
  fetchMetaPages: vi.fn(),
  refreshAdMetaStatus: vi.fn(),
  setAdMetaStatus: vi.fn(),
  updateAd: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
}))

vi.mock('@/components/media/MediaPickerModal', () => ({
  MediaPickerModal: ({
    open,
    onSelectAsset,
  }: {
    open: boolean
    onSelectAsset: (asset: { id: string; public_url: string }) => void
  }) =>
    open ? (
      <div data-testid="media-picker-modal">
        <button
          type="button"
          onClick={() =>
            onSelectAsset({ id: 'asset-2', public_url: 'https://example.com/library.jpg' })
          }
        >
          Pick media asset
        </button>
      </div>
    ) : null,
}))

vi.mock('@/lib/hooks/use-presigned-upload', () => ({
  usePresignedUpload: () => ({
    upload: vi.fn(),
  }),
}))

vi.mock('@/lib/services/google-drive-api', () => ({
  getDriveFile: vi.fn(),
}))

vi.mock('../../services/artifact-preview.service', () => artifactPreviewServiceMock)

vi.mock('./AdConceptWorkflowPanel', () => ({
  AdConceptWorkflowPanel: () => <div data-testid="ad-concept-workflow-panel" />,
}))

vi.mock('./MetaIntegrationsReviewModal', () => ({
  MetaIntegrationsReviewModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="meta-integrations-review-modal" /> : null,
}))

vi.mock('./MetaPublishModal', () => ({
  MetaPublishModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="meta-publish-modal" /> : null,
}))

function mockMenuButtonRect(button: HTMLButtonElement | null) {
  expect(button).not.toBeNull()
  vi.spyOn(button!, 'getBoundingClientRect').mockReturnValue({
    bottom: 40,
    height: 20,
    left: 100,
    right: 120,
    top: 20,
    width: 20,
    x: 100,
    y: 20,
    toJSON: () => ({}),
  } as DOMRect)
}

describe('AdSettingsPanel creative menus', () => {
  beforeEach(() => {
    setupAdSettingsPanelMocks(artifactPreviewServiceMock)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('opens and closes the single-image action menu without saving', async () => {
    const { container } = render(
      <AdSettingsPanel
        adId="ad-1"
        initialAd={adFixture({ image_url: 'https://example.com/ad.jpg' })}
      />,
    )

    artifactPreviewServiceMock.updateAd.mockClear()
    const changeImageButton = container.querySelector(
      'button[title="Change image"]',
    ) as HTMLButtonElement | null

    mockMenuButtonRect(changeImageButton)

    fireEvent.click(changeImageButton!)

    expect(screen.getByText('Regenerate')).toBeTruthy()
    expect(screen.getByText('Replace from library')).toBeTruthy()
    const dropdown = document.body.querySelector('[data-image-menu-dropdown]') as HTMLElement | null
    expect(dropdown?.style.top).toBe('44px')
    expect(dropdown?.style.left).toBe('120px')
    expect(artifactPreviewServiceMock.updateAd).not.toHaveBeenCalled()

    fireEvent.mouseDown(document.body)

    await waitFor(() => {
      expect(screen.queryByText('Replace from library')).toBeNull()
    })
    expect(artifactPreviewServiceMock.updateAd).not.toHaveBeenCalled()
  })

  it('saves selected library images and backs up generated designs', async () => {
    render(
      <AdSettingsPanel
        adId="ad-1"
        initialAd={adFixture({ generated_tsx: '<div>Generated design</div>' })}
      />,
    )

    artifactPreviewServiceMock.updateAd.mockClear()
    fireEvent.click(screen.getByText('From library'))
    fireEvent.click(screen.getByRole('button', { name: 'Pick media asset' }))

    await waitFor(() => {
      expect(artifactPreviewServiceMock.updateAd).toHaveBeenCalledWith('ad-1', {
        image_url: 'https://example.com/library.jpg',
        image_asset_id: 'asset-2',
        generated_tsx: null,
        metadata: {
          generated_tsx_backup: '<div>Generated design</div>',
        },
      })
    })
  })

  it('saves selected library images into carousel cards', async () => {
    const { container } = render(
      <AdSettingsPanel
        adId="ad-1"
        initialAd={adFixture({
          ad_format: 'CAROUSEL',
          carousel_cards: [
            {
              image_url: 'https://example.com/card-1.jpg',
              image_asset_id: 'asset-1',
              headline: 'Card 1',
              description: 'Description 1',
              link: 'https://example.com/card-1',
            },
          ],
        })}
      />,
    )

    artifactPreviewServiceMock.updateAd.mockClear()
    const changeImageButton = container.querySelector(
      'button[title="Change image"]',
    ) as HTMLButtonElement | null

    mockMenuButtonRect(changeImageButton)

    fireEvent.click(changeImageButton!)
    fireEvent.click(screen.getByText('Replace from library'))
    fireEvent.click(screen.getByRole('button', { name: 'Pick media asset' }))

    await waitFor(() => {
      expect(artifactPreviewServiceMock.updateAd).toHaveBeenCalledWith('ad-1', {
        carousel_cards: [
          {
            image_url: 'https://example.com/library.jpg',
            image_asset_id: 'asset-2',
            headline: 'Card 1',
            description: 'Description 1',
            link: 'https://example.com/card-1',
          },
        ],
      })
    })
  })

  it('saves selected library videos from the video action menu', async () => {
    vi.useFakeTimers()
    try {
      const { container } = render(
        <AdSettingsPanel
          adId="ad-1"
          initialAd={adFixture({
            ad_format: 'SINGLE_VIDEO',
            video_url: 'https://example.com/original.mp4',
            metadata: { video_from_library: true },
          })}
        />,
      )

      artifactPreviewServiceMock.updateAd.mockClear()
      const changeVideoButton = container.querySelector(
        'button[title="Change video"]',
      ) as HTMLButtonElement | null

      mockMenuButtonRect(changeVideoButton)

      fireEvent.click(changeVideoButton!)
      fireEvent.click(screen.getByText('Replace from library'))
      fireEvent.click(screen.getByRole('button', { name: 'Pick media asset' }))

      expect(artifactPreviewServiceMock.updateAd).toHaveBeenCalledWith('ad-1', {
        metadata: {
          video_from_library: true,
        },
      })
      expect(artifactPreviewServiceMock.updateAd).not.toHaveBeenCalledWith('ad-1', {
        video_url: 'https://example.com/library.jpg',
      })

      await vi.advanceTimersByTimeAsync(799)
      expect(artifactPreviewServiceMock.updateAd).not.toHaveBeenCalledWith('ad-1', {
        video_url: 'https://example.com/library.jpg',
      })

      await vi.advanceTimersByTimeAsync(1)
      expect(artifactPreviewServiceMock.updateAd).toHaveBeenCalledWith('ad-1', {
        video_url: 'https://example.com/library.jpg',
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('dispatches regenerate requests from image, carousel, and video menus', () => {
    const events: Array<Record<string, unknown>> = []
    const handler = (event: Event) => {
      events.push((event as CustomEvent<Record<string, unknown>>).detail)
    }
    window.addEventListener('studio-request-regenerate-ad-image', handler)

    try {
      const imageView = render(
        <AdSettingsPanel
          adId="ad-1"
          initialAd={adFixture({ image_url: 'https://example.com/ad.jpg' })}
        />,
      )
      const imageButton = imageView.container.querySelector(
        'button[title="Change image"]',
      ) as HTMLButtonElement | null
      mockMenuButtonRect(imageButton)
      fireEvent.click(imageButton!)
      fireEvent.click(screen.getByText('Regenerate'))
      expect(events[0]).toEqual({
        adId: 'ad-1',
        prompt:
          'Regenerate the image for this ad (ad id: ad-1). Update the existing ad creative; do not create or duplicate ads.',
        headline: 'Launch offer',
        imageUrl: 'https://example.com/ad.jpg',
      })
      imageView.unmount()

      const carouselView = render(
        <AdSettingsPanel
          adId="ad-1"
          initialAd={adFixture({
            ad_format: 'CAROUSEL',
            carousel_cards: [
              {
                image_url: 'https://example.com/card-1.jpg',
                headline: 'Card 1',
                description: 'Description 1',
                link: 'https://example.com/card-1',
              },
            ],
          })}
        />,
      )
      const carouselButton = carouselView.container.querySelector(
        'button[title="Change image"]',
      ) as HTMLButtonElement | null
      mockMenuButtonRect(carouselButton)
      fireEvent.click(carouselButton!)
      fireEvent.click(screen.getByText('Regenerate'))
      expect(events[1]).toEqual({
        adId: 'ad-1',
        prompt:
          'Regenerate the image for carousel card 1 of this ad (ad id: ad-1). Update the existing ad creative; do not create or duplicate ads.',
        headline: 'Launch offer',
        imageUrl: 'https://example.com/card-1.jpg',
        carouselCardIndex: 0,
      })
      carouselView.unmount()

      const videoView = render(
        <AdSettingsPanel
          adId="ad-1"
          initialAd={adFixture({
            ad_format: 'SINGLE_VIDEO',
            video_url: 'https://example.com/ad.mp4',
            metadata: { video_from_library: true },
          })}
        />,
      )
      const videoButton = videoView.container.querySelector(
        'button[title="Change video"]',
      ) as HTMLButtonElement | null
      mockMenuButtonRect(videoButton)
      fireEvent.click(videoButton!)
      fireEvent.click(screen.getByText('Regenerate'))
      expect(events[2]).toEqual({
        adId: 'ad-1',
        prompt:
          'Regenerate the video for this ad (ad id: ad-1). Update the existing ad creative; do not create or duplicate ads.',
        headline: 'Launch offer',
        imageUrl: 'https://example.com/ad.mp4',
        isVideo: true,
      })
      expect(artifactPreviewServiceMock.updateAd).not.toHaveBeenCalled()
      videoView.unmount()
    } finally {
      window.removeEventListener('studio-request-regenerate-ad-image', handler)
    }
  })
})
