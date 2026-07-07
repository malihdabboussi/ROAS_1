import { Injectable, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ComposioService } from '../../composio/services/composio.service'
import { CampaignSocialInsightsRepository } from '../repositories/campaign-social-insights.repository'
import { SocialInsightsYoutubeProjectionBase } from './social-insights-youtube-projection.base'
import {
  CACHE_TTL_MS,
  EMPTY_ACCOUNT_METRICS,
  IG_POST_METRIC_PRESET_BY_TYPE,
  isSocialAnalyticsPlatform,
  type IntegrationContext,
  type SocialAnalyticsAccountMetrics,
  type SocialAnalyticsChartPoint,
  type SocialAnalyticsPlatform,
  type SocialAnalyticsPostRow,
  type SocialAnalyticsResponse,
  type SocialConnectionOptionDto,
  type SocialPostRow,
} from './social-insights.shared'

export { isSocialAnalyticsPlatform } from './social-insights.shared'
export type {
  SocialAnalyticsAccountMetrics,
  SocialAnalyticsActiveConnection,
  SocialAnalyticsChartPoint,
  SocialAnalyticsPlatform,
  SocialAnalyticsPostRow,
  SocialAnalyticsResponse,
  SocialConnectionOptionDto,
} from './social-insights.shared'

@Injectable()
export class SocialInsightsService extends SocialInsightsYoutubeProjectionBase {
  constructor(
    composio: ComposioService,
    @Optional() socialInsightsRepo?: CampaignSocialInsightsRepository,
  ) {
    super(composio, socialInsightsRepo)
  }

  isSocialAnalyticsPlatform(value: string): value is SocialAnalyticsPlatform {
    return isSocialAnalyticsPlatform(value)
  }

