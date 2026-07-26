import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { useShellStore } from '@/components/shell/use-shell-store'
import type { MissionAgent } from '@/lib/agents'
import { Team2DetailView } from './Team2DetailView'

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
    useGlobalChatStore.setState({
      activeAgentKey: 'vibey',
      workContext: { surface: 'general' },
    })
  })

  afterEach(cleanup)

  it('opens the canonical chat filtered to the selected agent', () => {
    render(
      <Team2DetailView
        agent={agent}
        infoPanelTab="info"
        showAccessTab={false}
        onInfoPanelTabChange={vi.fn()}
        infoPanel={() => <div>Agent details</div>}
      >
        <div>Agents grid remains visible</div>
      </Team2DetailView>,
    )

    expect(screen.getByText('Agent details')).toBeTruthy()
    expect(screen.getByText('Agents grid remains visible')).toBeTruthy()
    expect(useShellStore.getState().chatDrawer.open).toBe(true)
    expect(useShellStore.getState().chatDrawer.conversationId).toBeNull()
    expect(useShellStore.getState().chatHistoryCollapsed).toBe(false)
    expect(useGlobalChatStore.getState().activeAgentKey).toBe('reed')
    expect(useGlobalChatStore.getState().workContext.surface).toBe('team')
  })
})
