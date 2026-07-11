import { afterEach, describe, expect, it, vi } from 'vitest'
import worker from './index'

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function makeKv(initial = new Map<string, unknown>()) {
  return {
    get: vi.fn(async (key: string) => initial.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      initial.set(key, JSON.parse(value))
    }),
  }
}

function makeEnv(kv = makeKv(), overrides: Record<string, string> = {}) {
  return {
    SLUG_CACHE: kv,
    SUPABASE_URL: 'https://supabase.test',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    BACKEND_URL: '',
    INTERNAL_API_TOKEN: '',
    APPS_WEB_VERCEL_URL: 'https://web.example',
    FLY_RUNTIME_URL: 'https://roas-runtimes.fly.dev',
    APPS_DOMAIN_SUFFIX: '-app.roas.io',
    PUBLIC_AGENT_HOST_SUFFIX: 'agents.roas.io',
    ...overrides,
  }
}

function makeLegacyGovibeyEnv(kv = makeKv()) {
  return makeEnv(kv, {
    FLY_RUNTIME_URL: 'https://vibey-runtimes.fly.dev',
    APPS_DOMAIN_SUFFIX: '-app.govibey.com',
    PUBLIC_AGENT_HOST_SUFFIX: 'govibey.com',
  })
}

describe('apps proxy trusted runtime origin', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('ignores profile fly_machine_url for public agent API proxying', async () => {
    const upstreamFetches: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/rest/v1/organizations?slug=')) {
          return jsonResponse([])
        }
        if (url.includes('/rest/v1/profiles?public_agent_slug=')) {
          return jsonResponse([
            {
              id: 'user-1',
              fly_machine_url: 'https://evil.example',
              fly_machine_id: 'machine-1',
            },
          ])
        }
        if (url.includes('/rest/v1/agents_registry?')) {
          return jsonResponse([
            {
              public_page_token: 'agent-token',
              widget_allowed_origins: [],
            },
          ])
        }
        upstreamFetches.push(url)
        expect(url).toBe('https://roas-runtimes.fly.dev/api/public-chat')
        expect(new Headers(init?.headers).get('x-public-agent-token')).toBe('agent-token')
        expect(new Headers(init?.headers).get('fly-force-instance-id')).toBe('machine-1')
        return new Response('ok')
      }),
    )
    const env = makeEnv()

    const response = await worker.fetch(
      new Request('https://alice.agents.roas.io/a/vibey/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'hello' }),
        headers: { 'content-type': 'application/json' },
      }),
      env as never,
    )

    expect(response.status).toBe(200)
    expect(upstreamFetches).toEqual(['https://roas-runtimes.fly.dev/api/public-chat'])
  })

  it('routes public agent API calls to trusted shared Fly runtime', async () => {
    const upstreamFetches: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/rest/v1/organizations?slug=')) {
          return jsonResponse([])
        }
        if (url.includes('/rest/v1/profiles?public_agent_slug=')) {
          return jsonResponse([
            {
              id: 'user-1',
              fly_machine_id: 'machine-1',
              agent_runtime_type: 'shared_railway',
              agent_runtime_url: 'https://roas-runtimes.fly.dev',
            },
          ])
        }
        if (url.includes('/rest/v1/agents_registry?')) {
          return jsonResponse([
            {
              public_page_token: 'agent-token',
              widget_allowed_origins: [],
            },
          ])
        }
        upstreamFetches.push(url)
        expect(url).toBe('https://roas-runtimes.fly.dev/api/public-chat')
        const headers = new Headers(init?.headers)
        expect(headers.get('x-public-agent-token')).toBe('agent-token')
        expect(headers.get('fly-force-instance-id')).toBeNull()
        return new Response('ok')
      }),
    )

    const response = await worker.fetch(
      new Request('https://alice.agents.roas.io/a/vibey/api/chat', { method: 'POST' }),
      makeEnv() as never,
    )

    expect(response.status).toBe(200)
    expect(upstreamFetches).toEqual(['https://roas-runtimes.fly.dev/api/public-chat'])
  })

  it('routes public agent API calls to trusted shared Railway runtime', async () => {
    const upstreamFetches: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/rest/v1/organizations?slug=')) {
          return jsonResponse([])
        }
        if (url.includes('/rest/v1/profiles?public_agent_slug=')) {
          return jsonResponse([
            {
              id: 'user-1',
              fly_machine_id: 'machine-1',
              agent_runtime_type: 'shared_railway',
              agent_runtime_url: 'https://vibeyv2-production-1437.up.railway.app',
            },
          ])
        }
        if (url.includes('/rest/v1/agents_registry?')) {
          return jsonResponse([
            {
              public_page_token: 'agent-token',
              widget_allowed_origins: [],
            },
          ])
        }
        upstreamFetches.push(url)
        expect(url).toBe('https://vibeyv2-production-1437.up.railway.app/api/public-chat')
        const headers = new Headers(init?.headers)
        expect(headers.get('x-public-agent-token')).toBe('agent-token')
        expect(headers.get('fly-force-instance-id')).toBeNull()
        return new Response('ok')
      }),
    )

    const response = await worker.fetch(
      new Request('https://alice.agents.roas.io/a/vibey/api/chat', { method: 'POST' }),
      makeEnv() as never,
    )

    expect(response.status).toBe(200)
    expect(upstreamFetches).toEqual([
      'https://vibeyv2-production-1437.up.railway.app/api/public-chat',
    ])
  })

  it('ignores profile fly_machine_url for app route proxying', async () => {
    const upstreamFetches: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/rest/v1/project_repos?')) {
          return jsonResponse([
            {
              id: 'project-1',
              user_id: 'user-1',
              vercel_deployment_url: null,
            },
          ])
        }
        if (url.includes('/rest/v1/profiles?id=eq.user-1')) {
          return jsonResponse([
            {
              fly_machine_url: 'https://evil.example',
              fly_machine_id: 'machine-1',
            },
          ])
        }
        upstreamFetches.push(url)
        expect(url).toBe('https://roas-runtimes.fly.dev/api/apps/project-1/pricing?x=1')
        expect(new Headers(init?.headers).get('fly-force-instance-id')).toBe('machine-1')
        return new Response('ok')
      }),
    )
    const env = makeEnv()

    const response = await worker.fetch(
      new Request('https://demo-app.roas.io/pricing?x=1'),
      env as never,
    )

    expect(response.status).toBe(200)
    expect(upstreamFetches).toEqual([
      'https://roas-runtimes.fly.dev/api/apps/project-1/pricing?x=1',
    ])
  })

  it('rejects cached agent routes that contain an untrusted runtime origin', async () => {
    const kv = makeKv(
      new Map<string, unknown>([
        [
          'agent-route:alice',
          {
            userId: 'cached-user',
            orgId: null,
            flyMachineUrl: 'https://evil.example',
            flyMachineId: 'cached-machine',
          },
        ],
      ]),
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/rest/v1/organizations?slug=')) {
          return jsonResponse([])
        }
        if (url.includes('/rest/v1/profiles?public_agent_slug=')) {
          return jsonResponse([
            {
              id: 'user-1',
              fly_machine_url: 'https://evil.example',
              fly_machine_id: 'machine-1',
            },
          ])
        }
        if (url.includes('/rest/v1/agents_registry?')) {
          return jsonResponse([
            {
              public_page_token: 'agent-token',
              widget_allowed_origins: [],
            },
          ])
        }
        expect(url).toBe('https://roas-runtimes.fly.dev/api/public-chat')
        return new Response('ok')
      }),
    )

    const response = await worker.fetch(
      new Request('https://alice.agents.roas.io/a/vibey/api/chat'),
      makeEnv(kv) as never,
    )

    expect(response.status).toBe(200)
    expect(kv.put).toHaveBeenCalledWith(
      'agent-route:alice',
      JSON.stringify({
        userId: 'user-1',
        orgId: null,
        runtimeSource: 'fly_machine',
        runtimeUrl: 'https://roas-runtimes.fly.dev',
        flyMachineId: 'machine-1',
      }),
      { expirationTtl: 60 },
    )
  })

  it('rejects project Vercel upstreams that are not Vercel deployment URLs', async () => {
    const upstreamFetches: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/rest/v1/project_repos?')) {
          return jsonResponse([
            {
              id: 'project-1',
              user_id: 'user-1',
              vercel_deployment_url: 'https://evil.example',
            },
          ])
        }
        upstreamFetches.push(url)
        return new Response('unexpected upstream', { status: 500 })
      }),
    )

    const response = await worker.fetch(
      new Request('https://demo-app.roas.io/pricing'),
      makeEnv() as never,
    )

    expect(response.status).toBe(404)
    expect(upstreamFetches).toEqual([])
  })

  it('strips visitor credentials when proxying to trusted Vercel deployment URLs', async () => {
    let upstreamHeaders = new Headers()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/rest/v1/project_repos?')) {
          return jsonResponse([
            {
              id: 'project-1',
              user_id: 'user-1',
              vercel_deployment_url: 'https://demo-project.vercel.app',
            },
          ])
        }
        expect(url).toBe('https://demo-project.vercel.app/pricing')
        upstreamHeaders = new Headers(init?.headers)
        return new Response('ok')
      }),
    )

    const response = await worker.fetch(
      new Request('https://demo-app.roas.io/pricing', {
        headers: {
          authorization: 'Bearer visitor-token',
          cookie: 'session=visitor',
          'x-vibey-worker-secret': 'secret',
        },
      }),
      makeEnv() as never,
    )

    expect(response.status).toBe(200)
    expect(upstreamHeaders.get('authorization')).toBeNull()
    expect(upstreamHeaders.get('cookie')).toBeNull()
    expect(upstreamHeaders.get('x-vibey-worker-secret')).toBeNull()
  })

  it('resolves organization agent slugs before profile public agent slugs', async () => {
    const upstreamFetches: string[] = []
    const queriedUrls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        queriedUrls.push(url)
        if (url.includes('/rest/v1/organizations?slug=')) {
          return jsonResponse([{ id: 'org-1', owner_id: 'owner-1' }])
        }
        if (url.includes('/rest/v1/profiles?id=eq.owner-1')) {
          return jsonResponse([
            {
              id: 'owner-1',
              fly_machine_url: 'https://ignored.example',
              fly_machine_id: 'owner-machine',
            },
          ])
        }
        if (url.includes('/rest/v1/agents_registry?')) {
          expect(url).toContain('org_id=eq.org-1')
          expect(url).toContain('user_id=is.null')
          return jsonResponse([
            {
              public_page_token: 'org-agent-token',
              widget_allowed_origins: [],
            },
          ])
        }
        upstreamFetches.push(url)
        expect(url).toBe('https://roas-runtimes.fly.dev/api/public-chat')
        expect(new Headers(init?.headers).get('x-public-agent-token')).toBe('org-agent-token')
        expect(new Headers(init?.headers).get('fly-force-instance-id')).toBe('owner-machine')
        return new Response('ok')
      }),
    )

    const response = await worker.fetch(
      new Request('https://acme.agents.roas.io/a/vibey/api/chat', { method: 'POST' }),
      makeEnv() as never,
    )

    expect(response.status).toBe(200)
    expect(upstreamFetches).toEqual(['https://roas-runtimes.fly.dev/api/public-chat'])
    expect(queriedUrls.some((url) => url.includes('/rest/v1/profiles?public_agent_slug='))).toBe(
      false,
    )
  })
})
