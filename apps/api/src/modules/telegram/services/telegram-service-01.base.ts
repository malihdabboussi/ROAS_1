import { randomUUID } from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createResilientFetch, UserSessionMintService, withRetry } from '@vibey/api-shared'
import { DocumentExtractionService } from '../../brain/services/document-extraction.service'
import { ContactIdentifierService } from '../../leads/services/contact-identifier.service'
import { MachinesService } from '../../machines/services/machines.service'
import { UserAgentApiService } from '../../user-agent-api/services/user-agent-api.service'
import {
  isTelegramMessageNotModifiedError,
  TelegramApiIntegration,
} from '../integrations/telegram-api.integration'
import { TelegramRepository } from '../repositories/telegram.repository'
import { TelegramRuntimeRepository } from '../repositories/telegram-runtime.repository'
import type { TelegramBotInfo, TelegramMessage, TelegramUpdate } from '../types/telegram.types'

type TelegramAgentErrorCode =
  | 'temporary_unavailable'
  | 'busy'
  | 'no_answer'
  | 'workspace_blocked'
  | 'waking_up'

type TelegramAgentErrorMapping = {
  code: TelegramAgentErrorCode
  userMessage: string
  diagnostic: string
}

export abstract class TelegramServiceBase01 {
  // Abstract declarations for methods implemented by later base classes.
  protected abstract handleCallbackQuery(...args: any[]): any;
  protected abstract handleSlashCommand(...args: any[]): any;
  protected abstract cmdReset(...args: any[]): any;
  protected abstract cmdHelp(...args: any[]): any;
  protected abstract cmdStatus(...args: any[]): any;
  protected abstract cmdCampaign(...args: any[]): any;
  protected abstract extractFileId(...args: any[]): any;
  protected abstract resolveInboundMedia(...args: any[]): any;
  protected abstract tryExtractText(...args: any[]): any;
  protected abstract inferMimeFromFilename(...args: any[]): any;
  protected abstract uploadTelegramMediaToStorage(...args: any[]): any;
  protected abstract routeToAgentStreaming(...args: any[]): any;
  protected abstract streamSseToTelegram(...args: any[]): any;
  protected abstract sendOutboundMedia(...args: any[]): any;
  protected abstract getOrCreateTelegramConversation(...args: any[]): any;
  protected abstract readSseChunkWithTimeout(...args: any[]): any;
  protected abstract isCreditsExhaustedError(...args: any[]): any;
  protected abstract mapTelegramAgentError(...args: any[]): any;
  protected abstract isBusyAgentError(...args: any[]): any;
  protected abstract isNoAnswerAgentError(...args: any[]): any;
  protected abstract telegramErrorDiagnostic(...args: any[]): any;
  protected abstract userFacingTelegramError(...args: any[]): any;
  protected abstract resolveTelegramCampaignId(...args: any[]): any;
  protected abstract getDefaultCampaignIdForUser(...args: any[]): any;
  protected abstract startTypingIndicator(...args: any[]): any;
  protected abstract splitMessage(...args: any[]): any;
  abstract getVerificationStatus(...args: any[]): any;
  protected abstract upsertChannelMember(...args: any[]): any;
  protected abstract resolveTelegramContactId(...args: any[]): any;
  protected abstract ensureTelegramContactLinked(...args: any[]): any;
  protected abstract linkTelegramContactToCampaign(...args: any[]): any;
  protected abstract getServiceRoleClient(...args: any[]): any;
  // End generated abstract declarations.




  protected readonly logger = new Logger('TelegramService')
  protected readonly resilientFetch = createResilientFetch({
    label: 'telegram_service',
    maxRetries: 2,
    timeoutMs: 60000,
  })
  protected static readonly EMPTY_AGENT_RESPONSE_MESSAGE =
    "I didn't get a full answer this time. Send it again and I'll retry."
  protected static readonly CREDITS_EXHAUSTED_MESSAGE =
    "This workspace can't send more messages right now. Open Vibey to continue."
  protected static readonly MACHINE_WAKE_START_MESSAGE =
    'Waking up your agent. This can take 20-60 seconds.'
  protected static readonly MACHINE_UNREACHABLE_MESSAGE =
    'The coach is still waking up. Try again in a minute.'
  protected static readonly MACHINE_NOT_READY_MESSAGE =
    'The coach is still waking up. Try again in a minute.'
  protected static readonly AGENT_PROCESSING_FAILED_MESSAGE =
    'The coach is temporarily unavailable. Try again in a minute.'
  protected static readonly AGENT_BUSY_MESSAGE = 'The coach is busy right now. Try again in a minute.'
  protected static readonly AGENT_TEMPORARY_UNAVAILABLE_MESSAGE =
    'The coach is temporarily unavailable. Try again in a minute.'
  protected static readonly AGENT_EMPTY_STREAM_TIMEOUT_MS = 45_000

