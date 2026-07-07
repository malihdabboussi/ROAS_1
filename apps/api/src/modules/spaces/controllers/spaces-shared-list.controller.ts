import { Controller, Get, UseGuards } from '@nestjs/common'
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
  type RequestScope,
} from '@vibey/api-shared'
import { SpacesService } from '../services/spaces.service'

@Controller('spaces')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class SpacesSharedListController {
  constructor(private readonly spacesService: SpacesService) {}

  @Get('shared-with-me')
  @RequireOrgRole('viewer')
  async listSharedWithMe(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.spacesService.listSharedWithMe(supabase, user.id, scope.orgId)
  }
}
