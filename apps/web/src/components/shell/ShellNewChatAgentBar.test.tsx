import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShellNewChatAgentBar } from './ShellNewChatAgentBar'

vi.mock('@/components/global-chat/store/use-global-chat-store', () => ({
  useGlobalChatStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      activeAgentKey: 'vibey',
      setActiveAgentKey: vi.fn(),
      roster: [],
      loadRoster: vi.fn().mockResolvedValue(undefined),
    }),
}))

vi.mock('@/features/spaces/components/chat/SpaceChatAgentPicker', () => ({
  SpaceChatAgentPicker: () => <div>Agent picker</div>,
}))

vi.mock('@/features/studio/store/use-chat-store', () => ({
  useChatStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ setActiveConversationId: vi.fn() }),
}))

vi.mock('./use-shell-store', () => ({
  useShellStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ requestNewChat: vi.fn() }),
}))

describe('ShellNewChatAgentBar', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows the agent picker without a redundant New chat label', () => {
    render(<ShellNewChatAgentBar />)

    expect(screen.getByText('Agent picker')).toBeInTheDocument()
    expect(screen.queryByText('New chat')).not.toBeInTheDocument()
  })
})
