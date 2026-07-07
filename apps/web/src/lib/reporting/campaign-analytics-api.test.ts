import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet } from '@/lib/api/backend-client'
import {
  fetchCampaignAnalytics,
  fetchCampaignEmailAnalytics,
} from './campaign-analytics-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendDelete: vi.fn(),
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: vi.fn(),
}))

const backendGetMock = vi.mocked(backendGet)

describe('campaign analytics API', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
  })

  it('fetches funnel analytics with optional date and funnel filters', async () => {
    backendGetMock.mockResolvedValue({
      visitors: 10,
      total_views: 20,
      leads: 3,
      conversion_rate: 30,
      chart_data: [],
    })

    await expect(
      fetchCampaignAnalytics('campaign-1', '2026-01-01', '2026-01-31', {
        funnelIds: ['funnel-1', 'funnel-2'],
      }),
    ).resolves.toMatchObject({ visitors: 10, leads: 3 })
    expect(backendGetMock).toHaveBeenCalledWith(
      '/api/campaigns/campaign-1/analytics?start_date=2026-01-01&end_date=2026-01-31&funnel_ids=funnel-1%2Cfunnel-2',
    )
  })

  it('preserves an explicit empty funnel scope', async () => {
    backendGetMock.mockResolvedValue({
      visitors: 0,
      total_views: 0,
      leads: 0,
      conversion_rate: 0,
      chart_data: [],
    })

    await fetchCampaignAnalytics('campaign-1', undefined, undefined, { funnelIds: [] })
    expect(backendGetMock).toHaveBeenCalledWith(
      '/api/campaigns/campaign-1/analytics?funnel_ids=',
    )
  })

  it('fetches email analytics with optional date and sequence filters', async () => {
    backendGetMock.mockResolvedValue({
      sent: 5,
      delivered: 4,
      opened: 3,
      clicked: 2,
      bounced: 1,
      open_rate: 75,
      click_rate: 50,
      chart_data: [],
    })

    await expect(
      fetchCampaignEmailAnalytics('campaign-2', '2026-02-01', '2026-02-28', {
        sequenceIds: ['sequence-1', 'sequence-2'],
      }),
    ).resolves.toMatchObject({ sent: 5, opened: 3 })
    expect(backendGetMock).toHaveBeenCalledWith(
      '/api/campaigns/campaign-2/email-analytics?start_date=2026-02-01&end_date=2026-02-28&sequence_ids=sequence-1%2Csequence-2',
    )
  })

  it('preserves an explicit empty sequence scope', async () => {
    backendGetMock.mockResolvedValue({
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      open_rate: 0,
      click_rate: 0,
      chart_data: [],
    })

    await fetchCampaignEmailAnalytics('campaign-2', undefined, undefined, { sequenceIds: [] })
    expect(backendGetMock).toHaveBeenCalledWith(
      '/api/campaigns/campaign-2/email-analytics?sequence_ids=',
    )
  })
})
