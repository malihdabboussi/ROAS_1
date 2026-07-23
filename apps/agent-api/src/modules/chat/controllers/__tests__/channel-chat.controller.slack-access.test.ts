import { describe, expect, it, vi } from 'vitest'
import { ChannelChatController } from '../channel-chat.controller'

function responseMock() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
}

describe('ChannelChatController Slack principal contract', () => {
  it('fails closed before credits or agent execution when Slack principal data is missing', async () => {
    const chatService = { processMessage: vi.fn() }
    const creditsService = { assertHasAvailableCredits: vi.fn() }
    const controller = new ChannelChatController(
      chatService as never,
      { client: {} } as never,
      creditsService as never,
    )
    const res = responseMock()

    await controller.sendMessage(
      {
        user_id: 'owner-1',
        conversation_id: 'conversation-1',
        content: 'Search the company brain',
        source: 'slack',
        access_token: 'token',
      },
      res as never,
    )

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'Slack access denied' })
    expect(creditsService.assertHasAvailableCredits).not.toHaveBeenCalled()
    expect(chatService.processMessage).not.toHaveBeenCalled()
  })
})
