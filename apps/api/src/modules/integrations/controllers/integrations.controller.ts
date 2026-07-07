import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  RoleGuard,
  Roles,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { IntegrationsComposioService } from '../services/integrations-composio.service'
import { IntegrationsOverviewService } from '../services/integrations-overview.service'
import { IntegrationsStatusService } from '../services/integrations-status.service'

@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly overview: IntegrationsOverviewService,
    private readonly status: IntegrationsStatusService,
    private readonly composioOps: IntegrationsComposioService,
  ) {}

  @Get('overview')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getOverview(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    return this.overview.getOverview(supabase, user, scope)
  }

  @Get('status/:integrationId')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getIntegrationStatus(
    @Param('integrationId') integrationIdRaw: string,
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    return this.status.getIntegrationStatus(supabase, user, scope, integrationIdRaw)
  }

  @Get('org/connected-accounts')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  @RequireOrgRole('admin')
  async listOrgConnectedAccounts(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.overview.listOrgConnectedAccounts(supabase, scope)
  }

  @Get('agent-toggles')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getAgentToggles(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() _user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    return this.status.getAgentToggles(supabase, scope)
  }

  @Patch('agent-toggle')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async toggleAgentEnabled(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() _user: { id: string },
    @Body() body: { integration_id: string; agent_enabled: boolean },
    @OrgContext() scope: RequestScope,
  ) {
    return this.status.toggleAgentEnabled(supabase, scope, body)
  }

  @Post('backfill-labels')
  @UseGuards(AuthGuard, RoleGuard, OrgContextGuard, OrgRoleGuard)
  @Roles('admin')
  async backfillConnectionLabels(
    @Supabase() supabase: SupabaseClient,
    @Body() body: { limit?: number },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.overview.backfillConnectionLabels(supabase, body?.limit ?? 50)
  }

  @Patch('connection/default')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async setDefaultConnection(
    @Supabase() supabase: SupabaseClient,
    @Body() body: { user_integration_id: string },
    @OrgContext() scope: RequestScope,
  ) {
    return this.composioOps.setOrgSharedDefaultConnection(supabase, scope, body)
  }

  @Patch('connection/scope')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async changeConnectionScope(
    @Supabase() supabase: SupabaseClient,
    @Body() body: { user_integration_id: string; scope_mode: 'personal' | 'org_shared' },
    @OrgContext() scope: RequestScope,
  ) {
    return this.composioOps.changeConnectionScope(supabase, scope, body)
  }

  @Patch('connection/label')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateConnectionLabel(
    @Supabase() supabase: SupabaseClient,
    @Body() body: { user_integration_id: string; connection_label: string },
    @OrgContext() scope: RequestScope,
  ) {
    return this.composioOps.updateConnectionLabel(supabase, scope, body)
  }
}
