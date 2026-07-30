import type { MouseEvent, ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellChatDrawer } from './ShellChatDrawer'
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
  ShellChatMenu: ({ onCollapse }: { onCollapse?: () => void }) => (
    <div>
      Chat history
      <button type="button" onClick={onCollapse}>
        Collapse history
      </button>
    </div>
  ),
}))

describe('ShellChatDrawer', () => {
  beforeEach(() => {
    useShellStore.setState({
      chatDrawer: { open: false, conversationId: null, width: 280, minimized: false },
      chatHistoryWidth: 200,
      chatHistoryCollapsed: false,
      workAreaOpen: true,
      newChatNonce: 0,
      rightPanel: { open: false, tab: 'tasks' },
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

  it('requests a fresh panel thread when newChatNonce bumps with no conversation id', () => {
    useShellStore.setState({
      chatDrawer: { open: true, conversationId: null, width: 280, minimized: false },
      newChatNonce: 1,
    })

    render(<ShellChatDrawer />)

    expect(mocks.setChatRailIntent).toHaveBeenCalledWith('new')
    expect(mocks.setActiveConversationId).toHaveBeenCalledWith(null)
    expect(mocks.openConversationInSpaceChat).not.toHaveBeenCalled()
  })

  it('restores a known conversation without forcing a fresh thread', () => {
    useShellStore.setState({
      chatDrawer: {
        open: true,
        conversationId: 'conversation-1',
        width: 280,
        minimized: false,
      },
      newChatNonce: 3,
    })

    render(<ShellChatDrawer />)

    expect(mocks.openConversationInSpaceChat).toHaveBeenCalledWith('conversation-1')
    expect(mocks.setActiveConversationId).toHaveBeenCalledWith('conversation-1')
    expect(mocks.selectConversation).toHaveBeenCalledWith('conversation-1')
    expect(mocks.setChatRailIntent).toHaveBeenCalledWith(null)
  })

  it('does not re-fire fresh intent when restoring an empty shell id after the same nonce', () => {
    useShellStore.setState({
      chatDrawer: { open: true, conversationId: null, width: 280, minimized: false },
      newChatNonce: 2,
    })
    const { rerender } = render(<ShellChatDrawer />)
    expect(mocks.setChatRailIntent).toHaveBeenCalledTimes(1)

    mocks.setChatRailIntent.mockClear()
    useShellStore.setState({
      chatDrawer: { open: false, conversationId: null, width: 280, minimized: true },
      newChatNonce: 2,
    })
    rerender(<ShellChatDrawer />)

    useShellStore.setState({
      chatDrawer: { open: true, conversationId: null, width: 280, minimized: false },
      newChatNonce: 2,
    })
    rerender(<ShellChatDrawer />)

    expect(mocks.setChatRailIntent).not.toHaveBeenCalled()
  })

  it('keeps the chat history rail when expanded to fill the collapsed page', () => {
    useShellStore.setState({
      chatDrawer: {
        open: true,
        conversationId: 'conversation-1',
        width: 420,
        minimized: false,
      },
    })

    const { container } = render(<ShellChatDrawer expanded />)

    expect(screen.getByText('Chat history')).toBeInTheDocument()
    expect(screen.getByText('Chat panel')).toBeInTheDocument()
    expect(container.querySelector('[data-expanded="true"]')).not.toBeNull()
  })

  it('adds the work summary as a third column instead of overlaying chat', () => {
    useShellStore.setState({
      chatDrawer: {
        open: true,
        conversationId: 'conversation-1',
        width: 420,
        minimized: false,
      },
      rightPanel: { open: true, tab: 'tasks' },
    })

    const { container } = render(<ShellChatDrawer />)

    expect(container.querySelector('[data-shell-chat-drawer]')).toHaveStyle({ width: '708px' })
    expect(container.querySelector('.shell-chat-drawer-body')).toHaveStyle({ width: '708px' })
    expect(useShellStore.getState().chatDrawer.width).toBe(420)
  })

  it('resizes the chat history rail independently in expanded chat', () => {
    useShellStore.setState({
      chatDrawer: {
        open: true,
        conversationId: 'conversation-1',
        width: 420,
        minimized: false,
      },
      chatHistoryWidth: 200,
    })

    const { container } = render(<ShellChatDrawer expanded />)
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Resize chat history' }), {
      clientX: 200,
    })
    const moveEvent = new Event('pointermove', { bubbles: true })
    Object.defineProperty(moveEvent, 'clientX', { value: 280 })
    fireEvent(document, moveEvent)
    fireEvent.pointerUp(document)

    expect(useShellStore.getState().chatHistoryWidth).toBe(280)
    expect(container.querySelector('[data-shell-chat-history]')).toHaveStyle({ width: '280px' })
  })

  it('does not resize the active chat drawer when resizing docked history', () => {
    useShellStore.setState({
      chatDrawer: {
        open: true,
        conversationId: 'conversation-1',
        width: 420,
        minimized: false,
      },
      chatHistoryWidth: 200,
    })

    const { container } = render(<ShellChatDrawer />)
    const historyDivider = container.querySelector<HTMLButtonElement>(
      '[aria-label="Resize chat history"]',
    )
    expect(historyDivider).not.toBeNull()
    fireEvent.mouseDown(historyDivider!, {
      clientX: 200,
    })
    const moveEvent = new Event('pointermove', { bubbles: true })
    Object.defineProperty(moveEvent, 'clientX', { value: 280 })
    fireEvent(document, moveEvent)
    fireEvent.pointerUp(document)

    expect(useShellStore.getState().chatHistoryWidth).toBe(280)
    expect(useShellStore.getState().chatDrawer.width).toBe(420)
  })

  it('collapses chat history when its divider is dragged fully left', () => {
    useShellStore.setState({
      chatDrawer: {
        open: true,
        conversationId: 'conversation-1',
        width: 420,
        minimized: false,
      },
      chatHistoryWidth: 200,
    })

    const { container } = render(<ShellChatDrawer />)
    const historyDivider = container.querySelector<HTMLButtonElement>(
      '[aria-label="Resize chat history"]',
    )
    expect(historyDivider).not.toBeNull()
    fireEvent.mouseDown(historyDivider!, {
      clientX: 200,
    })
    const moveEvent = new Event('pointermove', { bubbles: true })
    Object.defineProperty(moveEvent, 'clientX', { value: 40 })
    fireEvent(document, moveEvent)
    fireEvent.pointerUp(document)

    expect(useShellStore.getState().chatHistoryCollapsed).toBe(true)
    expect(useShellStore.getState().chatDrawer.width).toBe(420)
    expect(screen.getByText('Chat panel')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show chat history' })).toBeInTheDocument()
  })

  it('restores chat history from the chat column top-left control', () => {
    useShellStore.setState({
      chatDrawer: {
        open: true,
        conversationId: 'conversation-1',
        width: 420,
        minimized: false,
      },
      chatHistoryCollapsed: true,
    })

    render(<ShellChatDrawer />)
    fireEvent.click(screen.getByRole('button', { name: 'Show chat history' }))
    expect(useShellStore.getState().chatHistoryCollapsed).toBe(false)
  })

  it('shows only a purple history icon in the chat header when history is collapsed', () => {
    useShellStore.setState({
      chatDrawer: {
        open: true,
        conversationId: 'conversation-1',
        width: 420,
        minimized: false,
      },
      chatHistoryCollapsed: true,
    })

    const { container } = render(<ShellChatDrawer />)
    expect(container.querySelector('.shell-chat-history-restore')).toBeNull()
    expect(container.querySelector('[data-shell-chat-history-restore]')).toBeNull()
    const restoreHistory = screen.getByRole('button', { name: 'Show chat history' })
    expect(restoreHistory).toHaveClass('btn-icon-bare')
    expect(restoreHistory.querySelector('svg')).toHaveClass('nav-glass-text-purple')
    expect(restoreHistory).toHaveTextContent('')
    expect(screen.getByText('Chat panel')).toBeInTheDocument()
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
})
