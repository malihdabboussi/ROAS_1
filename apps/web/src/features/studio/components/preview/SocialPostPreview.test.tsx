import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SocialPost } from '../../types'
import SocialPostPreview from './SocialPostPreview'

const serviceMocks = vi.hoisted(() => ({
  fetchCampaignSchedule: vi.fn(),
  fetchIntegrationStatus: vi.fn(),
  fetchSocialPost: vi.fn(),
  scheduleSocialPost: vi.fn(),
  updateSocialPost: vi.fn(),
}))

const exportMocks = vi.hoisted(() => ({
  downloadBlob: vi.fn(),
  downloadCarouselAsPDF: vi.fn(),
  downloadCarouselAsZIP: vi.fn(),
  exportElementToPngBlob: vi.fn(),
}))

const supabaseMocks = vi.hoisted(() => ({
  channel: vi.fn(),
  getUser: vi.fn(),
  on: vi.fn(),
  removeChannel: vi.fn(),
  subscribe: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
}))

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    auth: {
      getUser: supabaseMocks.getUser,
    },
    channel: supabaseMocks.channel,
    removeChannel: supabaseMocks.removeChannel,
  }),
}))

vi.mock('@/components/media/MediaPickerModal', () => ({
  MediaPickerModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="media-picker-modal" /> : null,
}))

vi.mock('@/components/calendar/MonthCalendar', () => ({
  MonthCalendar: ({ onSelectDate }: { onSelectDate: (date: Date) => void }) => (
    <button type="button" onClick={() => onSelectDate(new Date('2026-01-02T10:00:00.000Z'))}>
      Mock month calendar
    </button>
  ),
}))

vi.mock('@/features/studio/lib/carousel-export', () => ({
  downloadCarouselAsPDF: exportMocks.downloadCarouselAsPDF,
  downloadCarouselAsZIP: exportMocks.downloadCarouselAsZIP,
}))

vi.mock('@/features/studio/lib/png-export', () => ({
  downloadBlob: exportMocks.downloadBlob,
  exportElementToPngBlob: exportMocks.exportElementToPngBlob,
  rasterizeSocialPostOffscreen: vi.fn(),
  socialPostRenderDimensions: vi.fn(() => ({ width: 1080, height: 1350 })),
}))

vi.mock('@/features/studio/lib/creative-tsx-validation', () => ({
  createCreativeRepairFn: () => vi.fn(),
  looksLikeInvalidCreativeTsx: vi.fn(() => false),
  SAFE_FALLBACK_SOCIAL_TSX: 'function SocialCreative() { return <div /> }',
}))

vi.mock('@/hooks/use-esbuild-runner', () => ({
  useEsbuildRunner: () => ({
    element: <div data-testid="tsx-runner-output" />,
    error: null,
  }),
}))

vi.mock('@/features/studio/lib/use-self-healing-preview', () => ({
  useSelfHealingPreview: ({ code }: { code: string }) => ({
    resolvedCode: code,
    status: 'ready',
  }),
}))

vi.mock('@/features/studio/lib/tsx-runner-scope', () => ({
  createTsxRunnerScope: () => ({}),
}))

vi.mock('@/lib/hooks/use-presigned-upload', () => ({
  usePresignedUpload: () => ({
    upload: vi.fn(),
  }),
}))

vi.mock('../../services/artifact-preview.service', () => ({
  fetchCampaignSchedule: serviceMocks.fetchCampaignSchedule,
  fetchIntegrationStatus: serviceMocks.fetchIntegrationStatus,
  fetchSocialPost: serviceMocks.fetchSocialPost,
  scheduleSocialPost: serviceMocks.scheduleSocialPost,
  updateSocialPost: serviceMocks.updateSocialPost,
}))

