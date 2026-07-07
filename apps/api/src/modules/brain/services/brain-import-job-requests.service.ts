import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AssetRef, RequestScope } from '@vibey/api-shared'
import { BrainImportJobsService } from './brain-import-jobs.service'
import { BrainPermissionsService } from './brain-permissions.service'

type MediaType = 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'
type CampaignDomain = 'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'

export type RememberDocumentBody = {
  content?: string
  sourceType?: 'document' | 'dropbox' | 'google_drive'
  sourceId?: string | null
  sourceTitle?: string | null
  mediaType?: MediaType
  mediaUrl?: string | null
  mediaMimeType?: string | null
  mediaBase64?: string | null
  mediaCaption?: string | null
  assetId?: string | null
  assetRef?: AssetRef | null
  asset_id?: string | null
  asset_ref?: AssetRef | null
}

export type FathomMeetingBody = {
  meeting?: Record<string, unknown>
  brainId?: string
  targetBrain?: string
}

export type CampaignFileBody = {
  campaignId?: string
  title?: string
  content?: string
  sourceType?: 'upload' | 'drive' | 'dropbox'
  domain?: CampaignDomain
  mediaType?: MediaType
  mediaUrl?: string | null
  mediaMimeType?: string | null
  mediaBase64?: string | null
  mediaCaption?: string | null
  assetId?: string | null
  assetRef?: AssetRef | null
  asset_id?: string | null
  asset_ref?: AssetRef | null
}

export type CampaignMeetingBody = {
  campaignId?: string
  meeting?: Record<string, unknown>
  domain?: CampaignDomain
}

export type SkIngestBody = {
  brainId?: string
  text?: string
  sourceType?: string
  title?: string
  domain?: CampaignDomain
  mediaType?: MediaType
  mediaUrl?: string | null
  mediaMimeType?: string | null
  mediaBase64?: string | null
  mediaCaption?: string | null
  assetId?: string | null
  assetRef?: AssetRef | null
  asset_id?: string | null
  asset_ref?: AssetRef | null
}

@Injectable()
export class BrainImportJobRequestsService {
  constructor(
    private readonly importJobs: BrainImportJobsService,
    private readonly brainPermissions: BrainPermissionsService,
  ) {}

  async enqueueRememberDocument(userId: string, body: RememberDocumentBody, scope: RequestScope) {
    const content = body.content?.trim()
    if (!content) throw new BadRequestException('content is required')
    const sourceType = body.sourceType ?? 'document'
    if (!['document', 'dropbox', 'google_drive'].includes(sourceType)) {
      throw new BadRequestException('sourceType is invalid')
    }
    const queued = await this.importJobs.enqueueDocumentRemember(
      userId,
      {
        content,
        sourceType,
        sourceId: body.sourceId ?? null,
        sourceTitle: body.sourceTitle ?? null,
        mediaType: body.mediaType ?? 'text',
        mediaUrl: body.mediaUrl ?? null,
        mediaMimeType: body.mediaMimeType ?? null,
        mediaBase64: body.mediaBase64 ?? null,
        mediaCaption: body.mediaCaption ?? null,
        assetId: body.assetId ?? body.asset_id ?? null,
        assetRef: body.assetRef ?? body.asset_ref ?? null,
      },
      scope.orgId,
    )
    return { success: true, ...queued }
  }

  async enqueueFathomMeeting(
    userId: string,
    body: FathomMeetingBody,
    scope: RequestScope,
    supabase: SupabaseClient,
  ) {
    if (!body.meeting || typeof body.meeting !== 'object') {
      throw new BadRequestException('meeting is required')
    }
    if (body.brainId?.trim()) {
      await this.brainPermissions.assertCanTrainBrain(supabase, userId, scope, body.brainId.trim())
    }
    const queued = await this.importJobs.enqueueFathomMeetingImport(
      userId,
      body.meeting,
      scope.orgId,
      body.brainId?.trim() || undefined,
      body.targetBrain?.trim() || undefined,
    )
    return { success: true, ...queued }
  }

  async enqueueRememberLink(
    userId: string,
    body: { url?: string; title?: string },
    scope: RequestScope,
  ) {
    const url = body.url?.trim()
    if (!url) throw new BadRequestException('url is required')
    const queued = await this.importJobs.enqueueUserLinkImport(
      userId,
      {
        url,
        title: body.title?.trim() || null,
      },
      scope.orgId,
    )
    return { success: true, ...queued }
  }

  async enqueueFirefliesTranscript(
    userId: string,
    body: { transcriptId?: string; brainId?: string; targetBrain?: string },
    scope: RequestScope,
    supabase: SupabaseClient,
  ) {
    const transcriptId = body.transcriptId?.trim()
    if (!transcriptId) throw new BadRequestException('transcriptId is required')
    if (body.brainId?.trim()) {
      await this.brainPermissions.assertCanTrainBrain(supabase, userId, scope, body.brainId.trim())
    }
    const queued = await this.importJobs.enqueueFirefliesTranscriptImport(
      userId,
      transcriptId,
      scope.orgId,
      body.brainId?.trim() || undefined,
      body.targetBrain?.trim() || undefined,
    )
    return { success: true, ...queued }
  }

