import { Injectable } from '@nestjs/common'
import { ArtifactLegacyStateMetaRepository } from '../repositories/artifact-legacy-state-meta.repository'
import { ArtifactLegacyAgentStateService } from './artifact-legacy-agent-state.service'
import { ArtifactLegacyMetaApiService } from './artifact-legacy-meta-api.service'

@Injectable()
export class ArtifactLegacyStateMetaService {
  constructor(
    private readonly repository: ArtifactLegacyStateMetaRepository = new ArtifactLegacyStateMetaRepository(),
    private readonly agentState: ArtifactLegacyAgentStateService = new ArtifactLegacyAgentStateService(
      repository,
    ),
    private readonly metaApi: ArtifactLegacyMetaApiService = new ArtifactLegacyMetaApiService(),
  ) {}

  resolveAgentIdForState(target: Record<string, any>, sessionKey?: string): string {
    return this.agentState.resolveAgentIdForState(target, sessionKey)
  }

  async updateState(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.agentState.updateState(target, input, sessionKey)
  }

  async patchState(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.agentState.patchState(target, input, sessionKey)
  }

  async getState(target: Record<string, any>, sessionKey?: string) {
    return this.agentState.getState(target, sessionKey)
  }

  async metaApiCall(
    target: Record<string, any>,
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    sessionKey?: string,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    return this.metaApi.metaApiCall(target, method, path, sessionKey, body)
  }

  async checkIntegrationConnection(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.metaApi.checkIntegrationConnection(target, data, sessionKey)
  }

  async checkMetaConnection(target: Record<string, any>, sessionKey?: string) {
    return this.metaApi.checkMetaConnection(target, sessionKey)
  }

  async listMetaAdAccounts(target: Record<string, any>, sessionKey?: string) {
    return this.metaApi.listMetaAdAccounts(target, sessionKey)
  }

  async listMetaPages(target: Record<string, any>, sessionKey?: string) {
    return this.metaApi.listMetaPages(target, sessionKey)
  }

  async listMetaAudiences(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.metaApi.listMetaAudiences(target, data, sessionKey)
  }

  async createMetaCustomAudience(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.metaApi.createMetaCustomAudience(target, data, sessionKey)
  }

  async createMetaLookalikeAudience(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.metaApi.createMetaLookalikeAudience(target, data, sessionKey)
  }

  async listMetaPixelEvents(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.metaApi.listMetaPixelEvents(target, data, sessionKey)
  }

  async createMetaPixelEvent(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.metaApi.createMetaPixelEvent(target, data, sessionKey)
  }

  async resolveMetaInstagramUserId(
    target: Record<string, any>,
    pageId: string,
    sessionKey?: string,
  ): Promise<string | undefined> {
    return this.metaApi.resolveMetaInstagramUserId(target, pageId, sessionKey)
  }

