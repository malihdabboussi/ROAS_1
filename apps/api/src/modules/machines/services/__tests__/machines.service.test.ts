import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeProfileSupabase, makeService, stubFreshMachineFetch } from './machines-test-helpers'

describe('MachinesService readiness contract - provisioning', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    delete process.env.MACHINE_POOL_RUNTIME_BIND_ENABLED
  })

  it('fresh provisioning waits for user readiness before returning running', async () => {
    const { service } = makeService()
    const { supabase } = makeProfileSupabase()
    vi.spyOn(service, 'waitForMachineHealth').mockResolvedValue(true)
    vi.spyOn(service, 'waitForUserReady').mockResolvedValue(false)
    stubFreshMachineFetch()

    await expect(service.provision(supabase as never, 'user-1')).rejects.toThrow(
      'Machine not ready after creation',
    )

    expect(service.waitForMachineHealth).toHaveBeenCalledWith('fresh-machine-1', 'vibey-runtimes')
    expect(service.waitForUserReady).toHaveBeenCalledWith('fresh-machine-1', 'vibey-runtimes')
  })

  it('writes the profile before starting, binding, and waiting for a claimed pool machine', async () => {
    const { service, machinePool } = makeService()
    const { supabase, profileUpdate } = makeProfileSupabase()
    machinePool.claimFromPool.mockResolvedValue({
      machineId: 'pool-machine-1',
      flyApp: 'vibey-runtimes',
    })
    machinePool.startClaimedMachine.mockResolvedValue({
      machineId: 'pool-machine-1',
      machineUrl: 'https://vibey-runtimes.fly.dev',
    })
    vi.spyOn(service, 'waitForMachineHealth').mockResolvedValue(true)
    vi.spyOn(service, 'bindMachineIdentity').mockResolvedValue(undefined)
    vi.spyOn(service, 'waitForUserReady').mockResolvedValue(true)

    await expect(service.provision(supabase as never, 'user-1')).resolves.toMatchObject({
      machine_id: 'pool-machine-1',
      machine_url: 'https://vibey-runtimes.fly.dev',
      status: 'running',
    })

    expect(profileUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        fly_machine_id: 'pool-machine-1',
        fly_machine_url: 'https://vibey-runtimes.fly.dev',
        fly_runtime_app: 'vibey-runtimes',
      }),
    )
    expect(profileUpdate.update.mock.invocationCallOrder[0]).toBeLessThan(
      machinePool.startClaimedMachine.mock.invocationCallOrder[0],
    )
    expect(machinePool.startClaimedMachine).toHaveBeenCalledWith('pool-machine-1', 'vibey-runtimes')
    expect(service.waitForMachineHealth).toHaveBeenCalledWith('pool-machine-1', 'vibey-runtimes')
    expect(service.bindMachineIdentity).toHaveBeenCalledWith(
      'pool-machine-1',
      'vibey-runtimes',
      'user-1',
    )
    expect(service.bindMachineIdentity.mock.invocationCallOrder[0]).toBeLessThan(
      service.waitForUserReady.mock.invocationCallOrder[0],
    )
  })

  it('releases a pool claim and does not start it when the profile write fails', async () => {
    const { service, machinePool } = makeService()
    const { supabase } = makeProfileSupabase({ error: { message: 'profile write failed' } })
    machinePool.claimFromPool.mockResolvedValue({
      machineId: 'pool-machine-1',
      flyApp: 'vibey-runtimes',
    })
    vi.spyOn(service, 'waitForMachineHealth').mockResolvedValue(true)
    vi.spyOn(service, 'waitForUserReady').mockResolvedValue(true)
    stubFreshMachineFetch()

    await expect(service.provision(supabase as never, 'user-1')).resolves.toMatchObject({
      machine_id: 'fresh-machine-1',
      status: 'running',
    })

    expect(machinePool.releaseClaim).toHaveBeenCalledWith('pool-machine-1')
    expect(machinePool.startClaimedMachine).not.toHaveBeenCalled()
  })

  it('releases the claim, clears the profile pointer, and falls back when bind fails', async () => {
    const { service, machinePool } = makeService()
    const { supabase, fallbackUpdate } = makeProfileSupabase()
    machinePool.claimFromPool.mockResolvedValue({
      machineId: 'pool-machine-1',
      flyApp: 'vibey-runtimes',
    })
    machinePool.startClaimedMachine.mockResolvedValue({
      machineId: 'pool-machine-1',
      machineUrl: 'https://vibey-runtimes.fly.dev',
    })
    vi.spyOn(service, 'waitForMachineHealth').mockResolvedValue(true)
    vi.spyOn(service, 'bindMachineIdentity').mockRejectedValue(new Error('bind failed'))
    vi.spyOn(service, 'waitForUserReady').mockResolvedValue(true)
    stubFreshMachineFetch()

    await expect(service.provision(supabase as never, 'user-1')).resolves.toMatchObject({
      machine_id: 'fresh-machine-1',
      status: 'running',
    })

    expect(machinePool.releaseClaim).toHaveBeenCalledWith('pool-machine-1')
    expect(fallbackUpdate.eq).toHaveBeenCalledWith('fly_machine_id', 'pool-machine-1')
  })

  it('skips pool claims when runtime bind rollout flag is disabled', async () => {
    const { service, machinePool } = makeService()
    process.env.MACHINE_POOL_RUNTIME_BIND_ENABLED = 'false'
    const { supabase } = makeProfileSupabase()
    vi.spyOn(service, 'waitForMachineHealth').mockResolvedValue(true)
    vi.spyOn(service, 'waitForUserReady').mockResolvedValue(true)
    stubFreshMachineFetch('fresh-machine-flag-off')

    await expect(service.provision(supabase as never, 'user-1')).resolves.toMatchObject({
      machine_id: 'fresh-machine-flag-off',
      status: 'running',
    })

    expect(machinePool.claimFromPool).not.toHaveBeenCalled()
  })
})
