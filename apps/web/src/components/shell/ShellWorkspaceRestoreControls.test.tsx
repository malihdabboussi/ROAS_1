import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
  rightPanelOpen: false,
  summaryPanelDocked: false,
  workAreaOpen: true,
  chatDrawerOpen: false,
  artifactTarget: null as { id: string } | null,
  artifactWidth: 480,
  setArtifactViewerWidth: vi.fn(),
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

vi.mock('@/components/layout/ResizableDivider', () => ({
  ResizableDivider: ({
    ariaLabel,
    onMouseDown,
  }: {
    ariaLabel: string
    onMouseDown: React.MouseEventHandler
  }) => <button type="button" aria-label={ariaLabel} onMouseDown={onMouseDown} />,
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
      artifactViewer: { target: mocks.artifactTarget, width: mocks.artifactWidth },
      setArtifactViewerWidth: mocks.setArtifactViewerWidth,
      chatDrawer: {
        open: !mocks.workAreaOpen || mocks.chatDrawerOpen,
        conversationId: null,
        width: 420,
      },
      openChatDrawer: vi.fn(),
      minimizeChatDrawer: vi.fn(),
      handleScreenNavigation: vi.fn(),
      recordScreenConversation: vi.fn(),
      requestNewChat: vi.fn(),
      setMenuMode: vi.fn(),
      setWorkAreaOpen: mocks.setWorkAreaOpen,
      setRightPanelOpen: mocks.setRightPanelOpen,
      rightPanel: { open: mocks.rightPanelOpen, tab: 'tasks' },
      summaryPanelDocked: mocks.summaryPanelDocked,
      recentWorkAreaPages: mocks.recentWorkAreaPages,
    }),
}))

describe('ShellWorkspace restore controls', () => {
  beforeEach(() => {
    mocks.pathname = '/home'
    mocks.params = new Map([['chat', 'starting']])
    mocks.activeConversationId = null
    mocks.rightPanelOpen = false
    mocks.summaryPanelDocked = false
    mocks.recentWorkAreaPages = [
      { id: '/home/meetings', title: 'Meetings', href: '/home/meetings' },
    ]
    mocks.workAreaOpen = true
    mocks.chatDrawerOpen = false
    mocks.artifactTarget = null
    mocks.artifactWidth = 480
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
  it('leaves full-conversation page restoration to the summary control', () => {
    mocks.desktop = true
    mocks.params = new Map([['conv', 'conversation-1']])
    render(<ShellWorkspace>Home dashboard</ShellWorkspace>)
    expect(screen.queryByRole('button', { name: 'Show page' })).toBeNull()
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('hides the full-conversation page restore control while the summary panel is open', () => {
    mocks.desktop = true
    mocks.params = new Map([['conv', 'conversation-1']])
    mocks.rightPanelOpen = true
    render(<ShellWorkspace>Home dashboard</ShellWorkspace>)
    expect(screen.queryByRole('button', { name: 'Show page' })).toBeNull()
  })
  it('does not render an inert restore control without a restorable page', () => {
    mocks.desktop = true
    mocks.params = new Map([['conv', 'conversation-1']])
    mocks.recentWorkAreaPages = [
      { id: '/home?conv=conversation-2', title: 'Other chat', href: '/home?conv=conversation-2' },
    ]
    render(<ShellWorkspace>Home dashboard</ShellWorkspace>)
    expect(screen.queryByRole('button', { name: 'Show page' })).toBeNull()
  })
  it('resizes the universal artifact panel beside a full conversation', () => {
    mocks.desktop = true
    mocks.params = new Map([['conv', 'conversation-1']])
    mocks.artifactTarget = { id: 'document-1' }
    render(<ShellWorkspace>Home dashboard</ShellWorkspace>)

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Resize artifact viewer' }), {
      clientX: 900,
    })
    const pointerMove = new Event('pointermove', { bubbles: true })
    Object.defineProperty(pointerMove, 'clientX', { value: 820 })
    fireEvent(document, pointerMove)

    expect(mocks.setArtifactViewerWidth).toHaveBeenCalledWith(560)
  })
  it('hides the collapsed work-area restore control while the summary panel is open', () => {
    mocks.pathname = '/brain'
    mocks.params = new Map()
    mocks.workAreaOpen = false
    mocks.desktop = true
    mocks.shellPrefsHydrated = true
    mocks.menuDock = 'left'
    mocks.menuStyle = 'simple'
    mocks.rightPanelOpen = true
    render(<ShellWorkspace>Brain page</ShellWorkspace>)
    // Page restore lives in the chat header cluster, not as a floating workspace icon.
    expect(screen.queryByRole('button', { name: 'Show page' })).toBeNull()
  })
  it('does not float a duplicate restore icon when the advanced top bar shows one', () => {
    mocks.pathname = '/brain'
    mocks.params = new Map()
    mocks.workAreaOpen = false
    mocks.desktop = true
    mocks.shellPrefsHydrated = true
    mocks.menuDock = 'left'
    mocks.menuStyle = 'advanced'
    render(<ShellWorkspace>Brain page</ShellWorkspace>)
    expect(screen.queryByRole('button', { name: 'Show page' })).toBeNull()
  })
})