  async publishAdToMeta(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const adAccountIdRaw = data.ad_account_id
    const pageIdRaw = data.page_id
    const instagramUserIdRaw = data.instagram_user_id
    const adAccountId = typeof adAccountIdRaw === 'string' ? adAccountIdRaw.trim() : undefined
    const pageId = typeof pageIdRaw === 'string' ? pageIdRaw.trim() : undefined
    let instagramUserId =
      typeof instagramUserIdRaw === 'string' ? instagramUserIdRaw.trim() : undefined
    if (!instagramUserId && pageId) {
      instagramUserId = await this.resolveMetaInstagramUserId(target, pageId, sessionKey)
    }

    const explicitCampaignId = String(data.campaign_id ?? '').trim()
    let resolvedCampaignId = explicitCampaignId

    if (!resolvedCampaignId) {
      const adId = String(data.ad_id ?? '').trim()
      if (!adId) return { success: false, error: 'ad_id or campaign_id is required' }

      const userId = target.resolveUserId(sessionKey)
      const metaOrgId = (target.resolveOrgId?.(sessionKey) as string | null) ?? null
      const supabase = await target.getUserClient(userId, sessionKey as string)
      const { data: ad, error: adError } = await this.repository.findAdSetIdForAd(supabase, {
        adId,
        userId,
        orgId: metaOrgId,
      })
      if (adError || !ad?.ad_set_id) {
        return { success: false, error: 'Unable to resolve campaign from ad_id' }
      }

      const { data: adSet, error: adSetError } = await this.repository.findCampaignIdForAdSet(
        supabase,
        {
          adSetId: String(ad.ad_set_id),
          userId,
          orgId: metaOrgId,
        },
      )
      if (adSetError || !adSet?.ad_campaign_id) {
        return { success: false, error: 'Unable to resolve ad_campaign_id from ad_id' }
      }
      resolvedCampaignId = adSet.ad_campaign_id as string
    }

    if (resolvedCampaignId) {
      const persisted = await this.persistMetaPublishDefaults(
        target,
        resolvedCampaignId,
        {
          ad_account_id: adAccountId,
          page_id: pageId,
          instagram_user_id: instagramUserId,
        },
        sessionKey,
      )
      if (!persisted.success) return persisted

      return this.metaApiCall(target, 'POST', '/publish-campaign', sessionKey, {
        campaign_id: resolvedCampaignId,
        campaign_name: data.campaign_name,
        campaign_objective: data.campaign_objective,
        daily_budget: data.daily_budget,
        lifetime_budget: data.lifetime_budget,
        budget_type: data.budget_type,
        bid_strategy: data.bid_strategy,
        targeting: data.targeting,
        pixel_id: data.pixel_id,
        custom_event_type: data.custom_event_type,
        start_time: data.start_time,
        end_time: data.end_time,
      })
    }

    if (!adAccountId) return { success: false, error: 'ad_account_id is required' }
    if (!pageId) return { success: false, error: 'page_id is required' }
    if (!instagramUserId) return { success: false, error: 'instagram_user_id is required' }

    return this.metaApiCall(target, 'POST', '/publish-ad', sessionKey, {
      ad_id: data.ad_id,
      ad_account_id: adAccountId,
      page_id: pageId,
      instagram_user_id: instagramUserId,
      campaign_name: data.campaign_name,
      campaign_objective: data.campaign_objective,
      adset_name: data.adset_name,
      daily_budget: data.daily_budget,
      lifetime_budget: data.lifetime_budget,
      budget_type: data.budget_type,
      bid_strategy: data.bid_strategy,
      targeting: data.targeting,
      pixel_id: data.pixel_id,
      custom_event_type: data.custom_event_type,
      start_time: data.start_time,
      end_time: data.end_time,
    })
  }

  async persistMetaPublishDefaults(
    target: Record<string, any>,
    adCampaignId: string,
    defaults: {
      ad_account_id?: string
      page_id?: string
      instagram_user_id?: string
    },
    sessionKey?: string,
  ): Promise<{ success: true } | { success: false; error: string }> {
    const adAccountId = String(defaults.ad_account_id ?? '').trim()
    const pageId = String(defaults.page_id ?? '').trim()
    const instagramUserId = String(defaults.instagram_user_id ?? '').trim()
    if (!adAccountId && !pageId && !instagramUserId) return { success: true }

    const userId = target.resolveUserId(sessionKey)
    const persistOrgId = (target.resolveOrgId?.(sessionKey) as string | null) ?? null
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data: current, error: readError } = await this.repository.findAdCampaignMetadata(
      supabase,
      { campaignId: adCampaignId, userId, orgId: persistOrgId },
    )
    if (readError) {
      return { success: false, error: `Failed to load campaign settings: ${readError.message}` }
    }

    const metadata = ((current?.metadata as Record<string, unknown> | null) ?? {}) as Record<
      string,
      unknown
    >
    if (adAccountId) metadata.meta_ad_account_id = adAccountId
    if (pageId) metadata.meta_page_id = pageId
    if (instagramUserId) metadata.meta_instagram_user_id = instagramUserId

    const updatePayload: Record<string, unknown> = {
      metadata,
      updated_at: new Date().toISOString(),
    }
    if (adAccountId) updatePayload.meta_ad_account_id = adAccountId
    if (pageId) updatePayload.meta_page_id = pageId

