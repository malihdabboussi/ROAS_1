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

vi.mock('@/components/vibey/vibey-chat-orb', () => ({
  VibeyChatOrb: () => <span data-testid="chat-orb" />,
}))

vi.mock('./ConversationActionsMenu', () => ({
  ConversationActionsMenu: () => null,
}))

const nowIso = () => new Date().toISOString()

function conversation(overrides: Partial<Conversation> & { id: string }): Conversation {
  const { id, ...rest } = overrides
  return {
    id,
    user_id: 'user-1',
    campaign_id: null,
    title: 'Untitled',
    agent_id: 'vibey',
    status: 'active',
    metadata: {},
    created_at: nowIso(),
    updated_at: nowIso(),
    effective_level: 'admin',
    ...rest,
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

    render(<SpaceConversationsList {...baseProps({ onSelectConversation })} />)

    expect(screen.getByText('Pinned')).toBeTruthy()
    expect(screen.getByText('Today')).toBeTruthy()
    expect(screen.getByText('Archived')).toBeTruthy()
    expect(screen.getByText('Untitled conversation')).toBeTruthy()
    expect(screen.getByText('Thinking through it')).toBeTruthy()
    expect(screen.getByTestId('chat-orb')).toBeTruthy()

    fireEvent.click(screen.getByText('Launch plan'))

    expect(onSelectConversation).toHaveBeenCalledWith('today-1')
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
})
