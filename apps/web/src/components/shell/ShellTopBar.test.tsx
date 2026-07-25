import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellTopBar } from './ShellTopBar'

const mocks = vi.hoisted(() => ({
  pathname: '/home',
  push: vi.fn(),
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
    toggleWorkAreaOpen: vi.fn(),
    setMenuMode: vi.fn(),
    pageBreadcrumb: null as ReactNode | null,
  },
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ back: vi.fn(), forward: vi.fn(), push: mocks.push }),
  useSearchParams: () => new URLSearchParams(),
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

vi.mock('./ShellRightPanelControl', () => ({
  ShellRightPanelControl: () => <button type="button" title="Open panel" />,
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
    mocks.pathname = '/home'
    mocks.shellState.sidebarPinned = false
    mocks.shellState.pageBreadcrumb = null
    mocks.shellState.chatDrawer = { open: false }
    mocks.shellState.workAreaOpen = true
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
    expect(screen.getByLabelText('Open AI Chats')).toBeInTheDocument()
  })

  it('offers the work-area collapse on every route, not just Spaces', () => {
    for (const route of ['/home', '/brain', '/campaigns', '/projects', '/flows', '/artifacts']) {
      mocks.pathname = route
      render(<ShellTopBar />)

      fireEvent.click(screen.getByTitle('Collapse page — chat full screen'))
      cleanup()
    }

    expect(mocks.shellState.toggleWorkAreaOpen).toHaveBeenCalledTimes(6)
  })

  it('offers the reverse control once the work area is collapsed', () => {
    mocks.pathname = '/brain'
    mocks.shellState.workAreaOpen = false

    render(<ShellTopBar />)

    expect(screen.getByTitle('Show page')).toBeInTheDocument()
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
    fireEvent.click(screen.getByTitle('Collapse AI Chats'))

    expect(mocks.shellState.minimizeChatDrawer).toHaveBeenCalledTimes(1)
  })

  it('does not show an inert options control beside a registered breadcrumb', () => {
    mocks.shellState.pageBreadcrumb = 'Campaign / Launch'

    render(<ShellTopBar />)

    expect(screen.getByText('Campaign / Launch')).toBeInTheDocument()
    expect(screen.queryByTitle('Section options')).not.toBeInTheDocument()
  })
})
