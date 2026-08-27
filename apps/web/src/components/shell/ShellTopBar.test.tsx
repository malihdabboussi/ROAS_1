import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellTopBar } from './ShellTopBar'
import { useShellMenuDock } from './use-shell-menu-dock'

const mocks = vi.hoisted(() => ({
  pathname: '/home',
  params: new URLSearchParams(),
  push: vi.fn(),
  replace: vi.fn(),
  shellState: {
    sidebarPinned: false,
    sidebarPeek: false,
    toggleSidebarPinned: vi.fn(),
    setSidebarPinned: vi.fn(),
    holdSidebarPeek: vi.fn(),
    scheduleSidebarPeekClose: vi.fn(),
    requestNewChat: vi.fn(),
    openFreshChatDrawer: vi.fn(),
    restoreChatDrawer: vi.fn(),
    minimizeChatDrawer: vi.fn(),
    openChatDrawer: vi.fn(),
    chatDrawer: { open: false },
    toggleRightPanel: vi.fn(),
    openRightPanelSurface: vi.fn(),
    rightPanel: { open: false, tab: 'tasks' as const },
    workAreaOpen: true,
    setWorkAreaOpen: vi.fn(),
    toggleWorkAreaOpen: vi.fn(),
    artifactViewer: { target: null as { id: string } | null },
    closeArtifactViewer: vi.fn(),
    recentArtifactTargets: [],
    recentWorkAreaPages: [],
    recordWorkAreaPage: vi.fn(),
    setMenuMode: vi.fn(),
    pageBreadcrumb: null as ReactNode | null,
    pageBreadcrumbLabel: null as string | null,
    pageHeaderAction: null as ReactNode | null,
  },
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({
    back: vi.fn(),
    forward: vi.fn(),
    push: mocks.push,
    replace: mocks.replace,
  }),
  useSearchParams: () => mocks.params,
}))

vi.mock('@/features/spaces/store/use-spaces-store', () => ({
  useSpacesStore: (selector: (state: { spaces: never[]; activeSpaceId: null }) => unknown) =>
    selector({ spaces: [], activeSpaceId: null }),
}))

vi.mock('@/features/studio/store/use-chat-store', () => ({
  useChatStore: (
    selector: (state: { activeConversationId: null; conversations: never[] }) => unknown,
  ) => selector({ activeConversationId: null, conversations: [] }),
}))

vi.mock('./ShellOpenInProvider', () => ({
  useShellOpenIn: () => ({ targets: [] }),
}))

vi.mock('./ShellOpenInMenu', () => ({
  ShellOpenInMenu: () => null,
}))

vi.mock('./ShellWorkAreaControl', () => ({
  ShellWorkAreaControl: ({ currentPage }: { currentPage: { title: string } }) => (
    <button
      type="button"
      data-page-title={currentPage.title}
      title={mocks.shellState.workAreaOpen ? 'Close page' : 'Show page'}
      onClick={mocks.shellState.toggleWorkAreaOpen}
    />
  ),
}))

vi.mock('./use-shell-prefs-hydrated', () => ({
  useShellPrefsHydrated: () => true,
}))

vi.mock('./use-shell-store', () => ({
  shellSidebarExpanded: (state: { sidebarPinned: boolean; sidebarPeek: boolean }) =>
    state.sidebarPinned || state.sidebarPeek,
  useShellStore: (selector: (state: typeof mocks.shellState) => unknown) =>
    selector(mocks.shellState),
}))

