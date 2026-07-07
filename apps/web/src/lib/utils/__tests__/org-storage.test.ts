import { beforeEach, describe, expect, it } from 'vitest'
import {
  ACTIVE_ORG_STORAGE_KEY,
  activeOrgSessionStorage,
  getActiveOrgIdFromStorage,
  getOrgScopedKey,
} from '../org-storage'

describe('Org storage key scoping', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('returns base:orgId when activeOrgId exists', () => {
    sessionStorage.setItem(
      ACTIVE_ORG_STORAGE_KEY,
      JSON.stringify({ state: { activeOrgId: 'org-123' } }),
    )
    expect(getOrgScopedKey('vibey-campaign-mode')).toBe('vibey-campaign-mode:org-123')
  })

  it('returns base key when activeOrgId is missing', () => {
    sessionStorage.setItem(ACTIVE_ORG_STORAGE_KEY, JSON.stringify({ state: {} }))
    expect(getOrgScopedKey('vibey-campaign-mode')).toBe('vibey-campaign-mode')
  })

  it('handles malformed payload safely', () => {
    sessionStorage.setItem(ACTIVE_ORG_STORAGE_KEY, '{bad json')
    expect(getOrgScopedKey('vibey-campaign-mode')).toBe('vibey-campaign-mode')
  })

  it('reads from session storage only', () => {
    localStorage.setItem(
      ACTIVE_ORG_STORAGE_KEY,
      JSON.stringify({ state: { activeOrgId: 'org-legacy' } }),
    )
    sessionStorage.setItem(
      ACTIVE_ORG_STORAGE_KEY,
      JSON.stringify({ state: { activeOrgId: 'org-tab' } }),
    )

    expect(getActiveOrgIdFromStorage()).toBe('org-tab')
  })

  it('ignores legacy local storage entries', () => {
    localStorage.setItem(
      ACTIVE_ORG_STORAGE_KEY,
      JSON.stringify({ state: { activeOrgId: 'org-legacy' } }),
    )

    expect(getActiveOrgIdFromStorage()).toBeNull()
  })

  it('writes active org persistence to session storage only', () => {
    activeOrgSessionStorage.setItem(
      ACTIVE_ORG_STORAGE_KEY,
      JSON.stringify({ state: { activeOrgId: 'org-tab' } }),
    )

    expect(sessionStorage.getItem(ACTIVE_ORG_STORAGE_KEY)).not.toBeNull()
    expect(localStorage.getItem(ACTIVE_ORG_STORAGE_KEY)).toBeNull()
  })
})
