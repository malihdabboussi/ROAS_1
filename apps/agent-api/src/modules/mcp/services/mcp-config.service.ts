import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { McpRepository } from '../repositories/mcp.repository'
import type { McpDomain, McpServerRow, McpServerSummary } from '../types/mcp.types'
import { McpToolService } from './mcp-tool.service'

@Injectable()
export class McpConfigService {
  private readonly logger = new Logger(McpConfigService.name)

  constructor(
    private readonly toolService: McpToolService,
    private readonly repository: McpRepository,
  ) {}

  async addServer(
    supabase: SupabaseClient,
    projectId: string,
    userId: string,
    opts: { name: string; url: string; description?: string; domain?: McpDomain; apiKey?: string },
  ): Promise<{
    server: McpServerRow
    testResult: { ok: boolean; toolCount: number; error?: string }
  }> {
    let vaultSecretId: string | null = null

    if (opts.apiKey) {
      const { id, errorMessage } = await this.repository.createVaultSecret(supabase, {
        userId,
        name: opts.name,
        url: opts.url,
        apiKey: opts.apiKey,
      })

      if (errorMessage) throw new Error(`Failed to store API key: ${errorMessage}`)
      vaultSecretId = id
    }

    const testResult = await this.toolService.testConnection(opts.url, opts.apiKey ?? null)

    const { server, errorMessage } = await this.repository.createServer(supabase, {
      projectId,
      name: opts.name,
      description: opts.description ?? null,
      url: opts.url,
      vaultSecretId,
      domain: opts.domain ?? 'universal',
      lastConnectedAt: testResult.ok ? new Date().toISOString() : null,
    })

    if (errorMessage || !server) {
      throw new Error(`Failed to create MCP server: ${errorMessage ?? 'No server returned'}`)
    }

    if (testResult.ok) {
      const tools = await this.toolService.listTools(server, supabase, opts.apiKey ?? null)
      server.cached_tools = tools
    }

    return { server, testResult }
  }

  async removeServer(supabase: SupabaseClient, serverId: string): Promise<void> {
    const vaultSecretId = await this.repository.getServerVaultSecretId(supabase, serverId)
    const errorMessage = await this.repository.deleteServer(supabase, serverId)

    if (errorMessage) throw new Error(`Failed to delete MCP server: ${errorMessage}`)

    if (vaultSecretId) {
      await this.repository.deleteVaultSecret(supabase, vaultSecretId)
    }
  }

  async listServers(supabase: SupabaseClient, projectId: string): Promise<McpServerSummary[]> {
    const { servers, errorMessage } = await this.repository.listServers(supabase, projectId)

    if (errorMessage) throw new Error(`Failed to list MCP servers: ${errorMessage}`)

    return servers.map((row: McpServerRow) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      server_url: row.server_url,
      domain: row.domain,
      agent_enabled: row.agent_enabled,
      enabled: row.enabled,
      tool_count: Array.isArray(row.cached_tools) ? row.cached_tools.length : 0,
      last_connected_at: row.last_connected_at,
    }))
  }

  async getServer(supabase: SupabaseClient, serverId: string): Promise<McpServerRow | null> {
    return this.repository.getServer(supabase, serverId)
  }

  async getServerByName(
    supabase: SupabaseClient,
    projectId: string,
    name: string,
  ): Promise<McpServerRow | null> {
    return this.repository.getServerByName(supabase, projectId, name)
  }

  async updateAgentEnabled(
    supabase: SupabaseClient,
    serverId: string,
    agentEnabled: boolean,
  ): Promise<void> {
    const errorMessage = await this.repository.updateAgentEnabled(supabase, serverId, agentEnabled)

    if (errorMessage) throw new Error(`Failed to update MCP server: ${errorMessage}`)
  }

  async getAuthToken(supabase: SupabaseClient, server: McpServerRow): Promise<string | null> {
    if (!server.vault_secret_id) return null

    return this.repository.getAuthToken(supabase, server.vault_secret_id)
  }

  async getEnabledServersForAgent(
    supabase: SupabaseClient,
    projectId: string,
    agentDomain?: string | null,
    unrestricted?: boolean,
  ): Promise<McpServerRow[]> {
    const { servers, errorMessage } = await this.repository.listEnabledServersForAgent(
      supabase,
      projectId,
    )

    if (errorMessage) return []

    if (unrestricted) return servers

    return servers.filter(
      (s: McpServerRow) =>
        s.domain === 'shared' || s.domain === 'universal' || s.domain === agentDomain,
    )
  }
}
