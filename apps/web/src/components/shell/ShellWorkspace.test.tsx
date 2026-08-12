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
  setRightPanelOpen: vi.fn(),
  recentWorkAreaPages: [{ id: '/home/meetings', title: 'Meetings', href: '/home/meetings' }],
  workAreaOpen: true,
  chatDrawerOpen: false,
  artifactTarget: null as { id: string } | null,
  desktop: false,
  shellPrefsHydrated: false,
  menuDock: 'left' as 'left' | 'work' | 'work-top' | 'work-bottom' | 'work-right',
  menuStyle: 'advanced' as 'simple' | 'advanced',
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  useSearchParams: () => ({ get: (key: string) => mocks.params.get(key) ?? null }),
}))

vi.mock('@/lib/hooks/use-media-query', () => ({
  useMediaQuery: () => mocks.desktop,
}))

vi.mock('./use-shell-prefs-hydrated', () => ({
  useShellPrefsHydrated: () => mocks.shellPrefsHydrated,
}))

vi.mock('./use-shell-menu-dock', async () => {
  const actual =
    await vi.importActual<typeof import('./use-shell-menu-dock')>('./use-shell-menu-dock')
  return {
    ...actual,
    useShellMenuDock: (selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        dock: mocks.menuDock,
        menuStyle: mocks.menuStyle,
        setWorkCardHostAvailable: vi.fn(),
        setWorkCollapsedHostAvailable: vi.fn(),
      }),
  }
})

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
  useChatStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        activeConversationId: mocks.activeConversationId,
        setActiveConversationId: mocks.setActiveConversationId,
      }),
    { getState: () => ({ activeConversationId: mocks.activeConversationId }) },
  ),
}))

vi.mock('@/features/studio/components/preview/ShellArtifactViewerAdapter', () => ({
  ShellArtifactViewerAdapter: () => (
    <div data-testid="artifact-viewer-adapter">
      {mocks.artifactTarget ? 'Artifact editor' : null}
    </div>
  ),
}))

