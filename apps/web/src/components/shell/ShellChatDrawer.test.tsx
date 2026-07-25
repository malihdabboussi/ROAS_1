import type { MouseEvent } from 'react'
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
}))

vi.mock('@/components/global-chat/containers/GlobalChatPanel', () => ({
  GlobalChatPanel: () => <div>Chat panel</div>,
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

vi.mock('@/features/studio/store/use-chat-store', () => ({
  useChatStore: (
    selector: (state: { setActiveConversationId: typeof mocks.setActiveConversationId }) => unknown,
  ) => selector({ setActiveConversationId: mocks.setActiveConversationId }),
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
  ShellChatMenu: () => <div>Chat history</div>,
}))

describe('ShellChatDrawer', () => {
  beforeEach(() => {
    useShellStore.setState({
      chatDrawer: { open: false, conversationId: null, width: 280, minimized: false },
      chatHistoryWidth: 200,
      workAreaOpen: true,
      newChatNonce: 0,
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
    expect(mocks.setChatRailIntent).not.toHaveBeenCalled()
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
