import { describe, expect, it, vi } from 'vitest'
import { ArtifactIntegrationOrchestratorService } from './artifact-integration-orchestrator.service'

describe('ArtifactIntegrationOrchestratorService connection repair', () => {
  it('requires approval before offering a personal fallback in org scope', async () => {
    const service = new ArtifactIntegrationOrchestratorService()
    const host = {
      serviceClient: {},
      resolveAgentDomain: vi.fn(async () => null),
      resolveUserId: vi.fn(() => 'user-1'),
      resolveOrgId: vi.fn(() => 'org-1'),
      getUserClient: vi.fn(async () => ({})),
      isMissionSessionKey: vi.fn(() => false),
      integrationsRepository: {
        listDetailedCapabilities: vi.fn(async () => ({
          data: [
            {
              action_slug: 'GOOGLEDRIVE_LIST_FILES',
              execution_mode: 'composio',
              display_name: 'List files',
              description: 'List files.',
              parameters: { folder_id: { type: 'string' } },
            },
          ],
          error: null,
        })),
        listIntegrationStatusRows: vi.fn(async () => ({
          data: [
            {
              id: 'org-connection',
              user_id: 'owner-1',
              status: 'disconnected',
              agent_enabled: true,
              scope_mode: 'org_shared',
              is_default: true,
            },
            {
              id: 'personal-connection',
              user_id: 'user-1',
              status: 'connected',
              agent_enabled: true,
              scope_mode: 'personal',
              metadata: { email: 'blake@example.com' },
            },
          ],
          error: null,
        })),
      },
    }

    const result = (await service.getIntegration(
      host,
      { service: 'google_drive' },
      'session',
    )) as Record<string, any>

    expect(result.connected).toBe(false)
    expect(result.status).toBe('fallback_available')
    expect(result.connection_resolution).toMatchObject({
      status: 'fallback_requires_approval',
      fallback_connection_id: 'personal-connection',
    })
    expect(result.integration_doctor).toMatchObject({
      status: 'fallback_available',
      checks: expect.arrayContaining([
        expect.objectContaining({
          label: 'Personal connection',
          status: 'pass',
        }),
      ]),
    })
    expect(result.repair.doctor).toMatchObject({
      status: 'fallback_available',
    })
    expect(result.repair.primaryAction).toMatchObject({
      type: 'use_connection',
      connectionId: 'personal-connection',
      scopeMode: 'personal',
    })
    expect(result.repair.primaryAction.message).toContain(
      'integration_connection_id "personal-connection"',
    )
  })

  it('repairs stale connected rows when Composio reports the account expired', async () => {
    const service = new ArtifactIntegrationOrchestratorService()
    const updateComposioIntegrationRow = vi.fn(async () => ({ error: null }))
    const host = {
      serviceClient: {},
      resolveAgentDomain: vi.fn(async () => null),
      resolveUserId: vi.fn(() => 'user-1'),
      resolveOrgId: vi.fn(() => null),
      getUserClient: vi.fn(async () => ({})),
      isMissionSessionKey: vi.fn(() => false),
      composioService: {
        getConnectedAccount: vi.fn(async () => ({ id: 'ca_expired', status: 'EXPIRED' })),
      },
      integrationsRepository: {
        listDetailedCapabilities: vi.fn(async () => ({
          data: [
            {
              action_slug: 'GMAIL_SEND_EMAIL',
              execution_mode: 'composio',
              display_name: 'Send email',
              description: 'Send email.',
              parameters: { to: { type: 'string' } },
            },
          ],
          error: null,
        })),
        listIntegrationStatusRows: vi.fn(async () => ({
          data: [
            {
              id: 'gmail-row',
              user_id: 'user-1',
              status: 'connected',
              agent_enabled: true,
              scope_mode: 'personal',
              metadata: { composio_connected_account_id: 'ca_expired' },
            },
          ],
          error: null,
        })),
        updateComposioIntegrationRow,
      },
    }

    const result = (await service.getIntegration(host, { service: 'gmail' }, 'session')) as Record<
      string,
      unknown
    >

    expect(result.connected).toBe(false)
    expect(result.status).toBe('needs_reconnect')
    expect(result.integration_doctor).toMatchObject({
      status: 'needs_reconnect',
      summary: expect.stringContaining('provider session expired'),
    })
    expect(result.repair).toMatchObject({
      status: 'needs_reconnect',
      primaryAction: expect.objectContaining({ type: 'reconnect' }),
    })
    expect(updateComposioIntegrationRow).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        id: 'gmail-row',
        payload: expect.objectContaining({
          status: 'needs_reconnect',
          metadata: expect.objectContaining({ composio_status: 'EXPIRED' }),
        }),
      }),
    )
  })

  it('reuses an active Composio account when an agent asks to connect again', async () => {
    const service = new ArtifactIntegrationOrchestratorService()
    const upsertPendingComposioIntegration = vi.fn(async () => ({ error: null }))
    const initiateConnectedAccount = vi.fn()
    const host = {
      serviceClient: {},
      resolveUserId: vi.fn(() => 'user-1'),
      resolveOrgId: vi.fn(() => 'org-1'),
      getUserClient: vi.fn(async () => ({})),
      composioService: {
        listConnectedAccounts: vi.fn(async () => [
          { id: 'ca_active', status: 'ACTIVE', toolkitSlug: 'gmail' },
        ]),
        initiateConnectedAccount,
      },
      integrationsRepository: {
        findComposioConfigByIntegrationId: vi.fn(async () => ({
          data: {
            integration_id: 'gmail',
            toolkit_slug: 'gmail',
            auth_config_id: 'auth-1',
            enabled: true,
            metadata: { execution_mode: 'composio' },
          },
          error: null,
        })),
        upsertPendingComposioIntegration,
      },
    }

    const result = (await service.initiateIntegrationConnect(
      host,
      { integration_id: 'gmail' },
      'session',
    )) as Record<string, unknown>

    expect(result).toMatchObject({
      success: true,
      integration_id: 'gmail',
      connection_id: 'ca_active',
      status: 'connected',
      reused: true,
    })
    expect(initiateConnectedAccount).not.toHaveBeenCalled()
    expect(upsertPendingComposioIntegration).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        status: 'connected',
        scope_mode: 'personal',
        metadata: expect.objectContaining({
          composio_connected_account_id: 'ca_active',
          composio_status: 'ACTIVE',
        }),
      }),
    )
  })

  it('resolveComposioConfig defaults missing execution_mode to legacy', async () => {
    const service = new ArtifactIntegrationOrchestratorService()
    const host = {
      serviceClient: {},
      integrationsRepository: {
        findComposioConfigByIntegrationId: vi.fn(async () => ({
          data: {
            integration_id: 'fathom',
            toolkit_slug: 'fathom',
            auth_config_id: null,
            enabled: true,
            metadata: {},
          },
          error: null,
        })),
      },
    }

    const config = await service.resolveComposioConfig(host, 'fathom', '')
    expect(config).toMatchObject({
      integration_id: 'fathom',
      toolkit_slug: 'fathom',
      enabled: true,
      execution_mode: 'legacy',
    })
  })
})
