import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentPolicyService } from './services/agent-policy.service'

const pgMock = vi.hoisted(() => {
  const clients: MockClient[] = []

  class MockClient {
    readonly handlers = new Map<string, Array<(message: any) => void>>()
    readonly connect = vi.fn(async () => undefined)
    readonly end = vi.fn(async () => undefined)
    readonly query = vi.fn(async () => undefined)

    constructor(readonly options: Record<string, unknown>) {
      clients.push(this)
    }

    on(event: string, handler: (message: any) => void): this {
      const handlers = this.handlers.get(event) ?? []
      handlers.push(handler)
      this.handlers.set(event, handlers)
      return this
    }

    emit(event: string, message: any): void {
      for (const handler of this.handlers.get(event) ?? []) handler(message)
    }
  }

  return { clients, MockClient }
})

vi.mock('pg', () => ({ Client: pgMock.MockClient }))

const originalEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  SUPABASE_DB_URL: process.env.SUPABASE_DB_URL,
  SUPABASE_DIRECT_DB_URL: process.env.SUPABASE_DIRECT_DB_URL,
}

function restoreEnv(): void {
  for (const key of Object.keys(originalEnv) as Array<keyof typeof originalEnv>) {
    const value = originalEnv[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

describe('AgentPolicyService invalidation listener', () => {
  beforeEach(() => {
    pgMock.clients.length = 0
    delete process.env.DATABASE_URL
    delete process.env.SUPABASE_DB_URL
    process.env.SUPABASE_DIRECT_DB_URL = 'postgres://policy-listener'
  })

  afterEach(() => {
    restoreEnv()
    vi.restoreAllMocks()
  })

  it('listens for policy invalidation payloads and busts scoped caches', async () => {
    const service = new AgentPolicyService({ client: {} } as any)
    const bustTeam = vi.spyOn(service, 'bustTeam')
    const bustAgent = vi.spyOn(service, 'bustAgent')

    await service.onModuleInit()

    expect(pgMock.clients).toHaveLength(1)
    const client = pgMock.clients[0]
    expect(client.options).toMatchObject({
      connectionString: 'postgres://policy-listener',
      ssl: { rejectUnauthorized: false },
    })
    expect(client.connect).toHaveBeenCalledTimes(1)
    expect(client.query).toHaveBeenCalledWith('LISTEN agent_policy_invalidate')

    client.emit('notification', {
      payload: JSON.stringify({ agentKey: 'lux', orgId: 'org-1', teamId: 'team-1' }),
    })

    expect(bustTeam).toHaveBeenCalledWith('team-1')
    expect(bustAgent).toHaveBeenCalledWith('lux', { orgId: 'org-1', userId: null })

    await service.onModuleDestroy()

    expect(client.end).toHaveBeenCalledTimes(1)
  })
})
