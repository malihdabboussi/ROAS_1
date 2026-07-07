import { Controller, Delete, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common'
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
import { ArtifactsService } from '../services/artifacts.service'

@Controller()
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class AdSetLifecycleArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Post('ad-sets/:id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicateAdSet(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() scope: RequestScope,
  ) {
    return this.artifactsService.duplicateAdSet(supabase, user.id, id, scope.orgId)
  }

  @Delete('ad-sets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAdSet(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
    @Query('delete_mode') deleteMode?: 'keep_ads' | 'delete_all',
  ) {
    const mode = deleteMode === 'delete_all' ? 'delete_all' : 'keep_ads'
    await this.artifactsService.deleteAdSet(supabase, user.id, id, mode)
  }
}
