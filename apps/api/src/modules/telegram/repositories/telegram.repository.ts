import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { retrySupabaseQuery } from '@vibey/api-shared'
import type { AgentChannel } from '../types/telegram.types'

@Injectable()
export class TelegramRepository {
  private readonly logger = new Logger(TelegramRepository.name)

  async findChannelByAgentKey(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ): Promise<AgentChannel | null> {
    let query = supabase
      .from('agent_channels')
      .select('*')
      .eq('user_id', userId)
      .eq('agent_key', agentKey)
      .eq('channel_type', 'telegram')
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`Failed to find channel: ${error.message}`)
    return data
  }

  async findActiveChannelByAgentKeyAndSecret(
    supabase: SupabaseClient,
    agentKey: string,
    webhookSecret: string,
  ): Promise<AgentChannel | null> {
    return retrySupabaseQuery(
      async () =>
        supabase
          .from('agent_channels')
          .select('*')
          .eq('agent_key', agentKey)
          .eq('channel_type', 'telegram')
          .eq('is_active', true)
          .eq('webhook_secret', webhookSecret)
          .maybeSingle(),
      { errorPrefix: 'Failed to find active channel', logger: this.logger },
    )
  }

  async listChannelsByUser(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<AgentChannel[]> {
    let query = supabase
      .from('agent_channels')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { data, error } = await query
    if (error) throw new Error(`Failed to list channels: ${error.message}`)
    return data ?? []
  }

  async createChannel(
    supabase: SupabaseClient,
    channel: {
      user_id: string
      agent_key: string
      channel_type: string
      provider_config: Record<string, unknown>
      webhook_secret: string
      org_id?: string | null
    },
  ): Promise<AgentChannel> {
    const { data, error } = await supabase
      .from('agent_channels')
      .insert(channel)
      .select('*')
      .single()
    if (error) throw new Error(`Failed to create channel: ${error.message}`)
    return data
  }

  async deactivateChannelsForBotOnOtherScopes(
    supabase: SupabaseClient,
    userId: string,
    botId: number,
    keepOrgId?: string | null,
  ): Promise<void> {
    let query = supabase
      .from('agent_channels')
      .update({ is_active: false, error_message: null })
      .eq('user_id', userId)
      .eq('channel_type', 'telegram')
      .eq('provider_config->>bot_id', String(botId))

    query =
      keepOrgId == null
        ? query.not('org_id', 'is', null)
        : query.or(`org_id.is.null,org_id.neq.${keepOrgId}`)

    const { error } = await query
    if (error)
      throw new Error(`Failed to deactivate Telegram channels on other scopes: ${error.message}`)
  }

  async setPublic(
    supabase: SupabaseClient,
    userId: string,
    channelId: string,
    isPublic: boolean,
  ): Promise<AgentChannel> {
    const { data, error } = await supabase
      .from('agent_channels')
      .update({ is_public: isPublic })
      .eq('id', channelId)
      .eq('user_id', userId)
      .select('*')
      .single()
    if (error) throw new Error(`Failed to set channel visibility: ${error.message}`)
    return data
  }

  async updateChannel(
    supabase: SupabaseClient,
    userId: string,
    channelId: string,
    updates: Partial<
      Pick<AgentChannel, 'is_active' | 'error_message' | 'last_message_at' | 'provider_config'>
    >,
  ): Promise<AgentChannel> {
    const { data, error } = await supabase
      .from('agent_channels')
      .update(updates)
      .eq('id', channelId)
      .eq('user_id', userId)
      .select('*')
      .single()
    if (error) throw new Error(`Failed to update channel: ${error.message}`)
    return data
  }

  async deleteChannel(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ): Promise<void> {
    let query = supabase
      .from('agent_channels')
      .delete()
      .eq('user_id', userId)
      .eq('agent_key', agentKey)
      .eq('channel_type', 'telegram')
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { error } = await query
    if (error) throw new Error(`Failed to delete channel: ${error.message}`)
  }

  async saveIntegration(
    supabase: SupabaseClient,
    userId: string,
    botToken: string,
    metadata: Record<string, unknown>,
    orgId?: string | null,
  ): Promise<void> {
    let existsQuery = supabase
      .from('user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('integration_id', 'telegram')
    existsQuery = orgId ? existsQuery.eq('org_id', orgId) : existsQuery.is('org_id', null)
    const { data: existing } = await existsQuery.maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('user_integrations')
        .update({
          access_token: botToken,
          metadata,
          status: 'connected',
          connected_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', existing.id)
      if (error) throw new Error(`Failed to update integration: ${error.message}`)
    } else {
      const { error } = await supabase.from('user_integrations').insert({
        user_id: userId,
        integration_id: 'telegram',
        provider: 'telegram',
        access_token: botToken,
        metadata,
        status: 'connected',
        connected_at: new Date().toISOString(),
        org_id: orgId ?? null,
      })
      if (error) throw new Error(`Failed to create integration: ${error.message}`)
    }
  }

  async getIntegration(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<{ access_token: string; metadata: Record<string, unknown> } | null> {
    let query = supabase
      .from('user_integrations')
      .select('access_token, metadata')
      .eq('user_id', userId)
      .eq('integration_id', 'telegram')
      .eq('status', 'connected')
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`Failed to get integration: ${error.message}`)
    return data
  }

  async deactivateIntegration(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<void> {
    let query = supabase
      .from('user_integrations')
      .update({ status: 'disconnected' })
      .eq('user_id', userId)
      .eq('integration_id', 'telegram')
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { error } = await query
    if (error) throw new Error(`Failed to deactivate integration: ${error.message}`)
  }

  async touchLastMessage(supabase: SupabaseClient, channelId: string): Promise<void> {
    const { error } = await supabase
      .from('agent_channels')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', channelId)
    if (error) this.logger.warn(`Failed to touch last_message_at: ${error.message}`)
  }
}
