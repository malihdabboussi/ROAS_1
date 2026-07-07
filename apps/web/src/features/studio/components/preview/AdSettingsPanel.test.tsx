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
  MediaPickerModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="media-picker-modal" /> : null,
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

describe('AdSettingsPanel', () => {
  beforeEach(() => {
    setupAdSettingsPanelMocks(artifactPreviewServiceMock)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders a loading state while the ad is fetched', () => {
    artifactPreviewServiceMock.fetchAd.mockReturnValue(new Promise(() => {}))

    render(<AdSettingsPanel adId="ad-1" />)

    expect(screen.getByText('Loading settings...')).toBeTruthy()
  })

  it('mounts an image ad without changing the public settings behavior', async () => {
    const metaAd = adFixture({ source: 'meta', meta_ad_id: 'meta-ad-1' })
    render(<AdSettingsPanel adId="ad-1" initialAd={metaAd} />)

    expect(screen.getByDisplayValue('Launch offer')).toBeTruthy()
    expect(screen.getByDisplayValue('Primary ad text')).toBeTruthy()
    expect(screen.getByText('Synced from Meta · ID meta-ad-1')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Image' })).toBeTruthy()
    expect(screen.getByText('No creative set')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Republish' })).toBeTruthy()

    await waitFor(() => {
      expect(artifactPreviewServiceMock.fetchMetaPages).toHaveBeenCalledTimes(1)
    })
  })

  it('opens the media picker from the single-image library action without saving first', () => {
    render(<AdSettingsPanel adId="ad-1" initialAd={adFixture()} />)

    artifactPreviewServiceMock.updateAd.mockClear()
    fireEvent.click(screen.getByText('Choose from library'))

    expect(screen.getByTestId('media-picker-modal')).toBeTruthy()
    expect(artifactPreviewServiceMock.updateAd).not.toHaveBeenCalled()
  })

  it('reveals advanced copy and destination fields without saving when advanced mode opens', () => {
    const { container } = render(
      <AdSettingsPanel
        adId="ad-1"
        initialAd={adFixture({
          description: 'Short proof point',
          destination_url: 'https://example.com/landing',
          display_link: 'example.com',
        })}
      />,
    )

    artifactPreviewServiceMock.updateAd.mockClear()

    expect(screen.queryByDisplayValue('Short proof point')).toBeNull()
    expect(container.querySelector('a[href="https://example.com/landing"]')).not.toBeNull()
    expect(screen.queryByDisplayValue('example.com')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Advanced mode' }))

    expect(screen.getByDisplayValue('Short proof point')).toBeTruthy()
    expect(screen.getByDisplayValue('example.com')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Image' })).toBeTruthy()
    expect(artifactPreviewServiceMock.updateAd).not.toHaveBeenCalled()
  })

  it('copies the root image into each placement when per-placement images are enabled', async () => {
    const onPerPlacementChange = vi.fn()
    render(
      <AdSettingsPanel
        adId="ad-1"
        initialAd={adFixture({
          image_url: 'https://example.com/ad.jpg',
          image_asset_id: 'asset-1',
        })}
        onPerPlacementChange={onPerPlacementChange}
      />,
    )

    artifactPreviewServiceMock.updateAd.mockClear()
    fireEvent.click(screen.getByRole('checkbox', { name: /different image per placement/i }))

    await waitFor(() => {
      expect(onPerPlacementChange).toHaveBeenCalledWith(true)
      expect(artifactPreviewServiceMock.updateAd).toHaveBeenCalledWith('ad-1', {
        placement_images: {
          feed: { image_url: 'https://example.com/ad.jpg', image_asset_id: 'asset-1' },
          story: { image_url: 'https://example.com/ad.jpg', image_asset_id: 'asset-1' },
          reels: { image_url: 'https://example.com/ad.jpg', image_asset_id: 'asset-1' },
        },
      })
    })
  })

  it('saves ad format changes from the format selector', async () => {
    render(<AdSettingsPanel adId="ad-1" initialAd={adFixture()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Video' }))

    await waitFor(() => {
      expect(artifactPreviewServiceMock.updateAd).toHaveBeenCalledWith('ad-1', {
        ad_format: 'SINGLE_VIDEO',
      })
    })
  })

  it('debounces headline text saves without eager update', async () => {
    vi.useFakeTimers()
    try {
      render(<AdSettingsPanel adId="ad-1" initialAd={adFixture()} />)

      artifactPreviewServiceMock.updateAd.mockClear()
      fireEvent.change(screen.getByDisplayValue('Launch offer'), {
        target: { value: 'Updated launch' },
      })

      expect(screen.getByDisplayValue('Updated launch')).toBeTruthy()
      expect(artifactPreviewServiceMock.updateAd).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(799)
      expect(artifactPreviewServiceMock.updateAd).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(1)
      expect(artifactPreviewServiceMock.updateAd).toHaveBeenCalledWith('ad-1', {
        headline: 'Updated launch',
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('copies the root video into each placement when per-placement video is enabled', async () => {
    render(
      <AdSettingsPanel
        adId="ad-1"
        initialAd={adFixture({
          ad_format: 'SINGLE_VIDEO',
          video_url: 'https://example.com/ad.mp4',
          metadata: { video_from_library: true },
        })}
      />,
    )

    artifactPreviewServiceMock.updateAd.mockClear()
    fireEvent.click(screen.getByRole('checkbox', { name: /different video per placement/i }))

    await waitFor(() => {
      expect(artifactPreviewServiceMock.updateAd).toHaveBeenCalledWith('ad-1', {
        metadata: expect.objectContaining({
          video_from_library: true,
          placement_videos: {
            feed: { video_url: 'https://example.com/ad.mp4', from_library: true },
            story: { video_url: 'https://example.com/ad.mp4', from_library: true },
            reels: { video_url: 'https://example.com/ad.mp4', from_library: true },
          },
        }),
      })
    })
  })

  it('saves partnership ad metadata from advanced settings', async () => {
    render(
      <AdSettingsPanel
        adId="ad-1"
        initialAd={adFixture({
          metadata: { meta_page_id: 'page-1' },
        })}
      />,
    )

    artifactPreviewServiceMock.updateAd.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /enter advanced mode/i }))

    expect(screen.getByText('Identity')).toBeTruthy()
    expect(screen.getAllByText('Partnership ad')).toHaveLength(2)
    expect(screen.getByText('Ad setup')).toBeTruthy()

    fireEvent.click(screen.getByRole('switch'))

    await waitFor(() => {
      expect(artifactPreviewServiceMock.updateAd).toHaveBeenCalledWith('ad-1', {
        metadata: expect.objectContaining({
          meta_page_id: 'page-1',
          partnership_ad: true,
        }),
      })
    })
  })

  it('saves Advantage+ creative enhancement bulk toggles', async () => {
    render(
      <AdSettingsPanel
        adId="ad-1"
        initialAd={adFixture({
          metadata: { advantage_plus_enhancements: { music: false } },
        })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Advanced mode' }))

    expect(screen.getByText('Advantage+ creative enhancements')).toBeTruthy()
    expect(screen.getByText('Turned on: 5/6')).toBeTruthy()

    artifactPreviewServiceMock.updateAd.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Customize' }))

    expect(screen.getByText('Music')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Turn all on' }))

    await waitFor(() => {
      expect(artifactPreviewServiceMock.updateAd).toHaveBeenCalledWith('ad-1', {
        metadata: expect.objectContaining({
          advantage_plus_enhancements: {
            video_touchups: true,
            text_improvements: true,
            enhance_cta: true,
            image_enhancements: true,
            music: true,
            '3d_animation': true,
          },
        }),
      })
    })
  })

  it('renders carousel cards and saves card edits on blur', async () => {
    render(
      <AdSettingsPanel
        adId="ad-1"
        initialAd={adFixture({
          ad_format: 'CAROUSEL',
          carousel_cards: [
            {
              image_url: 'https://example.com/card.jpg',
              headline: 'Card headline',
              description: 'Card description',
              link: 'https://example.com/card',
            },
          ],
        })}
      />,
    )

    expect(screen.getByText('Carousel Cards')).toBeTruthy()
    expect(screen.getByText('Carousel requires at least 2 cards.')).toBeTruthy()

    fireEvent.change(screen.getByDisplayValue('Card headline'), {
      target: { value: 'Updated card headline' },
    })
    fireEvent.blur(screen.getByDisplayValue('Updated card headline'))

    await waitFor(() => {
      expect(artifactPreviewServiceMock.updateAd).toHaveBeenCalledWith('ad-1', {
        carousel_cards: [
          expect.objectContaining({
            headline: 'Updated card headline',
          }),
        ],
      })
    })
  })

  it('ports publish and refresh controls into hosted header slots', () => {
    const publishHostEl = document.createElement('div')
    const refreshHostEl = document.createElement('div')
    document.body.append(publishHostEl, refreshHostEl)

    render(
      <AdSettingsPanel
        adId="ad-1"
        initialAd={adFixture()}
        publishHostEl={publishHostEl}
        refreshHostEl={refreshHostEl}
      />,
    )

    expect(publishHostEl.textContent).toContain('Publish')
    expect(refreshHostEl.querySelector('button')).not.toBeNull()

    publishHostEl.remove()
    refreshHostEl.remove()
  })

  it('shows published status controls and stays render-stable across rerenders', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const publishedAd = adFixture({
      meta_ad_id: 'meta-ad-1',
      meta_effective_status: 'ACTIVE',
      metadata: { meta_published_at: '2026-06-20T10:00:00.000Z' },
      updated_at: '2026-06-20T11:00:00.000Z',
    })
    const pausedAd = adFixture({
      ...publishedAd,
      meta_effective_status: 'PAUSED',
    })
    const onAdUpdated = vi.fn()
    artifactPreviewServiceMock.fetchAd.mockResolvedValue(pausedAd)

    const { rerender } = render(
      <AdSettingsPanel adId="ad-1" initialAd={publishedAd} onAdUpdated={onAdUpdated} />,
    )
    rerender(
      <AdSettingsPanel adId="ad-1" initialAd={{ ...publishedAd }} onAdUpdated={onAdUpdated} />,
    )

    expect(screen.getByText('Pending changes')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy()
    expect(screen.getByText('Running')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Republish' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))

    await waitFor(() => {
      expect(artifactPreviewServiceMock.setAdMetaStatus).toHaveBeenCalledWith('ad-1', 'PAUSED')
      expect(artifactPreviewServiceMock.fetchAd).toHaveBeenCalledWith('ad-1')
      expect(onAdUpdated).toHaveBeenCalledWith(
        expect.objectContaining({ meta_effective_status: 'PAUSED' }),
      )
      expect(screen.getByRole('button', { name: 'Activate' })).toBeTruthy()
      expect(screen.getByText('Paused')).toBeTruthy()
    })

    await waitFor(() => {
      const maxDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth exceeded')),
      )
      expect(maxDepthErrors).toHaveLength(0)
    })

    consoleError.mockRestore()
  })
})
