import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TelegramUpdate } from '../../types/telegram.types'
import { TelegramService } from '../telegram.service'

function buildMockTelegramApi() {
  return {
    getMe: vi.fn(),
    setWebhook: vi.fn(),
    deleteWebhook: vi.fn(),
    sendChatAction: vi.fn().mockResolvedValue(true),
    sendMessage: vi.fn().mockResolvedValue({ message_id: 1 }),
    sendMessageWithInlineKeyboard: vi.fn(),
    editMessageText: vi.fn().mockResolvedValue({}),
    answerCallbackQuery: vi.fn(),
    setMyCommands: vi.fn().mockResolvedValue(true),
    setMessageReaction: vi.fn().mockResolvedValue(true),
    getFile: vi
      .fn()
      .mockResolvedValue({ file_id: 'f1', file_unique_id: 'u1', file_path: 'photos/file_0.jpg' }),
    downloadFile: vi
      .fn()
      .mockResolvedValue({ buffer: Buffer.from('fake-image'), contentType: 'image/jpeg' }),
    sendPhoto: vi.fn().mockResolvedValue({}),
    sendDocument: vi.fn().mockResolvedValue({}),
    sendVideo: vi.fn().mockResolvedValue({}),
  }
}

function buildMockRepo() {
  return {
    saveIntegration: vi.fn(),
    findChannelByAgentKey: vi.fn(),
    findActiveChannelByAgentKeyAndSecret: vi.fn(),
    deactivateChannelsForBotOnOtherScopes: vi.fn(),
    createChannel: vi.fn(),
    updateChannel: vi.fn(),
    deleteChannel: vi.fn(),
    listChannelsByUser: vi.fn(),
    setPublic: vi.fn(),
    touchLastMessage: vi.fn(),
    findChannelByAgentKeyAndSecret: vi.fn(),
  }
}

function createService(
  overrides: {
    telegramApi?: ReturnType<typeof buildMockTelegramApi>
    repo?: ReturnType<typeof buildMockRepo>
  } = {},
) {
  const api = overrides.telegramApi ?? buildMockTelegramApi()
  const repo = overrides.repo ?? buildMockRepo()
  const machines = { ensureRunning: vi.fn().mockRejectedValue(new Error('no machine')) }
  const channelToken = { mintAccessToken: vi.fn().mockResolvedValue('tok') }
  const documentExtraction = { extractText: vi.fn().mockResolvedValue('') }
  const userAgentApi = { invoke: vi.fn() }
  const contactIdentifier = {
    findOrCreateContact: vi.fn(),
    resolveByKind: vi.fn(),
  }
  const svc = new (TelegramService as any)(
    api,
    repo,
    machines,
    channelToken,
    documentExtraction,
    userAgentApi,
    contactIdentifier,
  )
  return { svc: svc as TelegramService, api, repo }
}

