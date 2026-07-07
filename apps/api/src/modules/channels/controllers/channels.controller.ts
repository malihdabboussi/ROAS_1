import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  RequireOrgRole,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import {
  ChannelIdParamSchema,
  CreateChannelSchema,
  UpdateChannelSchema,
  UpdateChannelUserStateSchema,
  type ChannelIdParam,
  type CreateChannelInput,
  type UpdateChannelInput,
  type UpdateChannelUserStateInput,
} from '../dto'
import { ChannelsService } from '../services/channels.service'

@Controller('channels')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get()
  async listChannels(@Supabase() supabase: SupabaseClient, @OrgContext() scope: RequestScope) {
    return this.channelsService.listChannels(supabase, scope)
  }

  @Post()
  @RequireOrgRole('creator')
  @HttpCode(HttpStatus.CREATED)
  async createChannel(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Body(new ZodValidationPipe(CreateChannelSchema)) body: CreateChannelInput,
  ) {
    return this.channelsService.createChannel(supabase, scope, body)
  }

  @Get('unread-counts')
  async getUnreadCounts(@Supabase() supabase: SupabaseClient, @OrgContext() scope: RequestScope) {
    return this.channelsService.getUnreadCounts(supabase, scope)
  }

  @Get('user-state')
  async listUserState(@Supabase() supabase: SupabaseClient, @OrgContext() scope: RequestScope) {
    return this.channelsService.listUserState(supabase, scope.userId)
  }

  @Get(':id')
  async getChannel(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ChannelIdParamSchema)) params: ChannelIdParam,
  ) {
    return this.channelsService.getChannel(supabase, scope, params.id)
  }

  @Patch(':id')
  async updateChannel(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ChannelIdParamSchema)) params: ChannelIdParam,
    @Body(new ZodValidationPipe(UpdateChannelSchema)) body: UpdateChannelInput,
  ) {
    return this.channelsService.updateChannel(supabase, scope, params.id, body)
  }

  @Patch(':id/user-state')
  async updateUserState(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ChannelIdParamSchema)) params: ChannelIdParam,
    @Body(new ZodValidationPipe(UpdateChannelUserStateSchema)) body: UpdateChannelUserStateInput,
  ) {
    return this.channelsService.upsertUserState(supabase, scope, params.id, body)
  }

  @Delete(':id')
  async deleteChannel(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ChannelIdParamSchema)) params: ChannelIdParam,
  ) {
    return this.channelsService.deleteChannel(supabase, scope, params.id)
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markChannelRead(
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
    @Param(new ZodValidationPipe(ChannelIdParamSchema)) params: ChannelIdParam,
  ) {
    return this.channelsService.markChannelRead(supabase, scope, params.id)
  }
}
