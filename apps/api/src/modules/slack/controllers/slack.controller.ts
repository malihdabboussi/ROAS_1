import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Request } from 'express'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  RoleGuard,
  Roles,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import {
  SlackChannelMapDtoSchema,
  SlackInstallQuerySchema,
  type SlackChannelMapDto,
  type SlackInstallQuery,
} from '../dto/slack.dto'
import { SlackService } from '../services/slack.service'

@Controller('slack')
@UseGuards(AuthGuard, OrgContextGuard, RoleGuard, ThrottlerGuard)
@Roles('user', 'power', 'admin', 'enterprise')
export class SlackController {
  constructor(private readonly slackService: SlackService) {}

  @Get('status')
  async getStatus(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.slackService.getStatus(supabase, user.id, scope.orgId)
  }

  @Post('disconnect')
  async disconnectIntegration(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    await this.slackService.disconnect(supabase, user.id, scope.orgId)
    return { ok: true }
  }

  @Delete('remove')
  async removeIntegration(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    await this.slackService.remove(supabase, user.id, scope.orgId)
    return { ok: true }
  }

  @Get('install')
  getInstallUrl(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Req() req: Request & { token?: string },
    @Headers('x-supabase-refresh-token') refreshToken: string | undefined,
    @Query(new ZodValidationPipe(SlackInstallQuerySchema)) query: SlackInstallQuery,
  ) {
    return this.slackService.getInstallUrl(
      user.id,
      query.agent_key,
      req.token,
      refreshToken,
      query.return_to,
      scope.orgId,
    )
  }

  @Get('workspace-channels')
  async listWorkspaceChannels(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.slackService.listWorkspaceChannels(supabase, user.id, scope.orgId)
  }

  @Post('channel-map')
  async mapChannel(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Supabase() supabase: SupabaseClient,
    @Req() req: Request & { token?: string },
    @Headers('x-supabase-refresh-token') refreshToken: string | undefined,
    @Body(new ZodValidationPipe(SlackChannelMapDtoSchema)) body: SlackChannelMapDto,
  ) {
    return this.slackService.mapAgentChannel(
      supabase,
      user.id,
      body.agent_key,
      body.channel_id,
      body.channel_name,
      req.token ?? '',
      refreshToken,
      scope.orgId,
    )
  }

  @Delete('disconnect/:agentKey')
  async disconnect(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @OrgContext() scope: RequestScope,
  ) {
    await this.slackService.disconnectAgent(supabase, user.id, agentKey, scope.orgId)
    return { ok: true }
  }

  @Get('channels')
  async listChannels(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.slackService.listChannels(supabase, user.id, scope.orgId)
  }

  @Patch('channel/:agentKey/toggle')
  async toggleChannel(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('agentKey') agentKey: string,
    @Body() body: { is_active: boolean },
    @OrgContext() scope: RequestScope,
  ) {
    return this.slackService.toggleChannel(supabase, user.id, agentKey, body.is_active, scope.orgId)
  }
}
