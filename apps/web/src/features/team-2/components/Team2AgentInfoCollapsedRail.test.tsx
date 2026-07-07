import { Profiler } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MissionAgent } from '@/lib/agents'
import { Team2AgentInfoCollapsedRail } from './Team2AgentInfoCollapsedRail'

function agentFixture(overrides: Partial<MissionAgent> = {}): MissionAgent {
  return {
    id: 'agent-1',
    user_id: 'user-1',
    agent_key: 'agent-1',
    name: 'Atlas',
    role: 'Research',
    status: 'online',
    skills: [],
    level: 'manager',
    specialty: null,
    image_url: null,
    is_active: true,
    team_id: 'team-growth',
    config: {},
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-24T00:00:00.000Z',
    ...overrides,
  }
}

describe('Team2AgentInfoCollapsedRail', () => {
  it('renders core tabs, hides access when unavailable, and uses the fallback avatar initial', () => {
    render(
      <Team2AgentInfoCollapsedRail
        agent={agentFixture()}
        activeTab="info"
        showAccessTab={false}
        onExpand={vi.fn()}
        onSelectTab={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Info' }).getAttribute('aria-current')).toBe('true')
    expect(screen.getByRole('button', { name: 'Skills' })).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Comms' })).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Access' })).toBeNull()
    expect(screen.getByText('A')).not.toBeNull()
  })

  it('selects a tab and expands the rail once', () => {
    const onExpand = vi.fn()
    const onSelectTab = vi.fn()

    render(
      <Team2AgentInfoCollapsedRail
        agent={agentFixture()}
        activeTab="skills"
        showAccessTab
        onExpand={onExpand}
        onSelectTab={onSelectTab}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Access' }))

    expect(onSelectTab).toHaveBeenCalledTimes(1)
    expect(onSelectTab).toHaveBeenCalledWith('access')
    expect(onExpand).toHaveBeenCalledTimes(1)
  })

  it('settles without repeated render churn', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let commitCount = 0

    try {
      render(
        <Profiler id="team2-agent-info-collapsed-rail" onRender={() => commitCount++}>
          <Team2AgentInfoCollapsedRail
            agent={agentFixture()}
            activeTab="communication"
            showAccessTab
            onExpand={vi.fn()}
            onSelectTab={vi.fn()}
          />
        </Profiler>,
      )

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(commitCount).toBeLessThan(8)
    } finally {
      consoleError.mockRestore()
    }
  })
})
