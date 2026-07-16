import { describe, expect, it, vi } from 'vitest'
import { IntegrationsOverviewService } from '../integrations-overview.service'

function makeQuery(result: Record<string, unknown>) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    in: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
  }
  return query
}

describe('IntegrationsOverviewService', () => {
  it('repairs duplicate Google Calendar labels across distinct Composio accounts', async () => {
    const row1 = {
      id: 'ui-1',
      user_id: 'user-1',
      integration_id: 'google_calendar',
      provider: 'google_calendar',
      status: 'connected',
      agent_enabled: true,
      connection_label: 'dylanvanas@gmail.com',
      metadata: {
        composio_connected_account_id: 'ca-1',
        composio_toolkit_slug: 'googlecalendar',
      },
      scope_mode: 'personal',
    }
    const row2 = {
      id: 'ui-2',
      user_id: 'user-1',
      integration_id: 'google_calendar',
      provider: 'google_calendar',
      status: 'connected',
      agent_enabled: true,
      connection_label: 'dylanvanas@gmail.com',
      metadata: {
        composio_connected_account_id: 'ca-2',
        composio_toolkit_slug: 'googlecalendar',
      },
      scope_mode: 'personal',
    }
    const updateIntegrationById = vi.fn(async () => ({ error: null }))
    const resolveConnectionIdentity = vi.fn(
      async (_integrationId: string, _userId: string, connectionId?: string) => {
        if (connectionId === 'ca-1') return 'dylanvanas@gmail.com'
        if (connectionId === 'ca-2') return 'other@gmail.com'
        return null
      },
    )
    const upsertPersonalScopedIntegration = vi.fn()
    const repository = {
      table: vi.fn((_client: unknown, table: string) => {
        if (table === 'project_composio_toolkit_config') {
          return makeQuery({ data: [], error: null })
        }
        return makeQuery({ data: [row1, row2], error: null })
      }),
      findAdminPersonalOpenAICodexIntegration: vi.fn(async () => null),
      findAdminPersonalAnthropicClaudeIntegration: vi.fn(async () => null),
    }
    const service = new IntegrationsOverviewService(
      repository as never,
      {
        listConnectedAccounts: vi.fn(async () => [
          { id: 'ca-1', status: 'ACTIVE', toolkitSlug: 'googlecalendar' },
          { id: 'ca-2', status: 'ACTIVE', toolkitSlug: 'googlecalendar' },
        ]),
      } as never,
      {
        applyScope: vi.fn(async () => ({ data: [row1, row2], error: null })),
        isOrgContext: vi.fn(() => false),
      } as never,
      { hasSecret: vi.fn(async () => false) } as never,
      {
        mapComposioToolkitToIntegrationId: vi.fn((slug: string) =>
          slug === 'googlecalendar' ? 'google_calendar' : null,
        ),
        updateIntegrationById,
        resolveConnectionIdentity,
        upsertPersonalScopedIntegration,
        insertPersonalScopedIntegration: vi.fn(),
      } as never,
      {} as never,
      { syncExpiredConnectedRows: vi.fn(async () => new Map()) } as never,
    )

    const result = await service.getOverview({} as never, { id: 'user-1' }, {
      orgId: null,
    } as never)

    expect(upsertPersonalScopedIntegration).not.toHaveBeenCalled()
    expect(resolveConnectionIdentity).toHaveBeenCalledWith('google_calendar', 'user-1', 'ca-2')
    expect(updateIntegrationById).toHaveBeenCalledWith(
      expect.anything(),
      'ui-2',
      expect.objectContaining({ connection_label: 'other@gmail.com' }),
    )
    const calendarRows = result.integrations.filter(
      (row) => row.integration_id === 'google_calendar',
    )
    expect(calendarRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'ui-1',
          connection_label: 'dylanvanas@gmail.com',
          status: 'connected',
        }),
        expect.objectContaining({
          id: 'ui-2',
          connection_label: 'other@gmail.com',
          status: 'connected',
        }),
      ]),
    )
    expect(result.groupedIntegrations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          integration_id: 'google_calendar',
          connected_count: 2,
        }),
      ]),
    )
  })

  it('reclaims stomped duplicate rows onto distinct Composio account ids', async () => {
    const row1 = {
      id: 'ui-1',
      user_id: 'user-1',
      integration_id: 'google_calendar',
      provider: 'google_calendar',
      status: 'connected',
      agent_enabled: true,
      connection_label: 'dylanvanas@gmail.com',
      metadata: {
        composio_connected_account_id: 'ca-1',
        composio_toolkit_slug: 'googlecalendar',
      },
      scope_mode: 'personal',
    }
    const row2 = {
      id: 'ui-2',
      user_id: 'user-1',
      integration_id: 'google_calendar',
      provider: 'google_calendar',
      status: 'connected',
      agent_enabled: true,
      connection_label: 'dylanvanas@gmail.com',
      metadata: {
        composio_connected_account_id: 'ca-1',
        composio_toolkit_slug: 'googlecalendar',
      },
      scope_mode: 'personal',
    }
    const updateIntegrationById = vi.fn(async () => ({ error: null }))
    const resolveConnectionIdentity = vi.fn(
      async (_integrationId: string, _userId: string, connectionId?: string) => {
        if (connectionId === 'ca-1') return 'dylanvanas@gmail.com'
        if (connectionId === 'ca-2') return 'other@gmail.com'
        return null
      },
    )
    const insertPersonalScopedIntegration = vi.fn()
    const repository = {
      table: vi.fn((_client: unknown, table: string) => {
        if (table === 'project_composio_toolkit_config') {
          return makeQuery({ data: [], error: null })
        }
        return makeQuery({ data: [row1, row2], error: null })
      }),
      findAdminPersonalOpenAICodexIntegration: vi.fn(async () => null),
      findAdminPersonalAnthropicClaudeIntegration: vi.fn(async () => null),
    }
    const service = new IntegrationsOverviewService(
      repository as never,
      {
        listConnectedAccounts: vi.fn(async () => [
          { id: 'ca-1', status: 'ACTIVE', toolkitSlug: 'googlecalendar' },
          { id: 'ca-2', status: 'ACTIVE', toolkitSlug: 'googlecalendar' },
        ]),
      } as never,
      {
        applyScope: vi.fn(async () => ({ data: [row1, row2], error: null })),
        isOrgContext: vi.fn(() => false),
      } as never,
      { hasSecret: vi.fn(async () => false) } as never,
      {
        mapComposioToolkitToIntegrationId: vi.fn((slug: string) =>
          slug === 'googlecalendar' ? 'google_calendar' : null,
        ),
        updateIntegrationById,
        resolveConnectionIdentity,
        upsertPersonalScopedIntegration: vi.fn(),
        insertPersonalScopedIntegration,
      } as never,
      {} as never,
      { syncExpiredConnectedRows: vi.fn(async () => new Map()) } as never,
    )

    const result = await service.getOverview({} as never, { id: 'user-1' }, {
      orgId: null,
    } as never)

    expect(insertPersonalScopedIntegration).not.toHaveBeenCalled()
    const calendarRows = result.integrations.filter(
      (row) => row.integration_id === 'google_calendar',
    )
    expect(calendarRows).toHaveLength(2)
    expect(calendarRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ connection_label: 'dylanvanas@gmail.com' }),
        expect.objectContaining({ connection_label: 'other@gmail.com' }),
      ]),
    )
    const connectionIds = calendarRows.map(
      (row) =>
        (row.metadata as Record<string, unknown> | undefined)?.composio_connected_account_id,
    )
    expect(connectionIds.sort()).toEqual(['ca-1', 'ca-2'])
  })

  it('returns admin subscription rows as disconnected when their vault secret is missing', async () => {
    const openAICodexRow = {
      id: 'openai-row',
      user_id: 'user-1',
      integration_id: 'openai_codex',
      provider: 'openai-codex',
      status: 'connected',
      agent_enabled: true,
      metadata: { vault_secret_label: 'oauth:default' },
    }
    const anthropicClaudeRow = {
      id: 'claude-row',
      user_id: 'user-1',
      integration_id: 'anthropic_claude',
      provider: 'anthropic',
      status: 'connected',
      agent_enabled: true,
      metadata: { vault_secret_label: 'setup-token:default' },
    }
    const vault = { hasSecret: vi.fn(async () => false) }
    const repository = {
      table: vi.fn((_client: unknown, table: string) => {
        if (table === 'project_composio_toolkit_config') {
          return makeQuery({ data: [], error: null })
        }
        return makeQuery({ data: [openAICodexRow, anthropicClaudeRow], error: null })
      }),
      findAdminPersonalOpenAICodexIntegration: vi.fn(async () => openAICodexRow),
      findAdminPersonalAnthropicClaudeIntegration: vi.fn(async () => anthropicClaudeRow),
    }
    const service = new IntegrationsOverviewService(
      repository as never,
      { listConnectedAccounts: vi.fn(async () => []) } as never,
      {
        applyScope: vi.fn(async () => ({
          data: [openAICodexRow, anthropicClaudeRow],
          error: null,
        })),
        isOrgContext: vi.fn(() => false),
      } as never,
      vault as never,
      { mapComposioToolkitToIntegrationId: vi.fn() } as never,
      {} as never,
      { syncExpiredConnectedRows: vi.fn(async () => new Map()) } as never,
    )

    const result = await service.getOverview({} as never, { id: 'user-1' }, {
      orgId: null,
    } as never)

    expect(result.connectedProviders).not.toContain('openai_codex')
    expect(result.connectedProviders).not.toContain('anthropic_claude')
    expect(vault.hasSecret).toHaveBeenCalledWith('user-1', 'openai-codex', 'oauth:default')
    expect(vault.hasSecret).toHaveBeenCalledWith('user-1', 'anthropic', 'setup-token:default')
    expect(result.integrations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ integration_id: 'openai_codex', status: 'disconnected' }),
        expect.objectContaining({ integration_id: 'anthropic_claude', status: 'disconnected' }),
      ]),
    )
    expect(result.groupedIntegrations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ integration_id: 'openai_codex', connected_count: 0 }),
        expect.objectContaining({ integration_id: 'anthropic_claude', connected_count: 0 }),
      ]),
    )
  })
})
