import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, UseGuards } from '@nestjs/common'
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
export class AvatarLifecycleArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Patch('avatars/:id')
  async updateAvatar(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @Body() body: { name?: string; persona_data?: Record<string, unknown> },
    @OrgContext() _scope: RequestScope,
  ) {
    return this.artifactsService.updateAvatar(supabase, id, {
      name: body?.name,
      persona_data: body?.persona_data,
    })
  }

  @Delete('avatars/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAvatar(
    @Supabase() supabase: SupabaseClient,
    @Param('id') id: string,
    @OrgContext() _scope: RequestScope,
  ) {
    await this.artifactsService.deleteAvatar(supabase, id)
  }
}
