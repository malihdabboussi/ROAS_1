import { Profiler, type HTMLAttributes, type ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Conversation } from '@/lib/conversations'
import { SpaceConversationsList } from './SpaceConversationsListAdapter'

const chatStoreMock = vi.hoisted(() => {
  const state = {
    streamingConversationIds: ['conversation-1'],
    conversationStreamUI: {
      'conversation-1': {
        agentPhase: 'thinking',
        agentStatusMessage: 'Thinking through it',
        activeTools: [],
      },
    },
  }
  const useChatStore = Object.assign(
    (selector: (nextState: typeof state) => unknown) => selector(state),
    { getState: () => state },
  )
  return { useChatStore }
})

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

vi.mock('@/lib/chat/studio-chat-runtime-adapter', () => ({
  useChatStore: chatStoreMock.useChatStore,
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
    title: 'Launch plan',
    agent_id: 'vibey',
    status: 'active',
    metadata: {},
    created_at: nowIso(),
    updated_at: nowIso(),
    effective_level: 'admin',
    ...rest,
  }
}

type SpaceConversationsListProps = React.ComponentProps<typeof SpaceConversationsList>

function baseProps(
  overrides: Partial<SpaceConversationsListProps> = {},
): SpaceConversationsListProps {
  return {
    conversations: [conversation({ id: 'conversation-1' })],
    selectedConversationId: 'conversation-1',
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
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('SpaceConversationsListAdapter', () => {
  it('keeps Studio stream row state at the transitional adapter boundary', () => {
    let commitCount = 0

    render(
      <Profiler id="space-conversations-list-adapter" onRender={() => commitCount++}>
        <SpaceConversationsList {...baseProps()} />
      </Profiler>,
    )

    expect(screen.getByText('Launch plan')).toBeTruthy()
    expect(screen.getByText('Thinking through it')).toBeTruthy()
    expect(screen.getByTestId('chat-orb')).toBeTruthy()
    expect(commitCount).toBeLessThan(8)
  })
})
