import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CampaignsRepository } from '../repositories/campaigns.repository'
import {
  SocialInsightsService,
  type SocialAnalyticsPlatform,
  type SocialAnalyticsResponse,
} from './social-insights.service'

export interface MainDashboardRange {
  since: string | null
  until: string | null
}

export interface MainDashboardOverview {
  leads: number
  visitors: number
  conversion_rate: number
  email_open_rate: number
  email_click_rate: number
  social_reach: number
  social_engagement_rate: number
  total_reach: number
}

export interface MainDashboardFunnels {
  visitors: number
  leads: number
  conversion_rate: number
  total_views: number
}

export interface MainDashboardEmails {
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  open_rate: number
  click_rate: number
}

export interface MainDashboardAds {
  total_ads: number
  ad_visitors: number
  ad_views: number
  ad_leads: number
  conversion_rate: number
}

export interface MainDashboardSocialPlatform {
  platform: SocialAnalyticsPlatform
  connected: boolean
  reach: number
  interactions: number
  engagement_rate: number
  follower_count: number
  post_count: number
}

export interface MainDashboardSocial {
  reach: number
  interactions: number
  engagement_rate: number
  post_count: number
  connected_platforms: SocialAnalyticsPlatform[]
  by_platform: MainDashboardSocialPlatform[]
}

export interface MainDashboardTimeseriesPoint {
  date: string
  visitors: number
  leads: number
  email_opens: number
  social_reach: number
}

export interface MainDashboardFlow {
  impressions: number
  clicks: number
  visitors: number
  leads: number
  conversion_to_lead_pct: number
}

export interface MainDashboardContribution {
  funnel_leads: number
  ad_leads: number
  email_clicks: number
  social_interactions: number
}

export interface MainDashboardAlert {
  level: 'info' | 'warning' | 'critical'
  source: 'funnel' | 'email' | 'ads' | 'social' | 'cross'
  message: string
}

export interface MainDashboardPartial {
  funnels: boolean
  emails: boolean
  ads: boolean
  social: boolean
}

export interface MainDashboardResponse {
  fetched_at: string
  range: MainDashboardRange
  overview: MainDashboardOverview
  sources: {
    funnels: MainDashboardFunnels
    emails: MainDashboardEmails
    ads: MainDashboardAds
    social: MainDashboardSocial
  }
  timeseries: MainDashboardTimeseriesPoint[]
  flow: MainDashboardFlow
  contribution: MainDashboardContribution
  alerts: MainDashboardAlert[]
  partial: MainDashboardPartial
}

type AnalyticsRow = {
  visitors?: number | null
  leads?: number | null
  conversion_rate?: number | null
  total_views?: number | null
  chart_data?: Array<{ date: string; visitors?: number; leads?: number }> | null
}

type EmailRow = {
  sent?: number | null
  delivered?: number | null
  opened?: number | null
  clicked?: number | null
  bounced?: number | null
  open_rate?: number | null
  click_rate?: number | null
  chart_data?: Array<{ date: string; opens?: number; clicks?: number }> | null
}

type AdRow = {
  ad_visitors?: number | null
  ad_views?: number | null
  ad_leads?: number | null
  total_ads?: number | null
  conversion_rate?: number | null
}

const SOCIAL_PLATFORMS: SocialAnalyticsPlatform[] = ['instagram', 'linkedin', 'facebook', 'youtube']

const CACHE_TTL_MS = 60 * 1000

interface CachedEntry {
  expiresAt: number
  value: MainDashboardResponse
}

const EMPTY_FUNNELS: MainDashboardFunnels = {
  visitors: 0,
  leads: 0,
  conversion_rate: 0,
  total_views: 0,
}

const EMPTY_EMAILS: MainDashboardEmails = {
  sent: 0,
  delivered: 0,
  opened: 0,
  clicked: 0,
  bounced: 0,
  open_rate: 0,
  click_rate: 0,
}

const EMPTY_ADS: MainDashboardAds = {
  total_ads: 0,
  ad_visitors: 0,
  ad_views: 0,
  ad_leads: 0,
  conversion_rate: 0,
}

