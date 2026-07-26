import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellWorkspace } from './ShellWorkspace'

const mocks = vi.hoisted(() => ({
  pathname: '/home',
  params: new Map<string, string>(),
  activeConversationId: null as string | null,
  replace: vi.fn(),
  push: vi.fn(),
  setCollapsed: vi.fn(),
  setActiveConversationId: vi.fn(),
  openConversationInSpaceChat: vi.fn(),
  setWorkAreaOpen: vi.fn(),
  workAreaOpen: true,
  chatDrawerOpen: false,
  artifactTarget: null as { id: string } | null,
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  useSearchParams: () => ({ get: (key: string) => mocks.params.get(key) ?? null }),
}))

vi.mock('@/components/global-chat/containers/GlobalChatPanel', () => ({
  GlobalChatPanel: ({ onCollapseChat }: { onCollapseChat?: () => void }) => (
    <div>
      Global chat panel
      {onCollapseChat ? (
        <button type="button" onClick={onCollapseChat}>
          Close full chat
        </button>
      ) : null}
    </div>
  ),
}))

vi.mock('@/components/global-chat/store/use-global-chat-store', () => ({
  useGlobalChatStore: (selector: (state: { setCollapsed: typeof mocks.setCollapsed }) => unknown) =>
    selector({ setCollapsed: mocks.setCollapsed }),
}))

vi.mock('@/features/spaces/store/use-spaces-store', () => ({
  useSpacesStore: (
    selector: (state: {
      openConversationInSpaceChat: typeof mocks.openConversationInSpaceChat
    }) => unknown,
  ) => selector({ openConversationInSpaceChat: mocks.openConversationInSpaceChat }),
}))

vi.mock('@/features/studio/store/use-chat-store', () => ({
  useChatStore: (
    selector: (state: {
      activeConversationId: string | null
      setActiveConversationId: typeof mocks.setActiveConversationId
    }) => unknown,
  ) =>
    selector({
      activeConversationId: mocks.activeConversationId,
      setActiveConversationId: mocks.setActiveConversationId,
    }),
}))

vi.mock('@/features/studio/components/preview/ShellArtifactViewerAdapter', () => ({
  ShellArtifactViewerAdapter: () => (
    <div data-testid="artifact-viewer-adapter">
      {mocks.artifactTarget ? 'Artifact editor' : null}
    </div>
  ),
}))

