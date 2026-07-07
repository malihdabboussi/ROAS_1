import { describe, expect, it, vi } from 'vitest'
import { ArtifactComposioRuntimeService } from './artifact-composio-runtime.service'

function makeHost(
  rows: Array<Record<string, unknown>>,
  accounts: Array<Record<string, unknown>> = [
    { id: 'ca_personal', status: 'ACTIVE', toolkitSlug: 'googledrive' },
  ],
) {
  return {
    resolveUserId: vi.fn(() => 'user-1'),
    resolveOrgId: vi.fn(() => 'org-1'),
    getUserClient: vi.fn(async () => ({})),
    integrationsRepository: {
      listComposioIntegrationRows: vi.fn(async () => ({ data: rows, error: null })),
      updateComposioIntegrationRow: vi.fn(async () => ({ error: null })),
      insertComposioIntegrationRow: vi.fn(async () => ({ error: null })),
    },
    composioService: {
      executeTool: vi.fn(async () => ({ ok: true })),
      listConnectedAccounts: vi.fn(async () => accounts),
    },
  }
}

function resolveConfig() {
  return Promise.resolve({
    integration_id: 'google_drive',
    toolkit_slug: 'googledrive',
    auth_config_id: 'auth-1',
    enabled: true,
    execution_mode: 'composio' as const,
  })
}

describe('ArtifactComposioRuntimeService scoped connection selection', () => {
  it('auto-uses a valid personal connection in org scope without an explicit connection id', async () => {
    const host = makeHost([
      {
        id: 'personal-1',
        user_id: 'user-1',
        status: 'connected',
        agent_enabled: true,
        scope_mode: 'personal',
        metadata: { composio_connected_account_id: 'ca_personal' },
      },
    ])
    const runtime = new ArtifactComposioRuntimeService()

    const result = (await runtime.useComposioTool(
      host,
      {
        integration_id: 'google_drive',
        tool_slug: 'GOOGLEDRIVE_LIST_FILES',
        arguments: { folder_id: 'root' },
      },
      'session',
      resolveConfig,
    )) as Record<string, unknown>

    expect(result).toMatchObject({
      success: true,
      integration_id: 'google_drive',
      user_integration_id: 'personal-1',
      connection_scope: 'personal',
    })
    expect(host.composioService.executeTool).toHaveBeenCalledWith(
      'GOOGLEDRIVE_LIST_FILES',
      'user-1',
      { folder_id: 'root' },
      'ca_personal',
    )
  })

  it('uses a personal connection in org scope when the explicit connection id is approved', async () => {
    const host = makeHost([
      {
        id: 'personal-1',
        user_id: 'user-1',
        status: 'connected',
        agent_enabled: true,
        scope_mode: 'personal',
        metadata: { composio_connected_account_id: 'ca_personal' },
      },
    ])
    const runtime = new ArtifactComposioRuntimeService()

    const result = (await runtime.useComposioTool(
      host,
      {
        integration_id: 'google_drive',
        tool_slug: 'GOOGLEDRIVE_LIST_FILES',
        integration_connection_id: 'personal-1',
        arguments: { folder_id: 'root' },
      },
      'session',
      resolveConfig,
    )) as Record<string, unknown>

    expect(result).toMatchObject({
      success: true,
      integration_id: 'google_drive',
      user_integration_id: 'personal-1',
      connection_scope: 'personal',
    })
    expect(host.composioService.executeTool).toHaveBeenCalledWith(
      'GOOGLEDRIVE_LIST_FILES',
      'user-1',
      { folder_id: 'root' },
      'ca_personal',
    )
  })

  it('returns a reconnect doctor when the stored Composio account is no longer active', async () => {
    const host = makeHost(
      [
        {
          id: 'personal-1',
          user_id: 'user-1',
          status: 'connected',
          agent_enabled: true,
          scope_mode: 'personal',
          metadata: { composio_connected_account_id: 'ca_expired' },
        },
      ],
      [],
    )
    const runtime = new ArtifactComposioRuntimeService()

    const result = (await runtime.useComposioTool(
      host,
      {
        integration_id: 'google_drive',
        tool_slug: 'GOOGLEDRIVE_LIST_FILES',
        arguments: { folder_id: 'root' },
      },
      'session',
      resolveConfig,
    )) as Record<string, any>

    expect(result).toMatchObject({
      success: false,
      integration_id: 'google_drive',
      status: 'needs_reconnect',
      repair: expect.objectContaining({
        status: 'needs_reconnect',
        primaryAction: expect.objectContaining({ type: 'reconnect' }),
      }),
      integration_doctor: expect.objectContaining({
        status: 'needs_reconnect',
        summary: expect.stringContaining('provider session expired'),
      }),
    })
    expect(host.composioService.executeTool).not.toHaveBeenCalled()
  })
})
