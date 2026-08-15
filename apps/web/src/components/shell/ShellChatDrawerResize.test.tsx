import type { MouseEvent, ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ARTIFACT_VIEWER_WIDTH_MIN } from '@/lib/artifacts/artifact-viewer-layout'
import { ShellChatDrawer } from './ShellChatDrawer'
import { useShellMenuDock } from './use-shell-menu-dock'
import { useShellStore } from './use-shell-store'

const ORIGINAL_INNER_WIDTH = window.innerWidth

const mocks = vi.hoisted(() => ({
  setActiveConversationId: vi.fn(),
  openConversationInSpaceChat: vi.fn(),
  setChatRailIntent: vi.fn(),
  setCollapsed: vi.fn(),
  selectConversation: vi.fn(),
}))

vi.mock('@/components/global-chat/containers/GlobalChatPanel', () => ({
  GlobalChatPanel: ({ headerLeadingAction }: { headerLeadingAction?: ReactNode }) => (
    <div>
      {headerLeadingAction}
      <div>Chat panel</div>
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
      setChatRailIntent: typeof mocks.setChatRailIntent
    }) => unknown,
  ) =>
    selector({
      openConversationInSpaceChat: mocks.openConversationInSpaceChat,
      setChatRailIntent: mocks.setChatRailIntent,
    }),
}))

vi.mock('@/features/studio/services/chat.service', () => ({
  selectConversation: mocks.selectConversation,
}))

vi.mock('@/features/studio/store/use-chat-store', () => ({
  useChatStore: (
    selector: (state: { setActiveConversationId: typeof mocks.setActiveConversationId }) => unknown,
  ) => selector({ setActiveConversationId: mocks.setActiveConversationId }),
}))

vi.mock('@/features/studio/services/conversation-title-scheduler', () => ({
  initConversationTitleAutogen: vi.fn(),
}))

vi.mock('@/components/layout/ResizableDivider', () => ({
  ResizableDivider: ({
    onMouseDown,
    ariaLabel,
  }: {
    onMouseDown: (event: MouseEvent) => void
    ariaLabel?: string
  }) => <button type="button" aria-label={ariaLabel} onMouseDown={onMouseDown} />,
}))

vi.mock('./ShellChatMenu', () => ({
  ShellChatMenu: ({
    onCollapse,
    onOpenChat,
  }: {
    onCollapse?: () => void
    onOpenChat?: () => void
  }) => (
    <div>
      Chat history
      <button type="button" onClick={onCollapse}>
        Collapse history
      </button>
      <button type="button" onClick={onOpenChat}>
        Open conversation
      </button>
    </div>
  ),
}))

describe('ShellChatDrawer resize', () => {
  beforeEach(() => {
    useShellMenuDock.setState({ menuStyle: 'advanced' })
    useShellStore.setState({
      chatDrawer: { open: false, conversationId: null, width: 280, minimized: false },
      chatHistoryWidth: 200,
      chatHistoryCollapsed: false,
      workAreaOpen: true,
      newChatNonce: 0,
      rightPanel: { open: false },
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: ORIGINAL_INNER_WIDTH,
    })
  })

  it('collapses the work area when the drawer reaches the right edge', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 })
    useShellStore.setState({
      chatDrawer: {
        open: true,
        conversationId: 'conversation-1',
        width: 420,
        minimized: false,
      },
      workAreaOpen: true,
    })

    render(<ShellChatDrawer />)
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Resize AI chat drawer' }), {
      clientX: 420,
    })
    const moveEvent = new Event('pointermove', { bubbles: true })
    Object.defineProperty(moveEvent, 'clientX', { value: 1185 })
    fireEvent(document, moveEvent)

    expect(useShellStore.getState().chatDrawer.width).toBeGreaterThan(720)

    fireEvent.pointerUp(document)
    expect(useShellStore.getState().workAreaOpen).toBe(false)
    expect(useShellStore.getState().chatDrawer.width).toBe(420)
  })

  it('stops the drag before crushing an open artifact column', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 })
    useShellStore.setState({
      chatDrawer: {
        open: true,
        conversationId: 'conversation-1',
        width: 420,
        minimized: false,
      },
      artifactViewer: {
        target: { id: 'image-1', title: 'Cover', type: 'image' },
        width: 480,
      },
      workAreaOpen: true,
    })

    render(<ShellChatDrawer />)
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Resize AI chat drawer' }), {
      clientX: 420,
    })
    const moveEvent = new Event('pointermove', { bubbles: true })
    // Past the artifact stop, but inside the 180px dismiss overshoot.
    Object.defineProperty(moveEvent, 'clientX', { value: 900 })
    fireEvent(document, moveEvent)

    expect(useShellStore.getState().chatDrawer.width).toBeLessThanOrEqual(
      1200 - ARTIFACT_VIEWER_WIDTH_MIN,
    )
    fireEvent.pointerUp(document)
    expect(useShellStore.getState().artifactViewer.target).not.toBeNull()
  })

  it('collapses the artifact away when the drag pushes well past its minimum', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 })
    useShellStore.setState({
      chatDrawer: {
        open: true,
        conversationId: 'conversation-1',
        width: 420,
        minimized: false,
      },
      artifactViewer: {
        target: { id: 'image-1', title: 'Cover', type: 'image' },
        width: 480,
      },
      workAreaOpen: true,
    })

    render(<ShellChatDrawer />)
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Resize AI chat drawer' }), {
      clientX: 420,
    })
    const moveEvent = new Event('pointermove', { bubbles: true })
    Object.defineProperty(moveEvent, 'clientX', { value: 1185 })
    fireEvent(document, moveEvent)
    fireEvent.pointerUp(document)

    expect(useShellStore.getState().artifactViewer.target).toBeNull()
    expect(useShellStore.getState().chatDrawer.width).toBe(420)
    expect(useShellStore.getState().workAreaOpen).toBe(true)
  })
})
