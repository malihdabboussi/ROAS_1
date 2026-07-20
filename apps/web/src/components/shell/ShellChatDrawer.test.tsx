import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellChatDrawer } from './ShellChatDrawer'
import { useShellStore } from './use-shell-store'

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
  ResizableDivider: () => null,
}))

describe('ShellChatDrawer', () => {
  beforeEach(() => {
    useShellStore.setState({
      chatDrawer: { open: false, conversationId: null, width: 280, minimized: false },
      newChatNonce: 0,
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
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
})
