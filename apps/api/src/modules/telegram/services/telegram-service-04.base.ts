import { TelegramServiceBase03 } from './telegram-service-03.base'
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

export abstract class TelegramServiceBase04 extends TelegramServiceBase03 {

  protected userFacingTelegramError(message: string): string {
    if (message === TelegramServiceBase04.AGENT_PROCESSING_FAILED_MESSAGE) {
      return TelegramServiceBase04.AGENT_PROCESSING_FAILED_MESSAGE
    }
    const mapped = this.mapTelegramAgentError(message)
    if (mapped.code !== 'temporary_unavailable') return mapped.userMessage

    if (
      message.toLowerCase().includes('openrouter') ||
      message.toLowerCase().includes('provider') ||
      message.toLowerCase().includes('insufficient credit') ||
      message.toLowerCase().includes('credit balance') ||
      message.toLowerCase().includes('api key') ||
      message.toLowerCase().includes('auth credentials') ||
      message.toLowerCase().includes('gateway') ||
      message.toLowerCase().includes('agent api returned') ||
      message.toLowerCase().includes('fetch failed') ||
      message.toLowerCase().includes('timeout')
    ) {
      return TelegramServiceBase04.AGENT_TEMPORARY_UNAVAILABLE_MESSAGE
    }
    return mapped.userMessage
  }

  /** Prefers the channel's configured default campaign; falls back to the recency heuristic. */
  protected async resolveTelegramCampaignId(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
    providerConfig?: Record<string, unknown> | null,
  ): Promise<string | null> {
    const configured =
      typeof providerConfig?.default_campaign_id === 'string' &&
      providerConfig.default_campaign_id.trim()
        ? providerConfig.default_campaign_id.trim()
        : null
    if (configured) {
      const campaignId = await this.telegramRuntime.findUsableCampaignById(supabase, {
        campaignId: configured,
        userId,
        orgId,
      })
      if (campaignId) return campaignId
      this.logger.warn(
        `Configured Telegram default campaign ${configured} is not usable; falling back to heuristic`,
      )
    }
    return this.getDefaultCampaignIdForUser(supabase, userId, orgId)
  }

  protected async getDefaultCampaignIdForUser(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<string | null> {
    const recent = await this.telegramRuntime.findRecentCampaignId(supabase, { userId, orgId })
    if (recent) return recent
    return this.telegramRuntime.findGeneralCampaignId(supabase, { userId, orgId })
  }

  protected startTypingIndicator(
    botToken: string,
    chatId: number | string,
  ): ReturnType<typeof setInterval> {
    this.telegramApi.sendChatAction(botToken, chatId, 'typing').catch(() => {})
    return setInterval(() => {
      this.telegramApi.sendChatAction(botToken, chatId, 'typing').catch(() => {})
    }, 5000)
  }

  protected splitMessage(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) return [text]
    const chunks: string[] = []
    let remaining = text
    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining)
        break
      }
      let splitAt = remaining.lastIndexOf('\n', maxLength)
      if (splitAt <= 0) splitAt = remaining.lastIndexOf(' ', maxLength)
      if (splitAt <= 0) splitAt = maxLength
      chunks.push(remaining.slice(0, splitAt))
      remaining = remaining.slice(splitAt).trimStart()
    }
    return chunks
  }

  async getVerificationStatus(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ): Promise<{ verified: boolean; telegram_username?: string }> {
    const channel = await this.telegramRepo.findChannelByAgentKey(supabase, userId, agentKey, orgId)
    if (!channel) return { verified: false }
    const config = channel.provider_config as Record<string, unknown>
    if (config.pending_verification) return { verified: false }
    if (!config.owner_telegram_id) return { verified: false }
    return { verified: true, telegram_username: (config.bot_username as string) ?? undefined }
  }

  protected async upsertChannelMember(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    from: {
      id: number
      first_name: string
      last_name?: string
      username?: string
      language_code?: string
      is_bot?: boolean
    },
    telegramChatId: string,
  ): Promise<void> {
    const displayName = [from.first_name, from.last_name].filter(Boolean).join(' ')
    const errorMessage = await this.telegramRuntime.upsertChannelMember(supabase, {
      user_id: userId,
      org_id: orgId ?? null,
      platform: 'telegram',
      platform_id: from.id.toString(),
      display_name: displayName,
      username: from.username ?? null,
      is_bot: from.is_bot ?? false,
      metadata: { language: from.language_code ?? null },
    })
    if (errorMessage) {
      this.logger.warn(`Failed to upsert Telegram member ${from.id}: ${errorMessage}`)
    }

    await this.ensureTelegramContactLinked(supabase, userId, orgId, from, telegramChatId)
  }

  protected async resolveTelegramContactId(
    supabase: SupabaseClient,
    userId: string,
    telegramChatId: string,
    orgId?: string | null,
  ): Promise<string | null> {
    const contact = await this.contactIdentifier.resolveByKind(
      supabase,
      { userId, orgId: orgId ?? null },
      'telegram_chat_id',
      telegramChatId,
    )
    return contact?.id ?? null
  }

  protected async ensureTelegramContactLinked(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    from: {
      id: number
      first_name: string
      last_name?: string
      username?: string
    },
    telegramChatId: string,
  ): Promise<string | null> {
    const contact = await this.contactIdentifier.findOrCreateContact(supabase, {
      userId,
      orgId,
      kind: 'telegram_chat_id',
      value: telegramChatId,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      channel: 'telegram',
      detail: from.username ? `@${from.username}` : null,
    })

    const linkError = await this.telegramRuntime.patchTelegramConversationContact(supabase, {
      userId,
      telegramChatId,
      contactId: contact.id,
      orgId,
    })
    if (linkError) {
      this.logger.warn(
        `Failed to link Telegram conversations for chat ${telegramChatId}: ${linkError}`,
      )
    }

    const { rows: conversations, errorMessage } =
      await this.telegramRuntime.listTelegramConversationsWithCampaign(supabase, {
        userId,
        telegramChatId,
        orgId,
      })
    if (errorMessage) {
      this.logger.warn(
        `Failed to load Telegram conversations for campaign link ${telegramChatId}: ${errorMessage}`,
      )
      return contact.id
    }

    for (const row of conversations ?? []) {
      const campaignId = (row as { campaign_id?: string | null }).campaign_id
      const agentKey = (row as { agent_id?: string | null }).agent_id
      if (!campaignId) continue
      await this.linkTelegramContactToCampaign(
        supabase,
        userId,
        contact.id,
        campaignId,
        agentKey ?? undefined,
      )
    }

    return contact.id
  }

  protected async linkTelegramContactToCampaign(
    supabase: SupabaseClient,
    userId: string,
    contactId: string,
    campaignId: string,
    agentKey?: string,
  ): Promise<void> {
    const errorMessage = await this.telegramRuntime.upsertContactCampaignMembership(supabase, {
      user_id: userId,
      contact_id: contactId,
      campaign_id: campaignId,
      last_seen_at: new Date().toISOString(),
      metadata: {
        source: 'telegram',
        ...(agentKey ? { agent_key: agentKey } : {}),
      },
    })
    if (errorMessage) {
      this.logger.warn(
        `Failed to link Telegram contact ${contactId} to campaign ${campaignId}: ${errorMessage}`,
      )
    }
  }

  protected getServiceRoleClient(): SupabaseClient {
    return this.telegramRuntime.createServiceRoleClient(this.resilientFetch)
  }
}
