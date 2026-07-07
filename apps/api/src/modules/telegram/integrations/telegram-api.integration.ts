import { Injectable, Logger } from '@nestjs/common'
import type { TelegramApiResponse, TelegramBotInfo, TelegramFile } from '../types/telegram.types'

const TELEGRAM_API_BASE = 'https://api.telegram.org'
const TELEGRAM_MESSAGE_NOT_MODIFIED = 'message is not modified'

export function isTelegramMessageNotModifiedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return message.toLowerCase().includes(TELEGRAM_MESSAGE_NOT_MODIFIED)
}

@Injectable()
export class TelegramApiIntegration {
  private readonly logger = new Logger(TelegramApiIntegration.name)

  async getMe(botToken: string): Promise<TelegramBotInfo> {
    const res = await this.callApi<TelegramBotInfo>(botToken, 'getMe')
    return res
  }

  async setWebhook(botToken: string, webhookUrl: string, secretToken: string): Promise<boolean> {
    const res = await this.callApi<boolean>(botToken, 'setWebhook', {
      url: webhookUrl,
      secret_token: secretToken,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: true,
    })
    return res
  }

  async deleteWebhook(botToken: string): Promise<boolean> {
    const res = await this.callApi<boolean>(botToken, 'deleteWebhook', {
      drop_pending_updates: true,
    })
    return res
  }

  async sendChatAction(
    botToken: string,
    chatId: number | string,
    action: 'typing' | 'upload_photo' | 'record_voice' | 'upload_document' = 'typing',
  ): Promise<boolean> {
    return this.callApi<boolean>(botToken, 'sendChatAction', {
      chat_id: chatId,
      action,
    })
  }

  async sendMessage(
    botToken: string,
    chatId: number | string,
    text: string,
    parseMode?: 'HTML' | 'MarkdownV2',
  ): Promise<unknown> {
    const body: Record<string, unknown> = { chat_id: chatId, text }
    if (parseMode) body.parse_mode = parseMode
    return this.callApi(botToken, 'sendMessage', body)
  }

  async sendMessageWithInlineKeyboard(
    botToken: string,
    chatId: number | string,
    text: string,
    inlineKeyboard: Array<Array<{ text: string; callback_data: string }>>,
  ): Promise<unknown> {
    return this.callApi(botToken, 'sendMessage', {
      chat_id: chatId,
      text,
      reply_markup: { inline_keyboard: inlineKeyboard },
    })
  }

  async editMessageText(
    botToken: string,
    chatId: number | string,
    messageId: number,
    text: string,
  ): Promise<unknown> {
    return this.callApi(botToken, 'editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
    })
  }

  async answerCallbackQuery(
    botToken: string,
    callbackQueryId: string,
    text?: string,
  ): Promise<unknown> {
    const body: Record<string, unknown> = { callback_query_id: callbackQueryId }
    if (text) body.text = text
    return this.callApi(botToken, 'answerCallbackQuery', body)
  }

  async setMyCommands(
    botToken: string,
    commands: Array<{ command: string; description: string }>,
  ): Promise<boolean> {
    return this.callApi<boolean>(botToken, 'setMyCommands', { commands })
  }

  async setMessageReaction(
    botToken: string,
    chatId: number | string,
    messageId: number,
    emoji: string,
  ): Promise<boolean> {
    return this.callApi<boolean>(botToken, 'setMessageReaction', {
      chat_id: chatId,
      message_id: messageId,
      reaction: [{ type: 'emoji', emoji }],
    })
  }

  async getFile(botToken: string, fileId: string): Promise<TelegramFile> {
    return this.callApi<TelegramFile>(botToken, 'getFile', { file_id: fileId })
  }

  async downloadFile(
    botToken: string,
    filePath: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const url = `${TELEGRAM_API_BASE}/file/bot${botToken}/${filePath}`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Telegram file download failed: ${response.status} ${response.statusText}`)
    }
    const contentType = response.headers.get('content-type') ?? 'application/octet-stream'
    const arrayBuffer = await response.arrayBuffer()
    return { buffer: Buffer.from(arrayBuffer), contentType }
  }

  async sendPhoto(
    botToken: string,
    chatId: number | string,
    photoUrl: string,
    caption?: string,
  ): Promise<unknown> {
    const body: Record<string, unknown> = { chat_id: chatId, photo: photoUrl }
    if (caption) body.caption = caption
    return this.callApi(botToken, 'sendPhoto', body)
  }

  async sendDocument(
    botToken: string,
    chatId: number | string,
    documentUrl: string,
    caption?: string,
  ): Promise<unknown> {
    const body: Record<string, unknown> = { chat_id: chatId, document: documentUrl }
    if (caption) body.caption = caption
    return this.callApi(botToken, 'sendDocument', body)
  }

  async sendVideo(
    botToken: string,
    chatId: number | string,
    videoUrl: string,
    caption?: string,
  ): Promise<unknown> {
    const body: Record<string, unknown> = { chat_id: chatId, video: videoUrl }
    if (caption) body.caption = caption
    return this.callApi(botToken, 'sendVideo', body)
  }

  private async callApi<T>(
    botToken: string,
    method: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${TELEGRAM_API_BASE}/bot${botToken}/${method}`
    const options: RequestInit = {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
    if (body) options.body = JSON.stringify(body)

    const response = await fetch(url, options)
    const json = (await response.json()) as TelegramApiResponse<T>

    if (!json.ok) {
      if (
        method === 'editMessageText' &&
        json.description?.toLowerCase().includes(TELEGRAM_MESSAGE_NOT_MODIFIED)
      ) {
        this.logger.debug(`Telegram API ${method} skipped unchanged message`)
        return true as T
      }
      this.logger.error(`Telegram API ${method} failed: ${json.description}`)
      throw new Error(json.description ?? `Telegram API ${method} failed`)
    }

    return json.result as T
  }
}
