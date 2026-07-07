import { beforeEach, describe, expect, it } from 'vitest'
import { ACTIVE_ORG_STORAGE_KEY } from '@/lib/utils/org-storage'
import {
  backendOptionsForHomeFeed,
  homeFeedCacheScopeKey,
  parseHomeFeedScope,
} from './home-feed-scope'

describe('home feed scope helpers', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('falls back to the workspace scope for invalid persisted values', () => {
    expect(parseHomeFeedScope({ feedScope: 'invalid', orgId: 123, campaignId: false })).toEqual({
      feedScope: 'workspace',
      orgId: null,
      campaignId: null,
    })
  })

  it('keeps backend org headers aligned with feed scope semantics', () => {
    expect(backendOptionsForHomeFeed('personal', 'org-1')).toEqual({ orgId: null })
    expect(backendOptionsForHomeFeed('all', 'org-1')).toEqual({ orgId: null })
    expect(backendOptionsForHomeFeed('org', 'org-1')).toEqual({ orgId: 'org-1' })
    expect(backendOptionsForHomeFeed('workspace', 'org-1')).toEqual({})
  })

  it('includes the effective org header in cache keys', () => {
    sessionStorage.setItem(
      ACTIVE_ORG_STORAGE_KEY,
      JSON.stringify({ state: { activeOrgId: 'org-active' } }),
    )

    expect(homeFeedCacheScopeKey('workspace', null)).toBe('workspace::org-active')
    expect(homeFeedCacheScopeKey('org', 'org-explicit')).toBe('org:org-explicit:org-explicit')
    expect(homeFeedCacheScopeKey('personal', 'org-ignored')).toBe('personal:org-ignored:')
  })
})
