import { describe, expect, it, vi } from 'vitest'
import { ChannelChatController } from '../channel-chat.controller'

function mockSseResponse() {
  const res: any = {
    req: { on: vi.fn() },
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
    status: vi.fn(() => res),
    json: vi.fn(() => res),
  }
  return res
}

describe('ChannelChatController Telegram channel chat', () => {
  it('passes Telegram channel context into ChatService.processMessage', async () => {
    const supabase = { from: vi.fn() }
    const chatService = {
      processMessage: vi.fn(async ({ send }) => {
        await send('content_delta', { content: 'Answer' })
      }),
    }
    const creditsService = { assertHasAvailableCredits: vi.fn(async () => undefined) }
    const controller = new ChannelChatController(
      chatService as any,
      { client: supabase } as any,
      creditsService as any,
    )
    const res = mockSseResponse()

    await controller.sendMessage(
      {
        user_id: 'user-1',
        conversation_id: 'conversation-1',
        content: 'Telegram hello',
        source: 'telegram',
        access_token: 'access-token',
        org_id: 'org-1',
        channel_user: {
          platform_id: '555',
          username: 'brian',
          display_name: 'Brian Bell',
          language: 'en',
        },
      },
      res,
    )

    expect(creditsService.assertHasAvailableCredits).toHaveBeenCalledWith('user-1', 'org-1')
    expect(chatService.processMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        supabase,
        conversationId: 'conversation-1',
        content: 'Telegram hello',
        userId: 'user-1',
        accessToken: 'access-token',
        orgId: 'org-1',
        source: 'telegram',
        channelUser: {
          platform_id: '555',
          username: 'brian',
          display_name: 'Brian Bell',
          language: 'en',
        },
      }),
    )
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream; charset=utf-8')
    expect(res.write).toHaveBeenCalledWith(
      `data: ${JSON.stringify({ type: 'content_delta', content: 'Answer' })}\n\n`,
    )
    expect(res.write).toHaveBeenCalledWith('data: [DONE]\n\n')
    expect(res.end).toHaveBeenCalled()
  })

  it('rejects Telegram channel chat without access_token', async () => {
    const chatService = { processMessage: vi.fn() }
    const creditsService = { assertHasAvailableCredits: vi.fn() }
    const controller = new ChannelChatController(
      chatService as any,
      { client: {} } as any,
      creditsService as any,
    )
    const res = mockSseResponse()

    await controller.sendMessage(
      {
        user_id: 'user-1',
        conversation_id: 'conversation-1',
        content: 'Telegram hello',
        source: 'telegram',
        org_id: 'org-1',
      },
      res,
    )

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing access_token' })
    expect(creditsService.assertHasAvailableCredits).not.toHaveBeenCalled()
    expect(chatService.processMessage).not.toHaveBeenCalled()
  })
})
