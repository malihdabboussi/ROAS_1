import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
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
import { IntegrationsComposioService } from '../services/integrations-composio.service'

@Controller('integrations')
export class IntegrationsComposioController {
  constructor(private readonly composioOps: IntegrationsComposioService) {}

  @Post('composio/connect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async connectWithComposio(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      integration_id: string
      callback_url?: string
      long_redirect_url?: boolean
      connection_data?: Record<string, string>
      connection_scope?: 'personal' | 'org_shared'
      connection_label?: string
      force_new?: boolean
    },
    @OrgContext() scope: RequestScope,
  ) {
    return this.composioOps.connectWithComposio(supabase, user, scope, body)
  }

  @Get('composio/accounts')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listComposioAccounts(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    return this.composioOps.listComposioAccounts(supabase, user, scope)
  }

  @Get('composio/toolkits/search')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async searchComposioToolkits(
    @CurrentUser() user: { id: string },
    @Query('query') query: string,
    @OrgContext() scope: RequestScope,
    @Query('limit') limitRaw?: string,
  ) {
    return this.composioOps.searchComposioToolkits(user, scope, query, limitRaw)
  }

  @Post('composio/toolkits/sync')
  @UseGuards(AuthGuard, RoleGuard, OrgContextGuard, OrgRoleGuard)
  @Roles('admin')
  async syncComposioToolkitCatalog(
    @CurrentUser() user: { id: string },
    @Body() body: { limit?: number },
    @OrgContext() scope: RequestScope,
  ) {
    return this.composioOps.syncComposioToolkitCatalog(user, scope, body)
  }

  @Post('capabilities/sync')
  @UseGuards(AuthGuard, RoleGuard, OrgContextGuard, OrgRoleGuard)
  @Roles('admin')
  async syncIntegrationCapabilities(
    @CurrentUser() user: { id: string },
    @Body() body: { only?: string[]; force?: boolean } | undefined,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.composioOps.syncIntegrationCapabilities(user, body)
  }

  @Post('composio/execute')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async executeComposioTool(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: { service: string; action: string; params?: Record<string, unknown> },
    @OrgContext() scope: RequestScope,
  ) {
    return this.composioOps.executeComposioTool(supabase, user, scope, body)
  }

  @Post('composio/disconnect')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async disconnectComposio(
    @Supabase() supabase: SupabaseClient,
    @Body() body: { integration_id?: string; connection_id?: string; user_integration_id?: string },
    @OrgContext() scope: RequestScope,
  ) {
    return this.composioOps.disconnectComposio(supabase, scope, body)
  }

  @Delete('remove/:integrationId')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async removeIntegration(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('integrationId') integrationIdRaw: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.composioOps.removeIntegration(supabase, user, scope, integrationIdRaw)
  }

  @Delete('remove-connection/:userIntegrationId')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async removeIntegrationConnection(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('userIntegrationId') userIntegrationId: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.composioOps.removeIntegration(supabase, user, scope, undefined, userIntegrationId)
  }
}
