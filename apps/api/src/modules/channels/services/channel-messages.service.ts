import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  LoggerService,
  OrgScopeService,
  SupabaseServiceClient,
  type RequestScope,
} from '@vibey/api-shared'
import { CreditsService } from '../../billing/services/credits.service'
import { SpaceRetrievalIndexService } from '../../space-retrieval/services/space-retrieval-index.service'
import type {
  EditChannelMessageInput,
  PatchChannelMessageMetadataInput,
  PinChannelMessageInput,
  RenameThreadInput,
  SendChannelMessageInput,
  StartBrainstormInput,
} from '../dto'
import { ChannelsRepository, type ChannelRow } from '../repositories/channels.repository'
import { ChannelAgentInvocationService } from './channel-agent-invocation.service'
import {
  type ChannelMessageScope,
  readChannelScopeFromMessageMetadata,
} from './channel-message-scope'

@Injectable()
export class ChannelMessagesService {
  constructor(
    private readonly channelsRepository: ChannelsRepository,
    private readonly orgScopeService: OrgScopeService,
    private readonly logger: LoggerService,
    private readonly svc: SupabaseServiceClient,
    private readonly creditsService: CreditsService,
    private readonly channelAgentInvocation: ChannelAgentInvocationService,
    private readonly spaceRetrievalIndex?: SpaceRetrievalIndexService,
  ) {}

  async listMessages(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    limit: number,
    before?: string,
  ) {
    const channel = await this.findChannelOrThrow(supabase, scope, channelId)
    await this.assertCanReadChannel(supabase, scope, channel)

    const messages = await this.channelsRepository.listMessages(supabase, channel.id, limit, before)
    return { messages }
  }

  async sendMessage(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    data: SendChannelMessageInput,
  ) {
    const channel = await this.findChannelOrThrow(supabase, scope, channelId)
    await this.assertCanPostMessage(supabase, scope, channel)

    const messageScope = await this.channelAgentInvocation.resolveMessageScope(
      supabase,
      channel,
      data.space_id,
    )

    const metadata: Record<string, unknown> = {}
    if (data.mentions?.length) {
      metadata.mentions = data.mentions
    }
    if (data.attachments?.length) {
      metadata.attachments = data.attachments
    }
    if (messageScope) {
      metadata.space_id = messageScope.space_id
      metadata.campaign_id = messageScope.campaign_id
      metadata.scope_kind = messageScope.scope_kind
    }

    const agentMentions = (data.mentions ?? []).filter((m) => m.type === 'agent' && m.agent_key)
    if (agentMentions.length > 0) {
      const agentStatus: Record<string, string> = {}
      for (const m of agentMentions) {
        agentStatus[m.agent_key!] = 'acknowledged'
      }
      metadata.agent_status = agentStatus
      metadata.agent_invoked_at = new Date().toISOString()
    }

    const message = await this.channelsRepository.createMessage(supabase, {
      channel_id: channel.id,
      sender_type: 'user',
      sender_id: scope.userId,
      content: data.content?.trim() ?? null,
      content_blocks: data.content_blocks ?? null,
      metadata,
      reply_to_id: data.reply_to_id ?? null,
    })
    await this.indexChannelMessage(supabase, scope, message.id, messageScope)

    const explicitAgentKeys = new Set(agentMentions.map((m) => m.agent_key!))
    const explicitMentionOrder = Array.from(
      new Set(agentMentions.map((m) => m.agent_key!).filter(Boolean)),
    )

    if (data.reply_to_id) {
      const parentMsg = await this.channelsRepository.findMessageById(
        supabase,
        channel.id,
        data.reply_to_id,
      )
      const brainstormMeta = (parentMsg?.metadata as Record<string, unknown>)?.brainstorm as
        | { agent_keys: string[] }
        | undefined

      if (brainstormMeta?.agent_keys?.length) {
        const roundAgentKeys =
          explicitMentionOrder.length > 0 ? explicitMentionOrder : brainstormMeta.agent_keys

        if (roundAgentKeys.length === 0) {
          return { message }
        }

        await this.channelAgentInvocation.invokeBrainstorm({
          channel_id: channel.id,
          message_id: message.id,
          parent_message_id: data.reply_to_id,
          agent_keys: roundAgentKeys,
          user_id: scope.userId,
          org_id: scope.orgId ?? null,
          scope: messageScope,
        })
        await this.channelAgentInvocation.stampAutoInvokeMetadata(
          message.id,
          roundAgentKeys,
          metadata,
        )
      } else {
        if (agentMentions.length > 0) {
          for (const mention of agentMentions) {
            await this.channelAgentInvocation.invokeAgent({
              channel_id: channel.id,
              message_id: message.id,
              agent_key: mention.agent_key!,
              user_id: scope.userId,
              org_id: scope.orgId ?? null,
              scope: messageScope,
            })
          }
        }

        const participants = await this.channelsRepository.getThreadParticipants(
          supabase,
          data.reply_to_id,
        )
        const isOneOnOne =
          participants.humanSenderIds.length <= 1 && participants.agentSenderIds.length === 1
        if (isOneOnOne) {
          const autoAgentKey = participants.agentSenderIds[0]!
          if (!explicitAgentKeys.has(autoAgentKey)) {
            await this.channelAgentInvocation.invokeAgent({
              channel_id: channel.id,
              message_id: message.id,
              agent_key: autoAgentKey,
              user_id: scope.userId,
              org_id: scope.orgId ?? null,
              scope: messageScope,
            })
            await this.channelAgentInvocation.stampAutoInvokeMetadata(
              message.id,
              [autoAgentKey],
              metadata,
            )
          }
        }
      }
    } else if (agentMentions.length > 0) {
      for (const mention of agentMentions) {
        await this.channelAgentInvocation.invokeAgent({
          channel_id: channel.id,
          message_id: message.id,
          agent_key: mention.agent_key!,
          user_id: scope.userId,
          org_id: scope.orgId ?? null,
          scope: messageScope,
        })
      }
    }

    return { message }
  }

