import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import {
  SlackSearchQuerySchema,
  SlackUserByEmailQuerySchema,
  SlackUserInfoQuerySchema,
  type SlackSearchQuery,
  type SlackUserByEmailQuery,
  type SlackUserInfoQuery,
} from '../dto/slack.dto'
import { SlackAgentToolsService } from '../services/slack-agent-tools.service'

/**
 * SlackAgentToolsController — HTTP endpoints that back the native Slack
 * agent tool path (execution_mode: 'legacy' in integration_capabilities).
 *
 * The agent calls `use_integration` with a SLACK_* slug; the legacy
 * dispatcher forwards to these endpoints via integration_capabilities.route_config.
 *
 * Path prefix: /api/integrations/slack/* — mirrors the other legacy
 * integrations (calendly, stripe, fathom, etc.) so no new plumbing is needed.
 */
@Controller('integrations/slack')
export class SlackAgentToolsController {
  constructor(private readonly tools: SlackAgentToolsService) {}

  @Get('search-messages')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async searchMessages(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Query(new ZodValidationPipe(SlackSearchQuerySchema)) query: SlackSearchQuery,
  ) {
    return this.tools.searchMessages(supabase, user.id, scope.orgId, query)
  }

  @Get('search-files')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async searchFiles(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Query(new ZodValidationPipe(SlackSearchQuerySchema)) query: SlackSearchQuery,
  ) {
    return this.tools.searchFiles(supabase, user.id, scope.orgId, query)
  }

  @Get('channels')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listChannels(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    return this.tools.listChannels(supabase, user.id, scope.orgId)
  }

  @Get('users')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listUsers(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    return this.tools.listUsers(supabase, user.id, scope.orgId)
  }

  @Get('user-info')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async getUserInfo(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Query(new ZodValidationPipe(SlackUserInfoQuerySchema)) query: SlackUserInfoQuery,
  ) {
    return this.tools.getUserInfo(supabase, user.id, scope.orgId, query)
  }

  @Get('user-by-email')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async findUserByEmail(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Query(new ZodValidationPipe(SlackUserByEmailQuerySchema)) query: SlackUserByEmailQuery,
  ) {
    return this.tools.findUserByEmail(supabase, user.id, scope.orgId, query)
  }
}
