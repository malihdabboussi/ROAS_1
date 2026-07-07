import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MetaIntegration } from '../../integrations/meta.integration'
import { MetaInsightsRepository } from '../../repositories/meta-insights.repository'
import { MetaOAuthService } from '../meta-oauth.service'
import type { InsightsLevel, MetaInsightsRow, MetaInsightsSummary } from './meta-api.types'

@Injectable()
export class MetaInsightsService {
  constructor(
    private readonly meta: MetaIntegration,
    private readonly oauth: MetaOAuthService,
    private readonly repository: MetaInsightsRepository,
  ) {}

  async getInsights(
    supabase: SupabaseClient,
    userId: string,
    input: {
      campaignId: string
      level: InsightsLevel
      adCampaignId?: string
      adSetId?: string
      startDate?: string
      endDate?: string
    },
  ): Promise<{ level: InsightsLevel; summary: MetaInsightsSummary; rows: MetaInsightsRow[] }> {
    const accessToken = await this.oauth.getAccessToken(supabase, userId)
    const timeRange =
      input.startDate && input.endDate
        ? { since: input.startDate, until: input.endDate }
        : input.startDate
          ? { since: input.startDate, until: new Date().toISOString().slice(0, 10) }
          : undefined

    const fields = [
      'spend',
      'impressions',
      'reach',
      'clicks',
      'ctr',
      'cpc',
      'cpm',
      'actions',
      'action_values',
      'cost_per_action_type',
      'date_start',
      'date_stop',
    ]

    if (input.level === 'campaign') {
      const campaigns = await this.repository.listCampaignRows(supabase, userId, input.campaignId)
      const rows = await Promise.all(
        (campaigns ?? []).map(async (row) => {
          const metaId = (row.meta_campaign_id as string | null) ?? null
          const insights = metaId
            ? await this.meta.getObjectInsights(accessToken, metaId, fields, timeRange)
            : null
          const spend = this.toNumber(insights?.spend)
          const impressions = this.toInt(insights?.impressions)
          const reach = this.toInt(insights?.reach)
          const clicks = this.toInt(insights?.clicks)
          const leads = this.getActionValue(insights?.actions, [
            'lead',
            'onsite_conversion.lead_grouped',
            'offsite_conversion.fb_pixel_lead',
          ])
          const conversions = this.getActionValue(insights?.actions, [
            'purchase',
            'offsite_conversion.fb_pixel_purchase',
          ])
          const revenue = this.getActionValue(insights?.action_values, [
            'purchase',
            'offsite_conversion.fb_pixel_purchase',
          ])
          const ctr = this.toNumber(insights?.ctr)
          const cpc = this.toNumber(insights?.cpc)
          const cpm = this.toNumber(insights?.cpm)
          const costPerResult = this.getActionMetric(insights?.cost_per_action_type, [
            'lead',
            'onsite_conversion.lead_grouped',
            'offsite_conversion.fb_pixel_lead',
          ])
          const roas = spend > 0 ? revenue / spend : 0
          const metadata = (row.metadata as Record<string, unknown> | null) ?? {}
          return {
            id: String(row.id),
            name: String(row.name ?? 'Untitled Campaign'),
            level: 'campaign' as const,
            meta_id: metaId,
            meta_effective_status: (row.meta_effective_status as string | null) ?? null,
            ad_account_id: (metadata.meta_ad_account_id as string | undefined) ?? null,
            spend,
            impressions,
            reach,
            clicks,
            ctr,
            cpc,
            cpm,
            leads,
            conversions,
            revenue,
            roas,
            cost_per_result: costPerResult,
            daily_budget: this.toNullableInt(row.daily_budget),
            lifetime_budget: this.toNullableInt(row.lifetime_budget),
          }
        }),
      )
      return { level: 'campaign', rows, summary: this.summarize(rows) }
    }

    if (input.level === 'adset') {
      if (!input.adCampaignId)
        throw new BadRequestException('adCampaignId is required for adset level')
      const adSets = await this.repository.listAdSetRows(supabase, userId, input.adCampaignId)
      const leadsMap = await this.repository.countLeadsBy(
        supabase,
        'ad_set_id',
        (adSets ?? []).map((s) => String(s.id)),
        input.startDate,
        input.endDate,
      )
      const rows = await Promise.all(
        (adSets ?? []).map(async (row) => {
          const metaId = (row.meta_adset_id as string | null) ?? null
          const insights = metaId
            ? await this.meta.getObjectInsights(accessToken, metaId, fields, timeRange)
            : null
          const spend = this.toNumber(insights?.spend)
          const impressions = this.toInt(insights?.impressions)
          const reach = this.toInt(insights?.reach)
          const clicks = this.toInt(insights?.clicks)
          const conversions = this.getActionValue(insights?.actions, [
            'purchase',
            'offsite_conversion.fb_pixel_purchase',
          ])
          const revenue = this.getActionValue(insights?.action_values, [
            'purchase',
            'offsite_conversion.fb_pixel_purchase',
          ])
          const ctr = this.toNumber(insights?.ctr)
          const cpc = this.toNumber(insights?.cpc)
          const cpm = this.toNumber(insights?.cpm)
          const leads =
            leadsMap.get(String(row.id)) ??
            this.getActionValue(insights?.actions, [
              'lead',
              'onsite_conversion.lead_grouped',
              'offsite_conversion.fb_pixel_lead',
            ])
          const costPerResult = leads > 0 ? spend / leads : 0
          const roas = spend > 0 ? revenue / spend : 0
          const metadata = (row.metadata as Record<string, unknown> | null) ?? {}
          return {
            id: String(row.id),
            parent_id: String(row.ad_campaign_id),
            name: String(row.name ?? 'Untitled Ad Set'),
            level: 'adset' as const,
            meta_id: metaId,
            meta_effective_status: (row.meta_effective_status as string | null) ?? null,
            ad_account_id: (metadata.meta_ad_account_id as string | undefined) ?? null,
            spend,
            impressions,
            reach,
            clicks,
            ctr,
            cpc,
            cpm,
            leads,
            conversions,
            revenue,
            roas,
            cost_per_result: costPerResult,
            daily_budget: this.toNullableInt(row.daily_budget),
            lifetime_budget: this.toNullableInt(row.lifetime_budget),
          }
        }),
      )
      return { level: 'adset', rows, summary: this.summarize(rows) }
    }

    if (!input.adSetId) throw new BadRequestException('adSetId is required for ad level')
    const ads = await this.repository.listAdRows(supabase, userId, input.adSetId)
    const leadsMap = await this.repository.countLeadsBy(
      supabase,
      'ad_id',
      (ads ?? []).map((a) => String(a.id)),
      input.startDate,
      input.endDate,
    )
    const rows = await Promise.all(
      (ads ?? []).map(async (row) => {
        const metaId = (row.meta_ad_id as string | null) ?? null
        const insights = metaId
          ? await this.meta.getObjectInsights(accessToken, metaId, fields, timeRange)
          : null
        const spend = this.toNumber(insights?.spend)
        const impressions = this.toInt(insights?.impressions)
        const reach = this.toInt(insights?.reach)
        const clicks = this.toInt(insights?.clicks)
        const conversions = this.getActionValue(insights?.actions, [
          'purchase',
          'offsite_conversion.fb_pixel_purchase',
        ])
        const revenue = this.getActionValue(insights?.action_values, [
          'purchase',
          'offsite_conversion.fb_pixel_purchase',
        ])
        const ctr = this.toNumber(insights?.ctr)
        const cpc = this.toNumber(insights?.cpc)
        const cpm = this.toNumber(insights?.cpm)
        const leads =
          leadsMap.get(String(row.id)) ??
          this.getActionValue(insights?.actions, [
            'lead',
            'onsite_conversion.lead_grouped',
            'offsite_conversion.fb_pixel_lead',
          ])
        const costPerResult = leads > 0 ? spend / leads : 0
        const roas = spend > 0 ? revenue / spend : 0
        const metadata = (row.metadata as Record<string, unknown> | null) ?? {}
        return {
          id: String(row.id),
          parent_id: String(row.ad_set_id),
          name: String(row.headline ?? 'Untitled Ad'),
          level: 'ad' as const,
          meta_id: metaId,
          meta_effective_status: (row.meta_effective_status as string | null) ?? null,
          ad_account_id: (metadata.meta_ad_account_id as string | undefined) ?? null,
          spend,
          impressions,
          reach,
          clicks,
          ctr,
          cpc,
          cpm,
          leads,
          conversions,
          revenue,
          roas,
          cost_per_result: costPerResult,
          daily_budget: null,
          lifetime_budget: null,
        }
      }),
    )
    return { level: 'ad', rows, summary: this.summarize(rows) }
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  private toInt(value: unknown): number {
    return Math.round(this.toNumber(value))
  }

  private toNullableInt(value: unknown): number | null {
    if (value === null || value === undefined) return null
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return null
    return Math.round(parsed)
  }

  private getActionValue(list: unknown, actionTypes: string[]): number {
    if (!Array.isArray(list)) return 0
    let total = 0
    for (const item of list) {
      const row = item as { action_type?: unknown; value?: unknown }
      if (typeof row.action_type !== 'string') continue
      if (!actionTypes.includes(row.action_type)) continue
      total += this.toNumber(row.value)
    }
    return total
  }

  private getActionMetric(list: unknown, actionTypes: string[]): number {
    if (!Array.isArray(list)) return 0
    for (const item of list) {
      const row = item as { action_type?: unknown; value?: unknown }
      if (typeof row.action_type !== 'string') continue
      if (!actionTypes.includes(row.action_type)) continue
      return this.toNumber(row.value)
    }
    return 0
  }

  private summarize(rows: MetaInsightsRow[]): MetaInsightsSummary {
    const spend = rows.reduce((sum, row) => sum + row.spend, 0)
    const impressions = rows.reduce((sum, row) => sum + row.impressions, 0)
    const reach = rows.reduce((sum, row) => sum + row.reach, 0)
    const clicks = rows.reduce((sum, row) => sum + row.clicks, 0)
    const leads = rows.reduce((sum, row) => sum + row.leads, 0)
    const conversions = rows.reduce((sum, row) => sum + row.conversions, 0)
    const revenue = rows.reduce((sum, row) => sum + row.revenue, 0)
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const cpc = clicks > 0 ? spend / clicks : 0
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0
    const roas = spend > 0 ? revenue / spend : 0
    const costPerResult = leads > 0 ? spend / leads : 0
    return {
      spend,
      impressions,
      reach,
      clicks,
      leads,
      conversions,
      revenue,
      ctr,
      cpc,
      cpm,
      roas,
      cost_per_result: costPerResult,
    }
  }
}
