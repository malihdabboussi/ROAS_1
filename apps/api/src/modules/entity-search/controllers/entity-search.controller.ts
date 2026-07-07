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
import { EntitySearchQuerySchema, type EntitySearchQueryDto } from '../dto'
import { EntitySearchService } from '../services/entity-search.service'

@Controller('entity-search')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class EntitySearchController {
  constructor(private readonly service: EntitySearchService) {}

  @Get()
  async search(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query(new ZodValidationPipe(EntitySearchQuerySchema)) query: EntitySearchQueryDto,
  ) {
    return this.service.search(
      supabase,
      user.id,
      scope.orgId,
      query.q,
      query.types,
      query.limit,
      query.offset,
      query.campaign_id ?? null,
    )
  }
}
