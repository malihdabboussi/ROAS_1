import { describe, expect, it, vi } from 'vitest'
import { McpRepository } from '../repositories/mcp.repository'
import { McpToolService } from './mcp-tool.service'

function makeQuery(result: { data?: unknown; error?: { message: string } | null } = {}) {
  const query: Record<string, any> = {}
  query.update = vi.fn(() => query)
  query.eq = vi.fn(() => query)
  query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve({ data: result.data ?? null, error: result.error ?? null }).then(
      resolve,
      reject,
    )
  return query
}

describe('McpToolService', () => {
  it('lists tools through the MCP connection and persists the cache on the server row', async () => {
    const client = {
      listTools: vi.fn(async () => ({
        tools: [
          {
            name: 'search',
            description: 'Search docs',
            inputSchema: { type: 'object' },
          },
        ],
      })),
    }
    const connection = {
      connect: vi.fn(async () => client),
      disconnect: vi.fn(),
    }
    const service = new McpToolService(connection as never, new McpRepository())
    const updateQuery = makeQuery()
    const supabase = {
      from: vi.fn(() => updateQuery),
    }

    const tools = await service.listTools(
      {
        id: 'server-1',
        server_url: 'https://example.com/mcp',
      } as never,
      supabase as never,
      'secret-token',
    )

    expect(connection.connect).toHaveBeenCalledWith({
      serverUrl: 'https://example.com/mcp',
      authToken: 'secret-token',
    })
    expect(tools).toEqual([
      {
        name: 'search',
        description: 'Search docs',
        inputSchema: { type: 'object' },
      },
    ])
    expect(supabase.from).toHaveBeenCalledWith('project_mcp_servers')
    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        cached_tools: tools,
        last_connected_at: expect.any(String),
      }),
    )
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'server-1')
  })
})
