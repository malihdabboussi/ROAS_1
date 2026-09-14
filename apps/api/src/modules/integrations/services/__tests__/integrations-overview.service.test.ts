import { describe, expect, it, vi } from 'vitest'
import { IntegrationsOverviewService } from '../integrations-overview.service'

function makeQuery(result: Record<string, unknown>) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    in: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
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
      { listActiveSlugs: vi.fn(async () => []) } as never,
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

  it('collapses multiple rows that share the same Composio connection id', async () => {
    const row1 = {
      id: 'ui-keep',
      user_id: 'user-1',
      integration_id: 'google_calendar',
      provider: 'google_calendar',
      status: 'connected',
      agent_enabled: true,
      is_default: true,
      connection_label: 'dylanvanas@gmail.com',
      connected_at: '2026-07-01T00:00:00.000Z',
      metadata: {
        composio_connected_account_id: 'ca-1',
        composio_toolkit_slug: 'googlecalendar',
      },
      scope_mode: 'personal',
    }
    const row2 = {
      id: 'ui-dup-a',
      user_id: 'user-1',
      integration_id: 'google_calendar',
      provider: 'google_calendar',
      status: 'connected',
      agent_enabled: true,
      is_default: false,
      connection_label: 'dylanvanas@gmail.com',
      connected_at: '2026-07-02T00:00:00.000Z',
      metadata: {
        composio_connected_account_id: 'ca-1',
        composio_toolkit_slug: 'googlecalendar',
      },
      scope_mode: 'personal',
    }
    const row3 = {
      id: 'ui-dup-b',
      user_id: 'user-1',
      integration_id: 'google_calendar',
      provider: 'google_calendar',
      status: 'connected',
      agent_enabled: true,
      is_default: false,
      connection_label: 'dylanvanas@gmail.com',
      connected_at: '2026-07-03T00:00:00.000Z',
      metadata: {
        composio_connected_account_id: 'ca-1',
        composio_toolkit_slug: 'googlecalendar',
      },
      scope_mode: 'personal',
    }
    const updateIntegrationById = vi.fn(async () => ({ error: null }))
    const repository = {
      table: vi.fn((_client: unknown, table: string) => {
        if (table === 'project_composio_toolkit_config') {
          return makeQuery({ data: [], error: null })
        }
        return makeQuery({ data: [row1, row2, row3], error: null })
      }),
      findAdminPersonalOpenAICodexIntegration: vi.fn(async () => null),
      findAdminPersonalAnthropicClaudeIntegration: vi.fn(async () => null),
    }
    const service = new IntegrationsOverviewService(
      repository as never,
      {
        listConnectedAccounts: vi.fn(async () => [
          { id: 'ca-1', status: 'ACTIVE', toolkitSlug: 'googlecalendar' },
        ]),
      } as never,
      {
        applyScope: vi.fn(async () => ({ data: [row1, row2, row3], error: null })),
        isOrgContext: vi.fn(() => false),
      } as never,
      { hasSecret: vi.fn(async () => false) } as never,
      {
        mapComposioToolkitToIntegrationId: vi.fn((slug: string) =>
          slug === 'googlecalendar' ? 'google_calendar' : null,
        ),
        updateIntegrationById,
        resolveConnectionIdentity: vi.fn(async () => 'dylanvanas@gmail.com'),
        upsertPersonalScopedIntegration: vi.fn(),
        insertPersonalScopedIntegration: vi.fn(),
      } as never,
      {} as never,
      { syncExpiredConnectedRows: vi.fn(async () => new Map()) } as never,
      { listActiveSlugs: vi.fn(async () => []) } as never,
    )

    const result = await service.getOverview({} as never, { id: 'user-1' }, {
      orgId: null,
    } as never)

    const calendarRows = result.integrations.filter(
      (row) => row.integration_id === 'google_calendar',
    )
    expect(calendarRows).toHaveLength(1)
    expect(calendarRows[0]).toEqual(
      expect.objectContaining({
        id: 'ui-keep',
        connection_label: 'dylanvanas@gmail.com',
        status: 'connected',
      }),
    )
    expect(updateIntegrationById).toHaveBeenCalledWith(
      expect.anything(),
      'ui-dup-a',
      expect.objectContaining({
        status: 'disconnected',
        metadata: expect.objectContaining({
          collapsed_duplicate_of: 'ui-keep',
          previous_composio_connected_account_id: 'ca-1',
        }),
      }),
    )
    expect(updateIntegrationById).toHaveBeenCalledWith(
      expect.anything(),
      'ui-dup-b',
      expect.objectContaining({
        status: 'disconnected',
        metadata: expect.objectContaining({
          collapsed_duplicate_of: 'ui-keep',
          previous_composio_connected_account_id: 'ca-1',
        }),
      }),
    )
    const collapsedMetaCalls = updateIntegrationById.mock.calls.filter(
      (call) => call[1] === 'ui-dup-a' || call[1] === 'ui-dup-b',
    )
    for (const call of collapsedMetaCalls) {
      expect(call[2]?.metadata).not.toHaveProperty('composio_connected_account_id')
    }
    expect(result.groupedIntegrations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          integration_id: 'google_calendar',
          connected_count: 1,
        }),
      ]),
    )
  })

  it('does not remap already-disconnected duplicate rows back to connected', async () => {
    const keep = {
      id: 'ui-keep',
      user_id: 'user-1',
      integration_id: 'google_calendar',
      provider: 'google_calendar',
      status: 'connected',
      agent_enabled: true,
      is_default: true,
      connection_label: 'dylanvanas@gmail.com',
      metadata: {
        composio_connected_account_id: 'ca-1',
        composio_toolkit_slug: 'googlecalendar',
      },
      scope_mode: 'personal',
    }
    const disconnectedDups = [1, 2, 3, 4].map((n) => ({
      id: `ui-dup-${n}`,
      user_id: 'user-1',
      integration_id: 'google_calendar',
      provider: 'google_calendar',
      status: 'disconnected',
      agent_enabled: true,
      is_default: false,
      connection_label: 'dylanvanas@gmail.com',
      metadata: {
        composio_connected_account_id: 'ca-1',
        composio_toolkit_slug: 'googlecalendar',
        collapsed_duplicate_of: 'ui-keep',
      },
      scope_mode: 'personal',
    }))
    const other = {
      id: 'ui-other',
      user_id: 'user-1',
      integration_id: 'google_calendar',
      provider: 'google_calendar',
      status: 'connected',
      agent_enabled: true,
      is_default: false,
      connection_label: 'dylan@dylanvanas.com',
      metadata: {
        composio_connected_account_id: 'ca-2',
        composio_toolkit_slug: 'googlecalendar',
      },
      scope_mode: 'personal',
    }
    const rows = [keep, ...disconnectedDups, other]
    const updateIntegrationById = vi.fn(async () => ({ error: null }))
    const repository = {
      table: vi.fn((_client: unknown, table: string) => {
        if (table === 'project_composio_toolkit_config') {
          return makeQuery({ data: [], error: null })
        }
        return makeQuery({ data: rows, error: null })
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
        applyScope: vi.fn(async () => ({ data: rows, error: null })),
        isOrgContext: vi.fn(() => false),
      } as never,
      { hasSecret: vi.fn(async () => false) } as never,
      {
        mapComposioToolkitToIntegrationId: vi.fn((slug: string) =>
          slug === 'googlecalendar' ? 'google_calendar' : null,
        ),
        updateIntegrationById,
        resolveConnectionIdentity: vi.fn(async (_integrationId, _userId, connectionId) =>
          connectionId === 'ca-2' ? 'dylan@dylanvanas.com' : 'dylanvanas@gmail.com',
        ),
        upsertPersonalScopedIntegration: vi.fn(),
        insertPersonalScopedIntegration: vi.fn(),
      } as never,
      {} as never,
      { syncExpiredConnectedRows: vi.fn(async () => new Map()) } as never,
      { listActiveSlugs: vi.fn(async () => []) } as never,
    )

    const result = await service.getOverview({} as never, { id: 'user-1' }, {
      orgId: null,
    } as never)

    const calendarRows = result.integrations.filter(
      (row) => row.integration_id === 'google_calendar',
    )
    const connectedCalendar = calendarRows.filter((row) => row.status === 'connected')
    expect(connectedCalendar).toHaveLength(2)
    expect(connectedCalendar.map((row) => row.id).sort()).toEqual(['ui-keep', 'ui-other'])
    expect(
      calendarRows
        .filter((row) => String(row.id ?? '').startsWith('ui-dup-'))
        .every((row) => row.status === 'disconnected'),
    ).toBe(true)
    expect(updateIntegrationById).toHaveBeenCalledWith(
      expect.anything(),
      'ui-dup-1',
      expect.objectContaining({
        metadata: expect.objectContaining({
          previous_composio_connected_account_id: 'ca-1',
        }),
      }),
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
      { listActiveSlugs: vi.fn(async () => []) } as never,
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
      (row) => (row.metadata as Record<string, unknown> | undefined)?.composio_connected_account_id,
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
      { listActiveSlugs: vi.fn(async () => []) } as never,
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

  it('treats missing toolkit execution_mode as legacy so native OAuth stays connected', async () => {
    const fathomRow = {
      id: 'fathom-1',
      user_id: 'user-1',
      integration_id: 'fathom',
      provider: 'fathom',
      status: 'connected',
      agent_enabled: true,
      metadata: { access_token_present: true },
      scope_mode: 'personal',
    }
    const repository = {
      table: vi.fn((_client: unknown, table: string) => {
        if (table === 'project_composio_toolkit_config') {
          return makeQuery({
            data: [
              {
                integration_id: 'fathom',
                enabled: true,
                metadata: {},
              },
            ],
            error: null,
          })
        }
        return makeQuery({ data: [fathomRow], error: null })
      }),
      findAdminPersonalOpenAICodexIntegration: vi.fn(async () => null),
      findAdminPersonalAnthropicClaudeIntegration: vi.fn(async () => null),
    }
    const service = new IntegrationsOverviewService(
      repository as never,
      { listConnectedAccounts: vi.fn(async () => []) } as never,
      {
        applyScope: vi.fn(async () => ({ data: [fathomRow], error: null })),
        isOrgContext: vi.fn(() => false),
      } as never,
      { hasSecret: vi.fn(async () => false) } as never,
      { mapComposioToolkitToIntegrationId: vi.fn(() => null) } as never,
      {} as never,
      { syncExpiredConnectedRows: vi.fn(async () => new Map()) } as never,
      { listActiveSlugs: vi.fn(async () => []) } as never,
    )

    const result = await service.getOverview({} as never, { id: 'user-1' }, {
      orgId: null,
    } as never)

    expect(result.providerModes.fathom).toBe('legacy')
    expect(result.connectedProviders).toContain('fathom')
    expect(result.integrations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          integration_id: 'fathom',
          status: 'connected',
          metadata: expect.objectContaining({ execution_mode: 'legacy' }),
        }),
      ]),
    )
  })

  it('includes connected Page Grader rows in personal overview', async () => {
    const pageGraderRow = {
      id: 'ui-pg-1',
      user_id: 'user-1',
      integration_id: 'page_grader',
      provider: 'page_grader',
      status: 'connected',
      agent_enabled: true,
      metadata: { base_url_host: 'mjaxhuehopzbsuhmseeg.supabase.co' },
      scope_mode: 'personal',
    }
    const inCalls: Array<{ column: string; ids: string[] }> = []
    const repository = {
      table: vi.fn((_client: unknown, table: string) => {
        if (table === 'project_composio_toolkit_config') {
          return makeQuery({ data: [], error: null })
        }
        const query = makeQuery({ data: [pageGraderRow], error: null })
        query.in = vi.fn((column: string, ids: string[]) => {
          inCalls.push({ column, ids })
          return query
        })
        return query
      }),
      findAdminPersonalOpenAICodexIntegration: vi.fn(async () => null),
      findAdminPersonalAnthropicClaudeIntegration: vi.fn(async () => null),
    }
    const service = new IntegrationsOverviewService(
      repository as never,
      { listConnectedAccounts: vi.fn(async () => []) } as never,
      {
        applyScope: vi.fn(async () => ({ data: [pageGraderRow], error: null })),
        isOrgContext: vi.fn(() => false),
      } as never,
      {
        hasSecret: vi.fn(async (_userId: string, provider: string, label: string) => {
          return provider === 'page_grader' && (label === 'base_url' || label === 'api_key')
        }),
      } as never,
      { mapComposioToolkitToIntegrationId: vi.fn(() => null) } as never,
      {} as never,
      { syncExpiredConnectedRows: vi.fn(async () => new Map()) } as never,
      { listActiveSlugs: vi.fn(async () => []) } as never,
    )

    const result = await service.getOverview({} as never, { id: 'user-1' }, {
      orgId: null,
    } as never)

    expect(inCalls.some((call) => call.ids.includes('page_grader'))).toBe(true)
    expect(result.connectedProviders).toContain('page_grader')
    expect(result.integrations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'ui-pg-1',
          integration_id: 'page_grader',
          status: 'connected',
        }),
      ]),
    )
  })
})
