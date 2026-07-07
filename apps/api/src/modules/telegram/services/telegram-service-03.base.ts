import { TelegramServiceBase02 } from './telegram-service-02.base'
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

export abstract class TelegramServiceBase03 extends TelegramServiceBase02 {

  protected async routeToAgentStreaming(
    userId: string,
    agentKey: string,
    userMessage: string,
    telegramChatId: string,
    accessToken: string,
    channelUser:
      | { platform_id: string; username?: string; display_name: string; language?: string }
      | undefined,
    stream: { botToken: string; chatId: number | string; messageId: number | null },
    orgId: string | null | undefined,
    conversationId: string,
    documents?: Array<{
      filename: string
      type: 'text' | 'image' | 'video'
      fileUrl: string
      mimeType?: string
      text?: string
    }>,
  ): Promise<{ content: string | null; placeholderMessageId: number | null }> {
    const internalToken = process.env.INTERNAL_API_TOKEN ?? ''
    let effectiveMessageId = stream.messageId
    if (effectiveMessageId == null) {
      const placeholderMsg = (await this.telegramApi.sendMessage(
        stream.botToken,
        stream.chatId,
        'Thinking...',
      )) as { message_id?: number }
      effectiveMessageId = placeholderMsg?.message_id ?? null
    }

    const response = await this.userAgentApi.invoke(
      userId,
      '/api/channel-chat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': internalToken,
        },
        body: JSON.stringify({
          user_id: userId,
          conversation_id: conversationId,
          content: userMessage,
          source: 'telegram',
          access_token: accessToken,
          channel_user: channelUser,
          org_id: orgId ?? null,
          ...(documents && documents.length > 0 ? { documents } : {}),
        }),
      },
      {
        timeoutMs: TelegramServiceBase03.AGENT_FETCH_TIMEOUT_MS,
        logTag: `telegram user=${userId}`,
        onMachineWakeStart: async () => {
          if (effectiveMessageId != null) {
            await this.telegramApi
              .editMessageText(
                stream.botToken,
                stream.chatId,
                effectiveMessageId,
                TelegramServiceBase03.MACHINE_WAKE_START_MESSAGE,
              )
              .catch(() => {})
          } else {
            await this.telegramApi
              .sendMessage(
                stream.botToken,
                stream.chatId,
                TelegramServiceBase03.MACHINE_WAKE_START_MESSAGE,
              )
              .catch(() => {})
          }
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Agent API returned ${response.status}`)
    }

    const result = await this.streamSseToTelegram(response, {
      ...stream,
      messageId: effectiveMessageId,
    })
    return { content: result, placeholderMessageId: effectiveMessageId }
  }

  protected async streamSseToTelegram(
    response: Response,
    stream: { botToken: string; chatId: number | string; messageId: number | null },
  ): Promise<string | null> {
    const reader = response.body?.getReader()
    if (!reader) {
      this.logger.warn(`[Telegram SSE] No response body reader available`)
      return null
    }

    const decoder = new TextDecoder()
    let fullContent = ''
    let buffer = ''
    let lastEditAt = 0
    const EDIT_THROTTLE_MS = 650
    let eventCount = 0
    let contentDeltaCount = 0
    let streamError: TelegramAgentErrorMapping | null = null
    let lastEditedLength = 0
    let lastEditedPreview = ''
    let lastProgressAt = Date.now()

    try {
      while (true) {
        const readResult =
          fullContent.length > 0
            ? await reader.read()
            : await this.readSseChunkWithTimeout(
                reader,
                Math.max(
                  1,
                  TelegramServiceBase03.AGENT_EMPTY_STREAM_TIMEOUT_MS - (Date.now() - lastProgressAt),
                ),
              )
        if (readResult === 'timeout') {
          streamError = this.mapTelegramAgentError('agent_stream_timeout', 'no_answer')
          await reader.cancel().catch(() => {})
          break
        }

        const { done, value } = readResult
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue

          try {
            const event = JSON.parse(data) as Record<string, unknown>
            eventCount++
            lastProgressAt = Date.now()
            const eventCode = typeof event.code === 'string' ? event.code : undefined
            if (event.type === 'content_delta' && typeof event.content === 'string') {
              fullContent += event.content
              contentDeltaCount++
            } else if (event.type === 'error' && typeof event.message === 'string') {
              streamError = this.mapTelegramAgentError(event.message, eventCode)
              this.logger.warn(
                `[Telegram SSE] Agent stream error: ${streamError.diagnostic} raw="${event.message}"`,
              )
            } else if (event.type === 'rate_limit_notice' && typeof event.message === 'string') {
              streamError = this.mapTelegramAgentError(event.message, 'busy')
              this.logger.warn(`[Telegram SSE] Agent busy: ${streamError.diagnostic}`)
            } else if (
              event.type === 'status' &&
              event.status === 'failed' &&
              typeof event.message === 'string'
            ) {
              streamError = this.mapTelegramAgentError(event.message, eventCode)
              this.logger.warn(
                `[Telegram SSE] Agent stream failed: ${streamError.diagnostic} raw="${event.message}"`,
              )
            }
          } catch {}
        }

        if (stream.messageId && fullContent) {
          const now = Date.now()
          if (now - lastEditAt >= EDIT_THROTTLE_MS) {
            const preview =
              fullContent.length > 4096 ? fullContent.slice(0, 4093) + '...' : fullContent
            if (preview === lastEditedPreview) continue
            await this.telegramApi
              .editMessageText(stream.botToken, stream.chatId, stream.messageId, preview)
              .catch((err: unknown) => {
                if (isTelegramMessageNotModifiedError(err)) return
                this.logger.error(
                  `[Telegram SSE] editMessageText (throttled) failed: ${(err as Error).message}`,
                )
              })
            lastEditAt = now
            lastEditedLength = fullContent.length
            lastEditedPreview = preview
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    this.logger.log(
      `[Telegram SSE] stream_done chatId=${stream.chatId} messageId=${stream.messageId} events=${eventCount} contentDeltas=${contentDeltaCount} contentLen=${fullContent.length} error=${streamError?.diagnostic ?? 'none'}`,
    )

    if (fullContent && stream.messageId && fullContent.length !== lastEditedLength) {
      const finalText = fullContent.length > 4096 ? fullContent.slice(0, 4093) + '...' : fullContent
      if (finalText !== lastEditedPreview) {
        await this.telegramApi
          .editMessageText(stream.botToken, stream.chatId, stream.messageId, finalText)
          .catch((err: unknown) => {
            if (isTelegramMessageNotModifiedError(err)) return
            this.logger.error(
              `[Telegram SSE] editMessageText (final) failed: ${(err as Error).message}`,
            )
          })
      }
    } else if (fullContent && !stream.messageId) {
      const chunks = this.splitMessage(fullContent, 4096)
      for (const chunk of chunks) {
        await this.telegramApi.sendMessage(stream.botToken, stream.chatId, chunk)
      }
    } else if (!fullContent) {
      this.logger.warn(
        `[Telegram SSE] No content received from agent stream. chatId=${stream.chatId} events=${eventCount} error=${streamError?.diagnostic ?? 'none'}`,
      )
      if (streamError) {
        if (stream.messageId) {
          await this.telegramApi
            .editMessageText(
              stream.botToken,
              stream.chatId,
              stream.messageId,
              streamError.userMessage,
            )
            .catch(() => {})
        } else {
          await this.telegramApi
            .sendMessage(stream.botToken, stream.chatId, streamError.userMessage)
            .catch(() => {})
        }
        throw new Error(streamError.diagnostic)
      } else if (stream.messageId) {
        await this.telegramApi
          .editMessageText(
            stream.botToken,
            stream.chatId,
            stream.messageId,
            TelegramServiceBase03.EMPTY_AGENT_RESPONSE_MESSAGE,
          )
          .catch(() => {})
      }
    }

    if (fullContent) {
      await this.sendOutboundMedia(stream.botToken, stream.chatId, fullContent)
    }

    return fullContent || null
  }

  protected async sendOutboundMedia(
    botToken: string,
    chatId: number | string,
    content: string,
  ): Promise<void> {
    const mediaUrls: Array<{ url: string; type: 'photo' | 'video' | 'document' }> = []

    const markdownImagePattern = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g
    let match: RegExpExecArray | null
    while ((match = markdownImagePattern.exec(content)) !== null) {
      mediaUrls.push({ url: match[1], type: 'photo' })
    }

    const mediaDirectivePattern = /MEDIA:(https?:\/\/[^\s]+)/g
    while ((match = mediaDirectivePattern.exec(content)) !== null) {
      const url = match[1]
      if (TelegramServiceBase03.VIDEO_EXTENSIONS.test(url)) {
        mediaUrls.push({ url, type: 'video' })
      } else if (TelegramServiceBase03.DOCUMENT_EXTENSIONS.test(url)) {
        mediaUrls.push({ url, type: 'document' })
      } else {
        mediaUrls.push({ url, type: 'photo' })
      }
    }

    const seen = new Set<string>()
    for (const media of mediaUrls) {
      if (seen.has(media.url)) continue
      seen.add(media.url)
      try {
        if (media.type === 'photo') {
          await this.telegramApi.sendPhoto(botToken, chatId, media.url)
        } else if (media.type === 'video') {
          await this.telegramApi.sendVideo(botToken, chatId, media.url)
        } else {
          await this.telegramApi.sendDocument(botToken, chatId, media.url)
        }
      } catch (err) {
        this.logger.warn(
          `[Telegram outbound] Failed to send media ${media.type}: ${(err as Error).message}`,
        )
      }
    }
  }

  protected async getOrCreateTelegramConversation(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    telegramChatId: string,
    orgId?: string | null,
    from?: {
      id: number
      first_name: string
      last_name?: string
      username?: string
    },
    providerConfig?: Record<string, unknown> | null,
  ): Promise<string> {
    const contactId = from
      ? await this.ensureTelegramContactLinked(supabase, userId, orgId, from, telegramChatId)
      : await this.resolveTelegramContactId(supabase, userId, telegramChatId, orgId)

    const existing = await this.telegramRuntime.findActiveTelegramConversation(supabase, {
      userId,
      agentKey,
      telegramChatId,
      orgId,
    })

    if (existing) {
      const patch: Record<string, unknown> = {}
      let effectiveCampaignId =
        typeof existing.campaign_id === 'string' && existing.campaign_id
          ? existing.campaign_id
          : null
      if (!existing.campaign_id) {
        const campaignId = await this.resolveTelegramCampaignId(
          supabase,
          userId,
          orgId,
          providerConfig,
        )
        if (campaignId) {
          patch.campaign_id = campaignId
          effectiveCampaignId = campaignId
        }
      }
      if (!existing.contact_id && contactId) patch.contact_id = contactId
      if (Object.keys(patch).length > 0) {
        await this.telegramRuntime.updateConversation(supabase, existing.id, userId, patch)
      }
      if (contactId && effectiveCampaignId) {
        await this.linkTelegramContactToCampaign(
          supabase,
          userId,
          contactId,
          effectiveCampaignId,
          agentKey,
        )
      }
      return existing.id
    }

    const campaignId = await this.resolveTelegramCampaignId(supabase, userId, orgId, providerConfig)
    const insertPayload: Record<string, unknown> = {
      user_id: userId,
      title: `Telegram Chat`,
      agent_id: agentKey,
      metadata: {
        telegram_chat_id: telegramChatId,
        source: 'telegram',
      },
      org_id: orgId ?? null,
    }
    if (campaignId) insertPayload.campaign_id = campaignId
    if (contactId) insertPayload.contact_id = contactId

    const created = await this.telegramRuntime.createTelegramConversation(supabase, insertPayload)

    if (contactId && campaignId) {
      await this.linkTelegramContactToCampaign(supabase, userId, contactId, campaignId, agentKey)
    }
    return created.id
  }

  protected async readSseChunkWithTimeout(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    timeoutMs: number,
  ): Promise<ReadableStreamReadResult<Uint8Array> | 'timeout'> {
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null
    try {
      return await Promise.race([
        reader.read(),
        new Promise<'timeout'>((resolve) => {
          timeoutHandle = setTimeout(() => resolve('timeout'), timeoutMs)
        }),
      ])
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle)
    }
  }

  protected isCreditsExhaustedError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '')
    const normalized = message.toLowerCase()
    return (
      normalized.includes('credits_exhausted') || normalized.includes('agent request failed (402)')
    )
  }

  protected mapTelegramAgentError(message: string, code?: string): TelegramAgentErrorMapping {
    const normalized = message.toLowerCase()
    const normalizedCode = (code ?? '').toLowerCase()
    let mappedCode: TelegramAgentErrorCode = 'temporary_unavailable'

    if (
      normalizedCode === 'workspace_blocked' ||
      normalized === 'workspace_blocked' ||
      this.isCreditsExhaustedError(new Error(message))
    ) {
      mappedCode = 'workspace_blocked'
    } else if (
      normalizedCode === 'busy' ||
      normalized === 'busy' ||
      this.isBusyAgentError(normalized)
    ) {
      mappedCode = 'busy'
    } else if (
      normalizedCode === 'no_answer' ||
      normalized === 'no_answer' ||
      this.isNoAnswerAgentError(normalized)
    ) {
      mappedCode = 'no_answer'
    } else if (
      normalizedCode === 'waking_up' ||
      normalized === 'waking_up' ||
      normalized.includes('usermachineunreachableerror') ||
      normalized.includes('user machine failed to start') ||
      normalized.includes('user machine unavailable (circuit open)') ||
      normalized.includes('circuit open') ||
      normalized.includes('machine start timeout') ||
      normalized.includes('machine not ready')
    ) {
      mappedCode = 'waking_up'
    }

    const userMessage =
      mappedCode === 'workspace_blocked'
        ? TelegramServiceBase03.CREDITS_EXHAUSTED_MESSAGE
        : mappedCode === 'busy'
          ? TelegramServiceBase03.AGENT_BUSY_MESSAGE
          : mappedCode === 'no_answer'
            ? TelegramServiceBase03.EMPTY_AGENT_RESPONSE_MESSAGE
            : mappedCode === 'waking_up'
              ? TelegramServiceBase03.MACHINE_UNREACHABLE_MESSAGE
              : TelegramServiceBase03.AGENT_TEMPORARY_UNAVAILABLE_MESSAGE

    return { code: mappedCode, userMessage, diagnostic: mappedCode }
  }

  protected isBusyAgentError(normalizedMessage: string): boolean {
    return (
      normalizedMessage.includes('temporarily overloaded') ||
      normalizedMessage.includes('overloaded') ||
      normalizedMessage.includes('rate limit') ||
      normalizedMessage.includes('too many requests') ||
      normalizedMessage.includes('service unavailable') ||
      normalizedMessage.includes('high demand')
    )
  }

  protected isNoAnswerAgentError(normalizedMessage: string): boolean {
    return (
      normalizedMessage === 'empty_agent_response' ||
      normalizedMessage.includes('agent_stream_timeout') ||
      normalizedMessage.includes('stream_stalled') ||
      normalizedMessage.includes('no response') ||
      normalizedMessage.includes('empty response') ||
      normalizedMessage.includes('the operation was aborted due to timeout')
    )
  }

  protected telegramErrorDiagnostic(message: string): string {
    return this.mapTelegramAgentError(message).diagnostic
  }
}
