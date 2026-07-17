import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ComposioRepository } from './repositories/composio.repository'
import { ComposioService } from './services/composio.service'

const mocks = vi.hoisted(() => ({
  Composio: vi.fn(() => ({
    connectedAccounts: {
      initiate: vi.fn(),
      link: vi.fn(),
      get: vi.fn(),
      list: vi.fn(),
      delete: vi.fn(),
    },
    toolkits: { get: vi.fn() },
    tools: { get: vi.fn(), execute: vi.fn() },
    triggers: { create: vi.fn(), disable: vi.fn(), enable: vi.fn() },
  })),
}))

vi.mock('@composio/core', () => ({
  AuthScheme: { APIKey: vi.fn((value) => ({ type: 'api-key', value })) },
  Composio: mocks.Composio,
}))

function createQuery(result: Record<string, unknown> = { data: null, error: null }) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
    upsert: vi.fn().mockResolvedValue(result),
    or: vi.fn(() => query),
    limit: vi.fn().mockResolvedValue(result),
    then: (
      resolve: (value: Record<string, unknown>) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  }
  return query
}

function createService(supabase: Record<string, any>) {
  const config = {
    get: vi.fn((key: string) => {
      if (key === 'COMPOSIO_API_KEY') return 'composio-key'
      if (key === 'COMPOSIO_BASE_URL') return undefined
      if (key === 'GEMINI_API_KEY') return undefined
      return undefined
    }),
  }

  return new ComposioService(config as never, new ComposioRepository({ client: supabase } as never))
}

