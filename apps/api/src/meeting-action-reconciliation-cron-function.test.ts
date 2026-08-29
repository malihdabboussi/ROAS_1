import { afterEach, describe, expect, it, vi } from 'vitest'
import handler from '../api/meeting-action-reconciliation-cron'

function responseHarness() {
  const json = vi.fn()
  const status = vi.fn(() => ({ json }))
  return { response: { status }, status }
}

describe('standalone meeting action reconciliation cron ingress', () => {
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

  it('dispatches an authorized reconciliation', async () => {
    process.env.CRON_SECRET = 'cron-secret'
    process.env.PUBLIC_API_URL = 'https://api.example.com/'
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { response, status } = responseHarness()

    await handler({ headers: { authorization: 'Bearer cron-secret' } }, response)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/internal/meeting-action-reconciliation/run',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(status).toHaveBeenCalledWith(200)
  })
})
