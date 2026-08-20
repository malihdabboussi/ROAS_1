import { describe, expect, it } from 'vitest'
import { WebinarFulfillmentTeamService } from './webinar-fulfillment-team.service'

describe('WebinarFulfillmentTeamService playbook support', () => {
  const service = new WebinarFulfillmentTeamService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  )

  it('provisions the agency roster for every guided agency playbook', () => {
    expect(service.supportsPlaybook('client-strategy')).toBe(true)
    expect(service.supportsPlaybook('webinar-fulfillment')).toBe(true)
    expect(service.supportsPlaybook('ads-research')).toBe(true)
    expect(service.supportsPlaybook('ig-organic-video-ad')).toBe(true)
    expect(service.supportsPlaybook('static-ad-production')).toBe(true)
    expect(service.supportsPlaybook('meta-ads-launch')).toBe(true)
    expect(service.supportsPlaybook('meta-ads-audit')).toBe(true)
    expect(service.supportsPlaybook('task-cleanup')).toBe(true)
  })
})
