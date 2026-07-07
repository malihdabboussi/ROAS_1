import { HttpException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DataForSeoUsageService } from '../../services/dataforseo-usage.service'

describe('DataForSeoUsageService', () => {
  let api: { forwardPost: ReturnType<typeof vi.fn> }
  let credits: { processDirectTextUsage: ReturnType<typeof vi.fn> }
  let errorReporter: { report: ReturnType<typeof vi.fn> }
  let service: DataForSeoUsageService

  beforeEach(() => {
    api = { forwardPost: vi.fn() }
    credits = { processDirectTextUsage: vi.fn(async () => null) }
    errorReporter = { report: vi.fn() }
    service = new DataForSeoUsageService(api as any, credits as any, errorReporter as any)
  })

  it('charges response cost after successful provider status', async () => {
    api.forwardPost.mockResolvedValueOnce({
      status: 200,
      body: {
        status_code: 20000,
        cost: 0.007,
        tasks: [{ status_code: 20000, cost: 0.007 }],
      },
    })

    const result = await service.run(
      'user-1',
      'google_serp',
      { keyword: 'seo agency', location_code: 2840 },
      'org-1',
    )

    expect(result).toMatchObject({ success: true, action: 'google_serp' })
    expect(api.forwardPost).toHaveBeenCalledWith('/v3/serp/google/organic/live/advanced', {
      keyword: 'seo agency',
      location_code: 2840,
    })
    expect(credits.processDirectTextUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        orgId: 'org-1',
        feature: 'dataforseo',
        action: 'google_serp',
        modelName: 'dataforseo/google_serp',
        preComputedCost: 0.007,
        costSource: 'dataforseo_response_cost',
      }),
    )
  })

  it('does not charge credits when provider status_code fails', async () => {
    api.forwardPost.mockResolvedValueOnce({
      status: 200,
      body: {
        status_code: 40000,
        status_message: 'Invalid task',
        tasks: [{ status_code: 40000, status_message: 'Invalid keyword' }],
      },
    })

    await expect(
      service.run('user-1', 'google_serp', { keyword: 'seo agency' }, undefined),
    ).rejects.toBeInstanceOf(HttpException)

    expect(credits.processDirectTextUsage).not.toHaveBeenCalled()
    expect(errorReporter.report).toHaveBeenCalledOnce()
  })
})
