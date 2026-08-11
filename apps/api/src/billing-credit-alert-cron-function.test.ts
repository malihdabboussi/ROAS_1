import { afterEach, describe, expect, it, vi } from 'vitest'
import handler from '../api/billing-credit-alert-cron'

describe('billing credit alert cron function', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('dispatches the authenticated alert sweep', async () => {
    process.env.CRON_SECRET = 'secret'
    process.env.PUBLIC_API_URL = 'https://api.roas.io'
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const json = vi.fn()
    const status = vi.fn().mockReturnValue({ json })

    await handler({ headers: { authorization: 'Bearer secret' } }, { status })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.roas.io/api/internal/billing-credit-alerts/process-due',
      { headers: { authorization: 'Bearer secret' } },
    )
    expect(status).toHaveBeenCalledWith(200)
    expect(json).toHaveBeenCalledWith({ dispatched: true })
  })
})
