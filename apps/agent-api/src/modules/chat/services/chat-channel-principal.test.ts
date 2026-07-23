import { describe, expect, it } from 'vitest'
import { applyChannelPrincipalBrainPolicy } from './chat-channel-principal'

describe('applyChannelPrincipalBrainPolicy', () => {
  it('removes personal Brain access for an internal Slack teammate', () => {
    expect(
      applyChannelPrincipalBrainPolicy({
        source: 'slack',
        policyAllowsPersonalBrain: true,
        channelUser: {
          platform_id: 'U_TEAM',
          display_name: 'Team Member',
          relationship_kind: 'internal',
          is_connection_owner: false,
          personal_brain_access: false,
        },
      }),
    ).toBe(false)
  })

  it('preserves owner personal Brain access', () => {
    expect(
      applyChannelPrincipalBrainPolicy({
        source: 'slack',
        policyAllowsPersonalBrain: true,
        channelUser: {
          platform_id: 'U_OWNER',
          display_name: 'Owner',
          relationship_kind: 'internal',
          is_connection_owner: true,
          personal_brain_access: true,
        },
      }),
    ).toBe(true)
  })

  it('does not change Studio policy behavior', () => {
    expect(
      applyChannelPrincipalBrainPolicy({
        source: 'studio',
        policyAllowsPersonalBrain: true,
      }),
    ).toBe(true)
  })
})
