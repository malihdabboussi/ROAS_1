import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MachineReconciliationService } from '../machine-reconciliation.service'

function machine(
  id: string,
  state: 'started' | 'stopped',
  env: Record<string, string> = {},
) {
  return {
    id,
    name: id,
    state,
    updatedAt: null,
    rawState: state,
    metadata: {},
    env,
  }
}

function profile(id: string, machineId: string, runtimeStatus: string) {
  return {
    id,
    email: null,
    full_name: null,
    machineId,
    runtimeApp: 'vibey-runtimes',
    runtimeStatus,
    machineStatus: runtimeStatus,
    lastActivityAt: null,
  }
}

function pool(machineId: string, state: string) {
  return {
    machine_id: machineId,
    fly_app: 'vibey-runtimes',
    state,
    claimed_by: null,
    claimed_at: null,
    failed_reason: null,
  }
}

function makeService() {
  const flyState = {
    stopMachine: vi.fn().mockResolvedValue(undefined),
    waitForState: vi.fn().mockResolvedValue('stopped'),
  }
  const machinesService = {
    resetMachineIdentity: vi.fn().mockResolvedValue(true),
  }
  const repository = {
    updateReconciliationProfileStatus: vi.fn().mockResolvedValue(null),
  }
  const service = new MachineReconciliationService(
    flyState as never,
    machinesService as never,
    repository as never,
  )
  return { service, flyState, machinesService, repository }
}

