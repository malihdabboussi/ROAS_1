import { TelegramServiceBase01 } from './telegram-service-01.base'
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

export abstract class TelegramServiceBase02 extends TelegramServiceBase01 {

  protected async handleCallbackQuery(
    userId: string,
    botToken: string,
    callbackQuery: {
      id: string
      from: { id: number }
      message?: { message_id: number; chat: { id: number } }
      data?: string
    },
  ) {
    const data = callbackQuery.data || ''
    const chatId = callbackQuery.message?.chat?.id
    const messageId = callbackQuery.message?.message_id

    if (data.startsWith('email_approve:') || data.startsWith('email_cancel:')) {
      const [action, pendingSendId] = data.split(':')
      if (!pendingSendId) {
        await this.telegramApi.answerCallbackQuery(botToken, callbackQuery.id, 'Invalid request')
        return
      }

      try {
        const apiUrl = process.env.APP_URL || 'http://localhost:3001'
        const endpoint =
          action === 'email_approve'
            ? '/api/email-campaigns/approve'
            : '/api/email-campaigns/cancel'
        const res = await fetch(`${apiUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId,
            'X-Internal-Token': process.env.INTERNAL_API_TOKEN || '',
          },
          body: JSON.stringify({ pending_send_id: pendingSendId }),
        })

        const result = (await res.json()) as { success?: boolean; error?: string }
        const statusText =
          action === 'email_approve'
            ? result.success
              ? 'Email campaign sent!'
              : `Failed: ${result.error || 'Unknown error'}`
            : 'Email campaign cancelled.'

        await this.telegramApi.answerCallbackQuery(botToken, callbackQuery.id, statusText)

        if (chatId && messageId) {
          await this.telegramApi.editMessageText(botToken, chatId, messageId, statusText)
        }
      } catch (err) {
        this.logger.error(`Callback query failed: ${(err as Error).message}`)
        await this.telegramApi.answerCallbackQuery(
          botToken,
          callbackQuery.id,
          'Error processing request',
        )
      }
      return
    }

    await this.telegramApi.answerCallbackQuery(botToken, callbackQuery.id)
  }

  protected async handleSlashCommand(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    botToken: string,
    chatId: number,
    text: string,
    orgId?: string | null,
  ): Promise<boolean> {
    const match = text.match(/^\/(\w+)(?:\s+(.*))?$/)
    if (!match) return false

    const command = match[1].toLowerCase()
    const args = match[2]?.trim() ?? ''

    switch (command) {
      case 'reset':
      case 'new':
        return this.cmdReset(supabase, userId, agentKey, botToken, chatId, orgId)
      case 'help':
        return this.cmdHelp(botToken, chatId)
      case 'status':
        return this.cmdStatus(supabase, userId, agentKey, botToken, chatId, orgId)
      case 'campaign':
        return this.cmdCampaign(supabase, userId, agentKey, botToken, chatId, args, orgId)
      default:
        return false
    }
  }

  protected async cmdReset(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    botToken: string,
    chatId: number,
    orgId?: string | null,
  ): Promise<true> {
    await this.telegramRuntime.archiveActiveTelegramConversation(supabase, {
      userId,
      agentKey,
      telegramChatId: String(chatId),
      orgId,
    })

    await this.telegramApi.sendMessage(
      botToken,
      chatId,
      'Session reset. Send a message to start fresh.',
    )
    return true
  }

  protected async cmdHelp(botToken: string, chatId: number): Promise<true> {
    const lines = ['*Available commands:*', '']
    for (const cmd of TelegramServiceBase02.TELEGRAM_COMMANDS) {
      if (cmd.command === 'new') continue
      lines.push(`/${cmd.command} — ${cmd.description}`)
    }
    await this.telegramApi.sendMessage(botToken, chatId, lines.join('\n'))
    return true
  }

  protected async cmdStatus(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    botToken: string,
    chatId: number,
    orgId?: string | null,
  ): Promise<true> {
    const conv = await this.telegramRuntime.findActiveTelegramConversation(supabase, {
      userId,
      agentKey,
      telegramChatId: String(chatId),
      orgId,
    })

    let campaignName = 'None'
    if (conv?.campaign_id) {
      campaignName = (await this.telegramRuntime.findCampaignName(supabase, conv.campaign_id)) ?? 'None'
    }

    const missionRows = await this.telegramRuntime.listActiveMissions(supabase, { userId, orgId })
    const lines = ['*Session Status*', '']
    lines.push(`Campaign: ${campaignName}`)
    lines.push(`Agent: ${agentKey}`)
    if (conv?.created_at) {
      const created = new Date(conv.created_at)
      lines.push(
        `Session started: ${created.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      )
    }

    if (missionRows.length > 0) {
      lines.push('')
      lines.push(`*Missions (${missionRows.length} active)*`)
      const statusEmoji: Record<string, string> = {
        in_progress: '🔄',
        todo: '📋',
        review: '👀',
        blocked: '🚫',
        planning: '📝',
      }
      for (const m of missionRows) {
        const emoji = statusEmoji[m.status] ?? '•'
        const prio = m.priority === 'high' || m.priority === 'urgent' ? ` ⚡` : ''
        lines.push(`${emoji} ${m.title}${prio}`)
      }
    } else {
      lines.push('')
      lines.push('No active missions.')
    }

    await this.telegramApi.sendMessage(botToken, chatId, lines.join('\n'))
    return true
  }

  protected async cmdCampaign(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    botToken: string,
    chatId: number,
    args: string,
    orgId?: string | null,
  ): Promise<true> {
    if (!args) {
      const conv = await this.telegramRuntime.findActiveTelegramConversation(supabase, {
        userId,
        agentKey,
        telegramChatId: String(chatId),
        orgId,
      })
      const rows = await this.telegramRuntime.listUserCampaigns(supabase, { userId, orgId })
      if (rows.length === 0) {
        await this.telegramApi.sendMessage(botToken, chatId, 'No campaigns found.')
        return true
      }

      const lines = ['*Your campaigns:*', '']
      for (const c of rows) {
        const active = conv?.campaign_id === c.id ? ' ✅' : ''
        lines.push(`• ${c.name}${active}`)
      }
      lines.push('')
      lines.push('Switch with: /campaign <name>')
      await this.telegramApi.sendMessage(botToken, chatId, lines.join('\n'))
      return true
    }

    const searchName = args.toLowerCase()
    const matchRows = await this.telegramRuntime.searchUserCampaigns(supabase, {
      userId,
      orgId,
      searchName,
    })
    if (matchRows.length === 0) {
      await this.telegramApi.sendMessage(botToken, chatId, `No campaign matching "${args}" found.`)
      return true
    }
    if (matchRows.length > 1) {
      const names = matchRows.map((c) => `• ${c.name}`).join('\n')
      await this.telegramApi.sendMessage(
        botToken,
        chatId,
        `Multiple matches:\n${names}\n\nBe more specific.`,
      )
      return true
    }

    const target = matchRows[0]
    await this.telegramRuntime.updateActiveTelegramConversationCampaign(supabase, {
      userId,
      agentKey,
      telegramChatId: String(chatId),
      campaignId: target.id,
      orgId,
    })

    await this.telegramApi.sendMessage(botToken, chatId, `Switched to campaign: ${target.name}`)
    return true
  }

  protected extractFileId(message: TelegramMessage): {
    fileId: string
    type: 'image' | 'video' | 'text'
    filename: string
    mimeType?: string
  } | null {
    if (message.photo && message.photo.length > 0) {
      const largest = message.photo[message.photo.length - 1]
      return {
        fileId: largest.file_id,
        type: 'image',
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
      }
    }
    if (message.video) {
      return {
        fileId: message.video.file_id,
        type: 'video',
        filename: 'video.mp4',
        mimeType: message.video.mime_type ?? 'video/mp4',
      }
    }
    if (message.document) {
      const mime = message.document.mime_type ?? 'application/octet-stream'
      const isImage = mime.startsWith('image/')
      const isVideo = mime.startsWith('video/')
      return {
        fileId: message.document.file_id,
        type: isImage ? 'image' : isVideo ? 'video' : 'text',
        filename: message.document.file_name ?? 'document',
        mimeType: mime,
      }
    }
    if (message.audio) {
      return {
        fileId: message.audio.file_id,
        type: 'text',
        filename: message.audio.file_name ?? 'audio.mp3',
        mimeType: message.audio.mime_type ?? 'audio/mpeg',
      }
    }
    if (message.voice) {
      return {
        fileId: message.voice.file_id,
        type: 'text',
        filename: 'voice.ogg',
        mimeType: message.voice.mime_type ?? 'audio/ogg',
      }
    }
    if (message.video_note) {
      return {
        fileId: message.video_note.file_id,
        type: 'video',
        filename: 'video_note.mp4',
        mimeType: 'video/mp4',
      }
    }
    return null
  }

  protected async resolveInboundMedia(
    botToken: string,
    userId: string,
    orgId: string | null | undefined,
    message: TelegramMessage,
  ): Promise<
    Array<{
      filename: string
      type: 'text' | 'image' | 'video'
      fileUrl: string
      mimeType?: string
      text?: string
    }>
  > {
    const extracted = this.extractFileId(message)
    if (!extracted) return []

    try {
      const telegramFile = await this.telegramApi.getFile(botToken, extracted.fileId)
      if (!telegramFile.file_path) {
        this.logger.warn(`Telegram getFile returned no file_path for ${extracted.fileId}`)
        return []
      }

      if (
        telegramFile.file_size &&
        telegramFile.file_size > TelegramServiceBase02.TELEGRAM_MEDIA_MAX_BYTES
      ) {
        this.logger.warn(
          `Telegram file too large: ${telegramFile.file_size} bytes (limit ${TelegramServiceBase02.TELEGRAM_MEDIA_MAX_BYTES})`,
        )
        return []
      }

      const { buffer, contentType: downloadContentType } = await this.telegramApi.downloadFile(
        botToken,
        telegramFile.file_path,
      )
      const effectiveMimeType =
        extracted.mimeType && extracted.mimeType !== 'application/octet-stream'
          ? extracted.mimeType
          : downloadContentType !== 'application/octet-stream'
            ? downloadContentType
            : this.inferMimeFromFilename(extracted.filename)
      const permanentUrl = await this.uploadTelegramMediaToStorage(
        buffer,
        effectiveMimeType,
        userId,
        extracted.filename,
      )

      let extractedText: string | undefined
      if (extracted.type === 'text') {
        extractedText = await this.tryExtractText(
          buffer,
          effectiveMimeType,
          extracted.filename,
          userId,
          orgId,
        )
      }

      return [
        {
          filename: extracted.filename,
          type: extracted.type,
          fileUrl: permanentUrl,
          mimeType: effectiveMimeType,
          text: extractedText,
        },
      ]
    } catch (err) {
      this.logger.error(`Failed to resolve inbound Telegram media: ${(err as Error).message}`)
      return []
    }
  }

  protected async tryExtractText(
    buffer: Buffer,
    mimeType: string,
    filename: string,
    userId: string,
    orgId?: string | null,
  ): Promise<string | undefined> {
    try {
      const ext = filename.toLowerCase().split('.').pop() ?? ''
      if (mimeType.startsWith('text/') || TelegramServiceBase02.PLAIN_TEXT_EXTENSIONS.has(ext)) {
        return buffer.toString('utf-8').trim() || undefined
      }
      const text = await this.documentExtraction.extractText(buffer, mimeType, filename, {
        userId,
        orgId: orgId ?? undefined,
        feature: 'telegram',
        action: 'document_ocr',
      })
      return text?.trim() || undefined
    } catch (err) {
      this.logger.warn(`Text extraction failed for ${filename}: ${(err as Error).message}`)
      return undefined
    }
  }

  protected inferMimeFromFilename(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (ext && ext in TelegramServiceBase02.EXTENSION_MIME_MAP) {
      return TelegramServiceBase02.EXTENSION_MIME_MAP[ext]
    }
    return 'application/octet-stream'
  }

  protected async uploadTelegramMediaToStorage(
    buffer: Buffer,
    contentType: string,
    userId: string,
    filename: string,
  ): Promise<string> {
    const supabase = this.getServiceRoleClient()
    const storagePath = `${userId}/telegram/${randomUUID()}-${filename}`
    return this.telegramRuntime.uploadMedia(supabase, storagePath, buffer, contentType)
  }
}
