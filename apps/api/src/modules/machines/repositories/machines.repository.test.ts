import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MachinesRepository } from './machines.repository'

function query(result: { data?: unknown; count?: number | null; error?: unknown } = {}) {
  const promise = Promise.resolve(result)
  const q = {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  }
  ;(q as unknown as PromiseLike<typeof result>).then = promise.then.bind(promise)
  ;(q as unknown as Promise<typeof result>).catch = promise.catch.bind(promise)
  ;(q as unknown as Promise<typeof result>).finally = promise.finally.bind(promise)
  return q
}

describe('MachinesRepository machine wake/status access', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-17T07:00:00.000Z'))
  })

  it('creates wake attempts with the persisted running/profile-lookup shape', async () => {
    const wakeQuery = query({ data: { id: 'wake-1' }, error: null })
    const supabase = {
      from: vi.fn().mockReturnValue(wakeQuery),
    }
    const repository = new MachinesRepository({ client: {} } as never)

    await expect(
      repository.createWakeAttempt(supabase as never, {
        userId: 'user-1',
        machineId: 'machine-1',
        flyApp: 'vibey-runtimes',
        requestedBy: 'ensure_running',
        metadata: { source: 'test' },
      }),
    ).resolves.toEqual({ id: 'wake-1', errorMessage: null })

    expect(supabase.from).toHaveBeenCalledWith('machine_wake_attempts')
    expect(wakeQuery.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      machine_id: 'machine-1',
      fly_app: 'vibey-runtimes',
      requested_by: 'ensure_running',
      status: 'running',
      phase: 'profile_lookup',
      metadata: { source: 'test' },
    })
    expect(wakeQuery.select).toHaveBeenCalledWith('id')
    expect(wakeQuery.single).toHaveBeenCalled()
  })

  it('updates wake attempts with repository-owned updated_at stamping', async () => {
    const wakeQuery = query({ error: null })
    const supabase = {
      from: vi.fn().mockReturnValue(wakeQuery),
    }
    const repository = new MachinesRepository({ client: {} } as never)

    await expect(
      repository.updateWakeAttempt(supabase as never, 'wake-1', {
        status: 'failed_terminal',
        phase: 'ready_probe',
      }),
    ).resolves.toBeNull()

    expect(wakeQuery.update).toHaveBeenCalledWith({
      status: 'failed_terminal',
      phase: 'ready_probe',
      updated_at: '2026-06-17T07:00:00.000Z',
    })
    expect(wakeQuery.eq).toHaveBeenCalledWith('id', 'wake-1')
  })

  it('lists idle profiles using the configured machine profile columns', async () => {
    const profilesQuery = query({ data: [{ id: 'user-1' }] })
    const client = {
      from: vi.fn().mockReturnValue(profilesQuery),
    }
    const repository = new MachinesRepository({ client } as never)

    await expect(
      repository.listIdleProfiles('2026-06-17T06:45:00.000Z', {
        environment: 'production',
        machineId: 'fly_machine_id',
        machineUrl: 'fly_machine_url',
        runtimeApp: 'fly_runtime_app',
        runtimeStatus: 'fly_runtime_status',
        machineStatus: 'fly_machine_status',
        runtimeLastActivityAt: 'fly_runtime_last_activity_at',
        runtimeType: 'agent_runtime_type',
        runtimeUrl: 'agent_runtime_url',
      }),
    ).resolves.toEqual([{ id: 'user-1' }])

    expect(client.from).toHaveBeenCalledWith('profiles')
    expect(profilesQuery.select).toHaveBeenCalledWith(
      'id, fly_machine_id, fly_runtime_app',
    )
    expect(profilesQuery.eq).toHaveBeenCalledWith('fly_runtime_status', 'running')
    expect(profilesQuery.lt).toHaveBeenCalledWith(
      'fly_runtime_last_activity_at',
      '2026-06-17T06:45:00.000Z',
    )
  })

  it('writes machine status snapshots with the dashboard column names', async () => {
    const snapshotQuery = query({ error: null })
    const client = {
      from: vi.fn().mockReturnValue(snapshotQuery),
    }
    const repository = new MachinesRepository({ client } as never)

    await repository.insertMachineStatusSnapshot({
      total: 10,
      running: 3,
      suspended: 1,
      failed: 1,
      noneStatus: 5,
      alwaysOn: 2,
      estimatedHourlyCost: 0.0678,
    })

    expect(client.from).toHaveBeenCalledWith('machine_status_snapshots')
    expect(snapshotQuery.insert).toHaveBeenCalledWith({
      total_machines: 10,
      running: 3,
      suspended: 1,
      failed: 1,
      none_status: 5,
      always_on: 2,
      estimated_hourly_cost: 0.0678,
    })
  })

  it('maps reconciliation profile rows through the configured profile columns', async () => {
    const profilesQuery = query({
      data: [
        {
          id: 'user-1',
          email: 'user@example.com',
          full_name: 'User One',
          fly_machine_id: 'machine-1',
          fly_runtime_app: 'vibey-runtimes',
          fly_runtime_status: 'running',
          fly_machine_status: 'running',
          fly_runtime_last_activity_at: '2026-06-17T06:00:00.000Z',
        },
        { id: 'user-2', fly_machine_id: '' },
      ],
      error: null,
    })
    const client = {
      from: vi.fn().mockReturnValue(profilesQuery),
    }
    const repository = new MachinesRepository({ client } as never)
    const columns = {
      environment: 'production' as const,
      machineId: 'fly_machine_id',
      machineUrl: 'fly_machine_url',
      runtimeApp: 'fly_runtime_app',
      runtimeStatus: 'fly_runtime_status',
      machineStatus: 'fly_machine_status',
      runtimeLastActivityAt: 'fly_runtime_last_activity_at',
      runtimeType: 'agent_runtime_type',
      runtimeUrl: 'agent_runtime_url',
    }

    await expect(repository.listReconciliationProfileRows(columns)).resolves.toEqual([
      {
        id: 'user-1',
        email: 'user@example.com',
        full_name: 'User One',
        machineId: 'machine-1',
        runtimeApp: 'vibey-runtimes',
        runtimeStatus: 'running',
        machineStatus: 'running',
        lastActivityAt: '2026-06-17T06:00:00.000Z',
      },
    ])

    expect(profilesQuery.select).toHaveBeenCalledWith(
      'id, email, full_name, fly_machine_id, fly_runtime_app, fly_runtime_status, fly_machine_status, fly_runtime_last_activity_at',
    )
    expect(profilesQuery.not).toHaveBeenCalledWith('fly_machine_id', 'is', null)
  })

  it('updates reconciliation profile status using the configured machine id guard', async () => {
    const profilesQuery = query({ error: null })
    const client = {
      from: vi.fn().mockReturnValue(profilesQuery),
    }
    const repository = new MachinesRepository({ client } as never)
    const columns = {
      environment: 'production' as const,
      machineId: 'fly_machine_id',
      machineUrl: 'fly_machine_url',
      runtimeApp: 'fly_runtime_app',
      runtimeStatus: 'fly_runtime_status',
      machineStatus: 'fly_machine_status',
      runtimeLastActivityAt: 'fly_runtime_last_activity_at',
      runtimeType: 'agent_runtime_type',
      runtimeUrl: 'agent_runtime_url',
    }

    await expect(
      repository.updateReconciliationProfileStatus(columns, {
        id: 'user-1',
        machineId: 'machine-1',
        runtimeStatus: 'suspended',
        machineStatus: 'suspended',
      }),
    ).resolves.toBeNull()

    expect(profilesQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        fly_runtime_status: 'suspended',
        fly_machine_status: 'suspended',
      }),
    )
    expect(profilesQuery.eq).toHaveBeenCalledWith('id', 'user-1')
    expect(profilesQuery.eq).toHaveBeenCalledWith('fly_machine_id', 'machine-1')
  })
})
