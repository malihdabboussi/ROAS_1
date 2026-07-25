import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellTopBar } from './ShellTopBar'

const mocks = vi.hoisted(() => ({
  pathname: '/home',
  push: vi.fn(),
  shellState: {
    sidebarPinned: true,
    sidebarPeek: false,
    toggleSidebarPinned: vi.fn(),
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
    spaceWorkOpen: true,
    toggleSpaceWorkOpen: vi.fn(),
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
    mocks.shellState.sidebarPinned = true
    mocks.shellState.pageBreadcrumb = null
    mocks.shellState.chatDrawer = { open: false }
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('keeps the new-chat action visible when the sidebar is expanded', () => {
    render(<ShellTopBar />)

    expect(screen.getByTitle('New chat')).toBeInTheDocument()
  })

  it('opens a fresh left drawer chat from the pencil on Home', () => {
    render(<ShellTopBar />)
    fireEvent.click(screen.getByTitle('New chat'))

    expect(mocks.shellState.openFreshChatDrawer).toHaveBeenCalledTimes(1)
    expect(mocks.push).not.toHaveBeenCalledWith('/home?chat=new')
  })

  it('restores the last chat from the pencil when the workspace drawer is closed', () => {
    mocks.pathname = '/spaces'
    mocks.shellState.chatDrawer = { open: false }

    render(<ShellTopBar />)
    fireEvent.click(screen.getByTitle('New chat'))

    expect(mocks.shellState.openFreshChatDrawer).toHaveBeenCalledTimes(1)
  })

  it('opens a fresh docked chat from the pencil when the workspace drawer is already open', () => {
    mocks.pathname = '/spaces'
    mocks.shellState.chatDrawer = { open: true }

    render(<ShellTopBar />)
    fireEvent.click(screen.getByTitle('New chat'))

    expect(mocks.shellState.openFreshChatDrawer).toHaveBeenCalledTimes(1)
  })

  it('toggles the AI Chats drawer from the centered control on Home', () => {
    mocks.pathname = '/home'
    mocks.shellState.chatDrawer = { open: false }

    render(<ShellTopBar />)
    fireEvent.click(screen.getByTitle('AI Chats'))

    expect(mocks.shellState.restoreChatDrawer).toHaveBeenCalledTimes(1)
    expect(mocks.push).not.toHaveBeenCalledWith('/home?chat=new')
  })

  it('toggles the AI Chats drawer from the centered control on workspace routes', () => {
    mocks.pathname = '/spaces'
    mocks.shellState.chatDrawer = { open: false }

    render(<ShellTopBar />)
    fireEvent.click(screen.getByTitle('AI Chats'))

    expect(mocks.shellState.restoreChatDrawer).toHaveBeenCalledTimes(1)
  })

  it('minimizes the AI Chats drawer when the centered control is active', () => {
    mocks.pathname = '/spaces'
    mocks.shellState.chatDrawer = { open: true }

    render(<ShellTopBar />)
    fireEvent.click(screen.getByTitle('AI Chats'))

    expect(mocks.shellState.minimizeChatDrawer).toHaveBeenCalledTimes(1)
  })

  it('renders the unified Search + AI Chats control without a duplicate Search icon', () => {
    render(<ShellTopBar />)

    expect(screen.getByTitle('Search')).toBeInTheDocument()
    expect(screen.getByTitle('AI Chats')).toBeInTheDocument()
    expect(screen.queryAllByTitle('Search')).toHaveLength(1)
  })

  it('does not show an inert options control beside a registered breadcrumb', () => {
    mocks.shellState.pageBreadcrumb = 'Campaign / Launch'

    render(<ShellTopBar />)

    expect(screen.getByText('Campaign / Launch')).toBeInTheDocument()
    expect(screen.queryByTitle('Section options')).not.toBeInTheDocument()
  })
})
