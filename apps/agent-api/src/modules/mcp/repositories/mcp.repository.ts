import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { McpCachedResource, McpCachedTool, McpServerRow } from '../types/mcp.types'

@Injectable()
export class McpRepository {
  async createVaultSecret(
    supabase: SupabaseClient,
    input: {
      userId: string
      name: string
      url: string
      apiKey: string
    },
  ): Promise<{ id: string | null; errorMessage: string | null }> {
    const { data: secret, error } = await supabase
      .from('vault_secrets')
      .insert({
        user_id: input.userId,
        provider: 'mcp',
        label: input.name,
        secret_type: 'api_key',
        encrypted_value: input.apiKey,
        metadata: { server_url: input.url },
      })
      .select('id')
      .single()

    return { id: (secret?.id as string | undefined) ?? null, errorMessage: error?.message ?? null }
  }

  async createServer(
    supabase: SupabaseClient,
    input: {
      projectId: string
      name: string
      description: string | null
      url: string
      vaultSecretId: string | null
      domain: string
      lastConnectedAt: string | null
    },
  ): Promise<{ server: McpServerRow | null; errorMessage: string | null }> {
    const { data: server, error } = await supabase
      .from('project_mcp_servers')
      .insert({
        project_id: input.projectId,
        name: input.name,
        description: input.description,
        server_url: input.url,
        vault_secret_id: input.vaultSecretId,
        domain: input.domain,
        last_connected_at: input.lastConnectedAt,
      })
      .select('*')
      .single()

    return { server: (server as McpServerRow | null) ?? null, errorMessage: error?.message ?? null }
  }

  async getServerVaultSecretId(supabase: SupabaseClient, serverId: string): Promise<string | null> {
    const { data: server } = await supabase
      .from('project_mcp_servers')
      .select('vault_secret_id')
      .eq('id', serverId)
      .single()

    return (server?.vault_secret_id as string | null | undefined) ?? null
  }

  async deleteServer(supabase: SupabaseClient, serverId: string): Promise<string | null> {
    const { error } = await supabase.from('project_mcp_servers').delete().eq('id', serverId)
    return error?.message ?? null
  }

  async deleteVaultSecret(supabase: SupabaseClient, secretId: string): Promise<void> {
    await supabase.from('vault_secrets').delete().eq('id', secretId)
  }

  async listServers(
    supabase: SupabaseClient,
    projectId: string,
  ): Promise<{ servers: McpServerRow[]; errorMessage: string | null }> {
    const { data, error } = await supabase
      .from('project_mcp_servers')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    return {
      servers: (data ?? []) as McpServerRow[],
      errorMessage: error?.message ?? null,
    }
  }

  async getServer(supabase: SupabaseClient, serverId: string): Promise<McpServerRow | null> {
    const { data } = await supabase
      .from('project_mcp_servers')
      .select('*')
      .eq('id', serverId)
      .single()

    return (data as McpServerRow | null) ?? null
  }

  async getServerByName(
    supabase: SupabaseClient,
    projectId: string,
    name: string,
  ): Promise<McpServerRow | null> {
    const { data } = await supabase
      .from('project_mcp_servers')
      .select('*')
      .eq('project_id', projectId)
      .eq('name', name)
      .single()

    return (data as McpServerRow | null) ?? null
  }

  async updateAgentEnabled(
    supabase: SupabaseClient,
    serverId: string,
    agentEnabled: boolean,
  ): Promise<string | null> {
    const { error } = await supabase
      .from('project_mcp_servers')
      .update({ agent_enabled: agentEnabled })
      .eq('id', serverId)

    return error?.message ?? null
  }

  async getAuthToken(supabase: SupabaseClient, vaultSecretId: string): Promise<string | null> {
    const { data } = await supabase
      .from('vault_secrets')
      .select('encrypted_value')
      .eq('id', vaultSecretId)
      .single()

    return data?.encrypted_value ?? null
  }

  async updateAuthToken(
    supabase: SupabaseClient,
    vaultSecretId: string,
    encryptedValue: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('vault_secrets')
      .update({ encrypted_value: encryptedValue, updated_at: new Date().toISOString() })
      .eq('id', vaultSecretId)
    if (error) throw new Error('Could not persist refreshed MCP OAuth credentials')
  }

  async markOAuthNeedsReconnect(
    supabase: SupabaseClient,
    vaultSecretId: string,
    provider: string,
  ): Promise<void> {
    const { data: server } = await supabase
      .from('project_mcp_servers')
      .select('id')
      .eq('vault_secret_id', vaultSecretId)
      .maybeSingle()
    if (!server?.id) return
    await supabase
      .from('user_integrations')
      .update({
        status: 'needs_reconnect',
        error_message: `${provider} authorization expired`,
        updated_at: new Date().toISOString(),
      })
      .eq('integration_id', provider)
      .eq('metadata->>server_id', server.id)
  }

  async listEnabledServersForAgent(
    supabase: SupabaseClient,
    projectId: string,
  ): Promise<{ servers: McpServerRow[]; errorMessage: string | null }> {
    const { data, error } = await supabase
      .from('project_mcp_servers')
      .select('*')
      .eq('project_id', projectId)
      .eq('enabled', true)
      .eq('agent_enabled', true)
      .order('created_at', { ascending: true })

    return {
      servers: (data ?? []) as McpServerRow[],
      errorMessage: error?.message ?? null,
    }
  }

  async persistTools(
    supabase: SupabaseClient,
    serverId: string,
    tools: McpCachedTool[],
  ): Promise<void> {
    await supabase
      .from('project_mcp_servers')
      .update({
        cached_tools: tools,
        last_connected_at: new Date().toISOString(),
      })
      .eq('id', serverId)
  }

  async persistResources(
    supabase: SupabaseClient,
    serverId: string,
    resources: McpCachedResource[],
  ): Promise<void> {
    await supabase
      .from('project_mcp_servers')
      .update({
        cached_resources: resources,
        last_connected_at: new Date().toISOString(),
      })
      .eq('id', serverId)
  }
}
