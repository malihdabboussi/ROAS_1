import { describe, expect, it, vi } from 'vitest'
import { IntegrationContextService } from './integration-context.service'

type QueryResult = {
  data: unknown
  error?: Error | null
}

function makeRepository(results: QueryResult[]) {
  const pendingResults = [...results]
  return {
    listScopedIntegrations: vi.fn(async () => {
      const result = pendingResults.shift() ?? { data: null, error: null }
      return { data: result.data, error: result.error ?? null }
    }),
    listPersonalIntegrations: vi.fn(async () => {
      const result = pendingResults.shift() ?? { data: null, error: null }
      return { data: result.data, error: result.error ?? null }
    }),
  }
}

describe('IntegrationContextService', () => {
  it('includes personal Fathom connections in org integration context', async () => {
    const repository = makeRepository([
      {
        data: [
          {
            id: 'drive-row',
            user_id: 'user-1',
            integration_id: 'google_drive',
            provider: 'google_drive',
            status: 'connected',
            connected_at: null,
            last_sync_at: null,
            agent_enabled: true,
            scope_mode: 'personal',
            is_default: false,
            connection_label: 'Drive',
          },
        ],
      },
      {
        data: [
          {
            id: 'fathom-row',
            user_id: 'user-1',
            integration_id: 'fathom',
            provider: 'fathom',
            status: 'connected',
            connected_at: null,
            last_sync_at: null,
            agent_enabled: true,
            scope_mode: 'personal',
            is_default: false,
            connection_label: 'Fathom',
          },
        ],
      },
    ])
    const client = {}
    const service = new IntegrationContextService(
      { client } as any,
      { resolveAgentPolicy: vi.fn() } as any,
      repository as any,
    )

    const context = await service.buildIntegrationContext('user-1', undefined, 'org-1')

    expect(context).toContain('google_drive')
    expect(context).toContain('fathom')
    expect(context).toContain('fathom: Fathom(personal,non_default)')
    expect(repository.listScopedIntegrations).toHaveBeenCalledWith(client, {
      userId: 'user-1',
      orgId: 'org-1',
    })
    expect(repository.listPersonalIntegrations).toHaveBeenCalledWith(client, {
      userId: 'user-1',
      integrationIds: ['fathom', 'fireflies'],
    })
  })

  it('caches integration context until explicitly busted', async () => {
    const repository = makeRepository([
      {
        data: [
          {
            id: 'drive-row',
            user_id: 'user-1',
            integration_id: 'google_drive',
            provider: 'google_drive',
            status: 'connected',
            connected_at: null,
            last_sync_at: null,
            agent_enabled: true,
            scope_mode: 'personal',
            is_default: false,
            connection_label: 'Drive',
          },
        ],
      },
    ])
    const service = new IntegrationContextService(
      { client: {} } as any,
      { resolveAgentPolicy: vi.fn() } as any,
      repository as any,
    )

    await expect(service.buildIntegrationContext('user-1', undefined, null)).resolves.toContain(
      'google_drive',
    )
    await expect(service.buildIntegrationContext('user-1', undefined, null)).resolves.toContain(
      'google_drive',
    )
    expect(repository.listScopedIntegrations).toHaveBeenCalledTimes(1)

    service.bustIntegrationContextCache({ userId: 'user-1', orgId: null })
    await service.buildIntegrationContext('user-1', undefined, null)
    expect(repository.listScopedIntegrations).toHaveBeenCalledTimes(2)
  })
})
