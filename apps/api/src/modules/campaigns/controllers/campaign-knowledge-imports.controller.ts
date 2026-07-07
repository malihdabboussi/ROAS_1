import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
} from '@vibey/api-shared'
import type { RequestScope } from '@vibey/api-shared'
import { CreditsGuard } from '../../billing/guards/credits.guard'
import { BrainImportJobsService } from '../../brain/services/brain-import-jobs.service'
import { FathomApiService } from '../../integrations/fathom/services/fathom-api.service'
import { CampaignsService } from '../services/campaigns.service'
import { type CampaignKnowledgeDomain, isCampaignUuid } from './campaign-controller-utils'

@Controller('campaigns')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class CampaignKnowledgeImportsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly importJobs: BrainImportJobsService,
    private readonly fathomApi: FathomApiService,
  ) {}

  @Post(':id/knowledge/import-url')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(CreditsGuard)
  async importKnowledgeFromUrl(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Body()
    body: {
      url: string
      domain?: CampaignKnowledgeDomain
    },
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    const queued = await this.importJobs.enqueueCampaignUrlImport(user.id, {
      campaignId: id,
      url: body.url,
      domain: body.domain,
    })
    return { success: true, ...queued }
  }

  @Post(':id/knowledge/import-fathom-meeting')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(CreditsGuard)
  async importKnowledgeFromFathomMeeting(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Body()
    body: {
      meeting?: Record<string, unknown>
      domain?: CampaignKnowledgeDomain
    },
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    if (!body.meeting || typeof body.meeting !== 'object') {
      throw new Error('meeting is required')
    }
    const meeting = body.meeting
    if (
      !meeting.transcript ||
      !Array.isArray(meeting.transcript) ||
      meeting.transcript.length === 0
    ) {
      const recordingId = meeting.recording_id ?? meeting.id ?? meeting.call_id
      if (recordingId) {
        const fetched = await this.fathomApi.getRecordingTranscript(
          supabase,
          user.id,
          recordingId as string | number,
        )
        meeting.transcript = fetched.transcript ?? []
      }
    }
    const queued = await this.importJobs.enqueueCampaignFathomImport(
      user.id,
      {
        campaignId: id,
        meeting,
        domain: body.domain,
      },
      scope.orgId ?? null,
    )
    return { success: true, ...queued }
  }

  @Post(':id/knowledge/import-fireflies-transcript')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(CreditsGuard)
  async importKnowledgeFromFirefliesTranscript(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Body()
    body: {
      transcript_id?: string
      domain?: CampaignKnowledgeDomain
    },
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    if (!body.transcript_id?.trim()) throw new Error('transcript_id is required')
    const queued = await this.importJobs.enqueueCampaignFirefliesImport(user.id, {
      campaignId: id,
      transcriptId: body.transcript_id.trim(),
      domain: body.domain,
    })
    return { success: true, ...queued }
  }

  @Post(':id/knowledge/from-deliverable')
  @UseGuards(CreditsGuard)
  async addKnowledgeFromDeliverable(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
    @Body() body: { deliverable_id: string },
  ) {
    if (!isCampaignUuid(id)) throw new NotFoundException('Campaign not found')
    return this.campaignsService.ingestKnowledgeFromDeliverable(
      supabase,
      user.id,
      id,
      body.deliverable_id,
    )
  }
}
