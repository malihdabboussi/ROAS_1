import type { ReactNode } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TeamAnalyticsView } from './TeamAnalyticsView'

const mocks = vi.hoisted(() => ({
  getTeamSpending: vi.fn(),
  getAgentSpending: vi.fn(),
  getHumanSpending: vi.fn(),
}))

vi.mock('@/lib/agents', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/agents')>()
  return {
    ...actual,
    getTeamSpending: mocks.getTeamSpending,
  }
})

vi.mock('@/lib/billing/billing-api', () => ({
  getAgentSpending: mocks.getAgentSpending,
}))

vi.mock('@/lib/org', () => ({
  getOrgHumanSpending: mocks.getHumanSpending,
}))

vi.mock('recharts', () => ({
  Area: () => <div data-testid="area" />,
  AreaChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
}))

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  ChartTooltip: () => <div data-testid="chart-tooltip" />,
  ChartTooltipContent: () => <div data-testid="chart-tooltip-content" />,
}))

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('TeamAnalyticsView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-23T12:00:00.000Z'))
    mocks.getTeamSpending.mockResolvedValue({
      totals: { credits: 25, costUsd: 12.5, eventCount: 5 },
      previousTotals: { credits: 10, costUsd: 10, eventCount: 2 },
      daily: [{ day: '2026-06-22', credits: 25, costUsd: 12.5, eventCount: 5 }],
    })
    mocks.getAgentSpending.mockResolvedValue({
      agents: [
        {
          agentKey: 'agent-1',
          agentName: 'Atlas',
          credits: 7,
          costUsd: 3.25,
          eventCount: 2,
        },
      ],
    })
    mocks.getHumanSpending.mockResolvedValue({
      humans: [
        {
          userId: 'user-1',
          credits: 9,
          costUsd: 4.75,
          computedCost: 4.75,
          eventCount: 3,
          lastActiveAt: '2026-06-23T11:30:00.000Z',
        },
      ],
    })
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('loads spend tables for the selected range without render churn', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      render(
        <TeamAnalyticsView
          teamId="team-1"
          rangeConfig={{ time_range: '7d' }}
          campaignFilterIds={['campaign-1']}
          members={[
            {
              id: 'agent-row-1',
              user_id: 'owner-1',
              agent_key: 'agent-1',
              name: 'Atlas',
              role: 'Research',
              status: 'online',
              skills: [],
              image_url: null,
              config: { last_active: '2026-06-23T11:45:00.000Z' },
              created_at: '2026-06-01T00:00:00.000Z',
              updated_at: '2026-06-23T11:45:00.000Z',
            },
          ]}
          missions={[
            {
              id: 'mission-1',
              user_id: 'owner-1',
              parent_mission_id: null,
              campaign_id: 'campaign-1',
              title: 'Mission',
              brief: null,
              description: null,
              status: 'done',
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
              created_at: '2026-06-01T00:00:00.000Z',
              updated_at: '2026-06-20T00:00:00.000Z',
              started_at: null,
              completed_at: '2026-06-20T00:00:00.000Z',
            },
          ]}
          humanMembers={[
            {
              team_id: 'team-1',
              user_id: 'user-1',
              added_at: '2026-06-01T00:00:00.000Z',
              added_by: null,
              role: 'Owner',
              full_name: 'Sefy',
              avatar_url: null,
              email: 'sefy@example.com',
            },
          ]}
          orgId="org-1"
        />,
      )

      await flushAsyncWork()

      expect(mocks.getTeamSpending).toHaveBeenCalledWith(
        'team-1',
        '2026-06-16T00:00:00.000Z',
        '2026-06-23T12:00:00.000Z',
        ['campaign-1'],
      )
      expect(mocks.getAgentSpending).toHaveBeenCalledWith({
        startDate: '2026-06-16T00:00:00.000Z',
        endDate: '2026-06-23T12:00:00.000Z',
        campaignIds: ['campaign-1'],
      })
      expect(mocks.getHumanSpending).toHaveBeenCalledWith(
        'org-1',
        '2026-06-16T00:00:00.000Z',
        '2026-06-23T12:00:00.000Z',
        ['campaign-1'],
      )
      expect(mocks.getTeamSpending).toHaveBeenCalledTimes(1)
      expect(mocks.getAgentSpending).toHaveBeenCalledTimes(1)
      expect(mocks.getHumanSpending).toHaveBeenCalledTimes(1)
      expect(screen.getAllByText('$12.50')).toHaveLength(3)
      expect(screen.getByText('Atlas')).toBeTruthy()
      expect(screen.getByText('Sefy')).toBeTruthy()
      expect(screen.getByText('$3.25')).toBeTruthy()
      expect(screen.getByText('$4.75')).toBeTruthy()

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
    } finally {
      consoleError.mockRestore()
    }
  })
})