  async enqueueCampaignFile(userId: string, body: CampaignFileBody, scope: RequestScope) {
    if (!body.campaignId?.trim()) throw new BadRequestException('campaignId is required')
    if (!body.title?.trim() || !body.content?.trim()) {
      throw new BadRequestException('title and content are required')
    }
    const sourceType = body.sourceType ?? 'upload'
    if (!['upload', 'drive', 'dropbox'].includes(sourceType)) {
      throw new BadRequestException('sourceType is invalid')
    }
    const queued = await this.importJobs.enqueueCampaignFileImport(
      userId,
      {
        campaignId: body.campaignId.trim(),
        title: body.title.trim(),
        content: body.content.trim(),
        sourceType,
        domain: body.domain,
        mediaType: body.mediaType ?? 'text',
        mediaUrl: body.mediaUrl ?? null,
        mediaMimeType: body.mediaMimeType ?? null,
        mediaBase64: body.mediaBase64 ?? null,
        mediaCaption: body.mediaCaption ?? null,
        assetId: body.assetId ?? body.asset_id ?? null,
        assetRef: body.assetRef ?? body.asset_ref ?? null,
      },
      scope.orgId,
    )
    return { success: true, ...queued }
  }

  async enqueueCampaignUrl(
    userId: string,
    body: { campaignId?: string; url?: string; domain?: CampaignDomain },
    scope: RequestScope,
  ) {
    if (!body.campaignId?.trim()) throw new BadRequestException('campaignId is required')
    if (!body.url?.trim()) throw new BadRequestException('url is required')
    const queued = await this.importJobs.enqueueCampaignUrlImport(
      userId,
      {
        campaignId: body.campaignId.trim(),
        url: body.url.trim(),
        domain: body.domain,
      },
      scope.orgId,
    )
    return { success: true, ...queued }
  }

  async enqueueCampaignFathom(userId: string, body: CampaignMeetingBody, scope: RequestScope) {
    if (!body.campaignId?.trim()) throw new BadRequestException('campaignId is required')
    if (!body.meeting || typeof body.meeting !== 'object') {
      throw new BadRequestException('meeting is required')
    }
    const queued = await this.importJobs.enqueueCampaignFathomImport(
      userId,
      {
        campaignId: body.campaignId.trim(),
        meeting: body.meeting,
        domain: body.domain,
      },
      scope.orgId,
    )
    return { success: true, ...queued }
  }

  async enqueueCampaignFireflies(
    userId: string,
    body: { campaignId?: string; transcriptId?: string; domain?: CampaignDomain },
    scope: RequestScope,
  ) {
    if (!body.campaignId?.trim()) throw new BadRequestException('campaignId is required')
    if (!body.transcriptId?.trim()) throw new BadRequestException('transcriptId is required')
    const queued = await this.importJobs.enqueueCampaignFirefliesImport(
      userId,
      {
        campaignId: body.campaignId.trim(),
        transcriptId: body.transcriptId.trim(),
        domain: body.domain,
      },
      scope.orgId,
    )
    return { success: true, ...queued }
  }

  async enqueueSkIngest(
    userId: string,
    body: SkIngestBody,
    scope: RequestScope,
    supabase: SupabaseClient,
  ) {
    if (!body.brainId?.trim()) throw new BadRequestException('brainId is required')
    if (!body.text?.trim()) throw new BadRequestException('text is required')
    if (!body.sourceType?.trim()) throw new BadRequestException('sourceType is required')
    if (!body.title?.trim()) throw new BadRequestException('title is required')
    await this.brainPermissions.assertCanTrainBrain(supabase, userId, scope, body.brainId.trim())
    const queued = await this.importJobs.enqueueSkIngest(
      userId,
      {
        brainId: body.brainId.trim(),
        text: body.text.trim(),
        sourceType: body.sourceType.trim(),
        title: body.title.trim(),
        domain: body.domain,
        mediaType: body.mediaType ?? 'text',
        mediaUrl: body.mediaUrl ?? null,
        mediaMimeType: body.mediaMimeType ?? null,
        mediaBase64: body.mediaBase64 ?? null,
        mediaCaption: body.mediaCaption ?? null,
        assetId: body.assetId ?? body.asset_id ?? null,
        assetRef: body.assetRef ?? body.asset_ref ?? null,
      },
      scope.orgId,
    )
    return { success: true, ...queued }
  }

  async enqueueSkLinkIngest(
    userId: string,
    body: {
      brainId?: string
      url?: string
      sourceType?: string
      title?: string
      domain?: CampaignDomain
    },
    scope: RequestScope,
    supabase: SupabaseClient,
  ) {
    if (!body.brainId?.trim()) throw new BadRequestException('brainId is required')
    if (!body.url?.trim()) throw new BadRequestException('url is required')
    await this.brainPermissions.assertCanTrainBrain(supabase, userId, scope, body.brainId.trim())
    const queued = await this.importJobs.enqueueSkLinkIngest(
      userId,
      {
        brainId: body.brainId.trim(),
        url: body.url.trim(),
        sourceType: body.sourceType?.trim(),
        title: body.title?.trim(),
        domain: body.domain,
      },
      scope.orgId,
    )
    return { success: true, ...queued }
  }
}
