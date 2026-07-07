import { Controller, Get, Query, UseGuards } from '@nestjs/common'
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
import { StudioSearchService } from '../services/studio-search.service'

@Controller('studio')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class StudioSearchController {
  constructor(private readonly studioSearchService: StudioSearchService) {}

  @Get('search')
  async search(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query('q') q?: string,
  ) {
    return this.studioSearchService.search(supabase, typeof q === 'string' ? q : '', scope.orgId)
  }
}