  async getCampaignSocialAnalytics(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    options: {
      platform: SocialAnalyticsPlatform
      since?: string
      until?: string
      refresh?: boolean
      connectionId?: string | null
    },
  ): Promise<SocialAnalyticsResponse> {
    const platform = options.platform
    const now = new Date().toISOString()

    const integration = await this.resolveIntegrationContext(
      supabase,
      userId,
      campaignId,
      platform,
      options.connectionId ?? null,
    )

    const posts = await this.listPublishedPosts(supabase, campaignId, platform)
    const publishedWithIdCount = posts.length

    if (!integration.connected || !integration.connectedAccountId) {
      return {
        platform,
        connected: false,
        reason: integration.reason ?? 'not_connected',
        fetched_at: now,
        stale: false,
        account: EMPTY_ACCOUNT_METRICS,
        chart_data: [],
        posts: [],
        post_count: 0,
        published_with_id_count: publishedWithIdCount,
        partial: false,
        active_connection: null,
      }
    }

    const postIds = posts.map((p) => p.id)
    const cachedById = await this.loadCachedInsights(supabase, postIds)

    const postRows: SocialAnalyticsPostRow[] = []
    let partial = false

    for (const post of posts) {
      const cached = cachedById.get(post.id)
      const cacheIsFresh =
        !options.refresh &&
        cached?.fetched_at &&
        Date.now() - Date.parse(cached.fetched_at) < CACHE_TTL_MS

      if (cacheIsFresh && cached?.metrics) {
        postRows.push(this.projectPostRow(post, cached.metrics, cached.fetched_at, null))
        continue
      }

      try {
        const metrics = await this.fetchPostMetricsLive(integration, post)
        await this.upsertCachedInsight(supabase, post, metrics, null)
        postRows.push(this.projectPostRow(post, metrics, new Date().toISOString(), null))
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'unknown_error'
        partial = true
        this.logger.warn(
          `[social-insights] post metrics fetch failed post=${post.id} published_id=${post.published_id} platform=${platform}: ${errMsg}`,
        )
        await this.upsertCachedInsight(supabase, post, null, errMsg)
        if (cached?.metrics) {
          postRows.push(
            this.projectPostRow(post, cached.metrics, cached.fetched_at, `stale: ${errMsg}`),
          )
        } else {
          postRows.push(this.projectPostRow(post, null, null, errMsg))
        }
      }
    }

    const postAggregates = postRows.reduce(
      (acc, row) => {
        acc.reach += row.reach
        acc.likes += row.likes
        acc.comments += row.comments
        acc.shares += row.shares
        acc.saves += row.saves
        acc.total_interactions += row.total_interactions
        return acc
      },
      { reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, total_interactions: 0 },
    )

    let accountMetrics: SocialAnalyticsAccountMetrics = EMPTY_ACCOUNT_METRICS
    let chartData: SocialAnalyticsChartPoint[] = []
    let analyticsReason: string | null = null

    const missingLinkedInOrgUrn =
      platform === 'linkedin' && !this.extractLinkedInOrgUrn(integration.metadata)
    const missingFacebookPage =
      platform === 'facebook' && !this.extractFacebookPageId(integration.metadata)
    const missingYoutubeChannel =
      platform === 'youtube' && !this.extractYoutubeChannelId(integration.metadata)

    if (missingLinkedInOrgUrn) {
      analyticsReason = 'missing_linkedin_org_urn'
      partial = true
    } else if (missingFacebookPage) {
      analyticsReason = 'missing_facebook_page_id'
      partial = true
    } else if (missingYoutubeChannel) {
      analyticsReason = 'missing_youtube_channel_id'
      partial = true
    } else {
      try {
        if (platform === 'instagram') {
          const result = await this.fetchInstagramAccount(integration, options.since, options.until)
          accountMetrics = result.account
          chartData = result.chart
        } else if (platform === 'linkedin') {
          const result = await this.fetchLinkedInAccount(
            integration,
            supabase,
            userId,
            campaignId,
            options.since,
            options.until,
          )
          accountMetrics = result.account
          chartData = result.chart
        } else if (platform === 'facebook') {
          const result = await this.fetchFacebookAccount(integration, options.since, options.until)
          accountMetrics = result.account
          chartData = result.chart
        } else {
          const result = await this.fetchYoutubeAccount(integration, options.since, options.until)
          accountMetrics = result.account
          chartData = result.chart
        }
      } catch (err) {
        partial = true
        this.logger.warn(
          `[social-insights] account metrics fetch failed platform=${platform} user=${userId}: ${err instanceof Error ? err.message : 'unknown'}`,
        )
      }
    }

    const hasPostInteractions = postAggregates.total_interactions > 0
    const hasMissingAccountInteractionMetrics =
      accountMetrics.total_interactions === 0 &&
      accountMetrics.likes === 0 &&
      accountMetrics.comments === 0 &&
      accountMetrics.shares === 0 &&
      accountMetrics.saves === 0
    const shouldFallbackFromPostRows =
      postRows.length > 0 && hasPostInteractions && hasMissingAccountInteractionMetrics

    // If account-level interaction metrics are omitted, backfill KPI cards from
    // campaign post rows so the top cards match the post table evidence.
    if (shouldFallbackFromPostRows) {
      const reachForEngagement =
        postAggregates.reach > 0 ? postAggregates.reach : accountMetrics.reach
      accountMetrics = {
        ...accountMetrics,
        reach: accountMetrics.reach > 0 ? accountMetrics.reach : postAggregates.reach,
        likes: postAggregates.likes,
        comments: postAggregates.comments,
        shares: postAggregates.shares,
        saves: postAggregates.saves,
        total_interactions: postAggregates.total_interactions,
        engagement_rate:
          reachForEngagement > 0
            ? Number(((postAggregates.total_interactions / reachForEngagement) * 100).toFixed(2))
            : 0,
      }
    }

    return {
      platform,
      connected: true,
      reason: analyticsReason,
      fetched_at: now,
      stale: false,
      account: accountMetrics,
      chart_data: chartData,
      posts: postRows,
      post_count: postRows.length,
      published_with_id_count: publishedWithIdCount,
      partial,
      active_connection: integration.resolution ?? null,
    }
  }

