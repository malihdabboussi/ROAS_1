import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useShellStore } from '@/components/shell/use-shell-store'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import { editImageStream, getAsset, listAssets, type MediaAsset } from '@/lib/services/media-api'
import { ShellMediaArtifactViewer } from './ShellMediaArtifactViewer'

vi.mock('next/navigation', () => ({
  usePathname: () => '/spaces',
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/lib/services/media-api', () => ({
  getAsset: vi.fn().mockResolvedValue(null),
  listAssets: vi.fn().mockResolvedValue({ assets: [] }),
  fetchImageGenerationModels: vi.fn().mockResolvedValue({ models: [] }),
  editImageStream: vi.fn().mockResolvedValue(null),
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

  it('attaches the current image to the existing chat without closing the viewer', () => {
    render(<ShellMediaArtifactViewer target={target} />)

    fireEvent.click(screen.getByRole('button', { name: 'Add image to chat' }))

    expect(useGlobalChatStore.getState().pendingSeed).toMatchObject({
      documents: [{ mediaAssetId: 'image-1' }],
      seedMode: 'attach',
    })
    expect(useGlobalChatStore.getState().pendingSeed?.conversationId).toBeUndefined()
    expect(useShellStore.getState().artifactViewer.target).toEqual(target)
    expect(screen.queryByRole('button', { name: 'Open in chat' })).toBeNull()
  })

  it('keeps aspect ratio controls in the top toolbar', () => {
    render(<ShellMediaArtifactViewer target={target} />)

    fireEvent.click(screen.getByRole('button', { name: 'Aspect ratio' }))
    expect(screen.getByText('Generate this image with a different aspect ratio')).toBeTruthy()
    expect(screen.getByText('16:9')).toBeTruthy()
  })

  it('opens image markup controls from the top toolbar', () => {
    render(<ShellMediaArtifactViewer target={target} />)

    fireEvent.click(screen.getByRole('button', { name: 'Markup' }))

    expect(screen.getByRole('application', { name: 'Image markup canvas' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pen tool' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pin tool' })).toBeTruthy()
  })

  it('routes completed markup feedback through the saved image edit flow', async () => {
    render(<ShellMediaArtifactViewer target={target} />)
    fireEvent.click(screen.getByRole('button', { name: 'Markup' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pin tool' }))

    const canvas = screen.getByRole('application', { name: 'Image markup canvas' })
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      toJSON: () => ({}),
    })
    fireEvent(canvas, new MouseEvent('pointerdown', { bubbles: true, clientX: 25, clientY: 40 }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Feedback for annotation 1' }), {
      target: { value: 'Remove this icon' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save mark 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate with marked edits' }))

    await waitFor(() =>
      expect(editImageStream).toHaveBeenCalledWith(
        expect.objectContaining({
          parent_image_asset_id: 'image-1',
          prompt: expect.stringContaining(
            'Pin at 25% from the left and 40% from the top: Remove this icon.',
          ),
        }),
        expect.any(Object),
        expect.any(AbortSignal),
      ),
    )
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

  it('keeps a newly resolved edit in history after selecting an older version', async () => {
    const makeAsset = (id: string, name: string): MediaAsset => ({
      id,
      user_id: 'user-1',
      name,
      original_filename: `${id}.png`,
      file_path: `${id}.png`,
      bucket_name: 'media',
      file_size: 1,
      mime_type: 'image/png',
      width: 1080,
      height: 1350,
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
      created_at: '2026-07-29T00:00:00.000Z',
      updated_at: '2026-07-29T00:00:00.000Z',
    })
    const original = makeAsset('image-original', 'Original')
    const edited = makeAsset('image-edited', 'Original — Edit')
    vi.mocked(listAssets).mockResolvedValue({ assets: [original], total: 1 })
    vi.mocked(getAsset).mockImplementation(async (assetId) => {
      if (assetId === original.id) return original
      if (assetId === edited.id) return edited
      throw new Error('Asset not found')
    })

    const { rerender } = render(
      <ShellMediaArtifactViewer target={{ ...target, id: edited.id, mediaAssetId: edited.id }} />,
    )
    const history = await screen.findByRole('complementary', { name: 'Media history' })
    await waitFor(() =>
      expect(within(history).getByRole('button', { name: 'Open Original — Edit' })).toBeTruthy(),
    )

    fireEvent.click(within(history).getByRole('button', { name: 'Open Original' }))
    rerender(<ShellMediaArtifactViewer target={useShellStore.getState().artifactViewer.target!} />)

    await waitFor(() =>
      expect(within(history).getByRole('button', { name: 'Open Original' }).className).toContain(
        'ring-2',
      ),
    )
    expect(within(history).getByRole('button', { name: 'Open Original — Edit' })).toBeTruthy()
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
