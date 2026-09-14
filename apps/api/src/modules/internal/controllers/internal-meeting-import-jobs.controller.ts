import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common'
import { z } from 'zod'
import type { RequestScope } from '@vibey/api-shared'
import { InternalAuthGuard } from '../../funnels/guards/internal-auth.guard'
import { MeetingImportService } from '../../meetings/intake/services/meeting-import.service'
import { MEETING_PROVIDER_IDS } from '../../meetings/providers/transcript-source.types'
import { InternalRepository } from '../repositories/internal.repository'

const InternalMeetingImportSchema = z.object({
  user_id: z.string().min(1),
  org_id: z.string().nullable().optional(),
  provider: z.enum(MEETING_PROVIDER_IDS),
  external_id: z.string().min(1).max(500),
  brainId: z.string().optional(),
  targetBrain: z.enum(['user', 'campaign', 'agent', 'customer']).optional(),
  contactId: z.string().optional(),
  campaignId: z.string().optional(),
  domain: z
    .enum(['strategy', 'marketing', 'finance', 'operations', 'creative', 'general'])
    .optional(),
})

/**
 * Agent-to-API door for meeting imports (`ingest_meeting_transcript`). Fetches
 * through the provider adapter and queues the shared brain job.
 */
@Controller('internal')
@UseGuards(InternalAuthGuard)
export class InternalMeetingImportJobsController {
  constructor(
    private readonly meetingImport: MeetingImportService,
    private readonly repository: InternalRepository,
  ) {}

  /** POST /api/internal/brain/import-jobs/meeting-transcript */
  @Post('brain/import-jobs/meeting-transcript')
  @HttpCode(HttpStatus.ACCEPTED)
  async enqueueMeetingImport(@Body() body: unknown) {
    const validation = InternalMeetingImportSchema.safeParse(body)
    if (!validation.success) {
      throw new BadRequestException({
        success: false,
        error: 'Invalid request',
        details: validation.error.flatten(),
      })
    }
    const input = validation.data
    const scope = {
      userId: input.user_id.trim(),
      orgId: input.org_id ?? null,
      orgRole: null,
    } as RequestScope
    return this.meetingImport.importToBrain({
      provider: input.provider,
      userId: scope.userId,
      scope,
      supabase: this.repository.createServiceClient(),
      externalId: input.external_id.trim(),
      brainId: input.brainId?.trim() || undefined,
      targetBrain: input.targetBrain,
      contactId: input.contactId?.trim() || undefined,
      campaignId: input.campaignId?.trim() || undefined,
      domain: input.domain,
    })
  }
}
