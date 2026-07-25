import { describe, expect, it } from 'vitest'
import { programsListCacheKey } from './programs-list-cache'

describe('programsListCacheKey', () => {
  it('scopes memory cache keys by org', () => {
    expect(programsListCacheKey('org-a')).toBe('programs:list:org-a')
    expect(programsListCacheKey(null)).toBe('programs:list:personal')
  })
})
