import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import { MissionListQuerySchema, type MissionListQuery } from '../dto'
import { MissionsQueryService } from '../services/missions-query.service'

@Controller('missions')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class MissionsController {
  constructor(private readonly missionsQueryService: MissionsQueryService) {}

  @Get()
  async list(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Query(new ZodValidationPipe(MissionListQuerySchema)) query: MissionListQuery,
    @OrgContext() scope: RequestScope,
  ) {
    return this.missionsQueryService.list(supabase, user.id, query, scope.orgId, scope.orgRole)
  }
}
