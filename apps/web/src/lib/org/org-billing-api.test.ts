import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet } from '@/lib/api/backend-client'
import { getOrgHumanSpending } from './org-billing-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
}))

describe('getOrgHumanSpending', () => {
  beforeEach(() => {
    vi.mocked(backendGet).mockReset()
  })

  it('requests org human spending with encoded campaign filters', async () => {
    vi.mocked(backendGet).mockResolvedValue({ success: true, humans: [] })

    await getOrgHumanSpending('org-1', '2026-06-15T00:00:00.000Z', '2026-06-23T12:00:00.000Z', [
      'campaign-1',
      'campaign 2',
    ])

    expect(backendGet).toHaveBeenCalledWith(
      '/api/org/org-1/billing/human-spending?startDate=2026-06-15T00%3A00%3A00.000Z&endDate=2026-06-23T12%3A00%3A00.000Z&campaignIds=campaign-1%2Ccampaign+2',
    )
  })
})
