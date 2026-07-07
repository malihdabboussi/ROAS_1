import { Profiler, type ReactNode } from 'react'
import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionAgent } from '@/lib/agents'
import type { Mission } from '@/lib/missions'
import { useTeamContainerDerived } from './useTeamContainerDerived'

function agentFixture(overrides: Partial<MissionAgent> = {}): MissionAgent {
  return {
    id: 'agent-1',
    user_id: 'user-1',
    agent_key: 'agent-1',
    name: 'Agent One',
    role: 'Research',
    status: 'working',
    skills: [],
    level: 'manager',
    specialty: null,
    image_url: null,
    is_active: true,
    team_id: null,
    config: {},
    created_at: '2026-06-01T10:00:00.000Z',
    updated_at: '2026-06-23T10:00:00.000Z',
    ...overrides,
  }
}

function missionFixture(overrides: Partial<Mission> = {}): Mission {
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

describe('useTeamContainerDerived', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-24T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('derives selected-agent mission stats, profile labels, and team counts', () => {
    const selected = agentFixture({
      config: {
        style_description: 'Sharp research operator',
        last_active: '2026-06-24T09:55:00.000Z',
      },
      stats: {
        overall: 7,
        missions_scored: 4,
        last_scored_at: '2026-06-24T09:00:00.000Z',
      },
    })
    const agents = [
      selected,
      agentFixture({
        id: 'agent-2',
        agent_key: 'ceo',
        name: 'CEO',
        level: 'c_level',
        status: 'online',
      }),
      agentFixture({
        id: 'agent-3',
        agent_key: 'employee',
        name: 'Employee',
        level: 'employee',
        status: 'idle',
      }),
      agentFixture({
        id: 'agent-4',
        agent_key: 'hr',
        name: 'HR',
        level: 'system',
        status: 'online',
      }),
    ]
    const missions = [
      missionFixture({ id: 'todo', status: 'todo' }),
      missionFixture({ id: 'inbox', status: 'inbox', assigned_agent_key: null, current_agent_key: 'agent-1' }),
      missionFixture({ id: 'planning', status: 'planning' }),
      missionFixture({ id: 'progress', status: 'in_progress' }),
      missionFixture({ id: 'review', status: 'review' }),
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
        completed_at: '2026-06-03T10:00:00.000Z',
        subtask_total: 2,
        subtask_done: 1,
      }),
      missionFixture({ id: 'error', status: 'error' }),
      missionFixture({ id: 'other-agent', assigned_agent_key: 'other-agent', status: 'done' }),
    ]

    let commitCount = 0
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      const { result, rerender } = renderHook(
        ({ currentSelected, currentAgents, currentMissions }) =>
          useTeamContainerDerived(currentSelected, currentAgents, currentMissions),
        {
          initialProps: {
            currentSelected: selected,
            currentAgents: agents,
            currentMissions: missions,
          },
          wrapper: ({ children }: { children: ReactNode }) => (
            <Profiler id="team-container-derived" onRender={() => commitCount++}>
              {children}
            </Profiler>
          ),
        },
      )

      rerender({
        currentSelected: selected,
        currentAgents: agents,
        currentMissions: missions,
      })

      expect(result.current).toMatchObject({
        level: 'manager',
        isSelectedManager: true,
        isSelectedEmployee: false,
        isSystemLikeAgent: false,
        isSelectedRemovable: true,
        bio: 'Sharp research operator',
        statusLabel: 'Working',
        overall: 7,
        overallColor: 'text-status-emerald',
        hasStats: true,
        missionsScored: 4,
        todoCount: 2,
        activeCount: 3,
        blockedCount: 1,
        totalCompleted: 1,
        completedThisMonth: 1,
        successRate: 33,
        avgCompletionRate: 63,
        lastActiveLabel: '5m ago',
        statusBadgeText: 'Working',
        cLevelCount: 1,
        managerCount: 1,
        employeeCount: 1,
        activeMembersCount: 2,
        idleMembersCount: 1,
      })
      expect(result.current.metrics.map((metric) => metric.key)).toEqual([
        'quality',
        'reliability',
        'intent_alignment',
        'craft',
        'originality',
        'brand_coherence',
        'completeness',
      ])
      expect(
        consoleError.mock.calls.filter((call) =>
          call.some((part) => String(part).includes('Maximum update depth')),
        ),
      ).toHaveLength(0)
      expect(commitCount).toBeLessThan(5)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('keeps system-like agents non-removable and falls back to last activity for offline badges', () => {
    const selected = agentFixture({
      agent_key: 'vibey',
      level: 'manager',
      status: 'offline',
      config: {},
      stats: undefined,
      updated_at: '2026-06-23T09:00:00.000Z',
    })

    const { result } = renderHook(() => useTeamContainerDerived(selected, [selected], []))

    expect(result.current).toMatchObject({
      isSelectedManager: true,
      isSystemLikeAgent: true,
      isSelectedRemovable: false,
      statusLabel: 'Offline',
      statusBadgeText: '1d ago',
      hasStats: false,
      successRate: null,
      avgCompletionRate: null,
    })
  })
})
