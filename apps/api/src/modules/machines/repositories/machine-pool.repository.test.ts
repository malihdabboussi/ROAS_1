import { describe, expect, it, vi } from 'vitest'
import { MachinePoolRepository } from './machine-pool.repository'

function query(result: { data?: unknown; error?: unknown } = {}) {
  const promise = Promise.resolve(result)
  const q = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }
  ;(q as unknown as PromiseLike<typeof result>).then = promise.then.bind(promise)
  ;(q as unknown as Promise<typeof result>).catch = promise.catch.bind(promise)
  ;(q as unknown as Promise<typeof result>).finally = promise.finally.bind(promise)
  return q
}

describe('MachinePoolRepository', () => {
  it('lists pool status rows from machine_pool', async () => {
    const poolQuery = query({
      data: [{ state: 'ready', created_at: '2026-06-17T07:00:00.000Z' }],
      error: null,
    })
    const client = { from: vi.fn().mockReturnValue(poolQuery) }
    const repository = new MachinePoolRepository({ client } as never)

    await expect(repository.listPoolStatusRows()).resolves.toEqual([
      { state: 'ready', created_at: '2026-06-17T07:00:00.000Z' },
    ])

    expect(client.from).toHaveBeenCalledWith('machine_pool')
    expect(poolQuery.select).toHaveBeenCalledWith('state, created_at')
  })

  it('loads failed pool machines for recovery with the target limit', async () => {
    const poolQuery = query({
      data: [{ machine_id: 'machine-1', fly_app: 'vibey-runtimes', failed_reason: 'health' }],
      error: null,
    })
    const client = { from: vi.fn().mockReturnValue(poolQuery) }
    const repository = new MachinePoolRepository({ client } as never)

    await expect(repository.listFailedPoolMachines(2)).resolves.toEqual({
      data: [{ machine_id: 'machine-1', fly_app: 'vibey-runtimes', failed_reason: 'health' }],
      errorMessage: null,
    })

    expect(poolQuery.select).toHaveBeenCalledWith('machine_id, fly_app, failed_reason')
    expect(poolQuery.eq).toHaveBeenCalledWith('state', 'failed')
    expect(poolQuery.limit).toHaveBeenCalledWith(2)
  })

  it('claims pool machines through the claim_pool_machine RPC', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: { claimed: true, machine_id: 'machine-1', fly_app: 'vibey-runtimes' },
        error: null,
      }),
    }
    const repository = new MachinePoolRepository({ client } as never)

    await expect(repository.claimPoolMachine('user-1')).resolves.toEqual({
      data: { claimed: true, machine_id: 'machine-1', fly_app: 'vibey-runtimes' },
      errorMessage: null,
    })

    expect(client.rpc).toHaveBeenCalledWith('claim_pool_machine', { p_user_id: 'user-1' })
  })

  it('marks released claims failed with the assignment failure reason', async () => {
    const poolQuery = query({ error: null })
    const client = { from: vi.fn().mockReturnValue(poolQuery) }
    const repository = new MachinePoolRepository({ client } as never)

    await repository.releaseClaimAsFailed('machine-1')

    expect(poolQuery.update).toHaveBeenCalledWith({
      state: 'failed',
      failed_reason: 'assignment_failed_released',
    })
    expect(poolQuery.eq).toHaveBeenCalledWith('machine_id', 'machine-1')
  })
})
