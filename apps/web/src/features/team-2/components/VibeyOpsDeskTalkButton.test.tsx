import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VibeyOpsDeskTalkButton } from './VibeyOpsDeskTalkButton'

const seedComposer = vi.fn()

vi.mock('@/components/global-chat/store/use-global-chat-store', () => ({
  useGlobalChatStore: {
    getState: () => ({ seedComposer }),
  },
}))

const summary = {
  statusCounts: { working: 0, idle: 2, online: 0, offline: 0 },
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
  idleAgents: [{ agentKey: 'nate', agentName: 'Nate' }],
}

describe('VibeyOpsDeskTalkButton', () => {
  beforeEach(() => {
    seedComposer.mockClear()
  })

  it('seeds sidebar chat so Vibey opens an Ops Desk check-in', () => {
    render(
      <VibeyOpsDeskTalkButton
        awarenessContext="[Team Ops Context]"
        firstName="Test"
        summary={summary}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /talk to vibey/i }))
    expect(seedComposer).toHaveBeenCalledTimes(1)
    const detail = seedComposer.mock.calls[0]?.[0]
    expect(detail.agentKey).toBe('vibey')
    expect(detail.railIntent).toBe('new')
    expect(detail.workContext).toEqual({
      surface: 'team',
      teamOpsLabel: 'Ops Desk',
      teamOpsAwarenessContext: '[Team Ops Context]',
    })
    expect(detail.content).toContain('Ops Desk')
    expect(detail.content).toContain('Test')
    expect(detail.content).toContain('what I want to focus on')
  })
})
