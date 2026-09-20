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
import { CampaignsService } from '../services/campaigns.service'
import { isCampaignUuid, type CampaignKnowledgeDomain } from './campaign-controller-utils'

@Controller('campaigns')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class CampaignKnowledgeImportsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly importJobs: BrainImportJobsService,
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
