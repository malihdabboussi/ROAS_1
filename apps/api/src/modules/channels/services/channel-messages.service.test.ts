import { describe, expect, it, vi } from 'vitest'
import type { ChannelMessageRow, ChannelRow } from '../repositories/channels.repository'
import { ChannelMessagesService } from './channel-messages.service'

function createChannel(): ChannelRow {
  return {
    id: 'channel-1',
    org_id: 'org-1',
    user_id: 'user-1',
    name: 'Launch',
    description: null,
    is_private: false,
    metadata: null,
    created_at: '2026-06-17T00:00:00.000Z',
    updated_at: '2026-06-17T00:00:00.000Z',
  }
}

function createMessage(): ChannelMessageRow {
  return {
    id: 'message-1',
    channel_id: 'channel-1',
    sender_type: 'agent',
    sender_id: 'ceo',
    content: null,
    content_blocks: null,
    metadata: { existing: true },
    reply_to_id: null,
    thread_name: null,
    pinned: false,
    pinned_by: null,
    created_at: '2026-06-17T00:00:00.000Z',
    updated_at: '2026-06-17T00:00:00.000Z',
  }
}

function createService(
  overrides: {
    channel?: ChannelRow
    message?: ChannelMessageRow
    repository?: Record<string, unknown>
    invocation?: Record<string, unknown>
    serviceClient?: Record<string, unknown>
    spaceRetrievalIndex?: Record<string, unknown>
  } = {},
) {
  const channel = overrides.channel ?? createChannel()
  const message = overrides.message ?? createMessage()
  const channelsRepository = {
    findChannelById: vi.fn().mockResolvedValue(channel),
    findMessageById: vi.fn().mockResolvedValue(message),
    findUserMembership: vi.fn(),
    createMessage: vi.fn().mockResolvedValue(message),
    updateMessage: vi.fn().mockResolvedValue(message),
    getThreadParticipants: vi.fn().mockResolvedValue({
      humanSenderIds: [],
      agentSenderIds: [],
    }),
    ...overrides.repository,
  }
  const channelAgentInvocation = {
    resolveMessageScope: vi.fn().mockResolvedValue(null),
    invokeAgent: vi.fn().mockResolvedValue(undefined),
    invokeBrainstorm: vi.fn().mockResolvedValue(undefined),
    stampAutoInvokeMetadata: vi.fn().mockResolvedValue(undefined),
    retryAgentInvocation: vi.fn().mockResolvedValue({ accepted: true }),
    ...overrides.invocation,
  }
  const service = new ChannelMessagesService(
    channelsRepository as never,
    { hasMinimumRole: vi.fn() } as never,
    { logError: vi.fn() } as never,
    { client: overrides.serviceClient ?? {} } as never,
    { assertHasAvailableCredits: vi.fn().mockResolvedValue(undefined) } as never,
    channelAgentInvocation as never,
    overrides.spaceRetrievalIndex as never,
  )

  return { service, channelsRepository, channelAgentInvocation }
}

