import type { ConfigService } from '@nestjs/config'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ArtifactMissionsMediaService } from './artifact-missions-media.service'
import { ArtifactsService } from './artifacts.service'

const stubMissionsMedia = new ArtifactMissionsMediaService({
  loadCookiesForYtDlp: vi.fn(async () => null),
} as any)

function makeConfigMock(): ConfigService {
  return {
    getOrThrow: vi.fn((key: string) => {
      if (key === 'SUPABASE_URL') return 'https://example.supabase.co'
      if (key === 'SUPABASE_ANON_KEY') return 'anon-key'
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-key'
      throw new Error(`Unexpected getOrThrow key: ${key}`)
    }),
    get: vi.fn((key: string, fallback?: string) => {
      if (key === 'SCRAPECREATORS_API_KEY') return 'scrape-key'
      return fallback ?? ''
    }),
  } as unknown as ConfigService
}

function makeService(): any {
  const service = new ArtifactsService(
    makeConfigMock(),
    { logError: vi.fn() } as any,
    { get: vi.fn(), set: vi.fn() } as any,
    {} as any,
    {} as any,
    { tagMemory: vi.fn() } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    stubMissionsMedia,
  ) as any
  service.setPostActionVerifierForTests?.({
    verify: vi.fn(async () => ({ status: 'verified' as const, checks: [] })),
  })
  return service
}

function makeUserClientForAgent(agentRow: Record<string, unknown> | null) {
  const terminal = {
    maybeSingle: async () => ({ data: agentRow, error: null }),
    eq: () => terminal,
    is: () => terminal,
  }
  return {
    from: () => ({
      select: () => ({
        eq: () => terminal,
        is: () => terminal,
      }),
    }),
  }
}

function withAgent(service: any, agentKey: string, agentRow: Record<string, unknown> | null) {
  service.resolveUserId = vi.fn(() => 'user-1')
  service.parseAgentIdFromSessionKey = vi.fn(() => agentKey)
  service.getUserClient = vi.fn(async () => makeUserClientForAgent(agentRow))
}

function allowAgentAccessPolicies(service: any) {
  service.agentPolicyService = {
    canAgentUseCapability: vi.fn(async () => true),
  }
}

/** project_composio_toolkit_config → execution_mode composio (useIntegration reads target.serviceClient). */
function stubServiceClientComposioMode(service: any) {
  service.serviceClient = {
    from: (table: string) => {
      if (table === 'project_composio_toolkit_config') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { enabled: true, metadata: { execution_mode: 'composio' } },
                error: null,
              }),
            }),
          }),
        }
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }
    },
  }
}

function makeQueryResult(result: { data: unknown; error?: { message: string } | null }) {
  const chain: Record<string, any> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    or: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data: result.data, error: result.error ?? null })),
    upsert: vi.fn(async () => ({ error: result.error ?? null })),
    then: (
      resolve: (value: { data: unknown; error: { message: string } | null }) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve({ data: result.data, error: result.error ?? null }).then(resolve, reject),
  }
  return chain
}