  async retryAgentInvocation(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    messageId: string,
    agentKey: string,
  ) {
    const channel = await this.findChannelOrThrow(supabase, scope, channelId)
    await this.assertCanPostMessage(supabase, scope, channel)

    const message = await this.channelsRepository.findMessageById(supabase, channel.id, messageId)
    if (!message) {
      throw new NotFoundException('Channel message not found')
    }
    return this.channelAgentInvocation.retryAgentInvocation({ channel, message, scope, agentKey })
  }

  async startBrainstorm(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    data: StartBrainstormInput,
  ) {
    const channel = await this.findChannelOrThrow(supabase, scope, channelId)
    await this.assertCanPostMessage(supabase, scope, channel)
    await this.creditsService.assertHasAvailableCredits(scope.userId, scope.orgId ?? null)

    const messageScope = await this.channelAgentInvocation.resolveMessageScope(
      supabase,
      channel,
      data.space_id,
    )
    const metadata: Record<string, unknown> = {
      brainstorm: { agent_keys: data.agent_keys, created_by: scope.userId },
    }
    if (messageScope) {
      metadata.space_id = messageScope.space_id
      metadata.campaign_id = messageScope.campaign_id
      metadata.scope_kind = messageScope.scope_kind
    }

    const message = await this.channelsRepository.createMessage(supabase, {
      channel_id: channel.id,
      sender_type: 'system',
      sender_id: 'system',
      content: `Brainstorm started with ${data.agent_keys.join(', ')}`,
      content_blocks: null,
      metadata,
    })
    await this.indexChannelMessage(supabase, scope, message.id, messageScope)

    return { message }
  }

  async editMessage(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    messageId: string,
    data: EditChannelMessageInput,
  ) {
    const channel = await this.findChannelOrThrow(supabase, scope, channelId)
    await this.assertCanReadChannel(supabase, scope, channel)

    const message = await this.channelsRepository.findMessageById(supabase, channel.id, messageId)
    if (!message) {
      throw new NotFoundException('Channel message not found')
    }

    if (message.sender_type !== 'user' || message.sender_id !== scope.userId) {
      throw new ForbiddenException('You can only edit your own messages.')
    }

    const updated = await this.channelsRepository.updateMessage(supabase, message.id, {
      content: data.content,
    })
    await this.indexChannelMessage(
      supabase,
      scope,
      updated.id,
      readChannelScopeFromMessageMetadata(updated.metadata),
    )
    return { message: updated }
  }

  async renameThread(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    messageId: string,
    data: RenameThreadInput,
  ) {
    const channel = await this.findChannelOrThrow(supabase, scope, channelId)
    await this.assertCanReadChannel(supabase, scope, channel)

    const message = await this.channelsRepository.findMessageById(supabase, channel.id, messageId)
    if (!message) {
      throw new NotFoundException('Channel message not found')
    }
    if (message.reply_to_id) {
      throw new ForbiddenException('Only root messages (threads/brainstorms) can be renamed.')
    }

    const updated = await this.channelsRepository.updateMessage(supabase, message.id, {
      thread_name: data.thread_name,
    })
    await this.indexChannelMessage(
      supabase,
      scope,
      updated.id,
      readChannelScopeFromMessageMetadata(updated.metadata),
    )
    return { message: updated }
  }

  async pinMessage(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    messageId: string,
    data: PinChannelMessageInput,
  ) {
    const channel = await this.findChannelOrThrow(supabase, scope, channelId)
    await this.assertCanManageChannel(supabase, scope, channel)

    const message = await this.channelsRepository.findMessageById(supabase, channel.id, messageId)
    if (!message) {
      throw new NotFoundException('Channel message not found')
    }

    const updated = await this.channelsRepository.updateMessage(supabase, message.id, {
      pinned: data.pinned,
      pinned_by: data.pinned ? scope.userId : null,
    })
    await this.indexChannelMessage(
      supabase,
      scope,
      updated.id,
      readChannelScopeFromMessageMetadata(updated.metadata),
    )
    return { message: updated }
  }

