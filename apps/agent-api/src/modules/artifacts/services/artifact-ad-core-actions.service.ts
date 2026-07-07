import { Injectable } from '@nestjs/common'
import { ArtifactOffersAdsRepository } from '../repositories/artifact-offers-ads.repository'
import { buildDeleteConfirmBlock, tryPersistMissionDeliverable } from '../utils/artifact-domain-handler-shared.util'
import { getActiveSpaceId } from './artifact-space-scope'
import { ensureSpaceView } from './ensure-space-view'

@Injectable()
export class ArtifactAdCoreActionsService {
  constructor(
    private readonly repository: ArtifactOffersAdsRepository = new ArtifactOffersAdsRepository(),
  ) {}

  async createAd(target: Record<string, any>, input: Record<string, unknown>, sessionKey?: string) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    if (!campaignId) {
      return { success: false, error: 'campaign_id required. Create or select a campaign first.' }
    }
    const platform = input.platform as string
    if (!platform) return { success: false, error: 'platform is required' }
    const placement = input.placement as string
    if (!placement) return { success: false, error: 'placement is required' }
    const primaryText = input.primary_text as string
    if (!primaryText) return { success: false, error: 'primary_text is required' }
    const headline = input.headline as string
    if (!headline) return { success: false, error: 'headline is required' }
    const destinationUrl = input.destination_url as string
    if (!destinationUrl) return { success: false, error: 'destination_url is required' }

    const metadata =
      input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
        ? (input.metadata as Record<string, unknown>)
        : {}

    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const spaceId = getActiveSpaceId(input)

    const insertPayload: Record<string, unknown> = {
      user_id: userId,
      org_id: orgId ?? null,
      campaign_id: campaignId,
      ...(spaceId ? { space_id: spaceId } : {}),
      platform,
      placement,
      primary_text: primaryText,
      headline,
      description: (input.description as string) ?? null,
      cta_type: (input.cta_type as string) ?? null,
      cta_text: (input.cta_text as string) ?? null,
      destination_url: destinationUrl,
      display_link: (input.display_link as string) ?? null,
      image_url: (input.image_url as string) ?? null,
      image_asset_id: (input.image_asset_id as string) ?? null,
      generated_tsx: (input.generated_tsx as string) ?? null,
      metadata,
    }
    if (input.ad_set_id) insertPayload.ad_set_id = input.ad_set_id as string

    const { data, error } = await this.repository.createAd(supabase, insertPayload)

    if (error) {
      const dbError = error as { message?: string; code?: string; details?: string; hint?: string }
      target.logger.error(
        `[create_ad] Insert failed code=${dbError.code ?? 'n/a'} message=${dbError.message ?? 'Unknown'}`,
      )
      target.logger.error(
        `[create_ad] Debug context ${JSON.stringify({
          userId,
          campaignId,
          platform,
          placement,
          hasDestinationUrl: Boolean(destinationUrl),
          hasImageUrl: Boolean(insertPayload.image_url),
          hasImageAssetId: Boolean(insertPayload.image_asset_id),
          hasGeneratedTsx: Boolean(insertPayload.generated_tsx),
          metadataKeys: Object.keys(metadata),
          dbDetails: dbError.details ?? null,
          dbHint: dbError.hint ?? null,
        })}`,
      )
      throw error
    }

    if (destinationUrl && data.id) {
      let adCampaignId: string | null = null
      const adSetId = (input.ad_set_id as string) ?? null
      if (adSetId) {
        const { data: adSet } = await this.repository.findAdSetCampaignId(supabase, adSetId)
        adCampaignId = adSet?.ad_campaign_id ?? null
      }
      const trackingUrl = this.buildTrackingUrl(destinationUrl, data.id, adSetId, adCampaignId)
      await this.repository.updateAdFields(supabase, {
        adId: data.id,
        updates: { tracking_url: trackingUrl },
      })
      data.tracking_url = trackingUrl
    }
    await ensureSpaceView({ supabase, spaceId, campaignId, viewType: 'ads', logger: target.logger })

