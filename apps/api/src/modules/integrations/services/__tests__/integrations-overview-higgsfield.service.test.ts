import { describe, expect, it, vi } from 'vitest'
import { IntegrationsOverviewService } from '../integrations-overview.service'

function makeQuery(result: Record<string, unknown>) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    in: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return query
}

describe('IntegrationsOverviewService Higgsfield visibility', () => {
  it('queries and returns a connected workspace Higgsfield row', async () => {
    const higgsfieldRow = {
      id: 'higgsfield-connection',
      user_id: 'user-1',
      org_id: 'org-1',
      integration_id: 'higgsfield',
      provider: 'higgsfield',
      status: 'connected',
      agent_enabled: true,
      metadata: { execution_mode: 'native_mcp' },
      scope_mode: 'org_shared',
      is_default: true,
    }
    const overviewIds: string[][] = []
    const repository = {
      table: vi.fn((_client: unknown, table: string) => {
        if (table === 'project_composio_toolkit_config') {
          return makeQuery({ data: [], error: null })
        }
        const query = makeQuery({ data: [higgsfieldRow], error: null })
        query.in = vi.fn((_column: string, ids: string[]) => {
          overviewIds.push(ids)
          return query
        })
        return query
      }),
      findAdminPersonalOpenAICodexIntegration: vi.fn(async () => null),
      findAdminPersonalAnthropicClaudeIntegration: vi.fn(async () => null),
    }
    const service = new IntegrationsOverviewService(
      repository as never,
      { getConnectedAccount: vi.fn(), listConnectedAccounts: vi.fn(async () => []) } as never,
      {
        applyScope: vi.fn(async () => ({ data: [higgsfieldRow], error: null })),
        isOrgContext: vi.fn(() => true),
      } as never,
      { hasSecret: vi.fn(async () => false) } as never,
      {
        resolveConnectionIdentity: vi.fn(),
        updateIntegrationById: vi.fn(),
      } as never,
      {} as never,
      { syncExpiredConnectedRows: vi.fn(async () => new Map()) } as never,
    )

    const result = await service.getOverview({} as never, { id: 'user-1' }, {
      orgId: 'org-1',
      userId: 'user-1',
    } as never)

    expect(overviewIds.some((ids) => ids.includes('higgsfield'))).toBe(true)
    expect(result.connectedProviders).toContain('higgsfield')
    expect(result.integrations).toEqual([
      expect.objectContaining({
        id: 'higgsfield-connection',
        integration_id: 'higgsfield',
        status: 'connected',
      }),
    ])
  })
})
