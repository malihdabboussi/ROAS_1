import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const supabaseMocks = vi.hoisted(() => ({
  single: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: supabaseMocks.single,
        }),
      }),
    }),
  }),
}))

vi.mock('@/lib/runtime/machine-profile-env', () => ({
  resolveMachineProfileColumns: () => ({
    machineId: 'fly_machine_id',
    machineUrl: 'fly_machine_url',
    runtimeApp: 'fly_runtime_app',
    runtimeType: 'agent_runtime_type',
    runtimeUrl: 'agent_runtime_url',
  }),
  resolveMachineProfileRow: (row: Record<string, unknown> | null) =>
    row
      ? {
          machineId: row.fly_machine_id as string | null,
          machineUrl: row.fly_machine_url as string | null,
          runtimeApp: row.fly_runtime_app as string | null,
          runtimeType:
            row.agent_runtime_type === 'shared_railway' ? 'shared_railway' : 'fly_machine',
          runtimeUrl: row.agent_runtime_url as string | null,
        }
      : null,
}))

function makeJwt(sub = 'user-1'): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'none' })}.${encode({ sub })}.sig`
}

function createChatRequest(): NextRequest {
  return new NextRequest('https://app.vibey.test/api/proxy/chat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${makeJwt()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ conversation_id: 'conv-1', content: 'hello' }),
  })
}

function createPrewarmRequest(): NextRequest {
  return new NextRequest('https://app.vibey.test/api/proxy/chat/prewarm', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${makeJwt()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ conversation_id: 'conv-1' }),
  })
}

async function loadRoute() {
  vi.resetModules()
  process.env.AGENT_BACKEND_URL = 'https://fallback-agent.vibey.test'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.vibey.test'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  return import('./route')
}

describe('chat proxy warm-up stream', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    supabaseMocks.single.mockResolvedValue({
      data: {
        fly_machine_id: 'machine-1',
        fly_machine_url: 'https://vibey-runtimes.fly.dev',
        fly_runtime_app: 'vibey-runtimes',
        agent_runtime_type: 'fly_machine',
        agent_runtime_url: null,
      },
      error: null,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    delete process.env.AGENT_BACKEND_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.FORCE_AGENT_BACKEND_URL
    delete process.env.VERCEL_ENV
  })

  it('emits warm-up status before machine readiness resolves', async () => {
    let resolveWake: (response: Response) => void = () => {}
    const wakePromise = new Promise<Response>((resolve) => {
      resolveWake = resolve
    })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url.includes('/api/proxy/machines/ensure-running')) return wakePromise
      if (url === 'https://vibey-runtimes.fly.dev/api/chat') {
        return Promise.resolve(
          new Response('data: {"type":"done"}\n\n', {
            headers: { 'Content-Type': 'text/event-stream' },
          }),
        )
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    const { POST } = await loadRoute()
    const response = await POST(createChatRequest(), {
      params: Promise.resolve({ path: ['chat'] }),
    })
    const reader = response.body!.getReader()
    const first = await reader.read()
    const firstText = new TextDecoder().decode(first.value)

    expect(response.headers.get('content-type')).toContain('text/event-stream')
    expect(firstText).toContain('"type":"status"')
    expect(firstText).toContain('Turning on your agents')
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/chat'))).toBe(false)
    const wakeCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/api/proxy/machines/ensure-running'),
    )
    expect(JSON.parse(String(wakeCall?.[1]?.body ?? '{}'))).toEqual({
      required_runtime: 'chat',
    })

    resolveWake(new Response('{}', { status: 200 }))
    await reader.cancel()
  })

  it('does not forward chat to Fly until readiness succeeds', async () => {
    let resolveWake: (response: Response) => void = () => {}
    const wakePromise = new Promise<Response>((resolve) => {
      resolveWake = resolve
    })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url.includes('/api/proxy/machines/ensure-running')) return wakePromise
      if (url === 'https://vibey-runtimes.fly.dev/api/chat') {
        return Promise.resolve(
          new Response(
            'data: {"type":"message_start","message_id":"m1"}\n\ndata: {"type":"done"}\n\n',
            {
              headers: { 'Content-Type': 'text/event-stream' },
            },
          ),
        )
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    const { POST } = await loadRoute()
    const response = await POST(createChatRequest(), {
      params: Promise.resolve({ path: ['chat'] }),
    })
    const reader = response.body!.getReader()
    await reader.read()

    expect(
      fetchMock.mock.calls.some(
        ([url]) => String(url) === 'https://vibey-runtimes.fly.dev/api/chat',
      ),
    ).toBe(false)

    resolveWake(new Response('{}', { status: 200 }))
    let combined = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      combined += new TextDecoder().decode(value)
    }

    expect(
      fetchMock.mock.calls.some(
        ([url]) => String(url) === 'https://vibey-runtimes.fly.dev/api/chat',
      ),
    ).toBe(true)
    expect(combined).toContain('"type":"message_start"')
  })

  it('does not forward chat when machine wake fails', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url.includes('/api/proxy/machines/ensure-running')) {
        return Promise.resolve(new Response('wake failed', { status: 500 }))
      }
      if (url === 'https://vibey-runtimes.fly.dev/api/chat') {
        return Promise.resolve(
          new Response('data: {"type":"done"}\n\n', {
            headers: { 'Content-Type': 'text/event-stream' },
          }),
        )
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    const { POST } = await loadRoute()
    const response = await POST(createChatRequest(), {
      params: Promise.resolve({ path: ['chat'] }),
    })
    const text = await response.text()

    expect(text).toContain('"type":"error"')
    expect(text).toContain('MACHINE_WARMUP_FAILED')
    expect(
      fetchMock.mock.calls.some(
        ([url]) => String(url) === 'https://vibey-runtimes.fly.dev/api/chat',
      ),
    ).toBe(false)
  })

  it('proxies chat prewarm as JSON without synthetic warm-up SSE', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url.includes('/api/proxy/machines/ensure-running')) {
        return Promise.resolve(new Response('{}', { status: 200 }))
      }
      if (url === 'https://vibey-runtimes.fly.dev/api/chat/prewarm') {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              ok: true,
              cache_key: 'cache-key',
              reused: false,
              duration_ms: 7,
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            },
          ),
        )
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    const { POST } = await loadRoute()
    const response = await POST(createPrewarmRequest(), {
      params: Promise.resolve({ path: ['chat', 'prewarm'] }),
    })
    const text = await response.text()

    expect(response.headers.get('content-type')).toContain('application/json')
    expect(text).toContain('"cache_key":"cache-key"')
    expect(text).not.toContain('Turning on your agents')
    expect(
      fetchMock.mock.calls.some(
        ([url]) => String(url) === 'https://vibey-runtimes.fly.dev/api/chat/prewarm',
      ),
    ).toBe(true)
    const wakeCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/api/proxy/machines/ensure-running'),
    )
    expect(JSON.parse(String(wakeCall?.[1]?.body ?? '{}'))).toEqual({
      required_runtime: 'chat',
    })
  })

  it('routes shared Railway chat without waking or pinning Fly', async () => {
    supabaseMocks.single.mockResolvedValue({
      data: {
        fly_machine_id: 'machine-1',
        fly_machine_url: 'https://vibey-runtimes.fly.dev',
        fly_runtime_app: 'vibey-runtimes',
        agent_runtime_type: 'shared_railway',
        agent_runtime_url: 'https://railway-agent.vibey.test',
      },
      error: null,
    })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url === 'https://railway-agent.vibey.test/api/chat') {
        const headers = init?.headers as Headers
        expect(headers.get('fly-force-instance-id')).toBeNull()
        return Promise.resolve(
          new Response('data: {"type":"done"}\n\n', {
            headers: { 'Content-Type': 'text/event-stream' },
          }),
        )
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    const { POST } = await loadRoute()
    const response = await POST(createChatRequest(), {
      params: Promise.resolve({ path: ['chat'] }),
    })
    const text = await response.text()

    expect(text).toContain('"type":"done"')
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes('/api/proxy/machines/ensure-running'),
      ),
    ).toBe(false)
    expect(
      fetchMock.mock.calls.some(
        ([url]) => String(url) === 'https://railway-agent.vibey.test/api/chat',
      ),
    ).toBe(true)
  })

  it('routes preview QA through the configured agent backend without a profile lookup', async () => {
    process.env.VERCEL_ENV = 'preview'
    process.env.FORCE_AGENT_BACKEND_URL = '1'
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url === 'https://fallback-agent.vibey.test/api/chat') {
        const headers = init?.headers as Headers
        expect(headers.get('fly-force-instance-id')).toBeNull()
        return Promise.resolve(
          new Response('data: {"type":"done"}\n\n', {
            headers: { 'Content-Type': 'text/event-stream' },
          }),
        )
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    const { POST } = await loadRoute()
    const response = await POST(createChatRequest(), {
      params: Promise.resolve({ path: ['chat'] }),
    })
    const text = await response.text()

    expect(text).toContain('"type":"done"')
    expect(supabaseMocks.single).not.toHaveBeenCalled()
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes('/api/proxy/machines/ensure-running'),
      ),
    ).toBe(false)
  })

  it('does not fall back to Fly when shared Railway chat fails before streaming', async () => {
    vi.useFakeTimers()
    supabaseMocks.single.mockResolvedValue({
      data: {
        fly_machine_id: 'machine-1',
        fly_machine_url: 'https://vibey-runtimes.fly.dev',
        fly_runtime_app: 'vibey-runtimes',
        agent_runtime_type: 'shared_railway',
        agent_runtime_url: 'https://railway-agent.vibey.test',
      },
      error: null,
    })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url === 'https://railway-agent.vibey.test/api/chat') {
        return Promise.resolve(new Response('unavailable', { status: 503 }))
      }
      if (url === 'https://vibey-runtimes.fly.dev/api/chat') {
        return Promise.resolve(
          new Response('data: {"type":"done"}\n\n', {
            headers: { 'Content-Type': 'text/event-stream' },
          }),
        )
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    const { POST } = await loadRoute()
    const response = await POST(createChatRequest(), {
      params: Promise.resolve({ path: ['chat'] }),
    })
    const textPromise = response.text()
    await vi.runAllTimersAsync()
    const text = await textPromise

    expect(text).toContain('"type":"error"')
    expect(text).toContain('"code":"temporary_unavailable"')
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes('/api/proxy/machines/ensure-running'),
      ),
    ).toBe(false)
    expect(
      fetchMock.mock.calls.some(
        ([url]) => String(url) === 'https://vibey-runtimes.fly.dev/api/chat',
      ),
    ).toBe(false)
  })

  it('routes shared Railway chat prewarm as JSON without Fly wake', async () => {
    supabaseMocks.single.mockResolvedValue({
      data: {
        fly_machine_id: 'machine-1',
        fly_machine_url: 'https://vibey-runtimes.fly.dev',
        fly_runtime_app: 'vibey-runtimes',
        agent_runtime_type: 'shared_railway',
        agent_runtime_url: 'https://railway-agent.vibey.test',
      },
      error: null,
    })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (url === 'https://railway-agent.vibey.test/api/chat/prewarm') {
        const headers = init?.headers as Headers
        expect(headers.get('fly-force-instance-id')).toBeNull()
        return Promise.resolve(
          new Response(JSON.stringify({ ok: true, cache_key: 'shared-cache-key' }), {
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    const { POST } = await loadRoute()
    const response = await POST(createPrewarmRequest(), {
      params: Promise.resolve({ path: ['chat', 'prewarm'] }),
    })
    const text = await response.text()

    expect(response.headers.get('x-vibey-agent-runtime')).toBe('shared-railway')
    expect(text).toContain('"cache_key":"shared-cache-key"')
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes('/api/proxy/machines/ensure-running'),
      ),
    ).toBe(false)
  })

  it('emits a recoverable stream interruption code when upstream relay fails mid-stream', async () => {
    const encoder = new TextEncoder()
    const upstream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"message_start","message_id":"m1"}\n\n'))
      },
      pull() {
        throw new Error('upstream disconnected')
      },
    })
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url.includes('/api/proxy/machines/ensure-running')) {
        return Promise.resolve(new Response('{}', { status: 200 }))
      }
      if (url === 'https://vibey-runtimes.fly.dev/api/chat') {
        return Promise.resolve(
          new Response(upstream, {
            headers: { 'Content-Type': 'text/event-stream' },
          }),
        )
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    })

    const { POST } = await loadRoute()
    const response = await POST(createChatRequest(), {
      params: Promise.resolve({ path: ['chat'] }),
    })
    const text = await response.text()

    expect(text).toContain('"type":"error"')
    expect(text).toContain('"code":"stream_interrupted"')
    expect(text).toContain('"recoverable":true')
  })
})
