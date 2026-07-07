import { describe, expect, it, vi } from 'vitest'
import type {
  HumanDmConversationRow,
  HumanDmMessageRow,
  HumanDmRepository,
} from '../repositories/human-dm.repository'
import { DmService } from './dm.service'

describe('DmService notifications', () => {
  it('lists DMs with partner profiles and org roles', async () => {
    const conversation: HumanDmConversationRow = {
      id: 'conversation-1',
      org_id: 'org-1',
      user_low: 'current-user',
      user_high: 'partner-user',
      last_message_at: '2026-06-04T09:01:00.000Z',
      last_message_preview: 'Latest',
      created_at: '2026-06-04T09:00:00.000Z',
      updated_at: '2026-06-04T09:01:00.000Z',
    }
    const profile = {
      id: 'partner-user',
      full_name: 'Partner Name',
      avatar_url: null,
      status_emoji: ':rocket:',
      status_text: 'Shipping',
      timezone: 'UTC',
      functional_role: 'Ops',
    }
    const repo = {
      listConversationsForUser: vi.fn().mockResolvedValue([conversation]),
      listPartnerProfiles: vi.fn().mockResolvedValue([profile]),
      listActiveOrgMemberRoles: vi
        .fn()
        .mockResolvedValue([{ user_id: 'partner-user', role: 'admin' }]),
    }
    const serviceClient = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              in: async () => ({ data: [profile], error: null }),
            }),
          }
        }
        if (table === 'org_members') {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  eq: async () => ({
                    data: [{ user_id: 'partner-user', role: 'admin' }],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
    }
    const service = new DmService(
      { client: serviceClient } as never,
      repo as unknown as HumanDmRepository,
    )

    await expect(
      service.listDms({} as never, { userId: 'current-user', orgId: 'org-1' } as never),
    ).resolves.toEqual([
      {
        conversation_id: 'conversation-1',
        partner: profile,
        org_role: 'admin',
        last_message_preview: 'Latest',
        last_message_at: '2026-06-04T09:01:00.000Z',
      },
    ])
  })

  it('creates a notification for the other participant when a DM is sent', async () => {
    const conversation: HumanDmConversationRow = {
      id: 'conversation-1',
      org_id: 'org-1',
      user_low: 'recipient-user',
      user_high: 'sender-user',
      last_message_at: null,
      last_message_preview: null,
      created_at: '2026-06-04T09:00:00.000Z',
      updated_at: '2026-06-04T09:00:00.000Z',
    }
    const message: HumanDmMessageRow = {
      id: 'message-1',
      conversation_id: conversation.id,
      sender_id: 'sender-user',
      content: 'Can you review this?',
      content_blocks: null,
      metadata: {},
      edited_at: null,
      created_at: '2026-06-04T09:01:00.000Z',
      updated_at: '2026-06-04T09:01:00.000Z',
    }
    const repo = {
      findConversationById: vi.fn().mockResolvedValue(conversation),
      createMessage: vi.fn().mockResolvedValue(message),
      lookupSenderProfile: vi.fn().mockResolvedValue({ full_name: 'Sender Name' }),
      createNotification: vi.fn().mockImplementation(async (_supabase, record) => {
        await notificationInsert(record)
      }),
    }
    const notificationInsert = vi.fn().mockResolvedValue({ error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { full_name: 'Sender Name' }, error: null }),
              }),
            }),
          }
        }
        if (table === 'user_notifications') {
          return { insert: notificationInsert }
        }
        throw new Error(`Unexpected table: ${table}`)
      }),
    }
    const service = new DmService({} as never, repo as unknown as HumanDmRepository)

    await service.sendMessage(
      supabase as never,
      { userId: 'sender-user', orgId: 'org-1' } as never,
      conversation.id,
      { content: 'Can you review this?' },
    )

    expect(notificationInsert).toHaveBeenCalledWith({
      user_id: 'recipient-user',
      org_id: 'org-1',
      type: 'human_dm_message',
      title: 'Sender Name sent you a DM',
      body: 'Can you review this?',
      action_url: '/team?dm=sender-user',
      channel_sent: { in_app: true },
      metadata: {
        conversation_id: 'conversation-1',
        message_id: 'message-1',
        sender_id: 'sender-user',
      },
    })
  })
})