describe('ComposioService catalog data access', () => {
  beforeEach(() => {
    mocks.Composio.mockClear()
  })

  it('passes safe shared-connection options to Composio link auth', async () => {
    const service = createService({ from: vi.fn() })
    const composioClient = mocks.Composio.mock.results[0]?.value as {
      connectedAccounts: { link: ReturnType<typeof vi.fn> }
    }
    composioClient.connectedAccounts.link.mockResolvedValue({
      id: 'ca_shared',
      redirectUrl: 'https://connect.composio.dev/link/shared',
      status: 'INITIATED',
    })

    const result = await service.initiateConnectedAccount('user-1', 'auth-1', {
      callbackUrl: 'https://app.vibey.ai/settings',
      allowMultiple: true,
      accountType: 'SHARED',
    })

    expect(result).toEqual({
      id: 'ca_shared',
      redirectUrl: 'https://connect.composio.dev/link/shared',
      status: 'INITIATED',
    })
    expect(composioClient.connectedAccounts.link).toHaveBeenCalledWith(
      'user-1',
      'auth-1',
      expect.objectContaining({
        callbackUrl: 'https://app.vibey.ai/settings',
        allowMultiple: true,
        experimental: { accountType: 'SHARED' },
      }),
    )
  })

  it('syncs toolkit catalog rows into composio_toolkits', async () => {
    const upsertQuery = createQuery({ data: null, error: null })
    const supabase = {
      from: vi.fn((table: string) => {
        expect(table).toBe('composio_toolkits')
        return upsertQuery
      }),
    }
    const service = createService(supabase)
    vi.spyOn(service, 'listToolkits').mockResolvedValue([
      {
        slug: 'GMAIL',
        name: 'Gmail',
        description: 'Send and read email',
        logo: 'https://example.com/gmail.png',
        categories: ['Email', 'Productivity'],
      },
    ])

    const result = await service.syncToolkitCatalog(10)

    expect(result).toEqual({ success: true, processed: 1, upserted: 1 })
    expect(upsertQuery.upsert).toHaveBeenCalledWith(
      {
        toolkit_slug: 'gmail',
        name: 'Gmail',
        description: 'Send and read email',
        logo: 'https://example.com/gmail.png',
        categories: ['email', 'productivity'],
        metadata: { source: 'composio', categories: ['email', 'productivity'] },
        embedding: null,
        updated_at: expect.any(String),
      },
      { onConflict: 'toolkit_slug' },
    )
  })

  it('searches toolkit catalog by embedding before text fallback', async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            toolkit_slug: 'gmail',
            name: 'Gmail',
            description: 'Email toolkit',
            logo: null,
            metadata: { source: 'composio' },
            similarity: 0.92,
          },
        ],
        error: null,
      }),
      from: vi.fn(),
    }
    const service = createService(supabase)
    vi.spyOn(service as any, 'generateEmbedding').mockResolvedValue([0.1, 0.2])

    const result = await service.searchToolkitCatalog(' email ', 50)

    expect(supabase.rpc).toHaveBeenCalledWith('search_composio_toolkits', {
      query_embedding: [0.1, 0.2],
      match_count: 25,
    })
    expect(supabase.from).not.toHaveBeenCalled()
    expect(result).toEqual([
      {
        toolkit_slug: 'gmail',
        name: 'Gmail',
        description: 'Email toolkit',
        logo: null,
        metadata: { source: 'composio' },
        similarity: 0.92,
      },
    ])
  })

  it('syncs Airtable toolkit tools into shared Composio integration capabilities', async () => {
    const config = {
      get: vi.fn((key: string) => {
        if (key === 'COMPOSIO_API_KEY') return 'composio-key'
        if (key === 'COMPOSIO_BASE_URL') return undefined
        if (key === 'GEMINI_API_KEY') return undefined
        return undefined
      }),
    }
    const repository = {
      findSyncedIntegrationIds: vi.fn(async () => ({ data: [], error: null })),
      findProjectToolkitConfigs: vi.fn(async () => ({
        data: [
          {
            integration_id: 'airtable',
            toolkit_slug: 'airtable',
            enabled: true,
            metadata: { execution_mode: 'composio' },
          },
        ],
        error: null,
      })),
      findIntegrationCapabilityCopy: vi.fn(async () => ({ data: null, error: null })),
      upsertIntegrationCapability: vi.fn(async () => ({ error: null })),
    }
    const service = new ComposioService(config as never, repository as never)
    vi.spyOn(service, 'listConnectedAccounts').mockResolvedValue([
      { id: 'ca_airtable', status: 'ACTIVE', toolkitSlug: 'airtable', userId: 'user-1' },
    ])
    vi.spyOn(service, 'listToolsForToolkits').mockResolvedValue([
      {
        slug: 'AIRTABLE_LIST_RECORDS',
        displayName: 'List records',
        description: 'List Airtable records.',
        parameters: { baseId: { type: 'string' } },
      },
    ])

    const result = await service.syncCapabilities('fallback-user', {
      only: ['airtable'],
      force: true,
    })

    expect(result).toEqual({ success: true, composio: 1, legacy: 0, skipped: 0 })
    expect(repository.upsertIntegrationCapability).toHaveBeenCalledWith(
      expect.objectContaining({
        integration_id: 'airtable',
        action_slug: 'AIRTABLE_LIST_RECORDS',
        execution_mode: 'composio',
        domains: ['shared'],
        metadata: { source: 'composio', toolkit_slug: 'airtable' },
        parameters: { baseId: { type: 'string' } },
      }),
    )
  })

  it('skips Composio capability sync when toolkit execution_mode is missing', async () => {
    const config = {
      get: vi.fn((key: string) => {
        if (key === 'COMPOSIO_API_KEY') return 'composio-key'
        if (key === 'COMPOSIO_BASE_URL') return undefined
        if (key === 'GEMINI_API_KEY') return undefined
        return undefined
      }),
    }
    const repository = {
      findSyncedIntegrationIds: vi.fn(async () => ({ data: [], error: null })),
      findProjectToolkitConfigs: vi.fn(async () => ({
        data: [
          {
            integration_id: 'unknown_native_provider',
            toolkit_slug: 'unknown_native_provider',
            enabled: true,
            metadata: {},
          },
        ],
        error: null,
      })),
      findIntegrationCapabilityCopy: vi.fn(async () => ({ data: null, error: null })),
      upsertIntegrationCapability: vi.fn(async () => ({ error: null })),
    }
    const service = new ComposioService(config as never, repository as never)
    vi.spyOn(service, 'listConnectedAccounts').mockResolvedValue([])
    const listTools = vi.spyOn(service, 'listToolsForToolkits').mockResolvedValue([])

    const result = await service.syncCapabilities('fallback-user', {
      only: ['unknown_native_provider'],
      force: true,
    })

    expect(result.composio).toBe(0)
    expect(listTools).not.toHaveBeenCalled()
    expect(repository.upsertIntegrationCapability).not.toHaveBeenCalled()
  })
})