describe('ChannelMessagesService', () => {
  it('creates scoped user messages and invokes explicit agent mentions', async () => {
    const message = { ...createMessage(), sender_type: 'user' as const, sender_id: 'user-1' }
    const spaceRetrievalIndex = { indexSource: vi.fn().mockResolvedValue(undefined) }
    const messageScope = {
      space_id: 'space-1',
      campaign_id: 'campaign-1',
      scope_kind: 'campaign' as const,
    }
    const { service, channelsRepository, channelAgentInvocation } = createService({
      message,
      invocation: { resolveMessageScope: vi.fn().mockResolvedValue(messageScope) },
      spaceRetrievalIndex,
    })

    await expect(
      service.sendMessage(
        {} as never,
        { userId: 'user-1', orgId: 'org-1' } as never,
        'channel-1',
        {
          content: '  Run this  ',
          mentions: [{ type: 'agent', agent_key: 'ceo' }],
          attachments: ['https://example.com/file.png'],
          space_id: 'space-1',
        },
      ),
    ).resolves.toEqual({ message })

    expect(channelsRepository.createMessage).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        channel_id: 'channel-1',
        sender_type: 'user',
        sender_id: 'user-1',
        content: 'Run this',
        metadata: {
          mentions: [{ type: 'agent', agent_key: 'ceo' }],
          attachments: ['https://example.com/file.png'],
          space_id: 'space-1',
          campaign_id: 'campaign-1',
          scope_kind: 'campaign',
          agent_status: { ceo: 'acknowledged' },
          agent_invoked_at: expect.any(String),
        },
      }),
    )
    expect(spaceRetrievalIndex.indexSource).toHaveBeenCalledWith(
      {},
      {
        sourceType: 'channel_message',
        sourceId: 'message-1',
        userId: 'user-1',
        orgId: 'org-1',
        spaceId: 'space-1',
      },
    )
    expect(channelAgentInvocation.invokeAgent).toHaveBeenCalledWith({
      channel_id: 'channel-1',
      message_id: 'message-1',
      agent_key: 'ceo',
      user_id: 'user-1',
      org_id: 'org-1',
      scope: messageScope,
    })
  })

  it('auto-invokes the single thread agent when replying in a one-on-one thread', async () => {
    const message = { ...createMessage(), sender_type: 'user' as const, sender_id: 'user-1' }
    const parent = { ...createMessage(), id: 'parent-1', metadata: {} }
    const { service, channelsRepository, channelAgentInvocation } = createService({
      message,
      repository: {
        findMessageById: vi.fn().mockResolvedValue(parent),
        getThreadParticipants: vi.fn().mockResolvedValue({
          humanSenderIds: ['user-1'],
          agentSenderIds: ['ceo'],
        }),
      },
    })

    await expect(
      service.sendMessage(
        {} as never,
        { userId: 'user-1', orgId: 'org-1' } as never,
        'channel-1',
        { content: 'Again', reply_to_id: 'parent-1' },
      ),
    ).resolves.toEqual({ message })

    expect(channelsRepository.getThreadParticipants).toHaveBeenCalledWith({}, 'parent-1')
    expect(channelAgentInvocation.invokeAgent).toHaveBeenCalledWith({
      channel_id: 'channel-1',
      message_id: 'message-1',
      agent_key: 'ceo',
      user_id: 'user-1',
      org_id: 'org-1',
      scope: null,
    })
    expect(channelAgentInvocation.stampAutoInvokeMetadata).toHaveBeenCalledWith(
      'message-1',
      ['ceo'],
      {},
    )
  })

  it('patches message metadata without dropping existing metadata', async () => {
    const message = createMessage()
    let savedMetadata: Record<string, unknown> | null = null
    const channelsRepository = {
      findChannelById: vi.fn().mockResolvedValue(createChannel()),
      findMessageById: vi.fn().mockResolvedValue(message),
      findUserMembership: vi.fn(),
      updateMessage: vi.fn().mockImplementation(async (_supabase, _messageId, updates) => {
        savedMetadata = updates.metadata
        return { ...message, ...updates }
      }),
    }
    const serviceClient = {
      from: vi.fn(() => {
        const builder = {
          update: vi.fn((payload: { metadata: Record<string, unknown> }) => {
            savedMetadata = payload.metadata
            return builder
          }),
          eq: vi.fn(() => builder),
        }
        return builder
      }),
    }
    const service = new ChannelMessagesService(
      channelsRepository as never,
      { hasMinimumRole: vi.fn() } as never,
      { logError: vi.fn() } as never,
      { client: serviceClient } as never,
      {} as never,
      {} as never,
    )

    await expect(
      service.patchMessageMetadata(
        {} as never,
        { userId: 'user-1', orgId: 'org-1' } as never,
        'channel-1',
        'message-1',
        { content_blocks_ordered: [{ id: 'block-1', confirmed: true }] },
      ),
    ).resolves.toEqual({ success: true })

    expect(savedMetadata).toEqual({
      existing: true,
      content_blocks_ordered: [{ id: 'block-1', confirmed: true }],
    })
  })
})
