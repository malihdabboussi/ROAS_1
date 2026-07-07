import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
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
import {
  AddChannelMemberSchema,
  ChannelIdParamSchema,
  ChannelMemberParamSchema,
  UpdateChannelMemberSchema,
  type AddChannelMemberInput,
  type ChannelIdParam,
  type ChannelMemberParam,
  type UpdateChannelMemberInput,
} from '../dto'
import { ChannelsService } from '../services/channels.service'

@Controller('channels')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class ChannelMembersController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get(':id/members')
  async listMembers(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ChannelIdParamSchema)) params: ChannelIdParam,
  ) {
    return this.channelsService.listMembers(supabase, scope, params.id)
  }

  @Post(':id/members')
  async addMember(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ChannelIdParamSchema)) params: ChannelIdParam,
    @Body(new ZodValidationPipe(AddChannelMemberSchema)) body: AddChannelMemberInput,
  ) {
    return this.channelsService.addMember(supabase, scope, params.id, body)
  }

  @Patch(':id/members/:memberId')
  async updateMemberRole(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ChannelMemberParamSchema)) params: ChannelMemberParam,
    @Body(new ZodValidationPipe(UpdateChannelMemberSchema)) body: UpdateChannelMemberInput,
  ) {
    return this.channelsService.updateMemberRole(supabase, scope, params.id, params.memberId, body)
  }

  @Delete(':id/members/:memberId')
  async removeMember(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ChannelMemberParamSchema)) params: ChannelMemberParam,
  ) {
    return this.channelsService.removeMember(supabase, scope, params.id, params.memberId)
  }
}
