import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactsAdCampaignsBase } from './artifacts-ad-campaigns.base'

export class ArtifactsAdSetsBase extends ArtifactsAdCampaignsBase {
  // ─── Ad Sets ───

  async getAdSet(supabase: SupabaseClient, id: string) {
    const data = await this.artifactAdsRepo.getAdSet(supabase, id)
    if (!data) throw new NotFoundException('Ad set not found')
    return data
  }

  async createAdSet(
    supabase: SupabaseClient,
    userId: string,
    adCampaignId: string,
    name: string,
    orgId?: string | null,
    spaceId?: string | null,
  ): Promise<Record<string, unknown>> {
    const adCampaign = await this.getAdCampaign(supabase, adCampaignId)
    const resolvedSpaceId =
      spaceId ?? ((adCampaign as Record<string, unknown>).space_id as string | null) ?? null
    const created = await this.artifactAdsRepo.createAdSet(supabase, {
      user_id: userId,
      ad_campaign_id: adCampaignId,
      campaign_id: (adCampaign as Record<string, unknown>).campaign_id ?? null,
      name,
      org_id: orgId ?? null,
      space_id: resolvedSpaceId,
    })
    const id = String((created as Record<string, unknown>).id ?? '')
    if (id) {
      await this.indexCampaignAdAsset(supabase, 'ad_set', id, userId, orgId, resolvedSpaceId)
    }
    return created
  }

