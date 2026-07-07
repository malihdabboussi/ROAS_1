import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { ArtifactsService } from '../services/artifacts.service'

@Controller()
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SequenceEmailArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Patch('sequences/:id/emails/:emailId/move')
  async moveSequenceEmail(
    @Supabase() supabase: SupabaseClient,
    @Param('id') targetSequenceId: string,
    @Param('emailId') emailId: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.moveSequenceEmailToSequence(supabase, targetSequenceId, emailId)
  }

  @Patch('sequences/:id/emails/reorder')
  async reorderSequenceEmails(
    @Supabase() supabase: SupabaseClient,
    @Param('id') sequenceId: string,
    @Body() body: { emailIds: string[] },
    @OrgContext() _scope: RequestScope,
  ) {
    if (!body?.emailIds || !Array.isArray(body.emailIds)) {
      throw new BadRequestException('emailIds array is required')
    }
    return this.artifactsService.reorderSequenceEmails(supabase, sequenceId, body.emailIds)
  }

  @Post('sequences/:id/emails')
  @HttpCode(HttpStatus.CREATED)
  async createSequenceEmail(
    @Supabase() supabase: SupabaseClient,
    @Param('id') sequenceId: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.createSequenceEmail(supabase, sequenceId)
  }

  @Patch('sequences/:id/emails/:emailId')
  async updateSequenceEmail(
    @Supabase() supabase: SupabaseClient,
    @Param('id') sequenceId: string,
    @Param('emailId') emailId: string,
    @Body()
    body: {
      subject?: string
      body?: string
      delay_hours?: number
      status?: 'draft' | 'ready' | 'sent'
    },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.updateSequenceEmail(supabase, sequenceId, emailId, body)
  }
}
