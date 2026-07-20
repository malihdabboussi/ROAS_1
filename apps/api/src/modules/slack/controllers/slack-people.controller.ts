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
  SlackPersonIdentityDtoSchema,
  SlackPersonIdParamSchema,
  SlackRelationshipKindDtoSchema,
  SlackShadowActionIdParamSchema,
  SlackShadowActionsQuerySchema,
  SlackShadowProposalDtoSchema,
  SlackShadowReviewDtoSchema,
  type SlackDeliveryModeDto,
  type SlackPersonIdentityDto,
  type SlackPersonIdParam,
  type SlackRelationshipKindDto,
  type SlackShadowActionIdParam,
  type SlackShadowActionsQuery,
  type SlackShadowProposalDto,
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

  @Patch(':id/relationship-kind')
  async updateRelationshipKind(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(SlackPersonIdParamSchema)) params: SlackPersonIdParam,
    @Body(new ZodValidationPipe(SlackRelationshipKindDtoSchema)) body: SlackRelationshipKindDto,
  ) {
    return this.people.updateRelationshipKind(
      supabase,
      scope.orgId,
      params.id,
      body.relationship_kind,
    )
  }

  @Patch(':id/identity')
  async mapIdentity(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(SlackPersonIdParamSchema)) params: SlackPersonIdParam,
    @Body(new ZodValidationPipe(SlackPersonIdentityDtoSchema)) body: SlackPersonIdentityDto,
  ) {
    return this.people.mapIdentity(supabase, scope.orgId, params.id, body.vibey_user_id)
  }

  @Get('shadow-actions')
  async listShadowActions(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Query(new ZodValidationPipe(SlackShadowActionsQuerySchema)) query: SlackShadowActionsQuery,
  ) {
    return this.people.listShadowActions(supabase, scope.orgId, query.limit)
  }

  @Get(':id/activity')
  async getPersonActivity(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(SlackPersonIdParamSchema)) params: SlackPersonIdParam,
  ) {
    return this.people.getPersonActivity(supabase, scope.orgId, params.id)
  }

  @Post(':id/confirm-identity')
  async confirmSuggestedIdentity(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(SlackPersonIdParamSchema)) params: SlackPersonIdParam,
  ) {
    return this.people.confirmSuggestedIdentity(supabase, scope.orgId, params.id)
  }

  @Post(':id/person-brain')
  async createPersonBrain(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(SlackPersonIdParamSchema)) params: SlackPersonIdParam,
  ) {
    return this.people.createPersonBrain(supabase, user.id, scope.orgId, params.id)
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

  @Post(':id/proposals')
  async createProposal(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(SlackPersonIdParamSchema)) params: SlackPersonIdParam,
    @Body(new ZodValidationPipe(SlackShadowProposalDtoSchema)) body: SlackShadowProposalDto,
  ) {
    return this.people.createProposal(
      supabase,
      user.id,
      scope.orgId,
      params.id,
      body.proposed_content,
    )
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
