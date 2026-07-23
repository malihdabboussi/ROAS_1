import { describe, expect, it, vi } from 'vitest'
import type { RequestScope } from '@vibey/api-shared'
import { McpController } from './controllers/mcp.controller'
import { McpServersRepository } from './repositories/mcp-servers.repository'
import { McpServersService } from './services/mcp-servers.service'

const mcpUrlSecurityMocks = vi.hoisted(() => ({
  checkMcpReachability: vi.fn(),
}))

vi.mock('./mcp-url-security', () => mcpUrlSecurityMocks)

function createQuery(result: Record<string, unknown> = { data: null, error: null }) {
  const resolved = Promise.resolve(result)
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    eq: vi.fn(() => query),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    delete: vi.fn(() => query),
    update: vi.fn(() => query),
    insert: vi.fn(() => query),
  }
  query.then = resolved.then.bind(resolved)
  return query
}

function createController({
  orgScope = { applyScope: vi.fn((query) => query) },
  mcpProbe = {
    refreshToolsAndResources: vi.fn().mockResolvedValue({
      ok: true,
      tools: [{ name: 'search' }],
      resources: [{ uri: 'file://docs', name: 'Docs' }],
    }),
    testListTools: vi.fn().mockResolvedValue({ ok: true, tool_count: 1 }),
  },
}: {
  orgScope?: { applyScope: ReturnType<typeof vi.fn> }
  mcpProbe?: {
    refreshToolsAndResources: ReturnType<typeof vi.fn>
    testListTools: ReturnType<typeof vi.fn>
  }
} = {}) {
  const mcpServersService = new McpServersService(
    orgScope as never,
    mcpProbe as never,
    new McpServersRepository(),
  )
  return {
    controller: new McpController(mcpServersService),
    orgScope,
    mcpProbe,
  }
}

const scope: RequestScope = {
  userId: 'user-1',
  orgId: null,
  orgRole: null,
}

