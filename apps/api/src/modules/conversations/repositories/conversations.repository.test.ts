import { describe, expect, it, vi } from 'vitest'

import { ConversationsRepository } from './conversations.repository'

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

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'conversation-1' }),
      { onConflict: 'id', ignoreDuplicates: true },
    )
    expect(repository.findById).toHaveBeenCalledWith(supabase, 'conversation-1')
  })
})
