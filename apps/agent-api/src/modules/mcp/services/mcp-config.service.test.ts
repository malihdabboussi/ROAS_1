import { describe, expect, it, vi } from 'vitest'
import { McpRepository } from '../repositories/mcp.repository'
import { McpConfigService } from './mcp-config.service'

function makeQuery(result: { data?: unknown; error?: { message: string } | null } = {}) {
  const query: Record<string, any> = {}
  query.insert = vi.fn(() => query)
  query.select = vi.fn(() => query)
  query.single = vi.fn(async () => ({ data: result.data ?? null, error: result.error ?? null }))
  query.eq = vi.fn(() => query)
  query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve({ data: result.data ?? null, error: result.error ?? null }).then(
      resolve,
      reject,
    )
  return query
}

function makeSupabase(queries: Record<string, Array<Record<string, any>>>) {
  return {
    from: vi.fn((table: string) => {
      const query = queries[table]?.shift()
      if (!query) throw new Error(`Unexpected table query: ${table}`)
      return query
    }),
  }
}

describe('McpConfigService', () => {
  it('stores API keys, creates the MCP server row, and refreshes cached tools on success', async () => {
    const toolService = {
      testConnection: vi.fn(async () => ({ ok: true, toolCount: 1 })),
      listTools: vi.fn(async () => [{ name: 'search', description: 'Search docs' }]),
    }
    const service = new McpConfigService(toolService as never, new McpRepository())
    const secretQuery = makeQuery({ data: { id: 'secret-1' } })
    const serverRow = {
      id: 'server-1',
      project_id: 'project-1',
      name: 'docs',
      description: 'Docs MCP',
      server_url: 'https://example.com/mcp',
      vault_secret_id: 'secret-1',
      domain: 'developer',
      enabled: true,
      agent_enabled: true,
      cached_tools: [],
      last_connected_at: null,
    }
    const serverQuery = makeQuery({ data: serverRow })
    const supabase = makeSupabase({
      vault_secrets: [secretQuery],
      project_mcp_servers: [serverQuery],
    })

    const result = await service.addServer(supabase as never, 'project-1', 'user-1', {
      name: 'docs',
      url: 'https://example.com/mcp',
      description: 'Docs MCP',
      domain: 'developer',
      apiKey: 'secret-token',
    })

    expect(secretQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        provider: 'mcp',
        label: 'docs',
        encrypted_value: 'secret-token',
      }),
    )
    expect(serverQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 'project-1',
        name: 'docs',
        server_url: 'https://example.com/mcp',
        vault_secret_id: 'secret-1',
        domain: 'developer',
      }),
    )
    expect(toolService.testConnection).toHaveBeenCalledWith(
      'https://example.com/mcp',
      'secret-token',
    )
    expect(toolService.listTools).toHaveBeenCalledWith(serverRow, supabase, 'secret-token')
    expect(result.server.cached_tools).toEqual([{ name: 'search', description: 'Search docs' }])
  })

  it('makes shared MCP servers available across agent domains', async () => {
    const servers = [
      { id: 'shared', domain: 'shared' },
      { id: 'matching', domain: 'marketing' },
      { id: 'other', domain: 'developer' },
    ]
    const repository = {
      listEnabledServersForAgent: vi.fn(async () => ({
        servers,
        errorMessage: null,
      })),
    }
    const service = new McpConfigService({} as never, repository as never)

    const result = await service.getEnabledServersForAgent({} as never, 'project-1', 'marketing')

    expect(result.map((server) => server.id)).toEqual(['shared', 'matching'])
  })
})
