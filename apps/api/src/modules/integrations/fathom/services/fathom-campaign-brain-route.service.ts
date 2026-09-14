import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { compactMeetingSource } from '../../../brain/services/brain-import-jobs-meeting-input'
import { BrainImportJobsService } from '../../../brain/services/brain-import-jobs.service'
import { normalizeFathomMeetingSource } from '../../../meetings/providers/fathom-meeting-source'
import { readEmbeddedSource } from '../../../meetings/providers/transcript-source-to-recording-event'
import type { PageGraderClientScopeEntry } from '../../page-grader/services/page-grader-api.helpers'
import { PageGraderApiService } from '../../page-grader/services/page-grader-api.service'

type SpaceRoute = { space_id?: unknown; item_id?: unknown } | null | undefined

export type CampaignBrainRouteDecision =
  | {
      routed: false
      reason:
        | 'no_space'
        | 'no_campaign'
        | 'system_campaign'
        | 'lookup_failed'
        | 'no_matched_clients'
        | 'no_scope'
    }
  | {
      routed: true
      campaignId: string
      jobId: string
      clientId?: string
      source: 'matched_client' | 'space_route'
    }

/**
 * Deterministic Fathom → Campaign Brain dual-write.
 *
 * Primary attribution: Page Grader matched clients (invitee / name / mapping)
 * → `client_scope_map` campaign_id → `campaign_fathom_import`.
 * Fallback: Space route campaign_id (legacy). General / Personal system
 * campaigns are skipped — they are not client brains.
 */
@Injectable()
export class FathomCampaignBrainRouteService {
  private readonly logger = new Logger(FathomCampaignBrainRouteService.name)

  constructor(
    private readonly importJobs: BrainImportJobsService,
    private readonly pageGraderApi: PageGraderApiService,
  ) {}

  async routeAfterPageGraderSync(input: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    event: Record<string, unknown>
    spaceRoute: SpaceRoute
    matchedClients: Array<{ id: string; name: string }>
  }): Promise<CampaignBrainRouteDecision[]> {
    await this.persistMatchedClientIds({
      supabase: input.supabase,
      userId: input.userId,
      event: input.event,
      matchedClientIds: input.matchedClients.map((client) => client.id),
    })

    const primary = await this.enqueueForMatchedClients({
      supabase: input.supabase,
      userId: input.userId,
      orgId: input.orgId,
      event: input.event,
      matchedClients: input.matchedClients,
    })
    if (primary.some((decision) => decision.routed)) return primary

    const fallback = await this.enqueueForRoute({
      supabase: input.supabase,
      userId: input.userId,
      orgId: input.orgId,
      event: input.event,
      spaceRoute: input.spaceRoute,
    })
    return [fallback]
  }

  async enqueueForMatchedClients(input: {
    supabase: SupabaseClient
    userId: string
    orgId: string | null
    event: Record<string, unknown>
    matchedClients: Array<{ id: string; name: string }>
    scopeMap?: Record<string, PageGraderClientScopeEntry>
  }): Promise<CampaignBrainRouteDecision[]> {
    if (input.matchedClients.length === 0) {
      return [{ routed: false, reason: 'no_matched_clients' }]
    }

    let scopeMap = input.scopeMap
    if (!scopeMap) {
      try {
        scopeMap = await this.pageGraderApi.getClientScopeMap(input.userId)
      } catch (error) {
        this.logger.warn(
          `[FATHOM-DEBUG] Campaign brain matched-client scope map failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
        return [{ routed: false, reason: 'lookup_failed' }]
      }
    }

    const decisions: CampaignBrainRouteDecision[] = []
    const seenCampaigns = new Set<string>()
    for (const client of input.matchedClients) {
      const campaignId = scopeMap[client.id]?.campaign_id?.trim() ?? ''
      if (!campaignId) {
        decisions.push({ routed: false, reason: 'no_scope' })
        continue
      }
      if (seenCampaigns.has(campaignId)) continue
      seenCampaigns.add(campaignId)

      let campaign: { id: string; name: string | null; config: unknown } | null
      try {
        campaign = await this.loadCampaign(input.supabase, campaignId)
      } catch (error) {
        this.logger.warn(
          `[FATHOM-DEBUG] Campaign brain matched-client lookup failed for ${campaignId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
        decisions.push({ routed: false, reason: 'lookup_failed' })
        continue
      }
      if (!campaign) {
        decisions.push({ routed: false, reason: 'no_campaign' })
        continue
      }
      if (isSystemCampaign(campaign)) {
        decisions.push({ routed: false, reason: 'system_campaign' })
        continue
      }

      const queued = await this.importJobs.enqueueCampaignMeetingImport(
        input.userId,
        { campaignId: campaign.id, source: toMeetingJobSource(input.event) },
        input.orgId,
      )
      this.logger.log(
        `[FATHOM-DEBUG] Campaign brain route (matched_client): client=${client.id} campaign=${campaign.id} job=${queued.jobId}`,
      )
      decisions.push({
        routed: true,
        campaignId: campaign.id,
        jobId: queued.jobId,
        clientId: client.id,
        source: 'matched_client',
      })
    }
    return decisions.length > 0 ? decisions : [{ routed: false, reason: 'no_matched_clients' }]
  }

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

    const queued = await this.importJobs.enqueueCampaignMeetingImport(
      input.userId,
      { campaignId: campaign.id, source: toMeetingJobSource(input.event) },
      input.orgId,
    )
    this.logger.log(
      `[FATHOM-DEBUG] Campaign brain route (space_route fallback): campaign ${campaign.id} job=${queued.jobId}`,
    )
    return { routed: true, campaignId: campaign.id, jobId: queued.jobId, source: 'space_route' }
  }

  async persistMatchedClientIds(input: {
    supabase: SupabaseClient
    userId: string
    event: Record<string, unknown>
    matchedClientIds: string[]
  }): Promise<void> {
    const externalId = String(
      input.event.recording_id ||
        input.event.id ||
        input.event.call_id ||
        input.event.url ||
        input.event.title ||
        '',
    ).trim()
    if (!externalId || input.matchedClientIds.length === 0) return

    const { data: existing, error: loadError } = await input.supabase
      .from('meeting_recordings')
      .select('id, metadata')
      .eq('user_id', input.userId)
      .eq('provider', 'fathom')
      .eq('external_recording_id', externalId)
      .maybeSingle()
    if (loadError) {
      this.logger.warn(
        `[FATHOM-DEBUG] Failed to load meeting_recordings for matched_client_ids: ${loadError.message}`,
      )
      return
    }
    if (!existing?.id) return

    const metadata =
      existing.metadata &&
      typeof existing.metadata === 'object' &&
      !Array.isArray(existing.metadata)
        ? (existing.metadata as Record<string, unknown>)
        : {}
    const { error } = await input.supabase
      .from('meeting_recordings')
      .update({
        metadata: {
          ...metadata,
          matched_client_ids: [...new Set(input.matchedClientIds)],
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (error) {
      this.logger.warn(
        `[FATHOM-DEBUG] Failed to persist matched_client_ids on meeting_recordings: ${error.message}`,
      )
    }
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
    return this.loadCampaign(supabase, campaignId)
  }

  private async loadCampaign(
    supabase: SupabaseClient,
    campaignId: string,
  ): Promise<{ id: string; name: string | null; config: unknown } | null> {
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

/** The bridged event carries the normalized source; a raw Fathom event is normalized here. */
function toMeetingJobSource(event: Record<string, unknown>) {
  return compactMeetingSource(readEmbeddedSource(event) ?? normalizeFathomMeetingSource(event))
}
