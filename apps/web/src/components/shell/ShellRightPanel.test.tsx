import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellRightPanel } from './ShellRightPanel'

const mocks = vi.hoisted(() => ({
  openScopePicker: vi.fn(),
  routerPush: vi.fn(),
  shellState: {
    rightPanel: { open: true, tab: 'tasks' as const },
    conversationScopePickerRequestNonce: 0,
    setRightPanelOpen: vi.fn(),
    setRightPanelTab: vi.fn(),
    setWorkAreaOpen: vi.fn(),
    closeArtifactViewer: vi.fn(),
  },
  messagesByConversation: {
    'conversation-1': [{ id: 'message-1' }],
  },
  conversations: [],
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}))

vi.mock('./use-shell-store', () => ({
  useShellStore: (selector: (state: typeof mocks.shellState) => unknown) =>
    selector(mocks.shellState),
}))

vi.mock('@/features/studio/store/use-chat-store', () => ({
  useChatStore: (
    selector: (state: {
      messagesByConversation: typeof mocks.messagesByConversation
      conversations: typeof mocks.conversations
    }) => unknown,
  ) =>
    selector({
      messagesByConversation: mocks.messagesByConversation,
      conversations: mocks.conversations,
    }),
}))

vi.mock('@/components/conversations', async () => {
  const { forwardRef, useImperativeHandle } = await import('react')
  return {
    ConversationScopePicker: forwardRef(function MockConversationScopePicker(_props, ref) {
      useImperativeHandle(ref, () => ({ openMenuFromBanner: mocks.openScopePicker }))
      return <div data-testid="scope-picker">Scope</div>
    }),
  }
})

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
    mocks.shellState.conversationScopePickerRequestNonce = 0
    vi.clearAllMocks()
  })

  it('shows only generic tasks when no chat is active', async () => {
    render(<ShellRightPanel conversationId={null} />)

    expect(await screen.findByRole('tab', { name: 'Tasks' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Outputs' })).not.toBeInTheDocument()
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
    expect(screen.getByRole('tab', { name: 'Outputs' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Sources' })).toBeInTheDocument()
    expect(screen.getByText('Campaign & space')).toBeInTheDocument()
    expect(screen.getByTestId('scope-picker')).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Work summary' })).toHaveClass(
      'motion-reduce:transition-none',
    )
    expect(screen.getByRole('complementary', { name: 'Work summary' })).not.toHaveClass('absolute')
    expect(screen.getByTestId('tasks-context')).toHaveTextContent('conversation-1')
    expect(
      within(screen.getByTestId('work-summary-header')).getByRole('button', {
        name: 'Close work summary',
      }),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('tablist', { name: 'Work summary sections' })).queryByRole('button', {
        name: 'Close work summary',
      }),
    ).not.toBeInTheDocument()
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

  it('opens the campaign and space picker when the guidance prompt requests it', async () => {
    mocks.shellState.conversationScopePickerRequestNonce = 1

    render(<ShellRightPanel conversationId="conversation-1" showScope />)

    await waitFor(() => expect(mocks.openScopePicker).toHaveBeenCalledTimes(1))
  })
})
