import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import {
  SlackDeliveryModeDtoSchema,
  SlackPersonIdParamSchema,
  SlackShadowActionIdParamSchema,
  SlackShadowActionsQuerySchema,
  SlackShadowReviewDtoSchema,
  type SlackDeliveryModeDto,
  type SlackPersonIdParam,
  type SlackShadowActionIdParam,
  type SlackShadowActionsQuery,
  type SlackShadowReviewDto,
} from '../dto/slack.dto'
import { SlackPeopleService } from '../services/slack-people.service'

@Controller('integrations/slack/people')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
@RequireOrgRole('admin')
export class SlackPeopleController {
  constructor(private readonly people: SlackPeopleService) {}

  @Get()
  async list(@Supabase() supabase: SupabaseClient, @OrgContext() scope: RequestScope) {
    return this.people.listPeople(supabase, scope.orgId)
  }

  @Patch(':id/delivery-mode')
  async updateDeliveryMode(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(SlackPersonIdParamSchema)) params: SlackPersonIdParam,
    @Body(new ZodValidationPipe(SlackDeliveryModeDtoSchema)) body: SlackDeliveryModeDto,
  ) {
    return this.people.updateDeliveryMode(supabase, scope.orgId, params.id, body.delivery_mode)
  }

  @Get('shadow-actions')
  async listShadowActions(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query(new ZodValidationPipe(SlackShadowActionsQuerySchema)) query: SlackShadowActionsQuery,
  ) {
    return this.people.listShadowActions(supabase, scope.orgId, query.limit)
  }

  @Post(':id/test-proposal')
  async createTestProposal(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(SlackPersonIdParamSchema)) params: SlackPersonIdParam,
  ) {
    return this.people.createTestProposal(supabase, user.id, scope.orgId, params.id)
  }

  @Patch('shadow-actions/:id/review')
  async reviewShadowAction(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(SlackShadowActionIdParamSchema))
    params: SlackShadowActionIdParam,
    @Body(new ZodValidationPipe(SlackShadowReviewDtoSchema)) body: SlackShadowReviewDto,
  ) {
    return this.people.reviewShadowAction(supabase, user.id, scope.orgId, params.id, body.status)
  }

  @Post('shadow-actions/:id/send')
  async sendShadowAction(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(SlackShadowActionIdParamSchema))
    params: SlackShadowActionIdParam,
  ) {
    return this.people.sendShadowAction(supabase, user.id, scope.orgId, params.id)
  }
}
