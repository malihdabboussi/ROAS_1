import { beforeEach, describe, expect, it, vi } from 'vitest'
import { chain, makeService } from './machines-test-helpers'

describe('MachinesService readiness contract - idle suspension', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    delete process.env.MACHINE_POOL_RUNTIME_BIND_ENABLED
  })

  it('marks an idle machine suspended only after Fly confirms it stopped', async () => {
    const { service, flyState } = makeService()
    flyState.getMachineState.mockResolvedValue('started')
    flyState.stopMachine.mockResolvedValue(undefined)
    flyState.waitForState.mockResolvedValue('stopped')
    const profileSelect = chain({
      single: vi.fn().mockResolvedValue({
        data: {
          fly_machine_id: 'machine-1',
          fly_runtime_app: 'vibey-runtimes',
          fly_runtime_status: 'running',
        },
        error: null,
      }),
    })
    const profileUpdate = chain({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    const supabase = {
      from: vi.fn().mockReturnValueOnce(profileSelect).mockReturnValueOnce(profileUpdate),
    }

    await expect(service.suspendIdleMachine(supabase as never, 'user-1')).resolves.toBeUndefined()

    expect(flyState.stopMachine).toHaveBeenCalledWith('machine-1', 'vibey-runtimes')
    expect(flyState.waitForState).toHaveBeenCalledWith(
      'machine-1',
      'vibey-runtimes',
      ['stopped', 'suspended'],
      60_000,
    )
    expect(profileUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        fly_machine_status: 'suspended',
        fly_runtime_status: 'suspended',
      }),
    )
  })

  it('does not mark an idle machine suspended when Fly stop confirmation fails', async () => {
    const { service, flyState } = makeService()
    flyState.getMachineState.mockResolvedValue('started')
    flyState.stopMachine.mockResolvedValue(undefined)
    flyState.waitForState.mockResolvedValue(null)
    const profileSelect = chain({
      single: vi.fn().mockResolvedValue({
        data: {
          fly_machine_id: 'machine-1',
          fly_runtime_app: 'vibey-runtimes',
          fly_runtime_status: 'running',
        },
        error: null,
      }),
    })
    const profileUpdate = chain({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    const supabase = {
      from: vi.fn().mockReturnValueOnce(profileSelect).mockReturnValueOnce(profileUpdate),
    }

    await expect(service.suspendIdleMachine(supabase as never, 'user-1')).rejects.toThrow(
      'did not stop',
    )

    expect(profileUpdate.update).not.toHaveBeenCalled()
  })
})
