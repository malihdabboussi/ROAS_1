import { Injectable, Logger } from '@nestjs/common'
import { McpConfigService } from '../../mcp/services/mcp-config.service'
import { McpToolService } from '../../mcp/services/mcp-tool.service'
import { ArtifactMcpRepository } from '../repositories/artifact-mcp.repository'
import {
  parseConversationIdFromSessionKey,
  type ArtifactActionHandler,
} from './artifact-action.registry'
import type { ArtifactCapabilityPolicy } from './artifact-capability.policy'
import {
  extractFulfillmentDraftId,
  isFulfillmentCreateTool,
  stampConversationIntoFulfillmentArgs,
  stampDraftConversationViaApi,
} from './artifact-mcp-fulfillment-stamp'

@Injectable()
export class ArtifactMcpService {
  private readonly logger = new Logger(ArtifactMcpService.name)

  constructor(
    private readonly mcpConfig: McpConfigService,
    private readonly mcpTool: McpToolService,
    private readonly artifactMcpRepository: ArtifactMcpRepository = new ArtifactMcpRepository(),
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      list_mcp_servers: (data, sessionKey) => this.listMcpServers(target, data, sessionKey),
      list_mcp_tools: (data, sessionKey) => this.listMcpTools(target, data, sessionKey),
      use_mcp_tool: (data, sessionKey, onProgress) =>
        this.useMcpTool(target, data, sessionKey, onProgress),
      add_mcp_server: (data, sessionKey) => this.addMcpServer(target, data, sessionKey),
      remove_mcp_server: (data, sessionKey) => this.removeMcpServer(target, data, sessionKey),
      list_mcp_resources: (data, sessionKey) => this.listMcpResources(target, data, sessionKey),
      read_mcp_resource: (data, sessionKey) => this.readMcpResource(target, data, sessionKey),
    }
  }

  private async listMcpServers(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const projectId = await this.resolveProjectId(supabase)
    if (!projectId) return { success: false, error: 'No project context' }

    const servers = await this.mcpConfig.listServers(supabase, projectId)
    return { success: true, servers }
  }

  private async listMcpTools(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const projectId = await this.resolveProjectId(supabase)
    if (!projectId) return { success: false, error: 'No project context' }

    const serverName = String(input.server_name ?? '').trim()
    const serverId = String(input.server_id ?? '').trim()

    let server = serverId
      ? await this.mcpConfig.getServer(supabase, serverId)
      : serverName
        ? await this.mcpConfig.getServerByName(supabase, projectId, serverName)
        : null

    if (!server) return { success: false, error: 'MCP server not found' }
    if (!server.enabled) return { success: false, error: 'MCP server is disabled' }

    const policy = this.resolvePolicy(target, sessionKey)
    if (!this.isServerAccessible(server, policy)) {
      return { success: false, error: 'Access denied to this MCP server' }
    }

    const authToken = await this.mcpConfig.getAuthToken(supabase, server)
    const tools = await this.mcpTool.listTools(server, supabase, authToken)
    return { success: true, server_name: server.name, tools }
  }

  private async useMcpTool(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
    onProgress?: (message: string) => void | Promise<void>,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const projectId = await this.resolveProjectId(supabase)
    if (!projectId) return { success: false, error: 'No project context' }

    const serverName = String(input.server_name ?? '').trim()
    const serverId = String(input.server_id ?? '').trim()
    const toolName = String(input.tool_name ?? input.tool ?? '').trim()
    let toolArgs = (input.arguments ?? input.args ?? {}) as Record<string, unknown>

    if (!toolName) return { success: false, error: 'tool_name is required' }

    let server = serverId
      ? await this.mcpConfig.getServer(supabase, serverId)
      : serverName
        ? await this.mcpConfig.getServerByName(supabase, projectId, serverName)
        : null

    if (!server) return { success: false, error: 'MCP server not found' }
    if (!server.enabled || !server.agent_enabled) {
      return { success: false, error: 'MCP server is disabled' }
    }

    const policy = this.resolvePolicy(target, sessionKey)
    if (!this.isServerAccessible(server, policy)) {
      return { success: false, error: 'Access denied to this MCP server' }
    }

    const conversationId =
      typeof target.parseConversationId === 'function'
        ? ((target.parseConversationId(sessionKey) as string | null) ?? null)
        : parseConversationIdFromSessionKey(sessionKey)
    const shouldStampFulfillment = isFulfillmentCreateTool(toolName) && Boolean(conversationId)
    if (shouldStampFulfillment && conversationId) {
      toolArgs = stampConversationIntoFulfillmentArgs(toolArgs, conversationId)
    }

    if (onProgress) await onProgress(`Calling ${toolName} on ${server.name}...`)

    const authToken = await this.mcpConfig.getAuthToken(supabase, server)
    const result = await this.mcpTool.callTool(server, toolName, toolArgs, authToken)

    if (result.isError) {
      const errorText = result.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('\n')
      return { success: false, error: errorText || 'MCP tool call failed' }
    }

    const textContent = result.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n')
    const payload = result.structuredContent ?? textContent

    if (shouldStampFulfillment && conversationId) {
      const draftId = extractFulfillmentDraftId(payload)
      if (draftId) {
        const stamped = await stampDraftConversationViaApi({
          draftId,
          conversationId,
        })
        if (!stamped.ok) {
          this.logger.warn(
            `Fulfillment conversation stamp missed draft=${draftId} status=${stamped.status ?? 'n/a'}`,
          )
        }
      }
    }

    return {
      success: true,
      server_name: server.name,
      tool_name: toolName,
      result: payload,
    }
  }

  private async addMcpServer(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const projectId = await this.resolveProjectId(supabase)
    if (!projectId) return { success: false, error: 'No project context' }

    const name = String(input.name ?? '').trim()
    const url = String(input.url ?? input.server_url ?? '').trim()
    if (!name) return { success: false, error: 'name is required' }
    if (!url) return { success: false, error: 'url is required' }

    const description = input.description ? String(input.description) : undefined
    const domain = input.domain ? String(input.domain) : undefined
    const apiKey = input.api_key ? String(input.api_key) : undefined

    const { server, testResult } = await this.mcpConfig.addServer(supabase, projectId, userId, {
      name,
      url,
      description,
      domain: domain as any,
      apiKey,
    })

    return {
      success: true,
      server: { id: server.id, name: server.name, url: server.server_url },
      connection_test: testResult,
    }
  }

  private async removeMcpServer(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)

    const serverId = String(input.server_id ?? '').trim()
    if (!serverId) return { success: false, error: 'server_id is required' }

    await this.mcpConfig.removeServer(supabase, serverId)
    return { success: true }
  }

  private async listMcpResources(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const projectId = await this.resolveProjectId(supabase)
    if (!projectId) return { success: false, error: 'No project context' }

    const serverName = String(input.server_name ?? '').trim()
    const serverId = String(input.server_id ?? '').trim()

    let server = serverId
      ? await this.mcpConfig.getServer(supabase, serverId)
      : serverName
        ? await this.mcpConfig.getServerByName(supabase, projectId, serverName)
        : null

    if (!server) return { success: false, error: 'MCP server not found' }
    if (!server.enabled) return { success: false, error: 'MCP server is disabled' }

    const policy = this.resolvePolicy(target, sessionKey)
    if (!this.isServerAccessible(server, policy)) {
      return { success: false, error: 'Access denied to this MCP server' }
    }

    const authToken = await this.mcpConfig.getAuthToken(supabase, server)
    const resources = await this.mcpTool.listResources(server, supabase, authToken)
    return { success: true, server_name: server.name, resources }
  }

  private async readMcpResource(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const projectId = await this.resolveProjectId(supabase)
    if (!projectId) return { success: false, error: 'No project context' }

    const serverName = String(input.server_name ?? '').trim()
    const serverId = String(input.server_id ?? '').trim()
    const uri = String(input.uri ?? '').trim()
    if (!uri) return { success: false, error: 'uri is required' }

    let server = serverId
      ? await this.mcpConfig.getServer(supabase, serverId)
      : serverName
        ? await this.mcpConfig.getServerByName(supabase, projectId, serverName)
        : null

    if (!server) return { success: false, error: 'MCP server not found' }
    if (!server.enabled || !server.agent_enabled) {
      return { success: false, error: 'MCP server is disabled' }
    }

    const policy = this.resolvePolicy(target, sessionKey)
    if (!this.isServerAccessible(server, policy)) {
      return { success: false, error: 'Access denied to this MCP server' }
    }

    const authToken = await this.mcpConfig.getAuthToken(supabase, server)
    const result = await this.mcpTool.readResource(server, uri, authToken)
    return { success: true, server_name: server.name, uri, contents: result.contents }
  }

  private async resolveProjectId(supabase: any): Promise<string | null> {
    return (
      (await this.artifactMcpRepository.findFirstEnabledMcpProjectId(supabase)) ??
      this.artifactMcpRepository.findFirstProjectId(supabase)
    )
  }

  private resolvePolicy(
    target: Record<string, any>,
    sessionKey?: string,
  ): ArtifactCapabilityPolicy | null {
    try {
      return target.authzService?.resolveSessionPolicy?.(target, sessionKey) ?? null
    } catch {
      return null
    }
  }

  private isServerAccessible(
    server: { domain: string },
    policy: ArtifactCapabilityPolicy | null,
  ): boolean {
    if (!policy) return true
    if (policy.domain === 'support') return false
    if (policy.profile === 'vibey_ceo') return true
    if (policy.domain === 'management') return true
    return (
      server.domain === 'shared' || server.domain === 'universal' || server.domain === policy.domain
    )
  }
}
