import type { SupabaseClient } from '@supabase/supabase-js'
import { SocialInsightsBase } from './social-insights-base'
import type {
  CachedInsightRow,
  IntegrationContext,
  SocialAnalyticsActiveConnection,
  SocialAnalyticsPlatform,
  SocialConnectionOptionDto,
  SocialPostRow,
} from './social-insights.shared'

export class SocialInsightsConnectionBase extends SocialInsightsBase {
  protected normalizeIntegrationMetadata(raw: unknown): Record<string, unknown> {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>
    return {}
  }

  // ─── LinkedIn fetchers ─────────────────────────────────────────────────────

  protected extractLinkedInCompanyPageName(metadata: Record<string, unknown>): string | null {
    const name = metadata.linkedin_organization_name
    if (typeof name === 'string' && name.trim()) return name.trim()
    return null
  }

  protected extractLinkedInOrgUrn(metadata: Record<string, unknown>): string | null {
    const urn = metadata.linkedin_organization_urn ?? metadata.organizational_entity
    if (typeof urn === 'string' && urn.trim().startsWith('urn:li:organization:')) {
      return urn.trim()
    }
    return null
  }

  // ─── Facebook fetchers ─────────────────────────────────────────────────────

  protected extractFacebookPageId(metadata: Record<string, unknown>): string | null {
    const id = metadata.facebook_page_id ?? metadata.page_id
    if (typeof id === 'string' && id.trim()) return id.trim()
    if (typeof id === 'number' && Number.isFinite(id)) return String(id)
    return null
  }

  protected extractFacebookPageName(metadata: Record<string, unknown>): string | null {
    const name = metadata.facebook_page_name
    if (typeof name === 'string' && name.trim()) return name.trim()
    return null
  }

  // ─── YouTube fetchers ──────────────────────────────────────────────────────

  protected extractYoutubeChannelId(metadata: Record<string, unknown>): string | null {
    const id = metadata.youtube_channel_id ?? metadata.channel_id
    if (typeof id === 'string' && id.trim().startsWith('UC')) return id.trim()
    return null
  }

  protected extractYoutubeChannelName(metadata: Record<string, unknown>): string | null {
    const name = metadata.youtube_channel_name
    if (typeof name === 'string' && name.trim()) return name.trim()
    return null
  }

  protected formatSocialConnectionLabel(
    platform: SocialAnalyticsPlatform,
    metadata: Record<string, unknown>,
    connectionLabel: string | null,
  ): string {
    const trimmed = connectionLabel?.trim()
    if (trimmed) return trimmed
    const igCandidates = [
      metadata.instagram_username,
      metadata.username,
      metadata.ig_username,
      metadata.page_name,
    ]
    if (platform === 'instagram') {
      for (const c of igCandidates) {
        if (typeof c === 'string' && c.trim()) {
          const u = c.trim().replace(/^@/, '')
          return `@${u}`
        }
      }
      return 'Instagram account'
    }
    if (platform === 'linkedin') {
      const liCandidates = [
        metadata.linkedin_organization_name,
        metadata.organization_name,
        metadata.page_name,
      ]
      for (const c of liCandidates) {
        if (typeof c === 'string' && c.trim()) return c.trim()
      }
      return 'LinkedIn account'
    }
    if (platform === 'facebook') {
      const fbName = this.extractFacebookPageName(metadata)
      if (fbName) return fbName
      return 'Facebook Page'
    }
    if (platform === 'youtube') {
      const ytName = this.extractYoutubeChannelName(metadata)
      if (ytName) return ytName
      return 'YouTube channel'
    }
    return 'Social account'
  }

  protected integrationContextFromCampaignIntegration(
    row: {
      id: unknown
      composio_connected_account_id: unknown
      user_id: unknown
      metadata: unknown
    },
    platform: SocialAnalyticsPlatform,
    fallbackUserId: string,
  ): IntegrationContext {
    const metadata = this.normalizeIntegrationMetadata(row.metadata)
    const label = this.formatSocialConnectionLabel(platform, metadata, null)
    return {
      connected: true,
      connectedAccountId: String(row.composio_connected_account_id),
      composioUserId: String(row.user_id ?? fallbackUserId),
      metadata,
      reason: null,
      resolution: {
        id: String(row.id),
        source: 'campaign_integration',
        label,
      },
    }
  }

  protected integrationContextFromUserIntegrationRow(
    row: Record<string, unknown>,
    platform: SocialAnalyticsPlatform,
    fallbackUserId: string,
  ): IntegrationContext {
    const metadata = this.normalizeIntegrationMetadata(row.metadata)
    const connectedAccountId =
      typeof metadata.composio_connected_account_id === 'string'
        ? metadata.composio_connected_account_id
        : null
    const connLabel = typeof row.connection_label === 'string' ? row.connection_label : null
    const label = this.formatSocialConnectionLabel(platform, metadata, connLabel)
    return {
      connected: Boolean(connectedAccountId),
      connectedAccountId,
      composioUserId: String(row.user_id ?? fallbackUserId),
      metadata,
      reason: connectedAccountId ? null : 'missing_composio_connection',
      resolution: connectedAccountId
        ? { id: String(row.id), source: 'user_integration', label }
        : undefined,
    }
  }

