import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, Supabase } from '@vibey/api-shared'
import type { UpdateAutoRechargeBody } from '../billing-http.types'
import { BillingUserDataService } from '../services/billing-user-data.service'

@Controller('billing')
export class BillingDataController {
  constructor(private readonly billingUserDataService: BillingUserDataService) {}

  @Get('status')
  @UseGuards(AuthGuard, ThrottlerGuard)
  getStatus(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
  ) {
    return this.billingUserDataService.getBillingStatus(user.id, supabase)
  }

  @Get('auto-recharge')
  @UseGuards(AuthGuard, ThrottlerGuard)
  getAutoRechargeSettings(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
  ) {
    return this.billingUserDataService.getAutoRechargeSettings(user.id, supabase)
  }

  @Post('auto-recharge')
  @UseGuards(AuthGuard, ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  updateAutoRechargeSettings(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @Body() body: UpdateAutoRechargeBody,
  ) {
    return this.billingUserDataService.updateAutoRechargeSettings(user.id, supabase, body)
  }

  @Get('plans')
  @UseGuards(AuthGuard, ThrottlerGuard)
  getPlans(@Supabase() supabase: SupabaseClient) {
    return this.billingUserDataService.getPlans(supabase)
  }

  @Get('usage')
  @UseGuards(AuthGuard, ThrottlerGuard)
  getUsage(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
  ) {
    return this.billingUserDataService.getUsage(user.id, supabase)
  }

  @Get('usage-analytics')
  @UseGuards(AuthGuard, ThrottlerGuard)
  getUsageAnalytics(
    @CurrentUser() _user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.billingUserDataService.getUsageAnalytics(supabase, startDate, endDate)
  }

  @Get('agent-spending')
  @UseGuards(AuthGuard, ThrottlerGuard)
  getAgentSpending(
    @Supabase() supabase: SupabaseClient,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.billingUserDataService.getAgentSpending(supabase, startDate, endDate)
  }

  @Get('credit-history')
  @UseGuards(AuthGuard, ThrottlerGuard)
  getCreditHistory(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @Query('limit') limitParam?: string,
    @Query('offset') offsetParam?: string,
  ) {
    return this.billingUserDataService.getCreditHistory(user.id, supabase, limitParam, offsetParam)
  }
}
