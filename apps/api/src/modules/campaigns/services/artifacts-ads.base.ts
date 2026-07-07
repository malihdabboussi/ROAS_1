import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactsPresentationPublishBase } from './artifacts-presentation-publish.base'

export class ArtifactsAdsBase extends ArtifactsPresentationPublishBase {
  // ─── Avatars ───

  async listAvatars(supabase: SupabaseClient, campaignId: string, spaceId?: string) {
    return this.artifactAdsRepo.listAvatars(supabase, campaignId, spaceId)
  }

  async getAvatarById(supabase: SupabaseClient, id: string) {
    const data = await this.artifactAdsRepo.getAvatar(supabase, id)
    if (!data) throw new NotFoundException('Avatar not found')
    return data
  }

  async updateAvatar(
    supabase: SupabaseClient,
    id: string,
    patch: { name?: string; persona_data?: Record<string, unknown> },
  ) {
    await this.getAvatarById(supabase, id)
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (patch.name !== undefined) row.name = patch.name
    if (patch.persona_data !== undefined) row.persona_data = patch.persona_data
    return this.artifactAdsRepo.updateAvatar(supabase, id, row)
  }

  async deleteAvatar(supabase: SupabaseClient, id: string) {
    await this.getAvatarById(supabase, id)
    await this.artifactAdsRepo.deleteAvatar(supabase, id)
  }

  // ─── Ads ───

  async listAds(supabase: SupabaseClient, campaignId: string, spaceId?: string) {
    return this.artifactAdsRepo.listAds(supabase, campaignId, spaceId)
  }

  async getAd(supabase: SupabaseClient, id: string) {
    const data = await this.artifactAdsRepo.getAd(supabase, id)
    if (!data) throw new NotFoundException('Ad not found')
    return data
  }