describe('ShellTopBar', () => {
  beforeEach(() => {
    useShellMenuDock.setState({ menuStyle: 'advanced' })
    mocks.pathname = '/home'
    mocks.params = new URLSearchParams()
    mocks.shellState.sidebarPinned = false
    mocks.shellState.pageBreadcrumb = null
    mocks.shellState.pageBreadcrumbLabel = null
    mocks.shellState.pageHeaderAction = null
    mocks.shellState.chatDrawer = { open: false }
    mocks.shellState.workAreaOpen = true
    mocks.shellState.artifactViewer = { target: null }
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('keeps Search centered with AI Chats on the top-left panel control', () => {
    render(<ShellTopBar />)

    expect(screen.getByTitle('Search')).toBeInTheDocument()
    expect(screen.queryAllByTitle('Search')).toHaveLength(1)
    expect(screen.queryByTitle('New chat')).not.toBeInTheDocument()
    const aiChatButton = screen.getByLabelText('Open AI Chats')
    expect(aiChatButton).toBeInTheDocument()
    expect(aiChatButton.querySelector('.lucide-panel-left-open')).toBeInTheDocument()
    expect(screen.getByText('AI Chat')).toBeInTheDocument()
    expect(screen.getByText('AI Chat')).toHaveClass('shell-topbar-ai-label')
  })

  it('keeps the breadcrumb and persistent work controls in the global bar for Simple mode', () => {
    useShellMenuDock.setState({ menuStyle: 'simple' })

    render(<ShellTopBar />)

    expect(screen.queryByText('Agenda')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Search')).not.toBeInTheDocument()
    expect(screen.queryByText('AI Chat')).not.toBeInTheDocument()
    expect(screen.getByTitle('Close page')).toBeInTheDocument()
  })

  it('keeps the Simple work-area control on the page header while the page is open beside chat', () => {
    useShellMenuDock.setState({ menuStyle: 'simple' })
    mocks.shellState.chatDrawer = { open: true }
    mocks.shellState.workAreaOpen = true

    render(<ShellTopBar />)

    expect(screen.getByTitle('Close page')).toBeInTheDocument()
  })

  it('hides the Simple work-area control while the page is collapsed so the chat header owns Show page', () => {
    useShellMenuDock.setState({ menuStyle: 'simple' })
    mocks.shellState.chatDrawer = { open: true }
    mocks.shellState.workAreaOpen = false

    render(<ShellTopBar />)

    expect(screen.queryByTitle('Close page')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Show page')).not.toBeInTheDocument()
  })

  it('hides the work-area control until chat creates something to collapse', () => {
    for (const route of ['/home', '/brain', '/campaigns', '/projects', '/flows', '/artifacts']) {
      mocks.pathname = route
      render(<ShellTopBar />)

      expect(screen.queryByTitle('Close page')).not.toBeInTheDocument()
      cleanup()
    }

    expect(mocks.shellState.toggleWorkAreaOpen).not.toHaveBeenCalled()
  })

  it('offers the work-area collapse while AI Chat is open', () => {
    mocks.shellState.chatDrawer = { open: true }

    render(<ShellTopBar />)
    expect(screen.getByTitle('Close page')).toHaveAttribute('data-page-title', 'Home')
    fireEvent.click(screen.getByTitle('Close page'))

    expect(mocks.shellState.toggleWorkAreaOpen).toHaveBeenCalledTimes(1)
  })

  it('does not render a second pane toggle just because an artifact viewer is open', () => {
    mocks.shellState.artifactViewer = { target: { id: 'artifact-1' } }

    render(<ShellTopBar />)

    expect(screen.queryByTitle('Close page')).not.toBeInTheDocument()
  })

  it('offers the reverse control once the work area is collapsed', () => {
    mocks.pathname = '/team/skills'
    mocks.shellState.workAreaOpen = false

    render(<ShellTopBar />)

    expect(screen.getByTitle('Show page')).toHaveAttribute('data-page-title', 'Skills')
  })

  it('expands and collapses AI Chats from the top-bar panel control', () => {
    mocks.shellState.chatDrawer = { open: false }

    render(<ShellTopBar />)
    fireEvent.click(screen.getByTitle('Open AI Chats'))

    expect(mocks.shellState.restoreChatDrawer).toHaveBeenCalledTimes(1)
  })

  it('collapses AI Chats when the drawer is already open', () => {
    mocks.shellState.chatDrawer = { open: true }

    render(<ShellTopBar />)
    expect(screen.getByText('AI Chat')).toBeInTheDocument()
    const aiChatButton = screen.getByTitle('Collapse AI Chats')
    expect(aiChatButton.querySelector('.lucide-panel-left-close')).toBeInTheDocument()
    fireEvent.click(aiChatButton)

    expect(mocks.shellState.minimizeChatDrawer).toHaveBeenCalledTimes(1)
  })

  it('does not show an inert options control beside a registered breadcrumb', () => {
    mocks.shellState.pageBreadcrumb = 'Campaign / Launch'

    render(<ShellTopBar />)

    expect(screen.getByText('Campaign / Launch')).toBeInTheDocument()
    expect(screen.queryByTitle('Section options')).not.toBeInTheDocument()
  })

  it('names the Delegation Desk route in the breadcrumb', () => {
    mocks.pathname = '/home/delegation-desk'

    render(<ShellTopBar />)

    expect(screen.getByText('Delegation Desk')).toBeInTheDocument()
  })

  it('names Clients and Client Campaigns from the active route', () => {
    mocks.pathname = '/clients'
    render(<ShellTopBar />)
    expect(screen.getByText('Clients')).toBeInTheDocument()
    cleanup()

    mocks.pathname = '/client-campaigns'
    render(<ShellTopBar />)
    expect(screen.getByText('Client Campaigns')).toBeInTheDocument()
    cleanup()

    mocks.pathname = '/launches'
    render(<ShellTopBar />)
    expect(screen.getByText('Launches')).toBeInTheDocument()
  })

  it('names All Tasks from the route', () => {
    mocks.pathname = '/all-tasks'
    render(<ShellTopBar />)
    expect(screen.getByText('All Tasks')).toBeInTheDocument()
  })

  it('renders a registered page header action in the top-right cluster', () => {
    mocks.shellState.pageHeaderAction = <button type="button">Portal</button>
    render(<ShellTopBar />)
    expect(screen.getByRole('button', { name: 'Portal' })).toBeInTheDocument()
  })

  it('names Programs from the route instead of Inbox', () => {
    mocks.pathname = '/programs/prog-clients'
    render(<ShellTopBar />)
    expect(screen.getByText('Programs')).toBeInTheDocument()
    expect(screen.queryByText('Inbox')).not.toBeInTheDocument()
  })

  it('keeps the Clients breadcrumb while a chat stays open', () => {
    mocks.pathname = '/clients'
    mocks.params = new URLSearchParams('conv=conversation-1')
    mocks.shellState.chatDrawer = { open: true }

    render(<ShellTopBar />)

    expect(screen.getByText('Clients')).toBeInTheDocument()
  })

  it('does not record chats as work-area pages or show their drawer control', () => {
    mocks.shellState.chatDrawer = { open: true }
    mocks.params = new URLSearchParams('conv=conversation-1')

    render(<ShellTopBar />)

    expect(mocks.shellState.recordWorkAreaPage).not.toHaveBeenCalled()
    expect(screen.queryByTitle('Close page')).not.toBeInTheDocument()
  })

  it('drops transient chat and surface params from the recorded page identity', () => {
    mocks.shellState.chatDrawer = { open: true }
    mocks.params = new URLSearchParams('chat=starting&surface=portal&meeting=evt-1')

    render(<ShellTopBar />)

    expect(mocks.shellState.recordWorkAreaPage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '/home?meeting=evt-1',
        href: '/home?meeting=evt-1',
      }),
    )
  })
})
