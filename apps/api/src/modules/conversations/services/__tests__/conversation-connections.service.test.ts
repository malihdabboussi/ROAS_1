import { describe, expect, it, vi } from 'vitest'
import { ConversationConnectionsService } from '../conversation-connections.service'

function createConversation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'conv-1',
    user_id: 'user-1',
    org_id: 'org-1',
    campaign_id: 'campaign-1',
    metadata: { space_id: 'space-1' },
    ...overrides,
  }
}

function createService(
  overrides: {
    conversation?: Record<string, unknown>
    connectionsRepo?: Record<string, unknown>
    conversationsRepo?: Record<string, unknown>
  } = {},
) {
  const conversation = overrides.conversation ?? createConversation()
  const connectionsRepo = {
    list: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockResolvedValue({
      row: {
        id: 'row-2',
        conversation_id: 'conv-1',
        org_id: 'org-1',
        entity_type: 'campaign',
        entity_id: 'campaign-2',
        is_primary: false,
        created_at: '2026-08-20T00:00:00.000Z',
      },
      duplicate: false,
    }),
    findByEntity: vi.fn().mockResolvedValue(null),
    deleteByEntity: vi.fn().mockResolvedValue(undefined),
    listCampaigns: vi.fn().mockResolvedValue([]),
    setPrimary: vi.fn().mockResolvedValue(undefined),
    ...overrides.connectionsRepo,
  }
  const conversationsRepo = {
    findByIdOrgScoped: vi.fn().mockResolvedValue(conversation),
    findByIdScoped: vi.fn().mockResolvedValue(conversation),
    update: vi
      .fn()
      .mockImplementation(async (_s: unknown, _id: string, fields: Record<string, unknown>) => ({
        ...conversation,
        ...fields,
        metadata: fields.metadata ?? conversation.metadata,
      })),
    ...overrides.conversationsRepo,
  }
  const permissionsService = {
    assertCanAccessConversation: vi.fn().mockResolvedValue('edit'),
  }
  const service = new ConversationConnectionsService(
    connectionsRepo as never,
    conversationsRepo as never,
    permissionsService as never,
  )
  return { service, connectionsRepo, conversationsRepo, permissionsService, conversation }
}

describe('ConversationConnectionsService', () => {
  it('adds an extra campaign without replacing campaign_id', async () => {
    const { service, conversationsRepo } = createService()
    const result = await service.add(
      {} as never,
      'user-1',
      'conv-1',
      { entity_type: 'campaign', entity_id: 'campaign-2' },
      'org-1',
      'editor',
    )
    expect(result.promoted_primary).toBe(false)
    expect(conversationsRepo.update).not.toHaveBeenCalled()
    expect(result.connection.entity_id).toBe('campaign-2')
  })

  it('promotes the first campaign onto campaign_id when none is set', async () => {
    const { service, conversationsRepo } = createService({
      conversation: createConversation({ campaign_id: null }),
    })
    const result = await service.add(
      {} as never,
      'user-1',
      'conv-1',
      { entity_type: 'campaign', entity_id: 'campaign-2' },
      'org-1',
      'editor',
    )
    expect(result.promoted_primary).toBe(true)
    expect(conversationsRepo.update).toHaveBeenCalledWith(
      expect.anything(),
      'conv-1',
      expect.objectContaining({ campaign_id: 'campaign-2' }),
    )
  })

  it('promotes the next table campaign when the primary is removed', async () => {
    const { service, connectionsRepo, conversationsRepo } = createService({
      connectionsRepo: {
        listCampaigns: vi.fn().mockResolvedValue([
          {
            id: 'row-2',
            conversation_id: 'conv-1',
            org_id: 'org-1',
            entity_type: 'campaign',
            entity_id: 'campaign-2',
            is_primary: false,
            created_at: '2026-08-20T00:00:00.000Z',
          },
        ]),
        list: vi.fn().mockResolvedValue([
          {
            id: 'row-2',
            conversation_id: 'conv-1',
            org_id: 'org-1',
            entity_type: 'campaign',
            entity_id: 'campaign-2',
            is_primary: true,
            created_at: '2026-08-20T00:00:00.000Z',
          },
        ]),
      },
    })
    const result = await service.remove(
      {} as never,
      'user-1',
      'conv-1',
      'campaign',
      'campaign-1',
      'org-1',
      'editor',
    )
    expect(connectionsRepo.deleteByEntity).toHaveBeenCalledWith(
      expect.anything(),
      'conv-1',
      'campaign',
      'campaign-1',
    )
    expect(connectionsRepo.setPrimary).toHaveBeenCalledWith(
      expect.anything(),
      'conv-1',
      'campaign-2',
    )
    expect(conversationsRepo.update).toHaveBeenCalledWith(
      expect.anything(),
      'conv-1',
      expect.objectContaining({ campaign_id: 'campaign-2' }),
    )
    expect(result.conversation.campaign_id).toBe('campaign-2')
  })
})
