import { beforeEach, describe, expect, it } from 'vitest'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import {
  defaultAgentForSurface,
  filterAgentsForWorkContext,
  isAgentAllowedForWorkContext,
  mergeAttachedWorkContext,
  surfaceFromPathname,
  workContextAttachmentDescription,
  workContextAttachmentLabel,
} from '../config/work-context.config'

describe('work-context.config', () => {
  const roster = [
    { kind: 'agent' as const, agent_key: 'vibey', display_name: 'Pixel' },
    { kind: 'agent' as const, agent_key: 'atlas', display_name: 'Atlas' },
    { kind: 'agent' as const, agent_key: 'hr', display_name: 'Jaime' },
    { kind: 'agent' as const, agent_key: 'loop', display_name: 'Loop' },
  ] as unknown as TeamRosterEntry[]

  it('maps pathnames to surfaces', () => {
    expect(surfaceFromPathname('/spaces/foo')).toBe('spaces')
    expect(surfaceFromPathname('/campaigns')).toBe('spaces')
    expect(surfaceFromPathname('/campaigns/abc')).toBe('spaces')
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
    expect(defaultAgentForSurface('team')).toBe('hr')
    expect(defaultAgentForSurface('flows')).toBe('loop')
    expect(defaultAgentForSurface('general')).toBe('vibey')
  })

  it('validates agent eligibility', () => {
    expect(isAgentAllowedForWorkContext('loop', { surface: 'general' })).toBe(false)
    expect(isAgentAllowedForWorkContext('atlas', { surface: 'brain' })).toBe(true)
    expect(isAgentAllowedForWorkContext('vibey', { surface: 'brain' })).toBe(true)
  })

  it('labels the exact context attached to chat', () => {
    expect(workContextAttachmentLabel({ surface: 'team', teamOpsLabel: 'HR' })).toBe('HR')
    expect(workContextAttachmentLabel({ surface: 'brain', brainScopeLabel: 'Company Brain' })).toBe(
      'Company Brain',
    )
    expect(
      workContextAttachmentLabel({ surface: 'spaces', spaceId: 'space-1' }, 'Client Delivery'),
    ).toBe('Client Delivery')
    expect(workContextAttachmentLabel({ surface: 'flows' })).toBe('Flows')
    expect(
      workContextAttachmentLabel({
        surface: 'general',
        channelId: 'channel-1',
        channelName: 'roas-review',
      }),
    ).toBe('roas-review')
    expect(workContextAttachmentLabel({ surface: 'general' })).toBeNull()
  })

  it('describes exactly what the attached context contributes', () => {
    expect(
      workContextAttachmentDescription(
        { surface: 'team', teamOpsLabel: 'Team' },
        { activeAgentName: 'Nate' },
      ),
    ).toBe(
      'Team is attached as the team context. The chat can use team members, roles, status, and relevant team operations. Nate can use this context while answering.',
    )
    expect(
      workContextAttachmentDescription(
        { surface: 'spaces', spaceId: 'space-1' },
        { spaceTitle: 'Client Delivery', activeAgentName: 'Reed' },
      ),
    ).toBe(
      'Client Delivery is attached as the Space or campaign context. The chat can use its work, artifacts, and campaign knowledge. Reed can use this context while answering.',
    )
    expect(
      workContextAttachmentDescription({
        surface: 'general',
        channelId: 'channel-1',
        channelName: 'roas-review',
      }),
    ).toBe(
      '#roas-review is attached. The chat can use the channel conversation and available Slack context.',
    )
  })

  it('clears stale context when switching or detaching surfaces', () => {
    const teamContext = {
      surface: 'team' as const,
      teamOpsLabel: 'HR',
      teamOpsAwarenessContext: 'Team roster',
    }

    expect(mergeAttachedWorkContext(teamContext, { surface: 'general' })).toEqual({
      surface: 'general',
    })
    expect(
      mergeAttachedWorkContext(
        { surface: 'general', teamOpsLabel: 'Stale HR context' },
        { surface: 'general' },
      ),
    ).toEqual({ surface: 'general' })
    expect(mergeAttachedWorkContext(teamContext, { surface: 'brain' })).toEqual({
      surface: 'brain',
    })
    expect(
      mergeAttachedWorkContext(teamContext, {
        surface: 'team',
        teamOpsAwarenessContext: 'Updated roster',
      }),
    ).toEqual({
      surface: 'team',
      teamOpsLabel: 'HR',
      teamOpsAwarenessContext: 'Updated roster',
    })
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
