import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CampaignOverviewView } from './CampaignOverviewView'

vi.mock('@/features/mission-control/services/missions.service', () => ({
  fetchMissions: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/features/studio/services/analytics.service', () => ({
  fetchCampaignLeaderboard: vi.fn().mockResolvedValue([]),
  fetchCampaignMainDashboard: vi.fn().mockResolvedValue(null),
  fetchCampaignReportingWidgets: vi.fn().mockResolvedValue(null),
  fetchCampaignSocialAnalytics: vi.fn().mockResolvedValue(null),
  fetchCampaignStripeOverview: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/features/studio/components/preview/MainDashboardOverview', () => ({
  MainDashboardOverview: () => <div>Dashboard grid</div>,
}))

describe('CampaignOverviewView', () => {
  afterEach(cleanup)

  it('owns a height-constrained vertical scroll region', () => {
    const { container } = render(
      <CampaignOverviewView
        campaignId="campaign-1"
        activeView={{ id: 'overview', type: 'campaign_overview', name: 'Overview' } as never}
        onViewPatch={vi.fn()}
      />,
    )

    expect(container.firstElementChild).toHaveClass(
      'h-0',
      'min-h-0',
      'flex-1',
      'overflow-x-hidden',
      'overflow-y-auto',
    )
  })
})
