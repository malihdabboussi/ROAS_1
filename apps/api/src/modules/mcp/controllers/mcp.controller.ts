import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  Supabase,
} from '@vibey/api-shared'
import type { RequestScope } from '@vibey/api-shared'
import { McpServersService } from '../services/mcp-servers.service'

@Controller('mcp')
export class McpController {
  constructor(private readonly mcpServersService: McpServersService) {}

  @Get('servers')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listServers(@Supabase() supabase: SupabaseClient, @OrgContext() scope: RequestScope) {
    return this.mcpServersService.listServers(supabase, scope)
  }

  @Post('servers')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  @RequireOrgRole('admin')
  async addServer(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body()
    body: { name: string; url: string; description?: string; domain?: string; api_key?: string },
  ) {
    return this.mcpServersService.addServer(supabase, user, scope, body)
  }

  @Post('servers/:id/test')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async testServer(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') serverId: string,
  ) {
    return this.mcpServersService.testServer(supabase, scope, serverId)
  }

  @Post('servers/:id/refresh')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  @RequireOrgRole('admin')
  async refreshServer(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') serverId: string,
  ) {
    return this.mcpServersService.refreshServer(supabase, scope, serverId)
  }

  @Delete('servers/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  @RequireOrgRole('admin')
  async removeServer(
    @Supabase() supabase: SupabaseClient,
    @Param('id') serverId: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.mcpServersService.removeServer(supabase, serverId, scope)
  }

  @Patch('servers/:id')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  @RequireOrgRole('admin')
  async updateServer(
    @Supabase() supabase: SupabaseClient,
    @Param('id') serverId: string,
    @Body()
    body: {
      agent_enabled?: boolean
      enabled?: boolean
      domain?: string
      name?: string
      description?: string
    },
    @OrgContext() scope: RequestScope,
  ) {
    return this.mcpServersService.updateServer(supabase, serverId, body, scope)
  }
}