  /** Lists selectable social connections for reporting (campaign link + user/org integrations). */
  async listCampaignSocialConnectionOptions(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    platform: SocialAnalyticsPlatform,
  ): Promise<SocialConnectionOptionDto[]> {
    const campaignOrgId = await this.socialInsightsRepo.findCampaignOrgId(supabase, campaignId)
    if (campaignOrgId === undefined) return []
    const out: SocialConnectionOptionDto[] = []

    const cic = await this.socialInsightsRepo.findCampaignConnection(supabase, campaignId, platform)

    if (cic?.composio_connected_account_id) {
      const md = this.normalizeIntegrationMetadata(cic.metadata)
      out.push({
        id: String(cic.id),
        source: 'campaign_integration',
        label: this.formatSocialConnectionLabel(platform, md, null),
        platform,
        scope_mode: null,
        is_default: true,
        linkedin_company_page_name:
          platform === 'linkedin' ? this.extractLinkedInCompanyPageName(md) : null,
        facebook_page_name: platform === 'facebook' ? this.extractFacebookPageName(md) : null,
        youtube_channel_name: platform === 'youtube' ? this.extractYoutubeChannelName(md) : null,
      })
    }

    const eligibleRows = await this.listAllEligibleUserIntegrationsForCampaignSocial(
      supabase,
      userId,
      campaignOrgId,
      platform,
    )

    const seen = new Set(out.map((o) => o.id))
    for (const row of eligibleRows) {
      const id = String(row.id ?? '')
      if (!id || seen.has(id)) continue
      const md = this.normalizeIntegrationMetadata(row.metadata)
      const composioId = md.composio_connected_account_id
      if (typeof composioId !== 'string' || !composioId.trim()) continue
      seen.add(id)
      out.push({
        id,
        source: 'user_integration',
        label: this.formatSocialConnectionLabel(
          platform,
          md,
          typeof row.connection_label === 'string' ? row.connection_label : null,
        ),
        platform,
        scope_mode: typeof row.scope_mode === 'string' ? row.scope_mode : null,
        is_default: Boolean(row.is_default),
        linkedin_company_page_name:
          platform === 'linkedin' ? this.extractLinkedInCompanyPageName(md) : null,
        facebook_page_name: platform === 'facebook' ? this.extractFacebookPageName(md) : null,
        youtube_channel_name: platform === 'youtube' ? this.extractYoutubeChannelName(md) : null,
      })
    }

    return out.sort((a, b) => {
      if (a.source !== b.source) return a.source === 'campaign_integration' ? -1 : 1
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1
      return a.label.localeCompare(b.label)
    })
  }

  private async fetchPostMetricsLive(
    integration: IntegrationContext,
    post: SocialPostRow,
  ): Promise<Record<string, unknown>> {
    if (post.platform === 'instagram') {
      const preset = IG_POST_METRIC_PRESET_BY_TYPE[post.post_type ?? ''] ?? 'auto_safe'
      const res = (await this.composio.executeTool(
        'INSTAGRAM_GET_POST_INSIGHTS',
        integration.composioUserId,
        { ig_post_id: post.published_id, metric_preset: preset },
        integration.connectedAccountId ?? undefined,
      )) as Record<string, unknown> | null
      return this.flattenIgPostMetrics(res)
    }

    if (post.platform === 'linkedin') {
      const orgUrn = this.extractLinkedInOrgUrn(integration.metadata)
      if (!orgUrn) throw new Error('missing_linkedin_org_urn')
      const res = (await this.composio.executeTool(
        'LINKEDIN_GET_SHARE_STATS',
        integration.composioUserId,
        { organizational_entity: orgUrn },
        integration.connectedAccountId ?? undefined,
      )) as Record<string, unknown> | null
      return this.flattenLinkedInShareStats(res, post.published_id)
    }

    if (post.platform === 'facebook') {
      const pageId = this.extractFacebookPageId(integration.metadata)
      if (!pageId) throw new Error('missing_facebook_page_id')
      void pageId
      const res = (await this.composio.executeTool(
        'FACEBOOK_GET_POST_INSIGHTS',
        integration.composioUserId,
        { post_id: post.published_id, metrics: 'post_media_view' },
        integration.connectedAccountId ?? undefined,
      )) as Record<string, unknown> | null
      return this.flattenFacebookPostInsights(res)
    }

    if (post.platform === 'youtube') {
      const res = (await this.composio.executeTool(
        'YOUTUBE_VIDEO_DETAILS',
        integration.composioUserId,
        { id: post.published_id, part: 'statistics,snippet' },
        integration.connectedAccountId ?? undefined,
      )) as Record<string, unknown> | null
      return this.flattenYoutubeVideoMetrics(res)
    }

    return {}
  }
}
