import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import {
  CreateDriveFolderMappingSchema,
  DeleteDriveFolderMappingSchema,
  SpaceDriveMappingIdParamSchema,
  SpaceDriveMappingSpaceParamSchema,
  UpdateDriveFolderMappingSchema,
  type CreateDriveFolderMappingDto,
  type DeleteDriveFolderMappingDto,
  type SpaceDriveMappingIdParam,
  type SpaceDriveMappingSpaceParam,
  type UpdateDriveFolderMappingDto,
} from '../dto/drive-mapping.dto'
import { DriveSyncService } from './drive-sync.service'

@Controller('spaces/:spaceId/drive-mappings')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class DriveFolderMappingsController {
  constructor(private readonly driveSyncService: DriveSyncService) {}

  @Get()
  @RequireOrgRole('viewer')
  async listMappings(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(SpaceDriveMappingSpaceParamSchema))
    params: SpaceDriveMappingSpaceParam,
    @OrgContext() scope: RequestScope,
  ) {
    const mappings = await this.driveSyncService.listMappings(
      supabase,
      user.id,
      params.spaceId,
      scope.orgId,
    )
    return { success: true, mappings }
  }

  @Post()
  @RequireOrgRole('editor')
  async createMapping(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(SpaceDriveMappingSpaceParamSchema))
    params: SpaceDriveMappingSpaceParam,
    @Body(new ZodValidationPipe(CreateDriveFolderMappingSchema)) body: CreateDriveFolderMappingDto,
    @OrgContext() scope: RequestScope,
  ) {
    const result = await this.driveSyncService.createMapping(
      supabase,
      user.id,
      params.spaceId,
      body,
      scope.orgId,
    )
    return { success: true, ...result }
  }

  @Patch(':id')
  @RequireOrgRole('editor')
  async updateMapping(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(SpaceDriveMappingSpaceParamSchema))
    params: SpaceDriveMappingSpaceParam,
    @Param(new ZodValidationPipe(SpaceDriveMappingIdParamSchema))
    mappingParams: SpaceDriveMappingIdParam,
    @Body(new ZodValidationPipe(UpdateDriveFolderMappingSchema)) body: UpdateDriveFolderMappingDto,
    @OrgContext() scope: RequestScope,
  ) {
    const mapping = await this.driveSyncService.updateMapping(
      supabase,
      user.id,
      params.spaceId,
      mappingParams.id,
      body,
      scope.orgId,
    )
    return { success: true, mapping }
  }

  @Delete(':id')
  @RequireOrgRole('editor')
  async deleteMapping(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(SpaceDriveMappingSpaceParamSchema))
    params: SpaceDriveMappingSpaceParam,
    @Param(new ZodValidationPipe(SpaceDriveMappingIdParamSchema))
    mappingParams: SpaceDriveMappingIdParam,
    @Body(new ZodValidationPipe(DeleteDriveFolderMappingSchema)) body: DeleteDriveFolderMappingDto,
    @OrgContext() scope: RequestScope,
  ) {
    const result = await this.driveSyncService.deleteMapping(
      supabase,
      user.id,
      params.spaceId,
      mappingParams.id,
      scope.orgId,
      body.delete_synced_items ?? true,
    )
    return { success: true, ...result }
  }

  @Post(':id/sync-now')
  @RequireOrgRole('editor')
  @HttpCode(HttpStatus.ACCEPTED)
  async syncNow(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param(new ZodValidationPipe(SpaceDriveMappingSpaceParamSchema))
    params: SpaceDriveMappingSpaceParam,
    @Param(new ZodValidationPipe(SpaceDriveMappingIdParamSchema))
    mappingParams: SpaceDriveMappingIdParam,
    @OrgContext() scope: RequestScope,
  ) {
    const result = await this.driveSyncService.syncNow(
      supabase,
      user.id,
      params.spaceId,
      mappingParams.id,
      scope.orgId,
    )
    return { success: true, ...result }
  }
}