describe('ArtifactsService RBAC integrations + media', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn() as unknown as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('allows managed integrations via use_integration', async () => {
    const service = makeService()
    withAgent(service, 'analyst', {
      agent_key: 'analyst',
      level: 'employee',
      role: 'Growth & Performance Analyst',
      config: { capability_profile: 'managed_domain', capability_domain: 'analyst' },
    })
    service.useIntegration = vi.fn(async () => ({ success: true }))

    const allowResult = await service.executeAction(
      'use_integration',
      {
        service: 'stripe',
        integration_action: 'create_refund',
        params: {},
      },
      'agent:analyst:stub',
    )
    expect(allowResult.success).toBe(true)
    expect(service.useIntegration).toHaveBeenCalledTimes(1)
  })

  it('allows analyst employee to read meta ads insights', async () => {
    const service = makeService()
    withAgent(service, 'analyst', {
      agent_key: 'analyst',
      level: 'employee',
      role: 'Growth & Performance Analyst',
      config: { capability_profile: 'managed_domain', capability_domain: 'analyst' },
    })
    service.getMetaAdsInsights = vi.fn(async () => ({ success: true, level: 'campaign', rows: [] }))

    const result = await service.executeAction(
      'get_meta_ads_insights',
      { campaign_id: 'campaign-1', level: 'campaign' },
      'agent:analyst:stub',
    )
    expect(result).toEqual({ success: true, level: 'campaign', rows: [] })
    expect(service.getMetaAdsInsights).toHaveBeenCalledTimes(1)
  })

  it('allows marketing employee to generate images', async () => {
    const service = makeService()
    withAgent(service, 'copywriter', {
      agent_key: 'copywriter',
      level: 'employee',
      role: 'Senior Conversion Copywriter',
      config: { capability_profile: 'managed_domain', capability_domain: 'marketing' },
    })
    service.generateImage = vi.fn(async () => ({
      success: true,
      image_url: 'https://example.com/ad-creative.png',
    }))

    const result = await service.executeAction(
      'generate_image',
      { prompt: 'Generate image for ad concept' },
      'agent:copywriter:stub',
    )
    expect(result.success).toBe(true)
    expect(service.generateImage).toHaveBeenCalledTimes(1)
  })

  it('denies analyst employee from generating images', async () => {
    const service = makeService()
    withAgent(service, 'analyst', {
      agent_key: 'analyst',
      level: 'employee',
      role: 'Growth & Performance Analyst',
      config: { capability_profile: 'managed_domain', capability_domain: 'analyst' },
    })

    const result = await service.executeAction(
      'generate_image',
      { prompt: 'Generate image for ad concept' },
      'agent:analyst:stub',
    )
    expect(result.success).toBe(false)
    expect(String(result.error)).toContain('not available')
  })

  it('denies hr from reading meta ads insights', async () => {
    const service = makeService()
    withAgent(service, 'hr', {
      agent_key: 'hr',
      level: 'system',
      role: 'Recruiter',
      config: { capability_profile: 'system_hr', capability_domain: 'management' },
    })

    const result = await service.executeAction(
      'get_meta_ads_insights',
      { campaign_id: 'campaign-1', level: 'campaign' },
      'agent:hr:stub',
    )
    expect(result.success).toBe(false)
    expect(String(result.error)).toContain('not available for HR agents')
  })

  it('routes use_integration to composio executor when provider mode is composio', async () => {
    const service = makeService()
    withAgent(service, 'analyst', {
      agent_key: 'analyst',
      level: 'employee',
      role: 'Growth & Performance Analyst',
      config: { capability_profile: 'managed_domain', capability_domain: 'analyst' },
    })
    stubServiceClientComposioMode(service)
    service.useComposioTool = vi.fn(async () => ({ success: true, routed: 'composio' }))

    const result = (await service.useIntegration(
      {
        service: 'instagram',
        integration_action: 'INSTAGRAM_GET_USER_PROFILE',
        params: { username: 'vibey' },
      },
      'agent:analyst:stub',
    )) as { success?: boolean; routed?: string }

    expect(result.success).toBe(true)
    expect(result.routed).toBe('composio')
    expect(service.useComposioTool).toHaveBeenCalledTimes(1)
  })

  it('adds integration context to failed composio use_integration results', async () => {
    const service = makeService()
    withAgent(service, 'analyst', {
      agent_key: 'analyst',
      level: 'employee',
      role: 'Growth & Performance Analyst',
      config: { capability_profile: 'managed_domain', capability_domain: 'analyst' },
    })
    stubServiceClientComposioMode(service)
    service.useComposioTool = vi.fn(async () => ({ success: false, error: 'query is required' }))

    const result = (await service.useIntegration(
      {
        service: 'instagram',
        integration_action: 'INSTAGRAM_SEARCH_POSTS',
        params: { limit: 10 },
      },
      'agent:analyst:stub',
    )) as { success?: boolean; error?: string }

    expect(result.success).toBe(false)
    expect(result.error).toContain('Integration action failed')
    expect(result.error).toContain('service "instagram"')
    expect(result.error).toContain('action "INSTAGRAM_SEARCH_POSTS"')
    expect(result.error).toContain('params [limit]')
    expect(result.error).toContain('query is required')
  })

  it('blocks composio-routed use_integration when integration is not connected', async () => {
    const service = makeService()
    withAgent(service, 'copywriter', {
      agent_key: 'copywriter',
      level: 'employee',
      role: 'Senior Conversion Copywriter',
      config: { capability_profile: 'managed_domain', capability_domain: 'marketing' },
    })

    stubServiceClientComposioMode(service)
    service.resolveComposioConfig = vi.fn(async () => ({
      integration_id: 'google_drive',
      toolkit_slug: 'googledrive',
      auth_config_id: 'ac_1',
      enabled: true,
    }))
    const userIntegrationsQuery: any = {
      select: () => userIntegrationsQuery,
      eq: () => userIntegrationsQuery,
      is: () => userIntegrationsQuery,
      order: () => userIntegrationsQuery,
      then: (resolve: (value: unknown) => void, reject?: (reason?: unknown) => void) =>
        Promise.resolve({
          data: [{ id: 'ui_1', status: 'disconnected', agent_enabled: true, metadata: {} }],
          error: null,
        }).then(resolve, reject),
    }
    service.getUserClient = vi.fn(async () => ({
      from: () => userIntegrationsQuery,
    }))
    service.composioService = {
      executeTool: vi.fn(),
      listConnectedAccounts: vi.fn(async () => []),
    }

    const result = (await service.useIntegration(
      {
        service: 'google_drive',
        integration_action: 'GOOGLEDRIVE_LIST_FILES',
        params: { folder_id: 'root' },
      },
      'agent:copywriter:stub',
    )) as { success: boolean; error?: string }

    expect(result.success).toBe(false)
    expect(String(result.error)).toContain('not connected')
    expect(service.composioService.executeTool).not.toHaveBeenCalled()
  })

  it('allows composio-routed use_integration for connected and agent-enabled integration', async () => {
    const service = makeService()
    withAgent(service, 'copywriter', {
      agent_key: 'copywriter',
      level: 'employee',
      role: 'Senior Conversion Copywriter',
      config: { capability_profile: 'managed_domain', capability_domain: 'marketing' },
    })

    stubServiceClientComposioMode(service)
    service.resolveComposioConfig = vi.fn(async () => ({
      integration_id: 'google_drive',
      toolkit_slug: 'googledrive',
      auth_config_id: 'ac_1',
      enabled: true,
    }))
    const userIntegrationsQuery: any = {
      select: () => userIntegrationsQuery,
      eq: () => userIntegrationsQuery,
      is: () => userIntegrationsQuery,
      order: () => userIntegrationsQuery,
      insert: async () => ({ error: null }),
      update: () => ({
        eq: async () => ({ error: null }),
      }),
      then: (resolve: (value: unknown) => void, reject?: (reason?: unknown) => void) =>
        Promise.resolve({
          data: [{ id: 'ui_1', status: 'connected', agent_enabled: true, metadata: {} }],
          error: null,
        }).then(resolve, reject),
    }
    service.getUserClient = vi.fn(async () => ({
      from: () => userIntegrationsQuery,
    }))
    service.composioService = {
      executeTool: vi.fn(async () => ({ ok: true })),
      listConnectedAccounts: vi.fn(async () => [
        { id: 'ca_1', status: 'ACTIVE', toolkitSlug: 'googledrive' },
      ]),
    }

    const result = (await service.useIntegration(
      {
        service: 'google_drive',
        integration_action: 'GOOGLEDRIVE_LIST_FILES',
        params: { folder_id: 'root' },
      },
      'agent:copywriter:stub',
    )) as { success: boolean; integration_id?: string; toolkit_slug?: string }

    expect(result.success).toBe(true)
    expect(result.integration_id).toBe('google_drive')
    expect(result.toolkit_slug).toBe('googledrive')
    expect(service.composioService.executeTool).toHaveBeenCalledTimes(1)
  })

  it('allows Airtable use_integration actions through the Composio executor', async () => {
    const service = makeService()
    withAgent(service, 'pm', {
      agent_key: 'pm',
      level: 'employee',
      role: 'Campaign Project Manager',
      config: { capability_profile: 'managed_domain', capability_domain: 'operations' },
    })

    stubServiceClientComposioMode(service)
    service.resolveComposioConfig = vi.fn(async () => ({
      integration_id: 'airtable',
      toolkit_slug: 'airtable',
      auth_config_id: 'ac_airtable',
      enabled: true,
    }))
    const userIntegrationsQuery: any = {
      select: () => userIntegrationsQuery,
      eq: () => userIntegrationsQuery,
      is: () => userIntegrationsQuery,
      order: () => userIntegrationsQuery,
      insert: async () => ({ error: null }),
      update: () => ({
        eq: async () => ({ error: null }),
      }),
      then: (resolve: (value: unknown) => void, reject?: (reason?: unknown) => void) =>
        Promise.resolve({
          data: [{ id: 'ui_airtable', status: 'connected', agent_enabled: true, metadata: {} }],
          error: null,
        }).then(resolve, reject),
    }
    service.getUserClient = vi.fn(async () => ({
      from: () => userIntegrationsQuery,
    }))
    service.composioService = {
      executeTool: vi.fn(async () => ({ records: [] })),
      listConnectedAccounts: vi.fn(async () => [
        { id: 'ca_airtable', status: 'ACTIVE', toolkitSlug: 'airtable' },
      ]),
    }

    const result = (await service.useIntegration(
      {
        service: 'airtable',
        integration_action: 'AIRTABLE_LIST_RECORDS',
        params: { baseId: 'app_base', tableId: 'tbl_records' },
      },
      'agent:pm:stub',
    )) as { success: boolean; integration_id?: string; toolkit_slug?: string }

    expect(result.success).toBe(true)
    expect(result.integration_id).toBe('airtable')
    expect(result.toolkit_slug).toBe('airtable')
    expect(service.composioService.executeTool).toHaveBeenCalledTimes(1)
  })

  it('describes integration capabilities and connected org-shared state', async () => {
    const service = makeService()
    service.parseAgentIdFromSessionKey = vi.fn(() => 'copywriter')
    service.parseConversationIdFromSessionKey = vi.fn(() => 'conv-1')
    service.requestContext = { get: vi.fn(() => ({ orgId: 'org-1' })) }
    service.resolveUserId = vi.fn(() => 'user-1')
    service.resolveOrgId = vi.fn(() => 'org-1')
    service.serviceClient = {
      from: vi.fn((table: string) => {
        expect(table).toBe('integration_capabilities')
        return makeQueryResult({
          data: [
            {
              action_slug: 'INSTAGRAM_SEARCH_POSTS',
              execution_mode: 'composio',
              display_name: 'Search posts',
              description: 'Search Instagram posts.',
              parameters: { query: { type: 'string' } },
            },
          ],
        })
      }),
    }
    const agentClient = {
      from: vi.fn((table: string) => {
        expect(table).toBe('agents_registry')
        return makeQueryResult({
          data: {
            agent_key: 'copywriter',
            level: 'employee',
            role: 'Senior Conversion Copywriter',
            config: { capability_profile: 'managed_domain', capability_domain: 'marketing' },
          },
        })
      }),
    }
    const integrationClient = {
      from: vi.fn((table: string) => {
        expect(table).toBe('user_integrations')
        return makeQueryResult({
          data: [
            {
              user_id: 'owner-1',
              status: 'connected',
              agent_enabled: true,
              scope_mode: 'org_shared',
            },
          ],
        })
      }),
    }
    service.getUserClient = vi.fn(async () =>
      service.getUserClient.mock.calls.length === 1 ? agentClient : integrationClient,
    )

    const result = (await service.getIntegration(
      { service: 'instagram' },
      'agent:copywriter:stub',
    )) as Record<string, any>

    expect(result).toMatchObject({
      success: true,
      integration_id: 'instagram',
      connected: true,
      execution_mode: 'composio',
      actions: [
        expect.objectContaining({
          action_slug: 'INSTAGRAM_SEARCH_POSTS',
          usage: {
            action: 'use_integration',
            data: {
              service: 'instagram',
              integration_action: 'INSTAGRAM_SEARCH_POSTS',
              params: { query: '<query>' },
            },
          },
        }),
      ],
    })
  })

  it('searches available integrations with vector results when embeddings are available', async () => {
    const service = makeService()
    service.resolveAgentDomain = vi.fn(async () => 'marketing')
    service.resolveUserId = vi.fn(() => 'user-1')
    service.resolveOrgId = vi.fn(() => 'org-1')
    service.embeddingService = {
      getEmbedding: vi.fn(async () => [0.1, 0.2, 0.3]),
    }
    service.serviceClient = {
      rpc: vi.fn(async (fn: string, args: Record<string, unknown>) => {
        expect(fn).toBe('search_integration_capabilities')
        expect(args).toMatchObject({
          match_count: 3,
          filter_integration_id: null,
          filter_domain: 'marketing',
        })
        return {
          data: [
            {
              integration_id: 'instagram',
              execution_mode: 'composio',
              action_slug: 'INSTAGRAM_SEARCH_POSTS',
              display_name: 'Search posts',
              description: 'Search Instagram posts.',
              parameters: { query: { type: 'string' } },
              similarity: 0.91,
            },
          ],
          error: null,
        }
      }),
    }

    const result = (await service.searchAvailableIntegrations(
      { query: 'find creator posts', limit: 3 },
      'agent:copywriter:stub',
    )) as Record<string, any>

    expect(result).toMatchObject({
      success: true,
      query: 'find creator posts',
      source: 'capabilities_vector',
      integrations: [
        {
          integration_id: 'instagram',
          execution_mode: 'composio',
          actions: [expect.objectContaining({ action_slug: 'INSTAGRAM_SEARCH_POSTS' })],
        },
      ],
    })
  })

  it('falls back to text integration search when embeddings are unavailable', async () => {
    const service = makeService()
    service.resolveAgentDomain = vi.fn(async () => 'analyst')
    service.resolveUserId = vi.fn(() => 'user-1')
    service.resolveOrgId = vi.fn(() => null)
    service.embeddingService = {
      getEmbedding: vi.fn(async () => null),
    }
    service.serviceClient = {
      from: vi.fn((table: string) => {
        expect(table).toBe('integration_capabilities')
        return makeQueryResult({
          data: [
            {
              integration_id: 'stripe',
              execution_mode: 'legacy',
              action_slug: 'STRIPE_LIST_PAYMENTS',
              display_name: 'List payments',
              description: 'List Stripe payments.',
              parameters: { limit: { type: 'number' } },
            },
          ],
        })
      }),
    }

    const result = (await service.searchAvailableIntegrations(
      { query: 'payments', limit: 2 },
      'agent:analyst:stub',
    )) as Record<string, any>

    expect(result).toMatchObject({
      success: true,
      query: 'payments',
      source: 'capabilities_text',
      integrations: [
        {
          integration_id: 'stripe',
          execution_mode: 'legacy',
          actions: [expect.objectContaining({ action_slug: 'STRIPE_LIST_PAYMENTS' })],
        },
      ],
    })
  })

  it('initiates composio connection and persists a pending integration row', async () => {
    const service = makeService()
    service.resolveUserId = vi.fn(() => 'user-1')
    service.resolveOrgId = vi.fn(() => 'org-1')
    service.serviceClient = {
      from: vi.fn((table: string) => {
        expect(table).toBe('project_composio_toolkit_config')
        return makeQueryResult({
          data: {
            integration_id: 'google_drive',
            toolkit_slug: 'googledrive',
            auth_config_id: 'auth-1',
            enabled: true,
            metadata: { execution_mode: 'composio' },
          },
        })
      }),
    }
    const upsertQuery = makeQueryResult({ data: null })
    service.getUserClient = vi.fn(async () => ({
      from: vi.fn((table: string) => {
        expect(table).toBe('user_integrations')
        return upsertQuery
      }),
    }))
    service.composioService = {
      initiateConnectedAccount: vi.fn(async () => ({
        id: 'connection-1',
        redirectUrl: 'https://connect.example/connection-1',
        status: 'INITIATED',
      })),
    }

    const result = (await service.initiateIntegrationConnect(
      { integration_id: 'google_drive', callback_url: 'https://app.example/callback' },
      'agent:copywriter:stub',
    )) as Record<string, unknown>

    expect(result).toMatchObject({
      success: true,
      integration_id: 'google_drive',
      connection_id: 'connection-1',
      redirect_url: 'https://connect.example/connection-1',
      status: 'INITIATED',
    })
    expect(service.composioService.initiateConnectedAccount).toHaveBeenCalledWith('user-1', 'auth-1', {
      callbackUrl: 'https://app.example/callback',
      allowMultiple: true,
    })
    expect(upsertQuery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        org_id: 'org-1',
        integration_id: 'google_drive',
        status: 'pending',
      }),
      { onConflict: 'user_id,integration_id,org_id' },
    )
  })

  it('resolves agent domain from scoped agent registry row', async () => {
    const service = makeService()
    service.parseAgentIdFromSessionKey = vi.fn(() => 'analyst')
    service.parseConversationIdFromSessionKey = vi.fn(() => 'conv-1')
    service.requestContext = { get: vi.fn(() => ({ orgId: 'org-1' })) }
    service.resolveUserId = vi.fn(() => 'user-1')
    service.getUserClient = vi.fn(async () => ({
      from: vi.fn((table: string) => {
        expect(table).toBe('agents_registry')
        return makeQueryResult({
          data: {
            agent_key: 'analyst',
            level: 'employee',
            role: 'Growth & Performance Analyst',
            config: { capability_profile: 'managed_domain', capability_domain: 'analyst' },
          },
        })
      }),
    }))

    await expect(service.resolveAgentDomain('agent:analyst:stub')).resolves.toBe('analyst')
  })

  it('resolves campaign by campaign_name and sticks it to conversation', async () => {
    const service = makeService()
    const userId = '11111111-1111-1111-1111-111111111111'
    const conversationId = '22222222-2222-2222-2222-222222222222'
    const sessionKey = `agent:vibey:vibey-${userId}-${conversationId}`

    const updateEqUser = vi.fn().mockResolvedValue({ error: null })
    const updateEqId = vi.fn().mockReturnValue({ eq: updateEqUser })
    const update = vi.fn().mockReturnValue({ eq: updateEqId })

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'campaigns') {
          const resolvedData = { data: [{ id: 'campaign-q2', name: 'Q2 Launch' }], error: null }
          const limitMock = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue(resolvedData),
            }),
          })
          const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
          const ilikeMock = vi.fn().mockReturnValue({ order: orderMock })
          const neqMock = vi.fn().mockReturnValue({ ilike: ilikeMock })
          return {
            select: vi.fn().mockReturnValue({ neq: neqMock }),
          }
        }
        if (table === 'conversations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi
                    .fn()
                    .mockResolvedValue({ data: { campaign_id: null }, error: null }),
                }),
              }),
            }),
            update,
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }
      }),
    }

    const result = await service.resolveCampaignId(
      supabase,
      { campaign_name: 'Q2 Launch' },
      userId,
      sessionKey,
    )

    expect(result).toBe('campaign-q2')
    expect(update).toHaveBeenCalledWith({ campaign_id: 'campaign-q2' })
  })

  it('does not overwrite an existing conversation campaign from campaign_name', async () => {
    const service = makeService()
    const userId = '11111111-1111-1111-1111-111111111111'
    const conversationId = '22222222-2222-2222-2222-222222222222'
    const sessionKey = `agent:vibey:vibey-${userId}-${conversationId}`

    const updateEqUser = vi.fn().mockResolvedValue({ error: null })
    const updateEqId = vi.fn().mockReturnValue({ eq: updateEqUser })
    const update = vi.fn().mockReturnValue({ eq: updateEqId })

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'campaigns') {
          const resolvedData = { data: [{ id: 'campaign-q2', name: 'Q2 Launch' }], error: null }
          const limitMock = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue(resolvedData),
            }),
          })
          const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
          const ilikeMock = vi.fn().mockReturnValue({ order: orderMock })
          const neqMock = vi.fn().mockReturnValue({ ilike: ilikeMock })
          return {
            select: vi.fn().mockReturnValue({ neq: neqMock }),
          }
        }
        if (table === 'conversations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi
                    .fn()
                    .mockResolvedValue({ data: { campaign_id: 'campaign-existing' }, error: null }),
                }),
              }),
            }),
            update,
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }
      }),
    }

    const result = await service.resolveCampaignId(
      supabase,
      { campaign_name: 'Q2 Launch' },
      userId,
      sessionKey,
    )

    expect(result).toBe('campaign-q2')
    expect(update).not.toHaveBeenCalled()
  })

  it('returns an explicit ambiguity error for campaign_name with multiple exact matches', async () => {
    const service = makeService()
    const userId = '11111111-1111-1111-1111-111111111111'
    const sessionKey = `agent:vibey:vibey-${userId}-22222222-2222-2222-2222-222222222222`
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'campaigns') {
          const resolvedData = {
            data: [
              { id: 'campaign-a', name: 'Q2 Launch' },
              { id: 'campaign-b', name: 'Q2 Launch' },
            ],
            error: null,
          }
          const limitMock = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue(resolvedData),
            }),
          })
          const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
          const ilikeMock = vi.fn().mockReturnValue({ order: orderMock })
          const neqMock = vi.fn().mockReturnValue({ ilike: ilikeMock })
          return {
            select: vi.fn().mockReturnValue({ neq: neqMock }),
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }
      }),
    }

    await expect(
      service.resolveCampaignId(supabase, { campaign_name: 'Q2 Launch' }, userId, sessionKey),
    ).rejects.toThrow('campaign_name is ambiguous')
  })

  it('falls back to general campaign when campaign context is missing', async () => {
    const service = makeService()
    service.parseCampaignIdFromSessionKey = vi.fn(() => null)
    service.parseConversationId = vi.fn(() => 'conv-1')
    service.requestContext = { get: vi.fn(() => null), set: vi.fn() }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'conversations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { campaign_id: null } }),
                }),
              }),
            }),
          }
        }
        if (table === 'campaigns') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                contains: vi.fn().mockReturnValue({
                  neq: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue({
                        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'general-id' } }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }
      }),
    }

    const result = await service.resolveCampaignId(supabase, {}, 'user-1', 'agent:vibey:stub')
    expect(result).toBe('general-id')
  })
})

