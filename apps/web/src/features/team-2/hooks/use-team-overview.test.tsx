import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { Profiler } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  emptyTeamOverviewPayload,
  type TeamOverviewPayload,
} from '../services/team-overview.service'
import { useTeamOverview } from './use-team-overview'

const RANGE = {
  start: '2026-06-01T00:00:00.000Z',
  end: '2026-06-24T00:00:00.000Z',
}

type RealtimePayload = {
  new?: Record<string, unknown>
  old?: Record<string, unknown>
}

type RealtimeHandler = (payload: RealtimePayload) => void

type ChannelMock = {
  on: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
}

const mocks = vi.hoisted(() => ({
  activeOrgId: 'org-1',
  channel: vi.fn(),
  fetchTeamOverview: vi.fn(),
  getUser: vi.fn(),
  handlers: new Map<string, RealtimeHandler>(),
  lastChannel: null as ChannelMock | null,
  removeChannel: vi.fn(),
}))

vi.mock('@/lib/org', () => ({
  useOrgStore: (selector: (state: { activeOrgId: string }) => unknown) =>
    selector({ activeOrgId: mocks.activeOrgId }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: mocks.getUser },
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  }),
}))

vi.mock('../services/team-overview.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/team-overview.service')>()
  return {
    ...actual,
    fetchTeamOverview: mocks.fetchTeamOverview,
  }
})

function createChannelMock(): ChannelMock {
  const channel: ChannelMock = {
    on: vi.fn((_event, config: { table?: string }, handler: RealtimeHandler) => {
      if (config.table) mocks.handlers.set(config.table, handler)
      return channel
    }),
    subscribe: vi.fn(() => channel),
  }
  return channel
}

function buildPayload(teamId = 'team-1'): TeamOverviewPayload {
  const data = emptyTeamOverviewPayload(teamId)
  return {
    ...data,
    generated_at: '2026-06-24T10:00:00.000Z',
    window: {
      start: RANGE.start,
      end: RANGE.end,
      prev_start: '2026-05-08T00:00:00.000Z',
      prev_end: '2026-05-31T23:59:59.999Z',
    },
    agents: [
      {
        id: 'agent-row-1',
        agent_key: 'agent-1',
        name: 'Atlas',
        role: 'Research',
        status: 'working',
        image_url: null,
        updated_at: '2026-06-24T09:50:00.000Z',
      },
    ],
    kpis: {
      agents_by_status: { working: 1 },
      missions: {
        active: 1,
        blocked: 0,
        todo: 0,
        completed: 2,
        failed: 0,
      },
      window: {
        completed: 2,
        failed: 0,
        avg_duration_minutes: 24,
        prev_completed: 1,
        prev_failed: 0,
      },
    },
  }
}

function OverviewHarness({ teamId = 'team-1' }: { teamId?: string }) {
  const result = useTeamOverview(teamId, RANGE)

  return (
    <div>
      <div data-testid="loading">{String(result.loading)}</div>
      <div data-testid="error">{result.error ?? ''}</div>
      <div data-testid="agents">
        {result.data.agents.map((agent) => `${agent.agent_key}:${agent.status}`).join(',')}
      </div>
      <div data-testid="live-missions">
        {result.data.live.missions.map((mission) => `${mission.title}:${mission.status}`).join(',')}
      </div>
      <div data-testid="recent-missions">
        {result.data.recent.missions
          .map((mission) => `${mission.title}:${mission.status}`)
          .join(',')}
      </div>
    </div>
  )
}

describe('useTeamOverview', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-06-24T10:00:00.000Z'))
    mocks.activeOrgId = 'org-1'
    mocks.handlers.clear()
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mocks.fetchTeamOverview.mockResolvedValue(buildPayload())
    mocks.channel.mockImplementation(() => {
      mocks.lastChannel = createChannelMock()
      return mocks.lastChannel
    })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.clearAllMocks()
    mocks.handlers.clear()
    mocks.lastChannel = null
  })

  it('loads overview, applies realtime deltas, and stays render-stable', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let commits = 0

    try {
      render(
        <Profiler id="team-overview-hook" onRender={() => commits++}>
          <OverviewHarness />
        </Profiler>,
      )

      await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'))
      await waitFor(() => expect(mocks.handlers.has('missions')).toBe(true))

      expect(mocks.fetchTeamOverview).toHaveBeenCalledWith('team-1', RANGE)
      expect(mocks.channel).toHaveBeenCalledWith('team-overview:team-1:org-1')
      expect(screen.getByTestId('agents').textContent).toBe('agent-1:working')

      await act(async () => {
        mocks.handlers.get('missions')?.({
          new: {
            id: 'mission-live-1',
            title: 'Launch plan',
            status: 'in_progress',
            current_agent_key: 'agent-1',
            updated_at: '2026-06-24T09:59:00.000Z',
          },
        })
      })
      expect(screen.getByTestId('live-missions').textContent).toContain(
        'Launch plan:in_progress',
      )

      await act(async () => {
        mocks.handlers.get('missions')?.({
          new: {
            id: 'mission-live-1',
            title: 'Launch plan',
            status: 'done',
            current_agent_key: 'agent-1',
            completed_at: '2026-06-24T10:01:00.000Z',
          },
        })
      })
      expect(screen.getByTestId('live-missions').textContent).not.toContain('Launch plan')
      expect(screen.getByTestId('recent-missions').textContent).toContain('Launch plan:done')

      await act(async () => {
        mocks.handlers.get('agents_registry')?.({
          new: {
            id: 'agent-row-1',
            team_id: 'team-1',
            agent_key: 'agent-1',
            name: 'Atlas',
            role: 'Research',
            status: 'offline',
            updated_at: '2026-06-24T10:02:00.000Z',
          },
        })
      })
      expect(screen.getByTestId('agents').textContent).toBe('agent-1:offline')

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(commits).toBeLessThan(20)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('removes the realtime channel on unmount', async () => {
    const { unmount } = render(<OverviewHarness />)

    await waitFor(() => expect(mocks.lastChannel).not.toBeNull())
    unmount()

    expect(mocks.removeChannel).toHaveBeenCalledWith(mocks.lastChannel)
  })
})