  async updateAdSet(
    supabase: SupabaseClient,
    id: string,
    data: {
      name?: string
      status?: string
      daily_budget?: number | null
      lifetime_budget?: number | null
      start_time?: string | null
      end_time?: string | null
      optimization_goal?: string
      billing_event?: string
      targeting?: Record<string, unknown>
      metadata?: Record<string, unknown>
    },
  ): Promise<Record<string, unknown>> {
    const existing = await this.getAdSet(supabase, id)
    const allowedKeys = [
      'name',
      'status',
      'daily_budget',
      'lifetime_budget',
      'start_time',
      'end_time',
      'optimization_goal',
      'billing_event',
      'targeting',
      'metadata',
    ] as const
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowedKeys) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        updates[key] = data[key as keyof typeof data]
      }
    }
    const updated = await this.artifactAdsRepo.updateAdSet(supabase, id, updates)
    await this.indexCampaignAdAsset(
      supabase,
      'ad_set',
      id,
      String((existing as Record<string, unknown>).user_id ?? ''),
      ((existing as Record<string, unknown>).org_id as string | null | undefined) ?? null,
      ((existing as Record<string, unknown>).space_id as string | null | undefined) ?? null,
    )
    return updated
  }

  async deleteAdSet(
    supabase: SupabaseClient,
    userId: string,
    id: string,
    deleteMode: 'keep_ads' | 'delete_all' = 'keep_ads',
  ): Promise<void> {
    await this.getAdSet(supabase, id)
    const status = await this.refreshAdSetMetaStatus(supabase, userId, id)
    this.assertDeletableMetaStatus(
      status as Record<string, unknown>,
      'ad_set_effective_status',
      'Ad set is live on Meta. Pause it before deleting.',
    )
    if (deleteMode === 'delete_all') {
      const adIds = await this.artifactAdsRepo.listAdIdsByAdSet(supabase, id, userId)
      if (adIds.length > 0) {
        await this.artifactAdsRepo.deleteAdsByIds(supabase, adIds, 'Failed to delete ad set ads')
        for (const adId of adIds) {
          await this.deleteCampaignAdAsset(supabase, 'ad', adId)
        }
      }
    } else {
      await this.artifactAdsRepo.ungroupAdsByAdSet(supabase, id, userId)
    }
    await this.artifactAdsRepo.deleteAdSet(supabase, id)
    await this.deleteCampaignAdAsset(supabase, 'ad_set', id)
  }

  async duplicateAdSet(
    supabase: SupabaseClient,
    userId: string,
    id: string,
    orgId?: string | null,
  ) {
    const adSet = await this.getAdSet(supabase, id)
    const campaignId = adSet.ad_campaign_id
    if (campaignId == null || campaignId === '') {
      throw new BadRequestException(
        'Ad set must belong to an ad campaign. Duplicate keeps the copy in the same campaign.',
      )
    }
    const adSetMetaStatus = await this.refreshAdSetMetaStatus(supabase, userId, id)
    const shouldDraftAdSet =
      (adSetMetaStatus as Record<string, unknown>).ad_set_effective_status === 'ACTIVE' ||
      (adSet.status as string | undefined) === 'active'

    const duplicatedAdSet = await this.duplicateAdSetRecord(
      supabase,
      adSet as Record<string, unknown>,
      String(campaignId),
      shouldDraftAdSet,
    )

    const childAds = await this.artifactAdsRepo.listAdsForDuplication(supabase, id, userId)

    let duplicatedAdCount = 0
    for (const ad of childAds ?? []) {
      await this.duplicateAdRecord(
        supabase,
        ad as Record<string, unknown>,
        String(duplicatedAdSet.id),
        shouldDraftAdSet,
      )
      duplicatedAdCount += 1
    }

    return { ...duplicatedAdSet, source_id: id, duplicated_ads: duplicatedAdCount }
  }

  protected assertDeletableMetaStatus(
    statusPayload: Record<string, unknown>,
    statusKey: 'ad_effective_status' | 'ad_set_effective_status' | 'ad_campaign_effective_status',
    blockedMessage: string,
  ) {
    if (statusPayload.not_published) return
    if (statusPayload[statusKey] === 'ACTIVE') {
      throw new BadRequestException(blockedMessage)
    }
  }

  protected duplicateLabel(value: string | null | undefined): string {
    const base = (value ?? '').trim() || 'Untitled'
    return `${base} (Copy)`
  }

  protected sanitizeMetaMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(metadata)) {
      if (key.startsWith('meta_')) continue
      out[key] = value
    }
    return out
  }

  protected async duplicateAdSetRecord(
    supabase: SupabaseClient,
    source: Record<string, unknown>,
    targetAdCampaignId: string,
    forceDraft: boolean,
  ) {
    const isActive =
      forceDraft || source.status === 'active' || source.meta_effective_status === 'ACTIVE'
    const payload = {
      user_id: source.user_id,
      ad_campaign_id: targetAdCampaignId,
      name: this.duplicateLabel(source.name as string | null | undefined),
      status: isActive ? 'draft' : ((source.status as string | undefined) ?? 'draft'),
      daily_budget: source.daily_budget ?? null,
      lifetime_budget: source.lifetime_budget ?? null,
      start_time: source.start_time ?? null,
      end_time: source.end_time ?? null,
      optimization_goal: source.optimization_goal,
      billing_event: source.billing_event,
      targeting: (source.targeting as Record<string, unknown> | null) ?? {},
      meta_adset_id: null,
      meta_effective_status: null,
      metadata: this.sanitizeMetaMetadata(
        (source.metadata as Record<string, unknown> | null) ?? {},
      ),
      org_id: source.org_id ?? null,
      space_id: source.space_id ?? null,
    }
    return this.artifactAdsRepo.insertAdSet(supabase, payload)
  }

  protected async duplicateAdRecord(
    supabase: SupabaseClient,
    source: Record<string, unknown>,
    targetAdSetId: string | null,
    _forceDraft: boolean,
  ) {
    const payload = {
      user_id: source.user_id,
      campaign_id: source.campaign_id ?? null,
      ad_set_id: targetAdSetId,
      theme_id: source.theme_id ?? null,
      platform: source.platform,
      placement: source.placement,
      primary_text: source.primary_text,
      headline: (source.headline as string | null | undefined)?.trim() || 'Untitled',
      description: source.description ?? null,
      cta_type: source.cta_type ?? null,
      cta_text: source.cta_text ?? null,
      destination_url: source.destination_url,
      display_link: source.display_link ?? null,
      image_url: source.image_url ?? null,
      image_asset_id: source.image_asset_id ?? null,
      generated_tsx: source.generated_tsx ?? null,
      tracking_url: source.tracking_url ?? null,
      meta_ad_id: null,
      meta_effective_status: null,
      metadata: this.sanitizeMetaMetadata(
        (source.metadata as Record<string, unknown> | null) ?? {},
      ),
      org_id: source.org_id ?? null,
      space_id: source.space_id ?? null,
    }
    return this.artifactAdsRepo.insertAd(supabase, payload)
  }
}
