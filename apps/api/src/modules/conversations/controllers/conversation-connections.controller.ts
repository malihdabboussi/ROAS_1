import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AddConversationConnectionSchema,
  AuthGuard,
  ConversationConnectionParamSchema,
  ConversationIdParamSchema,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  ZodValidationPipe,
  type AddConversationConnectionDto,
  type ConversationConnectionParam,
  type ConversationIdParam,
  type RequestScope,
} from '@vibey/api-shared'
import { ConversationConnectionsService } from '../services/conversation-connections.service'

@Controller('conversations')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class ConversationConnectionsController {
  constructor(private readonly connectionsService: ConversationConnectionsService) {}

  @Get(':id/connections')
  async list(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ConversationIdParamSchema)) params: ConversationIdParam,
  ) {
    return this.connectionsService.list(supabase, user.id, params.id, scope.orgId, scope.orgRole)
  }

  @Post(':id/connections')
  async add(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ConversationIdParamSchema)) params: ConversationIdParam,
    @Body(new ZodValidationPipe(AddConversationConnectionSchema))
    body: AddConversationConnectionDto,
  ) {
    return this.connectionsService.add(
      supabase,
      user.id,
      params.id,
      body,
      scope.orgId,
      scope.orgRole,
    )
  }

  @Delete(':id/connections/:entityType/:entityId')
  async remove(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ConversationConnectionParamSchema))
    params: ConversationConnectionParam,
  ) {
    return this.connectionsService.remove(
      supabase,
      user.id,
      params.id,
      params.entityType,
      params.entityId,
      scope.orgId,
      scope.orgRole,
    )
  }
}
