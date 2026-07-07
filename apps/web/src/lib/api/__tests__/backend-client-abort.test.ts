import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendFetch, cancelAllPendingBackendRequests } from '../backend-client'

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null } }),
      refreshSession: async () => ({ data: { session: null } }),
    },
  }),
}))

describe('backend-client in-flight cancellation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('cancelAllPending aborts active requests during org switch', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 10)
        }) as Promise<Response>,
    )

    const p = backendFetch('/api/test')
    cancelAllPendingBackendRequests()
    await expect(p).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('new requests still run after cancellation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )

    cancelAllPendingBackendRequests()
    const res = await backendFetch('/api/test')
    expect(res.ok).toBe(true)
  })
})
