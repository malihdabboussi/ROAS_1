import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellRightPanel } from './ShellRightPanel'

const mocks = vi.hoisted(() => ({
  shellState: {
    rightPanel: { open: true, tab: 'tasks' as const },
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
    mocks.shellState.rightPanel.tab = 'tasks'
    vi.clearAllMocks()
  })

  it('shows only generic tasks when no chat is active', () => {
    render(<ShellRightPanel conversationId={null} />)

    expect(screen.getByRole('tab', { name: 'Tasks' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Files' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Sources' })).not.toBeInTheDocument()
    expect(screen.getByTestId('tasks-context')).toHaveTextContent('home')
  })

  it('shows all chat-specific summary tabs for an active conversation', () => {
    render(<ShellRightPanel conversationId="conversation-1" />)

    expect(screen.getByRole('tab', { name: 'Tasks' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Files' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Sources' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Work summary' })).toHaveClass(
      'motion-reduce:transition-none',
    )
    expect(screen.getByTestId('tasks-context')).toHaveTextContent('conversation-1')
  })
})
