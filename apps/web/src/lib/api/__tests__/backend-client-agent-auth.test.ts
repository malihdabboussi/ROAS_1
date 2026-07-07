import { beforeEach, describe, expect, it, vi } from 'vitest'

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    auth: {
      getSession: authMocks.getSession,
      refreshSession: authMocks.refreshSession,
    },
  }),
}))

async function loadBackendClient() {
  vi.resetModules()
  return import('../backend-client')
}

describe('backend-client agent auth gating', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    authMocks.getSession.mockReset()
    authMocks.refreshSession.mockReset()
  })

  it('fails closed for agent routes when no session token is available', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: null } })
    authMocks.refreshSession.mockResolvedValue({ data: { session: null } })

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const { backendFetch } = await loadBackendClient()
    const res = await backendFetch('/api/chat', { method: 'POST' })

    expect(res.status).toBe(401)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('refreshes and sends agent request when refresh provides an access token', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: null } })
    authMocks.refreshSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'header.payload.sig',
          refresh_token: 'refresh-token',
        },
      },
    })

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    const { backendFetch } = await loadBackendClient()
    const res = await backendFetch('/api/chat', { method: 'POST' })

    expect(res.ok).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [, init] = fetchSpy.mock.calls[0] ?? []
    const headers = new Headers((init as RequestInit | undefined)?.headers)
    expect(headers.get('authorization')).toBe('Bearer header.payload.sig')
  })

  it('does not force auth for non-agent routes', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: null } })
    authMocks.refreshSession.mockResolvedValue({ data: { session: null } })

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    const { backendFetch } = await loadBackendClient()
    const res = await backendFetch('/api/models')

    expect(res.ok).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('does not force auth for conversations routes', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: null } })
    authMocks.refreshSession.mockResolvedValue({ data: { session: null } })

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    const { backendFetch } = await loadBackendClient()
    const res = await backendFetch('/api/conversations')

    expect(res.ok).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('keeps platform override path unblocked without auth', async () => {
    authMocks.getSession.mockResolvedValue({ data: { session: null } })
    authMocks.refreshSession.mockResolvedValue({ data: { session: null } })

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ title: 'ok' }), { status: 200 }))

    const { backendFetch } = await loadBackendClient()
    const res = await backendFetch('/api/conversations/suggest-title', {
      method: 'POST',
      body: JSON.stringify({ user_message: 'test' }),
    })

    expect(res.ok).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
