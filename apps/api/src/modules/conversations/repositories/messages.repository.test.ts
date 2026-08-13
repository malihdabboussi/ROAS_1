import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { MessagesRepository } from './messages.repository'

const RECEIPT = {
  id: 'mission-1',
  conversation_id: 'conversation-1',
  role: 'assistant',
  content: 'Quick Mission started: **Static Ad Production**.',
  metadata: { quick_mission_receipt: true, mission_id: 'mission-1' },
}

function createSupabase(result: { data: unknown; error: { message: string } | null }) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {}
  query.upsert = vi.fn(() => query)
  query.select = vi.fn(() => query)
  query.maybeSingle = vi.fn().mockResolvedValue(result)
  const from = vi.fn(() => query)
  return { supabase: { from } as unknown as SupabaseClient, from, query }
}

describe('MessagesRepository idempotent create', () => {
  it('inserts a deterministic receipt in one database request', async () => {
    const repository = new MessagesRepository()
    const { supabase, from, query } = createSupabase({ data: RECEIPT, error: null })
    const findById = vi.spyOn(repository, 'findById')

    await expect(repository.createIdempotent(supabase, RECEIPT)).resolves.toEqual(RECEIPT)

    expect(from).toHaveBeenCalledWith('messages')
    expect(query.upsert).toHaveBeenCalledWith(RECEIPT, {
      onConflict: 'id',
      ignoreDuplicates: true,
    })
    expect(findById).not.toHaveBeenCalled()
  })

  it('loads the existing receipt only when the deterministic id conflicts', async () => {
    const repository = new MessagesRepository()
    const { supabase } = createSupabase({ data: null, error: null })
    vi.spyOn(repository, 'findById').mockResolvedValue(RECEIPT as never)

    await expect(repository.createIdempotent(supabase, RECEIPT)).resolves.toEqual(RECEIPT)
    expect(repository.findById).toHaveBeenCalledWith(supabase, 'mission-1')
  })
})