@Injectable()
export class MainDashboardService {
  private readonly logger = new Logger(MainDashboardService.name)
  private readonly cache = new Map<string, CachedEntry>()

  constructor(
    private readonly campaignsRepo: CampaignsRepository,
    private readonly socialInsights: SocialInsightsService,
  ) {}

  async getMainDashboard(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    opts: { since?: string; until?: string; refresh?: boolean } = {},
  ): Promise<MainDashboardResponse> {
    const since = opts.since ?? null
    const until = opts.until ?? null

    // Serve from short-lived cache unless the caller explicitly asked to refresh.
    const cacheKey = `${campaignId}|${since ?? ''}|${until ?? ''}|${userId}`
    if (!opts.refresh) {
      const hit = this.cache.get(cacheKey)
      if (hit && hit.expiresAt > Date.now()) {
        return hit.value
      }
    }

    // Validate campaign once up-front instead of re-validating inside each
    // analytics service method (previously ran findById 3× per request).
    const campaign = await this.campaignsRepo.findById(supabase, campaignId)
    if (!campaign) throw new NotFoundException('Campaign not found')

    const [funnelsSettled, emailsSettled, adsSettled, ...socialSettled] = await Promise.all([
      this.safe(() =>
        this.campaignsRepo.getAnalytics(supabase, campaignId, opts.since, opts.until),
      ),
      this.safe(() =>
        this.campaignsRepo.getEmailAnalytics(supabase, campaignId, opts.since, opts.until),
      ),
      this.safe(() =>
        this.campaignsRepo.getAdAnalytics(supabase, campaignId, opts.since, opts.until),
      ),
      ...SOCIAL_PLATFORMS.map((platform) =>
        this.safe(() =>
          this.socialInsights.getCampaignSocialAnalytics(supabase, userId, campaignId, {
            platform,
            since: opts.since,
            until: opts.until,
            refresh: opts.refresh,
          }),
        ),
      ),
    ])

    const funnels = this.projectFunnels(funnelsSettled.value as AnalyticsRow | null)
    const emails = this.projectEmails(emailsSettled.value as EmailRow | null)
    const ads = this.projectAds(adsSettled.value as AdRow | null)
    const socialResponses = socialSettled.map((s) => s.value as SocialAnalyticsResponse | null)
    const socialByPlatform = this.projectSocialByPlatform(socialResponses)
    const social = this.aggregateSocial(socialByPlatform)

    const timeseries = this.buildTimeseries({
      funnel: (funnelsSettled.value as AnalyticsRow | null)?.chart_data ?? [],
      email: (emailsSettled.value as EmailRow | null)?.chart_data ?? [],
      social: socialResponses.flatMap((r) => r?.chart_data ?? []),
    })

    const overview = this.buildOverview(funnels, emails, ads, social)
    const flow = this.buildFlow(funnels, ads, social)
    const contribution: MainDashboardContribution = {
      funnel_leads: funnels.leads,
      ad_leads: ads.ad_leads,
      email_clicks: emails.clicked,
      social_interactions: social.interactions,
    }

    const alerts = this.buildAlerts(funnels, emails, ads, social)

    const response: MainDashboardResponse = {
      fetched_at: new Date().toISOString(),
      range: { since, until },
      overview,
      sources: { funnels, emails, ads, social },
      timeseries,
      flow,
      contribution,
      alerts,
      partial: {
        funnels: !funnelsSettled.ok,
        emails: !emailsSettled.ok,
        ads: !adsSettled.ok,
        social: socialSettled.every((s) => !s.ok),
      },
    }

    this.cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value: response })
    this.pruneCache()

    return response
  }

  private pruneCache(): void {
    if (this.cache.size < 256) return
    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) this.cache.delete(key)
    }
  }

  private async safe<T>(fn: () => Promise<T>): Promise<{ ok: boolean; value: T | null }> {
    try {
      const value = await fn()
      return { ok: true, value }
    } catch (err) {
      this.logger.warn(
        `[main-dashboard] source fetch failed: ${err instanceof Error ? err.message : 'unknown'}`,
      )
      return { ok: false, value: null }
    }
  }

  private projectFunnels(row: AnalyticsRow | null): MainDashboardFunnels {
    if (!row) return { ...EMPTY_FUNNELS }
    return {
      visitors: this.toInt(row.visitors),
      leads: this.toInt(row.leads),
      conversion_rate: this.toNum(row.conversion_rate),
      total_views: this.toInt(row.total_views),
    }
  }

  private projectEmails(row: EmailRow | null): MainDashboardEmails {
    if (!row) return { ...EMPTY_EMAILS }
    return {
      sent: this.toInt(row.sent),
      delivered: this.toInt(row.delivered),
      opened: this.toInt(row.opened),
      clicked: this.toInt(row.clicked),
      bounced: this.toInt(row.bounced),
      open_rate: this.toNum(row.open_rate),
      click_rate: this.toNum(row.click_rate),
    }
  }

  private projectAds(row: AdRow | null): MainDashboardAds {
    if (!row) return { ...EMPTY_ADS }
    return {
      total_ads: this.toInt(row.total_ads),
      ad_visitors: this.toInt(row.ad_visitors),
      ad_views: this.toInt(row.ad_views),
      ad_leads: this.toInt(row.ad_leads),
      conversion_rate: this.toNum(row.conversion_rate),
    }
  }

  private projectSocialByPlatform(
    responses: (SocialAnalyticsResponse | null)[],
  ): MainDashboardSocialPlatform[] {
    return responses.map((res, idx) => {
      const platform = SOCIAL_PLATFORMS[idx]!
      if (!res) {
        return {
          platform,
          connected: false,
          reach: 0,
          interactions: 0,
          engagement_rate: 0,
          follower_count: 0,
          post_count: 0,
        }
      }
      return {
        platform,
        connected: res.connected,
        reach: res.account?.reach ?? 0,
        interactions: res.account?.total_interactions ?? 0,
        engagement_rate: res.account?.engagement_rate ?? 0,
        follower_count: res.account?.follower_count ?? 0,
        post_count: res.post_count ?? 0,
      }
    })
  }

  private aggregateSocial(rows: MainDashboardSocialPlatform[]): MainDashboardSocial {
    let reach = 0
    let interactions = 0
    let posts = 0
    let weightedEngagementNumerator = 0
    let weightedEngagementDenominator = 0
    const connectedPlatforms: SocialAnalyticsPlatform[] = []

    for (const r of rows) {
      if (r.connected) connectedPlatforms.push(r.platform)
      reach += r.reach
      interactions += r.interactions
      posts += r.post_count
      if (r.reach > 0) {
        weightedEngagementNumerator += r.engagement_rate * r.reach
        weightedEngagementDenominator += r.reach
      }
    }

    const engagementRate =
      weightedEngagementDenominator > 0
        ? Number((weightedEngagementNumerator / weightedEngagementDenominator).toFixed(2))
        : 0

    return {
      reach,
      interactions,
      engagement_rate: engagementRate,
      post_count: posts,
      connected_platforms: connectedPlatforms,
      by_platform: rows,
    }
  }

  private buildTimeseries(input: {
    funnel: Array<{ date: string; visitors?: number; leads?: number }>
    email: Array<{ date: string; opens?: number; clicks?: number }>
    social: Array<{ date: string; reach?: number }>
  }): MainDashboardTimeseriesPoint[] {
    const byDate = new Map<string, MainDashboardTimeseriesPoint>()

    const upsert = (date: string, patch: Partial<Omit<MainDashboardTimeseriesPoint, 'date'>>) => {
      if (!date) return
      const key = String(date).slice(0, 10)
      const existing = byDate.get(key) ?? {
        date: key,
        visitors: 0,
        leads: 0,
        email_opens: 0,
        social_reach: 0,
      }
      byDate.set(key, {
        ...existing,
        ...{
          visitors: existing.visitors + (patch.visitors ?? 0),
          leads: existing.leads + (patch.leads ?? 0),
          email_opens: existing.email_opens + (patch.email_opens ?? 0),
          social_reach: existing.social_reach + (patch.social_reach ?? 0),
        },
      })
    }

    for (const p of input.funnel) {
      upsert(p.date, { visitors: this.toInt(p.visitors), leads: this.toInt(p.leads) })
    }
    for (const p of input.email) {
      upsert(p.date, { email_opens: this.toInt(p.opens) })
    }
    for (const p of input.social) {
      upsert(p.date, { social_reach: this.toInt(p.reach) })
    }

    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
  }

  private buildOverview(
    funnels: MainDashboardFunnels,
    emails: MainDashboardEmails,
    ads: MainDashboardAds,
    social: MainDashboardSocial,
  ): MainDashboardOverview {
    return {
      leads: funnels.leads,
      visitors: funnels.visitors,
      conversion_rate: funnels.conversion_rate,
      email_open_rate: emails.open_rate,
      email_click_rate: emails.click_rate,
      social_reach: social.reach,
      social_engagement_rate: social.engagement_rate,
      total_reach: funnels.visitors + ads.ad_visitors + social.reach,
    }
  }

  private buildFlow(
    funnels: MainDashboardFunnels,
    ads: MainDashboardAds,
    social: MainDashboardSocial,
  ): MainDashboardFlow {
    const impressions = ads.ad_views + social.reach
    const clicks = ads.ad_visitors
    const visitors = funnels.visitors
    const leads = funnels.leads
    const conversionToLead = visitors > 0 ? Number(((leads / visitors) * 100).toFixed(2)) : 0
    return {
      impressions,
      clicks,
      visitors,
      leads,
      conversion_to_lead_pct: conversionToLead,
    }
  }

  private buildAlerts(
    funnels: MainDashboardFunnels,
    emails: MainDashboardEmails,
    ads: MainDashboardAds,
    social: MainDashboardSocial,
  ): MainDashboardAlert[] {
    const alerts: MainDashboardAlert[] = []

    if (emails.sent > 0 && emails.open_rate > 0 && emails.open_rate < 10) {
      alerts.push({
        level: 'warning',
        source: 'email',
        message: `Email open rate is ${emails.open_rate}% — below the 20% industry baseline.`,
      })
    }

    if (emails.sent > 0 && emails.click_rate > 0 && emails.click_rate < 1) {
      alerts.push({
        level: 'warning',
        source: 'email',
        message: `Email click rate is ${emails.click_rate}% — below 1%.`,
      })
    }

    if (ads.ad_visitors > 200 && ads.ad_leads === 0) {
      alerts.push({
        level: 'critical',
        source: 'ads',
        message: `Ads drove ${ads.ad_visitors} visitors but generated 0 leads — check tracking or landing page.`,
      })
    }

    if (funnels.visitors > 100 && funnels.conversion_rate < 1) {
      alerts.push({
        level: 'warning',
        source: 'funnel',
        message: `Funnel conversion is ${funnels.conversion_rate}% with ${funnels.visitors} visitors — copy or CTA may need review.`,
      })
    }

    if (social.reach > 0 && social.engagement_rate > 0 && social.engagement_rate < 1) {
      alerts.push({
        level: 'info',
        source: 'social',
        message: `Social engagement is ${social.engagement_rate}% across ${social.reach.toLocaleString()} reach.`,
      })
    }

    if (funnels.leads === 0 && ads.ad_leads === 0 && emails.clicked === 0) {
      alerts.push({
        level: 'critical',
        source: 'cross',
        message:
          'No leads or email clicks in this period — campaign is not converting across any source.',
      })
    }

    return alerts
  }

  private toInt(val: unknown): number {
    if (typeof val === 'number') return Math.round(val)
    if (typeof val === 'string') {
      const n = Number(val)
      return Number.isFinite(n) ? Math.round(n) : 0
    }
    return 0
  }

  private toNum(val: unknown): number {
    if (typeof val === 'number') return val
    if (typeof val === 'string') {
      const n = Number(val)
      return Number.isFinite(n) ? n : 0
    }
    return 0
  }
}
