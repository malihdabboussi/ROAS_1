import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildExternalAssetRef } from '@vibey/api-shared'
import { isSlackAuthError, SlackApiIntegration } from '../integrations/slack-api.integration'
import { SlackRepository } from '../repositories/slack.repository'

/**
 * SlackAgentToolsService — executes agent-callable Slack actions using the Vibey bot token.
 *
 * This is the "native" Slack tool path: agents call `use_integration` with
 * `service: 'slack'` + `integration_action: 'SLACK_*'`, which is routed via
 * integration_capabilities.route_config → SlackAgentToolsController → this service.
 *
 * Scope of results is limited to what the Vibey Slack bot has access to in
 * the workspace (channels it was added to, DMs with it, etc.) — Slack scopes
 * bot tokens at the bot identity, not at the asking end-user.
 */
@Injectable()
export class SlackAgentToolsService {
  private readonly logger = new Logger(SlackAgentToolsService.name)
  private static readonly SLACK_FILE_MAX_BYTES = 20 * 1024 * 1024

  constructor(
    private readonly slackApi: SlackApiIntegration,
    private readonly slackRepo: SlackRepository,
  ) {}

  private async resolveBotToken(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<string> {
    const { botToken } = await this.resolveTokens(supabase, userId, orgId)
    return botToken
  }

  private async resolveTokens(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<{ botToken: string; userToken: string | null }> {
    const integration = await this.slackRepo.getIntegration(supabase, userId, orgId)
    if (!integration?.access_token) {
      throw new NotFoundException(
        'Slack is not connected for this user. Connect Slack in Settings first.',
      )
    }
    const metadata =
      integration.metadata && typeof integration.metadata === 'object'
        ? (integration.metadata as Record<string, unknown>)
        : {}
    const userToken =
      typeof metadata.user_access_token === 'string' && metadata.user_access_token.trim()
        ? metadata.user_access_token.trim()
        : null
    return { botToken: integration.access_token, userToken }
  }

  private isNotAllowedTokenTypeError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    return /not_allowed_token_type/i.test(message)
  }

  /**
   * Bot-token fallback when search.messages is unavailable.
   * Scans channel history the bot can read (optionally filtered by in:#channel).
   */
  private async searchMessagesViaChannelHistory(
    botToken: string,
    query: string,
    count = 20,
  ): Promise<{
    ok: boolean
    search_mode: 'channel_history_fallback'
    messages: {
      total: number
      matches: Array<{
        text?: string
        user?: string
        ts?: string
        channel?: { id?: string; name?: string }
      }>
    }
  }> {
    const inMatch = query.match(/\bin:#?([a-z0-9_-]+)\b/i)
    const terms = query
      .replace(/\bin:#?[a-z0-9_-]+\b/gi, ' ')
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2)

    let channels = await this.slackApi.listConversations(botToken)
    if (inMatch?.[1]) {
      const needle = inMatch[1].toLowerCase()
      channels = channels.filter(
        (c) => c.id.toLowerCase() === needle || c.name.toLowerCase() === needle,
      )
    } else {
      channels = channels.slice(0, 30)
    }

    const matches: Array<{
      text?: string
      user?: string
      ts?: string
      channel?: { id?: string; name?: string }
    }> = []

    for (const channel of channels) {
      const history = await this.slackApi.getChannelHistory(botToken, channel.id, 40)
      for (const message of history) {
        const text = typeof message.text === 'string' ? message.text : ''
        const haystack = text.toLowerCase()
        if (terms.length > 0 && !terms.every((term) => haystack.includes(term))) continue
        matches.push({
          text,
          user: typeof message.user === 'string' ? message.user : undefined,
          ts: typeof message.ts === 'string' ? message.ts : undefined,
          channel: { id: channel.id, name: channel.name },
        })
        if (matches.length >= count) break
      }
      if (matches.length >= count) break
    }

    return {
      ok: true,
      search_mode: 'channel_history_fallback',
      messages: { total: matches.length, matches },
    }
  }

  private async runWithSlackAuthMapping<T>(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (!isSlackAuthError(error)) throw error
      await this.slackRepo
        .markIntegrationError(supabase, userId, error.slackError, orgId)
        .catch((err) =>
          this.logger.warn(`Failed to mark Slack integration reconnect-needed: ${err}`),
        )
      throw new UnauthorizedException({
        error: 'slack_needs_reconnect',
        message: 'Slack needs reconnecting. Reconnect Slack in Settings and try again.',
        slack_error: error.slackError,
      })
    }
  }

  async searchMessages(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    params: {
      query: string
      count?: number
      sort?: 'score' | 'timestamp'
      sort_dir?: 'asc' | 'desc'
      cursor?: string
    },
  ) {
    if (!params.query?.trim()) throw new BadRequestException('query is required')
    const { botToken, userToken } = await this.resolveTokens(supabase, userId, orgId)
    const count = params.count ?? 20

    if (userToken) {
      try {
        const result = await this.runWithSlackAuthMapping(supabase, userId, orgId, () =>
          this.slackApi.searchMessages(userToken, params.query, {
            count,
            sort: params.sort,
            sort_dir: params.sort_dir,
            cursor: params.cursor,
          }),
        )
        return { success: true, search_mode: 'search_messages', ...result }
      } catch (error) {
        if (!this.isNotAllowedTokenTypeError(error)) throw error
        this.logger.warn(
          'Slack user token rejected for search.messages; falling back to channel history',
        )
      }
    }

    // Existing installs only have a bot token — search.messages always fails for xoxb.
    const fallback = await this.runWithSlackAuthMapping(supabase, userId, orgId, () =>
      this.searchMessagesViaChannelHistory(botToken, params.query, count),
    )
    return { success: true, ...fallback }
  }

  async searchFiles(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    params: {
      query: string
      count?: number
      sort?: 'score' | 'timestamp'
      sort_dir?: 'asc' | 'desc'
      cursor?: string
    },
  ) {
    if (!params.query?.trim()) throw new BadRequestException('query is required')
    const { userToken } = await this.resolveTokens(supabase, userId, orgId)
    if (!userToken) {
      throw new BadRequestException(
        'Slack file search needs a user token with search:read. Reconnect Slack in Settings, then retry. Meanwhile use SLACK_LIST_CHANNELS + SLACK_GET_CHANNEL_HISTORY for channel context.',
      )
    }
    try {
      const result = await this.runWithSlackAuthMapping(supabase, userId, orgId, () =>
        this.slackApi.searchFiles(userToken, params.query, {
          count: params.count,
          sort: params.sort,
          sort_dir: params.sort_dir,
          cursor: params.cursor,
        }),
      )
      return { success: true, search_mode: 'search_files', ...result }
    } catch (error) {
      if (this.isNotAllowedTokenTypeError(error)) {
        throw new BadRequestException(
          'Slack file search needs a user token with search:read. Reconnect Slack in Settings, then retry.',
        )
      }
      throw error
    }
  }

  async listChannels(supabase: SupabaseClient, userId: string, orgId: string | null | undefined) {
    const botToken = await this.resolveBotToken(supabase, userId, orgId)
    const channels = await this.runWithSlackAuthMapping(supabase, userId, orgId, () =>
      this.slackApi.listConversations(botToken),
    )
    return { success: true, channels }
  }

  async listUsers(supabase: SupabaseClient, userId: string, orgId: string | null | undefined) {
    const botToken = await this.resolveBotToken(supabase, userId, orgId)
    const users = await this.slackApi.listUsers(botToken)
    return { success: true, users }
  }

  async getUserInfo(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    params: { slack_user_id: string },
  ) {
    if (!params.slack_user_id?.trim()) throw new BadRequestException('slack_user_id is required')
    const botToken = await this.resolveBotToken(supabase, userId, orgId)
    const user = await this.slackApi.getUserInfo(botToken, params.slack_user_id)
    return { success: true, user }
  }

  async findUserByEmail(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    params: { email: string },
  ) {
    if (!params.email?.trim()) throw new BadRequestException('email is required')
    const botToken = await this.resolveBotToken(supabase, userId, orgId)
    const user = await this.slackApi.usersLookupByEmail(botToken, params.email)
    return { success: true, user }
  }

  async sendMessage(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    params: {
      channel_id: string
      text: string
      thread_ts?: string
      unfurl_links?: boolean
      unfurl_media?: boolean
    },
  ) {
    if (!params.channel_id?.trim()) throw new BadRequestException('channel_id is required')
    if (!params.text?.trim()) throw new BadRequestException('text is required')
    const botToken = await this.resolveBotToken(supabase, userId, orgId)
    const result = await this.runWithSlackAuthMapping(supabase, userId, orgId, () =>
      this.slackApi.postMessage(botToken, params.channel_id, params.text, params.thread_ts, {
        unfurlLinks: params.unfurl_links,
        unfurlMedia: params.unfurl_media,
      }),
    )
    return { success: true, ...result }
  }

  async updateMessage(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    params: { channel_id: string; ts: string; text: string },
  ) {
    if (!params.channel_id?.trim()) throw new BadRequestException('channel_id is required')
    if (!params.ts?.trim()) throw new BadRequestException('ts is required')
    if (!params.text?.trim()) throw new BadRequestException('text is required')
    const botToken = await this.resolveBotToken(supabase, userId, orgId)
    const result = await this.slackApi.chatUpdate(
      botToken,
      params.channel_id,
      params.ts,
      params.text,
    )
    return { success: true, ...result }
  }

  async deleteMessage(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    params: { channel_id: string; ts: string },
  ) {
    if (!params.channel_id?.trim()) throw new BadRequestException('channel_id is required')
    if (!params.ts?.trim()) throw new BadRequestException('ts is required')
    const botToken = await this.resolveBotToken(supabase, userId, orgId)
    await this.slackApi.chatDelete(botToken, params.channel_id, params.ts)
    return { success: true }
  }

  async getChannelHistory(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    params: { channel_id: string; limit?: number },
  ) {
    if (!params.channel_id?.trim()) throw new BadRequestException('channel_id is required')
    const botToken = await this.resolveBotToken(supabase, userId, orgId)
    const messages = await this.slackApi.getChannelHistory(
      botToken,
      params.channel_id,
      params.limit ?? 10,
    )
    return { success: true, messages }
  }

  async getThreadReplies(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    params: { channel_id: string; thread_ts: string; limit?: number; cursor?: string },
  ) {
    if (!params.channel_id?.trim()) throw new BadRequestException('channel_id is required')
    if (!params.thread_ts?.trim()) throw new BadRequestException('thread_ts is required')
    const botToken = await this.resolveBotToken(supabase, userId, orgId)
    const messages = await this.slackApi.conversationsReplies(
      botToken,
      params.channel_id,
      params.thread_ts,
      {
        limit: params.limit,
        cursor: params.cursor,
      },
    )
    return { success: true, messages }
  }

  async addReaction(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    params: { channel_id: string; ts: string; name: string },
  ) {
    if (!params.channel_id?.trim()) throw new BadRequestException('channel_id is required')
    if (!params.ts?.trim()) throw new BadRequestException('ts is required')
    if (!params.name?.trim()) throw new BadRequestException('name is required')
    const botToken = await this.resolveBotToken(supabase, userId, orgId)
    await this.slackApi.addReaction(botToken, params.channel_id, params.ts, params.name)
    return { success: true }
  }

  async removeReaction(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    params: { channel_id: string; ts: string; name: string },
  ) {
    if (!params.channel_id?.trim()) throw new BadRequestException('channel_id is required')
    if (!params.ts?.trim()) throw new BadRequestException('ts is required')
    if (!params.name?.trim()) throw new BadRequestException('name is required')
    const botToken = await this.resolveBotToken(supabase, userId, orgId)
    await this.slackApi.removeReaction(botToken, params.channel_id, params.ts, params.name)
    return { success: true }
  }

  async openDm(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    params: { slack_user_id: string },
  ) {
    if (!params.slack_user_id?.trim()) throw new BadRequestException('slack_user_id is required')
    const botToken = await this.resolveBotToken(supabase, userId, orgId)
    const channelId = await this.slackApi.openDmChannel(botToken, params.slack_user_id)
    if (!channelId) throw new BadRequestException('Could not open DM with that user')
    return { success: true, channel_id: channelId }
  }

  async uploadFile(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    params: { channel_id: string; file_url: string; filename: string; thread_ts?: string },
  ) {
    if (!params.channel_id?.trim()) throw new BadRequestException('channel_id is required')
    if (!params.file_url?.trim()) throw new BadRequestException('file_url is required')
    if (!params.filename?.trim()) throw new BadRequestException('filename is required')
    const botToken = await this.resolveBotToken(supabase, userId, orgId)

    const res = await fetch(params.file_url)
    if (!res.ok) {
      throw new BadRequestException(`Failed to fetch file_url (${res.status})`)
    }
    const ab = await res.arrayBuffer()
    const buffer = Buffer.from(ab)
    if (buffer.length === 0) throw new BadRequestException('Downloaded file is empty')
    if (buffer.length > SlackAgentToolsService.SLACK_FILE_MAX_BYTES) {
      throw new BadRequestException(
        `File too large: ${buffer.length} bytes (limit ${SlackAgentToolsService.SLACK_FILE_MAX_BYTES})`,
      )
    }

    const uploaded = await this.slackApi.uploadExternalFileToChannel(
      botToken,
      params.channel_id,
      buffer,
      params.filename,
      params.thread_ts,
    )
    const mimeType = res.headers?.get?.('content-type') ?? 'application/octet-stream'
    return {
      success: true,
      bytes: buffer.length,
      asset_ref: buildExternalAssetRef({
        provider: 'slack',
        external_id: uploaded.file_id,
        file_path: params.channel_id,
        url: uploaded.permalink,
        mime_type: mimeType,
        name: params.filename,
        original_filename: params.filename,
        file_size: buffer.length,
        org_id: orgId ?? null,
        source: 'slack',
        source_surface: 'slack',
        metadata: { channel_id: params.channel_id, thread_ts: params.thread_ts ?? null },
      }),
    }
  }

  async getFileInfo(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    params: { file_id: string },
  ) {
    if (!params.file_id?.trim()) throw new BadRequestException('file_id is required')
    const botToken = await this.resolveBotToken(supabase, userId, orgId)
    const result = await this.slackApi.getFileInfo(botToken, params.file_id)
    if (!result.ok) throw new BadRequestException(result.error ?? 'Slack files.info failed')
    return { success: true, file: result.file }
  }
}
