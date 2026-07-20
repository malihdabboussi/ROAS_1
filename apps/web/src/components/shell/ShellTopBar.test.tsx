import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellTopBar } from './ShellTopBar'

const mocks = vi.hoisted(() => ({
  pathname: '/home',
  shellState: {
    sidebarPinned: true,
    sidebarPeek: false,
    toggleSidebarPinned: vi.fn(),
    holdSidebarPeek: vi.fn(),
    scheduleSidebarPeekClose: vi.fn(),
    requestNewChat: vi.fn(),
    openFreshChatDrawer: vi.fn(),
    restoreChatDrawer: vi.fn(),
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
  useRouter: () => ({ back: vi.fn(), forward: vi.fn(), push: vi.fn() }),
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

  it('restores the last chat from the pencil when the workspace drawer is closed', () => {
    mocks.pathname = '/spaces'
    mocks.shellState.chatDrawer = { open: false }

    render(<ShellTopBar />)
    fireEvent.click(screen.getByTitle('New chat'))

    expect(mocks.shellState.restoreChatDrawer).toHaveBeenCalledTimes(1)
    expect(mocks.shellState.openFreshChatDrawer).not.toHaveBeenCalled()
    expect(mocks.shellState.requestNewChat).not.toHaveBeenCalled()
  })

  it('opens a fresh docked chat from the pencil when the workspace drawer is already open', () => {
    mocks.pathname = '/spaces'
    mocks.shellState.chatDrawer = { open: true }

    render(<ShellTopBar />)
    fireEvent.click(screen.getByTitle('New chat'))

    expect(mocks.shellState.openFreshChatDrawer).toHaveBeenCalledTimes(1)
    expect(mocks.shellState.restoreChatDrawer).not.toHaveBeenCalled()
    expect(mocks.shellState.requestNewChat).not.toHaveBeenCalled()
  })

  it('opens the full new-chat screen from the pencil on Home', () => {
    render(<ShellTopBar />)
    fireEvent.click(screen.getByTitle('New chat'))

    expect(mocks.shellState.requestNewChat).toHaveBeenCalledTimes(1)
    expect(mocks.shellState.openFreshChatDrawer).not.toHaveBeenCalled()
  })

  it('does not show an inert options control beside a registered breadcrumb', () => {
    mocks.shellState.pageBreadcrumb = 'Campaign / Launch'

    render(<ShellTopBar />)

    expect(screen.getByText('Campaign / Launch')).toBeInTheDocument()
    expect(screen.queryByTitle('Section options')).not.toBeInTheDocument()
  })
})
