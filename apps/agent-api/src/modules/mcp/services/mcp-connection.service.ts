import { createHash } from 'crypto'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'

interface ConnectOptions {
  serverUrl: string
  authToken?: string | null
}

interface ActiveConnection {
  client: Client
  connectedAt: number
  healthy: boolean
}

const CONNECTION_TTL_MS = 60_000

function normalizeBearerToken(authToken: string | null | undefined): string | null {
  const token = authToken
    ?.trim()
    .replace(/^Authorization\s*:\s*/i, '')
    .replace(/^(Bearer\s+)+/i, '')
    .trim()
  return token || null
}

@Injectable()
export class McpConnectionService implements OnModuleDestroy {
  private readonly logger = new Logger(McpConnectionService.name)
  private readonly pool = new Map<string, ActiveConnection>()

  isHealthy(serverUrl: string): boolean {
    return [...this.pool.entries()].some(
      ([key, connection]) => key.startsWith(`${serverUrl}#`) && connection.healthy,
    )
  }

  async connect(opts: ConnectOptions): Promise<Client> {
    const poolKey = this.poolKey(opts.serverUrl, opts.authToken)
    const cached = this.pool.get(poolKey)
    const fresh = cached && cached.healthy && Date.now() - cached.connectedAt < CONNECTION_TTL_MS
    if (fresh) {
      return cached.client
    }

    if (cached) {
      await this.closeQuietly(cached.client)
      this.pool.delete(poolKey)
    }

    const headers: Record<string, string> = {}
    const token = normalizeBearerToken(opts.authToken)
    if (token) headers['Authorization'] = `Bearer ${token}`

    const url = new URL(opts.serverUrl)
    const { Client: McpClient } = await import('@modelcontextprotocol/sdk/client/index.js')
    const client = new McpClient({ name: 'vibey-mcp-client', version: '1.0.0' })

    const wireLifecycle = () => {
      client.onerror = (err: Error) => {
        this.logger.warn(`MCP transport error ${opts.serverUrl}: ${err.message}`)
        this.markUnhealthy(poolKey)
      }
      client.onclose = () => {
        this.logger.warn(`MCP connection closed ${opts.serverUrl}`)
        this.markUnhealthy(poolKey)
      }
    }

    try {
      const { StreamableHTTPClientTransport } =
        await import('@modelcontextprotocol/sdk/client/streamableHttp.js')
      const transport = new StreamableHTTPClientTransport(url, {
        requestInit: { headers },
      })
      await client.connect(transport)
    } catch {
      this.logger.warn(`StreamableHTTP failed for ${opts.serverUrl}, falling back to SSE`)
      const { SSEClientTransport } = await import('@modelcontextprotocol/sdk/client/sse.js')
      const sseTransport = new SSEClientTransport(url, {
        requestInit: { headers },
      })
      await client.connect(sseTransport)
    }

    wireLifecycle()
    this.pool.set(poolKey, {
      client,
      connectedAt: Date.now(),
      healthy: true,
    })
    return client
  }

  private markUnhealthy(poolKey: string): void {
    const entry = this.pool.get(poolKey)
    if (entry) entry.healthy = false
  }

  async disconnect(serverUrl: string): Promise<void> {
    const matches = [...this.pool.entries()].filter(([key]) => key.startsWith(`${serverUrl}#`))
    for (const [key, cached] of matches) {
      await this.closeQuietly(cached.client)
      this.pool.delete(key)
    }
  }

  async disconnectAll(): Promise<void> {
    for (const [, conn] of this.pool) {
      await this.closeQuietly(conn.client)
    }
    this.pool.clear()
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnectAll()
  }

  private async closeQuietly(client: Client): Promise<void> {
    try {
      await client.close()
    } catch (err) {
      this.logger.warn(`Error closing MCP client: ${err}`)
    }
  }

  private poolKey(serverUrl: string, authToken: string | null | undefined): string {
    const fingerprint = createHash('sha256')
      .update(authToken ?? '')
      .digest('hex')
      .slice(0, 16)
    return `${serverUrl}#${fingerprint}`
  }
}
