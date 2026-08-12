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
      title={mocks.shellState.workAreaOpen ? 'Collapse page — chat full screen' : 'Show page'}
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
    expect(screen.getByLabelText('Work surface').parentElement).toHaveClass(
      'shell-topbar-desktop-actions',
    )
  })

  it('keeps the breadcrumb and persistent work controls in the global bar for Simple mode', () => {
    useShellMenuDock.setState({ menuStyle: 'simple' })

    render(<ShellTopBar />)

    expect(screen.queryByText('Agenda')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Search')).not.toBeInTheDocument()
    expect(screen.queryByText('AI Chat')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Workspace' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Portal' })).toBeInTheDocument()
    expect(screen.getByTitle('Collapse page — chat full screen')).toBeInTheDocument()
  })

  it('hides the work-area control until chat creates something to collapse', () => {
    for (const route of ['/home', '/brain', '/campaigns', '/projects', '/flows', '/artifacts']) {
      mocks.pathname = route
      render(<ShellTopBar />)

      expect(screen.queryByTitle('Collapse page — chat full screen')).not.toBeInTheDocument()
      cleanup()
    }

    expect(mocks.shellState.toggleWorkAreaOpen).not.toHaveBeenCalled()
  })

  it('offers the work-area collapse while AI Chat is open', () => {
    mocks.shellState.chatDrawer = { open: true }

    render(<ShellTopBar />)
    expect(screen.getByTitle('Collapse page — chat full screen')).toHaveAttribute(
      'data-page-title',
      'Home',
    )
    fireEvent.click(screen.getByTitle('Collapse page — chat full screen'))

    expect(mocks.shellState.toggleWorkAreaOpen).toHaveBeenCalledTimes(1)
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

  it('switches between the Workspace and Portal surfaces', () => {
    render(<ShellTopBar />)

    expect(screen.getByRole('button', { name: 'Workspace' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Portal' }))

    expect(mocks.shellState.setWorkAreaOpen).toHaveBeenCalledWith(true)
    expect(mocks.shellState.closeArtifactViewer).toHaveBeenCalledTimes(1)
    expect(mocks.replace).toHaveBeenCalledWith('/home?surface=portal', { scroll: false })
  })
})
