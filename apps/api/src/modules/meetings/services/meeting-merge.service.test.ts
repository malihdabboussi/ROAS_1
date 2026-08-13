import { BadRequestException, NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMeetingConversationId } from '../domain/meeting-conversation-id'
import { MeetingMergeService } from './meeting-merge.service'

const SPACE_ID = 'space-1'
const SCOPE = { spaceId: SPACE_ID, userId: 'user-1' }

function callRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    space_id: SPACE_ID,
    title: `Meeting: ${id}`,
    custom_data: { entry_type: 'call' },
    created_at: '2026-08-10T10:00:00Z',
    ...overrides,
  }
}

describe('MeetingMergeService', () => {
  let repo: {
    listMeetingItems: ReturnType<typeof vi.fn>
    mergeMeetingItems: ReturnType<typeof vi.fn>
  }
  let conversationDedup: { archiveDuplicates: ReturnType<typeof vi.fn> }
  let service: MeetingMergeService
  const supabase = {} as never

  beforeEach(() => {
    repo = {
      listMeetingItems: vi.fn(),
      mergeMeetingItems: vi.fn().mockResolvedValue({ duplicates_merged: 1 }),
    }
    conversationDedup = { archiveDuplicates: vi.fn().mockResolvedValue(0) }
    service = new MeetingMergeService(repo as never, conversationDedup as never)
  })

  it('merges duplicates into the survivor and returns the summary', async () => {
    repo.listMeetingItems.mockResolvedValue([
      callRow('keep'),
      callRow('dup-1', { custom_data: { entry_type: 'call', recording_url: 'https://r' } }),
    ])

    const result = await service.mergeMeetings(supabase, {
      ...SCOPE,
      survivorItemId: 'keep',
      duplicateItemIds: ['dup-1'],
    })

    expect(repo.listMeetingItems).toHaveBeenCalledWith(supabase, SPACE_ID, ['keep', 'dup-1'])
    expect(repo.mergeMeetingItems).toHaveBeenCalledWith(supabase, {
      spaceId: SPACE_ID,
      survivorItemId: 'keep',
      duplicateItemIds: ['dup-1'],
      survivorPatch: expect.objectContaining({
        custom_data: expect.objectContaining({
          entry_type: 'call',
          recording_url: 'https://r',
          merged_from_item_ids: ['dup-1'],
        }),
      }),
    })
    expect(result).toEqual({ survivor_item_id: 'keep', duplicates_merged: 1 })
  })

  it('orders duplicates by created_at so older data fills gaps first', async () => {
    repo.listMeetingItems.mockResolvedValue([
      callRow('keep'),
      callRow('dup-newer', { created_at: '2026-08-12T10:00:00Z' }),
      callRow('dup-older', { created_at: '2026-08-09T10:00:00Z' }),
    ])

    await service.mergeMeetings(supabase, {
      ...SCOPE,
      survivorItemId: 'keep',
      duplicateItemIds: ['dup-newer', 'dup-older'],
    })

    expect(repo.mergeMeetingItems).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({ duplicateItemIds: ['dup-older', 'dup-newer'] }),
    )
  })

  it('deduplicates repeated duplicate ids', async () => {
    repo.listMeetingItems.mockResolvedValue([callRow('keep'), callRow('dup-1')])

    await service.mergeMeetings(supabase, {
      ...SCOPE,
      survivorItemId: 'keep',
      duplicateItemIds: ['dup-1', 'dup-1'],
    })

    expect(repo.listMeetingItems).toHaveBeenCalledWith(supabase, SPACE_ID, ['keep', 'dup-1'])
  })

  it('rejects when an item is missing from the space', async () => {
    repo.listMeetingItems.mockResolvedValue([callRow('keep')])

    await expect(
      service.mergeMeetings(supabase, {
        ...SCOPE,
        survivorItemId: 'keep',
        duplicateItemIds: ['dup-1'],
      }),
    ).rejects.toBeInstanceOf(NotFoundException)
    expect(repo.mergeMeetingItems).not.toHaveBeenCalled()
  })

  it('rejects when a selected item is not a meeting call', async () => {
    repo.listMeetingItems.mockResolvedValue([
      callRow('keep'),
      callRow('dup-1', { title: 'Write proposal', custom_data: { entry_type: 'follow_up' } }),
    ])

    await expect(
      service.mergeMeetings(supabase, {
        ...SCOPE,
        survivorItemId: 'keep',
        duplicateItemIds: ['dup-1'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(repo.mergeMeetingItems).not.toHaveBeenCalled()
  })

  it('archives each duplicate meeting conversation onto the survivor conversation', async () => {
    repo.listMeetingItems.mockResolvedValue([callRow('keep'), callRow('dup-1'), callRow('dup-2')])

    await service.mergeMeetings(supabase, {
      ...SCOPE,
      survivorItemId: 'keep',
      duplicateItemIds: ['dup-1', 'dup-2'],
    })

    const keepConversationId = buildMeetingConversationId('keep')
    expect(conversationDedup.archiveDuplicates).toHaveBeenCalledWith(supabase, {
      userId: 'user-1',
      meetingItemId: 'dup-1',
      keepConversationId,
    })
    expect(conversationDedup.archiveDuplicates).toHaveBeenCalledWith(supabase, {
      userId: 'user-1',
      meetingItemId: 'dup-2',
      keepConversationId,
    })
  })

  it('still resolves when conversation archiving fails', async () => {
    repo.listMeetingItems.mockResolvedValue([callRow('keep'), callRow('dup-1')])
    conversationDedup.archiveDuplicates.mockRejectedValue(new Error('conversations down'))

    const result = await service.mergeMeetings(supabase, {
      ...SCOPE,
      survivorItemId: 'keep',
      duplicateItemIds: ['dup-1'],
    })

    expect(result.survivor_item_id).toBe('keep')
  })
})
