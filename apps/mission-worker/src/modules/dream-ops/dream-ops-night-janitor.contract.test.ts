import { describe, expect, it, vi } from 'vitest'

async function loadService() {
  const mod = await import('./dream-ops-night-janitor.service')
  expect(mod.DreamOpsNightJanitorService).toBeTypeOf('function')
  return mod.DreamOpsNightJanitorService
}

function makeServiceClient(
  tables: Record<string, unknown[]>,
  inserts: Array<Record<string, unknown>> = [],
) {
  const chainFor = (table: string) => {
    const chain: Record<string, unknown> = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      in: vi.fn(() => chain),
      lte: vi.fn(() => chain),
      gte: vi.fn(() => chain),
      lt: vi.fn(() => chain),
      gt: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      update: vi.fn(() => chain),
      insert: vi.fn((payload: Record<string, unknown>) => {
        inserts.push({ table, payload })
        return { select: vi.fn(() => ({ single: vi.fn(async () => ({ data: { id: 'outbox-1' }, error: null })) })) }
      }),
      then(resolve: (value: { data: unknown[]; error: null }) => unknown) {
        return Promise.resolve({ data: tables[table] ?? [], error: null }).then(resolve)
      },
    }
    return chain
  }

  return {
    from: vi.fn((table: string) => chainFor(table)),
  }
}

describe('DreamOpsNightJanitorService', () => {
  it('queues company daily dream only when source activity exists', async () => {
    const inserts: Array<Record<string, unknown>> = []
    const Service = await loadService()
    const service = new Service(
      { get: vi.fn().mockReturnValue(999999999) },
      { getClient: () => makeServiceClient({
        dream_ops_settings: [
          {
            id: 'setting-1',
            org_id: 'org-1',
            user_id: 'user-1',
            operation_type: 'company_daily_dream',
            subject_kind: 'company_brain',
            subject_key: 'brain-1',
            target_id: 'brain-1',
            enabled: true,
            schedule: 'daily',
            timezone: 'UTC',
            local_time: '00:00',
            lookback_hours: 24,
          },
        ],
        messages: [{ id: 'message-1' }],
      }, inserts) },
    )

    await service.runSweep()

    expect(inserts).toEqual([
      expect.objectContaining({
        table: 'dream_ops_outbox',
        payload: expect.objectContaining({
          operation_type: 'company_daily_dream',
          org_id: 'org-1',
          subject_key: 'brain-1',
        }),
      }),
    ])
  })

  it('does not queue company daily dream when the window is empty', async () => {
    const inserts: Array<Record<string, unknown>> = []
    const Service = await loadService()
    const service = new Service(
      { get: vi.fn().mockReturnValue(999999999) },
      { getClient: () => makeServiceClient({
        dream_ops_settings: [
          {
            id: 'setting-1',
            org_id: 'org-1',
            user_id: 'user-1',
            operation_type: 'company_daily_dream',
            subject_kind: 'company_brain',
            subject_key: 'brain-1',
            target_id: 'brain-1',
            enabled: true,
            schedule: 'daily',
            timezone: 'UTC',
            local_time: '00:00',
            lookback_hours: 24,
          },
        ],
      }, inserts) },
    )

    await service.runSweep()

    expect(inserts).toEqual([])
  })

  it('queues Jaime agent dream only when the agent has learning signals', async () => {
    const inserts: Array<Record<string, unknown>> = []
    const Service = await loadService()
    const service = new Service(
      { get: vi.fn().mockReturnValue(999999999) },
      { getClient: () => makeServiceClient({
        dream_ops_settings: [
          {
            id: 'setting-1',
            org_id: 'org-1',
            user_id: 'user-1',
            operation_type: 'agent_learning_dream',
            subject_kind: 'agent',
            subject_key: 'designer',
            enabled: true,
            schedule: 'daily',
            timezone: 'UTC',
            local_time: '00:00',
            lookback_hours: 24,
          },
        ],
        agent_turn_feedback: [{ id: 'feedback-1' }],
      }, inserts) },
    )

    await service.runSweep()

    expect(inserts[0]).toMatchObject({
      table: 'dream_ops_outbox',
      payload: expect.objectContaining({
        operation_type: 'agent_learning_dream',
        subject_kind: 'agent',
        subject_key: 'designer',
      }),
    })
  })
})
