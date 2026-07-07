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
