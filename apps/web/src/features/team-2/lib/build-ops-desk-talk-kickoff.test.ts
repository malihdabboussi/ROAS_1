import { describe, expect, it } from 'vitest'
import { buildOpsDeskTalkKickoffMessage } from './build-ops-desk-talk-kickoff'
import type { OpsDeskSummary } from './ops-desk-summary'

function summary(partial: Partial<OpsDeskSummary> = {}): OpsDeskSummary {
  return {
    statusCounts: { working: 0, idle: 4, online: 0, offline: 0 },
    missionStats: {
      total: 0,
      todo: 0,
      active: 0,
      blocked: 0,
      completed: 0,
      failed: 0,
      successRate: null,
      avgCompletionRate: null,
      completedThisWeek: 0,
      completedThisMonth: 0,
    },
    liveFocus: [],
    workingAgents: [],
    idleAgents: [
      { agentKey: 'nate', agentName: 'Nate' },
      { agentKey: 'atlas', agentName: 'Atlas' },
    ],
    ...partial,
  }
}

describe('buildOpsDeskTalkKickoffMessage', () => {
  it('asks ROAS to open a short Ops Desk check-in', () => {
    const message = buildOpsDeskTalkKickoffMessage({
      firstName: 'Dylan',
      summary: summary(),
    })
    expect(message).toContain('Ops Desk')
    expect(message).toContain('Dylan')
    expect(message).toContain('what I want to focus on')
    expect(message).toContain('0 working')
    expect(message).toContain('Free right now: Nate, Atlas')
  })

  it('includes live focus when agents are working', () => {
    const message = buildOpsDeskTalkKickoffMessage({
      firstName: 'Test',
      summary: summary({
        statusCounts: { working: 1, idle: 3, online: 0, offline: 0 },
        missionStats: {
          total: 1,
          todo: 0,
          active: 1,
          blocked: 0,
          completed: 0,
          failed: 0,
          successRate: null,
          avgCompletionRate: null,
          completedThisWeek: 0,
          completedThisMonth: 0,
        },
        liveFocus: [
          {
            agentKey: 'lux',
            agentName: 'Lux',
            label: 'Q3 offer brief',
            kind: 'mission',
            missionId: 'm1',
          },
        ],
        idleAgents: [],
      }),
    })
    expect(message).toContain('Lux → Q3 offer brief')
    expect(message).not.toContain('Free right now')
  })
})
