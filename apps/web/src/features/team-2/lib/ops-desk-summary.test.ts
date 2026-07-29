import { describe, expect, it } from 'vitest'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import type { Mission } from '@/lib/missions'
import { buildTeamOpsAwarenessContext } from './build-team-ops-awareness-context'
import {
  buildOpsDeskSummary,
  firstNameFromDisplayName,
  resolveAgentFocusLabel,
} from './ops-desk-summary'

function agent(partial: Partial<MissionAgent> & Pick<MissionAgent, 'agent_key' | 'name'>): MissionAgent {
  return {
    id: partial.id ?? partial.agent_key,
    user_id: 'u1',
    status: 'idle',
    skills: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    is_active: true,
    role: 'Worker',
    ...partial,
  }
}

function mission(partial: Partial<Mission> & Pick<Mission, 'id' | 'title' | 'status'>): Mission {
  return {
    user_id: 'u1',
    parent_mission_id: null,
    campaign_id: 'c1',
    brief: null,
    description: null,
    priority: 'medium',
    assigned_agent_key: null,
    current_agent_key: null,
    progress_notes: null,
    plan_id: null,
    correlation_id: 'corr',
    idempotency_key: 'idemp',
    retry_count: 0,
    input: {},
    output: {},
    error: null,
    scheduled_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    started_at: null,
    completed_at: null,
    ...partial,
  }
}

describe('ops-desk-summary', () => {
  it('resolves current mission focus before assigned', () => {
    const lux = agent({ agent_key: 'lux', name: 'Lux', status: 'working' })
    const missions = [
      mission({
        id: 'm-assigned',
        title: 'Assigned only',
        status: 'in_progress',
        assigned_agent_key: 'lux',
        updated_at: '2026-01-03T00:00:00Z',
      }),
      mission({
        id: 'm-current',
        title: 'Current focus',
        status: 'in_progress',
        current_agent_key: 'lux',
        updated_at: '2026-01-02T00:00:00Z',
      }),
    ]
    expect(resolveAgentFocusLabel(lux, missions)).toMatchObject({
      kind: 'mission',
      label: 'Current focus',
      missionId: 'm-current',
    })
  })

  it('builds summary counts and idle candidates excluding vibey', () => {
    const agents = [
      agent({ agent_key: 'vibey', name: 'Pixel', status: 'online' }),
      agent({ agent_key: 'lux', name: 'Lux', status: 'working' }),
      agent({ agent_key: 'copy', name: 'Copy', status: 'idle' }),
    ]
    const missions = [
      mission({
        id: 'm1',
        title: 'Q3 offer brief',
        status: 'in_progress',
        current_agent_key: 'lux',
      }),
    ]
    const summary = buildOpsDeskSummary(agents, missions)
    expect(summary.statusCounts.working).toBe(1)
    expect(summary.statusCounts.idle).toBe(1)
    expect(summary.liveFocus[0]?.label).toBe('Q3 offer brief')
    expect(summary.workingAgents.map((a) => a.agentKey)).toEqual(['lux'])
    expect(summary.idleAgents.map((a) => a.agentKey)).toEqual(['copy'])
  })

  it('lists presence-working agents even when they have no mission', () => {
    const agents = [
      agent({ agent_key: 'lux', name: 'Lux', status: 'working' }),
      agent({ agent_key: 'copy', name: 'Copy', status: 'idle' }),
    ]
    const summary = buildOpsDeskSummary(agents, [])
    expect(summary.statusCounts.working).toBe(1)
    expect(summary.liveFocus).toEqual([
      expect.objectContaining({
        agentKey: 'lux',
        kind: 'working',
        label: 'Working now',
      }),
    ])
    expect(summary.workingAgents).toHaveLength(1)
  })

  it('extracts first name', () => {
    expect(firstNameFromDisplayName('Dylan Van As', 'there')).toBe('Dylan')
    expect(firstNameFromDisplayName('', 'there')).toBe('there')
  })
})

describe('buildTeamOpsAwarenessContext', () => {
  it('includes campaign ask rule and idle agents', () => {
    const agents = [
      agent({ agent_key: 'lux', name: 'Lux', status: 'idle' }),
      agent({ agent_key: 'copy', name: 'Copy', status: 'idle' }),
    ]
    const text = buildTeamOpsAwarenessContext({
      agents,
      missions: [],
      firstName: 'Dylan',
    })
    expect(text).toContain('User first name: Dylan')
    expect(text).toContain('ask which campaign')
    expect(text).toContain('Never silently default to General')
    expect(text).toContain('Lux /lux')
    expect(text).toContain('create_mission')
  })
})
