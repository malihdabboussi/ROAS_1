import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactsAdsBase } from './artifacts-ads.base'

export class ArtifactsAdCampaignsBase extends ArtifactsAdsBase {
  // ─── Ad Campaigns ───

  async listAdsByAdCampaign(supabase: SupabaseClient, adCampaignId: string) {
    return this.artifactAdsRepo.listAdsByAdCampaign(supabase, adCampaignId)
  }

  async listAdsByAdSet(supabase: SupabaseClient, adSetId: string) {
    return this.artifactAdsRepo.listAdsByAdSet(supabase, adSetId)
  }

  async listAdCampaigns(
    supabase: SupabaseClient,
    campaignId: string,
    spaceId?: string,
    options?: { summary?: boolean },
  ) {
    return this.artifactAdsRepo.listAdCampaigns(supabase, campaignId, spaceId, options)
  }

  async getAdCampaign(supabase: SupabaseClient, id: string) {
    const data = await this.artifactAdsRepo.getAdCampaign(supabase, id)
    if (!data) throw new NotFoundException('Ad campaign not found')
    return data
  }

  async createAdCampaign(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    name: string,
    orgId?: string | null,
    spaceId?: string | null,
  ): Promise<Record<string, unknown>> {
    return this.artifactAdsRepo.createAdCampaign(supabase, {
      user_id: userId,
      campaign_id: campaignId,
      name,
      org_id: orgId ?? null,
      space_id: spaceId ?? null,
    })
  }

  async updateAdCampaign(
    supabase: SupabaseClient,
    id: string,
    data: {
      name?: string
      objective?: string
      status?: string
      budget_type?: string
      daily_budget?: number | null
      lifetime_budget?: number | null
      bid_strategy?: string
      special_ad_categories?: string[]
      meta_ad_account_id?: string | null
      meta_page_id?: string | null
      schedule_type?: string
      start_time?: string | null
      end_time?: string | null
      metadata?: Record<string, unknown>
    },
  ): Promise<Record<string, unknown>> {
    await this.getAdCampaign(supabase, id)
    const allowedKeys = [
      'name',
      'objective',
      'status',
      'budget_type',
      'daily_budget',
      'lifetime_budget',
      'bid_strategy',
      'special_ad_categories',
      'meta_ad_account_id',
      'meta_page_id',
      'schedule_type',
      'start_time',
      'end_time',
      'metadata',
    ] as const
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowedKeys) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        updates[key] = data[key as keyof typeof data]
      }
    }
    return this.artifactAdsRepo.updateAdCampaign(supabase, id, updates)
  }

  async deleteAdCampaign(
    supabase: SupabaseClient,
    userId: string,
    id: string,
    deleteMode: 'keep_ads' | 'delete_all' = 'keep_ads',
  ): Promise<void> {
    const adCampaign = await this.getAdCampaign(supabase, id)
    const status = await this.refreshAdCampaignMetaStatus(supabase, userId, id)
    ;(this as any).assertDeletableMetaStatus(
      status as Record<string, unknown>,
      'ad_campaign_effective_status',
      'Ad campaign is live on Meta. Pause it before deleting.',
    )
    if (deleteMode === 'delete_all') {
      const adIds: string[] = []
      for (const adSet of (adCampaign as Record<string, unknown[]>).ad_sets ?? []) {
        for (const ad of (adSet as Record<string, unknown[]>).ads ?? []) {
          adIds.push((ad as Record<string, string>).id)
        }
      }
      if (adIds.length > 0) {
        await this.artifactAdsRepo.deleteAdsByIds(supabase, adIds, 'Failed to delete campaign ads')
      }
    }
    await this.artifactAdsRepo.deleteAdCampaign(supabase, id)
  }

  async deleteUngroupedAds(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    orgId?: string | null,
  ): Promise<{ deleted: number }> {
    const ids = await this.artifactAdsRepo.listUngroupedAdIds(supabase, userId, campaignId)
    if (ids.length === 0) return { deleted: 0 }
    await this.artifactAdsRepo.deleteAdsByIds(supabase, ids, 'Failed to delete ungrouped ads')
    return { deleted: ids.length }
  }

  async duplicateAdCampaign(
    supabase: SupabaseClient,
    userId: string,
    id: string,
    orgId?: string | null,
  ) {
    const adCampaign = await this.getAdCampaign(supabase, id)
    const campaignMetaStatus = await this.refreshAdCampaignMetaStatus(supabase, userId, id)
    const shouldDraftCampaign =
      (campaignMetaStatus as Record<string, unknown>).ad_campaign_effective_status === 'ACTIVE' ||
      (adCampaign.status as string | undefined) === 'active'

    const campaignInsert = {
      user_id: adCampaign.user_id,
      campaign_id: adCampaign.campaign_id,
      name: (this as any).duplicateLabel(adCampaign.name as string | null | undefined),
      objective: adCampaign.objective,
      status: shouldDraftCampaign ? 'draft' : (adCampaign.status ?? 'draft'),
      budget_type: adCampaign.budget_type,
      daily_budget: adCampaign.daily_budget,
      lifetime_budget: adCampaign.lifetime_budget,
      bid_strategy: adCampaign.bid_strategy,
      special_ad_categories: adCampaign.special_ad_categories ?? [],
      schedule_type: adCampaign.schedule_type ?? 'continuous',
      start_time: adCampaign.start_time ?? null,
      end_time: adCampaign.end_time ?? null,
      meta_campaign_id: null,
      meta_effective_status: null,
      metadata: (this as any).sanitizeMetaMetadata(
        (adCampaign.metadata as Record<string, unknown> | null) ?? {},
      ),
      org_id: (adCampaign as Record<string, unknown>).org_id ?? null,
      space_id: (adCampaign as Record<string, unknown>).space_id ?? null,
    }

    const duplicatedCampaign = await this.artifactAdsRepo.createAdCampaign(
      supabase,
      campaignInsert,
      'Failed to duplicate ad campaign',
    )
    const childAdSets = await this.artifactAdsRepo.listAdSetsForDuplication(supabase, id, userId)

    let duplicatedAdSetCount = 0
    let duplicatedAdCount = 0
    for (const adSet of childAdSets ?? []) {
      const duplicatedAdSet = await (this as any).duplicateAdSetRecord(
        supabase,
        adSet as Record<string, unknown>,
        String(duplicatedCampaign.id),
        shouldDraftCampaign,
      )
      duplicatedAdSetCount += 1

      const childAds = await this.artifactAdsRepo.listAdsForDuplication(
        supabase,
        String(adSet.id),
        userId,
      )

      for (const ad of childAds ?? []) {
        await (this as any).duplicateAdRecord(
          supabase,
          ad as Record<string, unknown>,
          String(duplicatedAdSet.id),
          shouldDraftCampaign,
        )
        duplicatedAdCount += 1
      }
    }

    return {
      ...duplicatedCampaign,
      source_id: id,
      duplicated_ad_sets: duplicatedAdSetCount,
      duplicated_ads: duplicatedAdCount,
    }
  }
}
