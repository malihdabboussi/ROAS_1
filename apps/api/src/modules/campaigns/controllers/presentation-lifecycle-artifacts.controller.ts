import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { ArtifactsService } from '../services/artifacts.service'

@Controller()
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class PresentationLifecycleArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Post('presentations/:id/publish')
  @HttpCode(HttpStatus.OK)
  async publishPresentation(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.publishPresentation(supabase, id)
  }

  @Post('presentations/:id/unpublish')
  @HttpCode(HttpStatus.OK)
  async unpublishPresentation(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.unpublishPresentation(supabase, id)
  }

  @Patch('presentations/:id')
  async updatePresentation(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body() body: { name?: string; hide_branding?: boolean; metadata?: Record<string, unknown> },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.updatePresentation(supabase, id, {
      name: body?.name,
      hide_branding: body?.hide_branding,
      metadata: body?.metadata,
    })
  }

  @Delete('presentations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePresentation(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    await this.artifactsService.deletePresentation(supabase, id)
  }
}
