import { beforeEach, describe, expect, it, vi } from 'vitest'
import { openInNewTab, withActiveOrgParam, withOrgParam } from '../open-in-new-tab'
import { ACTIVE_ORG_STORAGE_KEY } from '../org-storage'

describe('open in new tab org context', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('appends active org to relative app URLs', () => {
    sessionStorage.setItem(
      ACTIVE_ORG_STORAGE_KEY,
      JSON.stringify({ state: { activeOrgId: 'org-123' } }),
    )

    expect(withActiveOrgParam('/team?agent=vibey')).toBe('/team?agent=vibey&org=org-123')
  })

  it('replaces stale org params on same-origin URLs', () => {
    sessionStorage.setItem(
      ACTIVE_ORG_STORAGE_KEY,
      JSON.stringify({ state: { activeOrgId: 'org-456' } }),
    )

    expect(withActiveOrgParam('/spaces?space=s1&org=old#item')).toBe(
      '/spaces?space=s1&org=org-456#item',
    )
  })

  it('does not append org to external URLs', () => {
    sessionStorage.setItem(
      ACTIVE_ORG_STORAGE_KEY,
      JSON.stringify({ state: { activeOrgId: 'org-123' } }),
    )

    expect(withActiveOrgParam('https://example.com/path')).toBe('https://example.com/path')
  })

  it('can scope rendered app link hrefs with an explicit org', () => {
    expect(withOrgParam('/team', 'org-789')).toBe('/team?org=org-789')
    expect(withOrgParam('/team/skills?tab=agents#top', 'org-789')).toBe(
      '/team/skills?tab=agents&org=org-789#top',
    )
  })

  it('opens with noopener noreferrer', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    sessionStorage.setItem(
      ACTIVE_ORG_STORAGE_KEY,
      JSON.stringify({ state: { activeOrgId: 'org-123' } }),
    )

    openInNewTab('/brain?scope=agent%3Avibey')

    expect(open).toHaveBeenCalledWith(
      '/brain?scope=agent%3Avibey&org=org-123',
      '_blank',
      'noopener,noreferrer',
    )
  })
})
