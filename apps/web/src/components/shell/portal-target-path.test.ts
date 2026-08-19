import { describe, expect, it } from 'vitest'
import { portalTargetPathFromRoute } from './portal-target-path'

const clientId = '11111111-1111-1111-1111-111111111111'
const campaignId = '22222222-2222-2222-2222-222222222222'

describe('portalTargetPathFromRoute', () => {
  it('opens the selected Page Grader client from a ROAS client route', () => {
    expect(portalTargetPathFromRoute({ pathname: `/clients/${clientId}` })).toBe(
      `/clients/${clientId}`,
    )
    expect(portalTargetPathFromRoute({ pathname: '/clients' })).toBe('/clients')
  })

  it('opens Page Grader campaigns from the Client Campaigns screen', () => {
    expect(portalTargetPathFromRoute({ pathname: '/client-campaigns' })).toBe('/campaigns')
  })

  it('opens Page Grader launches from the Launches screen', () => {
    expect(portalTargetPathFromRoute({ pathname: '/launches' })).toBe('/launches')
  })

  it('honors an explicit portal_path from a campaign action', () => {
    expect(
      portalTargetPathFromRoute({
        pathname: `/clients/${clientId}`,
        portalPath: `/campaigns/${campaignId}`,
      }),
    ).toBe(`/campaigns/${campaignId}`)
  })

  it('maps a Space to its Page Grader campaign through schema provenance, not the ROAS campaign id', () => {
    expect(
      portalTargetPathFromRoute({
        pathname: '/spaces',
        space: {
          schema: {
            custom_data: {
              page_grader_client_id: clientId,
              page_grader_campaign_id: campaignId,
            },
          },
        },
      }),
    ).toBe(`/campaigns/${campaignId}`)
    expect(
      portalTargetPathFromRoute({
        pathname: `/campaigns/${campaignId}`,
      }),
    ).toBe('/clients')
  })

  it('ignores unsafe portal_path values', () => {
    expect(
      portalTargetPathFromRoute({
        pathname: '/clients',
        portalPath: '//evil.example/clients',
      }),
    ).toBe('/clients')
  })
})