  protected static readonly TELEGRAM_COMMANDS: Array<{ command: string; description: string }> = [
    { command: 'reset', description: 'Start a fresh conversation' },
    { command: 'new', description: 'Start a fresh conversation' },
    { command: 'help', description: 'Show available commands' },
    { command: 'status', description: 'Show campaign, missions & session info' },
    { command: 'campaign', description: 'Show or switch active campaign' },
  ]

  protected static readonly TELEGRAM_MEDIA_MAX_BYTES = 20 * 1024 * 1024

  protected static readonly PLAIN_TEXT_EXTENSIONS = new Set([
    'txt',
    'md',
    'markdown',
    'csv',
    'json',
    'xml',
    'yaml',
    'yml',
    'html',
    'htm',
    'css',
    'js',
    'ts',
    'py',
    'sh',
    'log',
    'env',
    'ini',
    'toml',
  ])

  protected static readonly EXTENSION_MIME_MAP: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    pdf: 'application/pdf',
  }

  protected static readonly AGENT_FETCH_TIMEOUT_MS = 120_000

  protected static readonly IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp)(\?[^\s)]*)?$/i
  protected static readonly VIDEO_EXTENSIONS = /\.(mp4|mov|webm)(\?[^\s)]*)?$/i
  protected static readonly DOCUMENT_EXTENSIONS = /\.(pdf|doc|docx|xls|xlsx|csv|zip)(\?[^\s)]*)?$/i
  constructor(
    protected readonly telegramApi: TelegramApiIntegration,
    protected readonly telegramRepo: TelegramRepository,
    protected readonly machinesService: MachinesService,
    protected readonly userSessionMint: UserSessionMintService,
    protected readonly documentExtraction: DocumentExtractionService,
    protected readonly userAgentApi: UserAgentApiService,
    protected readonly contactIdentifier: ContactIdentifierService,
    protected readonly telegramRuntime: TelegramRuntimeRepository = new TelegramRuntimeRepository(),
  ) {
  }

  async validateToken(botToken: string): Promise<TelegramBotInfo> {
    return this.telegramApi.getMe(botToken)
  }

  async connectAgent(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    botToken: string,
    orgId?: string | null,
  ): Promise<{ channel_id: string; bot_username: string }> {
    const botInfo = await this.telegramApi.getMe(botToken)

    const webhookSecret = randomUUID()
    const webhookBaseUrl = this.resolvePublicWebhookBaseUrl()
    const webhookUrl = `${webhookBaseUrl}/api/webhooks/telegram/${agentKey}`

    await this.telegramApi.setWebhook(botToken, webhookUrl, webhookSecret)
    await this.telegramApi
      .setMyCommands(botToken, TelegramServiceBase01.TELEGRAM_COMMANDS)
      .catch((err) => this.logger.warn(`Failed to set bot commands: ${(err as Error).message}`))

    await this.telegramRepo.saveIntegration(
      supabase,
      userId,
      botToken,
      {
        bot_id: botInfo.id,
        bot_username: botInfo.username,
        bot_first_name: botInfo.first_name,
      },
      orgId,
    )

    const providerConfig = {
      bot_id: botInfo.id,
      bot_username: botInfo.username,
      bot_token: botToken,
      pending_verification: true,
    }

    await this.telegramRepo.deactivateChannelsForBotOnOtherScopes(
      supabase,
      userId,
      botInfo.id,
      orgId,
    )

    const existing = await this.telegramRepo.findChannelByAgentKey(
      supabase,
      userId,
      agentKey,
      orgId,
    )
    if (existing) {
      await this.telegramRepo.updateChannel(supabase, userId, existing.id, {
        provider_config: providerConfig,
        is_active: true,
        error_message: null,
      })
      return { channel_id: existing.id, bot_username: botInfo.username ?? '' }
    }

    const channel = await this.telegramRepo.createChannel(supabase, {
      user_id: userId,
      agent_key: agentKey,
      channel_type: 'telegram',
      provider_config: providerConfig,
      webhook_secret: webhookSecret,
      org_id: orgId ?? null,
    })

    return { channel_id: channel.id, bot_username: botInfo.username ?? '' }
  }

  protected resolvePublicWebhookBaseUrl(): string {
    const baseUrl =
      process.env.PUBLIC_API_URL?.trim() ||
      process.env.API_URL?.trim() ||
      process.env.BACKEND_URL?.trim() ||
      ''

    if (!baseUrl) {
      throw new Error(
        'Missing webhook base URL. Set PUBLIC_API_URL (preferred) or API_URL/BACKEND_URL.',
      )
    }

    let parsed: URL
    try {
      parsed = new URL(baseUrl)
    } catch {
      throw new Error(`Invalid webhook base URL: ${baseUrl}`)
    }

    const host = parsed.hostname.toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
      throw new Error(
        `Telegram webhook requires a public host, got "${parsed.origin}". Set PUBLIC_API_URL to a public HTTPS domain.`,
      )
    }

    const origin = parsed.origin.endsWith('/') ? parsed.origin.slice(0, -1) : parsed.origin
    return origin
  }

  async disconnectAgent(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ): Promise<void> {
    const channel = await this.telegramRepo.findChannelByAgentKey(supabase, userId, agentKey, orgId)
    if (!channel) return

    const botToken = (channel.provider_config as Record<string, string>).bot_token
    if (botToken) {
      await this.telegramApi
        .deleteWebhook(botToken)
        .catch((err) => this.logger.warn(`Failed to delete webhook: ${(err as Error).message}`))
    }

    await this.telegramRepo.deleteChannel(supabase, userId, agentKey, orgId)
  }

  async listChannels(supabase: SupabaseClient, userId: string, orgId?: string | null) {
    return this.telegramRepo.listChannelsByUser(supabase, userId, orgId)
  }

  async toggleChannel(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    isActive: boolean,
    orgId?: string | null,
  ) {
    const channel = await this.telegramRepo.findChannelByAgentKey(supabase, userId, agentKey, orgId)
    if (!channel) throw new Error('Channel not found')
    return this.telegramRepo.updateChannel(supabase, userId, channel.id, { is_active: isActive })
  }

  async setVisibility(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    isPublic: boolean,
    orgId?: string | null,
  ) {
    const channel = await this.telegramRepo.findChannelByAgentKey(supabase, userId, agentKey, orgId)
    if (!channel) throw new Error('Channel not found')
    return this.telegramRepo.setPublic(supabase, userId, channel.id, isPublic)
  }

  async updateChannelSettings(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    settings: { default_campaign_id?: string | null },
    orgId?: string | null,
  ) {
    const channel = await this.telegramRepo.findChannelByAgentKey(supabase, userId, agentKey, orgId)
    if (!channel) throw new Error('Channel not found')
    const providerConfig = {
      ...((channel.provider_config as Record<string, unknown>) ?? {}),
    }
    if ('default_campaign_id' in settings) {
      if (settings.default_campaign_id) {
        providerConfig.default_campaign_id = settings.default_campaign_id
      } else {
        delete providerConfig.default_campaign_id
      }
    }
    return this.telegramRepo.updateChannel(supabase, userId, channel.id, {
      provider_config: providerConfig,
    })
  }

  async handleWebhook(agentKey: string, secretToken: string | undefined, update: TelegramUpdate) {
    const serviceSupabase = this.getServiceRoleClient()

    if (!secretToken) {
      this.logger.warn(`Missing webhook secret for agent ${agentKey}`)
      return
    }

    const channel = await this.telegramRepo.findActiveChannelByAgentKeyAndSecret(
      serviceSupabase,
      agentKey,
      secretToken,
    )
    if (!channel) {
      this.logger.warn(`No active channel for agent ${agentKey}`)
      return
    }

    const channelOrgId = channel.org_id

    const providerConfig = channel.provider_config as Record<string, unknown>
    const botToken = providerConfig.bot_token as string | undefined
    if (!botToken) {
      this.logger.error(`No bot_token in provider_config for channel ${channel.id}`)
      return
    }

    if (update.callback_query) {
      await this.handleCallbackQuery(channel.user_id, botToken, update.callback_query)
      return
    }

    const message = update.message
    if (!message?.chat) return

    const hasText = Boolean(message.text?.trim())
    const hasCaption = Boolean(message.caption?.trim())
    const hasMedia = Boolean(
      message.photo ||
      message.video ||
      message.document ||
      message.audio ||
      message.voice ||
      message.video_note,
    )
    if (!hasText && !hasCaption && !hasMedia) return

    const chatId = message.chat.id
    const text = (message.text ?? message.caption ?? '').trim()
    const senderTelegramId = message.from?.id?.toString()

    if (providerConfig.pending_verification && senderTelegramId) {
      await this.telegramRepo.updateChannel(serviceSupabase, channel.user_id, channel.id, {
        provider_config: {
          ...providerConfig,
          owner_telegram_id: senderTelegramId,
          pending_verification: false,
        },
      })
      await this.telegramApi.sendMessage(
        botToken,
        chatId,
        "Connected! You're verified as the owner. Send me a message to get started.",
      )
      if (message.from) {
        await this.upsertChannelMember(
          serviceSupabase,
          channel.user_id,
          channelOrgId,
          message.from,
          chatId.toString(),
        )
      }
      return
    }

    if (!channel.is_public && senderTelegramId) {
      const ownerTelegramId = providerConfig.owner_telegram_id as string | undefined
      if (!ownerTelegramId) {
        await this.telegramRepo.updateChannel(serviceSupabase, channel.user_id, channel.id, {
          provider_config: { ...providerConfig, owner_telegram_id: senderTelegramId },
        })
      } else if (senderTelegramId !== ownerTelegramId) {
        await this.telegramApi.sendMessage(
          botToken,
          chatId,
          'This bot is protected and only responds to its owner.',
        )
        return
      }
    }

    if (message.from) {
      await this.upsertChannelMember(
        serviceSupabase,
        channel.user_id,
        channelOrgId,
        message.from,
        chatId.toString(),
      )
    }

    const channelUser = message.from
      ? {
          platform_id: message.from.id.toString(),
          username: message.from.username,
          display_name: [message.from.first_name, message.from.last_name].filter(Boolean).join(' '),
          language: message.from.language_code,
        }
      : undefined

    if (hasText) {
      const handled = await this.handleSlashCommand(
        serviceSupabase,
        channel.user_id,
        agentKey,
        botToken,
        chatId,
        text,
        channelOrgId,
      )
      if (handled) return
    }

    this.telegramApi
      .setMessageReaction(botToken, message.chat.id, message.message_id, '👀')
      .catch(() => {})

    await this.telegramRepo.touchLastMessage(serviceSupabase, channel.id)

    const documents = await this.resolveInboundMedia(
      botToken,
      channel.user_id,
      channelOrgId,
      message,
    )
    const contentForAgent = text || (documents.length > 0 ? '[User sent a file]' : '')
    if (!contentForAgent) return

    const typingInterval = this.startTypingIndicator(botToken, chatId)
    let lastPlaceholderMessageId: number | null = null

    try {
      const conversationId = await this.getOrCreateTelegramConversation(
        serviceSupabase,
        channel.user_id,
        agentKey,
        chatId.toString(),
        channelOrgId,
        message.from,
        (channel.provider_config as Record<string, unknown> | null) ?? null,
      )

      const { content: agentResponse, placeholderMessageId } = await withRetry(
        async () => {
          const accessToken = await this.userSessionMint.mintAccessToken(channel.user_id)
          const out = await this.routeToAgentStreaming(
            channel.user_id,
            agentKey,
            contentForAgent,
            chatId.toString(),
            accessToken,
            channelUser,
            { botToken, chatId, messageId: lastPlaceholderMessageId },
            channelOrgId ?? null,
            conversationId,
            documents.length > 0 ? documents : undefined,
          )
          if (out.placeholderMessageId != null) {
            lastPlaceholderMessageId = out.placeholderMessageId
          }
          if (!out.content) {
            throw new Error('empty_agent_response')
          }
          return {
            content: out.content,
            placeholderMessageId: out.placeholderMessageId,
          }
        },
        {
          maxAttempts: 2,
          delayMsAfterFailure: (n) => (1 + n * 2) * 1000,
          retryCondition: (error) => !this.isCreditsExhaustedError(error),
        },
      )

      if (agentResponse.length > 4096 && placeholderMessageId) {
        const chunks = this.splitMessage(agentResponse, 4096)
        for (let i = 1; i < chunks.length; i++) {
          await this.telegramApi.sendMessage(botToken, chatId, chunks[i])
        }
      }
    } catch (err) {
      const errorMsg = (err as Error).message
      this.logger.error(`Failed to process telegram message: ${errorMsg}`)
      await this.telegramRepo.updateChannel(serviceSupabase, channel.user_id, channel.id, {
        error_message: this.telegramErrorDiagnostic(errorMsg),
      })
      if (lastPlaceholderMessageId != null) {
        await this.telegramApi
          .editMessageText(
            botToken,
            chatId,
            lastPlaceholderMessageId,
            this.userFacingTelegramError(errorMsg),
          )
          .catch(() => {})
      } else {
        await this.telegramApi
          .sendMessage(botToken, chatId, this.userFacingTelegramError(errorMsg))
          .catch(() => {})
      }
    } finally {
      clearInterval(typingInterval)
    }
  }
}
