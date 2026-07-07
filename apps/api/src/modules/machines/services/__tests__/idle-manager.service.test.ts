import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IdleManagerService } from '../idle-manager.service'

function makeService(staleRows: Array<{ id: string }> = []) {
  const client = {}
  const machines = {
    destroyMachine: vi.fn().mockResolvedValue(undefined),
  }
  const repository = {
    listStaleProfiles: vi.fn().mockResolvedValue(staleRows),
  }
  const service = new IdleManagerService(
    machines as never,
    { inspectRuntimeState: vi.fn() } as never,
    { client } as never,
    repository as never,
  )
  return { service, machines, repository, client }
}

describe('IdleManagerService stale cleanup', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-04T00:00:00.000Z'))
    delete process.env.MACHINE_STALE_THRESHOLD_DAYS
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses 30 days as the default stale machine threshold', async () => {
    const { service, machines, repository, client } = makeService([{ id: 'user-1' }])

    await expect(service.cleanupStaleMachines()).resolves.toEqual({ checked: 1, destroyed: 1 })

    expect(repository.listStaleProfiles).toHaveBeenCalledWith(
      '2026-05-05T00:00:00.000Z',
      expect.objectContaining({
        machineId: 'fly_machine_id',
        runtimeLastActivityAt: 'fly_runtime_last_activity_at',
      }),
    )
    expect(machines.destroyMachine).toHaveBeenCalledWith(client, 'user-1')
  })

  it('does not destroy anything when no stale profiles are returned', async () => {
    const { service, machines } = makeService([])

    await expect(service.cleanupStaleMachines()).resolves.toEqual({ checked: 0, destroyed: 0 })

    expect(machines.destroyMachine).not.toHaveBeenCalled()
  })
})

describe('IdleManagerService status snapshots and stats', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-17T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('records a machine status snapshot when no idle machines need suspension', async () => {
    const repository = {
      listIdleProfiles: vi.fn().mockResolvedValue([]),
      getMachineStatusCounts: vi.fn().mockResolvedValue([
        { status: 'running', count: 3 },
        { status: 'suspended', count: 1 },
        { status: 'failed', count: 1 },
        { status: 'none', count: 5 },
      ]),
      countRunningProfilesWithMachines: vi.fn().mockResolvedValue(2),
      insertMachineStatusSnapshot: vi.fn().mockResolvedValue(undefined),
    }
    const service = new IdleManagerService(
      { suspendIdleMachine: vi.fn() } as never,
      { inspectRuntimeState: vi.fn() } as never,
      { client: {} } as never,
      repository as never,
    )

    await expect(service.checkIdleMachines()).resolves.toEqual({ checked: 0, suspended: 0 })

    expect(repository.getMachineStatusCounts).toHaveBeenCalledWith('production')
    expect(repository.insertMachineStatusSnapshot).toHaveBeenCalledWith({
      total: 10,
      running: 3,
      suspended: 1,
      failed: 1,
      noneStatus: 5,
      alwaysOn: 2,
      estimatedHourlyCost: 3 * 0.0226,
    })
  })

  it('aggregates machine stats from counts, Fly inspection, and status snapshots', async () => {
    const repository = {
      getMachineStatusCounts: vi.fn().mockResolvedValue([
        { status: 'running', count: 2 },
        { status: 'suspended', count: 1 },
        { status: 'failed', count: 1 },
        { status: 'none', count: 1 },
      ]),
      listPublishedRunningProfileIds: vi.fn().mockResolvedValue(['user-1', 'user-1', 'user-2']),
      listMachineStatusSnapshots: vi
        .fn()
        .mockResolvedValueOnce([
          { snapshot_at: '2026-06-17T00:00:00.000Z', running: 2, estimated_hourly_cost: 0.05 },
          { snapshot_at: '2026-06-17T00:05:00.000Z', running: 4, estimated_hourly_cost: 0.07 },
        ])
        .mockResolvedValueOnce([
          { snapshot_at: '2026-06-16T23:55:00.000Z', running: 1, estimated_hourly_cost: 0.02 },
          { snapshot_at: '2026-06-17T00:00:00.000Z', running: 3, estimated_hourly_cost: 0.06 },
        ])
        .mockResolvedValueOnce([
          { snapshot_at: '2026-06-01T00:00:00.000Z', running: 5, estimated_hourly_cost: 0.1 },
        ]),
    }
    const service = new IdleManagerService(
      { suspendIdleMachine: vi.fn() } as never,
      {
        inspectRuntimeState: vi.fn().mockResolvedValue({
          checked: { flyMachines: 7 },
          fly: { started: 2, stopped: 1, suspended: 1, destroyed: 1, unknown: 2 },
          drift: {
            startedProfileDrift: 1,
            startedPoolDrift: 0,
            startedOrphanDrift: 1,
            dbRunningNotStarted: 0,
            dbRunningMissingFly: 0,
            dbStartingStale: 0,
          },
        }),
      } as never,
      { client: {} } as never,
      repository as never,
    )

    await expect(service.getMachineStats()).resolves.toMatchObject({
      live: { total: 5, running: 2, suspended: 1, failed: 1, alwaysOn: 2 },
      fly: { total: 7, started: 2, stopped: 1, suspended: 1, destroyed: 1, unknown: 2 },
      costs: {
        estimatedDailyCost: 2 * 0.0226 * 24,
        avgRunningMachines24h: 3,
        avgRunningMachines7d: 2,
        avgActiveHoursPerMachine7d: 0.1,
      },
      trends: {
        running7d: [
          { date: '2026-06-16', avg: 1 },
          { date: '2026-06-17', avg: 3 },
        ],
        cost30d: [{ date: '2026-06-01', cost: 2.4 }],
      },
    })
  })
})
