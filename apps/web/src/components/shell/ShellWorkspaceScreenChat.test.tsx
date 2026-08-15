import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellWorkspace } from './ShellWorkspace'

const mocks = vi.hoisted(() => ({
  pathname: '/home/inbox',
  params: new Map<string, string>(),
  chatDrawerConversationId: null as string | null,
  handleScreenNavigation: vi.fn(),
  recordScreenConversation: vi.fn(),
  setWorkAreaOpen: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({ get: (key: string) => mocks.params.get(key) ?? null }),
}))

vi.mock('@/lib/hooks/use-media-query', () => ({
  useMediaQuery: () => false,
}))

vi.mock('./use-shell-prefs-hydrated', () => ({
  useShellPrefsHydrated: () => false,
}))

vi.mock('./use-shell-menu-dock', async () => {
  const actual =
    await vi.importActual<typeof import('./use-shell-menu-dock')>('./use-shell-menu-dock')
  return {
    ...actual,
    useShellMenuDock: (selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        dock: 'left',
        menuStyle: 'advanced',
        setWorkCardHostAvailable: vi.fn(),
        setWorkCollapsedHostAvailable: vi.fn(),
      }),
  }
})

vi.mock('@/components/global-chat/containers/GlobalChatPanel', () => ({
  GlobalChatPanel: () => <div>Global chat panel</div>,
}))

vi.mock('@/components/global-chat/store/use-global-chat-store', () => ({
  useGlobalChatStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ setCollapsed: vi.fn() }),
}))

vi.mock('@/features/spaces/store/use-spaces-store', () => ({
  useSpacesStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ openConversationInSpaceChat: vi.fn() }),
}))

vi.mock('@/features/studio/store/use-chat-store', () => ({
  useChatStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) =>
      selector({ activeConversationId: null, setActiveConversationId: vi.fn() }),
    { getState: () => ({ activeConversationId: null }) },
  ),
}))

vi.mock('@/features/studio/components/preview/ShellArtifactViewerAdapter', () => ({
  ShellArtifactViewerAdapter: () => <div />,
}))

vi.mock('./ShellChatDrawer', () => ({
  ShellChatDrawer: () => <div data-testid="shell-chat-drawer" />,
}))
vi.mock('./ShellNewChatGreeting', () => ({
  ShellNewChatGreeting: () => <div>New chat greeting</div>,
}))
vi.mock('./ShellSidebarSlot', () => ({
  ShellSidebarSlot: () => <nav>Workspace menu</nav>,
}))
vi.mock('./ShellTopBar', () => ({ ShellTopBar: () => <header>Work card header</header> }))
vi.mock('./SpaceWorkDock', () => ({
  SpaceWorkDock: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('./use-shell-store', () => ({
  useShellStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      workAreaOpen: true,
      artifactViewer: { target: null },
      chatDrawer: {
        open: true,
        conversationId: mocks.chatDrawerConversationId,
        width: 420,
      },
      openChatDrawer: vi.fn(),
      minimizeChatDrawer: vi.fn(),
      handleScreenNavigation: mocks.handleScreenNavigation,
      recordScreenConversation: mocks.recordScreenConversation,
      requestNewChat: vi.fn(),
      setWorkAreaOpen: mocks.setWorkAreaOpen,
      setRightPanelOpen: vi.fn(),
      rightPanel: { open: false },
      recentWorkAreaPages: [],
    }),
}))

describe('ShellWorkspace screen-scoped chat navigation', () => {
  beforeEach(() => {
    mocks.pathname = '/home/inbox'
    mocks.params = new Map()
    mocks.chatDrawerConversationId = null
  })
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('routes navigation between sidebar screens through the screen-chat contract', async () => {
    const { rerender } = render(<ShellWorkspace>Inbox workspace</ShellWorkspace>)
    expect(mocks.handleScreenNavigation).not.toHaveBeenCalled()

    mocks.pathname = '/home/meetings'
    rerender(<ShellWorkspace>Meetings workspace</ShellWorkspace>)

    await waitFor(() => {
      expect(mocks.handleScreenNavigation).toHaveBeenCalledWith({
        key: 'home:meetings',
        label: 'Meetings',
      })
    })
  })

  it('passes an unscoped screen for routes that own their chat scope', async () => {
    const { rerender } = render(<ShellWorkspace>Inbox workspace</ShellWorkspace>)
    mocks.pathname = '/spaces/space-1'
    rerender(<ShellWorkspace>Space page</ShellWorkspace>)

    await waitFor(() => {
      expect(mocks.handleScreenNavigation).toHaveBeenCalledWith(null)
    })
  })

  it('stamps a newly opened conversation onto the current screen, not onto later screens', async () => {
    const { rerender } = render(<ShellWorkspace>Inbox workspace</ShellWorkspace>)

    mocks.chatDrawerConversationId = 'conv-1'
    rerender(<ShellWorkspace>Inbox workspace</ShellWorkspace>)
    await waitFor(() => {
      expect(mocks.recordScreenConversation).toHaveBeenCalledWith('home:inbox', 'conv-1')
    })

    mocks.recordScreenConversation.mockClear()
    mocks.pathname = '/home/meetings'
    rerender(<ShellWorkspace>Meetings workspace</ShellWorkspace>)
    await waitFor(() => {
      expect(mocks.handleScreenNavigation).toHaveBeenCalled()
    })
    expect(mocks.recordScreenConversation).not.toHaveBeenCalled()
  })
})
