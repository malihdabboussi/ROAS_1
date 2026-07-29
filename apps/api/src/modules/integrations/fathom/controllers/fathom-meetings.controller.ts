import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { BrainImportJobsService } from '../../../brain/services/brain-import-jobs.service'
import type { MeetingRecordingBackfillCursor } from '../../../meetings/repositories/meeting-recording-backfill.repository'
import { ListFathomMeetingsSchema } from '../dto/fathom.dto'
import { FathomApiService } from '../services/fathom-api.service'
import { FathomMeetingWorkspaceBackfillService } from '../services/fathom-meeting-workspace-backfill.service'

@Controller('integrations/fathom')
export class FathomMeetingsController {
  constructor(
    private readonly api: FathomApiService,
    private readonly importJobs: BrainImportJobsService,
    private readonly meetingBackfill: FathomMeetingWorkspaceBackfillService,
  ) {}

  @Get('meetings')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listMeetings(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Query() query: Record<string, string | undefined>,
  ) {
    const validation = ListFathomMeetingsSchema.safeParse(query)
    if (!validation.success) {
      throw new BadRequestException({
        success: false,
        error: 'Invalid request',
        details: validation.error.flatten(),
      })
    }
    const meetings = await this.api.listMeetings(supabase, user.id, validation.data.cursor)
    return { success: true, ...meetings }
  }

  @Get('recordings/:recordingId/transcript')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getTranscript(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('recordingId') recordingId: string,
  ) {
    if (!recordingId) throw new BadRequestException('recordingId is required')
    const result = await this.api.getRecordingTranscript(supabase, user.id, recordingId)
    return { success: true, ...result }
  }

  @Get('recordings/:recordingId/summary')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getSummary(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('recordingId') recordingId: string,
  ) {
    if (!recordingId) throw new BadRequestException('recordingId is required')
    const result = await this.api.getRecordingSummary(supabase, user.id, recordingId)
    return { success: true, ...result }
  }

  @Post('meetings/import')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async importMeeting(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body() body: { meeting?: Record<string, unknown> },
  ) {
    const meeting = body?.meeting
    if (!meeting || typeof meeting !== 'object') {
      throw new BadRequestException('meeting is required')
    }
    const queued = await this.importJobs.enqueueFathomMeetingImport(
      user.id,
      meeting,
      scope.orgId ?? null,
    )
    return { success: true, ...queued }
  }

  @Post('meetings/backfill-transcripts')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async backfillMeetingTranscripts(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: { limit?: number; cursor?: { createdAt?: unknown; id?: unknown } },
  ) {
    const requested = Number(body?.limit ?? 25)
    const limit = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), 100) : 25
    const cursor = parseBackfillCursor(body?.cursor)
    if (body?.cursor && !cursor) {
      throw new BadRequestException('cursor must contain an ISO createdAt and record id')
    }
    const result = await this.meetingBackfill.backfillMissingTranscripts(supabase, {
      userId: user.id,
      limit,
      cursor,
    })
    return { success: true, ...result }
  }
}

function parseBackfillCursor(
  cursor: { createdAt?: unknown; id?: unknown } | undefined,
): MeetingRecordingBackfillCursor | undefined {
  if (!cursor) return undefined
  const createdAt = typeof cursor.createdAt === 'string' ? cursor.createdAt.trim() : ''
  const id = typeof cursor.id === 'string' ? cursor.id.trim() : ''
  if (!createdAt || Number.isNaN(Date.parse(createdAt)) || !id) return undefined
  return { createdAt, id }
}
