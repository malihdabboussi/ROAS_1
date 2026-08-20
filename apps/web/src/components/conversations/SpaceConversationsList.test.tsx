import { Profiler, useState, type HTMLAttributes, type ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Conversation } from '@/lib/conversations'
import { SpaceConversationsList } from './SpaceConversationsList'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      animate: _animate,
      initial: _initial,
      transition: _transition,
      ...props
    }: HTMLAttributes<HTMLDivElement> & {
      animate?: unknown
      initial?: unknown
      transition?: unknown
    }) => <div {...props}>{children}</div>,
  },
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('./ConversationActionsMenu', () => ({
  ConversationActionsMenu: () => null,
}))

const nowIso = () => new Date().toISOString()

function conversation(overrides: Partial<Conversation> & { id: string }): Conversation {
  const activityAt = overrides.last_message_at ?? overrides.updated_at ?? nowIso()
  return {
    user_id: 'user-1',
    campaign_id: null,
    title: 'Untitled',
    agent_id: 'vibey',
    status: 'active',
    metadata: {},
    effective_level: 'admin',
    ...overrides,
    id: overrides.id,
    created_at: overrides.created_at ?? activityAt,
    updated_at: overrides.updated_at ?? activityAt,
    last_message_at:
      overrides.last_message_at !== undefined ? overrides.last_message_at : activityAt,
  }
}

const conversations = [
  conversation({
    id: 'pinned-1',
    title: 'Chat with ROAS',
    agent_id: 'atlas',
    metadata: { pinned: true },
  }),
  conversation({
    id: 'today-1',
    title: 'Launch plan',
    agent_id: 'loop',
  }),
  conversation({
    id: 'archived-1',
    title: 'Archived note',
    agent_id: 'hr',
    status: 'archived',
  }),
]

type SpaceConversationsListProps = React.ComponentProps<typeof SpaceConversationsList>

function baseProps(
  overrides: Partial<SpaceConversationsListProps> = {},
): SpaceConversationsListProps {
  return {
    conversations,
    conversationRuntimeById: {
      'today-1': {
        isRunning: true,
        phase: 'thinking',
        statusMessage: 'Thinking through it',
        toolLabel: null,
      },
    },
    selectedConversationId: 'today-1',
    query: '',
    onQueryChange: vi.fn(),
    onSelectConversation: vi.fn(),
    onNewConversation: vi.fn(),
    onDeleteConversation: vi.fn(),
    onRenameConversation: vi.fn(),
    onTogglePinConversation: vi.fn(),
    onToggleArchiveConversation: vi.fn(),
    onMoveConversation: vi.fn(),
    onDuplicateConversation: vi.fn(),
    onCopyConversationLink: vi.fn(),
    onShareConversation: vi.fn(),
    onBack: vi.fn(),
    loading: false,
    isOrgContext: true,
    showAllAgentsToggle: true,
    allAgentsMode: false,
    onAllAgentsModeChange: vi.fn(),
    agentByKey: {
      atlas: { name: 'Atlas', avatarUrl: null },
      loop: { name: 'Loop', avatarUrl: null },
      hr: { name: 'HR', avatarUrl: null },
    },
    ...overrides,
  }
}

