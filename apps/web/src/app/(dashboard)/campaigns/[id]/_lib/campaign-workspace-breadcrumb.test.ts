import { describe, expect, it } from 'vitest'
import { buildCampaignWorkspaceBreadcrumbItems } from './campaign-workspace-breadcrumb'

describe('buildCampaignWorkspaceBreadcrumbItems', () => {
  it('nests a named client under Campaigns', () => {
    expect(
      buildCampaignWorkspaceBreadcrumbItems({
        campaignName: 'General',
        campaignId: 'campaign-1',
        clientId: 'client-1',
        clientName: 'Master Your Kraft',
      }),
    ).toEqual([
      { href: '/campaigns', label: 'Campaigns' },
      { href: '/clients/client-1', label: 'Master Your Kraft' },
      { href: '/campaigns/campaign-1', label: 'General' },
    ])
  })

  it('nests a named program under Campaigns when there is no client', () => {
    expect(
      buildCampaignWorkspaceBreadcrumbItems({
        campaignName: 'General',
        campaignId: 'campaign-1',
        programId: 'program-1',
        programName: 'Master Your Kraft',
      }),
    ).toEqual([
      { href: '/campaigns', label: 'Campaigns' },
      { href: '/programs/program-1', label: 'Master Your Kraft' },
      { href: '/campaigns/campaign-1', label: 'General' },
    ])
  })

  it('does not insert Client Spaces or a duplicate campaign name', () => {
    expect(
      buildCampaignWorkspaceBreadcrumbItems({
        campaignName: 'Master Your Kraft',
        campaignId: 'campaign-1',
        programId: 'program-clients',
        programName: 'Client Spaces',
      }),
    ).toEqual([
      { href: '/campaigns', label: 'Campaigns' },
      { href: '/campaigns/campaign-1', label: 'Master Your Kraft' },
    ])
  })
})
