import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common'
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
import { IntegrationsFacebookService } from '../services/integrations-facebook.service'
import { IntegrationsLinkedInService } from '../services/integrations-linkedin.service'
import { IntegrationsYoutubeService } from '../services/integrations-youtube.service'

@Controller('integrations')
export class IntegrationsSocialController {
  constructor(
    private readonly linkedIn: IntegrationsLinkedInService,
    private readonly facebook: IntegrationsFacebookService,
    private readonly youtube: IntegrationsYoutubeService,
  ) {}

  @Get('linkedin/company-pages')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listLinkedInCompanyPages(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Query('user_integration_id') userIntegrationId?: string,
  ) {
    return this.linkedIn.listAdministeredOrganizations(supabase, user, scope, {
      user_integration_id: userIntegrationId ?? '',
    })
  }

  @Get('facebook/pages')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listFacebookPages(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Query('user_integration_id') userIntegrationId?: string,
  ) {
    return this.facebook.listManagedPages(supabase, user, scope, {
      user_integration_id: userIntegrationId ?? '',
    })
  }

  @Patch('facebook/page')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async setFacebookPage(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      user_integration_id: string
      page_id: string
      page_name: string
    },
    @OrgContext() scope: RequestScope,
  ) {
    return this.facebook.setSelectedPage(supabase, user, scope, body)
  }

  @Get('youtube/channels')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listYoutubeChannels(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Query('user_integration_id') userIntegrationId?: string,
  ) {
    return this.youtube.listAuthenticatedChannels(supabase, user, scope, {
      user_integration_id: userIntegrationId ?? '',
    })
  }

  @Patch('youtube/channel')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async setYoutubeChannel(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      user_integration_id: string
      channel_id: string
      channel_name: string
    },
    @OrgContext() scope: RequestScope,
  ) {
    return this.youtube.setSelectedChannel(supabase, user, scope, body)
  }

  @Patch('linkedin/company-page')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async setLinkedInCompanyPage(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      user_integration_id: string
      organization_urn: string
      organization_name: string
    },
    @OrgContext() scope: RequestScope,
  ) {
    return this.linkedIn.setSelectedOrganization(supabase, user, scope, body)
  }
}
