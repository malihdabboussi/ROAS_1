import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import type { Mission } from '@/lib/missions'
import {
  activeMissionsForAgents,
  computeAgentStatusCounts,
  computePerAgentMetrics,
  computeTeamMissionStats,
  recentActivityForAgents,
} from './agent-team-metrics'

function agentFixture(overrides: Partial<MissionAgent>): MissionAgent {
  return {
    id: 'agent-1',
    user_id: 'user-1',
    agent_key: 'agent-1',
    name: 'Agent One',
    role: 'Employee',
    status: 'online',
    skills: [],
    level: 'employee',
    specialty: null,
    image_url: null,
    is_active: true,
    team_id: null,
    config: {},
    created_at: '2026-06-01T10:00:00.000Z',
    updated_at: '2026-06-20T10:00:00.000Z',
    ...overrides,
  }
}

function missionFixture(overrides: Partial<Mission>): Mission {
  return {
    id: 'mission-1',
    user_id: 'user-1',
    parent_mission_id: null,
    campaign_id: null,
    title: 'Mission',
    brief: null,
    description: null,
    status: 'todo',
    priority: 'medium',
    assigned_agent_key: 'agent-1',
    current_agent_key: null,
    progress_notes: null,
    plan_id: null,
    correlation_id: 'correlation-1',
    idempotency_key: 'idempotency-1',
    retry_count: 0,
    input: {},
    output: {},
    error: null,
    scheduled_at: null,
    created_at: '2026-06-01T10:00:00.000Z',
    updated_at: '2026-06-01T10:00:00.000Z',
    started_at: null,
    completed_at: null,
    ...overrides,
  }
}

describe('agent team metrics', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-22T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('aggregates mission status and completion metrics for selected agents', () => {
    const missions = [
      missionFixture({ id: 'todo', status: 'todo' }),
      missionFixture({ id: 'active', status: 'in_progress', current_agent_key: 'agent-1' }),
      missionFixture({ id: 'blocked', status: 'blocked' }),
      missionFixture({
        id: 'done',
        status: 'done',
        completed_at: '2026-06-20T10:00:00.000Z',
        subtask_total: 4,
        subtask_done: 3,
      }),
      missionFixture({
        id: 'failed',
        status: 'failed',
        completed_at: '2026-06-02T10:00:00.000Z',
        subtask_total: 2,
        subtask_done: 1,
      }),
      missionFixture({ id: 'other-agent', assigned_agent_key: 'other', status: 'done' }),
    ]

    expect(computeTeamMissionStats(missions, new Set(['agent-1']))).toMatchObject({
      total: 5,
      todo: 1,
      active: 1,
      blocked: 1,
      completed: 1,
      failed: 1,
      successRate: 50,
      avgCompletionRate: 63,
      completedThisWeek: 1,
      completedThisMonth: 1,
    })
  })

  it('sorts active, recent, and per-agent metrics consistently', () => {
    const agentOne = agentFixture({
      id: 'agent-1',
      agent_key: 'agent-1',
      config: { last_active: '2026-06-21T10:00:00.000Z' },
    })
    const agentTwo = agentFixture({
      id: 'agent-2',
      agent_key: 'agent-2',
      status: 'working',
      stats: { last_scored_at: '2026-06-19T10:00:00.000Z' },
    })
    const missions = [
      missionFixture({
        id: 'agent-1-blocked',
        status: 'blocked',
        updated_at: '2026-06-20T10:00:00.000Z',
      }),
      missionFixture({
        id: 'agent-2-active',
        assigned_agent_key: 'agent-2',
        status: 'review',
        updated_at: '2026-06-21T10:00:00.000Z',
      }),
      missionFixture({
        id: 'agent-2-done',
        assigned_agent_key: 'agent-2',
        status: 'done',
        completed_at: '2026-06-21T11:00:00.000Z',
        updated_at: '2026-06-21T11:00:00.000Z',
      }),
    ]

    expect(computeAgentStatusCounts([agentOne, agentTwo])).toEqual({
      online: 1,
      working: 1,
      idle: 0,
      offline: 0,
    })
    expect(activeMissionsForAgents(missions, new Set(['agent-1', 'agent-2'])).map((m) => m.id)).toEqual(
      ['agent-2-active', 'agent-1-blocked'],
    )
    expect(recentActivityForAgents(missions, new Set(['agent-2'])).map((m) => m.id)).toEqual([
      'agent-2-done',
    ])
    expect(computePerAgentMetrics([agentOne, agentTwo], missions).map((row) => row.agent.id)).toEqual(
      ['agent-2', 'agent-1'],
    )
  })
})
