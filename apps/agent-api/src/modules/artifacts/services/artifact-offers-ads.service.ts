import { Injectable } from '@nestjs/common'
import { ArtifactOffersAdsRepository } from '../repositories/artifact-offers-ads.repository'
import {
  buildDeleteConfirmBlock,
  callOrExtracted,
  tryPersistMissionDeliverable,
} from '../utils/artifact-domain-handler-shared.util'
import type { ArtifactActionHandler } from './artifact-action.registry'
import { ArtifactAdCampaignActionsService } from './artifact-ad-campaign-actions.service'
import { ArtifactAdCoreActionsService } from './artifact-ad-core-actions.service'
import { getActiveSpaceId } from './artifact-space-scope'
import { ensureSpaceView } from './ensure-space-view'

@Injectable()
export class ArtifactOffersAdsService {
  constructor(
    private readonly repository: ArtifactOffersAdsRepository = new ArtifactOffersAdsRepository(),
    private readonly adCoreActions: ArtifactAdCoreActionsService = new ArtifactAdCoreActionsService(
      repository,
    ),
    private readonly adCampaignActions: ArtifactAdCampaignActionsService = new ArtifactAdCampaignActionsService(
      repository,
    ),
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      list_offers: (data, sessionKey) =>
        callOrExtracted(
          target,
          'listOffers',
          () => this.listOffers(target, data, sessionKey),
          data,
          sessionKey,
        ),
      get_offer: (data, sessionKey) =>
        callOrExtracted(
          target,
          'getOffer',
          () => this.getOffer(target, data, sessionKey),
          data,
          sessionKey,
        ),
      create_offer: (data, sessionKey) =>
        callOrExtracted(
          target,
          'createOffer',
          () => this.createOffer(target, data, sessionKey),
          data,
          sessionKey,
        ),
      update_offer_step: (data, sessionKey) =>
        callOrExtracted(
          target,
          'updateOfferStep',
          () => this.updateOfferStep(target, data, sessionKey),
          data,
          sessionKey,
        ),
      list_custom_fields: (_data, sessionKey) =>
        callOrExtracted(
          target,
          'listCustomFields',
          () => this.listCustomFields(target, sessionKey),
          {},
          sessionKey,
        ),
      create_ad: (data, sessionKey) =>
        callOrExtracted(
          target,
          'createAd',
          () => this.adCoreActions.createAd(target, data, sessionKey),
          data,
          sessionKey,
        ),
      update_ad: (data, sessionKey) =>
        callOrExtracted(
          target,
          'updateAd',
          () => this.adCoreActions.updateAd(target, data, sessionKey),
          data,
          sessionKey,
        ),
      patch_ad: (data, sessionKey) => this.adCoreActions.patchAd(target, data, sessionKey),
      create_ad_campaign: (data, sessionKey) =>
        callOrExtracted(
          target,
          'createAdCampaign',
          () => this.adCampaignActions.createAdCampaign(target, data, sessionKey),
          data,
          sessionKey,
        ),
      create_ad_set: (data, sessionKey) =>
        callOrExtracted(
          target,
          'createAdSet',
          () => this.adCampaignActions.createAdSet(target, data, sessionKey),
          data,
          sessionKey,
        ),
      bulk_create_ads: (data, sessionKey) =>
        callOrExtracted(
          target,
          'bulkCreateAds',
          () => this.adCampaignActions.bulkCreateAds(target, data, sessionKey),
          data,
          sessionKey,
        ),
      generate_ad_copy: (data, _sessionKey) => this.adCampaignActions.generateAdCopy(data),
      delete_offer: (data, sessionKey) => this.deleteOffer(target, data, sessionKey),
      list_ads: (data, sessionKey) =>
        callOrExtracted(
          target,
          'listAds',
          () => this.adCoreActions.listAds(target, data, sessionKey),
          data,
          sessionKey,
        ),
      get_ad: (data, sessionKey) =>
        callOrExtracted(
          target,
          'getAd',
          () => this.adCoreActions.getAd(target, data, sessionKey),
          data,
          sessionKey,
        ),
      delete_ad: (data, sessionKey) => this.adCoreActions.deleteAd(target, data, sessionKey),
      get_ad_campaign: (data, sessionKey) =>
        callOrExtracted(
          target,
          'getAdCampaign',
          () => this.getAdCampaign(target, data, sessionKey),
          data,
          sessionKey,
        ),
      get_ad_set: (data, sessionKey) =>
        callOrExtracted(
          target,
          'getAdSet',
          () => this.getAdSet(target, data, sessionKey),
          data,
          sessionKey,
        ),
    }
  }

  private async listOffers(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    if (!campaignId) {
      return { success: false, error: 'campaign_id required. Select a campaign first.' }
    }
    const { data, error } = await this.repository.listOffers(supabase, {
      userId,
      orgId,
      campaignId,
    })
    if (error) throw error
    return data
  }

  private async listCustomFields(target: Record<string, any>, sessionKey?: string) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)

    const { data, error } = await this.repository.listCustomFields(supabase)

    if (error) throw error

    const now = new Date().toISOString()
    const systemFields = [
      {
        id: 'system_first_name',
        user_id: '00000000-0000-0000-0000-000000000000',
        name: 'First Name',
        field_key: 'first_name',
        field_type: 'text',
        options: [],
        default_value: null,
        is_required: false,
        is_system: true,
        display_order: 0,
        created_at: now,
        updated_at: now,
      },
      {
        id: 'system_name',
        user_id: '00000000-0000-0000-0000-000000000000',
        name: 'Name',
        field_key: 'name',
        field_type: 'text',
        options: [],
        default_value: null,
        is_required: false,
        is_system: true,
        display_order: 1,
        created_at: now,
        updated_at: now,
      },
    ]

    return { fields: [...systemFields, ...(data ?? [])] }
  }

  private async getOffer(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const offerId = input.offer_id as string
    if (!offerId) return { success: false, error: 'offer_id required' }
    const { data, error } = await this.repository.findOffer(supabase, {
      offerId,
      userId,
      orgId,
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Offer not found' }
    return data
  }

  private async createOffer(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    if (!campaignId) {
      return { success: false, error: 'campaign_id required. Create or select a campaign first.' }
    }
    const spaceId = getActiveSpaceId(input)
    const { data, error } = await this.repository.createOffer(supabase, {
      user_id: userId,
      org_id: orgId ?? null,
      campaign_id: campaignId,
      name: (input.name as string) ?? 'Untitled Offer',
      processing_status: (input.processing_status as string) ?? 'draft',
      step1_data: input.step1_data ?? null,
      step2_data: input.step2_data ?? null,
      step3_data: input.step3_data ?? null,
      step4_data: input.step4_data ?? null,
      step5_data: input.step5_data ?? null,
      step6_data: input.step6_data ?? null,
      ...(spaceId ? { space_id: spaceId } : {}),
    })
    if (error) throw error
    await ensureSpaceView({
      supabase,
      spaceId,
      campaignId,
      viewType: 'offers',
      logger: target.logger,
    })
    await tryPersistMissionDeliverable(target, sessionKey, {
      type: 'offer',
      entityId: data.id,
      entityTable: 'offers',
      title: data.name ?? 'Untitled Offer',
      sourceAction: 'create_offer',
    })
    return {
      ui_blocks: [
        {
          type: 'artifact_preview',
          id: `artifact-offer-${data.id}`,
          artifactType: 'offer',
          artifactId: data.id,
          name: data.name ?? 'Untitled Offer',
          status: data.processing_status ?? 'draft',
          spaceId: spaceId ?? undefined,
        },
      ],
      ...data,
    }
  }

  private async updateOfferStep(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const offerId = input.offer_id as string
    if (!offerId) return { success: false, error: 'offer_id required' }

    const stepNumber = (input.step_number ?? input.step) as number | undefined
    const stepData = (input.step_data ?? input.data) as Record<string, unknown> | undefined

    if (stepNumber !== undefined && (stepNumber < 1 || stepNumber > 6)) {
      return {
        success: false,
        error: `Invalid step_number: ${stepNumber}. Offers have exactly 6 steps (1–6).`,
      }
    }

    const updates: Record<string, unknown> = {}
    if (input.processing_status) updates.processing_status = input.processing_status
    if (stepNumber && stepData) {
      updates[`step${stepNumber}_data`] = stepData
    }
    for (const key of [
      'name',
      'processing_status',
      'step1_data',
      'step2_data',
      'step3_data',
      'step4_data',
      'step5_data',
      'step6_data',
    ]) {
      if (input[key] !== undefined && !updates[key]) updates[key] = input[key]
    }

    if (Object.keys(updates).length === 0) {
      const receivedKeys = Object.keys(input)
        .filter((k) => k !== 'offer_id')
        .join(', ')
      return {
        success: false,
        error: `No valid fields to update. Received keys: [${receivedKeys}]. Expected: step_number (number) + step_data (object), or direct fields like step1_data..step6_data, name, processing_status.`,
      }
    }

    const { data, error } = await this.repository.updateOffer(supabase, {
      offerId,
      userId,
      orgId,
      updates,
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Offer not found' }
    return data
  }

  private async deleteOffer(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const offerId = String(input.offer_id ?? '').trim()
    if (!offerId) return { success: false, error: 'offer_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data, error } = await this.repository.findOffer(supabase, {
      offerId,
      userId,
      orgId,
      columns: 'id, name',
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Offer not found' }
    return {
      success: true,
      status: 'pending_approval',
      ui_blocks: [
        buildDeleteConfirmBlock({
          action: 'delete_offer',
          entityType: 'offer',
          entityId: data.id,
          entityName: data.name ?? 'Untitled Offer',
        }),
      ],
    }
  }

  private async getAdCampaign(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const adCampaignId = String(input.ad_campaign_id ?? '').trim()
    if (!adCampaignId) return { success: false, error: 'ad_campaign_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data, error } = await this.repository.findAdCampaign(supabase, {
      adCampaignId,
      userId,
      orgId,
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Ad campaign not found' }
    return data
  }

  private async getAdSet(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const adSetId = String(input.ad_set_id ?? '').trim()
    if (!adSetId) return { success: false, error: 'ad_set_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data, error } = await this.repository.findAdSet(supabase, { adSetId, userId, orgId })
    if (error) throw error
    if (!data) return { success: false, error: 'Ad set not found' }
    return data
  }
}
