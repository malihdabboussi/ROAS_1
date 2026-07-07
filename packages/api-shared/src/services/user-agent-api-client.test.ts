import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  __resetUserAgentApiClientState,
  defaultProbeReachable,
  USER_AGENT_API_DEFAULTS,
  UserAgentApiClient,
  UserMachineCircuitOpenError,
  UserMachineUnreachableError,
  type AgentApiLogger,
  type AgentApiTarget,
} from './user-agent-api-client'

const silentLogger: AgentApiLogger = {
  log: () => {},
  warn: () => {},
  error: () => {},
}

const target: AgentApiTarget = {
  baseUrl: 'https://user-machine.example.com',
  machineId: 'machine-abc',
}

describe('UserAgentApiClient.ensureReachable', () => {
  beforeEach(() => {
    __resetUserAgentApiClientState()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('probe success on first attempt: no wake call', async () => {
    const probe = vi.fn().mockResolvedValue(true)
    const wake = vi.fn().mockResolvedValue(undefined)
    const client = new UserAgentApiClient({
      logger: silentLogger,
      probeReachable: probe,
      wakeMachine: wake,
    })

    await client.ensureReachable('user-1', target)
    expect(probe).toHaveBeenCalledTimes(1)
    expect(wake).not.toHaveBeenCalled()
  })

  it('probe fails twice, then succeeds: wake called twice', async () => {
    const probe = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
    const wake = vi.fn().mockResolvedValue(undefined)
    const client = new UserAgentApiClient(
      { logger: silentLogger, probeReachable: probe, wakeMachine: wake },
      { wakeWaitMs: 10 },
    )

    const promise = client.ensureReachable('user-1', target)
    await vi.advanceTimersByTimeAsync(50)
    await promise

    expect(probe).toHaveBeenCalledTimes(3)
    expect(wake).toHaveBeenCalledTimes(2)
  })

  it('probe fails 3 times: throws UserMachineUnreachableError and opens circuit', async () => {
    const probe = vi.fn().mockResolvedValue(false)
    const wake = vi.fn().mockResolvedValue(undefined)
    const markUnknown = vi.fn().mockResolvedValue(undefined)
    const client = new UserAgentApiClient(
      {
        logger: silentLogger,
        probeReachable: probe,
        wakeMachine: wake,
        markMachineUnknown: markUnknown,
      },
      { wakeWaitMs: 10 },
    )

    const promise = client.ensureReachable('user-1', target).catch((e) => e)
    await vi.advanceTimersByTimeAsync(100)
    const err = await promise
    expect(err).toBeInstanceOf(UserMachineUnreachableError)
    expect(probe).toHaveBeenCalledTimes(3)
    expect(wake).toHaveBeenCalledTimes(3)
    expect(markUnknown).toHaveBeenCalledTimes(1)

    // Circuit should be open now
    const probe2 = vi.fn().mockResolvedValue(true)
    const wake2 = vi.fn().mockResolvedValue(undefined)
    const client2 = new UserAgentApiClient({
      logger: silentLogger,
      probeReachable: probe2,
      wakeMachine: wake2,
    })
    await expect(client2.ensureReachable('user-1', target)).rejects.toBeInstanceOf(
      UserMachineCircuitOpenError,
    )
    expect(probe2).not.toHaveBeenCalled()
  })

  it('returns immediately when target.machineId is null (provisioning)', async () => {
    const probe = vi.fn()
    const wake = vi.fn()
    const client = new UserAgentApiClient({
      logger: silentLogger,
      probeReachable: probe,
      wakeMachine: wake,
    })
    await client.ensureReachable('user-1', { baseUrl: 'http://x', machineId: null })
    expect(probe).not.toHaveBeenCalled()
    expect(wake).not.toHaveBeenCalled()
  })

  it('coalesces concurrent calls for the same user', async () => {
    let resolveProbe: (v: boolean) => void = () => {}
    const probe = vi.fn().mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveProbe = resolve
        }),
    )
    const wake = vi.fn().mockResolvedValue(undefined)
    const client = new UserAgentApiClient({
      logger: silentLogger,
      probeReachable: probe,
      wakeMachine: wake,
    })

    const a = client.ensureReachable('user-1', target)
    const b = client.ensureReachable('user-1', target)
    expect(probe).toHaveBeenCalledTimes(1)
    resolveProbe(true)
    await Promise.all([a, b])
    expect(probe).toHaveBeenCalledTimes(1)
  })
})

