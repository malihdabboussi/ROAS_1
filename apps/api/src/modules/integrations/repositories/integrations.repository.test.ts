import { describe, expect, it, vi } from 'vitest'
import { IntegrationsRepository } from './integrations.repository'

function makeQuery(data: Record<string, unknown> | null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data })),
  }
  return query
}

describe('IntegrationsRepository', () => {
  it('returns the personal admin integration row for a superadmin', async () => {
    const adminIntegrationRow = {
      id: 'row-1',
      user_id: 'user-1',
      integration_id: 'openai_codex',
      status: 'connected',
    }
    const profileQuery = makeQuery({ role: 'superadmin' })
    const integrationQuery = makeQuery(adminIntegrationRow)
    const serviceClient = {
      from: vi.fn((table: string) => (table === 'user_profiles' ? profileQuery : integrationQuery)),
    }
    const repository = new IntegrationsRepository({ client: serviceClient } as never)

    const row = await repository.findAdminPersonalOpenAICodexIntegration('user-1')

    expect(row).toEqual(adminIntegrationRow)
    expect(serviceClient.from).toHaveBeenCalledWith('user_profiles')
    expect(serviceClient.from).toHaveBeenCalledWith('user_integrations')
    expect(integrationQuery.eq).toHaveBeenCalledWith('integration_id', 'openai_codex')
    expect(integrationQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(integrationQuery.is).toHaveBeenCalledWith('org_id', null)
  })

  it('returns the personal Anthropic Claude row for a superadmin', async () => {
    const anthropicClaudeRow = {
      id: 'row-1',
      user_id: 'user-1',
      integration_id: 'anthropic_claude',
      status: 'connected',
    }
    const profileQuery = makeQuery({ role: 'superadmin' })
    const integrationQuery = makeQuery(anthropicClaudeRow)
    const serviceClient = {
      from: vi.fn((table: string) => (table === 'user_profiles' ? profileQuery : integrationQuery)),
    }
    const repository = new IntegrationsRepository({ client: serviceClient } as never)

    const row = await repository.findAdminPersonalAnthropicClaudeIntegration('user-1')

    expect(row).toEqual(anthropicClaudeRow)
    expect(integrationQuery.eq).toHaveBeenCalledWith('integration_id', 'anthropic_claude')
    expect(integrationQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(integrationQuery.is).toHaveBeenCalledWith('org_id', null)
  })

  it('does not read OpenAI Codex rows for non-admin users', async () => {
    const profileQuery = makeQuery({ role: 'user' })
    const integrationQuery = makeQuery({ id: 'row-1' })
    const serviceClient = {
      from: vi.fn((table: string) => (table === 'user_profiles' ? profileQuery : integrationQuery)),
    }
    const repository = new IntegrationsRepository({ client: serviceClient } as never)

    const row = await repository.findAdminPersonalOpenAICodexIntegration('user-1')

    expect(row).toBeNull()
    expect(serviceClient.from).toHaveBeenCalledTimes(1)
    expect(serviceClient.from).toHaveBeenCalledWith('user_profiles')
  })
})
