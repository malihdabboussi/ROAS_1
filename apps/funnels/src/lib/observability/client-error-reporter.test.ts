import { afterEach, describe, expect, it, vi } from 'vitest'
import { reportFunnelsClientError } from './client-error-reporter'

describe('reportFunnelsClientError', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('posts a funnels client-error payload to the backend', async () => {
    vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', 'https://api.test')
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await reportFunnelsClientError({
      feature: 'funnels_lead_capture',
      error_code: 'FUNNELS_LEAD_CAPTURE_CLIENT_FAILED',
      message: 'lead failed',
      context: { funnel_id: 'funnel-1' },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/api/log/client-error',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }),
    )
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual(
      expect.objectContaining({
        app: 'funnels',
        feature: 'funnels_lead_capture',
        error_code: 'FUNNELS_LEAD_CAPTURE_CLIENT_FAILED',
        message: 'lead failed',
        context: { funnel_id: 'funnel-1' },
      }),
    )
  })
})
