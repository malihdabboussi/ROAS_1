import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BrainImportJobsService } from '../../../brain/services/brain-import-jobs.service'

type SpaceRoute = { space_id?: unknown; item_id?: unknown } | null | undefined

export type CampaignBrainRouteDecision =
  | { routed: false; reason: 'no_space' | 'no_campaign' | 'system_campaign' | 'lookup_failed' }
  | { routed: true; campaignId: string; jobId: string }

/**
 * Deterministic Fathom → Campaign Brain dual-write.
 *
 * The webhook already lands every recording on exactly one Space, and client
 * Spaces carry the client's `campaign_id`. Before this, the meeting only reached
 * the recorder's *user* brain; the client's *campaign* brain got it only if a
 * human accepted an LLM cross-pollination suggestion — so "what did I promise
 * Yasir last call" searched the client brain and missed. This routes the same
 * meeting into the client's campaign brain the moment the Space is known.
 *
 * `campaign_fathom_import` is idempotent per (campaign, meeting), so re-runs
 * and duplicate webhooks are safe. General / Personal system campaigns are
 * skipped — they are not client brains.
 */
@Injectable()
export class FathomCampaignBrainRouteService {
  private readonly logger = new Logger(FathomCampaignBrainRouteService.name)

  constructor(private readonly importJobs: BrainImportJobsService) {}

  async enqueueForRoute(input: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    event: Record<string, unknown>
    spaceRoute: SpaceRoute
  }): Promise<CampaignBrainRouteDecision> {
    const spaceId = typeof input.spaceRoute?.space_id === 'string' ? input.spaceRoute.space_id : ''
    if (!spaceId) return { routed: false, reason: 'no_space' }

    let campaign: { id: string; name: string | null; config: unknown } | null
    try {
      campaign = await this.loadSpaceCampaign(input.supabase, spaceId)
    } catch (error) {
      this.logger.warn(
        `[FATHOM-DEBUG] Campaign brain route lookup failed for space ${spaceId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
      return { routed: false, reason: 'lookup_failed' }
    }
    if (!campaign) return { routed: false, reason: 'no_campaign' }
    if (isSystemCampaign(campaign)) return { routed: false, reason: 'system_campaign' }

    const queued = await this.importJobs.enqueueCampaignFathomImport(
      input.userId,
      { campaignId: campaign.id, meeting: input.event },
      input.orgId,
    )
    this.logger.log(
      `[FATHOM-DEBUG] Campaign brain route: meeting queued into campaign ${campaign.id} job=${queued.jobId}`,
    )
    return { routed: true, campaignId: campaign.id, jobId: queued.jobId }
  }

  private async loadSpaceCampaign(
    supabase: SupabaseClient,
    spaceId: string,
  ): Promise<{ id: string; name: string | null; config: unknown } | null> {
    const { data: space, error: spaceError } = await supabase
      .from('spaces')
      .select('campaign_id')
      .eq('id', spaceId)
      .maybeSingle()
    if (spaceError) throw new Error(spaceError.message)
    const campaignId = typeof space?.campaign_id === 'string' ? space.campaign_id : ''
    if (!campaignId) return null

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, config')
      .eq('id', campaignId)
      .maybeSingle()
    if (campaignError) throw new Error(campaignError.message)
    if (!campaign) return null
    return {
      id: String(campaign.id),
      name: typeof campaign.name === 'string' ? campaign.name : null,
      config: campaign.config,
    }
  }
}

/** Mirrors the General/Personal detection used by campaign services and Brain search. */
export function isSystemCampaign(campaign: { name: string | null; config: unknown }): boolean {
  const config =
    campaign.config && typeof campaign.config === 'object' && !Array.isArray(campaign.config)
      ? (campaign.config as Record<string, unknown>)
      : {}
  const kind = typeof config.system_kind === 'string' ? config.system_kind.toLowerCase() : ''
  const name = (campaign.name ?? '').trim().toLowerCase()
  return (
    kind === 'general' ||
    kind === 'personal' ||
    config.is_general === true ||
    config.isSystemGeneral === true ||
    name === 'general'
  )
}
