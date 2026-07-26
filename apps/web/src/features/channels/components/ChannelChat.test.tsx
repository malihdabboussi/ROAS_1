import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Channel, ChannelMember, ChannelMessage } from '@/lib/channels'
import { ChannelChat } from './ChannelChat'

vi.mock('./ChannelComposer', () => ({
  ChannelComposer: ({ channelId }: { channelId: string }) => (
    <div data-testid="channel-composer" data-channel-id={channelId} />
  ),
}))

vi.mock('./ChannelContextTab', () => ({
  ChannelContextTab: ({ channel }: { channel: Channel }) => (
    <div data-testid="channel-context-tab">{channel.name}</div>
  ),
}))

vi.mock('./ChannelHeader', () => ({
  ChannelHeader: ({
    channel,
    onOpenContextTab,
  }: {
    channel: Channel
    onOpenContextTab: () => void
  }) => (
    <div data-testid="channel-header">
      <span>{channel.name}</span>
      <button type="button" onClick={onOpenContextTab}>
        Open context
      </button>
    </div>
  ),
}))

vi.mock('./ChannelMessageBubble', () => ({
  ChannelMessageBubble: ({
    message,
    senderLabel,
    avatarUrl,
    replyCount,
    replyAvatars,
    lastReplyTime,
    onOpenThread,
  }: {
    message: ChannelMessage
    senderLabel: string
    avatarUrl: string | null
    replyCount?: number
    replyAvatars?: { url: string | null; label: string }[]
    lastReplyTime?: string | null
    onOpenThread?: () => void
  }) => (
    <div
      data-testid={`message-${message.id}`}
      data-sender={senderLabel}
      data-avatar={avatarUrl ?? ''}
      data-reply-count={replyCount ?? 0}
      data-reply-avatar-label={replyAvatars?.[0]?.label ?? ''}
      data-last-reply-time={lastReplyTime ?? ''}
    >
      {message.content}
      {onOpenThread && (
        <button type="button" onClick={onOpenThread}>
          Open thread
        </button>
      )}
    </div>
  ),
}))

vi.mock('./DeliverablesView', () => ({
  DeliverablesView: ({
    threadFilterId,
    onClearThreadFilter,
  }: {
    threadFilterId?: string | null
    onClearThreadFilter?: () => void
  }) => (
    <div data-testid="deliverables-view" data-thread-filter={threadFilterId ?? ''}>
      <button type="button" onClick={onClearThreadFilter}>
        Clear thread filter
      </button>
    </div>
  ),
}))

const channel: Channel = {
  id: 'channel-1',
  org_id: null,
  user_id: 'owner-1',
  name: 'Launch',
  description: null,
  is_private: false,
  metadata: null,
  created_at: '2026-06-28T10:00:00.000Z',
  updated_at: '2026-06-28T10:00:00.000Z',
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

function message(overrides: Partial<ChannelMessage>): ChannelMessage {
  return {
    id: 'msg-1',
    channel_id: 'channel-1',
    sender_type: 'agent',
    sender_id: 'atlas',
    content: 'Launch update',
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

const messages = [
  message({ id: 'msg-1', content: 'Launch update' }),
  message({
    id: 'reply-1',
    sender_type: 'user',
    sender_id: 'user-1',
    content: 'Reply update',
    reply_to_id: 'msg-1',
    created_at: '2026-06-28T10:03:00.000Z',
  }),
]

function renderChannelChat(overrides: Partial<React.ComponentProps<typeof ChannelChat>> = {}) {
  return render(
    <ChannelChat
      channel={channel}
      members={members}
      messages={messages}
      pinnedMessages={[messages[0]!]}
      currentUserId="user-1"
      rosterAvatars={new Map([['atlas', 'https://cdn.example.com/atlas.png']])}
      onSendMessage={vi.fn()}
      onEditMessage={vi.fn()}
      onDeleteMessage={vi.fn()}
      onOpenAddMembers={vi.fn()}
      onRenameChannel={vi.fn()}
      {...overrides}
    />,
  )
}

describe('ChannelChat', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders message orchestration, switches tabs, and settles across rerenders', async () => {
    const onOpenThread = vi.fn()
    const onClearDeliverableFilter = vi.fn()
    const onViewStateChange = vi.fn()

    const { container, rerender } = renderChannelChat({
      onOpenThread,
      onClearDeliverableFilter,
      onViewStateChange,
    })

    expect(container.querySelector('section')?.classList.contains('min-w-0')).toBe(true)
    expect(screen.getByTestId('channel-header').textContent).toContain('Launch')
    expect(screen.getByText('1 pinned message')).toBeTruthy()
    expect(screen.getByTestId('channel-composer').getAttribute('data-channel-id')).toBe('channel-1')

    const parentMessage = screen.getByTestId('message-msg-1')
    expect(parentMessage.getAttribute('data-sender')).toBe('atlas')
    expect(parentMessage.getAttribute('data-avatar')).toBe('https://cdn.example.com/atlas.png')
    expect(parentMessage.getAttribute('data-reply-count')).toBe('1')
    expect(parentMessage.getAttribute('data-reply-avatar-label')).toBe('Jordan Lee')

    fireEvent.click(screen.getByRole('button', { name: /Open thread/i }))
    expect(onOpenThread).toHaveBeenCalledWith('msg-1')

    fireEvent.click(screen.getByRole('button', { name: /Media \/ Deliverables/i }))
    expect(screen.getByTestId('deliverables-view').getAttribute('data-thread-filter')).toBe('')

    fireEvent.click(screen.getByRole('button', { name: /Open context/i }))
    expect(screen.getByTestId('channel-context-tab').textContent).toContain('Launch')

    rerender(
      <ChannelChat
        channel={channel}
        members={members}
        messages={messages}
        pinnedMessages={[messages[0]!]}
        currentUserId="user-1"
        rosterAvatars={new Map([['atlas', 'https://cdn.example.com/atlas.png']])}
        deliverableThreadFilter="msg-1"
        onClearDeliverableFilter={onClearDeliverableFilter}
        onSendMessage={vi.fn()}
        onEditMessage={vi.fn()}
        onDeleteMessage={vi.fn()}
        onOpenAddMembers={vi.fn()}
        onRenameChannel={vi.fn()}
        onOpenThread={onOpenThread}
        onViewStateChange={onViewStateChange}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('deliverables-view').getAttribute('data-thread-filter')).toBe(
        'msg-1',
      )
    })
    expect(onViewStateChange.mock.calls.length).toBeLessThan(12)
  })

  it('shows the unavailable channel fallback', () => {
    renderChannelChat({ channel: null })

    expect(screen.getByText(/This channel isn't available/i)).toBeTruthy()
  })
})
