import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  ConversationIdParamSchema,
  ConversationShareIdParamSchema,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  PassOffConversationShareSchema,
  RequireOrgRole,
  Supabase,
  UpsertConversationShareSchema,
  ZodValidationPipe,
  type ConversationIdParam,
  type ConversationShareIdParam,
  type PassOffConversationShareDto,
  type RequestScope,
  type UpsertConversationShareDto,
} from '@vibey/api-shared'
import { ConversationsService } from '../services/conversations.service'

@Controller('conversations')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class ConversationSharesController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get(':id/shares')
  @RequireOrgRole('viewer')
  async listShares(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ConversationIdParamSchema)) params: ConversationIdParam,
  ) {
    return this.conversationsService.listConversationShares(
      supabase,
      user.id,
      params.id,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Post(':id/shares')
  @RequireOrgRole('admin')
  async upsertShare(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ConversationIdParamSchema)) params: ConversationIdParam,
    @Body(new ZodValidationPipe(UpsertConversationShareSchema)) body: UpsertConversationShareDto,
  ) {
    return this.conversationsService.upsertConversationShare(
      supabase,
      user.id,
      params.id,
      body,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Post(':id/shares/pass-off')
  @RequireOrgRole('admin')
  async passOffShare(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ConversationIdParamSchema)) params: ConversationIdParam,
    @Body(new ZodValidationPipe(PassOffConversationShareSchema)) body: PassOffConversationShareDto,
  ) {
    return this.conversationsService.passOffConversation(
      supabase,
      user.id,
      params.id,
      body,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Delete(':id/shares/:shareId')
  @RequireOrgRole('admin')
  async deleteShare(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ConversationIdParamSchema)) params: ConversationIdParam,
    @Param(new ZodValidationPipe(ConversationShareIdParamSchema))
    shareParams: ConversationShareIdParam,
  ) {
    await this.conversationsService.deleteConversationShare(
      supabase,
      user.id,
      params.id,
      shareParams.shareId,
      scope.orgId,
      scope.orgRole,
    )
    return { deleted: true }
  }
}
