import type { ConfigService } from '@nestjs/config'
import type { Pool } from 'pg'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DatabaseService } from './database.service'

describe('DatabaseService', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('allows a slow Supabase request to finish instead of aborting it after seven seconds', async () => {
    vi.useFakeTimers()
    const networkFetch = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          const finish = setTimeout(() => resolve(new Response(null, { status: 200 })), 10_000)
          init?.signal?.addEventListener('abort', () => {
            clearTimeout(finish)
            reject(new DOMException('This operation was aborted', 'AbortError'))
          })
        }),
    )
    vi.stubGlobal('fetch', networkFetch)

    const service = new DatabaseService({} as ConfigService)
    const resilientFetch = (
      service as unknown as { supabaseFetch: typeof fetch }
    ).supabaseFetch
    const responsePromise = resilientFetch('https://example.supabase.co/rest/v1/missions')

    await vi.advanceTimersByTimeAsync(8_000)
    expect(networkFetch).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(2_000)
    await expect(responsePromise).resolves.toMatchObject({ status: 200 })
  })

  it('detaches a failed Postgres pool before waiting for it to close', async () => {
    let finishClosing: (() => void) | undefined
    const end = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishClosing = resolve
        }),
    )
    const service = new DatabaseService({} as ConfigService)
    const internals = service as unknown as {
      pgPool: Pool | null
      disablePgPoolFromError(error: unknown): Promise<void>
    }
    internals.pgPool = { end } as unknown as Pool

    const disabling = internals.disablePgPoolFromError(new Error('Connection terminated'))

    expect(service.hasPgPool()).toBe(false)
    expect(end).toHaveBeenCalledOnce()

    finishClosing?.()
    await disabling
  })
})
