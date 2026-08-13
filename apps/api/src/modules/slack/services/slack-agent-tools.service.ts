import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildExternalAssetRef } from '@vibey/api-shared'
import { isSlackAuthError, SlackApiIntegration } from '../integrations/slack-api.integration'
import { SlackRepository } from '../repositories/slack.repository'
import type { SlackBlock } from '../types/slack.types'
import { SlackArchiveSearchService } from './slack-archive-search.service'
import { searchSlackChannelHistory } from './slack-channel-history-search'

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
    @Optional() private readonly archiveSearch?: SlackArchiveSearchService,
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
  ): Promise<{ botToken: string; userToken: string | null; teamId: string | null }> {
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
    const teamId = typeof metadata.team_id === 'string' ? metadata.team_id.trim() || null : null
    return { botToken: integration.access_token, userToken, teamId }
  }

  private isNotAllowedTokenTypeError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    return /not_allowed_token_type/i.test(message)
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
    const { botToken, userToken, teamId } = await this.resolveTokens(supabase, userId, orgId)
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
        const returned = result.messages?.matches?.length ?? 0
        const total = result.messages?.total ?? result.messages?.paging?.total ?? returned
        return {
          success: true,
          search_mode: 'search_messages',
          coverage: {
            status: returned >= total ? 'complete' : 'partial',
            results_returned: returned,
            total_available: total,
          },
          ...result,
        }
      } catch (error) {
        if (!this.isNotAllowedTokenTypeError(error)) throw error
        this.logger.warn(
          'Slack user token rejected for search.messages; falling back to channel history',
        )
      }
    }

    const archive = await this.archiveSearch
      ?.search({
        supabase,
        orgId,
        slackTeamId: teamId,
        botToken,
        query: params.query,
        count,
      })
      .catch((error) => {
        this.logger.warn(`Slack archive search unavailable; using live history fallback: ${error}`)
        return null
      })
    if (archive) return { success: true, ...archive }

    // Existing installs only have a bot token — search.messages always fails for xoxb.
    const fallback = await this.runWithSlackAuthMapping(supabase, userId, orgId, () =>
      searchSlackChannelHistory({
        slackApi: this.slackApi,
        botToken,
        query: params.query,
        count,
      }),
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

  async sendBlockMessageToTarget(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    params: {
      channelId?: string | null
      slackUserId?: string | null
      text: string
      blocks: SlackBlock[]
    },
  ) {
    if (!params.text.trim()) throw new BadRequestException('text is required')
    const botToken = await this.resolveBotToken(supabase, userId, orgId)
    const channel =
      params.channelId?.trim() ||
      (params.slackUserId?.trim()
        ? await this.slackApi.openDmChannel(botToken, params.slackUserId.trim())
        : null)
    if (!channel) throw new BadRequestException('A Slack channel or user is required')
    const result = await this.runWithSlackAuthMapping(supabase, userId, orgId, () =>
      this.slackApi.postBlockMessage(
        botToken,
        channel,
        params.text,
        params.blocks,
        undefined,
        false,
      ),
    )
    return { success: true, channel: result.channel || channel, ts: result.ts || null }
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
    params: {
      channel_id: string
      limit?: number
      oldest?: string
      latest?: string
      cursor?: string
    },
  ) {
    if (!params.channel_id?.trim()) throw new BadRequestException('channel_id is required')
    const botToken = await this.resolveBotToken(supabase, userId, orgId)
    const channelId = params.channel_id.trim()
    const historyPage = this.slackApi.getChannelHistoryPage
      ? this.slackApi.getChannelHistoryPage(botToken, channelId, {
          limit: params.limit ?? 10,
          oldest: params.oldest,
          latest: params.latest,
          cursor: params.cursor,
        })
      : this.slackApi
          .getChannelHistory(botToken, channelId, params.limit ?? 10)
          .then((messages) => ({ messages, nextCursor: null, hasMore: false }))
    const [channels, page] = await Promise.all([
      this.slackApi.listConversations(botToken),
      historyPage,
    ])
    const messages = await Promise.all(
      page.messages.map(async (message) => {
        if (!message.ts) return message
        const permalink = await this.slackApi.getPermalink?.(botToken, channelId, message.ts)
        return permalink ? { ...message, permalink } : message
      }),
    )
    const matchedChannel = channels.find((channel) => channel.id === channelId)
    const channel = {
      id: channelId,
      name: matchedChannel?.name ?? null,
      ...(typeof matchedChannel?.is_private === 'boolean'
        ? { is_private: matchedChannel.is_private }
        : {}),
      ...(typeof matchedChannel?.is_member === 'boolean'
        ? { is_member: matchedChannel.is_member }
        : {}),
    }
    return {
      success: true,
      channel,
      messages,
      identity_verified: matchedChannel !== undefined,
      coverage: {
        status: page.hasMore ? 'partial' : 'complete',
        oldest: params.oldest ?? null,
        latest: params.latest ?? null,
        next_cursor: page.nextCursor,
        has_more: page.hasMore,
      },
    }
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
    params: { slack_user_id?: string; slack_user_ids?: string[] },
  ) {
    const recipientIds = params.slack_user_ids ?? [params.slack_user_id ?? '']
    if (
      recipientIds.length === 0 ||
      recipientIds.length > 8 ||
      recipientIds.some((recipientId) => !recipientId.trim()) ||
      new Set(recipientIds).size !== recipientIds.length
    ) {
      throw new BadRequestException('Provide between one and eight unique Slack user IDs')
    }
    const botToken = await this.resolveBotToken(supabase, userId, orgId)
    const channelId = await this.slackApi.openDmChannel(botToken, recipientIds.join(','))
    if (!channelId) throw new BadRequestException('Could not open that Slack conversation')
    const participants = await Promise.all(
      recipientIds.map(async (slackUserId) => {
        const user = await this.slackApi.getUserInfo(botToken, slackUserId)
        const displayName =
          user?.profile?.display_name?.trim() ||
          user?.profile?.real_name?.trim() ||
          user?.real_name?.trim() ||
          user?.name?.trim() ||
          'Slack teammate'
        return { slack_user_id: slackUserId, display_name: displayName }
      }),
    )
    return {
      success: true,
      channel_id: channelId,
      conversation_type: recipientIds.length === 1 ? 'dm' : 'group_dm',
      participants,
    }
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