describe('McpController server mutations', () => {
  it('lists MCP servers for the resolved project with cached counts', async () => {
    const projectQuery = createQuery({ data: { id: 'project-1' }, error: null })
    const serversQuery = createQuery({
      data: [
        {
          id: 'server-1',
          name: 'Docs',
          description: 'Docs server',
          server_url: 'https://mcp.example.com',
          domain: 'shared',
          agent_enabled: true,
          enabled: true,
          cached_tools: [{ name: 'search' }],
          cached_resources: [{ uri: 'file://docs', name: 'Docs' }],
          last_connected_at: '2026-06-08T00:00:00Z',
        },
      ],
      error: null,
    })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'project_repos') return projectQuery
        if (table === 'project_mcp_servers') return serversQuery
        return createQuery()
      }),
    }
    const { controller } = createController()

    await expect(controller.listServers(supabase as never, scope)).resolves.toEqual({
      success: true,
      servers: [
        expect.objectContaining({
          id: 'server-1',
          tool_count: 1,
          resource_count: 1,
        }),
      ],
    })
    expect(projectQuery.select).toHaveBeenCalledWith('id')
    expect(serversQuery.eq).toHaveBeenCalledWith('project_id', 'project-1')
  })

  it('adds an MCP server, stores normalized API key, and refreshes cached tools', async () => {
    mcpUrlSecurityMocks.checkMcpReachability.mockResolvedValue({
      reachable: true,
      blocked: false,
      error: undefined,
    })
    const projectQuery = createQuery({ data: { id: 'project-1' }, error: null })
    const existingSecretQuery = createQuery({ data: null, error: null })
    const secretInsertQuery = createQuery({ data: { id: 'secret-1' }, error: null })
    const secretReadQuery = createQuery({
      data: { encrypted_value: 'Bearer token-1' },
      error: null,
    })
    const serverInsertQuery = createQuery({
      data: {
        id: 'server-1',
        name: 'Docs',
        server_url: 'https://mcp.example.com',
        cached_tools: [],
        cached_resources: [],
      },
      error: null,
    })
    const serverUpdateQuery = createQuery({ error: null })
    const vaultQueries = [existingSecretQuery, secretInsertQuery, secretReadQuery]
    const serverQueries = [serverInsertQuery, serverUpdateQuery]
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'project_repos') return projectQuery
        if (table === 'vault_secrets') return vaultQueries.shift() ?? createQuery()
        if (table === 'project_mcp_servers') return serverQueries.shift() ?? createQuery()
        return createQuery()
      }),
    }
    const { controller, mcpProbe } = createController()

    await expect(
      controller.addServer(
        supabase as never,
        { id: 'user-1' },
        { ...scope, orgId: 'org-1', orgRole: 'admin' },
        {
          name: 'Docs',
          url: 'https://mcp.example.com',
          api_key: 'Authorization: Bearer token-1',
        },
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        success: true,
        connection_status: 'connected',
        tool_count: 1,
      }),
    )
    expect(secretInsertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        org_id: 'org-1',
        encrypted_value: 'token-1',
      }),
    )
    expect(serverInsertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 'project-1',
        vault_secret_id: 'secret-1',
      }),
    )
    expect(mcpProbe.refreshToolsAndResources).toHaveBeenCalledWith(
      'https://mcp.example.com',
      'token-1',
    )
    expect(serverUpdateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        cached_tools: [{ name: 'search' }],
        cached_resources: [{ uri: 'file://docs', name: 'Docs' }],
        last_connected_at: expect.any(String),
      }),
    )
  })

  it('creates a hidden workspace MCP project when adding the first server', async () => {
    mcpUrlSecurityMocks.checkMcpReachability.mockResolvedValue({
      reachable: true,
      blocked: false,
      error: undefined,
    })
    const projectLookupQuery = createQuery({ data: null, error: null })
    const projectInsertQuery = createQuery({ data: { id: 'project-managed' }, error: null })
    const existingSecretQuery = createQuery({ data: null, error: null })
    const secretInsertQuery = createQuery({ data: { id: 'secret-1' }, error: null })
    const secretReadQuery = createQuery({ data: { encrypted_value: 'token-1' }, error: null })
    const serverInsertQuery = createQuery({
      data: {
        id: 'server-1',
        name: 'Page Grader',
        server_url: 'https://mcp.example.com',
        cached_tools: [],
        cached_resources: [],
      },
      error: null,
    })
    const serverUpdateQuery = createQuery({ error: null })
    const projectQueries = [projectLookupQuery, projectInsertQuery]
    const vaultQueries = [existingSecretQuery, secretInsertQuery, secretReadQuery]
    const serverQueries = [serverInsertQuery, serverUpdateQuery]
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'project_repos') return projectQueries.shift() ?? createQuery()
        if (table === 'vault_secrets') return vaultQueries.shift() ?? createQuery()
        if (table === 'project_mcp_servers') return serverQueries.shift() ?? createQuery()
        return createQuery()
      }),
    }
    const { controller } = createController()

    await expect(
      controller.addServer(
        supabase as never,
        { id: 'user-1' },
        { ...scope, orgId: 'org-1', orgRole: 'admin' },
        {
          name: 'Page Grader',
          url: 'https://mcp.example.com',
          api_key: 'token-1',
        },
      ),
    ).resolves.toEqual(expect.objectContaining({ success: true }))
    expect(projectInsertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        org_id: 'org-1',
        name: 'ROAS Workspace Integrations',
        manifest: { hidden: true, kind: 'workspace_mcp' },
      }),
    )
    expect(serverInsertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({ project_id: 'project-managed' }),
    )
  })

  it('tests an MCP server using the stored vault token', async () => {
    const projectQuery = createQuery({ data: { id: 'project-1' }, error: null })
    const serverQuery = createQuery({
      data: {
        id: 'server-1',
        project_id: 'project-1',
        server_url: 'https://mcp.example.com',
        vault_secret_id: 'secret-1',
      },
      error: null,
    })
    const secretQuery = createQuery({ data: { encrypted_value: 'Bearer token-1' }, error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'project_repos') return projectQuery
        if (table === 'project_mcp_servers') return serverQuery
        if (table === 'vault_secrets') return secretQuery
        return createQuery()
      }),
    }
    const { controller, mcpProbe } = createController()

    await expect(controller.testServer(supabase as never, scope, 'server-1')).resolves.toEqual({
      ok: true,
      tool_count: 1,
      error: undefined,
    })
    expect(mcpProbe.testListTools).toHaveBeenCalledWith('https://mcp.example.com', 'token-1')
  })

  it('refreshes an MCP server and stores cached tools and resources', async () => {
    const projectQuery = createQuery({ data: { id: 'project-1' }, error: null })
    const serverQuery = createQuery({
      data: {
        id: 'server-1',
        project_id: 'project-1',
        server_url: 'https://mcp.example.com',
        vault_secret_id: null,
      },
      error: null,
    })
    const updateQuery = createQuery({ error: null })
    const serverQueries = [serverQuery, updateQuery]
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'project_repos') return projectQuery
        if (table === 'project_mcp_servers') return serverQueries.shift() ?? createQuery()
        return createQuery()
      }),
    }
    const { controller, mcpProbe } = createController()

    await expect(controller.refreshServer(supabase as never, scope, 'server-1')).resolves.toEqual({
      success: true,
      tool_count: 1,
      resource_count: 1,
    })
    expect(mcpProbe.refreshToolsAndResources).toHaveBeenCalledWith('https://mcp.example.com', null)
    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        cached_tools: [{ name: 'search' }],
        cached_resources: [{ uri: 'file://docs', name: 'Docs' }],
        last_connected_at: expect.any(String),
      }),
    )
  })

  it('does not delete an MCP server that belongs to a different resolved project', async () => {
    const projectQuery = createQuery({ data: { id: 'project-owned' }, error: null })
    const serverQuery = createQuery({
      data: { id: 'server-1', project_id: 'project-other', vault_secret_id: 'secret-1' },
      error: null,
    })
    const deleteQuery = createQuery({ error: null })
    const projectServers = [serverQuery, deleteQuery]
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'project_repos') return projectQuery
        if (table === 'project_mcp_servers') return projectServers.shift() ?? deleteQuery
        return createQuery({ error: null })
      }),
    }
    const orgScope = { applyScope: vi.fn((query) => query) }
    const { controller } = createController({ orgScope })

    const result = await controller.removeServer(supabase as never, 'server-1', scope)

    expect(result).toEqual({ success: false, error: 'Server not found' })
    expect(projectQuery.select).toHaveBeenCalledWith('id')
    expect(serverQuery.select).toHaveBeenCalledWith('id, project_id, vault_secret_id')
    expect(deleteQuery.delete).not.toHaveBeenCalled()
  })

  it('does not update an MCP server that belongs to a different resolved project', async () => {
    const projectQuery = createQuery({ data: { id: 'project-owned' }, error: null })
    const serverQuery = createQuery({
      data: { id: 'server-1', project_id: 'project-other' },
      error: null,
    })
    const updateQuery = createQuery({ error: null })
    const projectServers = [serverQuery, updateQuery]
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'project_repos') return projectQuery
        if (table === 'project_mcp_servers') return projectServers.shift() ?? updateQuery
        return createQuery({ error: null })
      }),
    }
    const orgScope = { applyScope: vi.fn((query) => query) }
    const { controller } = createController({ orgScope })

    const result = await controller.updateServer(
      supabase as never,
      'server-1',
      { enabled: false },
      scope,
    )

    expect(result).toEqual({ success: false, error: 'Server not found' })
    expect(serverQuery.select).toHaveBeenCalledWith('id, project_id')
    expect(updateQuery.update).not.toHaveBeenCalled()
  })
})