vi.mock('./ShellChatDrawer', () => ({
  ShellChatDrawer: ({ expanded, mobile }: { expanded?: boolean; mobile?: boolean }) => (
    <div
      data-testid="shell-chat-drawer"
      data-shell-chat-drawer
      data-expanded={expanded ? 'true' : 'false'}
      data-mobile={mobile ? 'true' : 'false'}
    >
      Chat history
      <div>Global chat panel</div>
    </div>
  ),
}))
vi.mock('./ShellNewChatGreeting', () => ({
  ShellNewChatGreeting: () => <div>New chat greeting</div>,
}))
vi.mock('./PageGraderPortalSurface', () => ({
  PageGraderPortalSurface: ({ active }: { active: boolean }) => (
    <div data-testid="portal-surface" data-active={active ? 'true' : 'false'} />
  ),
}))
vi.mock('./ShellSidebarSlot', () => ({
  ShellSidebarSlot: () => <nav data-testid="workspace-menu">Workspace menu</nav>,
}))
vi.mock('./ShellTopBar', () => ({ ShellTopBar: () => <header>Work card header</header> }))
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
      setRightPanelOpen: mocks.setRightPanelOpen,
      recentWorkAreaPages: mocks.recentWorkAreaPages,
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
    mocks.desktop = false
    mocks.shellPrefsHydrated = false
    mocks.menuDock = 'left'
    mocks.menuStyle = 'advanced'
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
  it('keeps the full Home chat visible when a previous page left the work area collapsed', () => {
    mocks.workAreaOpen = false
    render(<ShellWorkspace>Home dashboard</ShellWorkspace>)
    expect(screen.getByText('Global chat panel').closest('[data-shell-work-area]')).toHaveAttribute(
      'aria-hidden',
      'false',
    )
  })
  it('keeps a top-right page restore control visible in a full Home conversation', () => {
    mocks.desktop = true
    mocks.params = new Map([['conv', 'conversation-1']])
    render(<ShellWorkspace>Home dashboard</ShellWorkspace>)
    fireEvent.click(screen.getByRole('button', { name: 'Show page' }))
    expect(mocks.setWorkAreaOpen).toHaveBeenCalledWith(true)
    expect(mocks.push).toHaveBeenCalledWith('/home/meetings?conv=conversation-1')
  })
  it('renders nested Home tools as page workspaces instead of the New chat surface', () => {
    mocks.pathname = '/home/inbox'
    mocks.params = new Map()
    render(<ShellWorkspace>Inbox workspace</ShellWorkspace>)
    expect(screen.getByText('Inbox workspace')).toBeInTheDocument()
    expect(screen.queryByText('New chat greeting')).not.toBeInTheDocument()
    expect(screen.getByTestId('shell-chat-drawer')).toBeInTheDocument()
  })
  it('keeps the artifact event adapter mounted before an artifact is selected', () => {
    mocks.params = new Map()
    render(<ShellWorkspace>Home dashboard</ShellWorkspace>)
    expect(screen.getByTestId('artifact-viewer-adapter')).toBeInTheDocument()
    expect(screen.queryByText('Artifact editor')).not.toBeInTheDocument()
  })
  it('constrains page children so their internal scroll regions can scroll', () => {
    mocks.pathname = '/inbox'
    mocks.params = new Map()
    render(<ShellWorkspace>Scrollable page</ShellWorkspace>)
    expect(screen.getByText('Scrollable page').closest('.h-full.min-h-0')).toHaveClass(
      'flex',
      'h-full',
      'min-h-0',
      'flex-col',
      'overflow-x-hidden',
      'overflow-y-auto',
    )
  })
  it('hosts the Simple breadcrumb header inside the right work card', () => {
    mocks.pathname = '/inbox'
    mocks.params = new Map()
    mocks.menuStyle = 'simple'
    render(<ShellWorkspace>Right card page</ShellWorkspace>)
    const header = screen.getByText('Work card header')
    expect(header.closest('[data-shell-work-area]')).toBeInTheDocument()
    expect(header.parentElement).toContainElement(screen.getByText('Right card page'))
  })
  it('activates the embedded Portal from the surface query parameter', () => {
    mocks.params = new Map([['surface', 'portal']])
    render(<ShellWorkspace>Home dashboard</ShellWorkspace>)
    expect(screen.getByTestId('portal-surface')).toHaveAttribute('data-active', 'true')
    expect(screen.getByText('New chat greeting').closest('.hidden')).not.toBeNull()
  })
  it('does not host the workspace menu on the Portal surface', () => {
    mocks.params = new Map([['surface', 'portal']])
    mocks.desktop = true
    mocks.shellPrefsHydrated = true
    mocks.menuDock = 'work'
    render(<ShellWorkspace>Home dashboard</ShellWorkspace>)
    expect(screen.queryByTestId('workspace-menu')).toBeNull()
    expect(screen.getByTestId('portal-surface').parentElement).toHaveClass(
      'shell-work-area-body-main',
    )
  })
  it('replaces the temporary starting route with the created conversation route', async () => {
    mocks.activeConversationId = 'conversation-123'
    render(<ShellWorkspace>Home dashboard</ShellWorkspace>)
    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/home?conv=conversation-123')
    })
  })
  it('does not restore the previous conversation while a new Home chat is starting', async () => {
    mocks.params = new Map([['chat', 'new']])
    mocks.activeConversationId = 'previous-conversation'
    const { rerender } = render(<ShellWorkspace>Home dashboard</ShellWorkspace>)
    mocks.params = new Map([['chat', 'starting']])
    rerender(<ShellWorkspace>Home dashboard</ShellWorkspace>)
    expect(mocks.replace).not.toHaveBeenCalled()
    mocks.activeConversationId = 'new-conversation'
    rerender(<ShellWorkspace>Home dashboard</ShellWorkspace>)
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/home?conv=new-conversation'))
  })
  it('does not expose a close control on a full-page conversation', () => {
    mocks.params = new Map([['conv', 'conversation-123']])
    render(<ShellWorkspace>Home dashboard</ShellWorkspace>)
    expect(screen.queryByRole('button', { name: 'Close full chat' })).toBeNull()
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
  it('shows only the chat surface when the drawer is open on mobile', () => {
    mocks.pathname = '/brain'
    mocks.params = new Map()
    mocks.chatDrawerOpen = true
    render(<ShellWorkspace>Brain page</ShellWorkspace>)
    expect(screen.getByTestId('shell-chat-drawer')).toHaveAttribute('data-expanded', 'true')
    expect(screen.getByTestId('shell-chat-drawer')).toHaveAttribute('data-mobile', 'true')
    expect(screen.getByText('Brain page').closest('[data-shell-work-area]')).toHaveClass('hidden')
  })
  it('gives the mobile working card priority over an open chat drawer', () => {
    mocks.pathname = '/inbox'
    mocks.params = new Map()
    mocks.chatDrawerOpen = true
    mocks.artifactTarget = { id: 'image-1' }
    render(<ShellWorkspace>Agenda dashboard</ShellWorkspace>)
    expect(screen.queryByTestId('shell-chat-drawer')).toBeNull()
    expect(screen.getByText('Artifact editor')).toBeInTheDocument()
    expect(screen.getByText('Agenda dashboard').closest('[data-shell-work-area]')).toHaveClass(
      'hidden',
    )
  })
  it('slides the page surface in from the right without animating the layout track', async () => {
    mocks.pathname = '/brain'
    mocks.params = new Map()
    mocks.workAreaOpen = false
    mocks.chatDrawerOpen = true
    mocks.desktop = true
    const { rerender } = render(<ShellWorkspace>Brain page</ShellWorkspace>)
    const workArea = screen.getByText('Brain page').closest('[data-shell-work-area]')
    const pageBody = workArea?.querySelector('.shell-work-area-body')
    expect(workArea).toHaveClass('shell-work-area', 'shell-work-area-collapsed')
    expect(pageBody).toHaveClass('shell-work-area-body', 'shell-work-area-body-offscreen-right')
    mocks.workAreaOpen = true
    rerender(<ShellWorkspace>Brain page</ShellWorkspace>)
    expect(workArea).not.toHaveClass('shell-work-area-collapsed')
    await waitFor(() => {
      expect(pageBody).toHaveClass('shell-work-area-body-visible')
    })
    expect(pageBody).not.toHaveClass('shell-work-area-body-offscreen-left')
  })
  it('replaces the page work surface while an artifact is open', () => {
    mocks.pathname = '/inbox'
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
  it('keeps a full Home conversation beside an artifact viewer', () => {
    mocks.params = new Map([['conv', 'conversation-123']])
    mocks.artifactTarget = { id: 'image-1' }
    mocks.desktop = true
    render(<ShellWorkspace>Home dashboard</ShellWorkspace>)
    expect(screen.getByText('Global chat panel')).toBeInTheDocument()
    expect(screen.getByText('Global chat panel').closest('[data-shell-work-area]')).not.toHaveClass(
      'hidden',
    )
    expect(screen.getByText('Artifact editor').parentElement).toHaveClass('md:max-w-xl', 'shrink-0')
  })
  it('restores the conversation summary after its artifact viewer closes', async () => {
    mocks.params = new Map([['conv', 'conversation-123']])
    mocks.artifactTarget = { id: 'image-1' }
    mocks.desktop = true

    const { rerender } = render(<ShellWorkspace>Home dashboard</ShellWorkspace>)
    mocks.artifactTarget = null
    rerender(<ShellWorkspace>Home dashboard</ShellWorkspace>)
    await waitFor(() => {
      expect(mocks.setRightPanelOpen).toHaveBeenCalledWith(true)
    })
  })
  it('shows a bottom expand arrow on the collapsed work-attached rail that restores the work card', () => {
    mocks.pathname = '/brain'
    mocks.params = new Map()
    mocks.workAreaOpen = false
    mocks.desktop = true
    mocks.shellPrefsHydrated = true
    mocks.menuDock = 'work-right'
    render(<ShellWorkspace>Brain page</ShellWorkspace>)
    const expandButton = screen.getByRole('button', { name: 'Show page' })
    fireEvent.click(expandButton)
    expect(mocks.setWorkAreaOpen).toHaveBeenCalledWith(true)
  })
  it('keeps a page restore control when the collapsed menu dock is not work-attached', () => {
    mocks.pathname = '/brain'
    mocks.params = new Map()
    mocks.workAreaOpen = false
    mocks.desktop = true
    mocks.shellPrefsHydrated = true
    mocks.menuDock = 'left'
    render(<ShellWorkspace>Brain page</ShellWorkspace>)
    fireEvent.click(screen.getByRole('button', { name: 'Show page' }))
    expect(mocks.setWorkAreaOpen).toHaveBeenCalledWith(true)
  })
})
