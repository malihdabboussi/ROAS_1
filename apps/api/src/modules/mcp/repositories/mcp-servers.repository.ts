import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class McpServersRepository {
  projectQuery(supabase: SupabaseClient): any {
    return supabase
      .from('project_repos')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
  }

  async insertManagedProject(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{
    data: { id: string } | null
    error: { message: string } | null
  }> {
    return supabase.from('project_repos').insert(payload).select('id').single()
  }

  async listServers(supabase: SupabaseClient, projectId: string) {
    return supabase
      .from('project_mcp_servers')
      .select(
        'id, name, description, server_url, domain, agent_enabled, enabled, cached_tools, cached_resources, last_connected_at, created_at',
      )
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
  }

  async findVaultSecret(supabase: SupabaseClient, input: { userId: string; label: string }) {
    return supabase
      .from('vault_secrets')
      .select('id')
      .eq('user_id', input.userId)
      .eq('provider', 'mcp')
      .eq('label', input.label)
      .maybeSingle()
  }

  async updateVaultSecret(
    supabase: SupabaseClient,
    id: string,
    payload: { encrypted_value: string; org_id: string | null; metadata: Record<string, unknown> },
  ) {
    return supabase.from('vault_secrets').update(payload).eq('id', id)
  }

  async insertVaultSecret(
    supabase: SupabaseClient,
    payload: {
      user_id: string
      org_id: string | null
      provider: string
      label: string
      secret_type: string
      encrypted_value: string
      metadata: Record<string, unknown>
    },
  ) {
    return supabase.from('vault_secrets').insert(payload).select('id').single()
  }

  async insertServer(
    supabase: SupabaseClient,
    payload: {
      project_id: string
      name: string
      description: string | null
      server_url: string
      vault_secret_id: string | null
      domain: string
    },
  ) {
    return supabase.from('project_mcp_servers').insert(payload).select('*').single()
  }

  async findServerByUrl(supabase: SupabaseClient, projectId: string, serverUrl: string) {
    return supabase
      .from('project_mcp_servers')
      .select('*')
      .eq('project_id', projectId)
      .eq('server_url', serverUrl)
      .maybeSingle()
  }

  async updateCachedTools(
    supabase: SupabaseClient,
    serverId: string,
    payload: { cached_tools: unknown[]; cached_resources: unknown[]; last_connected_at: string },
  ) {
    return supabase.from('project_mcp_servers').update(payload).eq('id', serverId)
  }

  async findServerConnection(supabase: SupabaseClient, serverId: string) {
    return supabase
      .from('project_mcp_servers')
      .select('id, project_id, server_url, vault_secret_id')
      .eq('id', serverId)
      .maybeSingle()
  }

  async findServerForRemoval(supabase: SupabaseClient, serverId: string) {
    return supabase
      .from('project_mcp_servers')
      .select('id, project_id, vault_secret_id')
      .eq('id', serverId)
      .maybeSingle()
  }

  async deleteServer(supabase: SupabaseClient, serverId: string, projectId: string) {
    return supabase
      .from('project_mcp_servers')
      .delete()
      .eq('id', serverId)
      .eq('project_id', projectId)
  }

  async deleteVaultSecret(supabase: SupabaseClient, secretId: string) {
    return supabase.from('vault_secrets').delete().eq('id', secretId)
  }

  async findServerProject(supabase: SupabaseClient, serverId: string) {
    return supabase
      .from('project_mcp_servers')
      .select('id, project_id')
      .eq('id', serverId)
      .maybeSingle()
  }

  async updateServerFields(
    supabase: SupabaseClient,
    serverId: string,
    projectId: string,
    updates: Record<string, unknown>,
  ) {
    return supabase
      .from('project_mcp_servers')
      .update(updates)
      .eq('id', serverId)
      .eq('project_id', projectId)
  }

  async getVaultApiKey(supabase: SupabaseClient, vaultSecretId: string) {
    return supabase
      .from('vault_secrets')
      .select('encrypted_value')
      .eq('id', vaultSecretId)
      .maybeSingle()
  }
}
