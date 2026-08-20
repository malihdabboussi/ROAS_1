import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellRightPanel } from './ShellRightPanel'

const mocks = vi.hoisted(() => ({
  openScopePicker: vi.fn(),
  routerPush: vi.fn(),
  seedComposer: vi.fn(),
  clearMeetingContext: vi.fn(),
  meetingContext: null as {
    spaceId: string
    meetingItemId: string
    conversationId: string
    meetingTitle?: string
  } | null,
  shellState: {
    rightPanel: { open: true },
    conversationScopePickerRequestNonce: 0,
    setRightPanelOpen: vi.fn(),
    setWorkAreaOpen: vi.fn(),
    lastWorkAreaPageByConversation: {} as Record<string, { title: string; href: string }>,
  },
  messagesByConversation: {
    'conversation-1': [
      { id: 'message-1', role: 'assistant', metadata: {}, created_at: '2026-08-15T00:00:00.000Z' },
    ],
  },
  conversations: [] as Array<{
    id: string
    title?: string | null
    metadata?: Record<string, unknown>
  }>,
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
    (
      selector: (state: {
        meetingContext: typeof mocks.meetingContext
        clearMeetingContext: () => void
      }) => unknown,
    ) =>
      selector({
        meetingContext: mocks.meetingContext,
        clearMeetingContext: mocks.clearMeetingContext,
      }),
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
  ShellCreateMenuPanel: ({ onBack }: { onBack?: () => void }) => (
    <div data-testid="create-catalog">
      {onBack ? (
        <button type="button" onClick={onBack}>
          Back
        </button>
      ) : null}
      Create catalog
    </div>
  ),
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

vi.mock('./ShellRightPanelConnections', async () => {
  const { useImperativeHandle } = await import('react')
  return {
    ShellRightPanelConnections: ({
      pickerRef,
      linkedMeeting,
      meetingTitle,
      onOpenMeeting,
    }: {
      pickerRef?: { current: { openMenuFromBanner: () => void } | null }
      linkedMeeting?: { meetingItemId: string; spaceId: string } | null
      meetingTitle?: string | null
      onOpenMeeting?: () => void
    }) => {
      useImperativeHandle(pickerRef, () => ({ openMenuFromBanner: mocks.openScopePicker }))
      const title = meetingTitle?.trim() || 'Meeting'
      return (
        <section aria-label="Connections">
          <h3>Connections</h3>
          {linkedMeeting ? (
            <button type="button" onClick={onOpenMeeting} aria-label={`Open ${title}`}>
              {title}
            </button>
          ) : null}
        </section>
      )
    },
  }
})

describe('ShellRightPanel', () => {
  afterEach(cleanup)

  beforeEach(() => {
    mocks.shellState.rightPanel.open = true
    mocks.shellState.conversationScopePickerRequestNonce = 0
    mocks.shellState.lastWorkAreaPageByConversation = {}
    mocks.meetingContext = null
    mocks.conversations = []
    vi.clearAllMocks()
  })

  it('shows only the Tasks section when no chat is active', async () => {
    render(<ShellRightPanel conversationId={null} />)

    expect(await screen.findByRole('heading', { name: 'Tasks' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Outputs' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Sources' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Connections' })).not.toBeInTheDocument()
    expect(screen.getByTestId('tasks-context')).toHaveTextContent('home')
    // No card chrome of its own — the top-bar summary toggle owns open/close.
    expect(screen.queryByRole('button', { name: 'Close work summary' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument()
  })

  it('stacks Connections, Outputs, Sources, and Tasks sections for an active conversation', async () => {
    render(<ShellRightPanel conversationId="conversation-1" showScope />)

    expect(await screen.findByRole('heading', { name: 'Outputs' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tasks' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Connections' })).toBeInTheDocument()
    expect(screen.queryByText('Campaign & space')).not.toBeInTheDocument()
    // The create entry point rides the Outputs section header.
    const outputs = screen.getByRole('region', { name: 'Outputs' })
    expect(within(outputs).getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })

  it('opens sections that have content and folds away the ones that do not', async () => {
    render(<ShellRightPanel conversationId="conversation-1" showScope />)

    // Empty Outputs / Tasks stay collapsed until they have rows or the user asks.
    const tasks = await screen.findByRole('button', { name: 'Tasks' })
    expect(tasks).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('tasks-context')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Outputs' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.queryByText('Chat files')).not.toBeInTheDocument()

    // An explicit toggle still wins over the emptiness default.
    fireEvent.click(tasks)
    expect(tasks).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('tasks-context')).toHaveTextContent('conversation-1')
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
    expect(panel.parentElement).toHaveAttribute('data-summary-placement', 'overlay')
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

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.queryByTestId('create-catalog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Outputs' })).toBeInTheDocument()
  })

  it('links a meeting conversation back to its meeting workspace', async () => {
    mocks.conversations = [
      {
        id: 'conversation-1',
        title: 'Write my post-call recap message for the client',
        metadata: {
          context_type: 'meeting',
          meeting_item_id: 'meeting-item-1',
          space_id: 'space-1',
          meeting_title: 'Client launch review',
        },
      },
    ]

    render(<ShellRightPanel conversationId="conversation-1" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Open Client launch review' }))

    expect(mocks.shellState.setWorkAreaOpen).toHaveBeenCalledWith(true)
    expect(mocks.routerPush).toHaveBeenCalledWith(
      '/home/meetings?meeting=meeting-item-1&space=space-1',
    )
  })

  it('does not label the meeting connection with the recap or chat title', async () => {
    mocks.conversations = [
      {
        id: 'conversation-1',
        title: 'Write my post-call recap message for the client',
        metadata: {
          context_type: 'meeting',
          meeting_item_id: 'meeting-item-1',
          space_id: 'space-1',
        },
      },
    ]

    render(<ShellRightPanel conversationId="conversation-1" />)

    expect(await screen.findByRole('button', { name: 'Open Meeting' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'Open Write my post-call recap message for the client',
      }),
    ).toBeNull()
  })

  it('prefers the live meeting context over conversation metadata', async () => {
    mocks.meetingContext = {
      spaceId: 'space-live',
      meetingItemId: 'meeting-live',
      conversationId: 'conversation-1',
      meetingTitle: 'ROAS onboarding, Samin AI education scale',
    }

    render(<ShellRightPanel conversationId="conversation-1" />)

    fireEvent.click(
      await screen.findByRole('button', { name: 'Open ROAS onboarding, Samin AI education scale' }),
    )

    expect(mocks.routerPush).toHaveBeenCalledWith(
      '/home/meetings?meeting=meeting-live&space=space-live',
    )
  })

  it('shows no meeting link for a plain conversation', async () => {
    render(<ShellRightPanel conversationId="conversation-1" />)

    expect(await screen.findByRole('heading', { name: 'Outputs' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open meeting workspace' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Connections' })).not.toBeInTheDocument()
  })

  it('opens the campaign and space picker when the guidance prompt requests it', async () => {
    mocks.shellState.conversationScopePickerRequestNonce = 1

    render(<ShellRightPanel conversationId="conversation-1" showScope />)

    await waitFor(() => expect(mocks.openScopePicker).toHaveBeenCalledTimes(1))
  })

  it('docks the same rounded card in-flow instead of a full-height divider column', async () => {
    render(<ShellRightPanel conversationId="conversation-1" placement="docked" />)

    const panel = await screen.findByRole('complementary', { name: 'Work summary' })
    expect(panel.parentElement).toHaveAttribute('data-summary-placement', 'docked')
    expect(panel.parentElement).toHaveClass('self-start', 'px-spacing-2', 'pb-spacing-2')
    expect(panel.parentElement).not.toHaveClass('pt-spacing-12')
    expect(panel.parentElement).not.toHaveClass('absolute')
    expect(panel).toHaveClass('dropdown-menu-solid')
    expect(panel).not.toHaveClass('h-full', 'border-l')
  })

  it('collapses a section and keeps its action reachable', async () => {
    render(<ShellRightPanel conversationId="conversation-1" />)

    const outputs = await screen.findByRole('button', { name: 'Outputs' })
    expect(outputs).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Chat files')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()

    fireEvent.click(outputs)

    expect(outputs).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Chat files')).toBeInTheDocument()

    fireEvent.click(outputs)

    expect(outputs).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Chat files')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })
})
