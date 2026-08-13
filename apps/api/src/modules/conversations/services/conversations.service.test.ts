import { describe, expect, it, vi } from 'vitest'
import { ConversationMessagesService } from './conversation-messages.service'
import { ConversationsService } from './conversations.service'

function createConversation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'conv-1',
    user_id: 'user-1',
    org_id: 'org-1',
    title: 'Launch chat',
    campaign_id: 'campaign-1',
    agent_id: 'ceo',
    default_model_id: 'model-1',
    metadata: { existing: true, response_chain_last: { provider_response_id: 'old' } },
    ...overrides,
  }
}

function createService(
  overrides: {
    conversation?: Record<string, unknown>
    conversationsRepo?: Record<string, unknown>
    messagesRepo?: Record<string, unknown>
    permissionsService?: Record<string, unknown>
  } = {},
) {
  const conversation = overrides.conversation ?? createConversation()
  const conversationsRepo = {
    findByIdOrgScoped: vi.fn().mockResolvedValue(conversation),
    findByIdScoped: vi.fn().mockResolvedValue(conversation),
    create: vi.fn().mockResolvedValue({ ...conversation, id: 'conv-fork' }),
    update: vi.fn().mockResolvedValue(conversation),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides.conversationsRepo,
  }
  const messagesRepo = {
    findByConversationId: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue({
      id: 'msg-1',
      conversation_id: 'conv-1',
      metadata: { existing: true },
    }),
    create: vi.fn().mockResolvedValue({
      id: 'mission-1',
      conversation_id: 'conv-1',
      role: 'assistant',
      content: 'Quick Mission started: **Static Ad Production**.',
      metadata: {
        quick_mission_receipt: true,
        mission_id: 'mission-1',
      },
    }),
    createIdempotent: vi.fn().mockResolvedValue({
      id: 'mission-1',
      conversation_id: 'conv-1',
      role: 'assistant',
      content: 'Quick Mission started: **Static Ad Production**.',
      metadata: {
        quick_mission_receipt: true,
        mission_id: 'mission-1',
      },
    }),
    update: vi.fn().mockResolvedValue(undefined),
    findUpToMessage: vi.fn().mockResolvedValue([]),
    bulkCreate: vi.fn().mockResolvedValue([]),
    deleteFrom: vi.fn().mockResolvedValue(undefined),
    ...overrides.messagesRepo,
  }
  const permissionsService = {
    assertCanAccessConversation: vi.fn().mockResolvedValue('edit'),
    resolveEffectiveLevelsForRows: vi.fn().mockResolvedValue(new Map()),
    ...overrides.permissionsService,
  }
  const conversationMessages = new ConversationMessagesService(
    conversationsRepo as never,
    messagesRepo as never,
    permissionsService as never,
  )
  const service = new ConversationsService(
    conversationsRepo as never,
    permissionsService as never,
    {} as never,
    {} as never,
    conversationMessages as never,
    messagesRepo as never,
  )

  return { service, conversationMessages, conversationsRepo, messagesRepo, permissionsService }
}

