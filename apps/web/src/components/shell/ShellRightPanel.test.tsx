import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellRightPanel } from './ShellRightPanel'

const mocks = vi.hoisted(() => ({
  shellState: {
    rightPanel: { open: true, tab: 'tasks' as const },
    setRightPanelOpen: vi.fn(),
    setRightPanelTab: vi.fn(),
  },
  messagesByConversation: {
    'conversation-1': [{ id: 'message-1' }],
  },
}))

vi.mock('./use-shell-store', () => ({
  useShellStore: (selector: (state: typeof mocks.shellState) => unknown) =>
    selector(mocks.shellState),
}))

vi.mock('@/features/studio/store/use-chat-store', () => ({
  useChatStore: (
    selector: (state: { messagesByConversation: typeof mocks.messagesByConversation }) => unknown,
  ) => selector({ messagesByConversation: mocks.messagesByConversation }),
}))

vi.mock('@/components/conversations', () => ({
  ConversationScopePicker: () => <div data-testid="scope-picker">Scope</div>,
}))

vi.mock('./ShellRightPanelTasks', () => ({
  ShellRightPanelTasks: ({ conversationId }: { conversationId: string | null }) => (
    <div data-testid="tasks-context">{conversationId ?? 'home'}</div>
  ),
}))

vi.mock('./ShellRightPanelFiles', () => ({
  ShellRightPanelFiles: () => <div>Chat files</div>,
}))

vi.mock('./ShellRightPanelSources', () => ({
  ShellRightPanelSources: () => <div>Chat sources</div>,
}))

describe('ShellRightPanel', () => {
  afterEach(cleanup)

  beforeEach(() => {
    mocks.shellState.rightPanel.open = true
    mocks.shellState.rightPanel.tab = 'tasks'
    vi.clearAllMocks()
  })

  it('shows only generic tasks when no chat is active', async () => {
    render(<ShellRightPanel conversationId={null} />)

    expect(await screen.findByRole('tab', { name: 'Tasks' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Files' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Sources' })).not.toBeInTheDocument()
    expect(screen.queryByText('Campaign & space')).not.toBeInTheDocument()
    expect(screen.getByTestId('tasks-context')).toHaveTextContent('home')

    fireEvent.click(screen.getByRole('button', { name: 'Close work summary' }))
    expect(mocks.shellState.setRightPanelOpen).toHaveBeenCalledWith(false)
  })

  it('shows all chat-specific summary tabs for an active conversation', async () => {
    render(<ShellRightPanel conversationId="conversation-1" showScope />)

    expect(await screen.findByRole('tab', { name: 'Tasks' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Files' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Sources' })).toBeInTheDocument()
    expect(screen.getByText('Campaign & space')).toBeInTheDocument()
    expect(screen.getByTestId('scope-picker')).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Work summary' })).toHaveClass(
      'motion-reduce:transition-none',
    )
    expect(screen.getByTestId('tasks-context')).toHaveTextContent('conversation-1')
  })

  it('always enters from and exits toward the right edge', async () => {
    mocks.shellState.rightPanel.open = false
    const { rerender } = render(<ShellRightPanel conversationId="conversation-1" />)

    expect(screen.queryByRole('complementary', { name: 'Work summary' })).not.toBeInTheDocument()

    mocks.shellState.rightPanel.open = true
    rerender(<ShellRightPanel conversationId="conversation-1" />)

    const panel = await screen.findByRole('complementary', { name: 'Work summary' })
    expect(panel).toHaveClass('translate-x-0')
    expect(panel).not.toHaveClass('-translate-x-full')

    mocks.shellState.rightPanel.open = false
    rerender(<ShellRightPanel conversationId="conversation-1" />)

    await waitFor(() => expect(panel).toHaveClass('translate-x-full'))
    expect(panel).not.toHaveClass('-translate-x-full')
  })
})