describe('UserAgentApiClient.fetch', () => {
  let originalFetch: typeof globalThis.fetch
  beforeEach(() => {
    __resetUserAgentApiClientState()
    originalFetch = globalThis.fetch
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.useRealTimers()
  })

  function makeClient() {
    return new UserAgentApiClient({
      logger: silentLogger,
      probeReachable: vi.fn().mockResolvedValue(true),
      wakeMachine: vi.fn().mockResolvedValue(undefined),
    })
  }

  it('attaches fly-force-instance-id when machineId is set', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch
    const client = makeClient()
    await client.fetch(target, '/api/test', { method: 'POST', body: 'x' })
    const args = fetchMock.mock.calls[0]
    const headers = args![1].headers as Record<string, string>
    expect(headers['fly-force-instance-id']).toBe('machine-abc')
  })

  it('does NOT attach fly-force-instance-id when machineId is null', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch
    const client = makeClient()
    await client.fetch({ baseUrl: 'http://x', machineId: null }, '/api/test', { method: 'POST' })
    const headers = fetchMock.mock.calls[0]![1].headers as Record<string, string>
    expect(headers['fly-force-instance-id']).toBeUndefined()
  })

  it('returns immediately on 4xx without retry', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('bad', { status: 400 }))
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch
    const client = makeClient()
    await expect(client.fetch(target, '/api/test', { method: 'POST' })).rejects.toThrow(/400/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries 500 up to MAX_RETRIES then throws', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('boom', { status: 500 }))
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch
    const client = makeClient()
    const promise = client
      .fetch(target, '/api/test', { method: 'POST' }, { retryBaseMs: 1 })
      .catch((e) => e)
    await vi.advanceTimersByTimeAsync(50)
    const err = await promise
    expect(err).toBeInstanceOf(Error)
    expect(fetchMock).toHaveBeenCalledTimes(USER_AGENT_API_DEFAULTS.MAX_RETRIES + 1)
  })

  it('retries TypeError fetch failed up to MAX_RETRIES', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch
    const client = makeClient()
    const promise = client
      .fetch(target, '/api/test', { method: 'POST' }, { retryBaseMs: 1 })
      .catch((e) => e)
    await vi.advanceTimersByTimeAsync(50)
    const err = await promise
    expect(err).toBeInstanceOf(Error)
    expect(fetchMock).toHaveBeenCalledTimes(USER_AGENT_API_DEFAULTS.MAX_RETRIES + 1)
  })

  it('succeeds on retry after transient 502', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('ngx', { status: 502 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch
    const client = makeClient()
    const promise = client.fetch(target, '/api/test', { method: 'POST' }, { retryBaseMs: 1 })
    await vi.advanceTimersByTimeAsync(50)
    const res = await promise
    expect(res.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('honors retryAfter on 503 response body', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ retryAfter: 3 }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch
    const client = makeClient()
    const startedAt = Date.now()
    const promise = client.fetch(target, '/api/test', { method: 'POST' }, { retryBaseMs: 1 })
    await vi.advanceTimersByTimeAsync(3500)
    await promise
    expect(fetchMock).toHaveBeenCalledTimes(2)
    // Crude check: at least 3000ms elapsed in fake-timer space.
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(3000)
  })

  it('builds URL by joining baseUrl and path correctly', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch
    const client = makeClient()
    await client.fetch({ baseUrl: 'https://m.example.com/', machineId: 'm1' }, '/api/test', {
      method: 'POST',
    })
    expect(fetchMock.mock.calls[0]![0]).toBe('https://m.example.com/api/test')
  })
})

describe('defaultProbeReachable', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns true only for /api/ready 200', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    await expect(defaultProbeReachable(target)).resolves.toBe(true)

    expect(fetchMock.mock.calls[0]![0]).toBe('https://user-machine.example.com/api/ready')
    expect(fetchMock.mock.calls[0]![1].method).toBe('GET')
  })

  it('returns false for 401', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('unauthorized', { status: 401 }))
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    await expect(defaultProbeReachable(target)).resolves.toBe(false)
  })

  it('returns false for 404', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('missing', { status: 404 }))
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    await expect(defaultProbeReachable(target)).resolves.toBe(false)
  })

  it('includes fly-force-instance-id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    await defaultProbeReachable(target)

    const headers = fetchMock.mock.calls[0]![1].headers as Record<string, string>
    expect(headers['fly-force-instance-id']).toBe('machine-abc')
  })
})
