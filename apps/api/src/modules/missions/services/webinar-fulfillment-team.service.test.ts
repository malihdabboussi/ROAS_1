import { describe, expect, it } from 'vitest'
import { WebinarFulfillmentTeamService } from './webinar-fulfillment-team.service'

describe('WebinarFulfillmentTeamService playbook support', () => {
  const service = new WebinarFulfillmentTeamService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  )

  it('provisions the agency roster for Webinar Fulfillment and Ads Research', () => {
    expect(service.supportsPlaybook('webinar-fulfillment')).toBe(true)
    expect(service.supportsPlaybook('ads-research')).toBe(true)
    expect(service.supportsPlaybook('meta-ads-launch')).toBe(false)
  })
})
