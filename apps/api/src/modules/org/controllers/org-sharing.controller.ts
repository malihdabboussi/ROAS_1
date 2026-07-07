import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
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
  BrainShareIdParamSchema,
  BrainShareParamSchema,
  CampaignPermissionMemberParamSchema,
  CampaignSharingParamSchema,
  OrgIdParamSchema,
  UpsertBrainSharingSchema,
  UpsertCampaignPermissionSchema,
  type BrainShareIdParam,
  type BrainShareParam,
  type CampaignPermissionMemberParam,
  type CampaignSharingParam,
  type OrgIdParam,
  type UpsertBrainSharingInput,
  type UpsertCampaignPermissionInput,
} from '../dto'
import { OrgSharingService } from '../services/org-sharing.service'

@Controller('org')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class OrgSharingController {
  constructor(private readonly sharingService: OrgSharingService) {}

  @Get(':orgId/sharing/campaigns/:campaignId/permissions')
  @RequireOrgRole('editor')
  async listCampaignPermissions(
    @Param(new ZodValidationPipe(CampaignSharingParamSchema)) params: CampaignSharingParam,
  ) {
    const permissions = await this.sharingService.listCampaignPermissions(
      params.orgId,
      params.campaignId,
    )
    return { success: true, permissions }
  }

  @Put(':orgId/sharing/campaigns/:campaignId/permissions/:memberId')
  @RequireOrgRole('admin')
  @HttpCode(HttpStatus.OK)
  async upsertCampaignPermission(
    @Param(new ZodValidationPipe(CampaignPermissionMemberParamSchema))
    params: CampaignPermissionMemberParam,
    @Body(new ZodValidationPipe(UpsertCampaignPermissionSchema))
    body: UpsertCampaignPermissionInput,
    @CurrentUser() user: { id: string },
  ) {
    const permission = await this.sharingService.upsertCampaignPermission(
      params.orgId,
      params.memberId,
      params.campaignId,
      body.permission,
      user.id,
    )
    return { success: true, permission }
  }

  @Delete(':orgId/sharing/campaigns/:campaignId/permissions/:memberId')
  @RequireOrgRole('admin')
  @HttpCode(HttpStatus.OK)
  async removeCampaignPermission(
    @Param(new ZodValidationPipe(CampaignPermissionMemberParamSchema))
    params: CampaignPermissionMemberParam,
  ) {
    await this.sharingService.removeCampaignPermission(params.memberId, params.campaignId)
    return { success: true }
  }

  @Get(':orgId/sharing/brains')
  @RequireOrgRole('editor')
  async listBrainPermissions(@Param(new ZodValidationPipe(OrgIdParamSchema)) params: OrgIdParam) {
    const permissions = await this.sharingService.listBrainPermissions(params.orgId)
    return { success: true, permissions }
  }

  @Put(':orgId/sharing/brains/:brainId')
  @RequireOrgRole('admin')
  @HttpCode(HttpStatus.OK)
  async upsertBrainPermission(
    @Param(new ZodValidationPipe(BrainShareParamSchema)) params: BrainShareParam,
    @Body(new ZodValidationPipe(UpsertBrainSharingSchema)) body: UpsertBrainSharingInput,
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
  ) {
    const permission = await this.sharingService.upsertBrainPermission(
      supabase,
      params.orgId,
      params.brainId,
      user.id,
      body,
    )
    return { success: true, permission }
  }

  @Delete(':orgId/sharing/brains/:brainId/shares/:shareId')
  @RequireOrgRole('admin')
  @HttpCode(HttpStatus.OK)
  async removeBrainShare(
    @Param(new ZodValidationPipe(BrainShareIdParamSchema)) params: BrainShareIdParam,
    @Supabase() supabase: SupabaseClient,
  ) {
    await this.sharingService.removeBrainShare(
      supabase,
      params.orgId,
      params.brainId,
      params.shareId,
    )
    return { success: true }
  }

  @Delete(':orgId/sharing/brains/:brainId')
  @RequireOrgRole('admin')
  @HttpCode(HttpStatus.OK)
  async removeOrgBrainPermission(
    @Param(new ZodValidationPipe(BrainShareParamSchema)) params: BrainShareParam,
    @Supabase() supabase: SupabaseClient,
  ) {
    await this.sharingService.removeBrainPermission(supabase, params.orgId, params.brainId)
    return { success: true }
  }
}