function socialPostFixture(overrides: Partial<SocialPost> = {}): SocialPost {
  return {
    id: 'social-post-1',
    user_id: 'user-1',
    campaign_id: 'campaign-1',
    space_id: null,
    platform: 'instagram',
    post_type: 'single_image',
    caption: 'Launch caption for social post',
    headline: 'Launch headline',
    generated_tsx: null,
    image_url: 'https://example.com/social-post.jpg',
    image_asset_id: null,
    video_url: null,
    video_asset_id: null,
    carousel_slides: null,
    hashtags: ['launch'],
    cta_url: null,
    status: 'draft',
    scheduled_at: null,
    published_at: null,
    published_id: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function setupSupabaseChannel() {
  const channel = {
    on: supabaseMocks.on,
    subscribe: supabaseMocks.subscribe,
  }
  supabaseMocks.on.mockReturnValue(channel)
  supabaseMocks.subscribe.mockReturnValue(channel)
  supabaseMocks.channel.mockReturnValue(channel)
}

function expectNoRenderLoop(consoleErrorSpy: ReturnType<typeof vi.spyOn>) {
  const messages = consoleErrorSpy.mock.calls.map((args) => args.join(' '))
  expect(messages.join('\n')).not.toMatch(/Maximum update depth|Too many re-renders/i)
}

describe('SocialPostPreview', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    setupSupabaseChannel()
    serviceMocks.fetchSocialPost.mockResolvedValue(socialPostFixture())
    serviceMocks.fetchIntegrationStatus.mockResolvedValue({ connected: true })
    serviceMocks.fetchCampaignSchedule.mockResolvedValue([])
    serviceMocks.updateSocialPost.mockImplementation(
      async (_id: string, patch: Partial<SocialPost>) => socialPostFixture(patch),
    )
    serviceMocks.scheduleSocialPost.mockImplementation(async (_id: string, scheduledAt: string) =>
      socialPostFixture({ scheduled_at: scheduledAt, status: 'scheduled' }),
    )
    exportMocks.exportElementToPngBlob.mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
    supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    consoleErrorSpy.mockRestore()
  })

  it('keeps mounted load, toolbar, schedule dialog, and render stability behavior', async () => {
    render(
      <SocialPostPreview
        socialPostId="social-post-1"
        toolbarLeading={<span>Back to space</span>}
        fullscreenButton={<button type="button">Full screen</button>}
        closeChrome={<button type="button">Close panel</button>}
        renderPostMenu={() => <div>Mock post menu</div>}
      />,
    )

    await screen.findAllByText('Launch caption for social post')

    expect(serviceMocks.fetchSocialPost).toHaveBeenCalledWith('social-post-1')
    expect(serviceMocks.fetchIntegrationStatus).toHaveBeenCalledWith('instagram')
    expect(serviceMocks.fetchCampaignSchedule).toHaveBeenCalledWith('campaign-1')
    await waitFor(() => {
      expect(supabaseMocks.channel).toHaveBeenCalledWith('social-post-preview:social-post-1')
    })

    expect(screen.getByText('Back to space')).toBeTruthy()
    expect(screen.getByText('Full screen')).toBeTruthy()
    expect(screen.getByText('Close panel')).toBeTruthy()
    expect(screen.getByText('#launch')).toBeTruthy()
    expect(document.querySelector('img[src="https://example.com/social-post.jpg"]')).toBeTruthy()

    const uploadButton = document.querySelector('[data-tooltip="Upload media"]')
    expect(uploadButton).toBeTruthy()
    fireEvent.click(uploadButton!)
    expect(screen.getByText('Upload video')).toBeTruthy()
    expect(screen.getByText('Upload image')).toBeTruthy()
    expect(screen.getByText('Pick from library')).toBeTruthy()
    fireEvent.click(screen.getByText('Pick from library'))
    expect(screen.getByTestId('media-picker-modal')).toBeTruthy()

    const postOptionsButton = document.querySelector('[data-tooltip="Post options"]')
    expect(postOptionsButton).toBeTruthy()
    fireEvent.click(postOptionsButton!)
    expect(screen.getByText('Mock post menu')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Schedule/i }))

    expect(await screen.findByText('Schedule Post')).toBeTruthy()
    const scheduleDialog = screen.getByRole('dialog', { name: 'Schedule Post' })
    expect(scheduleDialog.getAttribute('aria-describedby')).toBe(
      within(scheduleDialog).getByText('Launch caption for social post').id,
    )
    expect(screen.getByRole('button', { name: 'Close schedule' })).toBeTruthy()
    expect(screen.getByText('Pick date & time')).toBeTruthy()
    expect(screen.getByText('Next available')).toBeTruthy()
    expect(screen.getByText('No posts scheduled')).toBeTruthy()
    expectNoRenderLoop(consoleErrorSpy)
  })

  it('exports generated social creative as PNG from the toolbar menu', async () => {
    serviceMocks.fetchSocialPost.mockResolvedValue(
      socialPostFixture({
        generated_tsx: 'function SocialCreative() { return <div /> }',
        image_url: null,
      }),
    )

    render(<SocialPostPreview socialPostId="social-post-1" />)

    await screen.findAllByText('Launch caption for social post')
    expect(screen.getByTestId('tsx-runner-output')).toBeTruthy()

    const downloadButton = document.querySelector('[data-tooltip="Download"]')
    expect(downloadButton).toBeTruthy()
    fireEvent.click(downloadButton!)
    fireEvent.click(screen.getByText('PNG'))

    await waitFor(() => {
      expect(exportMocks.exportElementToPngBlob).toHaveBeenCalledTimes(1)
    })
    expect(exportMocks.downloadBlob).toHaveBeenCalledWith(
      expect.any(Blob),
      'social-post-instagram.png',
    )
    expectNoRenderLoop(consoleErrorSpy)
  })

  it('renders the LinkedIn platform frame and keeps it stable', async () => {
    serviceMocks.fetchSocialPost.mockResolvedValue(
      socialPostFixture({
        platform: 'linkedin',
        hashtags: [],
      }),
    )

    render(<SocialPostPreview socialPostId="social-post-1" />)

    await screen.findByText('Your Brand')

    expect(serviceMocks.fetchIntegrationStatus).toHaveBeenCalledWith('linkedin')
    expect(screen.getByText('Just now')).toBeTruthy()
    expect(screen.getByText('Like')).toBeTruthy()
    expect(screen.getByText('Comment')).toBeTruthy()
    expect(screen.getByText('Repost')).toBeTruthy()
    expect(screen.getByText('Send')).toBeTruthy()
    expect(screen.getAllByText('Launch caption for social post').length).toBeGreaterThan(0)
    expectNoRenderLoop(consoleErrorSpy)
  })

  it('renders the no-visual upload placeholder and keeps it stable', async () => {
    serviceMocks.fetchSocialPost.mockResolvedValue(
      socialPostFixture({
        generated_tsx: null,
        image_url: null,
        video_url: null,
      }),
    )

    render(<SocialPostPreview socialPostId="social-post-1" />)

    await screen.findByText('No visual content yet')

    expect(screen.getByText('Upload video')).toBeTruthy()
    expect(screen.getByText('Upload image')).toBeTruthy()
    expect(screen.getByText('Media library')).toBeTruthy()
    expectNoRenderLoop(consoleErrorSpy)
  })

  it('schedules the social post from the schedule dialog and keeps it stable', async () => {
    render(<SocialPostPreview socialPostId="social-post-1" />)

    await screen.findAllByText('Launch caption for social post')

    fireEvent.click(screen.getByRole('button', { name: /Schedule/i }))
    expect(await screen.findByText('Schedule Post')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() => {
      expect(serviceMocks.scheduleSocialPost).toHaveBeenCalledTimes(1)
    })
    expect(serviceMocks.scheduleSocialPost).toHaveBeenCalledWith(
      'social-post-1',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    )
    expect(screen.queryByText('Schedule Post')).toBeNull()
    expectNoRenderLoop(consoleErrorSpy)
  })
})
