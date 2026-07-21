import { describe, expect, it } from 'vitest'
import type { AgentTeam } from '@/lib/agents'
import { formatTeamRosterSummary, groupTeams, teamPeopleCount } from './teams-index.utils'

function team(overrides: Partial<AgentTeam>): AgentTeam {
  return {
    id: 'team-1',
    org_id: 'org-1',
    user_id: null,
    parent_team_id: null,
    name: 'Team',
    color: 'default',
    icon: 'users',
    is_system: false,
    team_kind: 'mixed',
    created_at: '2026-07-20T00:00:00.000Z',
    updated_at: '2026-07-20T00:00:00.000Z',
    ...overrides,
  }
}

describe('team type grouping', () => {
  it('groups teams by explicit Internal, External, Agent, and Mixed types', () => {
    const groups = groupTeams(
      [
        team({ id: 'internal', name: 'Internal', team_kind: 'internal' }),
        team({ id: 'external', name: 'External', team_kind: 'external' }),
        team({ id: 'agent', name: 'Agency Agents', team_kind: 'agent' }),
        team({ id: 'mixed', name: 'Legacy', team_kind: 'mixed' }),
      ],
      'type',
      'asc',
    )

    expect(groups?.map((group) => group.label)).toEqual([
      'Internal teams',
      'External teams',
      'Agent teams',
      'Mixed teams',
    ])
  })

  it('includes external people in team people totals and summaries', () => {
    const external = team({
      team_kind: 'external',
      user_member_count: 0,
      external_member_count: 4,
    })

    expect(teamPeopleCount(external)).toBe(4)
    expect(formatTeamRosterSummary(external)).toBe('4 people')
  })
})
