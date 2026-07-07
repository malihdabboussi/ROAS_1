import { afterEach, describe, expect, it, vi } from 'vitest'
import { NOW, TableSupabaseHarness, type Row } from '../../../../test/utils/table-supabase-harness'
import { ContactIdentifierService } from '../../../leads/services/contact-identifier.service'
import { TelegramRepository } from '../../repositories/telegram.repository'
import type { TelegramUpdate } from '../../types/telegram.types'
import { TelegramService } from '../telegram.service'

function sseResponse(content = 'Agent reply') {
  return new Response(
    `data: ${JSON.stringify({ type: 'content_delta', content })}\n\ndata: [DONE]\n\n`,
    {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    },
  )
}

function buildTelegramApi() {
  return {
    getMe: vi.fn(),
    setWebhook: vi.fn(),
    deleteWebhook: vi.fn(),
    sendChatAction: vi.fn().mockResolvedValue(true),
    sendMessage: vi.fn().mockResolvedValue({ message_id: 100 }),
    sendMessageWithInlineKeyboard: vi.fn(),
    editMessageText: vi.fn().mockResolvedValue({}),
    answerCallbackQuery: vi.fn(),
    setMyCommands: vi.fn(),
    setMessageReaction: vi.fn().mockResolvedValue(true),
    getFile: vi.fn(),
    downloadFile: vi.fn(),
    sendPhoto: vi.fn(),
    sendDocument: vi.fn(),
    sendVideo: vi.fn(),
  }
}

function telegramUpdate(chatId: number, text: string, messageId = 10): TelegramUpdate {
  return {
    update_id: messageId,
    message: {
      message_id: messageId,
      date: 1_717_800_000,
      text,
      chat: { id: chatId, type: 'group', title: 'PT DOM' },
      from: {
        id: chatId,
        is_bot: false,
        first_name: 'Brian',
        last_name: 'Bell',
        username: 'brian',
        language_code: 'en',
      },
    },
  }
}

function seedChannel(db: TableSupabaseHarness, overrides: Partial<Row> = {}): Row {
  const row = {
    id: overrides.id ?? 'channel-1',
    user_id: overrides.user_id ?? 'user-1',
    agent_key: overrides.agent_key ?? 'zara',
    channel_type: 'telegram',
    provider_config: {
      bot_token: 'bot-token',
      owner_telegram_id: 'owner-1',
      pending_verification: false,
      ...(overrides.provider_config ?? {}),
    },
    webhook_secret: overrides.webhook_secret ?? 'secret-1',
    is_active: overrides.is_active ?? true,
    is_public: overrides.is_public ?? true,
    org_id: overrides.org_id ?? 'org-1',
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  }
  db.table('agent_channels').push(row)
  return row
}

function seedCampaign(db: TableSupabaseHarness, overrides: Partial<Row> = {}): Row {
  const row = {
    id: overrides.id ?? 'campaign-1',
    user_id: overrides.user_id ?? 'user-1',
    org_id: overrides.org_id ?? 'org-1',
    status: overrides.status ?? 'active',
    deleted_at: null,
    config: {},
    updated_at: NOW,
    ...overrides,
  }
  db.table('campaigns').push(row)
  return row
}

function createHarness(seed: Record<string, Row[]> = {}) {
  const db = new TableSupabaseHarness(seed)
  const telegramApi = buildTelegramApi()
  const userAgentApi = { invoke: vi.fn(async () => sseResponse()) }
  const service = new TelegramService(
    telegramApi as any,
    new TelegramRepository(),
    { ensureRunning: vi.fn() } as any,
    { mintAccessToken: vi.fn(async () => 'channel-token') } as any,
    { extractText: vi.fn() } as any,
    userAgentApi as any,
    new ContactIdentifierService(),
  )
  vi.spyOn(service as any, 'getServiceRoleClient').mockReturnValue(db.client)
  return { db, service, telegramApi, userAgentApi }
}

function routedBody(userAgentApi: { invoke: ReturnType<typeof vi.fn> }) {
  return JSON.parse(userAgentApi.invoke.mock.calls[0][2].body) as Record<string, any>
}

