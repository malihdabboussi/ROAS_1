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
import { UUID_RE } from './leads-controller-utils'
import { LeadsService } from '../services/leads.service'

@Controller('leads')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class LeadsCrmController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get('crm/funnels')
  async listCrmFunnels(@Supabase() supabase: SupabaseClient, @OrgContext() scope: RequestScope) {
    return this.leadsService.getCrmFunnels(supabase, scope.orgId)
  }

  @Get('crm/list')
  async listCrmContacts(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('filters') filters?: string,
    @Query('includeArchived') includeArchived?: string,
    @Query('contactType') contactType?: string,
    @Query('campaignId') campaignId?: string,
    @Query('segmentId') segmentId?: string,
  ) {
    let parsedFilters: Record<string, unknown> | undefined
    if (filters) {
      try {
        const obj = JSON.parse(filters) as unknown
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          parsedFilters = obj as Record<string, unknown>
        }
      } catch {
        throw new BadRequestException('Invalid filters JSON')
      }
    }

    return this.leadsService.getCrmContacts(supabase, {
      search,
      sort,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      filters: parsedFilters,
      includeArchived: includeArchived === 'true',
      contactType:
        typeof contactType === 'string' && contactType.trim() ? contactType.trim() : undefined,
      campaignId: campaignId && UUID_RE.test(campaignId) ? campaignId : undefined,
      segmentId: segmentId && UUID_RE.test(segmentId) ? segmentId : undefined,
      orgId: scope.orgId,
    })
  }

  @Post('campaign-import')
  @HttpCode(HttpStatus.OK)
  async importContactsToCampaign(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Body() body: { campaignId?: string; contactIds?: string[] },
  ) {
    const campaignId = typeof body.campaignId === 'string' ? body.campaignId.trim() : ''
    if (!campaignId || !UUID_RE.test(campaignId)) {
      throw new BadRequestException('Valid campaignId is required')
    }
    const contactIds = Array.isArray(body.contactIds)
      ? body.contactIds.filter((id) => typeof id === 'string' && UUID_RE.test(id))
      : []
    if (contactIds.length === 0) {
      throw new BadRequestException('At least one valid contactId is required')
    }
    return this.leadsService.importContactsToCampaign(supabase, campaignId, contactIds, scope.orgId)
  }

  @Post('crm-sync')
  @HttpCode(HttpStatus.OK)
  async startCrmSync(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body() body: { source?: string },
  ) {
    const source = typeof body.source === 'string' ? body.source : ''
    return this.leadsService.startCrmSync(user.id, source, scope.orgId)
  }

  @Get('crm-sync/:id')
  async getCrmSyncJob(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param('id') id: string,
  ) {
    if (!UUID_RE.test(id)) throw new BadRequestException('Invalid job id')
    return this.leadsService.getCrmSyncJob(user.id, id, scope.orgId)
  }
}
