import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
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
  type DailyRecommendationQuery,
  type ListRecentCommunicationsQuery,
} from '../dto'
import { DailyRecommendationService } from '../services/daily-recommendation.service'
import { HomeCommunicationsService } from '../services/home-communications.service'

@Controller('home')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class HomeController {
  constructor(
    private readonly homeCommunicationsService: HomeCommunicationsService,
    private readonly dailyRecommendationService: DailyRecommendationService,
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
}