describe('TelegramService webhook contact flow', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates and links a public Telegram sender to contact, conversation, campaign, and agent chat', async () => {
    const { db, service, userAgentApi } = createHarness()
    seedChannel(db)
    seedCampaign(db)

    await service.handleWebhook('zara', 'secret-1', telegramUpdate(555, 'Hello from Telegram'))

    const [contact] = db.table('contacts')
    const [conversation] = db.table('conversations')
    expect(contact).toMatchObject({
      user_id: 'user-1',
      org_id: 'org-1',
      contact_source: 'telegram',
      contact_type: 'unknown',
    })
    expect(db.table('channel_members')).toContainEqual(
      expect.objectContaining({
        user_id: 'user-1',
        org_id: 'org-1',
        platform: 'telegram',
        platform_id: '555',
      }),
    )
    expect(db.table('contact_identifiers')).toContainEqual(
      expect.objectContaining({
        contact_id: contact.id,
        owner_key: 'org-1',
        kind: 'telegram_chat_id',
        value: '555',
      }),
    )
    expect(conversation).toMatchObject({
      user_id: 'user-1',
      agent_id: 'zara',
      contact_id: contact.id,
      campaign_id: 'campaign-1',
      org_id: 'org-1',
    })
    expect(conversation.metadata.telegram_chat_id).toBe('555')
    expect(db.table('contact_campaign_memberships')).toContainEqual(
      expect.objectContaining({
        user_id: 'user-1',
        contact_id: contact.id,
        campaign_id: 'campaign-1',
      }),
    )

    expect(userAgentApi.invoke).toHaveBeenCalledTimes(1)
    expect(routedBody(userAgentApi)).toMatchObject({
      user_id: 'user-1',
      conversation_id: conversation.id,
      content: 'Hello from Telegram',
      source: 'telegram',
      access_token: 'channel-token',
      org_id: 'org-1',
      channel_user: {
        platform_id: '555',
        username: 'brian',
        display_name: 'Brian Bell',
        language: 'en',
      },
    })
  })

  it('reuses the active conversation and does not duplicate contact identity on the second message', async () => {
    const { db, service } = createHarness()
    seedChannel(db)
    seedCampaign(db)

    await service.handleWebhook('zara', 'secret-1', telegramUpdate(555, 'First', 10))
    await service.handleWebhook('zara', 'secret-1', telegramUpdate(555, 'Second', 11))

    expect(db.table('contacts')).toHaveLength(1)
    expect(db.table('contact_identifiers')).toHaveLength(1)
    expect(db.table('conversations')).toHaveLength(1)
    expect(db.table('contact_campaign_memberships')).toHaveLength(1)
  })

  it('scopes the same raw Telegram chat id into distinct org identifiers', async () => {
    const { db, service } = createHarness()
    seedChannel(db, { id: 'channel-a', webhook_secret: 'secret-a', org_id: 'org-a' })
    seedChannel(db, { id: 'channel-b', webhook_secret: 'secret-b', org_id: 'org-b' })
    seedCampaign(db, { id: 'campaign-a', org_id: 'org-a' })
    seedCampaign(db, { id: 'campaign-b', org_id: 'org-b' })

    await service.handleWebhook('zara', 'secret-a', telegramUpdate(777, 'Org A', 20))
    await service.handleWebhook('zara', 'secret-b', telegramUpdate(777, 'Org B', 21))

    expect(db.table('contacts')).toHaveLength(2)
    const identifiers = db.table('contact_identifiers')
    expect(identifiers.map((row) => row.value)).toEqual(['777', '777'])
    expect(identifiers.map((row) => row.owner_key).sort()).toEqual(['org-a', 'org-b'])
  })

  it('verifies pending owner messages without routing to agent chat', async () => {
    const { db, service, telegramApi, userAgentApi } = createHarness()
    const channel = seedChannel(db, {
      provider_config: { bot_token: 'bot-token', pending_verification: true },
    })

    await service.handleWebhook('zara', 'secret-1', telegramUpdate(999, 'Verify me'))

    expect(channel.provider_config).toMatchObject({
      bot_token: 'bot-token',
      pending_verification: false,
      owner_telegram_id: '999',
    })
    expect(telegramApi.sendMessage).toHaveBeenCalledWith(
      'bot-token',
      999,
      "Connected! You're verified as the owner. Send me a message to get started.",
    )
    expect(userAgentApi.invoke).not.toHaveBeenCalled()
    expect(db.table('conversations')).toHaveLength(0)
  })

  it('prefers the configured default campaign over the recency heuristic', async () => {
    const { db, service } = createHarness()
    seedChannel(db, {
      provider_config: {
        bot_token: 'bot-token',
        owner_telegram_id: 'owner-1',
        pending_verification: false,
        default_campaign_id: 'campaign-2',
      },
    })
    seedCampaign(db, { id: 'campaign-1' })
    seedCampaign(db, { id: 'campaign-2' })

    await service.handleWebhook('zara', 'secret-1', telegramUpdate(555, 'Hello'))

    const [conversation] = db.table('conversations')
    expect(conversation.campaign_id).toBe('campaign-2')
    expect(db.table('contact_campaign_memberships')).toContainEqual(
      expect.objectContaining({ campaign_id: 'campaign-2' }),
    )
  })

  it('falls back to the heuristic when the configured default campaign is invalid', async () => {
    const { db, service } = createHarness()
    seedChannel(db, {
      provider_config: {
        bot_token: 'bot-token',
        owner_telegram_id: 'owner-1',
        pending_verification: false,
        default_campaign_id: 'campaign-missing',
      },
    })
    seedCampaign(db, { id: 'campaign-1' })

    await service.handleWebhook('zara', 'secret-1', telegramUpdate(555, 'Hello'))

    const [conversation] = db.table('conversations')
    expect(conversation.campaign_id).toBe('campaign-1')
  })

  it('patches existing Telegram conversations with campaign id and creates membership', async () => {
    const { db, service } = createHarness()
    seedChannel(db)
    seedCampaign(db)
    db.table('conversations').push({
      id: 'conversation-existing',
      user_id: 'user-1',
      agent_id: 'zara',
      status: 'active',
      contact_id: null,
      campaign_id: null,
      org_id: 'org-1',
      metadata: { source: 'telegram', telegram_chat_id: '555' },
      created_at: NOW,
      updated_at: NOW,
    })

    await service.handleWebhook('zara', 'secret-1', telegramUpdate(555, 'Existing conversation'))

    const contact = db.table('contacts')[0]
    const conversation = db.table('conversations')[0]
    expect(conversation).toMatchObject({
      contact_id: contact.id,
      campaign_id: 'campaign-1',
    })
    expect(db.table('contact_campaign_memberships')).toContainEqual(
      expect.objectContaining({
        contact_id: contact.id,
        campaign_id: 'campaign-1',
      }),
    )
  })
})
