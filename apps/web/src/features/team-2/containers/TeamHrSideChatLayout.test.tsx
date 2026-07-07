import { Profiler, type ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import { TeamHrSideChatLayout } from './TeamHrSideChatLayout'

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: () => <div data-testid="loading-orb">loading</div>,
}))

vi.mock('../components/hr-side-chat/TeamHrSideChatPanel', () => ({
  TeamHrSideChatPanel: ({
    fallbackAgentName,
    onCollapseChat,
    railIntent,
  }: {
    fallbackAgentName?: string
    onCollapseChat?: () => void
    railIntent?: 'new' | 'list' | null
  }) => (
    <section data-testid="side-chat-panel">
      <span>{fallbackAgentName}</span>
      {railIntent ? <span>intent:{railIntent}</span> : null}
      <button type="button" onClick={onCollapseChat}>
        Collapse panel
      </button>
    </section>
  ),
}))

vi.mock('../components/hr-side-chat/TeamHrSideChatRail', () => ({
  TeamHrSideChatRail: ({
    agentName,
    onExpand,
    onNewConversation,
    onOpenConversations,
  }: {
    agentName?: string
    onExpand: () => void
    onNewConversation: () => void
    onOpenConversations: () => void
  }) => (
    <aside data-testid="side-chat-rail">
      <span>{agentName}</span>
      <button type="button" onClick={onExpand}>
        Expand rail
      </button>
      <button type="button" onClick={onNewConversation}>
        New conversation
      </button>
      <button type="button" onClick={onOpenConversations}>
        Conversations
      </button>
    </aside>
  ),
}))

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function stubDesktopMediaQuery(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}

const loopAgent: MissionAgent = {
  id: 'agent-loop',
  user_id: 'user-1',
  agent_key: 'loop',
  name: 'Loop',
  role: 'Flow Builder',
  status: 'online',
  skills: [],
  image_url: null,
  created_at: '2026-06-23T00:00:00Z',
  updated_at: '2026-06-23T00:00:00Z',
}

function renderLayout({
  children = <div>Flow builder</div>,
  desktop = true,
  storageScope = 'loop',
}: {
  children?: ReactNode
  desktop?: boolean
  storageScope?: 'hr' | 'atlas' | 'loop'
} = {}) {
  stubDesktopMediaQuery(desktop)
  let commitCount = 0

  render(
    <Profiler id="team-hr-side-chat-layout" onRender={() => commitCount++}>
      <TeamHrSideChatLayout
        hrAgent={loopAgent}
        agentKey="loop"
        agentName="Loop"
        mobileMainLabel="Flows"
        storageScope={storageScope}
        spaceId="space-1"
      >
        {children}
      </TeamHrSideChatLayout>
    </Profiler>,
  )

  return { getCommitCount: () => commitCount }
}

describe('TeamHrSideChatLayout', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
    vi.unstubAllGlobals()
  })

  it('mounts the desktop chat panel and main content without duplicate trees', () => {
    const { getCommitCount } = renderLayout()

    expect(screen.queryByTestId('side-chat-panel')).not.toBeNull()
    expect(screen.queryByTestId('side-chat-rail')).toBeNull()
    expect(screen.queryByText('Flow builder')).not.toBeNull()
    expect(getCommitCount()).toBeLessThan(8)
  })

  it('uses the collapsed desktop rail and expands with the requested intent', async () => {
    window.localStorage.setItem(
      'vibey.flows.loopSideChat',
      JSON.stringify({ chatCollapsed: true, chatWidth: 42 }),
    )

    const { getCommitCount } = renderLayout()

    expect(screen.queryByTestId('side-chat-rail')).not.toBeNull()
    expect(screen.queryByTestId('side-chat-panel')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'New conversation' }))

    await waitFor(() => expect(screen.queryByText('intent:new')).not.toBeNull())
    expect(screen.queryByTestId('side-chat-rail')).toBeNull()
    expect(getCommitCount()).toBeLessThan(12)
  })

  it('keeps mobile on the main pane until the chat tab is selected', () => {
    const { getCommitCount } = renderLayout({ desktop: false })

    expect(screen.queryByText('Flow builder')).not.toBeNull()
    expect(screen.queryByTestId('side-chat-panel')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Loop' }))

    expect(screen.queryByTestId('side-chat-panel')).not.toBeNull()
    expect(getCommitCount()).toBeLessThan(12)
  })
})
