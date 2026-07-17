import { describe, expect, it } from 'vitest'
import {
  defaultHubMenuExpandedSections,
  hubSectionFromPathname,
  toggleHubMenuSection,
} from './sidebar-hq-hub-menu.utils'

describe('sidebar-hq-hub-menu.utils', () => {
  it('maps route prefixes to hub sections', () => {
    expect(hubSectionFromPathname('/team/skills')).toBe('team')
    expect(hubSectionFromPathname('/spaces/abc')).toBe('spaces')
    expect(hubSectionFromPathname('/campaigns')).toBe('spaces')
    expect(hubSectionFromPathname('/campaigns/abc')).toBe('spaces')
    expect(hubSectionFromPathname('/brain')).toBe('brain')
    expect(hubSectionFromPathname('/projects/1')).toBe('projects')
    expect(hubSectionFromPathname('/home')).toBeNull()
  })

  it('opens Team, Spaces, and Brain by default and keeps Projects closed unless routed there', () => {
    const onHome = defaultHubMenuExpandedSections('/home')
    expect([...onHome].sort()).toEqual(['brain', 'spaces', 'team'])

    const onProjects = defaultHubMenuExpandedSections('/projects/1')
    expect([...onProjects].sort()).toEqual(['brain', 'projects', 'spaces', 'team'])
  })

  it('toggles a section in the expanded set', () => {
    const next = toggleHubMenuSection(new Set(['team']), 'spaces')
    expect(next.has('team')).toBe(true)
    expect(next.has('spaces')).toBe(true)
    expect(toggleHubMenuSection(next, 'team').has('team')).toBe(false)
  })
})
