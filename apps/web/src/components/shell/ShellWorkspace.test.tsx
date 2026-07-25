import { cleanup, render, screen, waitFor } from '@testing-library/react'
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
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  useSearchParams: () => ({ get: (key: string) => mocks.params.get(key) ?? null }),
}))

vi.mock('@/components/global-chat/containers/GlobalChatPanel', () => ({
  GlobalChatPanel: () => <div>Global chat panel</div>,
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
  ShellArtifactViewerAdapter: () => null,
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
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('mounts the chat panel while a Home conversation is starting', () => {
    render(<ShellWorkspace>Home dashboard</ShellWorkspace>)

    expect(screen.getByText('Global chat panel')).toBeInTheDocument()
    expect(screen.queryByText('New chat greeting')).not.toBeInTheDocument()
  })

  it('replaces the temporary starting route with the created conversation route', async () => {
    mocks.activeConversationId = 'conversation-123'

    render(<ShellWorkspace>Home dashboard</ShellWorkspace>)

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/home?conv=conversation-123')
    })
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

  it('slides the work area in from beyond the right edge when reopening', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 800, 600),
    )
    mocks.pathname = '/brain'
    mocks.params = new Map()
    mocks.workAreaOpen = false
    mocks.chatDrawerOpen = true

    const { rerender } = render(<ShellWorkspace>Brain page</ShellWorkspace>)
    const pageBody = screen
      .getByText('Brain page')
      .closest('.shell-work-area')
      ?.querySelector('.shell-work-area-body')
    expect(pageBody).not.toBeNull()
    expect(pageBody).toHaveClass('shell-work-area-body-collapsed')

    mocks.workAreaOpen = true
    rerender(<ShellWorkspace>Brain page</ShellWorkspace>)

    expect(pageBody).toHaveClass('shell-work-area-body-anchored')
    expect(pageBody).not.toHaveClass('shell-work-area-body-collapsed')
  })
})
