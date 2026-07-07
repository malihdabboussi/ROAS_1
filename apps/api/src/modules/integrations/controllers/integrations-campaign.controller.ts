import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { IntegrationsComposioService } from '../services/integrations-composio.service'

@Controller('integrations')
export class IntegrationsCampaignController {
  constructor(private readonly composioOps: IntegrationsComposioService) {}

  @Get('campaign/:campaignId')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getCampaignConnections(
    @Param('campaignId') campaignId: string,
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    return this.composioOps.getCampaignConnections(supabase, user, scope, campaignId)
  }

  @Post('composio/connect-campaign')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  @RequireOrgRole('admin')
  async connectComposioCampaign(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      campaign_id: string
      integration_id: string
      callback_url?: string
      long_redirect_url?: boolean
    },
    @OrgContext() scope: RequestScope,
  ) {
    return this.composioOps.connectComposioCampaign(supabase, user, scope, body)
  }

  @Post('composio/disconnect-campaign')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  @RequireOrgRole('admin')
  async disconnectComposioCampaign(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: { campaign_id: string; integration_id: string; connection_id: string },
    @OrgContext() scope: RequestScope,
  ) {
    return this.composioOps.disconnectComposioCampaign(supabase, user, scope, body)
  }
}
