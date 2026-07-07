import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { LoggerService, OrgScopeService, type RequestScope } from '@vibey/api-shared'
import { SpaceRetrievalIndexService } from '../../space-retrieval/services/space-retrieval-index.service'
import type {
  AddChannelMemberInput,
  CreateChannelInput,
  UpdateChannelInput,
  UpdateChannelMemberInput,
} from '../dto'
import { ChannelRuntimeRepository } from '../repositories/channel-runtime.repository'
import { ChannelsRepository, type ChannelRow } from '../repositories/channels.repository'

@Injectable()
export class ChannelManagementService {
  constructor(
    private readonly channelsRepository: ChannelsRepository,
    private readonly orgScopeService: OrgScopeService,
    private readonly logger: LoggerService,
    private readonly spaceRetrievalIndex?: SpaceRetrievalIndexService,
    private readonly runtimeRepository: ChannelRuntimeRepository = new ChannelRuntimeRepository(),
  ) {}

  async listChannels(supabase: SupabaseClient, scope: RequestScope) {
    const channels = await this.channelsRepository.listChannels(supabase, scope.orgId)
    const isOrgAdmin =
      Boolean(scope.orgId) && this.orgScopeService.hasMinimumRole(scope.orgRole, 'admin')
    const adminChannelIds = isOrgAdmin
      ? null
      : await this.channelsRepository.listAdminChannelIdsForUser(supabase, scope.userId)
    const favoriteChannelIds = await this.channelsRepository.listFavoriteChannelIdsForUser(
      supabase,
      scope.userId,
    )

    return {
      channels: channels.map((channel) => ({
        ...channel,
        can_manage: this.resolveCanManageChannel(channel, scope, isOrgAdmin, adminChannelIds),
        is_favorite: favoriteChannelIds.has(channel.id),
      })),
    }
  }

  async listUserState(supabase: SupabaseClient, userId: string) {
    return this.channelsRepository.listUserState(supabase, userId)
  }

  async upsertUserState(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    patch: { is_favorite?: boolean },
  ) {
    await this.findChannelOrThrow(supabase, scope, channelId)
    return this.channelsRepository.upsertUserState(supabase, scope.userId, channelId, patch)
  }

  async markChannelRead(supabase: SupabaseClient, scope: RequestScope, channelId: string) {
    const channel = await this.findChannelOrThrow(supabase, scope, channelId)
    await this.assertCanReadChannel()
    await this.channelsRepository.markChannelRead(supabase, channel.id, scope.userId)
    return { success: true }
  }

  async getUnreadCounts(supabase: SupabaseClient, scope: RequestScope) {
    const rows = await this.channelsRepository.getUnreadCounts(supabase, scope.userId)
    const counts: Record<string, number> = {}
    for (const row of rows) {
      if (row.unread > 0) counts[row.channel_id] = row.unread
    }
    return { counts }
  }

  async getChannel(supabase: SupabaseClient, scope: RequestScope, channelId: string) {
    const channel = await this.findChannelOrThrow(supabase, scope, channelId)
    const members = await this.channelsRepository.listMemberships(supabase, channel.id)
    const canManage = await this.canManageChannel(supabase, scope, channel)
    return { channel: { ...channel, can_manage: canManage }, members }
  }

  async createChannel(supabase: SupabaseClient, scope: RequestScope, data: CreateChannelInput) {
    if (scope.orgId && !this.orgScopeService.hasMinimumRole(scope.orgRole, 'creator')) {
      throw new ForbiddenException('You need creator access to create channels in this org.')
    }

    const channel = await this.channelsRepository.createChannel(supabase, {
      org_id: scope.orgId,
      user_id: scope.userId,
      name: data.name,
      description: data.description ?? null,
      is_private: data.is_private ?? false,
    })

    await this.channelsRepository.createMembership(supabase, {
      channel_id: channel.id,
      member_type: 'user',
      user_id: scope.userId,
      agent_key: null,
      role: 'admin',
      added_by: scope.userId,
    })

    const members = await this.channelsRepository.listMemberships(supabase, channel.id)
    await this.indexChannel(supabase, scope, channel.id)
    return { channel, members }
  }

  async updateChannel(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    data: UpdateChannelInput,
  ) {
    const channel = await this.findChannelOrThrow(supabase, scope, channelId)
    const existingMetadata = (channel.metadata as Record<string, unknown> | null) ?? {}
    const previousBinding =
      typeof existingMetadata.default_campaign_id === 'string'
        ? existingMetadata.default_campaign_id
        : null

    const bindingOnlyPatch =
      data.default_campaign_id !== undefined &&
      data.name === undefined &&
      data.description === undefined &&
      data.is_private === undefined &&
      data.icon === undefined &&
      data.icon_color === undefined
    if (bindingOnlyPatch && !previousBinding) {
      await this.assertCanPostMessage(supabase, scope, channel)
    } else {
      await this.assertCanManageChannel(supabase, scope, channel)
    }

    const updates: Partial<Pick<ChannelRow, 'name' | 'description' | 'is_private' | 'metadata'>> =
      {}
    if (data.name !== undefined) updates.name = data.name
    if (data.description !== undefined) updates.description = data.description ?? null
    if (data.is_private !== undefined) updates.is_private = data.is_private

    let boundCampaignName: string | null = null
    if (
      data.icon !== undefined ||
      data.icon_color !== undefined ||
      data.default_campaign_id !== undefined
    ) {
      const metadata: Record<string, unknown> = {
        ...existingMetadata,
        ...(data.icon !== undefined ? { icon: data.icon } : {}),
        ...(data.icon_color !== undefined ? { icon_color: data.icon_color } : {}),
      }
      if (data.default_campaign_id !== undefined) {
        if (data.default_campaign_id) {
          const campaign = await this.findBindableCampaign(
            supabase,
            channel,
            data.default_campaign_id,
          )
          metadata.default_campaign_id = campaign.id
          boundCampaignName = campaign.name
        } else {
          delete metadata.default_campaign_id
        }
      }
      updates.metadata = metadata
    }

    if (Object.keys(updates).length === 0) return { channel }
    const updated = await this.channelsRepository.updateChannel(supabase, channel.id, updates)
    await this.indexChannel(supabase, scope, updated.id)

    const nextBinding = data.default_campaign_id !== undefined ? data.default_campaign_id : null
    if (data.default_campaign_id !== undefined && nextBinding !== previousBinding) {
      await this.channelsRepository.createMessage(supabase, {
        channel_id: channel.id,
        sender_type: 'system',
        sender_id: 'system',
        content: nextBinding
          ? `Channel context set to "${boundCampaignName ?? 'campaign'}".`
          : 'Channel context cleared.',
        content_blocks: null,
        metadata: {},
      })
    }

    return { channel: updated }
  }

