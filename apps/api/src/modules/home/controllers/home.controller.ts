import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import type { DailyRecommendationKey } from '../config/daily-recommendation-rules'
import {
  DailyRecommendationKeySchema,
  DailyRecommendationQuerySchema,
  ListRecentCommunicationsQuerySchema,
  NextMoveParamsSchema,
  NextMoveSnoozeBodySchema,
  type DailyRecommendationQuery,
  type ListRecentCommunicationsQuery,
} from '../dto'
import { DailyRecommendationService } from '../services/daily-recommendation.service'
import { HomeCommunicationsService } from '../services/home-communications.service'
import { NextMovesService } from '../services/next-moves.service'

@Controller('home')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class HomeController {
  constructor(
    private readonly homeCommunicationsService: HomeCommunicationsService,
    private readonly dailyRecommendationService: DailyRecommendationService,
    private readonly nextMovesService: NextMovesService,
  ) {}

  @Get('recent-communications')
  async listRecentCommunications(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query(new ZodValidationPipe(ListRecentCommunicationsQuerySchema))
    query: ListRecentCommunicationsQuery,
  ) {
    return this.homeCommunicationsService.listRecent(supabase, scope, query)
  }

  @Get('daily-recommendation')
  async getDailyRecommendation(
    @OrgContext() scope: RequestScope,
    @Query(new ZodValidationPipe(DailyRecommendationQuerySchema))
    query: DailyRecommendationQuery,
  ) {
    return this.dailyRecommendationService.getDailyRecommendation(scope, {
      retainKeys: query.retain,
    })
  }

  @Post('daily-recommendation/:key/dismiss')
  async dismissDailyRecommendation(
    @OrgContext() scope: RequestScope,
    @Param('key', new ZodValidationPipe(DailyRecommendationKeySchema))
    key: DailyRecommendationKey,
  ) {
    return this.dailyRecommendationService.dismiss(scope, key)
  }

  @Get('next-moves')
  listNextMoves(@Supabase() supabase: SupabaseClient, @OrgContext() scope: RequestScope) {
    return this.nextMovesService.list(supabase, scope)
  }

  @Post('next-moves/:id/snooze')
  snoozeNextMove(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(NextMoveParamsSchema)) params: { id: string },
    @Body(new ZodValidationPipe(NextMoveSnoozeBodySchema))
    body: { duration: 'week' | 'dismiss' },
  ) {
    return this.nextMovesService.snooze(supabase, scope, params.id, body.duration)
  }
}
