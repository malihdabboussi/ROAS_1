import { describe, expect, it, vi } from 'vitest'
import type { TelegramUpdate } from '../../types/telegram.types'
import { TelegramWebhookController } from '../telegram.controller'

function mockResponse() {
  const res: any = {
    status: vi.fn(() => res),
    json: vi.fn(() => res),
  }
  return res
}

describe('TelegramWebhookController', () => {
  it('responds ok immediately and delegates webhook handling', async () => {
    const telegramService = {
      handleWebhook: vi.fn(async () => undefined),
    }
    const controller = new TelegramWebhookController(telegramService as any)
    const update: TelegramUpdate = {
      update_id: 1,
      message: {
        message_id: 1,
        date: 1,
        text: 'Hi',
        chat: { id: 123, type: 'private' },
      },
    }
    const res = mockResponse()

    await controller.handleWebhook('zara', 'secret-1', update, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ ok: true })
    expect(telegramService.handleWebhook).toHaveBeenCalledWith('zara', 'secret-1', update)
  })
})
