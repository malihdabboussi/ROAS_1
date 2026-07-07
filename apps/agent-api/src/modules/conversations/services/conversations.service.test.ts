import { describe, expect, it, vi } from 'vitest'
import { ConversationsService } from './conversations.service'

describe('ConversationsService', () => {
  it('links normalized contact emails when creating a conversation', async () => {
    const conversationsRepo = {
      findContactIdByEmail: vi.fn(async () => 'contact-1'),
      create: vi.fn(async (_supabase, record) => ({ id: 'conv-1', ...record })),
    }
    const messagesRepo = {}
    const permissions = {}
    const service = new ConversationsService(
      conversationsRepo as never,
      messagesRepo as never,
      permissions as never,
    )
    const supabase = {}

    const result = await service.createConversation(
      supabase as never,
      'user-1',
      {
        title: 'Customer chat',
        contact_email: ' PERSON@Example.COM ',
        metadata: { source: 'manual' },
      },
      'org-1',
    )

    expect(conversationsRepo.findContactIdByEmail).toHaveBeenCalledWith(supabase, {
      userId: 'user-1',
      email: 'person@example.com',
      orgId: 'org-1',
    })
    expect(conversationsRepo.create).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        user_id: 'user-1',
        title: 'Customer chat',
        contact_id: 'contact-1',
        metadata: { source: 'manual', visitor_email: 'person@example.com' },
        org_id: 'org-1',
      }),
    )
    expect(result.contact_id).toBe('contact-1')
  })
})
