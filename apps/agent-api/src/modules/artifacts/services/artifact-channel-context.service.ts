import { ArtifactChannelContextRepository } from '../repositories/artifact-channel-context.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_CANDIDATES = 20

interface CampaignCandidate {
  id: string
  name: string
  avatar_count: number
  offer_count: number
}

/**
 * Channel campaign-context actions. Used in studio channels that have no
 * bound campaign: `discover_channel_context` lists the campaigns the
 * triggering user can access (RLS-filtered via the main API) with data
 * signals, and `set_channel_context` persists the binding through the main
 * API PATCH so user-level RBAC lives in exactly one place (apps/api).
 */
export class ArtifactChannelContextService {
  constructor(
    private readonly repository: ArtifactChannelContextRepository = new ArtifactChannelContextRepository(),
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      discover_channel_context: (data, sessionKey) =>
        this.discoverChannelContext(target, data, sessionKey),
      set_channel_context: (data, sessionKey) => this.setChannelContext(target, data, sessionKey),
    }
  }

  private async discoverChannelContext(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> {
    const channelId = typeof input.channel_id === 'string' ? input.channel_id.trim() : ''
    if (!UUID_RE.test(channelId)) {
      return { success: false, error: 'channel_id is required (UUID)' }
    }

    const userId = target.resolveUserId(sessionKey)
    const supabase = target.serviceClient ?? target.svc?.client
    if (!supabase) return { success: false, error: 'Database unavailable' }

    const { data: channel, error: channelError } = await this.repository.findChannel(
      supabase,
      channelId,
    )
    if (channelError) return { success: false, error: channelError.message }
    if (!channel) return { success: false, error: 'Channel not found' }

    const allowed = await this.canAccessChannel(supabase, channel, userId)
    if (!allowed) return { success: false, error: 'Channel not found' }

    const channelOrgId = (channel.org_id as string | null) ?? null
    const metadata = (channel.metadata as Record<string, unknown> | null) ?? {}
    const currentCampaignId =
      typeof metadata.default_campaign_id === 'string' && metadata.default_campaign_id
        ? metadata.default_campaign_id
        : null

    // RLS-filtered campaign list — only what the triggering user can see.
    const campaignsRaw = await target.mainApiCall('GET', '/api/campaigns', sessionKey)
    const campaigns = this.campaignRows(campaignsRaw)
      .filter((row) => {
        const config = this.asRecord(row.config)
        if (config?.system_kind === 'general') return false
        if (typeof row.status === 'string' && row.status === 'archived') return false
        if ('org_id' in row) {
          const rowOrg = typeof row.org_id === 'string' ? row.org_id : null
          if (channelOrgId ? rowOrg !== channelOrgId : rowOrg !== null) return false
        }
        return typeof row.id === 'string' && UUID_RE.test(row.id)
      })
      .slice(0, MAX_CANDIDATES)

    if (campaigns.length === 0) {
      return {
        success: true,
        channel_id: channelId,
        current_campaign_id: currentCampaignId,
        campaigns: [],
        guidance:
          'No campaigns available to bind. Ask the user to create a campaign first or check their access.',
      }
    }

    const campaignIds = campaigns.map((row) => row.id as string)
    const [avatarCounts, offerCounts] = await Promise.all([
      this.countByCampaign(supabase, 'avatars', campaignIds),
      this.countByCampaign(supabase, 'offers', campaignIds),
    ])

    const options: CampaignCandidate[] = campaigns.map((row) => ({
      id: row.id as string,
      name: typeof row.name === 'string' ? row.name : 'Untitled campaign',
      avatar_count: avatarCounts.get(row.id as string) ?? 0,
      offer_count: offerCounts.get(row.id as string) ?? 0,
    }))
    options.sort((a, b) => b.avatar_count + b.offer_count - (a.avatar_count + a.offer_count))

    const plausible = options.filter((option) => option.avatar_count + option.offer_count > 0)
    const suggested = plausible[0] ?? options[0] ?? null
    const singleCandidate = options.length === 1 || plausible.length === 1

    if (singleCandidate) {
      return {
        success: true,
        channel_id: channelId,
        current_campaign_id: currentCampaignId,
        single_candidate: true,
        suggested_campaign_id: suggested?.id ?? null,
        campaigns: options,
        guidance:
          'Exactly one plausible campaign. Call set_channel_context with this campaign_id and tell the user which campaign you bound.',
      }
    }

    return {
      success: true,
      channel_id: channelId,
      current_campaign_id: currentCampaignId,
      suggested_campaign_id: suggested?.id ?? null,
      campaigns: options,
      guidance:
        'Multiple campaigns found. A confirmation card is shown to the user — ask them to pick one and wait for their choice. Do not bind without confirmation.',
      ui_blocks: [
        {
          type: 'campaign_context_confirm',
          id: `campaign-context-${channelId}-${Date.now()}`,
          status: 'pending',
          channel_id: channelId,
          suggested_campaign_id: suggested?.id ?? null,
          options,
          confirmed_campaign_id: null,
        },
      ],
    }
  }

  private async setChannelContext(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> {
    const channelId = typeof input.channel_id === 'string' ? input.channel_id.trim() : ''
    if (!UUID_RE.test(channelId)) {
      return { success: false, error: 'channel_id is required (UUID)' }
    }
    const campaignId =
      typeof input.campaign_id === 'string' && input.campaign_id.trim()
        ? input.campaign_id.trim()
        : null
    if (campaignId && !UUID_RE.test(campaignId)) {
      return { success: false, error: 'campaign_id must be a valid UUID (or omitted to clear)' }
    }

    // apps/api enforces who may bind, validates the campaign, and posts the
    // "Channel context set" system message.
    const result = await target.mainApiCall('PATCH', `/api/channels/${channelId}`, sessionKey, {
      default_campaign_id: campaignId,
    })

    return {
      success: true,
      channel_id: channelId,
      default_campaign_id: campaignId,
      result,
    }
  }

  private async canAccessChannel(
    supabase: any,
    channel: Record<string, unknown>,
    userId: string,
  ): Promise<boolean> {
    if (channel.user_id === userId) return true

    const { data: membership } = await this.repository.findChannelMembership(supabase, {
      channelId: channel.id,
      userId,
    })
    if (membership) return true

    const orgId = (channel.org_id as string | null) ?? null
    if (!orgId) return false
    const { data: orgMember } = await this.repository.findOrgMember(supabase, { orgId, userId })
    return !!orgMember
  }

  private async countByCampaign(
    supabase: any,
    table: 'avatars' | 'offers',
    campaignIds: string[],
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>()
    const { data } = await this.repository.listCampaignRefs(supabase, table, campaignIds)
    for (const row of (data ?? []) as Array<{ campaign_id?: string }>) {
      if (typeof row.campaign_id !== 'string') continue
      counts.set(row.campaign_id, (counts.get(row.campaign_id) ?? 0) + 1)
    }
    return counts
  }

  private campaignRows(value: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(value))
      return value.filter((row) => this.asRecord(row) !== null) as Array<Record<string, unknown>>
    const record = this.asRecord(value)
    if (record && Array.isArray(record.campaigns)) {
      return record.campaigns.filter((row) => this.asRecord(row) !== null) as Array<
        Record<string, unknown>
      >
    }
    return []
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  }
}
