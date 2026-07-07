import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FlyMachineStateService } from '../fly-machine-state.service'

describe('FlyMachineStateService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.FLY_API_TOKEN = 'fly-token'
  })

  it('lists machines with normalized state and metadata', async () => {
    const service = new FlyMachineStateService()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            id: 'machine-1',
            name: 'vibey-user',
            state: 'started',
            updated_at: '2026-06-04T10:00:00Z',
            config: {
              metadata: { user_id: 'user-1' },
              env: { USER_ID: 'user-1' },
            },
          },
        ]),
      }),
    )

    await expect(service.listMachines('vibey-runtimes')).resolves.toEqual([
      {
        id: 'machine-1',
        name: 'vibey-user',
        state: 'started',
        updatedAt: '2026-06-04T10:00:00Z',
        rawState: 'started',
        metadata: { user_id: 'user-1' },
        env: { USER_ID: 'user-1' },
      },
    ])
  })

  it('throws when Fly machine listing fails', async () => {
    const service = new FlyMachineStateService()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('fly down'),
      }),
    )

    await expect(service.listMachines('vibey-runtimes')).rejects.toThrow(
      'Fly machines list failed: 500 fly down',
    )
  })

  it('stops a machine through the Fly stop endpoint', async () => {
    const service = new FlyMachineStateService()
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await expect(service.stopMachine('machine-1', 'vibey-runtimes')).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.machines.dev/v1/apps/vibey-runtimes/machines/machine-1/stop',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('returns the final state when waitForState observes a target state', async () => {
    const service = new FlyMachineStateService()
    vi.spyOn(service, 'getMachineState').mockResolvedValue('stopped')

    await expect(service.waitForState('machine-1', 'vibey-runtimes', ['stopped'], 0)).resolves.toBe(
      'stopped',
    )
  })
})
