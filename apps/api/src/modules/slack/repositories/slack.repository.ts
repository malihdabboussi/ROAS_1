import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { retrySupabaseQuery } from '@vibey/api-shared'
import type { AgentChannel } from '../types/slack.types'

@Injectable()
export class SlackRepository {
  private readonly logger = new Logger(SlackRepository.name)

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
      .eq('channel_type', 'slack')
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`Failed to find slack channel: ${error.message}`)
    return data
  }

  async findActiveChannelByTeamAndChannel(
    supabase: SupabaseClient,
    teamId: string,
    channelId: string,
  ): Promise<AgentChannel | null> {
    return retrySupabaseQuery(
      async () =>
        supabase
          .from('agent_channels')
          .select('*')
          .eq('channel_type', 'slack')
          .eq('is_active', true)
          .eq('provider_config->>team_id', teamId)
          .eq('provider_config->>channel_id', channelId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      { errorPrefix: 'Failed to find active slack channel', logger: this.logger },
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
      webhook_secret?: string
      org_id?: string | null
    },
  ): Promise<AgentChannel> {
    const { data, error } = await supabase
      .from('agent_channels')
      .insert(channel)
      .select('*')
      .single()
    if (error) throw new Error(`Failed to create slack channel: ${error.message}`)
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
    if (error) throw new Error(`Failed to update slack channel: ${error.message}`)
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
      .eq('channel_type', 'slack')
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { error } = await query
    if (error) throw new Error(`Failed to delete slack channel: ${error.message}`)
  }

  async deleteAllChannelsForUser(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<void> {
    let query = supabase
      .from('agent_channels')
      .delete()
      .eq('user_id', userId)
      .eq('channel_type', 'slack')
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { error } = await query
    if (error) throw new Error(`Failed to delete all slack channels: ${error.message}`)
  }

  async deleteIntegration(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<void> {
    let query = supabase
      .from('user_integrations')
      .delete()
      .eq('user_id', userId)
      .eq('integration_id', 'slack')
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { error } = await query
    if (error) throw new Error(`Failed to delete slack integration: ${error.message}`)
  }

  async saveIntegration(
    supabase: SupabaseClient,
    userId: string,
    botToken: string,
    metadata: Record<string, unknown>,
    orgId?: string | null,
  ): Promise<void> {
    // user_integrations.scope_mode is NOT NULL; org_shared requires org_id.
    const scopeMode = orgId ? 'org_shared' : 'personal'
    let existsQuery = supabase
      .from('user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('integration_id', 'slack')
    existsQuery = orgId ? existsQuery.eq('org_id', orgId) : existsQuery.is('org_id', null)
    const { data: existing } = await existsQuery.maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('user_integrations')
        .update({
          access_token: botToken,
          metadata,
          provider: 'slack',
          status: 'connected',
          connected_at: new Date().toISOString(),
          error_message: null,
          scope_mode: scopeMode,
          org_id: orgId ?? null,
          connection_label:
            (typeof metadata.team_name === 'string' && metadata.team_name.trim()) ||
            (typeof metadata.teamName === 'string' && metadata.teamName.trim()) ||
            null,
        })
        .eq('id', existing.id)
      if (error) throw new Error(`Failed to update slack integration: ${error.message}`)
      return
    }

    const { error } = await supabase.from('user_integrations').insert({
      user_id: userId,
      integration_id: 'slack',
      provider: 'slack',
      access_token: botToken,
      metadata,
      status: 'connected',
      connected_at: new Date().toISOString(),
      org_id: orgId ?? null,
      connection_label:
        (typeof metadata.team_name === 'string' && metadata.team_name.trim()) ||
        (typeof metadata.teamName === 'string' && metadata.teamName.trim()) ||
        null,
      scope_mode: scopeMode,
    })
    if (error) throw new Error(`Failed to create slack integration: ${error.message}`)
  }

  private async findConnectedIntegration(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<{ access_token: string; metadata: Record<string, unknown> } | null> {
    let query = supabase
      .from('user_integrations')
      .select('access_token, metadata')
      .eq('user_id', userId)
      .eq('integration_id', 'slack')
      .eq('status', 'connected')
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`Failed to load slack integration: ${error.message}`)
    return data
  }

  private async findIntegrationRow(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<{ id: string; metadata: Record<string, unknown> | null } | null> {
    let query = supabase
      .from('user_integrations')
      .select('id, metadata')
      .eq('user_id', userId)
      .eq('integration_id', 'slack')
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error(`Failed to load slack integration: ${error.message}`)
    return data
  }

  /** Resolve Slack only for the active request scope. */
  async getIntegration(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<{ access_token: string; metadata: Record<string, unknown> } | null> {
    return this.findConnectedIntegration(supabase, userId, orgId)
  }

  async updateIntegrationMetadata(
    supabase: SupabaseClient,
    userId: string,
    metadata: Record<string, unknown>,
    orgId?: string | null,
  ): Promise<void> {
    const existing = await this.findIntegrationRow(supabase, userId, orgId)
    if (!existing?.id) return

    const existingMetadata =
      existing.metadata && typeof existing.metadata === 'object'
        ? (existing.metadata as Record<string, unknown>)
        : {}
    const nextMetadata = {
      ...existingMetadata,
      ...metadata,
    }

    const { error } = await supabase
      .from('user_integrations')
      .update({
        metadata: nextMetadata,
      })
      .eq('id', existing.id)

    if (error) throw new Error(`Failed to update slack integration metadata: ${error.message}`)
  }

  async markIntegrationError(
    supabase: SupabaseClient,
    userId: string,
    errorMessage: string,
    orgId?: string | null,
  ): Promise<void> {
    const existing = await this.findIntegrationRow(supabase, userId, orgId)
    if (!existing?.id) return

    const { error } = await supabase
      .from('user_integrations')
      .update({ status: 'error', error_message: errorMessage })
      .eq('id', existing.id)
    if (error) throw new Error(`Failed to mark slack integration error: ${error.message}`)
  }

  async touchLastMessage(supabase: SupabaseClient, channelId: string): Promise<void> {
    const { error } = await supabase
      .from('agent_channels')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', channelId)
    if (error) this.logger.warn(`Failed to touch slack last_message_at: ${error.message}`)
  }

  async disconnectSlackForTeamOnOtherOrgs(
    supabase: SupabaseClient,
    userId: string,
    teamId: string,
    keepOrgId: string | null,
  ): Promise<void> {
    let integrationsQuery = supabase
      .from('user_integrations')
      .update({ status: 'disconnected' })
      .eq('user_id', userId)
      .eq('integration_id', 'slack')
      .eq('status', 'connected')
      .eq('metadata->>team_id', teamId)

    integrationsQuery =
      keepOrgId == null
        ? integrationsQuery.not('org_id', 'is', null)
        : integrationsQuery.or(`org_id.is.null,org_id.neq.${keepOrgId}`)

    const { error: integrationsError } = await integrationsQuery
    if (integrationsError)
      throw new Error(
        `Failed to disconnect Slack on other orgs (integrations): ${integrationsError.message}`,
      )

    let channelsQuery = supabase
      .from('agent_channels')
      .delete()
      .eq('user_id', userId)
      .eq('channel_type', 'slack')
      .eq('provider_config->>team_id', teamId)

    channelsQuery =
      keepOrgId == null
        ? channelsQuery.not('org_id', 'is', null)
        : channelsQuery.or(`org_id.is.null,org_id.neq.${keepOrgId}`)

    const { error: channelsError } = await channelsQuery
    if (channelsError)
      throw new Error(
        `Failed to delete Slack agent_channels on other orgs: ${channelsError.message}`,
      )
  }

  async findFallbackChannelByTeam(
    supabase: SupabaseClient,
    teamId: string,
  ): Promise<AgentChannel | null> {
    const channels = await retrySupabaseQuery(
      async () =>
        supabase
          .from('agent_channels')
          .select('*')
          .eq('channel_type', 'slack')
          .eq('is_active', true)
          .eq('provider_config->>team_id', teamId)
          .order('updated_at', { ascending: false })
          .limit(25),
      { errorPrefix: 'Failed to find fallback slack channel for team', logger: this.logger },
    )

    const rows = channels ?? []
    return rows.find((channel) => channel.org_id) ?? rows[0] ?? null
  }
}
