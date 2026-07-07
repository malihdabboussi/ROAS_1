import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { Injectable, Logger } from '@nestjs/common'
import { assertMcpServerUrlAllowed } from '../mcp-url-security'

const PROBE_LIST_TOOLS_TIMEOUT_MS = 30_000
const PROBE_LIST_RESOURCES_TIMEOUT_MS = 30_000

function normalizeBearerToken(authToken: string | null | undefined): string | null {
  const token = authToken
    ?.trim()
    .replace(/^Authorization\s*:\s*/i, '')
    .replace(/^(Bearer\s+)+/i, '')
    .trim()
  return token || null
}

export type McpProbeCachedTool = {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export type McpProbeCachedResource = {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

@Injectable()
export class McpProbeService {
  private readonly logger = new Logger(McpProbeService.name)

  async testListTools(
    serverUrl: string,
    authToken?: string | null,
  ): Promise<{ ok: boolean; tool_count: number; error?: string }> {
    const result = await this.connectAndRun(serverUrl, authToken, async (client) => {
      const r = await client.listTools({}, { timeout: PROBE_LIST_TOOLS_TIMEOUT_MS })
      return r.tools.length
    })
    if (result.success) return { ok: true, tool_count: result.value }
    return { ok: false, tool_count: 0, error: result.error }
  }

  async refreshToolsAndResources(
    serverUrl: string,
    authToken?: string | null,
  ): Promise<{
    ok: boolean
    tools: McpProbeCachedTool[]
    resources: McpProbeCachedResource[]
    error?: string
  }> {
    const result = await this.connectAndRun(serverUrl, authToken, async (client) => {
      const toolsResult = await client.listTools({}, { timeout: PROBE_LIST_TOOLS_TIMEOUT_MS })
      const tools: McpProbeCachedTool[] = toolsResult.tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as Record<string, unknown> | undefined,
      }))

      let resources: McpProbeCachedResource[] = []
      try {
        let cursor: string | undefined
        do {
          const rr = await client.listResources(cursor ? { cursor } : {}, {
            timeout: PROBE_LIST_RESOURCES_TIMEOUT_MS,
          })
          for (const res of rr.resources) {
            resources.push({
              uri: res.uri,
              name: res.name,
              description: res.description,
              mimeType: res.mimeType,
            })
          }
          cursor = rr.nextCursor
        } while (cursor)
      } catch {
        resources = []
      }

      return { tools, resources }
    })

    if (result.success) return { ok: true, ...result.value }
    return { ok: false, tools: [], resources: [], error: result.error }
  }

  private async connectAndRun<T>(
    serverUrl: string,
    authToken: string | null | undefined,
    fn: (client: Client) => Promise<T>,
  ): Promise<{ success: true; value: T } | { success: false; error: string }> {
    const headers: Record<string, string> = {}
    const token = normalizeBearerToken(authToken)
    if (token) headers['Authorization'] = `Bearer ${token}`

    let url: URL
    try {
      url = await assertMcpServerUrlAllowed(serverUrl)
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
    const client = new Client({ name: 'vibey-mcp-probe', version: '1.0.0' })

    try {
      try {
        const transport = new StreamableHTTPClientTransport(url, {
          requestInit: { headers },
        })
        await client.connect(transport)
      } catch {
        this.logger.warn(`StreamableHTTP probe failed for ${serverUrl}, falling back to SSE`)
        const sseTransport = new SSEClientTransport(url, {
          requestInit: { headers },
        })
        await client.connect(sseTransport)
      }

      const value = await fn(client)
      await client.close()
      return { success: true, value }
    } catch (err) {
      await client.close().catch(() => {})
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }
}
