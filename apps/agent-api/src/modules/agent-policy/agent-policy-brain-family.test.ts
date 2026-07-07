import { describe, expect, it } from 'vitest'
import {
  BRAIN_SEARCH_FAMILY_CAPABILITIES,
  capabilityKey,
  type ResolvedAgentPolicy,
} from './agent-policy.types'

function makePolicy(effectiveKeys: string[]): ResolvedAgentPolicy {
  return {
    agentKey: 'vibey',
    teamId: 'team-1',
    teamName: 'Management',
    grants: [],
    overrides: { allow_extra: [], deny: [] },
    effective: new Set(effectiveKeys),
  }
}

describe('BRAIN_SEARCH_FAMILY_CAPABILITIES', () => {
  it('maps user family to brain_access:personal', () => {
    expect(BRAIN_SEARCH_FAMILY_CAPABILITIES.user).toEqual({
      kind: 'brain_access',
      id: 'personal',
    })
  })

  it('maps non-user families to read_brain action domains', () => {
    expect(BRAIN_SEARCH_FAMILY_CAPABILITIES.agent.id).toBe('read_brain_agent')
    expect(BRAIN_SEARCH_FAMILY_CAPABILITIES.company.id).toBe('read_brain_company')
    expect(BRAIN_SEARCH_FAMILY_CAPABILITIES.customer.id).toBe('read_brain_customer')
  })

  it('allows only families present in effective policy', () => {
    const policy = makePolicy([
      capabilityKey('brain_access', 'personal'),
      capabilityKey('action_domain', 'read_brain_company'),
    ])

    const allowed = (
      Object.keys(BRAIN_SEARCH_FAMILY_CAPABILITIES) as Array<
        keyof typeof BRAIN_SEARCH_FAMILY_CAPABILITIES
      >
    ).filter((family) => {
      const capability = BRAIN_SEARCH_FAMILY_CAPABILITIES[family]
      return policy.effective.has(capabilityKey(capability.kind, capability.id))
    })

    expect(allowed).toEqual(['user', 'company'])
  })
})
