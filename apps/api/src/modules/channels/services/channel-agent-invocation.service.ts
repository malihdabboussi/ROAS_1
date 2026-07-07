import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient, type RequestScope } from '@vibey/api-shared'
import { CreditsService } from '../../billing/services/credits.service'
import { SpacesRepository } from '../../spaces/repositories/spaces.repository'
import { UserAgentApiService } from '../../user-agent-api/services/user-agent-api.service'
import { ChannelRuntimeRepository } from '../repositories/channel-runtime.repository'
import { ChannelsRepository, type ChannelMessageRow, type ChannelRow } from '../repositories/channels.repository'
import {
  type ChannelMessageScope,
  readChannelScopeFromMessageMetadata,
} from './channel-message-scope'

@Injectable()
export class ChannelAgentInvocationService {
  private readonly log = new Logger(ChannelAgentInvocationService.name)

  constructor(
    private readonly channelsRepository: ChannelsRepository,
    private readonly svc: SupabaseServiceClient,
    private readonly userAgentApi: UserAgentApiService,
    private readonly creditsService: CreditsService,
    private readonly spacesRepository: SpacesRepository,
    private readonly runtimeRepository: ChannelRuntimeRepository = new ChannelRuntimeRepository(),
  ) {}

  async resolveMessageScope(
    supabase: SupabaseClient,
    channel: ChannelRow,
    spaceId: string | undefined,
  ): Promise<ChannelMessageScope | null> {
    if (spaceId) {
      try {
        const space = await this.spacesRepository.findSpaceByIdForAccess(supabase, spaceId)
        if (space) {
          const campaignId =
            typeof (space as { campaign_id?: unknown }).campaign_id === 'string'
              ? ((space as { campaign_id: string }).campaign_id ?? null)
              : null
          return {
            space_id: spaceId,
            campaign_id: campaignId,
            scope_kind: campaignId ? 'campaign' : 'shared_space',
          }
        }
        this.log.warn(`sendMessage: space_id=${spaceId} not accessible - ignoring scope`)
      } catch (err) {
        this.log.warn(`sendMessage: failed to resolve space scope (${spaceId}): ${err}`)
      }
    }
    return this.resolveChannelBindingScope(channel)
  }

  async resolveChannelBindingScope(channel: ChannelRow): Promise<ChannelMessageScope | null> {
    const metadata = (channel.metadata as Record<string, unknown> | null) ?? {}
    const campaignId =
      typeof metadata.default_campaign_id === 'string' && metadata.default_campaign_id
        ? metadata.default_campaign_id
        : null
    if (!campaignId) return null
    try {
      const campaign = await this.runtimeRepository.findActiveCampaignById(
        this.svc.client,
        campaignId,
      )
      if (!campaign) {
        this.log.warn(
          `Channel ${channel.id} bound campaign ${campaignId} is missing or archived - ignoring binding`,
        )
        return null
      }
      return { space_id: null, campaign_id: campaignId, scope_kind: 'campaign' }
    } catch (err) {
      this.log.warn(`Failed to validate channel campaign binding (${campaignId}): ${err}`)
      return null
    }
  }

