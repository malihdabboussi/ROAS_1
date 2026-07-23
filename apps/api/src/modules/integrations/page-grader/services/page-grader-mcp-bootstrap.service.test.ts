import { describe, expect, it, vi } from 'vitest'
import { PageGraderMcpBootstrapService } from './page-grader-mcp-bootstrap.service'

type FakeState = {
  existingSecret?: { id: string } | null
  existingServer?: { id: string } | null
  writes: Array<{ table: string; operation: string; payload: Record<string, unknown> }>
}

function queryFor(table: string, state: FakeState) {
  let operation = 'select'
  let payload: Record<string, unknown> = {}

  const result = () => {
    if (table === 'user_integrations') {
      return {
        data: [{ user_id: 'user-1', org_id: null }],
        error: null,
      }
    }
    if (table === 'project_repos') return { data: { id: 'project-1' }, error: null }
    if (table === 'vault_secrets' && operation === 'select') {
      return { data: state.existingSecret ?? null, error: null }
    }
    if (table === 'project_mcp_servers' && operation === 'select') {
      return { data: state.existingServer ?? null, error: null }
    }
    if (operation === 'insert' && table === 'vault_secrets') {
      return { data: { id: 'secret-1' }, error: null }
    }
    return { data: null, error: null }
  }

  const builder: Record<string, any> = {
    select: () => builder,
    eq: () => builder,
    is: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: async () => result(),
    single: async () => result(),
    update: (next: Record<string, unknown>) => {
      operation = 'update'
      payload = next
      state.writes.push({ table, operation, payload })
      return builder
    },
    insert: (next: Record<string, unknown>) => {
      operation = 'insert'
      payload = next
      state.writes.push({ table, operation, payload })
      return builder
    },
    then: (
      resolve: (value: { data: unknown; error: null }) => unknown,
      reject: (reason: unknown) => unknown,
    ) => Promise.resolve(result()).then(resolve, reject),
  }
  return builder
}

function createSubject(state: FakeState) {
  const client = {
    from: vi.fn((table: string) => queryFor(table, state)),
  }
  const vault = {
    getSecret: vi.fn(async (_userId: string, _provider: string, label: string) =>
      label === 'base_url'
        ? 'https://example.supabase.co/functions/v1/roas-api'
        : 'pg-secret',
    ),
  }
  return new PageGraderMcpBootstrapService(
    { client } as never,
    vault as never,
  )
}

describe('PageGraderMcpBootstrapService', () => {
  it('creates an agent-enabled registration for an existing connection', async () => {
    const state: FakeState = { writes: [] }
    const result = await createSubject(state).ensureConnectedRegistrations()

    expect(result).toEqual({ scanned: 1, created: 1, updated: 0, failed: 0 })
    expect(state.writes).toContainEqual(
      expect.objectContaining({
        table: 'project_mcp_servers',
        operation: 'insert',
        payload: expect.objectContaining({
          name: 'Page Grader',
          server_url: 'https://example.supabase.co/functions/v1/page-grader-mcp',
          domain: 'universal',
          enabled: true,
          agent_enabled: true,
        }),
      }),
    )
  })

  it('repairs the existing secret and server without creating duplicates', async () => {
    const state: FakeState = {
      existingSecret: { id: 'secret-existing' },
      existingServer: { id: 'server-existing' },
      writes: [],
    }
    const result = await createSubject(state).ensureConnectedRegistrations()

    expect(result).toEqual({ scanned: 1, created: 0, updated: 1, failed: 0 })
    expect(
      state.writes.filter(
        (write) => write.table === 'project_mcp_servers' && write.operation === 'insert',
      ),
    ).toHaveLength(0)
    expect(state.writes).toContainEqual(
      expect.objectContaining({
        table: 'project_mcp_servers',
        operation: 'update',
        payload: expect.objectContaining({ vault_secret_id: 'secret-existing' }),
      }),
    )
  })
})
