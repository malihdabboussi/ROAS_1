import { vi } from 'vitest'
import { MachineProfileRepository } from '../../repositories/machine-profile.repository'
import { MachinesService } from '../machines.service'

export function chain(methods: Record<string, unknown> = {}) {
  const result = Object.prototype.hasOwnProperty.call(methods, 'result')
    ? (methods.result as { data?: unknown; error?: unknown })
    : { data: null, error: null }
  const promise = Promise.resolve(result)
  const query: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  Object.assign(query, methods)
  ;(query as unknown as PromiseLike<typeof result>).then = promise.then.bind(promise)
  ;(query as unknown as Promise<typeof result>).catch = promise.catch.bind(promise)
  ;(query as unknown as Promise<typeof result>).finally = promise.finally.bind(promise)
  delete query.result
  return query
}

export function makeService() {
  process.env.FLY_API_TOKEN = 'fly-token'
  process.env.INTERNAL_API_TOKEN = 'internal-token'
  process.env.MACHINE_POOL_RUNTIME_BIND_ENABLED = 'true'
  const errorReporter = { report: vi.fn() }
  const machinePool = {
    claimFromPool: vi.fn().mockResolvedValue(null),
    startClaimedMachine: vi.fn(),
    releaseClaim: vi.fn().mockResolvedValue(undefined),
    replenishPool: vi.fn().mockResolvedValue({ created: 0, skipped: '' }),
  }
  const flyState = {
    getMachineState: vi.fn(),
    startMachine: vi.fn(),
    stopMachine: vi.fn(),
    waitForStarted: vi.fn(),
    waitForState: vi.fn(),
    invalidate: vi.fn(),
  }
  const runtimeCapabilities = {
    probe: vi.fn().mockResolvedValue({
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
      mode: 'user',
      ready: true,
      gatewayReady: true,
      authReady: true,
      userIdResolved: true,
    }),
  }
  const wakeAttempts = {
    start: vi.fn().mockResolvedValue('wake-1'),
    phase: vi.fn().mockResolvedValue(undefined),
    succeed: vi.fn().mockResolvedValue(undefined),
    fail: vi.fn().mockResolvedValue(undefined),
  }
  const service = new MachinesService(
    errorReporter as never,
    machinePool as never,
    flyState as never,
    runtimeCapabilities as never,
    wakeAttempts as never,
    new MachineProfileRepository() as never,
  )
  vi.spyOn(service, 'resolveFlyImageRef').mockResolvedValue('registry.fly.io/vibey-runtimes:latest')
  return { service, errorReporter, machinePool, flyState, runtimeCapabilities, wakeAttempts }
}

export function makeProfileSupabase(
  profileUpdateResult:
    | { data?: unknown; error?: unknown }
    | Array<{ data?: unknown; error?: unknown }> = { error: null },
) {
  const lock = { acquired: true, fly_runtime_app: 'vibey-runtimes' }
  const profileSelect = chain({
    single: vi.fn().mockResolvedValue({ data: { fly_machine_id: null }, error: null }),
  })
  const updateResults = Array.isArray(profileUpdateResult)
    ? profileUpdateResult
    : [profileUpdateResult]
  const profileUpdates = updateResults.map((result) =>
    chain({
      eq: vi.fn().mockReturnThis(),
      result,
    }),
  )
  const fallbackUpdate = chain({
    eq: vi.fn().mockReturnThis(),
    result: { error: null },
  })
  const supabase = {
    rpc: vi.fn().mockResolvedValue({ data: lock, error: null }),
    from: vi.fn().mockReturnValueOnce(profileSelect),
  }
  for (const update of profileUpdates) {
    supabase.from.mockReturnValueOnce(update)
  }
  supabase.from.mockReturnValue(fallbackUpdate)
  return {
    supabase,
    profileSelect,
    profileUpdate: profileUpdates[0] ?? fallbackUpdate,
    fallbackUpdate,
  }
}

export function stubFreshMachineFetch(machineId = 'fresh-machine-1') {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: machineId }),
    }),
  )
}
