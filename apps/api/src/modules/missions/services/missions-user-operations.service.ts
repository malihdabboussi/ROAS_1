import { randomUUID } from 'node:crypto'
import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { MediaIndexerService } from '../../media/services/media-indexer.service'
import { buildMediaAssetRef } from '../../media/utils/media-asset-ref'
import { MissionsUserOperationsRepository } from '../repositories/missions-user-operations.repository'

type CurrentUser = { id: string }

type ProfileSettingsBody = {
  daily_digest_enabled?: boolean
  daily_digest_time?: string
  preferred_channel?: string
  auto_approve_plans?: boolean
  public_agent_slug?: string
}

@Injectable()
export class MissionsUserOperationsService {
  constructor(
    private readonly mediaIndexer: MediaIndexerService,
    private readonly userOperationsRepository: MissionsUserOperationsRepository = new MissionsUserOperationsRepository(),
  ) {}

  async updateProfileSettings(
    user: CurrentUser,
    supabase: SupabaseClient,
    body: ProfileSettingsBody,
  ) {
    const patch: Record<string, unknown> = {}
    if (body.daily_digest_enabled !== undefined)
      patch.daily_digest_enabled = body.daily_digest_enabled
    if (body.daily_digest_time !== undefined) patch.daily_digest_time = body.daily_digest_time
    if (body.preferred_channel !== undefined) patch.preferred_channel = body.preferred_channel
    if (body.auto_approve_plans !== undefined) patch.auto_approve_plans = body.auto_approve_plans
    if (body.public_agent_slug !== undefined) {
      const slug = body.public_agent_slug
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 32)
      if (slug.length < 2) throw new BadRequestException('Slug must be at least 2 characters')
      const orgCollision = await this.userOperationsRepository.findOrganizationBySlug(
        supabase,
        slug,
      )
      if (orgCollision) throw new BadRequestException('Slug is reserved by an organization')
      patch.public_agent_slug = slug
    }
    await this.userOperationsRepository.updateProfileSettings(supabase, user.id, patch)
    return { ok: true }
  }

  async getProfileSettings(user: CurrentUser, supabase: SupabaseClient) {
    const data = await this.userOperationsRepository.getProfileSettings(supabase, user.id)
    return (
      data ?? {
        preferred_channel: 'studio',
        daily_digest_enabled: false,
        daily_digest_time: '08:00',
        awareness_loop_enabled: false,
        auto_approve_plans: false,
        public_agent_slug: null,
      }
    )
  }

  async toggleAwareness(user: CurrentUser, supabase: SupabaseClient, body: { enabled: boolean }) {
    await this.userOperationsRepository.updateAwarenessEnabled(supabase, user.id, !!body.enabled)
    return { awareness_loop_enabled: !!body.enabled }
  }

  async toggleAutoApprovePlans(
    user: CurrentUser,
    supabase: SupabaseClient,
    body: { enabled: boolean },
  ) {
    const error = await this.userOperationsRepository.updateAutoApprovePlans(
      supabase,
      user.id,
      !!body.enabled,
    )
    if (error)
      throw new BadRequestException(`Failed to update auto-approve setting: ${error.message}`)
    return { auto_approve_plans: !!body.enabled }
  }

  async uploadAttachment(
    user: CurrentUser,
    supabase: SupabaseClient,
    missionId: string,
    file: Express.Multer.File,
    scope: RequestScope,
  ) {
    if (!file) throw new BadRequestException('No file provided')
    const campaignId = await this.userOperationsRepository.findMissionAttachmentCampaignId(
      supabase,
      user.id,
      missionId,
    )
    const ext = (file.originalname.split('.').pop() || 'bin').toLowerCase()
    const objectPath = `${user.id}/${missionId}/${randomUUID()}.${ext}`
    const uploadError = await this.userOperationsRepository.uploadMissionAttachment(
      supabase,
      objectPath,
      file,
    )
    if (uploadError) throw new BadRequestException(uploadError.message)

    const publicUrl = this.userOperationsRepository.getMissionAttachmentPublicUrl(
      supabase,
      objectPath,
    )
    const assetType = file.mimetype.startsWith('image/')
      ? 'image'
      : file.mimetype.startsWith('video/')
        ? 'video'
        : file.mimetype.startsWith('audio/')
          ? 'audio'
          : 'document'

    const mediaAssetRow = {
      user_id: user.id,
      org_id: scope.orgId ?? null,
      name: file.originalname,
      original_filename: file.originalname,
      file_path: objectPath,
      bucket_name: 'mission-attachments',
      file_size: file.size,
      mime_type: file.mimetype,
      asset_type: assetType,
      category: 'mission-attachment',
      campaign_id: campaignId,
      source: 'upload',
      source_surface: 'mission',
      public_url: publicUrl,
      is_public: false,
      status: 'ready',
    }

    const { assetId, error: assetError } =
      await this.userOperationsRepository.insertMissionAttachmentMediaAsset(supabase, mediaAssetRow)

    if (assetError || !assetId) {
      throw new BadRequestException(assetError?.message ?? 'Failed to register mission attachment')
    }

    this.mediaIndexer.indexAsset(assetId).catch(() => undefined)

    return {
      url: publicUrl,
      path: objectPath,
      asset_id: assetId,
      asset_ref: buildMediaAssetRef({ id: assetId, ...mediaAssetRow }, publicUrl),
    }
  }

  async rateMission(
    user: CurrentUser,
    supabase: SupabaseClient,
    missionId: string,
    body: { rating?: number | null; thumbs_up?: boolean | null; feedback?: string | null },
    scope: RequestScope,
  ) {
    const existingId = await this.userOperationsRepository.findEvaluationDriftId(
      supabase,
      user.id,
      missionId,
    )

    if (existingId) {
      const error = await this.userOperationsRepository.updateEvaluationDrift(
        supabase,
        existingId,
        {
          human_rating: body.rating ?? null,
          human_thumbs_up: body.thumbs_up ?? null,
          human_feedback: body.feedback ?? null,
          updated_at: new Date().toISOString(),
        },
      )
      if (error) throw new BadRequestException(error.message)
      return { updated: true }
    }

    const mission = await this.userOperationsRepository.findMissionRatingAgent(
      supabase,
      user.id,
      missionId,
    )
    if (!mission) throw new BadRequestException('Mission not found')

    const error = await this.userOperationsRepository.insertEvaluationDrift(supabase, {
      user_id: user.id,
      org_id: scope.orgId ?? null,
      mission_id: missionId,
      agent_key: String(mission.assigned_agent_key || 'vibey'),
      model_quality_score: 5,
      human_rating: body.rating ?? null,
      human_thumbs_up: body.thumbs_up ?? null,
      human_feedback: body.feedback ?? null,
    })
    if (error) throw new BadRequestException(error.message)
    return { created: true }
  }
}