  async deleteMessage(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    messageId: string,
  ) {
    const channel = await this.findChannelOrThrow(supabase, scope, channelId)
    await this.assertCanManageChannel(supabase, scope, channel)

    const message = await this.channelsRepository.findMessageById(supabase, channel.id, messageId)
    if (!message) {
      throw new NotFoundException('Channel message not found')
    }

    await this.channelsRepository.deleteMessage(supabase, message.id)
    await this.spaceRetrievalIndex?.deleteSource(supabase, 'channel_message', message.id)
    return { success: true }
  }

  async patchMessageMetadata(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    messageId: string,
    data: PatchChannelMessageMetadataInput,
  ) {
    const channel = await this.findChannelOrThrow(supabase, scope, channelId)
    await this.assertCanPostMessage(supabase, scope, channel)

    const message = await this.channelsRepository.findMessageById(supabase, channel.id, messageId)
    if (!message) {
      throw new NotFoundException('Channel message not found')
    }

    const existing = (message.metadata as Record<string, unknown>) ?? {}
    await this.channelsRepository.updateMessage(this.svc.client, message.id, {
      metadata: { ...existing, content_blocks_ordered: data.content_blocks_ordered },
    })

    return { success: true }
  }

  private async indexChannelMessage(
    supabase: SupabaseClient,
    scope: RequestScope,
    messageId: string,
    messageScope: ChannelMessageScope | null,
  ): Promise<void> {
    if (!this.spaceRetrievalIndex) return
    await this.spaceRetrievalIndex.indexSource(supabase, {
      sourceType: 'channel_message',
      sourceId: messageId,
      userId: scope.userId,
      orgId: scope.orgId ?? null,
      spaceId: messageScope?.space_id ?? null,
    })
  }

  private async findChannelOrThrow(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
  ): Promise<ChannelRow> {
    const channel = await this.channelsRepository.findChannelById(supabase, channelId, scope.orgId)
    if (!channel) {
      throw new NotFoundException('Channel not found')
    }
    return channel
  }

  private resolveCanManageChannel(
    channel: ChannelRow,
    scope: RequestScope,
    isOrgAdmin: boolean,
    adminChannelIds: Set<string> | null,
  ): boolean {
    if (channel.user_id === scope.userId) return true
    if (isOrgAdmin) return true
    return adminChannelIds?.has(channel.id) ?? false
  }

  private async canManageChannel(
    supabase: SupabaseClient,
    scope: RequestScope,
    channel: ChannelRow,
  ): Promise<boolean> {
    const isOrgAdmin =
      Boolean(scope.orgId) && this.orgScopeService.hasMinimumRole(scope.orgRole, 'admin')
    if (isOrgAdmin || channel.user_id === scope.userId) {
      return this.resolveCanManageChannel(channel, scope, isOrgAdmin, null)
    }

    const membership = await this.channelsRepository.findUserMembership(
      supabase,
      channel.id,
      scope.userId,
    )
    return membership?.role === 'admin'
  }

  private async assertCanManageChannel(
    supabase: SupabaseClient,
    scope: RequestScope,
    channel: ChannelRow,
  ): Promise<void> {
    const canManage = await this.canManageChannel(supabase, scope, channel)
    if (!canManage) {
      throw new ForbiddenException('You do not have permission to manage this channel.')
    }
  }

  private async assertCanReadChannel(
    _supabase: SupabaseClient,
    _scope: RequestScope,
    _channel: ChannelRow,
  ): Promise<void> {
    // Channel existence already confirms read access because RLS scoped the query.
  }

  private async assertCanPostMessage(
    supabase: SupabaseClient,
    scope: RequestScope,
    channel: ChannelRow,
  ): Promise<void> {
    if (channel.user_id === scope.userId) return

    if (scope.orgId && this.orgScopeService.hasMinimumRole(scope.orgRole, 'admin')) {
      return
    }

    if (channel.org_id && channel.is_private === false) {
      if (scope.orgId && this.orgScopeService.hasMinimumRole(scope.orgRole, 'editor')) {
        return
      }
      throw new ForbiddenException('You need editor access in this org to post in public channels.')
    }

    const membership = await this.channelsRepository.findUserMembership(
      supabase,
      channel.id,
      scope.userId,
    )
    if (!membership) {
      await this.logger.logError({
        severity: 'warn',
        feature: 'channels/send-message',
        error_code: 'CHANNEL_MEMBER_REQUIRED',
        message: 'User tried to send a message without channel membership.',
        context: { channelId: channel.id },
        user_id: scope.userId,
      })
      throw new ForbiddenException('You must be a channel member to send messages.')
    }
    if (membership.role === 'view') {
      throw new ForbiddenException('Your channel role is view-only; you cannot send messages.')
    }
  }
}