describe('ArtifactsService RBAC — campaign analytics wrappers', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn() as unknown as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  const ANALYTICS_ACTIONS = [
    'get_campaign_main_dashboard',
    'get_campaign_social_analytics',
    'get_campaign_stripe_overview',
  ] as const

  const dataFor = (action: (typeof ANALYTICS_ACTIONS)[number]) => {
    if (action === 'get_campaign_social_analytics') {
      return { campaign_id: 'campaign-1', platform: 'instagram' }
    }
    return { campaign_id: 'campaign-1' }
  }

  it('fails closed for campaign analytics when the policy service is unavailable', async () => {
    const service = makeService()
    withAgent(service, 'copywriter', {
      agent_key: 'copywriter',
      level: 'employee',
      role: 'Senior Conversion Copywriter',
      config: { capability_profile: 'managed_domain', capability_domain: 'marketing' },
    })
    service.getActionRegistryForTests().get_campaign_main_dashboard = vi.fn(async () => ({
      success: true,
    }))

    const result = await service.executeAction(
      'get_campaign_main_dashboard',
      { campaign_id: 'campaign-1' },
      'agent:copywriter:stub',
    )

    expect((result as { success?: boolean }).success).toBe(false)
    expect(String((result as { error?: string }).error)).toContain('policy service is unavailable')
    expect(service.getActionRegistryForTests().get_campaign_main_dashboard).not.toHaveBeenCalled()
  })

  // Allowed profiles
  const allowedProfiles: Array<{ name: string; agent: Record<string, unknown> }> = [
    {
      name: 'marketing employee',
      agent: {
        agent_key: 'copywriter',
        level: 'employee',
        role: 'Senior Conversion Copywriter',
        config: { capability_profile: 'managed_domain', capability_domain: 'marketing' },
      },
    },
    {
      name: 'analyst employee',
      agent: {
        agent_key: 'analyst',
        level: 'employee',
        role: 'Growth & Performance Analyst',
        config: { capability_profile: 'managed_domain', capability_domain: 'analyst' },
      },
    },
    {
      name: 'operations employee',
      agent: {
        agent_key: 'pm',
        level: 'employee',
        role: 'Campaign Project Manager',
        config: { capability_profile: 'managed_domain', capability_domain: 'operations' },
      },
    },
    {
      name: 'vibey ceo',
      agent: {
        agent_key: 'vibey',
        level: 'system',
        role: 'CMO',
        config: { capability_profile: 'vibey_ceo', capability_domain: 'management' },
      },
    },
  ]

  for (const action of ANALYTICS_ACTIONS) {
    for (const { name, agent } of allowedProfiles) {
      it(`allows ${name} to call ${action}`, async () => {
        const service = makeService()
        withAgent(service, agent.agent_key as string, agent)
        allowAgentAccessPolicies(service)
        service.getActionRegistryForTests()[action] = vi.fn(async () => ({
          success: true,
          action,
        }))

        const result = await service.executeAction(
          action,
          dataFor(action),
          `agent:${agent.agent_key}:stub`,
        )
        expect((result as { success?: boolean }).success).toBe(true)
        expect(service.getActionRegistryForTests()[action]).toHaveBeenCalledTimes(1)
      })
    }
  }

  // Denied profiles
  const deniedProfiles: Array<{
    name: string
    agent: Record<string, unknown>
    reasonMatch: RegExp
  }> = [
    {
      name: 'hr',
      agent: {
        agent_key: 'hr',
        level: 'system',
        role: 'Recruiter',
        config: { capability_profile: 'system_hr', capability_domain: 'management' },
      },
      reasonMatch: /HR agents/i,
    },
    {
      name: 'brain scholar',
      agent: {
        agent_key: 'atlas',
        level: 'employee',
        role: 'Brain Scholar',
        config: { capability_profile: 'system_brain', capability_domain: 'management' },
      },
      reasonMatch: /Brain agents/i,
    },
    {
      name: 'viktor builder',
      agent: {
        agent_key: 'viktor',
        level: 'employee',
        role: 'Widget Experience Engineer',
        config: { capability_profile: 'system_builder', capability_domain: 'developer' },
      },
      reasonMatch: /Builder agents/i,
    },
    {
      name: 'developer employee',
      agent: {
        agent_key: 'developer',
        level: 'employee',
        role: 'Senior Full-Stack Web Engineer',
        config: { capability_profile: 'managed_domain', capability_domain: 'developer' },
      },
      reasonMatch: /developer domain/i,
    },
  ]

  for (const action of ANALYTICS_ACTIONS) {
    for (const { name, agent, reasonMatch } of deniedProfiles) {
      it(`denies ${name} from calling ${action}`, async () => {
        const service = makeService()
        withAgent(service, agent.agent_key as string, agent)
        allowAgentAccessPolicies(service)

        const result = await service.executeAction(
          action,
          dataFor(action),
          `agent:${agent.agent_key}:stub`,
        )
        expect((result as { success?: boolean }).success).toBe(false)
        expect(String((result as { error?: string }).error)).toMatch(reasonMatch)
      })
    }
  }

  it('rejects get_campaign_social_analytics without platform', async () => {
    const service = makeService()
    withAgent(service, 'analyst', {
      agent_key: 'analyst',
      level: 'employee',
      role: 'Growth & Performance Analyst',
      config: { capability_profile: 'managed_domain', capability_domain: 'analyst' },
    })
    allowAgentAccessPolicies(service)

    const result = await service.executeAction(
      'get_campaign_social_analytics',
      { campaign_id: 'c1' },
      'agent:analyst:stub',
    )
    expect((result as { success?: boolean }).success).toBe(false)
    expect(String((result as { error?: string }).error)).toMatch(/platform.*required/i)
  })

  it('rejects get_campaign_social_analytics with invalid platform', async () => {
    const service = makeService()
    withAgent(service, 'analyst', {
      agent_key: 'analyst',
      level: 'employee',
      role: 'Growth & Performance Analyst',
      config: { capability_profile: 'managed_domain', capability_domain: 'analyst' },
    })
    allowAgentAccessPolicies(service)

    const result = await service.executeAction(
      'get_campaign_social_analytics',
      { campaign_id: 'c1', platform: 'twitter' },
      'agent:analyst:stub',
    )
    expect((result as { success?: boolean }).success).toBe(false)
    expect(String((result as { error?: string }).error)).toMatch(/instagram.*linkedin/i)
  })

  it('backfilled get_daily_report_data is now reachable by analyst employee', async () => {
    const service = makeService()
    withAgent(service, 'analyst', {
      agent_key: 'analyst',
      level: 'employee',
      role: 'Growth & Performance Analyst',
      config: { capability_profile: 'managed_domain', capability_domain: 'analyst' },
    })
    service.getActionRegistryForTests().get_daily_report_data = vi.fn(async () => ({
      campaign_id: 'c1',
      funnels: null,
      emails: null,
      ads: null,
    }))

    const result = await service.executeAction(
      'get_daily_report_data',
      { hours: 24 },
      'agent:analyst:stub',
    )
    expect((result as { campaign_id?: string }).campaign_id).toBe('c1')
  })
})
