import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  Supabase,
  ZodValidationPipe,
} from '@vibey/api-shared'
import {
  BrainShareParamSchema,
  OrgIdParamSchema,
  ShareBrainSchema,
  type BrainShareParam,
  type OrgIdParam,
  type ShareBrainInput,
} from '../dto'
import { OrgSharingService } from '../services/org-sharing.service'

@Controller('org')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class OrgBrainSharingLegacyController {
  constructor(private readonly sharingService: OrgSharingService) {}

  @Post(':orgId/brains/share')
  @RequireOrgRole('viewer')
  @HttpCode(HttpStatus.OK)
  async shareBrain(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(ShareBrainSchema)) dto: ShareBrainInput,
    @Supabase() supabase: SupabaseClient,
  ) {
    const sharing = await this.sharingService.shareLegacyBrain(supabase, params.orgId, user.id, dto)
    return { success: true, sharing }
  }

  @Delete(':orgId/brains/:brainId/share')
  @RequireOrgRole('viewer')
  async unshareBrain(
    @Param(new ZodValidationPipe(BrainShareParamSchema)) params: BrainShareParam,
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
  ) {
    await this.sharingService.unshareLegacyBrain(supabase, params.orgId, params.brainId, user.id)
    return { success: true }
  }

  @Get(':orgId/brains/shared')
  @RequireOrgRole('viewer')
  async listSharedBrains(
    @Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam,
    @Supabase() supabase: SupabaseClient,
  ) {
    const sharedBrains = await this.sharingService.listLegacySharedBrains(supabase, params.orgId)
    return { success: true, sharedBrains }
  }
}
