import { describe, expect, it, vi } from 'vitest'
import { IntegrationsStatusService } from '../integrations-status.service'

function makeQuery(result: Record<string, unknown>) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return query
}

describe('IntegrationsStatusService execution mode', () => {
  it('defaults missing toolkit execution_mode to legacy instead of composio', async () => {
    const listConnectedAccounts = vi.fn(async () => [])
    const repository = {
      table: vi.fn((_client: unknown, table: string) => {
        if (table === 'project_composio_toolkit_config') {
          return makeQuery({
            data: {
              toolkit_slug: 'fathom',
              enabled: true,
              metadata: {},
            },
            error: null,
          })
        }
        return makeQuery({
          data: [
            {
              id: 'ui-1',
              user_id: 'user-1',
              status: 'connected',
              connected_at: '2026-07-01T00:00:00.000Z',
              metadata: {},
              scope_mode: 'personal',
              is_default: true,
            },
          ],
          error: null,
        })
      }),
      findAdminPersonalOpenAICodexIntegration: vi.fn(async () => null),
      findAdminPersonalAnthropicClaudeIntegration: vi.fn(async () => null),
    }

    const service = new IntegrationsStatusService(
      repository as never,
      { listConnectedAccounts } as never,
      { isOrgContext: vi.fn(() => false) } as never,
      { hasSecret: vi.fn(async () => false) } as never,
      {
        updateIntegrationById: vi.fn(),
        upsertPersonalScopedIntegration: vi.fn(),
        resolveLinkedInAuthorUrn: vi.fn(),
      } as never,
      { syncExpiredConnectionRow: vi.fn(async () => null) } as never,
    )

    const result = await service.getIntegrationStatus(
      {} as never,
      { id: 'user-1' },
      { userId: 'user-1', orgId: null } as never,
      'fathom',
    )

    expect(result).toMatchObject({
      success: true,
      connected: true,
      status: 'connected',
      execution_mode: 'legacy',
    })
    expect(listConnectedAccounts).not.toHaveBeenCalled()
  })

  it('only treats explicit composio execution_mode as composio', async () => {
    const listConnectedAccounts = vi.fn(async () => [{ id: 'ca-1', status: 'ACTIVE' }])
    const repository = {
      table: vi.fn((_client: unknown, table: string) => {
        if (table === 'project_composio_toolkit_config') {
          return makeQuery({
            data: {
              toolkit_slug: 'notion',
              enabled: true,
              metadata: { execution_mode: 'composio' },
            },
            error: null,
          })
        }
        return makeQuery({
          data: [
            {
              id: 'ui-2',
              user_id: 'user-1',
              status: 'connected',
              connected_at: '2026-07-01T00:00:00.000Z',
              metadata: { composio_connected_account_id: 'ca-1' },
              scope_mode: 'personal',
              is_default: true,
            },
          ],
          error: null,
        })
      }),
      findAdminPersonalOpenAICodexIntegration: vi.fn(async () => null),
      findAdminPersonalAnthropicClaudeIntegration: vi.fn(async () => null),
    }

    const service = new IntegrationsStatusService(
      repository as never,
      { listConnectedAccounts } as never,
      { isOrgContext: vi.fn(() => false) } as never,
      { hasSecret: vi.fn(async () => false) } as never,
      {
        updateIntegrationById: vi.fn(),
        upsertPersonalScopedIntegration: vi.fn(),
        resolveLinkedInAuthorUrn: vi.fn(),
      } as never,
      { syncExpiredConnectionRow: vi.fn(async () => null) } as never,
    )

    const result = await service.getIntegrationStatus(
      {} as never,
      { id: 'user-1' },
      { userId: 'user-1', orgId: null } as never,
      'notion',
    )

    expect(result.execution_mode).toBe('composio')
    expect(listConnectedAccounts).toHaveBeenCalled()
  })
})