  async deleteChannel(supabase: SupabaseClient, scope: RequestScope, channelId: string) {
    const channel = await this.findChannelOrThrow(supabase, scope, channelId)
    await this.assertCanManageChannel(supabase, scope, channel)
    await this.channelsRepository.deleteChannel(supabase, channel.id)
    await this.spaceRetrievalIndex?.deleteSource(supabase, 'channel', channel.id)
    return { success: true }
  }

  async addMember(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    data: AddChannelMemberInput,
  ) {
    const channel = await this.findChannelOrThrow(supabase, scope, channelId)
    await this.assertCanManageChannel(supabase, scope, channel)

    if (data.member_type === 'user' && data.user_id) {
      const existing = await this.channelsRepository.findUserMembership(
        supabase,
        channel.id,
        data.user_id,
      )
      if (existing) return { member: existing }
    }

    const member = await this.channelsRepository.createMembership(supabase, {
      channel_id: channel.id,
      member_type: data.member_type,
      user_id: data.member_type === 'user' ? (data.user_id ?? null) : null,
      agent_key: data.member_type === 'agent' ? (data.agent_key ?? null) : null,
      role: data.role ?? 'edit',
      added_by: scope.userId,
    })

    const addedName =
      data.member_type === 'user'
        ? (member.profile?.full_name ?? 'A user')
        : (data.agent_key ?? 'An agent')
    await this.channelsRepository.createMessage(supabase, {
      channel_id: channel.id,
      sender_type: 'system',
      sender_id: 'system',
      content: `${addedName} was added to the channel.`,
      content_blocks: null,
      metadata: {},
    })

    return { member }
  }

  async updateMemberRole(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    memberId: string,
    data: UpdateChannelMemberInput,
  ) {
    const channel = await this.findChannelOrThrow(supabase, scope, channelId)
    await this.assertCanManageChannel(supabase, scope, channel)

    const member = await this.channelsRepository.findMembershipById(supabase, channel.id, memberId)
    if (!member) throw new NotFoundException('Channel member not found')

    const updated = await this.channelsRepository.updateMembershipRole(
      supabase,
      member.id,
      data.role,
    )
    return { member: updated }
  }

  async removeMember(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    memberId: string,
  ) {
    const channel = await this.findChannelOrThrow(supabase, scope, channelId)
    await this.assertCanManageChannel(supabase, scope, channel)

    const member = await this.channelsRepository.findMembershipById(supabase, channel.id, memberId)
    if (!member) throw new NotFoundException('Channel member not found')
    await this.channelsRepository.deleteMembership(supabase, member.id)
    return { success: true }
  }

  async listMembers(supabase: SupabaseClient, scope: RequestScope, channelId: string) {
    const channel = await this.findChannelOrThrow(supabase, scope, channelId)
    await this.assertCanReadChannel()
    const members = await this.channelsRepository.listMemberships(supabase, channel.id)
    return { members }
  }

  private async findBindableCampaign(
    supabase: SupabaseClient,
    channel: ChannelRow,
    campaignId: string,
  ): Promise<{ id: string; name: string }> {
    const campaign = await this.runtimeRepository.findBindableCampaign(supabase, channel, campaignId)
    if (!campaign) throw new NotFoundException('Campaign not found')
    return campaign
  }

  private async findChannelOrThrow(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
  ): Promise<ChannelRow> {
    const channel = await this.channelsRepository.findChannelById(supabase, channelId, scope.orgId)
    if (!channel) throw new NotFoundException('Channel not found')
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

  private async assertCanReadChannel(): Promise<void> {}

  private async assertCanPostMessage(
    supabase: SupabaseClient,
    scope: RequestScope,
    channel: ChannelRow,
  ): Promise<void> {
    if (channel.user_id === scope.userId) return
    if (scope.orgId && this.orgScopeService.hasMinimumRole(scope.orgRole, 'admin')) return
    if (channel.org_id && channel.is_private === false) {
      if (scope.orgId && this.orgScopeService.hasMinimumRole(scope.orgRole, 'editor')) return
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

  private async indexChannel(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
  ): Promise<void> {
    if (!this.spaceRetrievalIndex) return
    await this.spaceRetrievalIndex.indexSource(supabase, {
      sourceType: 'channel',
      sourceId: channelId,
      userId: scope.userId,
      orgId: scope.orgId ?? null,
    })
  }
}
