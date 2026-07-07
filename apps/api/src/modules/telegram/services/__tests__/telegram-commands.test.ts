import { describe, expect, it, vi } from 'vitest'
import { NOW, TableSupabaseHarness } from '../../../../test/utils/table-supabase-harness'
import { ContactIdentifierService } from '../../../leads/services/contact-identifier.service'
import { TelegramRepository } from '../../repositories/telegram.repository'
import { TelegramService } from '../telegram.service'

function createService() {
  const telegramApi = {
    getMe: vi.fn(),
    setWebhook: vi.fn(),
    deleteWebhook: vi.fn(),
    sendChatAction: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue({ message_id: 100 }),
    sendMessageWithInlineKeyboard: vi.fn(),
    editMessageText: vi.fn(),
    answerCallbackQuery: vi.fn(),
    setMyCommands: vi.fn(),
    setMessageReaction: vi.fn(),
    getFile: vi.fn(),
    downloadFile: vi.fn(),
    sendPhoto: vi.fn(),
    sendDocument: vi.fn(),
    sendVideo: vi.fn(),
  }
  const service = new TelegramService(
    telegramApi as never,
    new TelegramRepository(),
    { ensureRunning: vi.fn() } as never,
    { mintAccessToken: vi.fn() } as never,
    { extractText: vi.fn() } as never,
    { invoke: vi.fn() } as never,
    new ContactIdentifierService(),
  )
  return { service, telegramApi }
}

function seedCommandTables(db: TableSupabaseHarness) {
  db.table('campaigns').push(
    {
      id: 'campaign-1',
      user_id: 'user-1',
      org_id: 'org-1',
      name: 'Launch',
      status: 'active',
      deleted_at: null,
      config: {},
      updated_at: NOW,
    },
    {
      id: 'campaign-2',
      user_id: 'user-1',
      org_id: 'org-1',
      name: 'Retention',
      status: 'active',
      deleted_at: null,
      config: {},
      updated_at: '2026-06-01T00:00:00.000Z',
    },
  )
  db.table('conversations').push({
    id: 'conversation-1',
    user_id: 'user-1',
    org_id: 'org-1',
    agent_id: 'zara',
    campaign_id: 'campaign-1',
    status: 'active',
    metadata: { telegram_chat_id: '555' },
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: NOW,
  })
  db.table('missions').push({
    id: 'mission-1',
    user_id: 'user-1',
    org_id: 'org-1',
    title: 'Review landing page',
    status: 'in_progress',
    priority: 'high',
    updated_at: NOW,
  })
}

describe('TelegramService commands', () => {
  it('sends campaign and active mission details for /status', async () => {
    const db = new TableSupabaseHarness()
    seedCommandTables(db)
    const { service, telegramApi } = createService()

    await (service as any).cmdStatus(db.client, 'user-1', 'zara', 'bot-token', 555, 'org-1')

    expect(telegramApi.sendMessage).toHaveBeenCalledWith(
      'bot-token',
      555,
      expect.stringContaining('Campaign: Launch'),
    )
    expect(telegramApi.sendMessage.mock.calls[0][2]).toContain('Review landing page')
  })

  it('lists campaigns and marks the active one when /campaign has no args', async () => {
    const db = new TableSupabaseHarness()
    seedCommandTables(db)
    const { service, telegramApi } = createService()

    await (service as any).cmdCampaign(db.client, 'user-1', 'zara', 'bot-token', 555, '', 'org-1')

    const sent = telegramApi.sendMessage.mock.calls[0][2] as string
    expect(sent).toContain('Launch ✅')
    expect(sent).toContain('Retention')
  })

  it('switches the active Telegram conversation when /campaign matches exactly one campaign', async () => {
    const db = new TableSupabaseHarness()
    seedCommandTables(db)
    const { service, telegramApi } = createService()

    await (service as any).cmdCampaign(
      db.client,
      'user-1',
      'zara',
      'bot-token',
      555,
      'Retention',
      'org-1',
    )

    expect(db.table('conversations')[0].campaign_id).toBe('campaign-2')
    expect(telegramApi.sendMessage).toHaveBeenCalledWith(
      'bot-token',
      555,
      'Switched to campaign: Retention',
    )
  })
})
