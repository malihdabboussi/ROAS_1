import type { SupabaseClient } from '@supabase/supabase-js'
import type { IntegrationContext, SocialAnalyticsAccountMetrics, SocialAnalyticsChartPoint, SocialPostRow } from './social-insights.shared'
import { SocialInsightsConnectionBase } from './social-insights-connection.base'
import { EMPTY_ACCOUNT_METRICS, IG_POST_METRIC_PRESET_BY_TYPE, IG_USER_TIME_SERIES_METRICS, IG_USER_TOTAL_VALUE_METRICS } from './social-insights.shared'

export class SocialInsightsInstagramBase extends SocialInsightsConnectionBase {


  // ─── Instagram fetchers ────────────────────────────────────────────────────

  protected async fetchInstagramAccount(
    integration: IntegrationContext,
    since: string | undefined,
    until: string | undefined,
  ): Promise<{ account: SocialAnalyticsAccountMetrics; chart: SocialAnalyticsChartPoint[] }> {
    const nowSec = Math.floor(Date.now() / 1000)
    // IG `day` period is capped at ~30 days per call. For "all time" we send the
    // widest safe window; for a specific range we use the caller's bounds.
    const sinceSec = since ? Math.floor(Date.parse(since) / 1000) : nowSec - 30 * 24 * 60 * 60
    const untilSec = until ? Math.floor(Date.parse(until) / 1000) : nowSec
    const sinceIso = new Date(sinceSec * 1000).toISOString().slice(0, 10)
    const untilIso = new Date(untilSec * 1000).toISOString().slice(0, 10)

    const rangeArgs = {
      period: 'day' as const,
      // Runtime evidence: Composio interprets date strings correctly for full window,
      // while unix seconds were truncating to only ~2 points in this environment.
      since: sinceIso,
      until: untilIso,
    }

    const timeSeriesRes = (await this.composio.executeTool(
      'INSTAGRAM_GET_USER_INSIGHTS',
      integration.composioUserId,
      { metric: [...IG_USER_TIME_SERIES_METRICS], ...rangeArgs },
      integration.connectedAccountId ?? undefined,
    )) as Record<string, unknown> | null

    let interactionRes: Record<string, unknown> | null = null
    try {
      interactionRes = (await this.composio.executeTool(
        'INSTAGRAM_GET_USER_INSIGHTS',
        integration.composioUserId,
        {
          metric: [...IG_USER_TOTAL_VALUE_METRICS],
          metric_type: 'total_value',
          ...rangeArgs,
        },
        integration.connectedAccountId ?? undefined,
      )) as Record<string, unknown> | null
    } catch (err) {
      this.logger.warn(
        `[social-insights] IG total_value insights failed: ${err instanceof Error ? err.message : 'unknown'}`,
      )
    }

    const account = this.parseIgUserInsights(timeSeriesRes)
    this.mergeIgInteractionInsights(account, this.parseIgUserInsights(interactionRes))
    const chart = this.buildIgChartData(timeSeriesRes)

    // IG frequently omits `follower_count` from insights (small accounts, no data
    // window, etc.). Fall back to INSTAGRAM_GET_USER_INFO which always returns it.
    if (account.follower_count === 0) {
      try {
        const info = (await this.composio.executeTool(
          'INSTAGRAM_GET_USER_INFO',
          integration.composioUserId,
          {},
          integration.connectedAccountId ?? undefined,
        )) as Record<string, unknown> | null
        const followers = this.extractIgFollowerCountFromUserInfo(info)
        if (followers > 0) account.follower_count = followers
      } catch (err) {
        this.logger.warn(
          `[social-insights] INSTAGRAM_GET_USER_INFO fallback failed: ${err instanceof Error ? err.message : 'unknown'}`,
        )
      }
    }

    return { account, chart }
  }


