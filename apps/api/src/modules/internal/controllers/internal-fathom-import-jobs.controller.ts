import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { BrainImportJobsService } from '../../brain/services/brain-import-jobs.service'
import { InternalAuthGuard } from '../../funnels/guards/internal-auth.guard'
import { FathomApiService } from '../../integrations/fathom/services/fathom-api.service'
import { InternalRepository } from '../repositories/internal.repository'

@Controller('internal')
@UseGuards(InternalAuthGuard)
export class InternalFathomImportJobsController {
  constructor(
    private readonly importJobs: BrainImportJobsService,
    private readonly fathomApi: FathomApiService,
    private readonly repository: InternalRepository,
  ) {}

  /**
   * POST /api/internal/brain/import-jobs/fathom-meeting
   */
  @Post('brain/import-jobs/fathom-meeting')
  @HttpCode(HttpStatus.ACCEPTED)
  async enqueueFathomMeetingImport(
    @Body()
    body: {
      user_id: string
      org_id?: string | null
      meeting_id?: string
      recording_id?: string
      call_id?: string
      title?: string
      meeting?: Record<string, unknown>
      brainId?: string
      targetBrain?: string
      campaignId?: string
      domain?: 'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'
    },
  ) {
    if (!body.user_id?.trim()) {
      throw new BadRequestException('user_id is required')
    }

    const meeting: Record<string, unknown> =
      body.meeting && typeof body.meeting === 'object' && !Array.isArray(body.meeting)
        ? { ...body.meeting }
        : {}
    const recordingId = String(
      body.meeting_id ??
        body.recording_id ??
        body.call_id ??
        meeting.recording_id ??
        meeting.id ??
        meeting.call_id ??
        '',
    ).trim()
    if (!recordingId && Object.keys(meeting).length === 0) {
      throw new BadRequestException('meeting_id or meeting is required')
    }

    const supabase = this.repository.createServiceClient()
    if (!Array.isArray(meeting.transcript) || meeting.transcript.length === 0) {
      if (!recordingId) throw new BadRequestException('meeting_id is required to fetch transcript')
      const fetched = await this.fathomApi.getRecordingTranscript(
        supabase,
        body.user_id.trim(),
        recordingId,
      )
      meeting.transcript = fetched.transcript
    }
    if (!meeting.default_summary && recordingId) {
      const fetchedSummary = await this.fathomApi.getRecordingSummary(
        supabase,
        body.user_id.trim(),
        recordingId,
      )
      meeting.default_summary = fetchedSummary.summary
    }

    if (recordingId) {
      meeting.id = meeting.id ?? recordingId
      meeting.recording_id = meeting.recording_id ?? recordingId
    }
    if (body.title?.trim()) {
      meeting.title = body.title.trim()
    }

    if (body.campaignId?.trim()) {
      const queued = await this.importJobs.enqueueCampaignFathomImport(
        body.user_id.trim(),
        {
          campaignId: body.campaignId.trim(),
          meeting,
          domain: body.domain,
        },
        body.org_id ?? null,
      )
      return { success: true, ...queued, recording_id: recordingId || null }
    }

    const queued = await this.importJobs.enqueueFathomMeetingImport(
      body.user_id.trim(),
      meeting,
      body.org_id ?? null,
      body.brainId?.trim() || undefined,
      body.targetBrain?.trim() || undefined,
    )
    return { success: true, ...queued, recording_id: recordingId || null }
  }
}
