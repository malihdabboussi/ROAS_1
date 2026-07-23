import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { OrgScopeService, type RequestScope } from '@vibey/api-shared'
import { checkMcpReachability } from '../mcp-url-security'
import { McpServersRepository } from '../repositories/mcp-servers.repository'
import { McpProbeService } from './mcp-probe.service'

function normalizeMcpApiKey(apiKey: string | null | undefined): string | null {
  const token = apiKey
    ?.trim()
    .replace(/^Authorization\s*:\s*/i, '')
    .replace(/^(Bearer\s+)+/i, '')
    .trim()
  return token || null
}

@Injectable()
export class McpServersService {
  constructor(
    private readonly orgScope: OrgScopeService,
    private readonly mcpProbe: McpProbeService,
    private readonly mcpServersRepository: McpServersRepository,
  ) {}

  async listServers(supabase: SupabaseClient, scope: RequestScope) {
    const project = await this.resolveProject(supabase, scope)
    if (!project) return { success: true, servers: [] }

    const { data, error } = await this.mcpServersRepository.listServers(supabase, project.id)

    if (error) return { success: false, error: error.message }

    const servers = (data ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      server_url: row.server_url,
      domain: row.domain,
      agent_enabled: row.agent_enabled,
      enabled: row.enabled,
      tool_count: Array.isArray(row.cached_tools) ? row.cached_tools.length : 0,
      resource_count: Array.isArray(row.cached_resources) ? row.cached_resources.length : 0,
      cached_tools: row.cached_tools,
      cached_resources: row.cached_resources,
      last_connected_at: row.last_connected_at,
    }))

    return { success: true, servers }
  }

  async addServer(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    body: { name: string; url: string; description?: string; domain?: string; api_key?: string },
  ) {
    const project = await this.resolveProject(supabase, scope)
    if (!project) return { success: false, error: 'No project found' }

    const reachability = await checkMcpReachability(body.url)
    if (reachability.blocked) {
      return { success: false, error: reachability.error ?? 'Blocked MCP server URL' }
    }
    const apiKey = normalizeMcpApiKey(body.api_key)

    let vaultSecretId: string | null = null
    if (apiKey) {
      const { data: existing } = await this.mcpServersRepository.findVaultSecret(supabase, {
        userId: user.id,
        label: body.name,
      })

      if (existing) {
        const { error: updErr } = await this.mcpServersRepository.updateVaultSecret(
          supabase,
          existing.id,
          {
            encrypted_value: apiKey,
            org_id: scope.orgId ?? null,
            metadata: { server_url: body.url },
          },
        )
        if (updErr) return { success: false, error: `Failed to update API key: ${updErr.message}` }
        vaultSecretId = existing.id
      } else {
        const { data: secret, error: vaultErr } = await this.mcpServersRepository.insertVaultSecret(
          supabase,
          {
            user_id: user.id,
            org_id: scope.orgId ?? null,
            provider: 'mcp',
            label: body.name,
            secret_type: 'api_key',
            encrypted_value: apiKey,
            metadata: { server_url: body.url },
          },
        )
        if (vaultErr)
          return { success: false, error: `Failed to store API key: ${vaultErr.message}` }
        vaultSecretId = secret.id
      }
    }

    const { data: server, error } = await this.mcpServersRepository.insertServer(supabase, {
      project_id: project.id,
      name: body.name,
      description: body.description ?? null,
      server_url: body.url,
      vault_secret_id: vaultSecretId,
      domain: body.domain ?? 'shared',
    })

    if (error) return { success: false, error: error.message }

    const token = await this.getVaultApiKey(supabase, vaultSecretId)
    const probe = await this.mcpProbe
      .refreshToolsAndResources(server.server_url, token)
      .catch(() => null)
    if (probe?.ok) {
      await this.mcpServersRepository.updateCachedTools(supabase, server.id, {
        cached_tools: probe.tools,
        cached_resources: probe.resources,
        last_connected_at: new Date().toISOString(),
      })
    }

    const connection_status = probe?.ok
      ? 'connected'
      : reachability.reachable
        ? 'reachable'
        : 'unreachable'

    return {
      success: true,
      server: {
        ...server,
        cached_tools: probe?.ok ? probe.tools : server.cached_tools,
        cached_resources: probe?.ok ? probe.resources : server.cached_resources,
      },
      connection_status,
      tool_count: probe?.ok ? probe.tools.length : 0,
      reachability_error: reachability.error,
    }
  }

  async ensureServer(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    body: {
      name: string
      url: string
      description?: string
      domain?: string
      api_key?: string
      agent_enabled?: boolean
    },
  ) {
    const project = await this.resolveProject(supabase, scope)
    if (!project) return { success: false, error: 'No project found' }

    const reachability = await checkMcpReachability(body.url)
    if (reachability.blocked) {
      return { success: false, error: reachability.error ?? 'Blocked MCP server URL' }
    }

    const { data: existing, error: existingError } =
      await this.mcpServersRepository.findServerByUrl(supabase, project.id, body.url)
    if (existingError) return { success: false, error: existingError.message }
    if (!existing) {
      const created = await this.addServer(supabase, user, scope, body)
      const serverId =
        created.success && created.server && typeof created.server.id === 'string'
          ? created.server.id
          : null
      if (serverId) {
        await this.mcpServersRepository.updateServerFields(supabase, serverId, project.id, {
          enabled: true,
          agent_enabled: body.agent_enabled ?? true,
          domain: body.domain ?? 'shared',
        })
      }
      return created
    }

    const apiKey = normalizeMcpApiKey(body.api_key)
    let vaultSecretId = existing.vault_secret_id as string | null
    if (apiKey) {
      const { data: secret } = await this.mcpServersRepository.findVaultSecret(supabase, {
        userId: user.id,
        label: body.name,
      })
      if (secret) {
        const { error } = await this.mcpServersRepository.updateVaultSecret(supabase, secret.id, {
          encrypted_value: apiKey,
          org_id: scope.orgId ?? null,
          metadata: { server_url: body.url },
        })
        if (error) return { success: false, error: `Failed to update API key: ${error.message}` }
        vaultSecretId = secret.id
      } else {
        const { data: inserted, error } = await this.mcpServersRepository.insertVaultSecret(
          supabase,
          {
            user_id: user.id,
            org_id: scope.orgId ?? null,
            provider: 'mcp',
            label: body.name,
            secret_type: 'api_key',
            encrypted_value: apiKey,
            metadata: { server_url: body.url },
          },
        )
        if (error) return { success: false, error: `Failed to store API key: ${error.message}` }
        vaultSecretId = inserted.id
      }
    }

    const { error: updateError } = await this.mcpServersRepository.updateServerFields(
      supabase,
      existing.id,
      project.id,
      {
        name: body.name,
        description: body.description ?? existing.description,
        domain: body.domain ?? existing.domain ?? 'shared',
        enabled: true,
        agent_enabled: body.agent_enabled ?? true,
        vault_secret_id: vaultSecretId,
      },
    )
    if (updateError) return { success: false, error: updateError.message }

    const token = apiKey ?? (await this.getVaultApiKey(supabase, vaultSecretId))
    const probe = await this.mcpProbe.refreshToolsAndResources(body.url, token).catch(() => null)
    if (probe?.ok) {
      await this.mcpServersRepository.updateCachedTools(supabase, existing.id, {
        cached_tools: probe.tools,
        cached_resources: probe.resources,
        last_connected_at: new Date().toISOString(),
      })
    }
    return {
      success: true,
      server: { ...existing, vault_secret_id: undefined },
      connection_status: probe?.ok ? 'connected' : 'unreachable',
      tool_count: probe?.ok ? probe.tools.length : 0,
      updated_existing: true,
      reachability_error: probe?.ok ? undefined : reachability.error,
    }
  }

  async testServer(supabase: SupabaseClient, scope: RequestScope, serverId: string) {
    const project = await this.resolveProject(supabase, scope)
    if (!project) return { success: false, error: 'No project found' }

    const { data: row, error } = await this.mcpServersRepository.findServerConnection(
      supabase,
      serverId,
    )

    if (error) return { success: false, error: error.message }
    if (!row || row.project_id !== project.id) return { success: false, error: 'Server not found' }

    const token = await this.getVaultApiKey(supabase, row.vault_secret_id)
    const probe = await this.mcpProbe.testListTools(row.server_url, token)
    return {
      ok: probe.ok,
      tool_count: probe.tool_count,
      error: probe.error,
    }
  }

  async refreshServer(supabase: SupabaseClient, scope: RequestScope, serverId: string) {
    const project = await this.resolveProject(supabase, scope)
    if (!project) return { success: false, error: 'No project found' }

    const { data: row, error } = await this.mcpServersRepository.findServerConnection(
      supabase,
      serverId,
    )

    if (error) return { success: false, error: error.message }
    if (!row || row.project_id !== project.id) return { success: false, error: 'Server not found' }

    const token = await this.getVaultApiKey(supabase, row.vault_secret_id)
    const fullProbe = await this.mcpProbe.refreshToolsAndResources(row.server_url, token)
    if (!fullProbe.ok) {
      return { success: false, error: fullProbe.error ?? 'refresh_failed', tool_count: 0 }
    }

    const { error: updErr } = await this.mcpServersRepository.updateCachedTools(
      supabase,
      serverId,
      {
        cached_tools: fullProbe.tools,
        cached_resources: fullProbe.resources,
        last_connected_at: new Date().toISOString(),
      },
    )

    if (updErr) return { success: false, error: updErr.message }

    return {
      success: true,
      tool_count: fullProbe.tools.length,
      resource_count: fullProbe.resources.length,
    }
  }

  async removeServer(supabase: SupabaseClient, serverId: string, scope: RequestScope) {
    const project = await this.resolveProject(supabase, scope)
    if (!project) return { success: false, error: 'No project found' }

    const { data: server, error: loadError } = await this.mcpServersRepository.findServerForRemoval(
      supabase,
      serverId,
    )

    if (loadError) return { success: false, error: loadError.message }
    if (!server || server.project_id !== project.id) {
      return { success: false, error: 'Server not found' }
    }

    const { error } = await this.mcpServersRepository.deleteServer(supabase, serverId, project.id)

    if (error) return { success: false, error: error.message }

    if (server?.vault_secret_id) {
      await this.mcpServersRepository.deleteVaultSecret(supabase, server.vault_secret_id)
    }

    return { success: true }
  }

  async updateServer(
    supabase: SupabaseClient,
    serverId: string,
    body: {
      agent_enabled?: boolean
      enabled?: boolean
      domain?: string
      name?: string
      description?: string
    },
    scope: RequestScope,
  ) {
    const project = await this.resolveProject(supabase, scope)
    if (!project) return { success: false, error: 'No project found' }

    const { data: server, error: loadError } = await this.mcpServersRepository.findServerProject(
      supabase,
      serverId,
    )

    if (loadError) return { success: false, error: loadError.message }
    if (!server || server.project_id !== project.id) {
      return { success: false, error: 'Server not found' }
    }

    const updates: Record<string, unknown> = {}
    if (typeof body.agent_enabled === 'boolean') updates.agent_enabled = body.agent_enabled
    if (typeof body.enabled === 'boolean') updates.enabled = body.enabled
    if (body.domain) updates.domain = body.domain
    if (body.name) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description

    if (Object.keys(updates).length === 0) return { success: false, error: 'No updates' }

    const { error } = await this.mcpServersRepository.updateServerFields(
      supabase,
      serverId,
      project.id,
      updates,
    )

    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  private async resolveProject(
    supabase: SupabaseClient,
    scope: RequestScope,
  ): Promise<{ id: string } | null> {
    const base = this.mcpServersRepository.projectQuery(supabase)
    const q = this.orgScope.applyScope(base, scope)
    const { data } = await q.maybeSingle()
    return data ?? null
  }

  private async getVaultApiKey(supabase: SupabaseClient, vaultSecretId: string | null) {
    if (!vaultSecretId) return null
    const { data } = await this.mcpServersRepository.getVaultApiKey(supabase, vaultSecretId)
    return normalizeMcpApiKey(data?.encrypted_value)
  }
}