vi.mock('./ShellChatDrawer', () => ({
  ShellChatDrawer: ({ expanded }: { expanded?: boolean }) => (
    <div
      data-testid="shell-chat-drawer"
      data-shell-chat-drawer
      data-expanded={expanded ? 'true' : 'false'}
    >
      Chat history
      <div>Global chat panel</div>
    </div>
  ),
}))
vi.mock('./ShellNewChatGreeting', () => ({
  ShellNewChatGreeting: () => <div>New chat greeting</div>,
}))
vi.mock('./ShellRightPanel', () => ({ ShellRightPanel: () => null }))
vi.mock('./SpaceWorkDock', () => ({
  SpaceWorkDock: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('./use-shell-store', () => ({
  useShellStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      workAreaOpen: mocks.workAreaOpen,
      artifactViewer: { target: mocks.artifactTarget },
      chatDrawer: {
        open: !mocks.workAreaOpen || mocks.chatDrawerOpen,
        conversationId: null,
        width: 420,
      },
      openChatDrawer: vi.fn(),
      minimizeChatDrawer: vi.fn(),
      requestNewChat: vi.fn(),
      setMenuMode: vi.fn(),
      setWorkAreaOpen: mocks.setWorkAreaOpen,
    }),
}))

describe('ShellWorkspace', () => {
  beforeEach(() => {
    mocks.pathname = '/home'
    mocks.params = new Map([['chat', 'starting']])
    mocks.activeConversationId = null
    mocks.workAreaOpen = true
    mocks.chatDrawerOpen = false
    mocks.artifactTarget = null
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('mounts the chat panel while a Home conversation is starting', () => {
    render(<ShellWorkspace>Home dashboard</ShellWorkspace>)

    expect(screen.getByText('Global chat panel')).toBeInTheDocument()
    expect(screen.queryByText('New chat greeting')).not.toBeInTheDocument()
  })

  it('keeps the artifact event adapter mounted before an artifact is selected', () => {
    mocks.params = new Map()

    render(<ShellWorkspace>Home dashboard</ShellWorkspace>)

    expect(screen.getByTestId('artifact-viewer-adapter')).toBeInTheDocument()
    expect(screen.queryByText('Artifact editor')).not.toBeInTheDocument()
  })

  it('replaces the temporary starting route with the created conversation route', async () => {
    mocks.activeConversationId = 'conversation-123'

    render(<ShellWorkspace>Home dashboard</ShellWorkspace>)

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/home?conv=conversation-123')
    })
  })

  it('returns to Home when the full-page conversation is closed', () => {
    mocks.params = new Map([['conv', 'conversation-123']])

    render(<ShellWorkspace>Home dashboard</ShellWorkspace>)
    fireEvent.click(screen.getByRole('button', { name: 'Close full chat' }))

    expect(mocks.setActiveConversationId).toHaveBeenCalledWith(null)
    expect(mocks.push).toHaveBeenCalledWith('/home')
  })

  it('reveals the work area after navigating to another surface', async () => {
    mocks.pathname = '/spaces'
    mocks.params = new Map([['space', 'space-1']])

    const { rerender } = render(<ShellWorkspace>Space page</ShellWorkspace>)
    expect(mocks.setWorkAreaOpen).not.toHaveBeenCalled()

    mocks.params = new Map([['space', 'space-2']])
    rerender(<ShellWorkspace>Space page</ShellWorkspace>)

    await waitFor(() => {
      expect(mocks.setWorkAreaOpen).toHaveBeenCalledWith(true)
    })
  })

  it('keeps chat history and hides the page when the work area is collapsed', () => {
    mocks.pathname = '/brain'
    mocks.params = new Map()
    mocks.workAreaOpen = false
    mocks.chatDrawerOpen = true

    render(<ShellWorkspace>Brain page</ShellWorkspace>)

    const drawer = screen.getByTestId('shell-chat-drawer')
    expect(drawer).toHaveAttribute('data-expanded', 'true')
    expect(screen.getByText('Chat history')).toBeInTheDocument()
    expect(screen.getByText('Brain page').closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('uses one work-area transition while keeping the page right anchored', () => {
    const boundingRectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue(new DOMRect(0, 0, 800, 600))
    mocks.pathname = '/brain'
    mocks.params = new Map()
    mocks.workAreaOpen = false
    mocks.chatDrawerOpen = true

    const { rerender } = render(<ShellWorkspace>Brain page</ShellWorkspace>)
    const pageBody = screen
      .getByText('Brain page')
      .closest('[data-shell-work-area]')
      ?.querySelector('.shell-work-area-body')
    expect(pageBody).not.toBeNull()
    expect(screen.getByText('Brain page').closest('[data-shell-work-area]')).toHaveClass(
      'shell-work-area',
      'shell-work-area-collapsed',
    )
    expect(pageBody).toHaveClass('shell-work-area-body-anchored')

    mocks.workAreaOpen = true
    rerender(<ShellWorkspace>Brain page</ShellWorkspace>)

    expect(screen.getByText('Brain page').closest('[data-shell-work-area]')).toHaveClass(
      'shell-work-area',
    )
    expect(screen.getByText('Brain page').closest('[data-shell-work-area]')).not.toHaveClass(
      'shell-work-area-collapsed',
    )
    expect(pageBody).toHaveClass('shell-work-area-body-anchored')
    boundingRectSpy.mockRestore()
  })

  it('replaces the page work surface while an artifact is open', () => {
    mocks.pathname = '/home'
    mocks.params = new Map()
    mocks.artifactTarget = { id: 'image-1' }

    const { rerender } = render(<ShellWorkspace>Agenda dashboard</ShellWorkspace>)

    expect(screen.getByText('Artifact editor')).toBeInTheDocument()
    expect(screen.getByText('Agenda dashboard').closest('[data-shell-work-area]')).toHaveClass(
      'hidden',
    )
    expect(screen.getByText('Agenda dashboard').closest('[data-shell-work-area]')).not.toHaveClass(
      'shell-work-area',
    )

    mocks.artifactTarget = null
    rerender(<ShellWorkspace>Agenda dashboard</ShellWorkspace>)

    expect(screen.getByText('Agenda dashboard').closest('[data-shell-work-area]')).toHaveClass(
      'shell-work-area',
    )
    expect(screen.getByText('Agenda dashboard').closest('[data-shell-work-area]')).not.toHaveClass(
      'hidden',
    )
  })
})
