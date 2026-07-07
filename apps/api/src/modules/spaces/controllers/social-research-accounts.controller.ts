import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
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
import { CreditsGuard } from '../../billing/guards/credits.guard'
import { SpaceIdParamSchema, type SpaceIdParam } from '../dto'
import { SocialResearchOrchestrationService } from '../services/social-research-orchestration.service'
import { parseSocialResearchPlatform } from './social-research-route-params'

@Controller('spaces/:id/social-research')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SocialResearchAccountsController {
  constructor(private readonly socialResearch: SocialResearchOrchestrationService) {}

  @Post(':platform/accounts')
  @UseGuards(CreditsGuard)
  @HttpCode(HttpStatus.OK)
  async addAccount(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param() params: SpaceIdParam & { platform: string },
    @Body() body: { handle: string },
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    const platform = parseSocialResearchPlatform(params.platform)
    const result = await this.socialResearch.addTrackedAccount({
      supabase,
      userId: user.id,
      orgId: scope.orgId ?? null,
      spaceId,
      platform,
      handle: body.handle,
    })
    return { success: true, ...result }
  }

  @Post(':platform/accounts/:handle/sync')
  @UseGuards(CreditsGuard)
  @HttpCode(HttpStatus.OK)
  async syncAccount(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param() params: SpaceIdParam & { platform: string; handle: string },
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    const platform = parseSocialResearchPlatform(params.platform)
    const result = await this.socialResearch.syncTrackedAccount({
      supabase,
      userId: user.id,
      orgId: scope.orgId ?? null,
      spaceId,
      platform,
      handle: params.handle,
    })
    return { success: true, ...result }
  }

  @Delete(':platform/accounts/:handle')
  @HttpCode(HttpStatus.OK)
  async removeAccount(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param() params: SpaceIdParam & { platform: string; handle: string },
  ) {
    const spaceId = SpaceIdParamSchema.parse({ id: params.id }).id
    const platform = parseSocialResearchPlatform(params.platform)
    const deleted = await this.socialResearch.removeTrackedAccountItems({
      supabase,
      userId: user.id,
      orgId: scope.orgId ?? null,
      spaceId,
      platform,
      handle: params.handle,
    })
    return { success: true, deleted_count: deleted }
  }
}
