import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { BrainAuthGuard } from '../guards/brain-auth.guard'
import { BrainPermissionsService } from '../services/brain-permissions.service'
import { SkService } from '../services/sk.service'

@Controller('brain/sk')
@UseGuards(BrainAuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class SkQueryController {
  constructor(
    private readonly skService: SkService,
    private readonly brainPermissions: BrainPermissionsService,
  ) {}

  @Get('sources')
  async getSources(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query('brainId') brainId?: string,
  ) {
    if (!brainId?.trim()) throw new Error('brainId is required')
    await this.brainPermissions.assertCanViewBrain(supabase, user.id, scope, brainId.trim())
    return this.skService.getSources(supabase, user.id, brainId.trim())
  }

  @Get('search')
  async search(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query('q') q?: string,
    @Query('brainId') brainId?: string,
  ) {
    if (!q?.trim()) throw new Error('q is required')
    if (!brainId?.trim()) throw new Error('brainId is required')
    await this.brainPermissions.assertCanQueryBrain(supabase, user.id, scope, brainId.trim())
    return this.skService.search(supabase, user.id, {
      query: q.trim(),
      brainId: brainId.trim(),
      orgId: scope.orgId,
    })
  }

  @Get('gaps')
  async getGaps(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query('brainId') brainId?: string,
  ) {
    if (!brainId?.trim()) throw new Error('brainId is required')
    await this.brainPermissions.assertCanViewBrain(supabase, user.id, scope, brainId.trim())
    return this.skService.getGaps(supabase, user.id, brainId.trim())
  }

  @Get('stats')
  async getStats(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query('brainId') brainId?: string,
  ) {
    if (!brainId?.trim()) throw new Error('brainId is required')
    await this.brainPermissions.assertCanViewBrain(supabase, user.id, scope, brainId.trim())
    return this.skService.getStats(supabase, user.id, brainId.trim())
  }
}
