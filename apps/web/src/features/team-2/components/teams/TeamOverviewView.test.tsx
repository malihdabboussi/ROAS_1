import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyTeamOverviewPayload, type TeamOverviewPayload } from '../../services/team-overview.service'
import { TeamOverviewView } from './TeamOverviewView'

const mocks = vi.hoisted(() => ({
  useTeamOverview: vi.fn(),
  fetchMissionById: vi.fn(),
}))

vi.mock('../../hooks/use-team-overview', () => ({
  useTeamOverview: mocks.useTeamOverview,
}))

vi.mock('@/lib/org', () => ({
  useOrgStore: (selector: (state: { activeOrgId: string }) => unknown) =>
    selector({ activeOrgId: 'org-1' }),
}))

vi.mock('@/lib/missions', () => ({
  fetchMissionById: mocks.fetchMissionById,
}))

vi.mock('@/components/missions/MissionDetailModalAdapter', () => ({
  MissionDetailModal: ({ mission }: { mission: { title: string } }) => (
    <div data-testid="mission-detail-modal">{mission.title}</div>
  ),
}))

vi.mock('./TeamOverviewChatModal', () => ({
  TeamOverviewChatModal: ({
    conversationId,
    conversationTitle,
  }: {
    conversationId: string
    conversationTitle: string
  }) => (
    <div data-testid="team-overview-chat-modal">
      {conversationId}:{conversationTitle}
    </div>
  ),
}))

vi.mock('recharts', () => ({
  Area: () => <div data-testid="area" />,
  AreaChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  BarChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Cell: () => <div data-testid="cell" />,
  Pie: ({ children }: { children: ReactNode }) => <div data-testid="pie">{children}</div>,
  PieChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Rectangle: () => <div data-testid="rectangle" />,
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

function buildPayload(): TeamOverviewPayload {
  const data = emptyTeamOverviewPayload('team-1')
  return {
    ...data,
    generated_at: '2026-06-23T12:00:00.000Z',
    window: {
      start: '2026-06-15T00:00:00.000Z',
      end: '2026-06-23T12:00:00.000Z',
      prev_start: '2026-06-07T00:00:00.000Z',
      prev_end: '2026-06-14T23:59:59.999Z',
    },
    agents: [
      {
        id: 'agent-row-1',
        agent_key: 'agent-1',
        name: 'Atlas',
        role: 'Research',
        status: 'working',
        image_url: null,
        updated_at: '2026-06-23T11:50:00.000Z',
      },
    ],
    kpis: {
      agents_by_status: { working: 1 },
      missions: {
        active: 1,
        blocked: 0,
        todo: 2,
        completed: 4,
        failed: 1,
      },
      window: {
        completed: 4,
        failed: 1,
        avg_duration_minutes: 35,
        prev_completed: 2,
        prev_failed: 0,
      },
    },
    series: {
      missions_completed_daily: [{ day: '2026-06-22', n: 4 }],
      missions_failed_daily: [{ day: '2026-06-22', n: 1 }],
      chats_daily: [{ day: '2026-06-22', n: 3 }],
      channel_posts_daily: [{ day: '2026-06-22', n: 2 }],
      automations_daily: [{ day: '2026-06-22', n: 1 }],
    },
    per_agent: [
      {
        agent_key: 'agent-1',
        completed: 4,
        failed: 1,
        live_active: 1,
        live_blocked: 0,
      },
    ],
    coverage: {
      by_campaign: [{ id: 'campaign-1', name: 'Launch campaign', completed: 4 }],
      by_channel: [{ id: 'channel-1', name: 'launch', posts: 2 }],
    },
    live: {
      missions: [
        {
          kind: 'mission',
          id: 'mission-live',
          title: 'Live launch mission',
          status: 'in_progress',
          current_agent_key: 'agent-1',
          assigned_agent_key: null,
          happened_at: '2026-06-23T11:45:00.000Z',
        },
      ],
      tasks: [],
      traces: [],
      delegations: [],
    },
    recent: {
      missions: [
        {
          kind: 'mission',
          id: 'mission-1',
          title: 'Finished launch mission',
          status: 'done',
          current_agent_key: null,
          assigned_agent_key: 'agent-1',
          happened_at: '2026-06-22T18:00:00.000Z',
        },
      ],
      chats: [
        {
          kind: 'chat',
          id: 'conversation-1',
          conversation_title: 'Product chat',
          agent_key: 'agent-1',
          reply_count: 2,
          happened_at: '2026-06-22T17:00:00.000Z',
        },
      ],
      channel: [],
      automations: [],
    },
  }
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('TeamOverviewView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-23T12:00:00.000Z'))
    mocks.useTeamOverview.mockReturnValue({
      data: buildPayload(),
      loading: false,
      error: null,
    })
    mocks.fetchMissionById.mockResolvedValue({
      id: 'mission-1',
      user_id: 'user-1',
      parent_mission_id: null,
      campaign_id: 'campaign-1',
      title: 'Finished launch mission',
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
      created_at: '2026-06-20T00:00:00.000Z',
      updated_at: '2026-06-22T18:00:00.000Z',
      started_at: null,
      completed_at: '2026-06-22T18:00:00.000Z',
    })
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('renders overview activity and opens mission/chat details without render churn', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      render(
        <TeamOverviewView
          teamId="team-1"
          rangeConfig={{ time_range: '7d' }}
          campaignFilterIds={[]}
          spaceFilterIds={[]}
          missionCampaignById={
            new Map([
              ['mission-live', 'campaign-1'],
              ['mission-1', 'campaign-1'],
            ])
          }
        />,
      )

      expect(mocks.useTeamOverview).toHaveBeenCalledWith('team-1', {
        start: '2026-06-15T00:00:00.000Z',
        end: '2026-06-23T12:00:00.000Z',
      })
      expect(screen.getByText('Active right now')).toBeTruthy()
      expect(screen.getByText('Live launch mission')).toBeTruthy()
      expect(screen.getByText('Finished launch mission')).toBeTruthy()
      expect(screen.getByText('Product chat')).toBeTruthy()
      expect(screen.getByText('Launch campaign')).toBeTruthy()
      expect(screen.getByText('#launch')).toBeTruthy()

      fireEvent.click(screen.getByText('Finished launch mission'))
      await flushAsyncWork()
      expect(mocks.fetchMissionById).toHaveBeenCalledWith('mission-1', { orgId: 'org-1' })
      expect(screen.getByTestId('mission-detail-modal').textContent).toContain(
        'Finished launch mission',
      )

      fireEvent.click(screen.getByText('Product chat'))
      expect(screen.getByTestId('team-overview-chat-modal').textContent).toContain(
        'conversation-1:Product chat',
      )

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
    } finally {
      consoleError.mockRestore()
    }
  })
})
