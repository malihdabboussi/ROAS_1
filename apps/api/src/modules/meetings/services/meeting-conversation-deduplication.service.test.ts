import { describe, expect, it, vi } from 'vitest'
import { MeetingConversationDeduplicationService } from './meeting-conversation-deduplication.service'

describe('MeetingConversationDeduplicationService', () => {
  it('archives unlinked duplicate chats for the same meeting', async () => {
    const repository = {
      findDuplicateMeetingConversations: vi
        .fn()
        .mockResolvedValue([{ id: 'conv-duplicate', metadata: { context_type: 'meeting' } }]),
      update: vi.fn().mockResolvedValue(undefined),
    }
    const service = new MeetingConversationDeduplicationService(repository as never)

    await expect(
      service.archiveDuplicates({} as never, {
        userId: 'user-1',
        meetingItemId: 'meeting-1',
        keepConversationId: 'conv-1',
      }),
    ).resolves.toBe(1)

    expect(repository.findDuplicateMeetingConversations).toHaveBeenCalledWith(
      {},
      {
        userId: 'user-1',
        meetingItemIds: ['meeting-1'],
        keepConversationId: 'conv-1',
      },
    )
    expect(repository.update).toHaveBeenCalledWith(
      {},
      'conv-duplicate',
      expect.objectContaining({
        status: 'archived',
        metadata: expect.objectContaining({
          deduplicated_meeting_conversation_id: 'conv-1',
        }),
      }),
    )
  })

  it('also archives chats attached to sibling duplicate meeting items', async () => {
    const repository = {
      findDuplicateMeetingConversations: vi
        .fn()
        .mockResolvedValue([{ id: 'conv-sibling', metadata: { meeting_item_id: 'dup-item-1' } }]),
      update: vi.fn().mockResolvedValue(undefined),
    }
    const service = new MeetingConversationDeduplicationService(repository as never)

    await expect(
      service.archiveDuplicates({} as never, {
        userId: 'user-1',
        meetingItemId: 'meeting-1',
        keepConversationId: 'conv-1',
        duplicateMeetingItemIds: ['dup-item-1', 'meeting-1', 'dup-item-1'],
      }),
    ).resolves.toBe(1)

    expect(repository.findDuplicateMeetingConversations).toHaveBeenCalledWith(
      {},
      {
        userId: 'user-1',
        meetingItemIds: ['meeting-1', 'dup-item-1'],
        keepConversationId: 'conv-1',
      },
    )
  })
})
