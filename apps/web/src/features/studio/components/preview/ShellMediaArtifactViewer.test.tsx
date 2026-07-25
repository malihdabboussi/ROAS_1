import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useShellStore } from '@/components/shell/use-shell-store'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import { ShellMediaArtifactViewer } from './ShellMediaArtifactViewer'

vi.mock('next/navigation', () => ({
  usePathname: () => '/spaces',
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/lib/services/media-api', () => ({
  getAsset: vi.fn().mockResolvedValue(null),
  listAssets: vi.fn().mockResolvedValue({ assets: [] }),
  fetchImageGenerationModels: vi.fn().mockResolvedValue({ models: [] }),
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

  it('keeps chat handoff available without attaching until requested', () => {
    render(<ShellMediaArtifactViewer target={target} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit in chat' }))

    expect(useGlobalChatStore.getState().pendingSeed).toMatchObject({
      railIntent: 'new',
      documents: [{ mediaAssetId: 'image-1' }],
      seedMode: 'attach',
    })
    expect(useGlobalChatStore.getState().pendingSeed?.conversationId).toBeUndefined()
    expect(useShellStore.getState().chatDrawer).toMatchObject({
      open: true,
      conversationId: null,
    })
  })
})