  protected extractIgFollowerCountFromUserInfo(res: Record<string, unknown> | null): number {
    if (!res || typeof res !== 'object') return 0
    // Composio wraps the Instagram Graph API response in { data: { response_dict: { ... } } }
    // or { data: { ... } }. Walk defensively.
    const data = (res as Record<string, unknown>).data
    const nodes: Array<Record<string, unknown>> = []
    if (data && typeof data === 'object') nodes.push(data as Record<string, unknown>)
    const responseDict =
      data && typeof data === 'object' ? (data as Record<string, unknown>).response_dict : undefined
    if (responseDict && typeof responseDict === 'object')
      nodes.push(responseDict as Record<string, unknown>)

    for (const node of nodes) {
      const candidates = [node.followers_count, node.follower_count, node.followersCount]
      for (const c of candidates) {
        if (typeof c === 'number') return c
        if (typeof c === 'string') {
          const n = Number(c)
          if (Number.isFinite(n)) return n
        }
      }
    }
    return 0
  }


  protected mergeIgInteractionInsights(
    target: SocialAnalyticsAccountMetrics,
    overlay: SocialAnalyticsAccountMetrics,
  ): void {
    const pick = (base: number, over: number) => (over > 0 ? over : base)
    target.accounts_engaged = pick(target.accounts_engaged, overlay.accounts_engaged)
    target.total_interactions = pick(target.total_interactions, overlay.total_interactions)
    target.likes = pick(target.likes, overlay.likes)
    target.comments = pick(target.comments, overlay.comments)
    target.shares = pick(target.shares, overlay.shares)
    target.saves = pick(target.saves, overlay.saves)
    target.replies = pick(target.replies, overlay.replies)

    const interactionSum =
      target.likes + target.comments + target.shares + target.saves + target.replies
    if (target.total_interactions === 0 && interactionSum > 0) {
      target.total_interactions = interactionSum
    }

    if (target.reach > 0) {
      target.engagement_rate = Number(((target.total_interactions / target.reach) * 100).toFixed(2))
    }
  }


  protected extractIgMetricValue(row: Record<string, unknown>, metricName: string): number | null {
    const preferTotalValue = (IG_USER_TOTAL_VALUE_METRICS as readonly string[]).includes(metricName)
    if (preferTotalValue) {
      return this.extractTotalValue(row) ?? this.sumTimeSeriesValues(row)
    }
    return this.sumTimeSeriesValues(row) ?? this.extractTotalValue(row)
  }


  protected parseIgUserInsights(res: Record<string, unknown> | null): SocialAnalyticsAccountMetrics {
    const metrics: SocialAnalyticsAccountMetrics = { ...EMPTY_ACCOUNT_METRICS }
    const rows = this.extractIgInsightRows(res)

    for (const row of rows) {
      const name = String(row.name ?? '').trim()
      if (!name) continue
      const value = this.extractIgMetricValue(row, name)
      if (value === null) continue

      switch (name) {
        case 'reach':
          metrics.reach = value
          break
        case 'accounts_engaged':
          metrics.accounts_engaged = value
          break
        case 'total_interactions':
        case 'engagement':
          metrics.total_interactions = value
          break
        case 'likes':
          metrics.likes = value
          break
        case 'comments':
          metrics.comments = value
          break
        case 'shares':
          metrics.shares = value
          break
        case 'saves':
          metrics.saves = value
          break
        case 'replies':
          metrics.replies = value
          break
        case 'profile_links_taps':
          metrics.profile_links_taps = value
          break
        case 'views':
          metrics.views = value
          break
      }
    }

    const interactionSum =
      metrics.likes + metrics.comments + metrics.shares + metrics.saves + metrics.replies
    if (metrics.total_interactions === 0 && interactionSum > 0) {
      metrics.total_interactions = interactionSum
    }

    if (metrics.reach > 0) {
      metrics.engagement_rate = Number(
        ((metrics.total_interactions / metrics.reach) * 100).toFixed(2),
      )
    }

    return metrics
  }


