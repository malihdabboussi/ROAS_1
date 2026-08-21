import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import {
  addConversationConnection,
  assignConversationCampaign,
  assignConversationSpace,
  deleteConversation,
  deleteConversationShare,
  duplicateConversation,
  fetchConversationAssets,
  fetchConversationConnections,
  fetchConversations,
  fetchConversationShares,
  fetchMessages,
  markConversationRead,
  persistQuickMissionReceipt,
  removeConversationConnection,
  renameConversation,
  setConversationArchived,
  setConversationPinned,
  upsertConversationShare,
} from './conversations-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendDelete: vi.fn(),
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: vi.fn(),
}))

const backendDeleteMock = vi.mocked(backendDelete)
const backendGetMock = vi.mocked(backendGet)
const backendPatchMock = vi.mocked(backendPatch)
const backendPostMock = vi.mocked(backendPost)

describe('conversations api', () => {
  beforeEach(() => {
    backendDeleteMock.mockReset()
    backendGetMock.mockReset()
    backendPatchMock.mockReset()
    backendPostMock.mockReset()
  })

  it('fetches conversations with feed filters and backend options', async () => {
    const backendOptions = { orgId: 'org-1' }
    backendGetMock.mockResolvedValue([{ id: 'conversation-1' }])

    await expect(
      fetchConversations(
        'campaign-1',
        'agent-1',
        'member-1',
        { feedScope: 'org', feedOrgId: 'org-1', spaceId: 'space-1', channelId: 'channel-1' },
        backendOptions,
      ),
    ).resolves.toEqual([{ id: 'conversation-1' }])

    expect(backendGetMock).toHaveBeenCalledWith(
      '/api/conversations?campaign_id=campaign-1&agent_id=agent-1&member_id=member-1&feed_scope=org&feed_org_id=org-1&space_id=space-1&channel_id=channel-1',
      backendOptions,
    )
  })

  it('uses an empty backend options object when none is provided', async () => {
    backendGetMock.mockResolvedValue([])

    await expect(fetchConversations()).resolves.toEqual([])

    expect(backendGetMock).toHaveBeenCalledWith('/api/conversations', {})
  })

  it('fetches messages and conversation assets through shared conversation endpoints', async () => {
    backendGetMock
      .mockResolvedValueOnce([{ id: 'message-1' }])
      .mockResolvedValueOnce({ items: [{ id: 'asset-1' }], nextCursor: 'cursor-1' })

    await expect(
      fetchMessages('conversation-1', { limit: 20, before: 'message-0' }),
    ).resolves.toEqual([{ id: 'message-1' }])
    await expect(
      fetchConversationAssets('links', {
        agent_id: 'agent-1',
        campaign_id: 'campaign-1',
        limit: 50,
        before: 'cursor-0',
      }),
    ).resolves.toEqual({ items: [{ id: 'asset-1' }], nextCursor: 'cursor-1' })

    expect(backendGetMock).toHaveBeenNthCalledWith(
      1,
      '/api/conversations/conversation-1/messages?limit=20&before=message-0',
    )
    expect(backendGetMock).toHaveBeenNthCalledWith(
      2,
      '/api/conversations/assets?scope=links&agent_id=agent-1&campaign_id=campaign-1&limit=50&before=cursor-0',
    )
  })

  it('marks persisted conversations as read', async () => {
    backendPostMock.mockResolvedValue({ success: true })

    await expect(markConversationRead('conversation-1')).resolves.toBeUndefined()

    expect(backendPostMock).toHaveBeenCalledWith('/api/conversations/conversation-1/read', {})
  })

  it('persists a Quick Mission receipt in its originating conversation', async () => {
    backendPostMock.mockResolvedValue({
      id: 'mission-1',
      conversation_id: 'conversation-1',
      role: 'assistant',
    })

    await expect(
      persistQuickMissionReceipt('conversation-1', {
        mission_id: 'mission-1',
        mission_title: 'Static Ad Production',
        space_id: 'space-1',
      }),
    ).resolves.toMatchObject({ id: 'mission-1' })

    expect(backendPostMock).toHaveBeenCalledWith(
      '/api/conversations/conversation-1/mission-receipts',
      {
        mission_id: 'mission-1',
        mission_title: 'Static Ad Production',
        space_id: 'space-1',
      },
    )
  })

  it('does not mark pending conversations as read', async () => {
    await expect(markConversationRead('pending-1')).resolves.toBeUndefined()

    expect(backendPostMock).not.toHaveBeenCalled()
  })

  it('pins conversations through metadata patching', async () => {
    backendPatchMock.mockResolvedValue({ id: 'conversation-1', metadata: { pinned: true } })

    await expect(setConversationPinned('conversation-1', true)).resolves.toEqual({
      id: 'conversation-1',
      metadata: { pinned: true },
    })

    expect(backendPatchMock).toHaveBeenCalledWith('/api/conversations/conversation-1', {
      metadata: { pinned: true },
    })
  })

  it('does not pin pending conversations', async () => {
    await expect(setConversationPinned('pending-1', true)).rejects.toThrow(
      'Cannot pin a pending conversation',
    )

    expect(backendPatchMock).not.toHaveBeenCalled()
  })

  it('renames persisted conversations and ignores pending conversations', async () => {
    await renameConversation('pending-1', 'Draft title')
    expect(backendPatchMock).not.toHaveBeenCalled()

    await renameConversation('conversation-1', 'Updated title')

    expect(backendPatchMock).toHaveBeenCalledWith('/api/conversations/conversation-1', {
      title: 'Updated title',
    })
  })

  it('archives persisted conversations through status patching', async () => {
    backendPatchMock.mockResolvedValue({ id: 'conversation-1', status: 'archived' })

    await expect(setConversationArchived('conversation-1', true)).resolves.toEqual({
      id: 'conversation-1',
      status: 'archived',
    })

    expect(backendPatchMock).toHaveBeenCalledWith('/api/conversations/conversation-1', {
      status: 'archived',
    })
  })

  it('does not archive pending conversations', async () => {
    await expect(setConversationArchived('pending-1', true)).rejects.toThrow(
      'Cannot archive a pending conversation',
    )

    expect(backendPatchMock).not.toHaveBeenCalled()
  })

  it('assigns a persisted conversation to a campaign', async () => {
    backendPatchMock.mockResolvedValue({ id: 'conversation-1', campaign_id: 'campaign-1' })

    await expect(assignConversationCampaign('conversation-1', 'campaign-1')).resolves.toEqual({
      id: 'conversation-1',
      campaign_id: 'campaign-1',
    })

    expect(backendPatchMock).toHaveBeenCalledWith('/api/conversations/conversation-1', {
      campaign_id: 'campaign-1',
    })
  })

  it('does not assign pending conversations to campaigns', async () => {
    await expect(assignConversationCampaign('pending-1', null)).rejects.toThrow(
      'Cannot assign campaign to a pending conversation',
    )

    expect(backendPatchMock).not.toHaveBeenCalled()
  })

  it('assigns a persisted conversation to a space via metadata', async () => {
    backendPatchMock.mockResolvedValue({ id: 'conversation-1', metadata: { space_id: 'space-1' } })

    await expect(assignConversationSpace('conversation-1', 'space-1')).resolves.toEqual({
      id: 'conversation-1',
      metadata: { space_id: 'space-1' },
    })

    expect(backendPatchMock).toHaveBeenCalledWith('/api/conversations/conversation-1', {
      metadata: { space_id: 'space-1' },
    })
  })

  it('does not assign pending conversations to spaces', async () => {
    await expect(assignConversationSpace('pending-1', null)).rejects.toThrow(
      'Cannot assign space to a pending conversation',
    )

    expect(backendPatchMock).not.toHaveBeenCalled()
  })

  it('deletes conversations through the backend delete endpoint', async () => {
    backendDeleteMock.mockResolvedValue(undefined)

    await deleteConversation('conversation-1')

    expect(backendDeleteMock).toHaveBeenCalledWith('/api/conversations/conversation-1')
  })

  it('duplicates a conversation from its last message and can retarget campaign/title', async () => {
    backendGetMock.mockResolvedValue([{ id: 'message-1' }])
    backendPostMock.mockResolvedValue({
      conversation: { id: 'conversation-2', title: 'Fork of Original', campaign_id: null },
      messageCount: 3,
    })
    backendPatchMock.mockResolvedValue({
      id: 'conversation-2',
      title: 'Copy of Original',
      campaign_id: 'campaign-2',
    })

    await expect(
      duplicateConversation('conversation-1', {
        campaignId: 'campaign-2',
        titlePrefix: 'Copy of ',
      }),
    ).resolves.toEqual({
      id: 'conversation-2',
      title: 'Copy of Original',
      campaign_id: 'campaign-2',
    })

    expect(backendGetMock).toHaveBeenCalledWith('/api/conversations/conversation-1/messages')
    expect(backendPostMock).toHaveBeenCalledWith('/api/conversations/conversation-1/fork', {
      message_id: 'message-1',
    })
    expect(backendPatchMock).toHaveBeenCalledWith('/api/conversations/conversation-2', {
      campaign_id: 'campaign-2',
      title: 'Copy of Original',
    })
  })

  it('does not duplicate empty or pending conversations', async () => {
    await expect(duplicateConversation('pending-1')).rejects.toThrow(
      'Cannot duplicate a pending conversation',
    )

    backendGetMock.mockResolvedValue([])
    await expect(duplicateConversation('conversation-1')).rejects.toThrow(
      'No messages to duplicate',
    )
  })

  it('fetches, upserts, and deletes conversation shares through shared endpoints', async () => {
    backendGetMock.mockResolvedValue({ effective_level: 'admin', shares: [] })
    backendPostMock.mockResolvedValue({
      id: 'share-1',
      conversation_id: 'conversation-1',
      entity_type: 'user',
      entity_id: 'user-1',
      level: 'view',
    })
    backendDeleteMock.mockResolvedValue({ deleted: true })

    await expect(fetchConversationShares('conversation-1')).resolves.toEqual({
      effective_level: 'admin',
      shares: [],
    })
    await expect(
      upsertConversationShare('conversation-1', {
        entity_type: 'user',
        entity_id: 'user-1',
        level: 'view',
      }),
    ).resolves.toEqual({
      id: 'share-1',
      conversation_id: 'conversation-1',
      entity_type: 'user',
      entity_id: 'user-1',
      level: 'view',
    })
    await expect(deleteConversationShare('conversation-1', 'share-1')).resolves.toEqual({
      deleted: true,
    })

    expect(backendGetMock).toHaveBeenCalledWith('/api/conversations/conversation-1/shares')
    expect(backendPostMock).toHaveBeenCalledWith('/api/conversations/conversation-1/shares', {
      entity_type: 'user',
      entity_id: 'user-1',
      level: 'view',
    })
    expect(backendDeleteMock).toHaveBeenCalledWith(
      '/api/conversations/conversation-1/shares/share-1',
    )
  })

  it('adds and removes conversation connections', async () => {
    backendGetMock.mockResolvedValue({ connections: [] })
    backendPostMock.mockResolvedValue({
      connection: { entity_id: 'campaign-2' },
      promoted_primary: false,
      conversation: { id: 'conversation-1' },
    })
    backendDeleteMock.mockResolvedValue({
      connections: [],
      conversation: { id: 'conversation-1' },
    })

    await expect(fetchConversationConnections('conversation-1')).resolves.toEqual({
      connections: [],
    })
    await expect(
      addConversationConnection('conversation-1', {
        entity_type: 'campaign',
        entity_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      }),
    ).resolves.toEqual({
      connection: { entity_id: 'campaign-2' },
      promoted_primary: false,
      conversation: { id: 'conversation-1' },
    })
    await expect(
      removeConversationConnection(
        'conversation-1',
        'campaign',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      ),
    ).resolves.toEqual({ connections: [], conversation: { id: 'conversation-1' } })

    expect(backendGetMock).toHaveBeenCalledWith('/api/conversations/conversation-1/connections')
    expect(backendPostMock).toHaveBeenCalledWith('/api/conversations/conversation-1/connections', {
      entity_type: 'campaign',
      entity_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    })
    expect(backendDeleteMock).toHaveBeenCalledWith(
      '/api/conversations/conversation-1/connections/campaign/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    )
  })
})
