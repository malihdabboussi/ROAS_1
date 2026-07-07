import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
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
import { FunnelHistoryService } from '../services/funnel-history.service'

@Controller('funnels')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class FunnelHistoryController {
  constructor(private readonly funnelHistoryService: FunnelHistoryService) {}

  @Get(':id/history/state')
  async getState(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param('id') funnelId: string,
    @Query('funnel_page_id') funnelPageId?: string | null,
  ) {
    return this.funnelHistoryService.getState(supabase, {
      funnelId,
      funnelPageId: funnelPageId ?? null,
      orgId: scope.orgId,
    })
  }

  @Post(':id/history/undo')
  async undo(
    @Supabase() supabase: SupabaseClient,
    @Param('id') funnelId: string,
    @Body() body: { funnel_page_id?: string | null } = {},
  ) {
    return this.funnelHistoryService.undo(supabase, {
      funnelId,
      funnelPageId: body.funnel_page_id ?? null,
    })
  }

  @Post(':id/history/redo')
  async redo(
    @Supabase() supabase: SupabaseClient,
    @Param('id') funnelId: string,
    @Body() body: { funnel_page_id?: string | null } = {},
  ) {
    return this.funnelHistoryService.redo(supabase, {
      funnelId,
      funnelPageId: body.funnel_page_id ?? null,
    })
  }
}
