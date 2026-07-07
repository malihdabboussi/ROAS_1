import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChannelMember, ChannelMessage } from '@/lib/channels'
import { ChannelThreadPanel } from './ChannelThreadPanel'

vi.mock('./ChannelComposer', () => ({
  ChannelComposer: () => <div data-testid="channel-composer" />,
}))

vi.mock('./ChannelMessageBubble', () => ({
  ChannelMessageBubble: ({ message }: { message: ChannelMessage }) => (
    <div data-testid={`message-${message.id}`}>{message.content}</div>
  ),
}))

vi.mock('./ThreadInlineProgress', () => ({
  ThreadInlineProgress: () => <div data-testid="thread-inline-progress" />,
}))

function message(overrides: Partial<ChannelMessage>): ChannelMessage {
  return {
    id: 'parent-1',
    channel_id: 'channel-1',
    sender_type: 'agent',
    sender_id: 'atlas',
    content: '',
    content_blocks: null,
    metadata: null,
    reply_to_id: null,
    thread_name: null,
    pinned: false,
    pinned_by: null,
    created_at: '2026-06-28T10:00:00.000Z',
    updated_at: '2026-06-28T10:00:00.000Z',
    ...overrides,
  }
}

const members: ChannelMember[] = [
  {
    id: 'member-agent',
    channel_id: 'channel-1',
    member_type: 'agent',
    user_id: null,
    agent_key: 'atlas',
    role: 'edit',
    added_by: null,
    joined_at: '2026-06-28T10:00:00.000Z',
    created_at: '2026-06-28T10:00:00.000Z',
    profile: null,
  },
  {
    id: 'member-user',
    channel_id: 'channel-1',
    member_type: 'user',
    user_id: 'user-1',
    agent_key: null,
    role: 'edit',
    added_by: null,
    joined_at: '2026-06-28T10:00:00.000Z',
    created_at: '2026-06-28T10:00:00.000Z',
    profile: {
      id: 'profile-1',
      full_name: 'Jordan Lee',
      avatar_url: 'https://cdn.example.com/jordan.png',
    },
  },
]

describe('ChannelThreadPanel', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows participants, deliverable count action, and settles across rerenders', () => {
    const onViewDeliverables = vi.fn()
    const messages = [
      message({
        id: 'parent-1',
        content: '![Hero](https://cdn.example.com/hero.png)',
        thread_name: 'Launch thread',
      }),
      message({
        id: 'reply-1',
        sender_type: 'user',
        sender_id: 'user-1',
        content: '[Brief](https://cdn.example.com/brief.pdf)',
        reply_to_id: 'parent-1',
        created_at: '2026-06-28T10:03:00.000Z',
      }),
    ]

    const props = {
      parentMessageId: 'parent-1',
      messages,
      members,
      currentUserId: 'user-1',
      channelId: 'channel-1',
      onClose: vi.fn(),
      onSendReply: vi.fn(),
      onEditMessage: vi.fn(),
      onDeleteMessage: vi.fn(),
      onViewDeliverables,
      onRenameThread: vi.fn(),
    }

    const { rerender } = render(<ChannelThreadPanel {...props} />)

    expect(screen.getByText('Launch thread')).toBeTruthy()
    const participantsButton = screen.getByRole('button', { name: /2 participants/i })
    fireEvent.mouseEnter(participantsButton)
    expect(screen.getByText('atlas')).toBeTruthy()
    expect(screen.getByText('Jordan Lee')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /2 media \/ deliverables/i }))
    expect(onViewDeliverables).toHaveBeenCalledTimes(1)

    rerender(<ChannelThreadPanel {...props} />)
    expect(screen.getByRole('button', { name: /2 participants/i })).toBeTruthy()
    expect(screen.getByTestId('message-parent-1')).toBeTruthy()
    expect(screen.getByTestId('message-reply-1')).toBeTruthy()
  })
})
