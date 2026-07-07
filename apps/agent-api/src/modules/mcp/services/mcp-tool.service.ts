import type {
  ErrorCode as ErrorCodeType,
  McpError as McpErrorType,
} from '@modelcontextprotocol/sdk/types.js'
import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { McpRepository } from '../repositories/mcp.repository'
import type {
  McpCachedResource,
  McpCachedTool,
  McpResourceReadResult,
  McpServerRow,
  McpToolCallResult,
} from '../types/mcp.types'
import { McpConnectionService } from './mcp-connection.service'

const LIST_TOOLS_TIMEOUT_MS = 30_000
const CALL_TOOL_TIMEOUT_MS = 60_000
const LIST_RESOURCES_TIMEOUT_MS = 30_000
const READ_RESOURCE_TIMEOUT_MS = 60_000

type McpTypes = typeof import('@modelcontextprotocol/sdk/types.js')
let _mcpTypes: McpTypes | undefined
async function loadMcpTypes(): Promise<McpTypes> {
  if (!_mcpTypes) _mcpTypes = await import('@modelcontextprotocol/sdk/types.js')
  return _mcpTypes
}

@Injectable()
export class McpToolService {
  private readonly logger = new Logger(McpToolService.name)

  constructor(
    private readonly connectionService: McpConnectionService,
    private readonly repository: McpRepository,
  ) {}

  async listTools(
    server: McpServerRow,
    supabase: SupabaseClient,
    authToken?: string | null,
    listTimeoutMs: number = LIST_TOOLS_TIMEOUT_MS,
  ): Promise<McpCachedTool[]> {
    const runList = async (): Promise<McpCachedTool[]> => {
      const client = await this.connectionService.connect({
        serverUrl: server.server_url,
        authToken,
      })
      const result = await client.listTools({}, { timeout: listTimeoutMs })
      return result.tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as Record<string, unknown> | undefined,
      }))
    }

    try {
      const tools = await runList()
      await this.persistTools(supabase, server.id, tools)
      return tools
    } catch (err) {
      const { McpError, ErrorCode } = await loadMcpTypes()
      if (err instanceof McpError && err.code === ErrorCode.ConnectionClosed) {
        await this.connectionService.disconnect(server.server_url)
        const tools = await runList()
        await this.persistTools(supabase, server.id, tools)
        return tools
      }
      this.logMcpFailure('listTools', server.server_url, err)
      throw err
    }
  }

  private async persistTools(
    supabase: SupabaseClient,
    serverId: string,
    tools: McpCachedTool[],
  ): Promise<void> {
    await this.repository.persistTools(supabase, serverId, tools)
  }

  async listResources(
    server: McpServerRow,
    supabase: SupabaseClient,
    authToken?: string | null,
    listTimeoutMs: number = LIST_RESOURCES_TIMEOUT_MS,
  ): Promise<McpCachedResource[]> {
    const runList = async (): Promise<McpCachedResource[]> => {
      const client = await this.connectionService.connect({
        serverUrl: server.server_url,
        authToken,
      })
      const aggregated: McpCachedResource[] = []
      let cursor: string | undefined
      do {
        const result = await client.listResources(cursor ? { cursor } : {}, {
          timeout: listTimeoutMs,
        })
        for (const r of result.resources) {
          aggregated.push({
            uri: r.uri,
            name: r.name,
            description: r.description,
            mimeType: r.mimeType,
          })
        }
        cursor = result.nextCursor
      } while (cursor)
      return aggregated
    }

    try {
      const resources = await runList()
      await this.repository.persistResources(supabase, server.id, resources)
      return resources
    } catch (err) {
      const { McpError, ErrorCode } = await loadMcpTypes()
      if (err instanceof McpError && err.code === ErrorCode.ConnectionClosed) {
        await this.connectionService.disconnect(server.server_url)
        const resources = await runList()
        await this.repository.persistResources(supabase, server.id, resources)
        return resources
      }
      this.logMcpFailure('listResources', server.server_url, err)
      throw err
    }
  }

  async readResource(
    server: McpServerRow,
    uri: string,
    authToken?: string | null,
    readTimeoutMs: number = READ_RESOURCE_TIMEOUT_MS,
  ): Promise<McpResourceReadResult> {
    const runRead = async (): Promise<McpResourceReadResult> => {
      const client = await this.connectionService.connect({
        serverUrl: server.server_url,
        authToken,
      })
      const result = await client.readResource({ uri }, { timeout: readTimeoutMs })
      return {
        contents: (result.contents ?? []) as Array<Record<string, unknown>>,
      }
    }

    try {
      return await runRead()
    } catch (err) {
      const { McpError, ErrorCode } = await loadMcpTypes()
      if (err instanceof McpError && err.code === ErrorCode.ConnectionClosed) {
        await this.connectionService.disconnect(server.server_url)
        return await runRead()
      }
      this.logMcpFailure('readResource', server.server_url, err)
      throw err
    }
  }

  async callTool(
    server: McpServerRow,
    toolName: string,
    args: Record<string, unknown>,
    authToken?: string | null,
    callTimeoutMs: number = CALL_TOOL_TIMEOUT_MS,
  ): Promise<McpToolCallResult> {
    const runCall = async (): Promise<McpToolCallResult> => {
      const client = await this.connectionService.connect({
        serverUrl: server.server_url,
        authToken,
      })
      const result = await client.callTool({ name: toolName, arguments: args }, undefined, {
        timeout: callTimeoutMs,
      })
      return {
        content: (result.content ?? []) as McpToolCallResult['content'],
        isError: result.isError === true,
        structuredContent: result.structuredContent,
      }
    }

    try {
      return await runCall()
    } catch (err) {
      const { McpError, ErrorCode } = await loadMcpTypes()
      if (err instanceof McpError && err.code === ErrorCode.ConnectionClosed) {
        await this.connectionService.disconnect(server.server_url)
        return await runCall()
      }
      if (err instanceof McpError && err.code === ErrorCode.RequestTimeout) {
        this.logger.warn(`MCP callTool timeout ${server.server_url} tool=${toolName}`)
        throw err
      }
      if (err instanceof McpError && err.code === ErrorCode.MethodNotFound) {
        this.logger.warn(`MCP tool not found ${server.server_url} tool=${toolName}`)
        throw err
      }
      this.logMcpFailure('callTool', server.server_url, err)
      throw err
    }
  }

  private logMcpFailure(op: string, serverUrl: string, err: unknown): void {
    const McpError = _mcpTypes?.McpError
    if (McpError && err instanceof McpError) {
      this.logger.warn(`MCP ${op} ${serverUrl} code=${err.code} message=${err.message}`)
    }
  }

  async testConnection(
    serverUrl: string,
    authToken?: string | null,
  ): Promise<{ ok: boolean; toolCount: number; error?: string }> {
    try {
      const client = await this.connectionService.connect({ serverUrl, authToken })
      const result = await client.listTools({}, { timeout: LIST_TOOLS_TIMEOUT_MS })
      await this.connectionService.disconnect(serverUrl)
      return { ok: true, toolCount: result.tools.length }
    } catch (err) {
      return { ok: false, toolCount: 0, error: err instanceof Error ? err.message : String(err) }
    }
  }
}
