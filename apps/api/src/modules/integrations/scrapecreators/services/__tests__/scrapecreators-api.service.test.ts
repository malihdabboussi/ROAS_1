import { ConfigService } from '@nestjs/config'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ErrorReporter } from '@vibey/api-shared'
import { ScrapeCreatorsApiService } from '../scrapecreators-api.service'

describe('ScrapeCreatorsApiService', () => {
  let service: ScrapeCreatorsApiService
  let report: ReturnType<typeof vi.fn>

  beforeEach(() => {
    report = vi.fn()
    const errorReporter = { report } as unknown as ErrorReporter
    const config = {
      get: vi.fn(() => 'test-api-key'),
    } as unknown as ConfigService
    service = new ScrapeCreatorsApiService(config, errorReporter)
    vi.stubGlobal('fetch', vi.fn())
  })

  it('reports network failures via ErrorReporter', async () => {
    const networkErr = new Error('fetch failed')
    vi.mocked(fetch).mockRejectedValueOnce(networkErr)

    await expect(service.forwardGet('/v1/tiktok/profile', { handle: 'x' })).rejects.toThrow(
      'fetch failed',
    )

    expect(report).toHaveBeenCalledOnce()
    expect(report.mock.calls[0]?.[0]).toMatchObject({
      feature: 'integrations/scrapecreators',
      error_code: 'network_failed',
    })
    expect((networkErr as { __appErrorReported?: boolean }).__appErrorReported).toBe(true)
  })
})
