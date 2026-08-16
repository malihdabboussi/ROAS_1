import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchWorkRequestReview,
  finalizeWorkRequestReview,
  requestWorkRequestRefresh,
} from './work-request-api'

describe('public Work Request API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each(['invalid', 'expired', 'revoked', 'finalized'] as const)(
    'preserves the %s review state',
    async (state) => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ state }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      vi.stubGlobal('fetch', fetchMock)

      await expect(fetchWorkRequestReview('safe-token')).resolves.toEqual({ state })
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/proxy/work-requests/review/safe-token',
        expect.objectContaining({ method: 'GET', cache: 'no-store' }),
      )
      expect(fetchMock.mock.calls[0]?.[1]?.headers).toBeUndefined()
    },
  )

  it('finalizes without adding an authorization header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ state: 'finalized', final_task_id: 'task-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await finalizeWorkRequestReview('safe-token')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/proxy/work-requests/review/safe-token/finalize',
      expect.objectContaining({ method: 'POST', headers: undefined }),
    )
  })

  it('returns the safe refresh-required state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ state: 'refresh_required' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(requestWorkRequestRefresh('safe-token')).resolves.toEqual({
      state: 'refresh_required',
    })
  })
})
