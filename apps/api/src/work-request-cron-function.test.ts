import { afterEach, describe, expect, it, vi } from 'vitest'
import handler from '../api/work-request-cron'

function responseHarness() {
  const json = vi.fn()
  const status = vi.fn(() => ({ json }))
  return { response: { status }, status }
}

describe('standalone Service Request cron ingress', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.CRON_SECRET
    delete process.env.PUBLIC_API_URL
  })

  it('rejects an invalid cron secret', async () => {
    process.env.CRON_SECRET = 'cron-secret'
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { response, status } = responseHarness()

    await handler({ headers: { authorization: 'Bearer wrong' } }, response)

    expect(status).toHaveBeenCalledWith(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('forwards an authorized cron wakeup to reminders and sync retries', async () => {
    process.env.CRON_SECRET = 'cron-secret'
    process.env.PUBLIC_API_URL = 'https://api.example.com/'
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { response, status } = responseHarness()

    await handler({ headers: { authorization: 'Bearer cron-secret' } }, response)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/internal/work-requests/process-reminders',
      expect.objectContaining({
        method: 'POST',
        headers: { authorization: 'Bearer cron-secret' },
      }),
    )
    expect(status).toHaveBeenCalledWith(200)
  })
})