  async invokeAgent(payload: {
    channel_id: string
    message_id: string
    agent_key: string
    user_id: string
    org_id: string | null
    scope: ChannelMessageScope | null
  }): Promise<void> {
    await this.creditsService.assertHasAvailableCredits(payload.user_id, payload.org_id)
    const internalToken = process.env.INTERNAL_API_TOKEN ?? ''
    if (!internalToken) {
      this.log.warn(`Skipping channel agent invocation - INTERNAL_API_TOKEN not set`)
      return
    }

    const body = {
      channel_id: payload.channel_id,
      message_id: payload.message_id,
      agent_key: payload.agent_key,
      user_id: payload.user_id,
      org_id: payload.org_id,
      space_id: payload.scope?.space_id ?? null,
      campaign_id: payload.scope?.campaign_id ?? null,
      scope_kind: payload.scope?.scope_kind ?? null,
    }

    void this.userAgentApi
      .invoke(
        payload.user_id,
        '/api/channel-agent/invoke',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Token': internalToken,
          },
          body: JSON.stringify(body),
        },
        {
          timeoutMs: 600_000,
          logTag: `channel_agent agent=${payload.agent_key} channel=${payload.channel_id}`,
        },
      )
      .then(async (res) => {
        if (!res.ok) {
          this.log.error(
            `Channel agent invocation HTTP ${res.status} for agent=${payload.agent_key} msg=${payload.message_id} channel=${payload.channel_id}`,
          )
        }
      })
      .catch((err) => {
        this.log.error(
          `Channel agent invocation failed for agent=${payload.agent_key} msg=${payload.message_id} channel=${payload.channel_id}: ${err}`,
        )
      })
  }

  async invokeBrainstorm(payload: {
    channel_id: string
    message_id: string
    parent_message_id: string
    agent_keys: string[]
    user_id: string
    org_id: string | null
    scope: ChannelMessageScope | null
  }): Promise<void> {
    await this.creditsService.assertHasAvailableCredits(payload.user_id, payload.org_id)
    const internalToken = process.env.INTERNAL_API_TOKEN ?? ''
    if (!internalToken) {
      this.log.warn(`Skipping brainstorm invocation - INTERNAL_API_TOKEN not set`)
      return
    }

    const body = {
      channel_id: payload.channel_id,
      message_id: payload.message_id,
      parent_message_id: payload.parent_message_id,
      agent_keys: payload.agent_keys,
      user_id: payload.user_id,
      org_id: payload.org_id,
      space_id: payload.scope?.space_id ?? null,
      campaign_id: payload.scope?.campaign_id ?? null,
      scope_kind: payload.scope?.scope_kind ?? null,
    }

    void this.userAgentApi
      .invoke(
        payload.user_id,
        '/api/channel-agent/invoke-brainstorm',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Token': internalToken,
          },
          body: JSON.stringify(body),
        },
        { timeoutMs: 600_000, logTag: `channel_brainstorm channel=${payload.channel_id}` },
      )
      .then(async (res) => {
        if (!res.ok) {
          this.log.error(
            `Brainstorm invocation HTTP ${res.status} for channel=${payload.channel_id} msg=${payload.message_id}`,
          )
        }
      })
      .catch((err) => {
        this.log.error(`Brainstorm invocation failed for channel=${payload.channel_id}: ${err}`)
      })
  }

  async stampAutoInvokeMetadata(
    messageId: string,
    agentKeys: string[],
    existingMetadata: Record<string, unknown>,
  ): Promise<void> {
    const agentStatus = (existingMetadata.agent_status as Record<string, string>) ?? {}
    for (const key of agentKeys) {
      if (!agentStatus[key]) agentStatus[key] = 'acknowledged'
    }
    await this.runtimeRepository.updateMessageMetadata(this.svc.client, messageId, {
      ...existingMetadata,
      agent_status: agentStatus,
      agent_invoked_at: new Date().toISOString(),
    })
  }

  async retryAgentInvocation(opts: {
    channel: ChannelRow
    message: ChannelMessageRow
    scope: RequestScope
    agentKey: string
  }) {
    const { channel, message, scope, agentKey } = opts
    if (message.sender_type !== 'user' || message.sender_id !== scope.userId) {
      throw new ForbiddenException('You can only retry agent invocations on your own messages.')
    }

    const mentions = (message.metadata as Record<string, unknown>)?.mentions as
      | Array<{ type: string; agent_key?: string }>
      | undefined
    const hasAgentMention = mentions?.some((m) => m.type === 'agent' && m.agent_key === agentKey)
    if (!hasAgentMention) {
      throw new NotFoundException('Agent was not mentioned in this message.')
    }

    const existingStatus = (message.metadata as Record<string, unknown>)?.agent_status as
      | Record<string, string>
      | undefined
    if (existingStatus?.[agentKey] === 'completed') {
      return { accepted: false, reason: 'already_completed' }
    }

    const existing = (message.metadata as Record<string, unknown>) ?? {}
    const agentStatus = (existing.agent_status as Record<string, string>) ?? {}
    agentStatus[agentKey] = 'acknowledged'

    await this.runtimeRepository.updateMessageMetadata(this.svc.client, message.id, {
      ...existing,
      agent_status: agentStatus,
      agent_invoked_at: new Date().toISOString(),
      agent_phase: null,
      agent_last_activity: null,
    })

    const retryScope =
      readChannelScopeFromMessageMetadata(message.metadata) ??
      (await this.resolveChannelBindingScope(channel))

    await this.invokeAgent({
      channel_id: channel.id,
      message_id: message.id,
      agent_key: agentKey,
      user_id: scope.userId,
      org_id: scope.orgId ?? null,
      scope: retryScope,
    })

    return { accepted: true }
  }
}