    await tryPersistMissionDeliverable(target, sessionKey, {
      type: 'ad',
      entityId: data.id,
      entityTable: 'ads',
      title: data.headline ?? 'Untitled Ad',
      sourceAction: 'create_ad',
    })
    return {
      ui_blocks: [
        {
          type: 'artifact_preview',
          id: `artifact-ad-${data.id}`,
          artifactType: 'ad',
          artifactId: data.id,
          name: data.headline ?? 'Untitled Ad',
          imageUrl: data.image_url ?? undefined,
          spaceId: spaceId ?? undefined,
        },
      ],
      ...data,
    }
  }

  async updateAd(target: Record<string, any>, input: Record<string, unknown>, sessionKey?: string) {
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)

    const adId = input.ad_id as string
    if (!adId) return { success: false, error: 'ad_id is required' }

    const allowedFields = [
      'primary_text',
      'headline',
      'description',
      'cta_type',
      'cta_text',
      'destination_url',
      'display_link',
      'placement',
      'image_url',
      'image_asset_id',
      'generated_tsx',
      'ad_set_id',
      'placement_images',
    ] as const

    const updates: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (input[key] !== undefined) updates[key] = input[key]
    }

    if (input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)) {
      updates.metadata = input.metadata
    }

    if (
      input.image_url !== undefined &&
      typeof input.image_url === 'string' &&
      input.image_url.trim().length > 0
    ) {
      updates.generated_tsx = null
    }

    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'No fields to update' }
    }

    const { data, error } = await this.repository.updateAd(supabase, {
      adId,
      userId,
      orgId,
      updates,
    })

    if (error) {
      target.logger.error(`[update_ad] Update failed: ${error.message}`)
      throw error
    }

    if (updates.destination_url && data.id) {
      let adCampaignId: string | null = null
      const adSetId = (data.ad_set_id as string) ?? null
      if (adSetId) {
        const { data: adSet } = await this.repository.findAdSetCampaignId(supabase, adSetId)
        adCampaignId = adSet?.ad_campaign_id ?? null
      }
      const trackingUrl = this.buildTrackingUrl(
        updates.destination_url as string,
        data.id,
        adSetId,
        adCampaignId,
      )
      await this.repository.updateAdFields(supabase, {
        adId: data.id,
        updates: { tracking_url: trackingUrl },
      })
      data.tracking_url = trackingUrl
    }

    return data
  }

  async listAds(target: Record<string, any>, input: Record<string, unknown>, sessionKey?: string) {
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    const { data, error } = await this.repository.listAds(supabase, {
      userId,
      orgId,
      campaignId,
    })
    if (error) throw error
    return data
  }

  async getAd(target: Record<string, any>, input: Record<string, unknown>, sessionKey?: string) {
    const adId = String(input.ad_id ?? '').trim()
    if (!adId) return { success: false, error: 'ad_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data, error } = await this.repository.findAd(supabase, { adId, userId, orgId })
    if (error) throw error
    if (!data) return { success: false, error: 'Ad not found' }
    return data
  }

  async deleteAd(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const adId = String(input.ad_id ?? '').trim()
    if (!adId) return { success: false, error: 'ad_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data, error } = await this.repository.findAd(supabase, {
      adId,
      userId,
      orgId,
      columns: 'id, headline',
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Ad not found' }
    return {
      success: true,
      status: 'pending_approval',
      ui_blocks: [
        buildDeleteConfirmBlock({
          action: 'delete_ad',
          entityType: 'ad',
          entityId: data.id,
          entityName: data.headline ?? 'Untitled Ad',
        }),
      ],
    }
  }

  async patchAd(target: Record<string, any>, input: Record<string, unknown>, sessionKey?: string) {
    const adId = String(input.ad_id ?? '').trim()
    if (!adId) return { success: false, error: 'ad_id is required' }

    const pairs: Array<{ find: string; replace: string }> = []
    if (Array.isArray(input.replacements)) {
      for (const r of input.replacements as Array<{ find?: string; replace?: string }>) {
        if (typeof r.find === 'string' && typeof r.replace === 'string')
          pairs.push(r as { find: string; replace: string })
      }
    } else if (typeof input.find === 'string' && typeof input.replace === 'string') {
      pairs.push({ find: input.find as string, replace: input.replace as string })
    }

    if (pairs.length === 0) {
      return {
        success: false,
        error:
          'patch_ad requires at least one find/replace pair (use replacements array or find+replace fields)',
      }
    }

    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)

    const { data: ad, error: adErr } = await this.repository.findAd(supabase, {
      adId,
      userId,
      orgId,
      columns: 'id, generated_tsx',
    })

    if (adErr) throw adErr
    if (!ad) return { success: false, error: 'Ad not found' }

    let tsx =
      typeof (ad as Record<string, unknown>).generated_tsx === 'string'
        ? String((ad as Record<string, unknown>).generated_tsx)
        : ''

    if (!tsx) {
      return {
        success: false,
        error:
          'AD_HAS_NO_TSX: This ad has no generated_tsx to patch. Use update_ad with generated_tsx instead.',
      }
    }

    for (const { find, replace } of pairs) {
      const occurrences = this.countOccurrences(tsx, find)
      if (occurrences === 0) {
        return {
          success: false,
          error: `FIND_NOT_FOUND: find string not found in ad tsx: ${JSON.stringify(find.slice(0, 120))}`,
        }
      }
      if (occurrences > 1) {
        return {
          success: false,
          error: `FIND_NOT_UNIQUE: find string matched ${occurrences} times in ad tsx. Provide a more specific snippet: ${JSON.stringify(find.slice(0, 120))}`,
        }
      }
      tsx = tsx.replace(find, replace)
    }

    if (!tsx.includes('function') || !tsx.includes('return')) {
      return {
        success: false,
        error:
          'PATCH_BROKE_TSX: The patched TSX is missing a function or return statement. The patch likely removed structural code.',
      }
    }

    const { data, error } = await this.repository.updateAd(supabase, {
      adId,
      userId,
      orgId,
      updates: { generated_tsx: tsx },
    })

    if (error) {
      target.logger.error(`[patch_ad] Update failed: ${error.message}`)
      throw error
    }

    return { success: true, ad_id: (data as Record<string, unknown>).id, patched: pairs.length }
  }

  private buildTrackingUrl(
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

  private countOccurrences(haystack: string, needle: string): number {
    if (!needle) return 0
    let count = 0
    let idx = 0
    for (;;) {
      const next = haystack.indexOf(needle, idx)
      if (next === -1) return count
      count += 1
      idx = next + needle.length
    }
  }
}
