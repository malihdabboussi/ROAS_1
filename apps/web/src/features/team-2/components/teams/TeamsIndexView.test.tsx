import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TeamsIndexView } from './TeamsIndexView'

const mocks = vi.hoisted(() => ({
  useTeams: vi.fn(),
  useCachedMissionAgents: vi.fn(),
  createTeam: vi.fn(),
  canCreateTeam: true,
}))

vi.mock('@/lib/agents', () => ({
  useCachedMissionAgents: mocks.useCachedMissionAgents,
  useTeams: mocks.useTeams,
  useTeam2Perms: () => ({
    canCreateTeam: mocks.canCreateTeam,
  }),
}))

function team(overrides: Record<string, unknown> = {}) {
  return {
    id: 'team-growth',
    org_id: 'org-1',
    user_id: null,
    parent_team_id: null,
    name: 'Growth Team',
    color: 'blue',
    icon: 'users',
    is_system: false,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-23T00:00:00.000Z',
    member_count: 5,
    user_member_count: 2,
    grant_count: 3,
    ...overrides,
  }
}

function agent(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `agent-row-${index}`,
    agent_key: `agent-${index}`,
    name: `Agent ${index}`,
    role: 'Research',
    status: 'online',
    image_url: null,
    is_active: true,
    team_id: 'team-growth',
    level: null,
    sort_order: index,
    updated_at: '2026-06-23T00:00:00.000Z',
    ...overrides,
  }
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('TeamsIndexView', () => {
  beforeEach(() => {
    mocks.canCreateTeam = true
    mocks.createTeam.mockResolvedValue(team({ id: 'team-sales', name: 'Sales Team' }))
    mocks.useTeams.mockReturnValue({
      teams: [
        team({
          id: 'team-system',
          name: 'All agents',
          color: 'muted',
          icon: 'shield',
          is_system: true,
          member_count: 1,
          user_member_count: 0,
          grant_count: 0,
        }),
        team(),
      ],
      loading: false,
      error: null,
      reload: vi.fn(),
      create: mocks.createTeam,
      rename: vi.fn(),
      recolor: vi.fn(),
      reicon: vi.fn(),
      remove: vi.fn(),
    })
    mocks.useCachedMissionAgents.mockReturnValue({
      data: [agent(4), agent(1), agent(2), agent(3), agent(5)],
      loading: false,
      error: null,
      reload: vi.fn(),
    })
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('renders embedded teams, creates a team, and stays render-stable', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onSelectTeam = vi.fn()
    let renderCount = 0

    function Harness() {
      renderCount += 1
      return <TeamsIndexView embedded onSelectTeam={onSelectTeam} />
    }

    try {
      render(<Harness />)

      expect(screen.getByText('All agents')).toBeTruthy()
      expect(screen.getByText('Growth Team')).toBeTruthy()
      expect(screen.getByText('2 people')).toBeTruthy()
      expect(screen.getByText('3 access rules')).toBeTruthy()
      expect(screen.getByLabelText('5 agents on this team')).toBeTruthy()
      expect(screen.getByText('+1')).toBeTruthy()

      fireEvent.click(screen.getByText('Growth Team'))
      expect(onSelectTeam).toHaveBeenCalledWith('team-growth')

      fireEvent.click(screen.getByRole('button', { name: /New Team/i }))
      const input = screen.getByPlaceholderText('Team name (e.g. Marketing)')
      fireEvent.change(input, { target: { value: 'Sales Team' } })
      fireEvent.click(screen.getByRole('button', { name: 'Create' }))
      await flushAsyncWork()

      await waitFor(() =>
        expect(mocks.createTeam).toHaveBeenCalledWith({
          name: 'Sales Team',
          icon: 'users',
          color: 'default',
        }),
      )
      expect(onSelectTeam).toHaveBeenCalledWith('team-sales')

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(renderCount).toBeLessThan(30)
    } finally {
      consoleError.mockRestore()
    }
  })
})
