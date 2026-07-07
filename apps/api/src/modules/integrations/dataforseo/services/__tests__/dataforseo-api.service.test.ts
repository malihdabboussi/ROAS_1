import { ConfigService } from '@nestjs/config'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ErrorReporter } from '@vibey/api-shared'
import { DataForSeoApiService } from '../dataforseo-api.service'

describe('DataForSeoApiService', () => {
  let service: DataForSeoApiService
  let report: ReturnType<typeof vi.fn>

  beforeEach(() => {
    report = vi.fn()
    const errorReporter = { report } as unknown as ErrorReporter
    const config = {
      get: vi.fn((key: string) => {
        if (key === 'DATAFORSEO_LOGIN') return 'test-login'
        if (key === 'DATAFORSEO_PASSWORD') return 'test-password'
        return ''
      }),
    } as unknown as ConfigService
    service = new DataForSeoApiService(config, errorReporter)
    vi.stubGlobal('fetch', vi.fn())
  })

  it('posts one task with basic auth', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      status: 200,
      text: async () => JSON.stringify({ status_code: 20000, cost: 0.001, tasks: [] }),
    } as Response)

    const result = await service.forwardPost('/v3/test/live', { keyword: 'seo' })

    expect(result.status).toBe(200)
    expect(fetch).toHaveBeenCalledWith(
      'https://api.dataforseo.com/v3/test/live',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from('test-login:test-password').toString('base64')}`,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify([{ keyword: 'seo' }]),
      }),
    )
  })

  it('reports network failures via ErrorReporter', async () => {
    const networkErr = new Error('fetch failed')
    vi.mocked(fetch).mockRejectedValueOnce(networkErr)

    await expect(service.forwardPost('/v3/test/live', { keyword: 'seo' })).rejects.toThrow(
      'fetch failed',
    )

    expect(report).toHaveBeenCalledOnce()
    expect(report.mock.calls[0]?.[0]).toMatchObject({
      feature: 'integrations/dataforseo',
      error_code: 'network_failed',
    })
    expect((networkErr as { __appErrorReported?: boolean }).__appErrorReported).toBe(true)
  })
})