  async updateAd(
    supabase: SupabaseClient,
    id: string,
    data: {
      headline?: string
      primary_text?: string
      description?: string | null
      cta_type?: string | null
      cta_text?: string | null
      destination_url?: string
      display_link?: string | null
      placement?: string
      generated_tsx?: string | null
      image_url?: string | null
      image_asset_id?: string | null
      placement_images?: Record<string, { image_url: string; image_asset_id?: string | null }>
      placement_tsx?: Record<string, string>
      ad_format?: string
      video_url?: string | null
      carousel_cards?: Array<{
        image_url: string
        headline?: string
        description?: string
        link?: string
        image_asset_id?: string | null
      }> | null
      metadata?: Record<string, unknown>
      ad_set_id?: string | null
    },
  ): Promise<Record<string, unknown>> {
    const existing = await this.getAd(supabase, id)
    const allowedKeys = [
      'headline',
      'primary_text',
      'description',
      'cta_type',
      'cta_text',
      'destination_url',
      'display_link',
      'placement',
      'generated_tsx',
      'image_url',
      'image_asset_id',
      'placement_images',
      'placement_tsx',
      'ad_format',
      'video_url',
      'carousel_cards',
      'metadata',
      'ad_set_id',
    ] as const
    const stripCopyFromHeadline = (v: string | null | undefined): string | null => {
      if (v == null || typeof v !== 'string') return null
      const trimmed = v.replace(/\s*\(Copy\)\s*$/i, '').trim()
      return trimmed || null
    }
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowedKeys) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        if (key === 'metadata') {
          const existingMeta = (existing as Record<string, unknown>).metadata as
            | Record<string, unknown>
            | null
            | undefined
          const nextMeta = {
            ...(existingMeta && typeof existingMeta === 'object' ? existingMeta : {}),
            ...(data.metadata ?? {}),
          }
          updates.metadata = nextMeta
        } else if (key === 'headline') {
          updates.headline = stripCopyFromHeadline(data.headline) ?? null
        } else {
          updates[key] = data[key as keyof typeof data] ?? null
        }
      }
    }
    if (Object.prototype.hasOwnProperty.call(data, 'destination_url') && data.destination_url) {
      const ad = existing
      const adSetId = (ad as Record<string, unknown>).ad_set_id as string | null
      let adCampaignId: string | null = null
      if (adSetId) {
        const adSet = await this.artifactAdsRepo.getAdSet(supabase, adSetId)
        adCampaignId = adSet?.ad_campaign_id ?? null
      }
      updates.tracking_url = this.buildTrackingUrl(data.destination_url, id, adSetId, adCampaignId)
    }

    return this.artifactAdsRepo.updateAd(supabase, id, updates)
  }

  protected buildTrackingUrl(
    baseUrl: string,
    adId: string,
    adSetId: string | null,
    adCampaignId: string | null,
  ): string {
    try {
      const url = new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`)
      url.searchParams.set('utm_source', 'meta')
      url.searchParams.set('utm_medium', 'paid')
      if (adCampaignId) url.searchParams.set('utm_campaign', adCampaignId)
      if (adSetId) url.searchParams.set('utm_adset', adSetId)
      url.searchParams.set('utm_content', adId)
      return url.toString()
    } catch {
      return baseUrl
    }
  }

  async deleteAd(supabase: SupabaseClient, userId: string, id: string): Promise<void> {
    await this.getAd(supabase, id)
    const status = await this.refreshAdMetaStatus(supabase, userId, id)
    ;(this as any).assertDeletableMetaStatus(
      status as Record<string, unknown>,
      'ad_effective_status',
      'Ad is live on Meta. Pause it before deleting.',
    )
    await this.artifactAdsRepo.deleteAd(supabase, id)
  }

  async duplicateAd(supabase: SupabaseClient, userId: string, id: string, orgId?: string | null) {
    const ad = await this.getAd(supabase, id)
    let isLive = false
    if (ad.meta_ad_id || (ad.metadata as Record<string, unknown> | undefined)?.meta_ad_id) {
      const status = await this.refreshAdMetaStatus(supabase, userId, id)
      isLive = (status as Record<string, unknown>).ad_effective_status === 'ACTIVE'
    }
    const duplicated = await (this as any).duplicateAdRecord(
      supabase,
      ad as Record<string, unknown>,
      (ad as Record<string, unknown>).ad_set_id as string | null,
      isLive,
    )
    return { ...duplicated, source_id: id }
  }

  async cloneAdToAdSet(
    supabase: SupabaseClient,
    userId: string,
    adId: string,
    targetAdSetId: string,
    orgId?: string | null,
  ) {
    const ad = await this.getAd(supabase, adId)
    const targetAdSet = await (this as any).getAdSet(supabase, targetAdSetId)
    if (String(targetAdSet.user_id) !== userId) {
      throw new BadRequestException('Target ad set does not belong to this user.')
    }
    const cloned = await (this as any).duplicateAdRecord(
      supabase,
      ad as Record<string, unknown>,
      targetAdSetId,
      false,
    )
    return { ...cloned, source_id: adId, source: 'vibey' }
  }

  async refreshAdMetaStatus(supabase: SupabaseClient, userId: string, id: string) {
    const ad = await this.getAd(supabase, id)
    if (!ad.meta_ad_id && !(ad.metadata as Record<string, unknown>)?.meta_ad_id) {
      return { ad_id: id, not_published: true, meta_effective_status: null }
    }
    return this.metaApiService.refreshAdHierarchyStatus(supabase, userId, id)
  }

  async getAdSetDeliveryEstimate(supabase: SupabaseClient, userId: string, id: string) {
    await (this as any).getAdSet(supabase, id)
    return this.metaApiService.getDeliveryEstimate(supabase, userId, id)
  }

  async refreshAdSetMetaStatus(supabase: SupabaseClient, userId: string, id: string) {
    const adSet = await (this as any).getAdSet(supabase, id)
    if (!adSet.meta_adset_id && !(adSet.metadata as Record<string, unknown>)?.meta_adset_id) {
      return { ad_set_id: id, not_published: true, meta_effective_status: null }
    }
    return this.metaApiService.refreshAdSetStatus(supabase, userId, id)
  }

  async refreshAdCampaignMetaStatus(supabase: SupabaseClient, userId: string, id: string) {
    const adCampaign = await (this as any).getAdCampaign(supabase, id)
    if (
      !adCampaign.meta_campaign_id &&
      !(adCampaign.metadata as Record<string, unknown>)?.meta_campaign_id
    ) {
      return { ad_campaign_id: id, not_published: true, meta_effective_status: null }
    }
    return this.metaApiService.refreshAdCampaignStatus(supabase, userId, id)
  }

  async setAdMetaStatus(
    supabase: SupabaseClient,
    userId: string,
    id: string,
    status: 'ACTIVE' | 'PAUSED',
  ) {
    await this.getAd(supabase, id)
    return this.metaApiService.setAdMetaStatus(supabase, userId, id, status)
  }

  async setAdSetMetaStatus(
    supabase: SupabaseClient,
    userId: string,
    id: string,
    status: 'ACTIVE' | 'PAUSED',
  ) {
    await (this as any).getAdSet(supabase, id)
    return this.metaApiService.setAdSetMetaStatus(supabase, userId, id, status)
  }

  async setAdCampaignMetaStatus(
    supabase: SupabaseClient,
    userId: string,
    id: string,
    status: 'ACTIVE' | 'PAUSED',
  ) {
    await (this as any).getAdCampaign(supabase, id)
    return this.metaApiService.setAdCampaignMetaStatus(supabase, userId, id, status)
  }
}
