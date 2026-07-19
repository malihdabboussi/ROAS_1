import { describe, expect, it } from 'vitest'
import { resolveMissionEffectiveDomains } from '../mission-action-policy'

describe('resolveMissionEffectiveDomains', () => {
  it('allows managed marketing employees to generate media from their role defaults', () => {
    const domains = resolveMissionEffectiveDomains(
      {
        agent_key: 'lux',
        role: 'Creative Director & Visual Designer',
        level: 'employee',
        config: {
          capability_domain: 'marketing',
          capability_profile: 'managed_domain',
        },
      },
      'lux',
      [],
      [],
      [],
    )

    expect(domains.has('generate_media')).toBe(true)
  })

  it('keeps role defaults when team grants add another domain', () => {
    const domains = resolveMissionEffectiveDomains(
      {
        agent_key: 'lux',
        role: 'Creative Director & Visual Designer',
        level: 'employee',
        config: {
          capability_domain: 'marketing',
          capability_profile: 'managed_domain',
        },
      },
      'lux',
      ['edit_campaign'],
      [],
      [],
    )

    expect(domains.has('generate_media')).toBe(true)
    expect(domains.has('edit_campaign')).toBe(true)
  })

  it('lets an explicit agent deny override the role default', () => {
    const domains = resolveMissionEffectiveDomains(
      {
        agent_key: 'lux',
        role: 'Creative Director & Visual Designer',
        level: 'employee',
        config: {
          capability_domain: 'marketing',
          capability_profile: 'managed_domain',
        },
      },
      'lux',
      [],
      [],
      ['generate_media'],
    )

    expect(domains.has('generate_media')).toBe(false)
  })
})
