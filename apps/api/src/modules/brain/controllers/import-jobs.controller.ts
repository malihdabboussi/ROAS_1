import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { CreditsGuard } from '../../billing/guards/credits.guard'
import { BrainAuthGuard } from '../guards/brain-auth.guard'
import {
  BrainImportJobRequestsService,
  type CampaignFileBody,
  type RememberDocumentBody,
  type SkIngestBody,
} from '../services/brain-import-job-requests.service'

@Controller('brain/import-jobs')
@UseGuards(BrainAuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class ImportJobsController {
  constructor(private readonly requests: BrainImportJobRequestsService) {}

  @Post('remember-document')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(CreditsGuard)
  async enqueueRememberDocument(
    @CurrentUser() user: { id: string },
    @Body() body: RememberDocumentBody,
    @OrgContext() scope: RequestScope,
  ) {
    return this.requests.enqueueRememberDocument(user.id, body, scope)
  }

  @Post('remember-link')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(CreditsGuard)
  async enqueueRememberLink(
    @CurrentUser() user: { id: string },
    @Body() body: { url?: string; title?: string },
    @OrgContext() scope: RequestScope,
  ) {
    return this.requests.enqueueRememberLink(user.id, body, scope)
  }

  @Post('campaign-file')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(CreditsGuard)
  async enqueueCampaignFile(
    @CurrentUser() user: { id: string },
    @Body() body: CampaignFileBody,
    @OrgContext() scope: RequestScope,
  ) {
    return this.requests.enqueueCampaignFile(user.id, body, scope)
  }

  @Post('campaign-url')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(CreditsGuard)
  async enqueueCampaignUrl(
    @CurrentUser() user: { id: string },
    @Body() body: { campaignId?: string; url?: string; domain?: CampaignFileBody['domain'] },
    @OrgContext() scope: RequestScope,
  ) {
    return this.requests.enqueueCampaignUrl(user.id, body, scope)
  }

  @Post('sk-ingest')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(CreditsGuard)
  async enqueueSkIngest(
    @CurrentUser() user: { id: string },
    @Body() body: SkIngestBody,
    @OrgContext() scope: RequestScope,
    @Supabase() supabase: SupabaseClient,
  ) {
    return this.requests.enqueueSkIngest(user.id, body, scope, supabase)
  }

  @Post('sk-ingest-link')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(CreditsGuard)
  async enqueueSkLinkIngest(
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      brainId?: string
      url?: string
      sourceType?: string
      title?: string
      domain?: CampaignFileBody['domain']
    },
    @OrgContext() scope: RequestScope,
    @Supabase() supabase: SupabaseClient,
  ) {
    return this.requests.enqueueSkLinkIngest(user.id, body, scope, supabase)
  }
}