    const { error: updateError } = await this.repository.updateAdCampaignMetadata(supabase, {
      campaignId: adCampaignId,
      userId,
      orgId: persistOrgId,
      payload: updatePayload,
    })
    if (updateError) {
      return { success: false, error: `Failed to save campaign settings: ${updateError.message}` }
    }
    return { success: true }
  }

  async saveMetaDefaults(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const campaignId = String(data.campaign_id ?? '').trim()
    if (!campaignId) return { success: false, error: 'campaign_id is required' }

    const adAccountId =
      typeof data.ad_account_id === 'string' ? data.ad_account_id.trim() : undefined
    const pageId = typeof data.page_id === 'string' ? data.page_id.trim() : undefined
    let instagramUserId =
      typeof data.instagram_user_id === 'string' ? data.instagram_user_id.trim() : undefined
    if (!instagramUserId && pageId) {
      instagramUserId = await this.resolveMetaInstagramUserId(target, pageId, sessionKey)
    }
    const pixelId = typeof data.pixel_id === 'string' ? data.pixel_id.trim() : undefined

    if (!adAccountId && !pageId && !instagramUserId && !pixelId) {
      return {
        success: false,
        error: 'At least one of ad_account_id, page_id, instagram_user_id, or pixel_id is required',
      }
    }

    const userId = target.resolveUserId(sessionKey)
    const saveOrgId = (target.resolveOrgId?.(sessionKey) as string | null) ?? null
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data: current, error: readError } = await this.repository.findAdCampaignMetadata(
      supabase,
      { campaignId, userId, orgId: saveOrgId },
    )
    if (readError) {
      return { success: false, error: `Failed to load campaign: ${readError.message}` }
    }

    const metadata = ((current?.metadata as Record<string, unknown> | null) ?? {}) as Record<
      string,
      unknown
    >
    if (adAccountId) metadata.meta_ad_account_id = adAccountId
    if (pageId) metadata.meta_page_id = pageId
    if (instagramUserId) metadata.meta_instagram_user_id = instagramUserId
    if (pixelId) metadata.meta_pixel_id = pixelId

    const updatePayload: Record<string, unknown> = {
      metadata,
      updated_at: new Date().toISOString(),
    }
    if (adAccountId) updatePayload.meta_ad_account_id = adAccountId
    if (pageId) updatePayload.meta_page_id = pageId

    const { error: updateError } = await this.repository.updateAdCampaignMetadata(supabase, {
      campaignId,
      userId,
      orgId: saveOrgId,
      payload: updatePayload,
    })
    if (updateError) {
      return { success: false, error: `Failed to save defaults: ${updateError.message}` }
    }

    return {
      success: true,
      saved: {
        ad_account_id: adAccountId ?? null,
        page_id: pageId ?? null,
        instagram_user_id: instagramUserId ?? null,
        pixel_id: pixelId ?? null,
      },
    }
  }

  async updateAdCampaignOnMeta(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.metaApi.updateAdCampaignOnMeta(target, data, sessionKey)
  }

  async updateAdSetOnMeta(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.metaApi.updateAdSetOnMeta(target, data, sessionKey)
  }

  async getMetaAdStatus(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const metaAdId = data.meta_ad_id as string
    if (!metaAdId) return { success: false, error: 'meta_ad_id is required' }

    const userId = target.resolveUserId(sessionKey)
    const orgId = typeof target.resolveOrgId === 'function' ? target.resolveOrgId(sessionKey) : null
    const supabase = await target.getUserClient(userId, sessionKey as string)

    const { data: integrations } = await this.repository.findConnectedMetaIntegrations(supabase, {
      userId,
      orgId,
      includeMetadata: false,
    })
    const integration = this.pickPreferredMetaIntegration(
      (integrations ?? []) as Array<Record<string, unknown>>,
      userId,
      orgId,
    )

    if (!integration?.access_token) {
      return { success: false, error: 'Meta is not connected' }
    }

    const url = `https://graph.facebook.com/v25.0/${metaAdId}?fields=id,effective_status,configured_status&access_token=${integration.access_token}`
    const response = await fetch(url)
    const raw = await response.text()

    if (!response.ok) {
      return { success: false, error: `Failed to get ad status: ${raw.slice(0, 200)}` }
    }

    return { success: true, ...(JSON.parse(raw) as Record<string, unknown>) }
  }

  async getMetaAdsInsights(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.metaApi.getMetaAdsInsights(target, data, sessionKey)
  }

  async getDeliveryEstimate(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const adSetId = data.ad_set_id as string
    if (!adSetId) return { success: false, error: 'ad_set_id is required' }

    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)

    const estOrgId = (target.resolveOrgId?.(sessionKey) as string | null) ?? null
    const { data: adSet, error: adSetError } = await this.repository.findAdSetDeliverySettings(
      supabase,
      {
        adSetId,
        userId,
        orgId: estOrgId,
      },
    )

    if (adSetError || !adSet) return { success: false, error: 'Ad set not found' }

    const targeting = (adSet.targeting as Record<string, unknown>) ?? {}
    if (!targeting.geo_locations) {
      return { success: false, error: 'Ad set must have geo_locations in targeting' }
    }

    const orgId = estOrgId
    const { data: integrations } = await this.repository.findConnectedMetaIntegrations(supabase, {
      userId,
      orgId,
      includeMetadata: true,
    })
    const integration = this.pickPreferredMetaIntegration(
      (integrations ?? []) as Array<Record<string, unknown>>,
      userId,
      orgId,
    )

    if (!integration?.access_token) return { success: false, error: 'Meta is not connected' }

    const intMetadata = (integration.metadata as Record<string, unknown> | null) ?? {}
    const adAccounts = (intMetadata.ad_accounts as Array<{ id: string }>) ?? []
    const adAccountId = adAccounts[0]?.id
    if (!adAccountId) return { success: false, error: 'No Meta ad account found' }

    const params = new URLSearchParams()
    params.set(
      'fields',
      'daily_outcomes_curve,estimate_dau,estimate_mau_lower_bound,estimate_mau_upper_bound,estimate_ready',
    )
    params.set('targeting_spec', JSON.stringify(targeting))
    params.set('optimization_goal', (adSet.optimization_goal as string) || 'LINK_CLICKS')
    params.set('access_token', integration.access_token as string)

    const url = `https://graph.facebook.com/v25.0/${adAccountId}/delivery_estimate?${params.toString()}`
    const response = await fetch(url)
    const raw = await response.text()

    if (!response.ok) {
      return { success: false, error: `Delivery estimate failed: ${raw.slice(0, 200)}` }
    }

    const parsed = JSON.parse(raw) as { data?: Array<Record<string, unknown>> }
    const first = parsed.data?.[0] ?? {}
    return {
      success: true,
      estimate_mau_lower_bound: first.estimate_mau_lower_bound ?? 0,
      estimate_mau_upper_bound: first.estimate_mau_upper_bound ?? 0,
      estimate_dau: first.estimate_dau ?? 0,
      estimate_ready: first.estimate_ready ?? false,
      daily_outcomes_curve: first.daily_outcomes_curve ?? [],
    }
  }

  private pickPreferredMetaIntegration(
    rows: Array<Record<string, unknown>>,
    userId: string,
    orgId: string | null,
  ): Record<string, unknown> | null {
    if (!rows.length) return null
    if (!orgId) return rows[0]
    const scopedRows = rows.filter((row) => {
      const scopeMode = String(row.scope_mode ?? '')
      if (scopeMode === 'org_shared') return true
      if (scopeMode === 'personal') return String(row.user_id ?? '') === userId
      return false
    })
    if (!scopedRows.length) return null
    const personalRow = scopedRows.find(
      (row) => String(row.scope_mode ?? '') === 'personal' && String(row.user_id ?? '') === userId,
    )
    if (personalRow) return personalRow
    const sharedDefault = scopedRows.find(
      (row) => String(row.scope_mode ?? '') === 'org_shared' && Boolean(row.is_default),
    )
    if (sharedDefault) return sharedDefault
    const latestShared = scopedRows.find((row) => String(row.scope_mode ?? '') === 'org_shared')
    if (latestShared) return latestShared
    return scopedRows[0]
  }
}
