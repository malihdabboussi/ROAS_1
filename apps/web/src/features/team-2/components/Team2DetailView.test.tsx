import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useShellStore } from '@/components/shell/use-shell-store'
import type { MissionAgent } from '@/lib/agents'
import { Team2DetailView } from './Team2DetailView'

vi.mock('./tabs/ChatTab', () => ({
  ChatTab: () => <div>Agent chat</div>,
}))

vi.mock('./Team2AgentInfoCollapsedRail', () => ({
  Team2AgentInfoCollapsedRail: () => <div>Collapsed agent details</div>,
}))

const agent = {
  agent_key: 'reed',
  name: 'Reed',
} as MissionAgent

describe('Team2DetailView', () => {
  beforeEach(() => {
    useShellStore.setState({
      chatDrawer: {
        open: true,
        conversationId: 'global-chat',
        width: 420,
        minimized: false,
      },
      workAreaOpen: true,
    })
  })

  afterEach(cleanup)

  it('minimizes the global AI chat so the agent page has one composer', () => {
    render(
      <Team2DetailView
        agent={agent}
        infoPanelTab="info"
        showAccessTab={false}
        onInfoPanelTabChange={vi.fn()}
        infoPanel={() => <div>Agent details</div>}
      />,
    )

    expect(screen.getByText('Agent chat')).toBeInTheDocument()
    expect(useShellStore.getState().chatDrawer.open).toBe(false)
    expect(useShellStore.getState().chatDrawer.minimized).toBe(true)
  })
})
