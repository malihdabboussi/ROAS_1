import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useShellStore } from '@/components/shell/use-shell-store'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import { getAsset, listAssets, type MediaAsset } from '@/lib/services/media-api'
import { ShellMediaArtifactViewer } from './ShellMediaArtifactViewer'

vi.mock('next/navigation', () => ({
  usePathname: () => '/spaces',
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/lib/services/media-api', () => ({
  getAsset: vi.fn().mockResolvedValue(null),
  listAssets: vi.fn().mockResolvedValue({ assets: [] }),
  fetchImageGenerationModels: vi.fn().mockResolvedValue({ models: [] }),
  openMediaAssetInCanva: vi.fn(),
}))

const target: ShellArtifactViewerTarget = {
  id: 'image-1',
  title: 'Clock image',
  type: 'image',
  fileUrl: 'https://example.com/clock.png',
  fileName: 'clock.png',
  mediaAssetId: 'image-1',
  spaceId: 'space-1',
  campaignId: 'campaign-1',
  conversationId: 'conversation-old',
}

describe('ShellMediaArtifactViewer', () => {
  beforeEach(() => {
    vi.mocked(getAsset).mockRejectedValue(new Error('Asset not found'))
    vi.mocked(listAssets).mockResolvedValue({ assets: [], total: 0 })
    useGlobalChatStore.setState({ pendingSeed: null, railIntent: null })
    useShellStore.setState({
      artifactViewer: { target, width: 480 },
      chatDrawer: { open: false, conversationId: 'conversation-old', width: 420, minimized: false },
    })
  })

  afterEach(cleanup)

  it('does not attach an image to chat merely by opening the viewer', async () => {
    render(<ShellMediaArtifactViewer target={target} />)
    await waitFor(() => expect(screen.getByAltText('Clock image')).toBeTruthy())
    expect(useGlobalChatStore.getState().pendingSeed).toBeNull()
  })

  it('opens the source chat and attaches the current image only when requested', () => {
    render(<ShellMediaArtifactViewer target={target} />)

    fireEvent.click(screen.getByRole('button', { name: 'More image actions' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open in chat' }))

    expect(useGlobalChatStore.getState().pendingSeed).toMatchObject({
      documents: [{ mediaAssetId: 'image-1' }],
      seedMode: 'attach',
      conversationId: 'conversation-old',
    })
    expect(useShellStore.getState().chatDrawer).toMatchObject({
      open: true,
      conversationId: 'conversation-old',
    })
  })

  it('keeps aspect ratio controls in the top toolbar', () => {
    render(<ShellMediaArtifactViewer target={target} />)

    fireEvent.click(screen.getByRole('button', { name: 'Aspect ratio' }))
    expect(screen.getByText('Generate this image with a different aspect ratio')).toBeTruthy()
    expect(screen.getByText('16:9')).toBeTruthy()
  })

  it('renders a compact floating composer over the image canvas', () => {
    render(<ShellMediaArtifactViewer target={target} />)

    const composer = screen.getByRole('form', { name: 'Image edit composer' })
    expect(composer.parentElement?.parentElement?.className).toContain('absolute')
    expect(screen.getByPlaceholderText('Describe edits').getAttribute('rows')).toBe('1')
    expect(screen.getByRole('button', { name: 'Voice input' })).toBeTruthy()
    expect(screen.queryByText('History')).toBeNull()
  })

  it('keeps image history ordered while highlighting the selected version', async () => {
    const makeAsset = (id: string, name: string): MediaAsset => ({
      id,
      user_id: 'user-1',
      name,
      original_filename: `${id}.png`,
      file_path: `${id}.png`,
      bucket_name: 'media',
      file_size: 1,
      mime_type: 'image/png',
      width: 100,
      height: 100,
      asset_type: 'image',
      category: null,
      subcategory: null,
      campaign_id: 'campaign-1',
      space_id: 'space-1',
      conversation_id: 'conversation-old',
      tags: [],
      description: null,
      is_public: false,
      public_url: `https://example.com/${id}.png`,
      source: null,
      source_model: null,
      source_prompt: null,
      usage_count: 0,
      last_used_at: null,
      created_at: '2026-07-26T00:00:00.000Z',
      updated_at: '2026-07-26T00:00:00.000Z',
    })
    const assets = [
      makeAsset('image-a', 'First version'),
      makeAsset('image-b', 'Selected version'),
      makeAsset('image-c', 'Latest version'),
    ]
    vi.mocked(getAsset).mockImplementation(async (assetId) => {
      const asset = assets.find((entry) => entry.id === assetId)
      if (!asset) throw new Error('Asset not found')
      return asset
    })
    vi.mocked(listAssets).mockResolvedValue({ assets, total: assets.length })
    vi.mocked(listAssets).mockClear()

    const { rerender } = render(
      <ShellMediaArtifactViewer
        target={{
          ...target,
          mediaAssetId: 'image-b',
          conversationId: null,
          spaceId: null,
        }}
      />,
    )

    const history = await screen.findByRole('complementary', { name: 'Media history' })
    await waitFor(() =>
      expect(
        within(history)
          .getAllByRole('button')
          .map((button) => button.ariaLabel),
      ).toEqual(['Open First version', 'Open Selected version', 'Open Latest version']),
    )
    expect(
      within(history).getByRole('button', { name: 'Open Selected version' }).className,
    ).toContain('ring-2')
    expect(listAssets).toHaveBeenCalledWith({
      conversation_id: 'conversation-old',
      limit: 40,
    })
    expect(within(history).getByRole('button', { name: 'Open First version' }).className).toContain(
      'opacity-50',
    )

    fireEvent.click(within(history).getByRole('button', { name: 'Open Latest version' }))
    rerender(<ShellMediaArtifactViewer target={useShellStore.getState().artifactViewer.target!} />)
    await waitFor(() =>
      expect(
        within(history).getByRole('button', { name: 'Open Latest version' }).className,
      ).toContain('ring-2'),
    )
    expect(listAssets).toHaveBeenCalledTimes(1)
    expect(within(history).getAllByRole('button')).toHaveLength(3)
  })

  it('renders a video player after resolving a video media asset', async () => {
    const videoAsset: MediaAsset = {
      id: 'video-1',
      user_id: 'user-1',
      name: 'Story ad',
      original_filename: 'story.mp4',
      file_path: 'story.mp4',
      bucket_name: 'media',
      file_size: 1,
      mime_type: 'video/mp4',
      width: 1080,
      height: 1920,
      asset_type: 'video',
      category: null,
      subcategory: null,
      campaign_id: null,
      space_id: 'space-1',
      conversation_id: 'conversation-old',
      tags: [],
      description: null,
      is_public: false,
      public_url: 'https://example.com/story.mp4',
      source: null,
      source_model: null,
      source_prompt: null,
      usage_count: 0,
      last_used_at: null,
      created_at: '2026-07-26T00:00:00.000Z',
      updated_at: '2026-07-26T00:00:00.000Z',
    }
    vi.mocked(getAsset).mockResolvedValue(videoAsset)
    vi.mocked(listAssets).mockResolvedValue({ assets: [videoAsset], total: 1 })

    render(
      <ShellMediaArtifactViewer
        target={{
          id: 'video-1',
          title: 'Processed media',
          type: 'image',
          mediaAssetId: 'video-1',
          conversationId: 'conversation-old',
        }}
      />,
    )

    await waitFor(() => {
      const video = document.querySelector('video')
      expect(video?.getAttribute('src')).toBe('https://example.com/story.mp4')
    })
    expect(screen.queryByAltText('Processed media')).toBeNull()
    expect(screen.getByRole('complementary', { name: 'Media history' })).toBeTruthy()
  })
})