describe('ConversationsService message workflows', () => {
  it('loads messages after view permission and org-scoped conversation lookup', async () => {
    const rows = [{ id: 'msg-1', conversation_id: 'conv-1', role: 'user', content: 'Hi' }]
    const { service, conversationsRepo, messagesRepo, permissionsService } = createService({
      messagesRepo: { findByConversationId: vi.fn().mockResolvedValue(rows) },
    })

    await expect(
      service.getMessages(
        {} as never,
        'user-1',
        'conv-1',
        { before: '2026-06-17T00:00:00.000Z', limit: 25 },
        'org-1',
        'editor',
      ),
    ).resolves.toEqual(rows)

    expect(permissionsService.assertCanAccessConversation).toHaveBeenCalledWith(
      {},
      'user-1',
      'editor',
      'conv-1',
      'view',
      'org-1',
    )
    expect(conversationsRepo.findByIdOrgScoped).toHaveBeenCalledWith({}, 'conv-1', 'org-1')
    expect(messagesRepo.findByConversationId).toHaveBeenCalledWith({}, 'conv-1', {
      before: '2026-06-17T00:00:00.000Z',
      limit: 25,
    })
  })

  it('patches message metadata without dropping existing metadata', async () => {
    const { service, messagesRepo } = createService()

    await expect(
      service.patchMessageMetadata(
        {} as never,
        'user-1',
        'conv-1',
        'msg-1',
        { content_blocks_ordered: [{ id: 'block-1', confirmed: true }] },
        'org-1',
        'editor',
      ),
    ).resolves.toEqual({ success: true })

    expect(messagesRepo.update).toHaveBeenCalledWith({}, 'msg-1', {
      metadata: {
        existing: true,
        content_blocks_ordered: [{ id: 'block-1', confirmed: true }],
      },
    })
  })

  it('persists one typed mission receipt in the originating conversation', async () => {
    const { conversationMessages, conversationsRepo, messagesRepo, permissionsService } =
      createService()

    await conversationMessages.createMissionReceipt(
      {} as never,
      'user-1',
      'conv-1',
      {
        mission_id: 'mission-1',
        mission_title: 'Static Ad Production',
        space_id: 'space-1',
      },
      'org-1',
      'editor',
    )

    expect(permissionsService.assertCanAccessConversation).toHaveBeenCalledWith(
      {},
      'user-1',
      'editor',
      'conv-1',
      'edit',
      'org-1',
    )
    expect(conversationsRepo.findByIdOrgScoped).not.toHaveBeenCalled()
    expect(messagesRepo.createIdempotent).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        id: 'mission-1',
        conversation_id: 'conv-1',
        role: 'assistant',
        content: 'Quick Mission started: **Static Ad Production**.',
        metadata: expect.objectContaining({
          quick_mission_receipt: true,
          mission_id: 'mission-1',
          content_blocks_ordered: expect.arrayContaining([
            expect.objectContaining({
              type: 'artifact_preview',
              artifactType: 'mission',
              artifactId: 'mission-1',
              spaceId: 'space-1',
            }),
          ]),
        }),
      }),
    )
  })

  it('returns the existing receipt when the same mission callback is retried', async () => {
    const existing = {
      id: 'mission-1',
      conversation_id: 'conv-1',
      role: 'assistant',
      content: 'Quick Mission started: **Static Ad Production**.',
      metadata: { quick_mission_receipt: true, mission_id: 'mission-1' },
    }
    const { conversationMessages, messagesRepo } = createService({
      messagesRepo: { createIdempotent: vi.fn().mockResolvedValue(existing) },
    })

    await expect(
      conversationMessages.createMissionReceipt(
        {} as never,
        'user-1',
        'conv-1',
        { mission_id: 'mission-1', mission_title: 'Static Ad Production' },
        'org-1',
        'editor',
      ),
    ).resolves.toEqual(existing)

    expect(messagesRepo.findById).not.toHaveBeenCalled()
  })

  it('forks a conversation with copied messages and source metadata', async () => {
    const original = createConversation()
    const messagesToCopy = [
      {
        role: 'user',
        content: 'Start',
        content_blocks: null,
        metadata: { a: 1 },
        model_id: null,
        created_at: '2026-06-17T00:00:00.000Z',
      },
      {
        role: 'assistant',
        content: 'Done',
        content_blocks: [{ type: 'text', content: 'Done' }],
        metadata: { b: 2 },
        model_id: 'model-1',
        created_at: '2026-06-17T00:01:00.000Z',
      },
    ]
    const { service, conversationsRepo, messagesRepo } = createService({
      conversation: original,
      conversationsRepo: {
        create: vi.fn().mockResolvedValue({ ...original, id: 'conv-fork' }),
        update: vi.fn().mockResolvedValue({ ...original, id: 'conv-fork' }),
      },
      messagesRepo: { findUpToMessage: vi.fn().mockResolvedValue(messagesToCopy) },
    })

    await expect(
      service.forkConversation({} as never, 'user-1', 'conv-1', 'msg-2', 'org-1', 'viewer'),
    ).resolves.toMatchObject({
      conversation: { id: 'conv-fork' },
      messageCount: 2,
    })

    expect(conversationsRepo.create).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        user_id: 'user-1',
        title: 'Fork of Launch chat',
        campaign_id: 'campaign-1',
        agent_id: 'ceo',
        metadata: original.metadata,
        org_id: 'org-1',
      }),
    )
    expect(conversationsRepo.update).toHaveBeenCalledWith(
      {},
      'conv-fork',
      expect.objectContaining({
        forked_from: expect.objectContaining({
          conversation_id: 'conv-1',
          message_id: 'msg-2',
          forked_at: expect.any(String),
        }),
        default_model_id: 'model-1',
      }),
    )
    expect(messagesRepo.bulkCreate).toHaveBeenCalledWith({}, [
      expect.objectContaining({ conversation_id: 'conv-fork', role: 'user', content: 'Start' }),
      expect.objectContaining({
        conversation_id: 'conv-fork',
        role: 'assistant',
        content: 'Done',
        content_blocks: [{ type: 'text', content: 'Done' }],
        metadata: { b: 2 },
        model_id: 'model-1',
      }),
    ])
  })

  it('recalculates the last response-chain pointer after deleting from a message', async () => {
    const remaining = [
      { id: 'msg-1', role: 'user', metadata: null },
      {
        id: 'msg-2',
        role: 'assistant',
        metadata: {
          response_chain: {
            openclaw_response_id: 'oc-1',
            provider_response_id: 'provider-1',
            previous_response_id: 'provider-0',
          },
        },
      },
    ]
    const { service, conversationsRepo, messagesRepo } = createService({
      messagesRepo: {
        findByConversationId: vi.fn().mockResolvedValue(remaining),
      },
    })

    await service.deleteMessagesFrom({} as never, 'user-1', 'conv-1', 'msg-2', 'org-1', 'editor')

    expect(messagesRepo.deleteFrom).toHaveBeenCalledWith({}, 'conv-1', 'msg-2')
    expect(conversationsRepo.update).toHaveBeenCalledWith({}, 'conv-1', {
      metadata: {
        existing: true,
        response_chain_last: {
          openclaw_response_id: 'oc-1',
          provider_response_id: 'provider-1',
          previous_response_id: 'provider-0',
          message_id: 'msg-2',
          updated_at: expect.any(String),
        },
      },
    })
  })
})
