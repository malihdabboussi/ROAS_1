import { describe, expect, it, vi } from 'vitest'
import { GoogleDriveConnectionService } from '../services/google-drive-connection.service'
import { GoogleDriveController } from './google-drive.controller'

function createController() {
  const composio = {
    initiateConnectedAccount: vi.fn().mockResolvedValue({
      id: 'connected-account-1',
      redirectUrl: 'https://composio.example.com/auth',
    }),
    disconnectConnectedAccount: vi.fn().mockResolvedValue(undefined),
  }
  const repo = {
    listConnectionStatusRows: vi.fn(),
    getToolkitConfig: vi.fn(),
    upsertPersonalConnection: vi.fn().mockResolvedValue(undefined),
    getPersonalConnectionMetadata: vi.fn(),
    markPersonalConnectionDisconnected: vi.fn().mockResolvedValue(undefined),
  }

  return {
    controller: new GoogleDriveController(
      new GoogleDriveConnectionService(composio as never, repo as never),
    ),
    composio,
    repo,
  }
}

describe('GoogleDriveController connection routes', () => {
  it('reports the best connected Drive row for an organization scope', async () => {
    const { controller, repo } = createController()
    repo.listConnectionStatusRows.mockResolvedValue([
      {
        id: 'shared-1',
        user_id: 'user-2',
        status: 'connected',
        scope_mode: 'org_shared',
        is_default: true,
        connected_at: '2026-06-08T00:00:00Z',
        metadata: {
          composio_connected_account_id: 'shared-account',
          email: 'shared@example.com',
          display_name: 'Shared Drive',
        },
      },
      {
        id: 'personal-1',
        user_id: 'user-1',
        status: 'connected',
        scope_mode: 'personal',
        is_default: false,
        connected_at: '2026-06-08T01:00:00Z',
        metadata: {
          composio_connected_account_id: 'personal-account',
          email: 'me@example.com',
          display_name: 'My Drive',
        },
      },
    ])

    await expect(
      controller.status(
        {} as never,
        { id: 'user-1' },
        { userId: 'user-1', orgId: 'org-1', orgRole: 'admin' },
      ),
    ).resolves.toEqual({
      success: true,
      connected: true,
      status: 'connected',
      email: 'me@example.com',
      displayName: 'My Drive',
      connectedAt: '2026-06-08T01:00:00Z',
    })
    expect(repo.listConnectionStatusRows).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      expect.objectContaining({ orgId: 'org-1' }),
    )
  })

  it('creates a pending personal Drive integration row when connecting for the first time', async () => {
    const { controller, composio, repo } = createController()
    repo.getToolkitConfig.mockResolvedValue({
      auth_config_id: 'auth-config-1',
      toolkit_slug: 'googledrive',
      enabled: true,
    })

    await expect(
      controller.connect({} as never, { id: 'user-1' }, { redirectTo: '/settings' }),
    ).resolves.toEqual({
      success: true,
      authorizeUrl: 'https://composio.example.com/auth',
    })
    expect(composio.initiateConnectedAccount).toHaveBeenCalledWith(
      'user-1',
      'auth-config-1',
      expect.objectContaining({
        callbackUrl: expect.stringContaining('integration_id=google_drive'),
        longRedirectUrl: true,
        allowMultiple: true,
      }),
    )
    expect(repo.upsertPersonalConnection).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'google_drive',
      expect.objectContaining({
        user_id: 'user-1',
        integration_id: 'google_drive',
        status: 'pending',
        metadata: expect.objectContaining({
          composio_connected_account_id: 'connected-account-1',
          composio_auth_config_id: 'auth-config-1',
          composio_toolkit_slug: 'googledrive',
        }),
      }),
    )
  })

  it('disconnects the Composio account and marks Drive integration disconnected', async () => {
    const { controller, composio, repo } = createController()
    repo.getPersonalConnectionMetadata.mockResolvedValue({
      composio_connected_account_id: 'connected-account-1',
    })

    await expect(controller.disconnect({} as never, { id: 'user-1' })).resolves.toEqual({
      success: true,
    })
    expect(composio.disconnectConnectedAccount).toHaveBeenCalledWith('connected-account-1')
    expect(repo.markPersonalConnectionDisconnected).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'google_drive',
    )
  })
})