  protected isUserIntegrationEligibleForCampaignSocial(
    row: Record<string, unknown>,
    userId: string,
    campaignOrgId: string | null,
    platform: SocialAnalyticsPlatform,
  ): boolean {
    if (String(row.integration_id ?? '') !== platform) return false
    if (String(row.status ?? '').toLowerCase() !== 'connected') return false
    const md = this.normalizeIntegrationMetadata(row.metadata)
    if (
      typeof md.composio_connected_account_id !== 'string' ||
      !md.composio_connected_account_id.trim()
    )
      return false

    const scopeMode = String(row.scope_mode ?? '')
    const rowOrgId = row.org_id as string | null
    const rowUserId = String(row.user_id ?? '')

    if (!campaignOrgId) {
      return rowOrgId === null && scopeMode === 'personal' && rowUserId === userId
    }

    if (rowOrgId !== campaignOrgId) return false
    if (scopeMode === 'org_shared') return true
    if (scopeMode === 'personal' && rowUserId === userId) return true
    return false
  }

  protected async listAllEligibleUserIntegrationsForCampaignSocial(
    supabase: SupabaseClient,
    userId: string,
    campaignOrgId: string | null,
    platform: SocialAnalyticsPlatform,
  ): Promise<Array<Record<string, unknown>>> {
    const personal = await this.socialInsightsRepo.listEligiblePersonalIntegrations(
      supabase,
      userId,
      platform,
      campaignOrgId,
    )
    const shared = campaignOrgId
      ? await this.socialInsightsRepo.listEligibleSharedIntegrations(
          supabase,
          campaignOrgId,
          platform,
        )
      : []

    const merged = [...(personal ?? []), ...(shared ?? [])]
    const seen = new Set<string>()
    const uniq: Array<Record<string, unknown>> = []
    for (const r of merged) {
      const id = String(r.id ?? '')
      if (!id || seen.has(id)) continue
      seen.add(id)
      uniq.push(r as Record<string, unknown>)
    }
    return uniq
  }

  protected pickDefaultUserIntegrationRow(
    rows: Array<Record<string, unknown>>,
  ): Record<string, unknown> | null {
    if (!rows.length) return null
    const personal = rows.filter((r) => String(r.scope_mode ?? '') === 'personal')
    if (personal.length) return personal[0]
    const shared = rows.filter((r) => String(r.scope_mode ?? '') === 'org_shared')
    const def = shared.find((r) => Boolean(r.is_default))
    if (def) return def
    return shared[0] ?? null
  }

  // ─── Integration resolution ────────────────────────────────────────────────

  protected async resolveIntegrationContext(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    platform: SocialAnalyticsPlatform,
    preferredConnectionId?: string | null,
  ): Promise<IntegrationContext> {
    const campaignOrgId = await this.socialInsightsRepo.findCampaignOrgId(supabase, campaignId)

    if (campaignOrgId === undefined) {
      return {
        connected: false,
        connectedAccountId: null,
        composioUserId: userId,
        metadata: {},
        reason: 'campaign_not_found',
      }
    }

    const pref = preferredConnectionId?.trim()

    if (pref) {
      const cicPref = await this.socialInsightsRepo.findCampaignConnection(
        supabase,
        campaignId,
        platform,
        pref,
      )

      if (cicPref?.composio_connected_account_id) {
        return this.integrationContextFromCampaignIntegration(cicPref, platform, userId)
      }

      const uiPref = await this.socialInsightsRepo.findUserIntegrationById(supabase, pref)

      if (
        uiPref &&
        this.isUserIntegrationEligibleForCampaignSocial(
          uiPref as Record<string, unknown>,
          userId,
          campaignOrgId,
          platform,
        )
      ) {
        return this.integrationContextFromUserIntegrationRow(uiPref, platform, userId)
      }

      this.logger.warn(
        `[social-insights] preferred connection ignored id=${pref} campaign=${campaignId} platform=${platform}`,
      )
    }

    const campaignConn = await this.socialInsightsRepo.findCampaignConnection(
      supabase,
      campaignId,
      platform,
    )

    if (campaignConn?.composio_connected_account_id) {
      return this.integrationContextFromCampaignIntegration(campaignConn, platform, userId)
    }

    const eligible = await this.listAllEligibleUserIntegrationsForCampaignSocial(
      supabase,
      userId,
      campaignOrgId,
      platform,
    )
    const picked = this.pickDefaultUserIntegrationRow(eligible)

    if (!picked) {
      return {
        connected: false,
        connectedAccountId: null,
        composioUserId: userId,
        metadata: {},
        reason: 'not_connected',
      }
    }

    return this.integrationContextFromUserIntegrationRow(picked, platform, userId)
  }

  // ─── Post list + cache ─────────────────────────────────────────────────────

  protected async listPublishedPosts(
    supabase: SupabaseClient,
    campaignId: string,
    platform: SocialAnalyticsPlatform,
  ): Promise<SocialPostRow[]> {
    return this.socialInsightsRepo.listPublishedPosts(supabase, campaignId, platform)
  }

  protected async loadCachedInsights(
    supabase: SupabaseClient,
    postIds: string[],
  ): Promise<Map<string, CachedInsightRow>> {
    const out = new Map<string, CachedInsightRow>()
    if (postIds.length === 0) return out
    try {
      return await this.socialInsightsRepo.loadCachedInsights(supabase, postIds)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown'
      this.logger.warn(`[social-insights] cache read failed: ${message}`)
      return out
    }
  }

  protected async upsertCachedInsight(
    supabase: SupabaseClient,
    post: SocialPostRow,
    metrics: Record<string, unknown> | null,
    errorMessage: string | null,
  ): Promise<void> {
    try {
      await this.socialInsightsRepo.upsertCachedInsight(supabase, post, metrics, errorMessage)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown'
      this.logger.warn(`[social-insights] cache upsert failed post=${post.id}: ${message}`)
    }
  }
}
