import { describe, expect, it, vi } from 'vitest'
import { MachineProfileRepository } from './machine-profile.repository'

const columns = {
  environment: 'production' as const,
  machineId: 'fly_machine_id',
  machineUrl: 'fly_machine_url',
  machineStatus: 'fly_machine_status',
  runtimeApp: 'fly_runtime_app',
  runtimeStatus: 'fly_runtime_status',
  runtimeLastActivityAt: 'fly_runtime_last_activity_at',
  runtimeType: 'agent_runtime_type',
  runtimeUrl: 'agent_runtime_url',
}

function query(result: { data?: unknown; error?: unknown } = {}) {
  const promise = Promise.resolve(result)
  const q = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  }
  ;(q as unknown as PromiseLike<typeof result>).then = promise.then.bind(promise)
  ;(q as unknown as Promise<typeof result>).catch = promise.catch.bind(promise)
  ;(q as unknown as Promise<typeof result>).finally = promise.finally.bind(promise)
  return q
}

describe('MachineProfileRepository', () => {
  it('acquires provision locks through the provision-lock RPC', async () => {
    const supabase = {
      rpc: vi.fn().mockResolvedValue({
        data: { acquired: true, fly_runtime_app: 'vibey-runtimes' },
        error: null,
      }),
    }
    const repository = new MachineProfileRepository()

    await expect(
      repository.acquireProvisionLock(supabase as never, 'user-1', 'production'),
    ).resolves.toEqual({
      data: { acquired: true, fly_runtime_app: 'vibey-runtimes' },
      errorMessage: null,
    })

    expect(supabase.rpc).toHaveBeenCalledWith('acquire_provision_lock', {
      p_user_id: 'user-1',
      p_environment: 'production',
    })
  })

  it('reads selected profile machine fields for one user', async () => {
    const profileQuery = query({ data: { fly_machine_id: 'machine-1' }, error: null })
    const supabase = { from: vi.fn().mockReturnValue(profileQuery) }
    const repository = new MachineProfileRepository()

    await expect(
      repository.findProfileRow(supabase as never, 'user-1', ['fly_machine_id']),
    ).resolves.toEqual({ fly_machine_id: 'machine-1' })

    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(profileQuery.select).toHaveBeenCalledWith('fly_machine_id')
    expect(profileQuery.eq).toHaveBeenCalledWith('id', 'user-1')
    expect(profileQuery.single).toHaveBeenCalled()
  })

  it('updates profile machine fields with an optional matching machine guard', async () => {
    const profileQuery = query({ error: null })
    const supabase = { from: vi.fn().mockReturnValue(profileQuery) }
    const repository = new MachineProfileRepository()

    await expect(
      repository.updateProfileMachineFields(
        supabase as never,
        'user-1',
        columns,
        {
          machineId: null,
          machineUrl: null,
          machineStatus: 'failed',
          runtimeStatus: 'failed',
          runtimeLastActivityAt: null,
        },
        { matchingMachineId: 'machine-1' },
      ),
    ).resolves.toBeNull()

    expect(profileQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        fly_machine_id: null,
        fly_machine_url: null,
        fly_machine_status: 'failed',
        fly_runtime_status: 'failed',
        fly_runtime_last_activity_at: null,
      }),
    )
    expect(profileQuery.eq).toHaveBeenCalledWith('id', 'user-1')
    expect(profileQuery.eq).toHaveBeenCalledWith('fly_machine_id', 'machine-1')
  })
})
