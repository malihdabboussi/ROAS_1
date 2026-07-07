import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import type {
  AddChannelMemberInput,
  CreateChannelInput,
  EditChannelMessageInput,
  PatchChannelMessageMetadataInput,
  PinChannelMessageInput,
  RenameThreadInput,
  SendChannelMessageInput,
  StartBrainstormInput,
  UpdateChannelInput,
  UpdateChannelMemberInput,
} from '../dto'
import { ChannelManagementService } from './channel-management.service'
import { ChannelMessagesService } from './channel-messages.service'

@Injectable()
export class ChannelsService {
  constructor(
    private readonly channelManagement: ChannelManagementService,
    private readonly channelMessages: ChannelMessagesService,
  ) {}

  async listChannels(supabase: SupabaseClient, scope: RequestScope) {
    return this.channelManagement.listChannels(supabase, scope)
  }

  async listUserState(supabase: SupabaseClient, userId: string) {
    return this.channelManagement.listUserState(supabase, userId)
  }

  async upsertUserState(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    patch: { is_favorite?: boolean },
  ) {
    return this.channelManagement.upsertUserState(supabase, scope, channelId, patch)
  }

  async getChannel(supabase: SupabaseClient, scope: RequestScope, channelId: string) {
    return this.channelManagement.getChannel(supabase, scope, channelId)
  }

  async createChannel(supabase: SupabaseClient, scope: RequestScope, data: CreateChannelInput) {
    return this.channelManagement.createChannel(supabase, scope, data)
  }

  async updateChannel(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    data: UpdateChannelInput,
  ) {
    return this.channelManagement.updateChannel(supabase, scope, channelId, data)
  }

  async deleteChannel(supabase: SupabaseClient, scope: RequestScope, channelId: string) {
    return this.channelManagement.deleteChannel(supabase, scope, channelId)
  }

  async addMember(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    data: AddChannelMemberInput,
  ) {
    return this.channelManagement.addMember(supabase, scope, channelId, data)
  }

  async updateMemberRole(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    memberId: string,
    data: UpdateChannelMemberInput,
  ) {
    return this.channelManagement.updateMemberRole(supabase, scope, channelId, memberId, data)
  }

  async removeMember(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    memberId: string,
  ) {
    return this.channelManagement.removeMember(supabase, scope, channelId, memberId)
  }

  async listMessages(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    limit: number,
    before?: string,
  ) {
    return this.channelMessages.listMessages(supabase, scope, channelId, limit, before)
  }

  async sendMessage(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    data: SendChannelMessageInput,
  ) {
    return this.channelMessages.sendMessage(supabase, scope, channelId, data)
  }

  async retryAgentInvocation(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    messageId: string,
    agentKey: string,
  ) {
    return this.channelMessages.retryAgentInvocation(supabase, scope, channelId, messageId, agentKey)
  }

  async startBrainstorm(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    data: StartBrainstormInput,
  ) {
    return this.channelMessages.startBrainstorm(supabase, scope, channelId, data)
  }

  async editMessage(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    messageId: string,
    data: EditChannelMessageInput,
  ) {
    return this.channelMessages.editMessage(supabase, scope, channelId, messageId, data)
  }

  async renameThread(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    messageId: string,
    data: RenameThreadInput,
  ) {
    return this.channelMessages.renameThread(supabase, scope, channelId, messageId, data)
  }

  async pinMessage(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    messageId: string,
    data: PinChannelMessageInput,
  ) {
    return this.channelMessages.pinMessage(supabase, scope, channelId, messageId, data)
  }

  async deleteMessage(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    messageId: string,
  ) {
    return this.channelMessages.deleteMessage(supabase, scope, channelId, messageId)
  }

  async patchMessageMetadata(
    supabase: SupabaseClient,
    scope: RequestScope,
    channelId: string,
    messageId: string,
    data: PatchChannelMessageMetadataInput,
  ) {
    return this.channelMessages.patchMessageMetadata(supabase, scope, channelId, messageId, data)
  }

  async markChannelRead(supabase: SupabaseClient, scope: RequestScope, channelId: string) {
    return this.channelManagement.markChannelRead(supabase, scope, channelId)
  }

  async getUnreadCounts(supabase: SupabaseClient, scope: RequestScope) {
    return this.channelManagement.getUnreadCounts(supabase, scope)
  }

  async listMembers(supabase: SupabaseClient, scope: RequestScope, channelId: string) {
    return this.channelManagement.listMembers(supabase, scope, channelId)
  }
}