function StatefulList({ allAgentsMode = false }: { allAgentsMode?: boolean }) {
  const [query, setQuery] = useState('')
  const [allAgents, setAllAgents] = useState(allAgentsMode)

  return (
    <SpaceConversationsList
      {...baseProps({
        query,
        onQueryChange: setQuery,
        allAgentsMode: allAgents,
        onAllAgentsModeChange: setAllAgents,
      })}
    />
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('SpaceConversationsList', () => {
  it('renders grouped conversations and preserves row interactions', () => {
    const onSelectConversation = vi.fn()

    render(<SpaceConversationsList {...baseProps({ onSelectConversation, groupBy: 'date' })} />)

    expect(screen.getByText('Today')).toBeTruthy()
    expect(screen.getByText('Untitled conversation')).toBeTruthy()
    expect(screen.getByText('Thinking through it')).toBeTruthy()
    expect(screen.getByRole('status', { name: 'Working' })).toBeTruthy()

    fireEvent.click(screen.getByText('Launch plan'))

    expect(onSelectConversation).toHaveBeenCalledWith('today-1')
  })

  it('shows one prioritized activity indicator per conversation', () => {
    render(
      <SpaceConversationsList
        {...baseProps({
          conversations: [
            conversation({
              id: 'action-1',
              title: 'Approve campaign',
              needs_action: true,
              is_unread: true,
            }),
            conversation({ id: 'unread-1', title: 'Fresh result', is_unread: true }),
            conversation({ id: 'idle-1', title: 'Already read' }),
          ],
          conversationRuntimeById: {
            'action-1': { isRunning: true, phase: 'thinking' },
          },
        })}
      />,
    )

    expect(screen.getByRole('status', { name: 'Needs your action' })).toBeTruthy()
    expect(screen.getByRole('status', { name: 'New activity' })).toBeTruthy()
    expect(screen.queryAllByRole('status')).toHaveLength(2)
  })

  it('filters by all-agent names and settles without render churn', () => {
    let commitCount = 0

    render(
      <Profiler id="space-conversations-list" onRender={() => commitCount++}>
        <StatefulList allAgentsMode />
      </Profiler>,
    )

    fireEvent.change(screen.getByPlaceholderText('Search'), {
      target: { value: 'Atlas' },
    })

    expect(screen.getByText('Untitled conversation')).toBeTruthy()
    expect(screen.queryByText('Launch plan')).toBeNull()
    expect(commitCount).toBeLessThan(12)
  })

  it('keeps New as a full-width control under the shell history toolbar', () => {
    const onNewConversation = vi.fn()

    render(
      <SpaceConversationsList
        {...baseProps({
          hideHeaderBottomBorder: true,
          newButtonBelowSearch: true,
          onNewConversation,
        })}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'New chat' }))

    expect(onNewConversation).toHaveBeenCalledTimes(1)
  })

  it('keeps history rows compact and shows Cursor-style relative age', () => {
    render(
      <SpaceConversationsList
        {...baseProps({
          conversations: [
            conversation({
              id: 'spaces-1',
              title: 'Consolidate and improve Spaces',
              updated_at: new Date().toISOString(),
            }),
          ],
          selectedConversationId: 'spaces-1',
          leadingIcon: 'none',
        })}
      />,
    )

    const title = screen.getByText('Consolidate and improve Spaces')
    expect(title).toHaveClass('body-3')
    expect(title.closest('div[title]')).toHaveClass('px-spacing-1', 'py-spacing-1', 'gap-spacing-2')
    expect(screen.getByText('now')).toBeInTheDocument()
  })

  it('marks meeting chats without repeating the legacy title prefix', () => {
    render(
      <SpaceConversationsList
        {...baseProps({
          conversations: [
            conversation({
              id: 'meeting-1',
              title: 'Meeting — Client launch review',
              metadata: { context_type: 'meeting', meeting_item_id: 'item-1' },
            }),
            conversation({ id: 'chat-1', title: 'Post-call recap' }),
          ],
          showConversationTypeIcon: true,
          leadingIcon: 'none',
        })}
      />,
    )

    expect(screen.getByText('Client launch review')).toBeInTheDocument()
    expect(screen.queryByText('Meeting — Client launch review')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Meeting conversation')).toBeInTheDocument()
    expect(screen.getByLabelText('Chat conversation')).toBeInTheDocument()
  })

  it('shows Slack and meeting logos in the identity slot without a generic chat dot', () => {
    render(
      <SpaceConversationsList
        {...baseProps({
          conversations: [
            conversation({
              id: 'slack-1',
              title: 'Launch thread',
              metadata: { source: 'slack' },
            }),
            conversation({
              id: 'meeting-1',
              title: 'Client launch review',
              metadata: { context_type: 'meeting', meeting_item_id: 'item-1' },
            }),
            conversation({ id: 'chat-1', title: 'Post-call recap' }),
          ],
          leadingIcon: 'logo',
        })}
      />,
    )

    expect(screen.getByLabelText('Slack conversation')).toBeInTheDocument()
    expect(screen.getByLabelText('Meeting conversation')).toBeInTheDocument()
    expect(screen.queryByLabelText('Chat conversation')).not.toBeInTheDocument()
  })

  it('pins unread onto Slack and meeting logos instead of indenting the title', () => {
    render(
      <SpaceConversationsList
        {...baseProps({
          conversations: [
            conversation({
              id: 'slack-unread',
              title: 'Launch thread',
              is_unread: true,
              metadata: { source: 'slack' },
            }),
            conversation({
              id: 'meeting-unread',
              title: 'Client launch review',
              is_unread: true,
              metadata: { context_type: 'meeting', meeting_item_id: 'item-1' },
            }),
            conversation({
              id: 'chat-unread',
              title: 'Post-call recap',
              is_unread: true,
            }),
          ],
          leadingIcon: 'logo',
        })}
      />,
    )

    const slackRow = screen.getByText('Launch thread').closest('div[title]')
    const meetingRow = screen.getByText('Client launch review').closest('div[title]')
    const chatRow = screen.getByText('Post-call recap').closest('div[title]')
    expect(slackRow).toBeTruthy()
    expect(meetingRow).toBeTruthy()
    expect(chatRow).toBeTruthy()

    const slackUnread = slackRow!.querySelector('[aria-label="New activity"]')
    const meetingUnread = meetingRow!.querySelector('[aria-label="New activity"]')
    const chatUnread = chatRow!.querySelector('[aria-label="New activity"]')
    expect(slackUnread).toHaveClass('absolute')
    expect(meetingUnread).toHaveClass('absolute')
    expect(chatUnread).toHaveClass('relative')
    expect(chatUnread).not.toHaveClass('absolute')
    expect(
      slackRow!.querySelector('[aria-label="Slack conversation"]')?.parentElement,
    ).toContainElement(slackUnread as HTMLElement)
    expect(
      meetingRow!.querySelector('[aria-label="Meeting conversation"]')?.parentElement,
    ).toContainElement(meetingUnread as HTMLElement)
  })

  it('adds compact sidebar gutters without the full list top gap', () => {
    const { container } = render(
      <SpaceConversationsList
        {...baseProps({
          compactHeader: true,
          compactHeaderTitle: 'Recents',
          hideHeaderBottomBorder: true,
        })}
      />,
    )

    expect(screen.getByText('Recents').closest('.flex.shrink-0.flex-col')).toHaveClass(
      'px-spacing-2',
      'pb-spacing-1',
    )
    expect(container.querySelector('.overflow-y-auto')).toHaveClass('px-spacing-2', 'py-spacing-1')
  })

  it('opens compact search on its own row below the Recents toolbar', () => {
    const { container } = render(
      <SpaceConversationsList
        {...baseProps({
          compactHeader: true,
          compactHeaderTitle: 'Recents',
          hideHeaderBottomBorder: true,
        })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Search conversations' }))

    const search = container.querySelector('[data-compact-conversation-search]')
    expect(search).toBeInTheDocument()
    expect(search?.previousElementSibling).toContainElement(screen.getByText('Recents'))
    expect(screen.getByRole('searchbox', { name: 'Search conversations' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close search' })).toBeInTheDocument()
  })
})
