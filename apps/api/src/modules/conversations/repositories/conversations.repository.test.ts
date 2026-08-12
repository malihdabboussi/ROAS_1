import { describe, expect, it, vi } from 'vitest'
import { ConversationsRepository } from './conversations.repository'

describe('ConversationsRepository.findDuplicateMeetingConversations', () => {
  it('matches duplicates across org scopes by globally unique meeting item ids', async () => {
    const rows = [{ id: 'conv-duplicate' }]
    const query: Record<string, ReturnType<typeof vi.fn>> & {
      then?: (resolve: (value: unknown) => void) => void
    } = {
      select: vi.fn(),
      eq: vi.fn(),
      in: vi.fn(),
      neq: vi.fn(),
      is: vi.fn(),
    }
    for (const method of ['select', 'eq', 'in', 'neq', 'is']) {
      query[method]!.mockReturnValue(query)
    }
    query.then = (resolve) => resolve({ data: rows, error: null })
    const supabase = { from: vi.fn().mockReturnValue(query) }
    const repository = new ConversationsRepository()

    await expect(
      repository.findDuplicateMeetingConversations(supabase as never, {
        userId: 'user-1',
        meetingItemIds: ['meeting-1', 'dup-item-1'],
        keepConversationId: 'conv-1',
      }),
    ).resolves.toBe(rows)

    expect(query.in).toHaveBeenCalledWith('metadata->>meeting_item_id', ['meeting-1', 'dup-item-1'])
    expect(query.neq).toHaveBeenCalledWith('id', 'conv-1')
    // Creation scopes the chat to the space's org while requests carry the session
    // org, so an org predicate would hide real duplicates.
    expect(query.is).not.toHaveBeenCalled()
  })
})

describe('ConversationsRepository.create', () => {
  it('returns the existing row when a deterministic conversation id already won the race', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const select = vi.fn().mockReturnValue({ maybeSingle })
    const upsert = vi.fn().mockReturnValue({ select })
    const supabase = { from: vi.fn().mockReturnValue({ upsert }) }
    const repository = new ConversationsRepository()
    const existing = { id: 'conversation-1', title: 'Meeting — Client review' }
    vi.spyOn(repository, 'findById').mockResolvedValue(existing as never)

    await expect(
      repository.create(supabase as never, {
        id: 'conversation-1',
        user_id: 'user-1',
        title: 'Meeting — Client review',
        campaign_id: null,
        org_id: 'org-1',
        metadata: { context_type: 'meeting', meeting_item_id: 'meeting-1' },
      }),
    ).resolves.toBe(existing)

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ id: 'conversation-1' }), {
      onConflict: 'id',
      ignoreDuplicates: true,
    })
    expect(repository.findById).toHaveBeenCalledWith(supabase, 'conversation-1')
  })
})
