import { beforeEach, describe, expect, it } from 'vitest'
import {
  defaultAgentForSurface,
  filterAgentsForWorkContext,
  isAgentAllowedForWorkContext,
  surfaceFromPathname,
} from '../config/work-context.config'

describe('work-context.config', () => {
  const roster = [
    { kind: 'agent' as const, agent_key: 'vibey', display_name: 'ROAS' },
    { kind: 'agent' as const, agent_key: 'atlas', display_name: 'Atlas' },
    { kind: 'agent' as const, agent_key: 'hr', display_name: 'Jaime' },
    { kind: 'agent' as const, agent_key: 'loop', display_name: 'Loop' },
  ]

  it('maps pathnames to surfaces', () => {
    expect(surfaceFromPathname('/spaces/foo')).toBe('spaces')
    expect(surfaceFromPathname('/brain')).toBe('brain')
    expect(surfaceFromPathname('/team')).toBe('team')
    expect(surfaceFromPathname('/flows')).toBe('flows')
    expect(surfaceFromPathname('/home')).toBe('general')
  })

  it('filters agents by work surface', () => {
    expect(
      filterAgentsForWorkContext(roster, { surface: 'brain' }).map((entry) => entry.agent_key),
    ).toEqual(['atlas'])
    expect(
      filterAgentsForWorkContext(roster, { surface: 'flows' }).map((entry) => entry.agent_key),
    ).toEqual(['loop'])
    expect(
      filterAgentsForWorkContext(roster, { surface: 'team' }).map((entry) => entry.agent_key),
    ).toEqual(['vibey', 'hr'])
    expect(
      filterAgentsForWorkContext(roster, { surface: 'general' }).map((entry) => entry.agent_key),
    ).toEqual(['vibey', 'atlas', 'hr'])
  })

  it('picks default agents per surface', () => {
    expect(defaultAgentForSurface('brain')).toBe('atlas')
    expect(defaultAgentForSurface('team')).toBe('vibey')
    expect(defaultAgentForSurface('flows')).toBe('loop')
    expect(defaultAgentForSurface('general')).toBe('vibey')
  })

  it('validates agent eligibility', () => {
    expect(isAgentAllowedForWorkContext('loop', { surface: 'general' })).toBe(false)
    expect(isAgentAllowedForWorkContext('atlas', { surface: 'brain' })).toBe(true)
    expect(isAgentAllowedForWorkContext('vibey', { surface: 'brain' })).toBe(true)
  })
})

describe('global chat storage key', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('persists collapse state', async () => {
    const { readPersistedGlobalChat, writePersistedGlobalChat } =
      await import('../lib/global-chat-storage')
    writePersistedGlobalChat({ collapsed: true, activeAgentKey: 'atlas' })
    expect(readPersistedGlobalChat()).toEqual({ collapsed: true, activeAgentKey: 'atlas' })
  })

  it('persists per-surface recommendation dismissals without duplicates', async () => {
    const { readRecDismissedSurfaces, addRecDismissedSurface } =
      await import('../lib/global-chat-storage')
    expect(readRecDismissedSurfaces()).toEqual([])
    expect(addRecDismissedSurface('brain')).toEqual(['brain'])
    expect(addRecDismissedSurface('brain')).toEqual(['brain'])
    expect(addRecDismissedSurface('team')).toEqual(['brain', 'team'])
    expect(readRecDismissedSurfaces()).toEqual(['brain', 'team'])
  })
})