describe('TelegramService media helpers', () => {
  describe('connectAgent', () => {
    it('deactivates same-bot channels on other scopes before creating the org channel', async () => {
      const { svc, api, repo } = createService()
      const previousPublicApiUrl = process.env.PUBLIC_API_URL
      process.env.PUBLIC_API_URL = 'https://api.example.com'
      api.getMe.mockResolvedValue({
        id: 123,
        is_bot: true,
        first_name: 'Vibey',
        username: 'vibey_bot',
      })
      repo.findChannelByAgentKey.mockResolvedValue(null)
      repo.createChannel.mockResolvedValue({
        id: 'channel-org',
        provider_config: {},
      })

      try {
        await svc.connectAgent({} as any, 'user-1', 'vibey', 'bot-token', 'org-1')
      } finally {
        process.env.PUBLIC_API_URL = previousPublicApiUrl
      }

      expect(repo.deactivateChannelsForBotOnOtherScopes).toHaveBeenCalledWith(
        {},
        'user-1',
        123,
        'org-1',
      )
      expect(repo.createChannel).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          user_id: 'user-1',
          agent_key: 'vibey',
          channel_type: 'telegram',
          org_id: 'org-1',
        }),
      )
    })
  })

  describe('extractFileId (via resolveInboundMedia)', () => {
    it('extracts file_id from photo (picks largest)', async () => {
      const { svc, api } = createService()
      const supabase = mockSupabase()
      vi.spyOn(svc as any, 'getServiceRoleClient').mockReturnValue(supabase)
      vi.spyOn(svc as any, 'uploadTelegramMediaToStorage').mockResolvedValue(
        'https://storage.example.com/photo.jpg',
      )

      const message = {
        message_id: 1,
        chat: { id: 100, type: 'private' as const },
        date: 0,
        photo: [
          { file_id: 'small', file_unique_id: 's', width: 90, height: 90 },
          { file_id: 'large', file_unique_id: 'l', width: 800, height: 600 },
        ],
      }

      const result = await (svc as any).resolveInboundMedia('token', 'user1', null, message)
      expect(api.getFile).toHaveBeenCalledWith('token', 'large')
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('image')
      expect(result[0].fileUrl).toBe('https://storage.example.com/photo.jpg')
    })

    it('extracts file_id from video', async () => {
      const { svc, api } = createService()
      vi.spyOn(svc as any, 'getServiceRoleClient').mockReturnValue(mockSupabase())
      vi.spyOn(svc as any, 'uploadTelegramMediaToStorage').mockResolvedValue(
        'https://storage.example.com/video.mp4',
      )

      const message = {
        message_id: 1,
        chat: { id: 100, type: 'private' as const },
        date: 0,
        video: { file_id: 'vid1', file_unique_id: 'v1', width: 1920, height: 1080, duration: 30 },
      }

      const result = await (svc as any).resolveInboundMedia('token', 'user1', null, message)
      expect(api.getFile).toHaveBeenCalledWith('token', 'vid1')
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('video')
    })

    it('extracts file_id from document', async () => {
      const { svc, api } = createService()
      vi.spyOn(svc as any, 'getServiceRoleClient').mockReturnValue(mockSupabase())
      vi.spyOn(svc as any, 'uploadTelegramMediaToStorage').mockResolvedValue(
        'https://storage.example.com/report.pdf',
      )

      const message = {
        message_id: 1,
        chat: { id: 100, type: 'private' as const },
        date: 0,
        document: {
          file_id: 'doc1',
          file_unique_id: 'd1',
          file_name: 'report.pdf',
          mime_type: 'application/pdf',
        },
      }

      const result = await (svc as any).resolveInboundMedia('token', 'user1', null, message)
      expect(api.getFile).toHaveBeenCalledWith('token', 'doc1')
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('text')
      expect(result[0].filename).toBe('report.pdf')
    })

    it('extracts file_id from voice', async () => {
      const { svc, api } = createService()
      vi.spyOn(svc as any, 'getServiceRoleClient').mockReturnValue(mockSupabase())
      vi.spyOn(svc as any, 'uploadTelegramMediaToStorage').mockResolvedValue(
        'https://storage.example.com/voice.ogg',
      )

      const message = {
        message_id: 1,
        chat: { id: 100, type: 'private' as const },
        date: 0,
        voice: { file_id: 'v1', file_unique_id: 'vu1', duration: 5 },
      }

      const result = await (svc as any).resolveInboundMedia('token', 'user1', null, message)
      expect(api.getFile).toHaveBeenCalledWith('token', 'v1')
      expect(result).toHaveLength(1)
      expect(result[0].filename).toBe('voice.ogg')
    })

    it('returns empty for text-only message', async () => {
      const { svc } = createService()
      const message = {
        message_id: 1,
        chat: { id: 100, type: 'private' as const },
        date: 0,
        text: 'hello',
      }

      const result = await (svc as any).resolveInboundMedia('token', 'user1', null, message)
      expect(result).toHaveLength(0)
    })

    it('returns empty for animated sticker', async () => {
      const { svc } = createService()
      const message = {
        message_id: 1,
        chat: { id: 100, type: 'private' as const },
        date: 0,
        sticker: { file_id: 's1', file_unique_id: 'su1', is_animated: true, is_video: false },
      }

      const result = await (svc as any).resolveInboundMedia('token', 'user1', null, message)
      expect(result).toHaveLength(0)
    })

    it('returns empty on download failure', async () => {
      const { svc, api } = createService()
      vi.spyOn(svc as any, 'getServiceRoleClient').mockReturnValue(mockSupabase())
      api.getFile.mockRejectedValue(new Error('network'))

      const message = {
        message_id: 1,
        chat: { id: 100, type: 'private' as const },
        date: 0,
        photo: [{ file_id: 'f1', file_unique_id: 'u1', width: 100, height: 100 }],
      }

      const result = await (svc as any).resolveInboundMedia('token', 'user1', null, message)
      expect(result).toHaveLength(0)
    })
  })

  describe('sendOutboundMedia', () => {
    it('extracts markdown image and sends as photo', async () => {
      const { svc, api } = createService()
      const content = 'Here is your logo: ![logo](https://example.com/logo.png)'
      await (svc as any).sendOutboundMedia('token', 123, content)
      expect(api.sendPhoto).toHaveBeenCalledWith('token', 123, 'https://example.com/logo.png')
    })

    it('extracts MEDIA: directive for PDF and sends as document', async () => {
      const { svc, api } = createService()
      const content = 'MEDIA:https://example.com/report.pdf'
      await (svc as any).sendOutboundMedia('token', 123, content)
      expect(api.sendDocument).toHaveBeenCalledWith('token', 123, 'https://example.com/report.pdf')
    })

    it('extracts MEDIA: directive for video', async () => {
      const { svc, api } = createService()
      const content = 'MEDIA:https://example.com/clip.mp4'
      await (svc as any).sendOutboundMedia('token', 123, content)
      expect(api.sendVideo).toHaveBeenCalledWith('token', 123, 'https://example.com/clip.mp4')
    })

    it('does not send media for plain text', async () => {
      const { svc, api } = createService()
      const content = 'Just some text, no media.'
      await (svc as any).sendOutboundMedia('token', 123, content)
      expect(api.sendPhoto).not.toHaveBeenCalled()
      expect(api.sendDocument).not.toHaveBeenCalled()
      expect(api.sendVideo).not.toHaveBeenCalled()
    })

    it('deduplicates same URL appearing twice', async () => {
      const { svc, api } = createService()
      const content = '![a](https://example.com/img.png) ![b](https://example.com/img.png)'
      await (svc as any).sendOutboundMedia('token', 123, content)
      expect(api.sendPhoto).toHaveBeenCalledTimes(1)
    })

    it('handles sendPhoto failure gracefully', async () => {
      const { svc, api } = createService()
      api.sendPhoto.mockRejectedValue(new Error('bad request'))
      const content = '![img](https://example.com/img.png)'
      await expect((svc as any).sendOutboundMedia('token', 123, content)).resolves.not.toThrow()
    })
  })

  describe('agent retry error mapping', () => {
    it('does not classify empty agent responses as credit exhaustion', () => {
      const { svc } = createService()

      expect((svc as any).isCreditsExhaustedError(new Error('empty_agent_response'))).toBe(false)
      expect(
        (svc as any).isCreditsExhaustedError(
          new Error('Agent request failed (402): {"error":"credits_exhausted"}'),
        ),
      ).toBe(true)
      expect((svc as any).userFacingTelegramError('empty_agent_response')).toContain(
        "didn't get a full answer",
      )
    })

    it('maps machine wake and readiness errors to explicit user messages', () => {
      const { svc } = createService()

      expect(
        (svc as any).userFacingTelegramError('User machine failed to start after 3 attempts'),
      ).toBe('The coach is still waking up. Try again in a minute.')
      expect(
        (svc as any).userFacingTelegramError(
          'Machine not ready (agent-api /api/ready did not return 200 in time)',
        ),
      ).toBe('The coach is still waking up. Try again in a minute.')
    })

    it('maps provider and platform-looking errors to neutral Telegram copy', () => {
      const { svc } = createService()

      const providerMessage =
        'OpenRouter provider error: account has insufficient credits / credit balance'
      const userMessage = (svc as any).userFacingTelegramError(providerMessage)

      expect(userMessage).toBe('The coach is temporarily unavailable. Try again in a minute.')
      expect(userMessage.toLowerCase()).not.toContain('openrouter')
      expect(userMessage.toLowerCase()).not.toContain('credit')
      expect(userMessage.toLowerCase()).not.toContain('provider')
      expect((svc as any).telegramErrorDiagnostic(providerMessage)).toBe('temporary_unavailable')
    })

    it('maps rate limits and timeout errors to neutral categories', () => {
      const { svc } = createService()

      expect((svc as any).userFacingTelegramError('Provider rate limit exceeded')).toBe(
        'The coach is busy right now. Try again in a minute.',
      )
      expect((svc as any).userFacingTelegramError('The operation was aborted due to timeout')).toBe(
        "I didn't get a full answer this time. Send it again and I'll retry.",
      )
      expect(
        (svc as any).userFacingTelegramError(
          'Agent request failed (402): {"error":"credits_exhausted"}',
        ),
      ).toBe("This workspace can't send more messages right now. Open Vibey to continue.")
    })

    it('does not send raw SSE provider errors to Telegram', async () => {
      const { svc, api } = createService()
      const encoder = new TextEncoder()
      const response = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'error',
                  message: 'OpenRouter provider returned insufficient credits',
                })}\n\n`,
              ),
            )
            controller.close()
          },
        }),
      )

      await expect(
        (svc as any).streamSseToTelegram(response, {
          botToken: 'token',
          chatId: 123,
          messageId: 1,
        }),
      ).rejects.toThrow('temporary_unavailable')

      expect(api.editMessageText).toHaveBeenCalledWith(
        'token',
        123,
        1,
        'The coach is temporarily unavailable. Try again in a minute.',
      )
    })
  })
})

function mockSupabase() {
  const storage = {
    from: () => ({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: () => ({ data: { publicUrl: 'https://storage.example.com/file.jpg' } }),
    }),
  }
  return { storage } as any
}
