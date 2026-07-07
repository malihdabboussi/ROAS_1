import { beforeEach, describe, expect, it, vi } from 'vitest'
import { chain, makeService } from './machines-test-helpers'

describe('MachinesService readiness contract - ensureRunning', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    delete process.env.MACHINE_POOL_RUNTIME_BIND_ENABLED
  })

  it('skips identity bind for a dedicated existing machine before waiting for user readiness', async () => {
    const { service, flyState, runtimeCapabilities, wakeAttempts } = makeService()
    flyState.getMachineState.mockResolvedValue('stopped')
    flyState.startMachine.mockResolvedValue(undefined)
    flyState.waitForStarted.mockResolvedValue(true)
    vi.spyOn(service, 'waitForMachineHealth').mockResolvedValue(true)
    vi.spyOn(service, 'bindMachineIdentity').mockResolvedValue(undefined)
    vi.spyOn(service, 'waitForUserReady').mockResolvedValue(true)
    const profileSelect = chain({
      single: vi.fn().mockResolvedValue({
        data: {
          fly_machine_id: 'machine-1',
          fly_machine_url: 'https://vibey-runtimes.fly.dev',
          fly_runtime_app: 'vibey-runtimes',
        },
        error: null,
      }),
    })
    const profileUpdate = chain({ result: { error: null } })
    const supabase = {
      from: vi.fn().mockReturnValueOnce(profileSelect).mockReturnValue(profileUpdate),
    }

    await expect(service.ensureRunning(supabase as never, 'user-1')).resolves.toMatchObject({
      machine_id: 'machine-1',
      status: 'running',
    })

    expect(flyState.startMachine).toHaveBeenCalledWith('machine-1', 'vibey-runtimes')
    expect(service.waitForMachineHealth).toHaveBeenCalledWith('machine-1', 'vibey-runtimes')
    expect(service.bindMachineIdentity).not.toHaveBeenCalled()
    expect(runtimeCapabilities.probe).toHaveBeenCalledWith('machine-1', 'vibey-runtimes', {
      requiredRuntime: 'work',
    })
    expect(wakeAttempts.phase).toHaveBeenCalledWith(
      expect.anything(),
      'wake-1',
      'ready_probe',
      expect.objectContaining({
        identityBindSkipped: true,
        runtimeMode: 'user',
        userIdResolved: true,
      }),
    )
    expect(wakeAttempts.succeed).toHaveBeenCalledWith(
      expect.anything(),
      'wake-1',
      expect.objectContaining({ machine_id: 'machine-1', runtime_version: '0.1.0' }),
    )
  })

  it('binds an unresolved pool runtime before waiting for user readiness', async () => {
    const { service, flyState, runtimeCapabilities, wakeAttempts } = makeService()
    flyState.getMachineState.mockResolvedValue('started')
    runtimeCapabilities.probe.mockResolvedValue({
      compatible: true,
      retryable: false,
      status: 200,
      failureCode: null,
      errorMessage: null,
      version: '0.1.0',
      capabilities: {
        ready_probe: true,
        identity_bind: true,
        openclaw_responses: true,
      },
      mode: 'pool',
      ready: false,
      gatewayReady: true,
      authReady: true,
      userIdResolved: false,
    })
    vi.spyOn(service, 'waitForMachineHealth').mockResolvedValue(true)
    vi.spyOn(service, 'bindMachineIdentity').mockResolvedValue(undefined)
    vi.spyOn(service, 'waitForUserReady').mockResolvedValue(true)
    const profileSelect = chain({
      single: vi.fn().mockResolvedValue({
        data: {
          fly_machine_id: 'pool-machine-1',
          fly_machine_url: 'https://vibey-runtimes.fly.dev',
          fly_runtime_app: 'vibey-runtimes',
        },
        error: null,
      }),
    })
    const profileUpdate = chain({ result: { error: null } })
    const supabase = {
      from: vi.fn().mockReturnValueOnce(profileSelect).mockReturnValue(profileUpdate),
    }

    await expect(service.ensureRunning(supabase as never, 'user-1')).resolves.toMatchObject({
      machine_id: 'pool-machine-1',
      status: 'running',
    })

    expect(service.bindMachineIdentity).toHaveBeenCalledWith(
      'pool-machine-1',
      'vibey-runtimes',
      'user-1',
    )
    expect(service.bindMachineIdentity.mock.invocationCallOrder[0]).toBeLessThan(
      service.waitForUserReady.mock.invocationCallOrder[0],
    )
    expect(wakeAttempts.phase).toHaveBeenCalledWith(expect.anything(), 'wake-1', 'identity_bind')
    expect(wakeAttempts.phase).toHaveBeenCalledWith(
      expect.anything(),
      'wake-1',
      'ready_probe',
      expect.objectContaining({
        identityBindSkipped: false,
        runtimeMode: 'pool',
        userIdResolved: false,
      }),
    )
  })

  it('finalizes profile state and records wake failure on Fly start timeout', async () => {
    const { service, flyState, wakeAttempts } = makeService()
    flyState.getMachineState.mockResolvedValue('stopped')
    flyState.startMachine.mockResolvedValue(undefined)
    flyState.waitForStarted.mockResolvedValue(false)
    const profileSelect = chain({
      single: vi.fn().mockResolvedValue({
        data: {
          fly_machine_id: 'machine-1',
          fly_machine_url: 'https://vibey-runtimes.fly.dev',
          fly_runtime_app: 'vibey-runtimes',
        },
        error: null,
      }),
    })
    const startingUpdate = chain({ result: { error: null } })
    const failureUpdate = chain({ result: { error: null } })
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(profileSelect)
        .mockReturnValueOnce(startingUpdate)
        .mockReturnValueOnce(failureUpdate),
    }

    await expect(service.ensureRunning(supabase as never, 'user-1')).rejects.toThrow(
      'Machine start timeout',
    )

    expect(wakeAttempts.fail).toHaveBeenCalledWith(
      expect.anything(),
      'wake-1',
      expect.objectContaining({
        phase: 'start_machine',
        status: 'failed_retryable',
        failureCode: 'fly_start_timeout',
      }),
    )
    expect(failureUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        fly_machine_status: 'suspended',
        fly_runtime_status: 'suspended',
      }),
    )
  })

  it('fails old runtime images before identity bind when capabilities are missing', async () => {
    const { service, flyState, runtimeCapabilities, wakeAttempts } = makeService()
    flyState.getMachineState.mockResolvedValue('started')
    runtimeCapabilities.probe.mockResolvedValue({
      compatible: false,
      retryable: false,
      status: 404,
      failureCode: 'runtime_incompatible',
      errorMessage: 'Cannot GET /api/runtime/capabilities',
      version: null,
      capabilities: {},
      mode: null,
      ready: null,
      gatewayReady: null,
      authReady: null,
      userIdResolved: null,
    })
    vi.spyOn(service, 'waitForMachineHealth').mockResolvedValue(true)
    vi.spyOn(service, 'bindMachineIdentity').mockResolvedValue(undefined)
    const profileSelect = chain({
      single: vi.fn().mockResolvedValue({
        data: {
          fly_machine_id: 'machine-old',
          fly_machine_url: 'https://vibey-runtimes.fly.dev',
          fly_runtime_app: 'vibey-runtimes',
        },
        error: null,
      }),
    })
    const failureUpdate = chain({ result: { error: null } })
    const supabase = {
      from: vi.fn().mockReturnValueOnce(profileSelect).mockReturnValueOnce(failureUpdate),
    }

    await expect(service.ensureRunning(supabase as never, 'user-1')).rejects.toThrow(
      'Cannot GET /api/runtime/capabilities',
    )

    expect(service.bindMachineIdentity).not.toHaveBeenCalled()
    expect(wakeAttempts.fail).toHaveBeenCalledWith(
      expect.anything(),
      'wake-1',
      expect.objectContaining({
        phase: 'capability_probe',
        status: 'failed_terminal',
        failureCode: 'runtime_incompatible',
      }),
    )
    expect(failureUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        fly_machine_status: 'failed',
        fly_runtime_status: 'failed',
      }),
    )
  })

  it('promotes a chat-only machine to full before serving work runtime traffic', async () => {
    const { service, flyState, runtimeCapabilities, wakeAttempts } = makeService()
    flyState.getMachineState.mockResolvedValue('started')
    runtimeCapabilities.probe
      .mockResolvedValueOnce({
        compatible: false,
        retryable: false,
        requiredRuntime: 'work',
        status: 200,
        failureCode: 'runtime_incompatible',
        errorMessage: 'Runtime missing capabilities: openclaw_responses',
        version: '0.1.0',
        capabilities: {
          ready_probe: true,
          identity_bind: true,
          openclaw_responses: false,
        },
        missingCapabilities: ['openclaw_responses'],
        mode: 'user',
        ready: true,
        gatewayReady: true,
        authReady: true,
        userIdResolved: true,
      })
      .mockResolvedValueOnce({
        compatible: true,
        retryable: false,
        requiredRuntime: 'work',
        status: 200,
        failureCode: null,
        errorMessage: null,
        version: '0.1.0',
        capabilities: {
          ready_probe: true,
          identity_bind: true,
          openclaw_responses: true,
        },
        missingCapabilities: [],
        mode: 'user',
        ready: true,
        gatewayReady: true,
        authReady: true,
        userIdResolved: true,
      })
    vi.spyOn(service, 'waitForMachineHealth').mockResolvedValue(true)
    vi.spyOn(service, 'waitForUserReady').mockResolvedValue(true)
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            config: {
              image: 'registry.fly.io/vibey-runtimes:test',
              env: {
                USER_ID: 'user-1',
                AGENT_API_BOOT_PROFILE: 'runtime-chat',
              },
              services: [],
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const profileSelect = chain({
      single: vi.fn().mockResolvedValue({
        data: {
          fly_machine_id: 'machine-chat',
          fly_machine_url: 'https://vibey-runtimes.fly.dev',
          fly_runtime_app: 'vibey-runtimes',
        },
        error: null,
      }),
    })
    const profileUpdate = chain({ result: { error: null } })
    const supabase = {
      from: vi.fn().mockReturnValueOnce(profileSelect).mockReturnValue(profileUpdate),
    }

    await expect(
      service.ensureRunning(supabase as never, 'user-1', { requiredRuntime: 'work' }),
    ).resolves.toMatchObject({
      machine_id: 'machine-chat',
      status: 'running',
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://api.machines.dev/v1/apps/vibey-runtimes/machines/machine-chat',
    )
    expect(fetchMock.mock.calls[1]![0]).toBe(
      'https://api.machines.dev/v1/apps/vibey-runtimes/machines/machine-chat',
    )
    expect(fetchMock.mock.calls[1]![1]).toMatchObject({ method: 'POST' })
    const updateBody = JSON.parse(String(fetchMock.mock.calls[1]![1]?.body ?? '{}'))
    expect(updateBody.config.env.AGENT_API_BOOT_PROFILE).toBe('full')
    expect(flyState.invalidate).toHaveBeenCalledWith('machine-chat', 'vibey-runtimes')
    expect(service.waitForMachineHealth).toHaveBeenCalledTimes(2)
    expect(runtimeCapabilities.probe).toHaveBeenNthCalledWith(1, 'machine-chat', 'vibey-runtimes', {
      requiredRuntime: 'work',
    })
    expect(runtimeCapabilities.probe).toHaveBeenNthCalledWith(2, 'machine-chat', 'vibey-runtimes', {
      requiredRuntime: 'work',
    })
    expect(wakeAttempts.fail).not.toHaveBeenCalled()
  })
})
