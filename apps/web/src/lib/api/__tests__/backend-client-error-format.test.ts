import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendFetch, backendPatch } from '../backend-client'

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null } }),
    },
  }),
}))

vi.mock('@/lib/log-client-error', () => ({
  reportClientError: vi.fn(),
}))

describe('backend-client validation error formatting', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('converts object-shaped Nest validation message into readable string', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 400,
          message: { message: 'Field required', error: 'Validation failed', details: [] },
          error: 'Bad Request',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    await expect(backendPatch('/api/test', { x: 1 })).rejects.toThrow('Field required')
  })

  it('supports plain string message format', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Nope' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(backendPatch('/api/test', { x: 1 })).rejects.toThrow('Nope')
  })

  it('falls back to status-based message when response body is empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 500 }))

    await expect(backendPatch('/api/test', { x: 1 })).rejects.toThrow('Backend error 500')
  })

  it('retries transient backend failures before returning the final response', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Backend unavailable' }), { status: 502 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    const res = await backendFetch('/api/test')

    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry non-transient validation failures', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Field required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const res = await backendFetch('/api/test')

    expect(res.status).toBe(400)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
