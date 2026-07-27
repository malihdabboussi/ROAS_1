import { describe, expect, it, vi } from 'vitest'
import { insertConversationPassOffNotification } from '../conversation-pass-off-notify'

describe('insertConversationPassOffNotification', () => {
  it('skips self pass-off', async () => {
    const insert = vi.fn()
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(),
        insert,
      })),
    } as never

    await insertConversationPassOffNotification(supabase, {
      conversationId: 'conv-1',
      conversationTitle: 'Offer strategy',
      fromUserId: 'user-1',
      toUserId: 'user-1',
      orgId: 'org-1',
      note: '',
    })

    expect(insert).not.toHaveBeenCalled()
  })

  it('inserts inbox notification with handoff link', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { full_name: 'Dylan' } }),
          }
        }
        return { insert }
      }),
    } as never

    await insertConversationPassOffNotification(supabase, {
      conversationId: 'conv-1',
      conversationTitle: 'Offer strategy',
      fromUserId: 'user-1',
      toUserId: 'user-2',
      orgId: 'org-1',
      note: 'Please take this',
    })

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-2',
        type: 'conversation_pass_off',
        action_url: '/home?conversation=conv-1',
        title: 'Dylan passed you a conversation',
      }),
    )
  })
})