describe('MachineReconciliationService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('resets runtime identity before stopping started pool and orphan drift', async () => {
    const { service, flyState, machinesService, repository } = makeService()
    ;(
      service as unknown as {
        loadContext: () => Promise<{
          flyMachines: ReturnType<typeof machine>[]
          profilesByMachineId: Map<string, ReturnType<typeof profile>>
          poolByMachineId: Map<string, ReturnType<typeof pool>>
        }>
      }
    ).loadContext = vi.fn().mockResolvedValue({
      flyMachines: [
        machine('profile-suspended', 'started'),
        machine('pool-started', 'started'),
        machine('orphan-started', 'started'),
        machine('profile-running', 'started'),
        machine('db-running-stopped', 'stopped'),
      ],
      profilesByMachineId: new Map([
        ['profile-suspended', profile('user-1', 'profile-suspended', 'suspended')],
        ['profile-running', profile('user-2', 'profile-running', 'running')],
        ['db-running-stopped', profile('user-3', 'db-running-stopped', 'running')],
      ]),
      poolByMachineId: new Map([['pool-started', pool('pool-started', 'failed')]]),
    })

    const report = await service.reconcileRuntimeState()

    expect(report.drift).toMatchObject({
      startedProfileDrift: 1,
      startedPoolDrift: 1,
      startedOrphanDrift: 1,
      dbRunningNotStarted: 1,
      dbRunningMissingFly: 0,
    })
    expect(report.actions).toMatchObject({
      stoppedProfileMachines: 1,
      stoppedPoolMachines: 1,
      stoppedOrphanMachines: 1,
      markedDbSuspended: 1,
      failedStops: 0,
      failedResets: 0,
    })
    expect(machinesService.resetMachineIdentity).toHaveBeenCalledWith(
      'pool-started',
      'vibey-runtimes',
    )
    expect(machinesService.resetMachineIdentity).toHaveBeenCalledWith(
      'orphan-started',
      'roas-runtimes',
    )
    expect(machinesService.resetMachineIdentity).toHaveBeenCalledTimes(2)
    expect(machinesService.resetMachineIdentity.mock.invocationCallOrder[0]).toBeLessThan(
      flyState.stopMachine.mock.invocationCallOrder[1],
    )
    expect(flyState.stopMachine).toHaveBeenCalledTimes(3)
    expect(flyState.stopMachine).not.toHaveBeenCalledWith('profile-running', 'vibey-runtimes')
    expect(repository.updateReconciliationProfileStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        machineId: 'fly_machine_id',
      }),
      {
        id: 'user-3',
        machineId: 'db-running-stopped',
        runtimeStatus: 'suspended',
        machineStatus: 'suspended',
      },
    )
  })

  it('reports reset failures without counting the pool machine as stopped', async () => {
    const { service, flyState, machinesService } = makeService()
    machinesService.resetMachineIdentity.mockResolvedValue(false)
    ;(
      service as unknown as {
        loadContext: () => Promise<{
          flyMachines: ReturnType<typeof machine>[]
          profilesByMachineId: Map<string, ReturnType<typeof profile>>
          poolByMachineId: Map<string, ReturnType<typeof pool>>
        }>
      }
    ).loadContext = vi.fn().mockResolvedValue({
      flyMachines: [machine('pool-started', 'started')],
      profilesByMachineId: new Map(),
      poolByMachineId: new Map([['pool-started', pool('pool-started', 'failed')]]),
    })

    const report = await service.reconcileRuntimeState()

    expect(report.actions.stoppedPoolMachines).toBe(0)
    expect(report.actions.failedResets).toBe(1)
    expect(report.machineIds.failedResets).toEqual(['pool-started'])
    expect(flyState.stopMachine).not.toHaveBeenCalled()
  })

  it('preserves an unowned shared runtime instead of treating it as orphan drift', async () => {
    const { service, flyState, machinesService } = makeService()
    ;(
      service as unknown as {
        loadContext: () => Promise<{
          flyMachines: ReturnType<typeof machine>[]
          profilesByMachineId: Map<string, ReturnType<typeof profile>>
          poolByMachineId: Map<string, ReturnType<typeof pool>>
        }>
      }
    ).loadContext = vi.fn().mockResolvedValue({
      flyMachines: [machine('shared-runtime', 'started', { AGENT_RUNTIME_MODE: 'shared' })],
      profilesByMachineId: new Map(),
      poolByMachineId: new Map(),
    })

    const report = await service.reconcileRuntimeState()

    expect(report.drift.startedOrphanDrift).toBe(0)
    expect(report.actions.stoppedOrphanMachines).toBe(0)
    expect(machinesService.resetMachineIdentity).not.toHaveBeenCalled()
    expect(flyState.stopMachine).not.toHaveBeenCalled()
  })

  it('repairs stale starting profiles instead of leaving them stuck', async () => {
    const { service, repository } = makeService()
    ;(
      service as unknown as {
        loadContext: () => Promise<{
          flyMachines: ReturnType<typeof machine>[]
          profilesByMachineId: Map<string, ReturnType<typeof profile>>
          poolByMachineId: Map<string, ReturnType<typeof pool>>
        }>
      }
    ).loadContext = vi.fn().mockResolvedValue({
      flyMachines: [machine('starting-stopped', 'stopped'), machine('starting-started', 'started')],
      profilesByMachineId: new Map([
        ['starting-stopped', profile('user-1', 'starting-stopped', 'starting')],
        ['starting-started', profile('user-2', 'starting-started', 'starting')],
      ]),
      poolByMachineId: new Map(),
    })

    const report = await service.reconcileRuntimeState()

    expect(report.drift.dbStartingStale).toBe(2)
    expect(report.actions.markedDbSuspended).toBe(1)
    expect(report.actions.markedDbUnknown).toBe(1)
    expect(repository.updateReconciliationProfileStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        machineId: 'fly_machine_id',
      }),
      {
        id: 'user-1',
        machineId: 'starting-stopped',
        runtimeStatus: 'suspended',
        machineStatus: 'suspended',
      },
    )
    expect(repository.updateReconciliationProfileStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        machineId: 'fly_machine_id',
      }),
      {
        id: 'user-2',
        machineId: 'starting-started',
        runtimeStatus: 'unknown',
        machineStatus: 'unknown',
      },
    )
  })
})