  protected sumTimeSeriesValues(row: Record<string, unknown>): number | null {
    const values = row.values
    if (!Array.isArray(values) || values.length === 0) return null
    let sum = 0
    for (const item of values) {
      const v = (item as Record<string, unknown>)?.value
      const n = typeof v === 'number' ? v : Number(v ?? 0)
      if (Number.isFinite(n)) sum += n
    }
    return sum
  }


  protected buildIgChartData(res: Record<string, unknown> | null): SocialAnalyticsChartPoint[] {
    const rows = this.extractIgInsightRows(res)
    const reachRow = rows.find((r) => String(r.name ?? '') === 'reach')
    if (!reachRow) return []
    const values = Array.isArray(reachRow.values)
      ? (reachRow.values as Array<Record<string, unknown>>)
      : []
    return values
      .map((v) => {
        const endTime = v.end_time
        const val = v.value
        const date = typeof endTime === 'string' ? endTime.slice(0, 10) : ''
        const num = typeof val === 'number' ? val : Number(val ?? 0)
        return { date, reach: num, impressions: 0, engagement: 0 }
      })
      .filter((p) => p.date)
  }


  protected extractIgInsightRows(
    res: Record<string, unknown> | null,
  ): Array<Record<string, unknown>> {
    if (!res || typeof res !== 'object') return []
    const data = (res as Record<string, unknown>).data
    const payload = data && typeof data === 'object' ? (data as Record<string, unknown>) : res
    const container = payload.data ?? payload.response_dict ?? payload.insights
    if (Array.isArray(container)) return container as Array<Record<string, unknown>>
    if (container && typeof container === 'object') {
      const inner = (container as Record<string, unknown>).data
      if (Array.isArray(inner)) return inner as Array<Record<string, unknown>>
    }
    return []
  }


  protected extractTotalValue(row: Record<string, unknown>): number | null {
    const totalValue = row.total_value
    if (totalValue && typeof totalValue === 'object') {
      const tv = (totalValue as Record<string, unknown>).value
      if (typeof tv === 'number') return tv
      if (typeof tv === 'string') {
        const n = Number(tv)
        return Number.isFinite(n) ? n : null
      }
    }
    const values = row.values
    if (Array.isArray(values) && values.length > 0) {
      return values.reduce((sum, item) => {
        const v = (item as Record<string, unknown>)?.value
        const n = typeof v === 'number' ? v : Number(v ?? 0)
        return sum + (Number.isFinite(n) ? n : 0)
      }, 0)
    }
    return null
  }


  protected extractBreakdownValue(
    row: Record<string, unknown>,
    breakdown: string,
    dimensionKey: string,
  ): number | null {
    const totalValue = row.total_value
    if (!totalValue || typeof totalValue !== 'object') return null
    const breakdowns = (totalValue as Record<string, unknown>).breakdowns
    if (!Array.isArray(breakdowns)) return null
    for (const b of breakdowns as Array<Record<string, unknown>>) {
      if (String(b.dimension_keys?.[0 as number] ?? '') !== breakdown) continue
      const results = b.results
      if (!Array.isArray(results)) continue
      for (const r of results as Array<Record<string, unknown>>) {
        const keys = r.dimension_values
        if (Array.isArray(keys) && keys.includes(dimensionKey)) {
          const v = r.value
          const n = typeof v === 'number' ? v : Number(v ?? 0)
          return Number.isFinite(n) ? n : null
        }
      }
    }
    return null
  }


  protected flattenIgPostMetrics(res: Record<string, unknown> | null): Record<string, unknown> {
    const rows = this.extractIgInsightRows(res)
    const out: Record<string, unknown> = {}
    for (const row of rows) {
      const name = String(row.name ?? '').trim()
      if (!name) continue
      const v = this.extractTotalValue(row) ?? this.sumTimeSeriesValues(row)
      if (v !== null) out[name] = v
    }
    return out
  }
}
