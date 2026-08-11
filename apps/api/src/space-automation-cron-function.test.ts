import type { Request, Response } from 'express'
import { afterEach, describe, expect, it, vi } from 'vitest'
import handler from '../api/space-automation-cron'

function responseHarness() {
  const json = vi.fn()
  const status = vi.fn().mockReturnValue({ json })
  return { response: { status } as unknown as Response, status }
}

describe('standalone space automation cron ingress', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.CRON_SECRET
    delete process.env.PUBLIC_API_URL
  })

  it('rejects an invalid cron secret without dispatching', async () => {
    process.env.CRON_SECRET = 'cron-secret'
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { response, status } = responseHarness()

    await handler({ headers: { authorization: 'Bearer wrong' } } as Request, response)

    expect(status).toHaveBeenCalledWith(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('forwards an authorized cron wakeup without importing Nest or Redis', async () => {
    process.env.CRON_SECRET = 'cron-secret'
    process.env.PUBLIC_API_URL = 'https://api.example.com/'
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { response, status } = responseHarness()

    await handler({ headers: { authorization: 'Bearer cron-secret' } } as Request, response)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/internal/space-automations/process-due',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer cron-secret' }),
      }),
    )
    expect(status).toHaveBeenCalledWith(200)
  })
})
