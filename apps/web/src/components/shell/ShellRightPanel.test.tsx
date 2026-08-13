import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellRightPanel } from './ShellRightPanel'

const mocks = vi.hoisted(() => ({
  openScopePicker: vi.fn(),
  routerPush: vi.fn(),
  seedComposer: vi.fn(),
  meetingContext: null as {
    spaceId: string
    meetingItemId: string
    conversationId: string
  } | null,
  shellState: {
    rightPanel: { open: true },
    conversationScopePickerRequestNonce: 0,
    setRightPanelOpen: vi.fn(),
    setWorkAreaOpen: vi.fn(),
    closeArtifactViewer: vi.fn(),
  },
  messagesByConversation: {
    'conversation-1': [{ id: 'message-1' }],
  },
  conversations: [] as Array<{ id: string; metadata?: Record<string, unknown> }>,
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

vi.mock('@/components/global-chat/store/use-global-chat-store', () => ({
  useGlobalChatStore: Object.assign(
    (selector: (state: { meetingContext: typeof mocks.meetingContext }) => unknown) =>
      selector({ meetingContext: mocks.meetingContext }),
    { getState: () => ({ seedComposer: mocks.seedComposer }) },
  ),
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

vi.mock('./ShellCreateMenuPanel', () => ({
  ShellCreateMenuPanel: () => <div data-testid="create-catalog">Create catalog</div>,
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
    mocks.shellState.conversationScopePickerRequestNonce = 0
    mocks.meetingContext = null
    mocks.conversations = []
    vi.clearAllMocks()
  })

  it('shows only the Tasks section when no chat is active', async () => {
    render(<ShellRightPanel conversationId={null} />)

    expect(await screen.findByRole('heading', { name: 'Tasks' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Outputs' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Sources' })).not.toBeInTheDocument()
    expect(screen.queryByText('Campaign & space')).not.toBeInTheDocument()
    expect(screen.getByTestId('tasks-context')).toHaveTextContent('home')

    fireEvent.click(screen.getByRole('button', { name: 'Close work summary' }))
    expect(mocks.shellState.setRightPanelOpen).toHaveBeenCalledWith(false)
  })

  it('stacks Outputs, Sources, and Tasks sections for an active conversation', async () => {
    render(<ShellRightPanel conversationId="conversation-1" showScope />)

    expect(await screen.findByRole('heading', { name: 'Outputs' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tasks' })).toBeInTheDocument()
    expect(screen.getByText('Campaign & space')).toBeInTheDocument()
    expect(screen.getByTestId('scope-picker')).toBeInTheDocument()
    expect(screen.getByTestId('tasks-context')).toHaveTextContent('conversation-1')
    expect(
      within(screen.getByTestId('work-summary-header')).getByRole('button', {
        name: 'Close work summary',
      }),
    ).toBeInTheDocument()
  })

  it('renders as a floating bubble that expands down and collapses up', async () => {
    mocks.shellState.rightPanel.open = false
    const { rerender } = render(<ShellRightPanel conversationId="conversation-1" />)

    expect(screen.queryByRole('complementary', { name: 'Work summary' })).not.toBeInTheDocument()

    mocks.shellState.rightPanel.open = true
    rerender(<ShellRightPanel conversationId="conversation-1" />)

    const panel = await screen.findByRole('complementary', { name: 'Work summary' })
    expect(panel).toHaveClass('dropdown-menu-solid', 'origin-top-right')
    expect(panel.parentElement).toHaveClass('absolute', 'right-0', 'top-0')
    expect(panel).not.toHaveClass('h-full')
    await waitFor(() => expect(panel).toHaveClass('scale-100', 'opacity-100'))

    mocks.shellState.rightPanel.open = false
    rerender(<ShellRightPanel conversationId="conversation-1" />)

    await waitFor(() => expect(panel).toHaveClass('scale-95', 'opacity-0'))
  })

  it('opens the create catalog inside the bubble instead of a clipped dropdown', async () => {
    render(<ShellRightPanel conversationId="conversation-1" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Create' }))

    expect(screen.getByTestId('create-catalog')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Outputs' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back to summary' }))
    expect(screen.queryByTestId('create-catalog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Outputs' })).toBeInTheDocument()
  })

  it('links a meeting conversation back to its meeting workspace', async () => {
    mocks.conversations = [
      {
        id: 'conversation-1',
        metadata: {
          context_type: 'meeting',
          meeting_item_id: 'meeting-item-1',
          space_id: 'space-1',
        },
      },
    ]

    render(<ShellRightPanel conversationId="conversation-1" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Open meeting workspace' }))

    expect(mocks.shellState.closeArtifactViewer).toHaveBeenCalledTimes(1)
    expect(mocks.shellState.setWorkAreaOpen).toHaveBeenCalledWith(true)
    expect(mocks.routerPush).toHaveBeenCalledWith('/home/meetings?meeting=meeting-item-1')
  })

  it('prefers the live meeting context over conversation metadata', async () => {
    mocks.meetingContext = {
      spaceId: 'space-live',
      meetingItemId: 'meeting-live',
      conversationId: 'conversation-1',
    }

    render(<ShellRightPanel conversationId="conversation-1" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Open meeting workspace' }))

    expect(mocks.routerPush).toHaveBeenCalledWith('/home/meetings?meeting=meeting-live')
  })

  it('shows no meeting link for a plain conversation', async () => {
    render(<ShellRightPanel conversationId="conversation-1" />)

    expect(await screen.findByRole('heading', { name: 'Outputs' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open meeting workspace' })).not.toBeInTheDocument()
  })

  it('opens the campaign and space picker when the guidance prompt requests it', async () => {
    mocks.shellState.conversationScopePickerRequestNonce = 1

    render(<ShellRightPanel conversationId="conversation-1" showScope />)

    await waitFor(() => expect(mocks.openScopePicker).toHaveBeenCalledTimes(1))
  })
})
