import { Controller, ForbiddenException, Get, Post, Query, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RoleGuard,
  Roles,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { SpaceAutomationTemplatesRepository } from '../repositories/space-automation-templates.repository'
import { OrgAutomationFlowsService } from '../services/org-automation-flows.service'

@Controller('automations')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard, RoleGuard)
export class OrgAutomationFlowsController {
  constructor(
    private readonly orgFlowsService: OrgAutomationFlowsService,
    private readonly templatesRepo: SpaceAutomationTemplatesRepository,
  ) {}

  @Get('templates')
  @Roles('admin')
  async listOrgTemplates(@Supabase() supabase: SupabaseClient) {
    return this.templatesRepo.listActive(supabase)
  }

  @Get('flows')
  @Roles('admin')
  async listOrgFlows(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Query('campaign_id') campaignId: string | undefined,
    @Query('space_id') spaceId: string | undefined,
    @OrgContext() scope: RequestScope,
  ) {
    const filters = { campaignId: campaignId ?? null, spaceId: spaceId ?? null }
    if (!scope.orgId) {
      return this.orgFlowsService.listPersonalFlows(supabase, user.id, filters)
    }
    return this.orgFlowsService.listOrgFlows(supabase, scope.orgId, filters)
  }

  @Post('flows/concept-space')
  @Roles('admin')
  async ensureConceptSpace(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    if (!scope.orgId) {
      throw new ForbiddenException('Only available in org context')
    }
    return this.orgFlowsService.ensureConceptSpace(supabase, scope.orgId, user.id)
  }

  @Get('runs')
  @Roles('admin')
  async listOrgRuns(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Query('campaign_id') campaignId: string | undefined,
    @Query('space_id') spaceId: string | undefined,
    @OrgContext() scope: RequestScope,
  ) {
    const filters = { campaignId: campaignId ?? null, spaceId: spaceId ?? null }
    if (!scope.orgId) {
      return this.orgFlowsService.listPersonalRuns(supabase, user.id, filters)
    }
    return this.orgFlowsService.listOrgRuns(supabase, scope.orgId, filters)
  }
}
