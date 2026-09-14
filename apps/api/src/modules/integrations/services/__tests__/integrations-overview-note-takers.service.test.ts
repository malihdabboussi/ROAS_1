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

/** Note takers defined from Settings are not in the fixed overview id list; they come from the definitions table. */
describe('IntegrationsOverviewService defined note takers', () => {
  it('queries user rows for every active nt_ slug, including personal rows inside an org', async () => {
    const otterRow = {
      id: 'otter-connection',
      user_id: 'user-1',
      org_id: null,
      integration_id: 'nt_otter',
      provider: 'nt_otter',
      status: 'connected',
      agent_enabled: true,
      metadata: { webhook_key: 'k'.repeat(24) },
      scope_mode: 'personal',
      is_default: false,
    }
    const overviewIds: string[][] = []
    const repository = {
      table: vi.fn((_client: unknown, table: string) => {
        if (table === 'project_composio_toolkit_config') {
          return makeQuery({ data: [], error: null })
        }
        const query = makeQuery({ data: [otterRow], error: null })
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
        applyScope: vi.fn(async () => ({ data: [], error: null })),
        isOrgContext: vi.fn(() => true),
      } as never,
      { hasSecret: vi.fn(async () => false) } as never,
      { resolveConnectionIdentity: vi.fn(), updateIntegrationById: vi.fn() } as never,
      {} as never,
      { syncExpiredConnectedRows: vi.fn(async () => new Map()) } as never,
      { listActiveSlugs: vi.fn(async () => ['nt_otter']) } as never,
    )

    const result = await service.getOverview({} as never, { id: 'user-1' }, {
      orgId: 'org-1',
      userId: 'user-1',
    } as never)

    // Both the scoped query and the personal-in-org query carry the slug.
    expect(overviewIds).toHaveLength(2)
    expect(overviewIds.every((ids) => ids.includes('nt_otter'))).toBe(true)
    expect(overviewIds[0]).toContain('fathom')
    expect(result.connectedProviders).toContain('nt_otter')
    expect(result.integrations).toEqual([
      expect.objectContaining({
        id: 'otter-connection',
        integration_id: 'nt_otter',
        status: 'connected',
      }),
    ])
  })
})
