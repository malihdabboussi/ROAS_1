import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import {
  AuthGuard,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import { FunnelHistoryService } from '../services/funnel-history.service'

const FunnelHistoryQuerySchema = z.object({
  funnel_page_id: z.string().uuid().optional(),
})

const FunnelHistoryRestoreBodySchema = z.object({
  change_set_id: z.string().uuid(),
  funnel_page_id: z.string().uuid().optional().nullable(),
})

const FunnelHistoryBookmarkBodySchema = z.object({
  bookmarked: z.boolean(),
})

@Controller('funnels')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class FunnelHistoryController {
  constructor(private readonly funnelHistoryService: FunnelHistoryService) {}

  @Get(':id/history')
  async listHistory(
    @Supabase() supabase: SupabaseClient,
    @Param('id') funnelId: string,
    @Query(new ZodValidationPipe(FunnelHistoryQuerySchema))
    query: z.infer<typeof FunnelHistoryQuerySchema>,
  ) {
    return this.funnelHistoryService.listHistory(supabase, {
      funnelId,
      funnelPageId: query.funnel_page_id ?? null,
    })
  }

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

  @Post(':id/history/restore')
  async restore(
    @Supabase() supabase: SupabaseClient,
    @Param('id') funnelId: string,
    @Body(new ZodValidationPipe(FunnelHistoryRestoreBodySchema))
    body: z.infer<typeof FunnelHistoryRestoreBodySchema>,
  ) {
    return this.funnelHistoryService.restore(supabase, {
      funnelId,
      funnelPageId: body.funnel_page_id ?? null,
      changeSetId: body.change_set_id,
    })
  }

  @Post(':id/history/:changeSetId/bookmark')
  async setBookmark(
    @Supabase() supabase: SupabaseClient,
    @Param('id') funnelId: string,
    @Param('changeSetId') changeSetId: string,
    @Body(new ZodValidationPipe(FunnelHistoryBookmarkBodySchema))
    body: z.infer<typeof FunnelHistoryBookmarkBodySchema>,
  ) {
    return this.funnelHistoryService.setBookmark(supabase, {
      funnelId,
      changeSetId,
      bookmarked: body.bookmarked,
    })
  }
}
