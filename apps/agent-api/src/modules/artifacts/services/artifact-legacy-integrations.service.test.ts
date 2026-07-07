import { describe, expect, it, vi } from 'vitest'
import { ArtifactLegacyIntegrationsService } from './artifact-legacy-integrations.service'

function query(result: Record<string, unknown>) {
  const chain: any = {
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(() => chain),
    select: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
    then(
      onFulfilled: (value: Record<string, unknown>) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      return Promise.resolve(result).then(onFulfilled, onRejected)
    },
  }
  return chain
}

describe('ArtifactLegacyIntegrationsService', () => {
  it('groups connected integration capabilities for agent-facing capability hints', async () => {
    const userClient = {
      from: vi.fn((table: string) => {
        expect(table).toBe('user_integrations')
        return query({
          data: [
            {
              id: 'integration-1',
              integration_id: 'google_drive',
              status: 'connected',
              agent_enabled: true,
              scope_mode: 'personal',
              user_id: 'user-1',
            },
          ],
          error: null,
        })
      }),
    }
    const serviceClient = {
      from: vi.fn((table: string) => {
        expect(table).toBe('integration_capabilities')
        return query({
          data: [
            {
              action_slug: 'GOOGLEDRIVE_LIST_FILES',
              execution_mode: 'composio',
              integration_id: 'google_drive',
            },
            {
              action_slug: 'GOOGLEDRIVE_DOWNLOAD_FILE',
              execution_mode: 'composio',
              integration_id: 'google_drive',
            },
          ],
          error: null,
        })
      }),
    }
    const target = {
      getUserClient: vi.fn(async () => userClient),
      isMissionSessionKey: vi.fn(() => false),
      resolveOrgId: vi.fn(() => null),
      resolveUserId: vi.fn(() => 'user-1'),
      serviceClient,
    }
    const service = new ArtifactLegacyIntegrationsService()

    const result = (await service.getIntegrationCapabilities(target, 'session')) as Record<
      string,
      any
    >

    expect(result.connected_count).toBe(1)
    expect(result.connected_integrations).toEqual(['google_drive'])
    expect(result.integrations.google_drive).toMatchObject({
      actions: ['GOOGLEDRIVE_LIST_FILES', 'GOOGLEDRIVE_DOWNLOAD_FILE'],
      connected: true,
      execution_mode: 'composio',
    })
  })

  it('passes explicit integration connection ids to the Composio executor', async () => {
    const serviceClient = {
      from: vi.fn((table: string) => {
        expect(table).toBe('project_composio_toolkit_config')
        return query({
          data: { enabled: true, metadata: { execution_mode: 'composio' } },
          error: null,
        })
      }),
    }
    const target = {
      serviceClient,
      useComposioTool: vi.fn(async () => ({ success: true })),
    }
    const service = new ArtifactLegacyIntegrationsService()

    await service.useIntegration(
      target,
      {
        service: 'google_drive',
        integration_action: 'GOOGLEDRIVE_LIST_FILES',
        integration_connection_id: 'ui_personal',
        params: {
          folder_id: 'root',
          integration_connection_id: 'ui_personal',
        },
      },
      'session',
    )

    expect(target.useComposioTool).toHaveBeenCalledWith(
      {
        integration_id: 'google_drive',
        tool_slug: 'GOOGLEDRIVE_LIST_FILES',
        arguments: { folder_id: 'root' },
        integration_connection_id: 'ui_personal',
      },
      'session',
    )
  })
})
