import { describe, expect, it } from 'vitest'
import {
  isIntegrationSubActionAllowed,
  type ArtifactCapabilityPolicy,
} from './artifact-capability.policy'
import {
  canonicalizeIntegrationId,
  toAgentFacingIntegrationId,
} from '../../shared/utils/integration-id.util'

describe('SEO Research integration policy', () => {
  const vibey: ArtifactCapabilityPolicy = {
    profile: 'vibey_ceo',
    level: 'system',
    domain: 'management',
  }
  const marketing: ArtifactCapabilityPolicy = {
    profile: 'managed_domain',
    level: 'employee',
    domain: 'marketing',
  }
  const analyst: ArtifactCapabilityPolicy = {
    profile: 'managed_domain',
    level: 'employee',
    domain: 'analyst',
  }
  const developer: ArtifactCapabilityPolicy = {
    profile: 'managed_domain',
    level: 'employee',
    domain: 'developer',
  }
  const operations: ArtifactCapabilityPolicy = {
    profile: 'managed_domain',
    level: 'employee',
    domain: 'operations',
  }

  it('allows Vibey, marketing, and analyst agents', () => {
    for (const policy of [vibey, marketing, analyst]) {
      expect(isIntegrationSubActionAllowed(policy, 'dataforseo', 'google_serp')).toEqual({
        allowed: true,
      })
    }
  })

  it('blocks developer and operations agents', () => {
    for (const policy of [developer, operations]) {
      const result = isIntegrationSubActionAllowed(policy, 'dataforseo', 'google_serp')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('SEO Research')
    }
  })

  it('maps SEO Research aliases to internal DataForSEO id and back to agent-facing id', () => {
    expect(canonicalizeIntegrationId('seo_research')).toBe('dataforseo')
    expect(canonicalizeIntegrationId('seo-research')).toBe('dataforseo')
    expect(canonicalizeIntegrationId('seoresearch')).toBe('dataforseo')
    expect(toAgentFacingIntegrationId('dataforseo')).toBe('seo_research')
  })
})
