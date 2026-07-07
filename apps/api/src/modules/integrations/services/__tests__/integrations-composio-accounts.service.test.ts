import { describe, expect, it, vi } from 'vitest'
import { IntegrationsComposioService } from '../integrations-composio.service'

function supabaseWithIntegrationRows(rows: Array<Record<string, unknown>>) {
  return {
    from: vi.fn(() => {
      const filters: Array<(row: Record<string, unknown>) => boolean> = []
      const query: Record<string, unknown> = {
        select: () => query,
        not: () => query,
        eq: (column: string, value: unknown) => {
          filters.push((row) => row[column] === value)
          return query
        },
        is: (column: string, value: null) => {
          filters.push((row) => row[column] === value)
          return query
        },
        then: (resolve: (value: { data: typeof rows; error: null }) => void) =>
          resolve({
            data: rows.filter((row) => filters.every((filter) => filter(row))),
            error: null,
          }),
      }
      return query
    }),
  }
}

function serviceWithAccounts(accounts: Array<Record<string, unknown>>) {
  return new IntegrationsComposioService(
    { table: vi.fn((client, tableName: string) => client.from(tableName)) } as never,
    { listConnectedAccounts: vi.fn().mockResolvedValue(accounts) } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  )
}

describe('IntegrationsComposioService.listComposioAccounts', () => {
  it('reuses an already active Composio connection instead of creating a new link', async () => {
    const reusable = {
      connectionId: 'ca_existing',
      userIntegrationId: 'ui_1',
      status: 'connected' as const,
      connectionScope: 'personal' as const,
    }
    const composio = { initiateConnectedAccount: vi.fn() }
    const core = {
      resolveScopeMode: vi.fn(() => 'personal'),
      resolveIntegrationConfig: vi.fn(async () => ({
        integration_id: 'google_drive',
        toolkit_slug: 'googledrive',
        auth_config_id: 'auth-1',
        enabled: true,
        metadata: {},
      })),
      resolveReusableComposioConnection: vi.fn(async () => reusable),
      isOrgAdminOrOwner: vi.fn(() => false),
    }
    const service = new IntegrationsComposioService(
      {} as never,
      composio as never,
      { isOrgContext: vi.fn(() => false) } as never,
      core as never,
      {} as never,
      {} as never,
    )

    const result = await service.connectWithComposio(
      {} as never,
      { id: 'user_1' },
      { userId: 'user_1', orgId: null, orgRole: null },
      { integration_id: 'google_drive' },
    )

    expect(result).toMatchObject({
      success: true,
      connection_id: 'ca_existing',
      user_integration_id: 'ui_1',
      status: 'connected',
      reused: true,
    })
    expect(composio.initiateConnectedAccount).not.toHaveBeenCalled()
  })

  it('requests a Composio shared account for org-shared OAuth connects without broad ACLs', async () => {
    const composio = {
      initiateConnectedAccount: vi.fn(async () => ({
        id: 'ca_shared',
        redirectUrl: 'https://connect.composio.dev/link/shared',
        status: 'INITIATED',
      })),
    }
    const core = {
      resolveScopeMode: vi.fn(() => 'org_shared'),
      resolveIntegrationConfig: vi.fn(async () => ({
        integration_id: 'google_drive',
        toolkit_slug: 'googledrive',
        auth_config_id: 'auth-1',
        enabled: true,
        metadata: {},
      })),
      resolveReusableComposioConnection: vi.fn(async () => null),
      isOrgAdminOrOwner: vi.fn(() => true),
      insertOrgSharedIntegration: vi.fn(async () => ({ id: 'ui_shared', error: null })),
    }
    const service = new IntegrationsComposioService(
      {} as never,
      composio as never,
      { isOrgContext: vi.fn(() => true) } as never,
      core as never,
      {} as never,
      {} as never,
    )

    const result = await service.connectWithComposio(
      {} as never,
      { id: 'user_1' },
      { userId: 'user_1', orgId: 'org_1', orgRole: 'owner' },
      { integration_id: 'google_drive', connection_scope: 'org_shared' },
    )

    expect(result).toMatchObject({
      success: true,
      connection_id: 'ca_shared',
      user_integration_id: 'ui_shared',
      connection_scope: 'org_shared',
    })
    expect(composio.initiateConnectedAccount).toHaveBeenCalledWith(
      'user_1',
      'auth-1',
      expect.objectContaining({ allowMultiple: true, accountType: 'SHARED' }),
    )
  })

  it('executes Composio tools with the selected connected account id', async () => {
    const row = {
      id: 'ui_1',
      user_id: 'owner_1',
      status: 'connected',
      scope_mode: 'org_shared',
      metadata: { composio_connected_account_id: 'ca_shared' },
    }
    const query: Record<string, unknown> = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(async () => ({ data: [row], error: null })),
    }
    const repository = { table: vi.fn(() => query) }
    const composio = { executeTool: vi.fn(async () => ({ ok: true })) }
    const core = { pickPreferredScopedConnectionRow: vi.fn(() => row) }
    const service = new IntegrationsComposioService(
      repository as never,
      composio as never,
      { applyScope: vi.fn((q) => q) } as never,
      core as never,
      {} as never,
      {} as never,
    )

    const result = await service.executeComposioTool(
      {} as never,
      { id: 'user_1' },
      { userId: 'user_1', orgId: 'org_1', orgRole: 'admin' },
      { service: 'gmail', action: 'GMAIL_SEND_EMAIL', params: { subject: 'Hi' } },
    )

    expect(result).toEqual({ success: true, result: { ok: true } })
    expect(composio.executeTool).toHaveBeenCalledWith(
      'GMAIL_SEND_EMAIL',
      'owner_1',
      { subject: 'Hi' },
      'ca_shared',
    )
  })

  it('returns only current user personal rows and org-shared rows in org context', async () => {
    const service = serviceWithAccounts([
      { id: 'ca_current', status: 'ACTIVE', toolkit: { slug: 'gmail' } },
      { id: 'ca_other_personal', status: 'ACTIVE', toolkit: { slug: 'gmail' } },
      { id: 'ca_shared', status: 'ACTIVE', toolkit: { slug: 'gmail' } },
    ])
    const supabase = supabaseWithIntegrationRows([
      {
        integration_id: 'gmail',
        user_id: 'user_1',
        org_id: 'org_1',
        scope_mode: 'personal',
        status: 'connected',
        connection_label: 'Tennis EU',
        metadata: { composio_connected_account_id: 'ca_current' },
      },
      {
        integration_id: 'gmail',
        user_id: 'user_2',
        org_id: 'org_1',
        scope_mode: 'personal',
        status: 'connected',
        connection_label: 'Other personal',
        metadata: { composio_connected_account_id: 'ca_other_personal' },
      },
      {
        integration_id: 'gmail',
        user_id: 'user_2',
        org_id: 'org_1',
        scope_mode: 'org_shared',
        status: 'connected',
        connection_label: 'Shared Gmail',
        metadata: { composio_connected_account_id: 'ca_shared' },
      },
    ])

    const result = await service.listComposioAccounts(
      supabase as never,
      { id: 'user_1' },
      { userId: 'user_1', orgId: 'org_1', orgRole: 'owner' },
    )

    expect(result.accounts).toEqual([
      expect.objectContaining({ id: 'ca_current', connection_label: 'Tennis EU' }),
      expect.objectContaining({ id: 'ca_shared', connection_label: 'Shared Gmail' }),
    ])
  })

  it('returns only personal no-org rows in personal context', async () => {
    const service = serviceWithAccounts([
      { id: 'ca_personal', status: 'ACTIVE', toolkit: { slug: 'gmail' } },
      { id: 'ca_org', status: 'ACTIVE', toolkit: { slug: 'gmail' } },
    ])
    const supabase = supabaseWithIntegrationRows([
      {
        integration_id: 'gmail',
        user_id: 'user_1',
        org_id: null,
        scope_mode: 'personal',
        status: 'connected',
        metadata: { composio_connected_account_id: 'ca_personal' },
      },
      {
        integration_id: 'gmail',
        user_id: 'user_1',
        org_id: 'org_1',
        scope_mode: 'personal',
        status: 'connected',
        metadata: { composio_connected_account_id: 'ca_org' },
      },
    ])

    const result = await service.listComposioAccounts(
      supabase as never,
      { id: 'user_1' },
      { userId: 'user_1', orgId: null, orgRole: null },
    )

    expect(result.accounts).toEqual([expect.objectContaining({ id: 'ca_personal' })])
  })
})
