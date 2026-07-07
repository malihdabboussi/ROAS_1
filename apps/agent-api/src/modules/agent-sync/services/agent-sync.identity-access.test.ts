import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgentSyncService } from './agent-sync.service'

function makeQuery(data: unknown[] = [], error: { message: string } | null = null) {
  const result = Promise.resolve({ data, error })
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    limit: vi.fn(() => query),
    update: vi.fn(() => query),
    single: vi.fn(async () => ({ data: data[0] ?? null, error })),
    then: result.then.bind(result),
  }
  return query
}

function makeService(tables: Record<string, unknown[]>) {
  const queries: any[] = []
  const supabase = {
    from: vi.fn((table: string) => {
      const query = makeQuery(tables[table] ?? [])
      queries.push(query)
      return query
    }),
  }
  const config = {
    get: vi.fn((_key: string, fallback?: string) => fallback ?? ''),
  }
  const service = new AgentSyncService(
    config as any,
    { client: supabase } as any,
    {} as any,
    {} as any,
  ) as any
  return { service, supabase, queries }
}

describe('AgentSyncService identity and override data access', () => {
  const originalMachineId = process.env.FLY_MACHINE_ID

  afterEach(() => {
    if (originalMachineId === undefined) delete process.env.FLY_MACHINE_ID
    else process.env.FLY_MACHINE_ID = originalMachineId
  })

  it('loads system agent keys with fallback keys kept', async () => {
    const { service } = makeService({
      agents_registry: [{ agent_key: 'custom_system' }],
    })

    const keys = await service.loadSystemAgentKeys()

    expect(keys.has('atlas')).toBe(true)
    expect(keys.has('custom_system')).toBe(true)
  })

  it('loads scoped skill deny overrides', async () => {
    const { service } = makeService({
      agent_overrides: [
        { agent_key: 'zara', capability_id: 'campaigns' },
        { agent_key: 'atlas', capability_id: 'billing' },
      ],
    })

    const denySet = await service.loadSkillDenySet('user-1', null)

    expect([...denySet].sort()).toEqual(['atlas:billing', 'zara:campaigns'])
  })

  it('resolves and updates profile machine identity', async () => {
    process.env.FLY_MACHINE_ID = 'machine-1'
    const { service, queries } = makeService({
      profiles: [{ id: 'user-1' }],
    })

    await expect(service.resolveUserIdFromMachineId()).resolves.toBe('user-1')
    await service.autoUpdateProfileMachineId('user-1')

    expect(queries[1].update).toHaveBeenCalledWith(expect.any(Object))
    expect(Object.values(queries[1].update.mock.calls[0][0])).toContain('machine-1')
    expect(queries[1].eq).toHaveBeenCalledWith('id', 'user-1')
  })
})
