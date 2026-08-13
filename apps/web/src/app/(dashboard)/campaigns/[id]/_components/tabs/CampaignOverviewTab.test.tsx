import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Space } from '@/features/spaces/types'
import { CampaignOverviewTab } from './CampaignOverviewTab'

const mocks = vi.hoisted(() => ({
  fetchSpaces: vi.fn(),
  routerPush: vi.fn(),
  setActiveSpace: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}))

vi.mock('@/features/spaces/services/spaces.service', () => ({
  createSpace: vi.fn(),
  fetchSpaces: mocks.fetchSpaces,
}))

vi.mock('@/features/spaces/store/use-spaces-store', () => ({
  useSpacesStore: {
    getState: () => ({
      setActiveSpace: mocks.setActiveSpace,
      spaces: [],
    }),
  },
}))

vi.mock('./CampaignOverviewDocsSection', () => ({
  CampaignOverviewDocsSection: () => null,
}))

const generalSpace: Space = {
  id: 'sakha/general space',
  org_id: 'org-1',
  user_id: 'user-1',
  title: 'General',
  description: null,
  campaign_id: 'sakha-campaign',
  is_template: false,
  visibility: 'team',
  schema: { version: 1, fields: [], views: [] },
  created_at: '2026-07-20T00:00:00.000Z',
  updated_at: '2026-07-22T00:00:00.000Z',
}

describe('CampaignOverviewTab', () => {
  beforeEach(() => {
    mocks.fetchSpaces.mockResolvedValue([generalSpace])
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('opens the selected campaign workspace through its canonical URL', async () => {
    render(
      <CampaignOverviewTab
        campaignId="sakha-campaign"
        campaignName="Sakha Media Group"
        dashboardMissions={[]}
        dashboardAgents={[]}
        campaignTeam={[]}
        onOpenTab={vi.fn()}
        onManageTeam={vi.fn()}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'General' }))

    expect(mocks.setActiveSpace).toHaveBeenCalledWith(generalSpace.id)
    expect(mocks.routerPush).toHaveBeenCalledWith('/spaces?space=sakha%2Fgeneral%20space')
  })
})
