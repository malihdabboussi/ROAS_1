import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MachinePoolService } from '../machine-pool.service'

function makeService() {
  process.env.MACHINE_POOL_REPLENISH_ENABLED = 'true'
  process.env.MACHINE_POOL_SIZE = '1'
  const machinesService = {
    flyApiToken: 'fly-token',
    flyApiBase: 'https://api.machines.dev/v1',
    flyRuntimeApp: 'vibey-runtimes',
    startMachine: vi.fn().mockResolvedValue(true),
    resetMachineIdentity: vi.fn().mockResolvedValue(true),
    waitForMachineHealth: vi.fn().mockResolvedValue(true),
    waitForUserReady: vi.fn().mockResolvedValue(true),
    resolveFlyImageRef: vi.fn().mockResolvedValue('registry.fly.io/vibey-runtimes:latest'),
  }
  const poolRepository = {
    listPoolStatusRows: vi.fn(),
    listFailedPoolMachines: vi.fn().mockResolvedValue({ data: [], errorMessage: null }),
    countActivePoolMachines: vi.fn().mockResolvedValue({ count: 0, errorMessage: null }),
    markPoolMachineReady: vi.fn().mockResolvedValue(null),
    insertProvisioningPoolMachine: vi.fn().mockResolvedValue(null),
    markPoolMachineFailed: vi.fn().mockResolvedValue(undefined),
    claimPoolMachine: vi.fn(),
    markPoolMachineDestroyFailed: vi.fn().mockResolvedValue(undefined),
    deletePoolMachine: vi.fn().mockResolvedValue(null),
    releaseClaimAsFailed: vi.fn().mockResolvedValue(undefined),
  }
  const service = new MachinePoolService(machinesService as never, poolRepository as never)
  return { service, machinesService, poolRepository }
}

describe('MachinePoolService replenish recovery', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('retests and returns a healthy failed machine to the ready pool', async () => {
    const { service, machinesService, poolRepository } = makeService()
    poolRepository.listFailedPoolMachines.mockResolvedValue({
      data: [{ machine_id: 'machine-1', fly_app: 'vibey-runtimes', failed_reason: 'health' }],
      errorMessage: null,
    })
    poolRepository.countActivePoolMachines.mockResolvedValue({ count: 1, errorMessage: null })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    await expect(service.replenishPool(1)).resolves.toEqual({
      created: 0,
      skipped: 'pool already at 1/1; recovered=1',
    })
    expect(machinesService.startMachine).toHaveBeenCalledWith('machine-1', 'vibey-runtimes')
    expect(machinesService.waitForMachineHealth).toHaveBeenCalledWith('machine-1', 'vibey-runtimes')
    expect(machinesService.resetMachineIdentity).toHaveBeenCalledWith('machine-1', 'vibey-runtimes')
    expect(poolRepository.markPoolMachineReady).toHaveBeenCalledWith('machine-1')
  })

  it('destroys an unhealthy failed machine before creating a replacement', async () => {
    const { service, machinesService, poolRepository } = makeService()
    machinesService.waitForMachineHealth.mockResolvedValue(false)
    poolRepository.listFailedPoolMachines.mockResolvedValue({
      data: [{ machine_id: 'machine-1', fly_app: 'vibey-runtimes', failed_reason: 'health' }],
      errorMessage: null,
    })
    poolRepository.countActivePoolMachines.mockResolvedValue({ count: 0, errorMessage: null })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
    vi.spyOn(service, 'createPoolMachine').mockResolvedValue('machine-2')

    await expect(service.replenishPool(1)).resolves.toEqual({ created: 1, skipped: '' })
    expect(fetch).toHaveBeenCalledWith(
      'https://api.machines.dev/v1/apps/vibey-runtimes/machines/machine-1?force=true',
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(poolRepository.deletePoolMachine).toHaveBeenCalledWith('machine-1')
    expect(service.createPoolMachine).toHaveBeenCalled()
  })

  it('does not return a failed machine to ready when runtime reset fails', async () => {
    const { service, machinesService, poolRepository } = makeService()
    machinesService.resetMachineIdentity.mockResolvedValue(false)
    poolRepository.listFailedPoolMachines.mockResolvedValue({
      data: [{ machine_id: 'machine-1', fly_app: 'vibey-runtimes', failed_reason: 'health' }],
      errorMessage: null,
    })
    poolRepository.countActivePoolMachines.mockResolvedValue({ count: 0, errorMessage: null })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
    vi.spyOn(service, 'createPoolMachine').mockResolvedValue('machine-2')

    await expect(service.replenishPool(1)).resolves.toEqual({ created: 1, skipped: '' })

    expect(machinesService.resetMachineIdentity).toHaveBeenCalledWith('machine-1', 'vibey-runtimes')
    expect(poolRepository.deletePoolMachine).toHaveBeenCalledWith('machine-1')
  })

  it('creates pool machines with pool-only identity and liveness health checks', async () => {
    const { service, poolRepository } = makeService()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'pool-machine-1' }),
      })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await expect(service.createPoolMachine()).resolves.toBe('pool-machine-1')

    expect(poolRepository.insertProvisioningPoolMachine).toHaveBeenCalledWith(
      'pool-machine-1',
      'vibey-runtimes',
    )
    expect(poolRepository.markPoolMachineReady).toHaveBeenCalledWith('pool-machine-1')
    const createBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)
    expect(createBody.config.env).toMatchObject({
      USER_ID: '',
      VIBEY_POOL_MACHINE: 'true',
    })
    expect(createBody.config.metadata).toMatchObject({
      user_id: 'pool',
      pool_state: 'provisioning',
    })
    expect(createBody.config.services[0].checks[0].path).toBe('/api/health')
  })

  it('starts claimed pool machines without mutating Fly config or runtime identity', async () => {
    const { service, machinesService } = makeService()
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await expect(service.startClaimedMachine('pool-machine-1', 'vibey-runtimes')).resolves.toEqual({
      machineId: 'pool-machine-1',
      machineUrl: 'https://vibey-runtimes.fly.dev',
    })

    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/machines/pool-machine-1'),
      expect.objectContaining({ method: 'POST', body: expect.any(String) }),
    )
    expect(machinesService.startMachine).toHaveBeenCalledWith('pool-machine-1', 'vibey-runtimes')
    expect(machinesService.waitForUserReady).not.toHaveBeenCalled()
    expect(machinesService.resetMachineIdentity).not.toHaveBeenCalled()
  })
})
