import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
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
import { YourTurnQuerySchema, type YourTurnQuery } from '../dto'
import { YourTurnService } from '../services/your-turn.service'

@Controller('your-turn')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
@Throttle({ default: { limit: 200, ttl: 60000 } })
export class YourTurnController {
  constructor(private readonly yourTurnService: YourTurnService) {}

  @Get()
  async list(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query(new ZodValidationPipe(YourTurnQuerySchema)) query: YourTurnQuery,
  ) {
    return this.yourTurnService.list(supabase, query, scope.orgId, user.id)
  }
}
