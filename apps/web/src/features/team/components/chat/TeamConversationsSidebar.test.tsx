import { Profiler, useState, type HTMLAttributes, type ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TeamConversationsSidebar } from './TeamConversationsSidebar'
import {
  backlogCampaign,
  buildConversation,
  buildSidebarProps,
  launchCampaign,
  renderSidebar,
} from './team-conversations-sidebar.test-helpers'

type MotionDivProps = HTMLAttributes<HTMLDivElement> & {
  animate?: unknown
  exit?: unknown
  initial?: unknown
  transition?: unknown
}

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ animate, exit, initial, transition, ...props }: MotionDivProps) => <div {...props} />,
  },
}))

vi.mock('@radix-ui/react-dialog', () => ({
  Close: ({ children }: { asChild?: boolean; children: ReactNode }) => <>{children}</>,
  Content: (props: HTMLAttributes<HTMLDivElement>) => <div {...props} />,
  Description: (props: HTMLAttributes<HTMLParagraphElement>) => <p {...props} />,
  Overlay: (props: HTMLAttributes<HTMLDivElement>) => <div {...props} />,
  Portal: ({ children }: { children: ReactNode }) => <>{children}</>,
  Root: ({ children }: { children: ReactNode }) => <>{children}</>,
  Title: (props: HTMLAttributes<HTMLHeadingElement>) => <h2 {...props} />,
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

vi.mock('@/components/chat/ConversationChannelIcon', () => ({
  ConversationChannelIcon: () => <span data-testid="channel-icon" />,
}))

vi.mock('@/components/layout/DeleteCampaignDialog', () => ({
  DeleteCampaignDialog: () => null,
}))

vi.mock('@/components/layout/NewCampaignModal', () => ({
  NewCampaignModal: () => null,
}))

vi.mock('@/components/layout/sidebar/SidebarCampaignMenuPortal', () => ({
  SidebarCampaignMenuPortal: ({ campaign }: { campaign: { name: string } }) => (
    <div data-testid="campaign-menu">{campaign.name}</div>
  ),
}))

vi.mock('@/components/ui/IconPicker', () => ({
  LucideIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: ({ text }: { text?: string }) => <div data-testid="loading-orb">{text}</div>,
}))

vi.mock('@/components/org', () => ({
  ShareModal: () => null,
}))

vi.mock('@/lib/campaigns', () => ({
  createCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
  updateCampaign: vi.fn(),
}))

vi.mock('@/features/team/components/CampaignTeamManageModal', () => ({
  CampaignTeamManageModal: () => null,
}))

vi.mock('@/components/transfer', () => ({
  TransferDialog: () => null,
}))

vi.mock('@/lib/utils/sanitize-user-error', () => ({
  sanitizeUserError: (_error: unknown, fallback: string) => fallback,
}))

describe('TeamConversationsSidebar', () => {
  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('searches all-agent sessions, groups by campaign, preserves draft/typewriter labels, and settles without loops', async () => {
    const onSearchQueryChange = vi.fn()
    let commits = 0

    const launchConversation = buildConversation({
      id: 'conversation-launch',
      campaign_id: launchCampaign.id,
      title: 'Launch plan',
      updated_at: '2026-06-24T00:20:00.000Z',
    })
    const generalConversation = buildConversation({
      id: 'conversation-general',
      campaign_id: null,
      title: 'General plan',
      updated_at: '2026-06-24T00:10:00.000Z',
    })
    const backlogConversation = buildConversation({
      id: 'conversation-backlog',
      campaign_id: backlogCampaign.id,
      title: 'Backlog plan',
      metadata: { team_draft: true },
      agent_id: 'agent-beta',
      updated_at: '2026-06-24T00:30:00.000Z',
    })
    const hiddenBySearch = buildConversation({
      id: 'conversation-roadmap',
      campaign_id: backlogCampaign.id,
      title: 'Roadmap notes',
      updated_at: '2026-06-24T00:40:00.000Z',
    })

    render(
      <Profiler id="team-conversations-sidebar" onRender={() => (commits += 1)}>
        <TeamConversationsSidebar
          {...buildSidebarProps({
            sessions: [launchConversation],
            searchAllSessions: [
              hiddenBySearch,
              backlogConversation,
              launchConversation,
              generalConversation,
            ],
            sessionTitleTypewriter: {
              conversationId: launchConversation.id,
              text: 'Live generated title',
            },
            onSearchQueryChange,
          })}
        />
      </Profiler>,
    )

    fireEvent.change(screen.getByPlaceholderText('Search conversations…'), {
      target: { value: 'plan' },
    })

    expect(onSearchQueryChange).toHaveBeenCalledWith('plan')
    expect(screen.getByText('General')).toBeTruthy()
    expect(screen.getByText('Launch')).toBeTruthy()
    expect(screen.getByText('Backlog')).toBeTruthy()
    expect(screen.getByText('General plan')).toBeTruthy()
    expect(screen.getByText('Live generated title')).toBeTruthy()
    expect(screen.getByText('Backlog plan (Draft)')).toBeTruthy()
    expect(screen.queryByText('Roadmap notes')).toBeNull()
    expect(commits).toBeLessThan(12)
  })

  it('auto-expands the selected campaign and keeps selected conversations visible past the initial cap', async () => {
    const conversations = Array.from({ length: 8 }, (_, index) =>
      buildConversation({
        id: `conversation-${index + 1}`,
        campaign_id: launchCampaign.id,
        title: `Launch thread ${index + 1}`,
        updated_at: `2026-06-24T00:${String(50 - index).padStart(2, '0')}:00.000Z`,
      }),
    )

    renderSidebar({
      sessions: conversations,
      selectedSessionId: 'conversation-7',
    })

    await waitFor(() => expect(screen.getByText('Launch thread 7')).toBeTruthy())
    expect(screen.getByText('Launch thread 1')).toBeTruthy()
    expect(screen.getByText('See more')).toBeTruthy()
  })

  it('reveals desktop header actions and delegates scope and collapse controls', () => {
    const onExpandedChange = vi.fn()
    const onShowAllOrgConversationsChange = vi.fn()
    const peerConversation = buildConversation({
      id: 'conversation-peer',
      title: 'Peer thread',
      user_id: 'user-2',
    })

    const { container } = renderSidebar({
      onExpandedChange,
      onShowAllOrgConversationsChange,
      sessions: [peerConversation],
      showAllOrgConversations: true,
    })

    fireEvent.pointerEnter(container.querySelector('.card-glass') as HTMLElement)
    fireEvent.click(screen.getByLabelText('Show only my conversations'))
    expect(onShowAllOrgConversationsChange).toHaveBeenCalledWith(false)

    fireEvent.click(screen.getByLabelText('Collapse conversations'))
    expect(onExpandedChange).toHaveBeenCalledWith(false)
  })

  it('delegates collapsed rail expand and new conversation actions', () => {
    const onExpandedChange = vi.fn()
    const onNewConversation = vi.fn()

    renderSidebar({
      expanded: false,
      onExpandedChange,
      onNewConversation,
    })

    fireEvent.click(screen.getByLabelText('Expand conversations'))
    expect(onExpandedChange).toHaveBeenCalledWith(true)

    fireEvent.click(screen.getByLabelText('New conversation'))
    expect(onNewConversation).toHaveBeenCalled()
  })

  it('opens session actions from search results and delegates rename and delete', () => {
    const onStartRename = vi.fn()
    const onDeleteSession = vi.fn()
    const launchConversation = buildConversation({
      id: 'conversation-launch',
      campaign_id: launchCampaign.id,
      title: 'Launch plan',
      updated_at: '2026-06-24T00:20:00.000Z',
    })

    function Harness() {
      const [sessionActionsOpenId, setSessionActionsOpenId] = useState<string | null>(null)
      return (
        <TeamConversationsSidebar
          {...buildSidebarProps({
            sessions: [launchConversation],
            searchAllSessions: [launchConversation],
            sessionActionsOpenId,
            onSessionActionsOpenIdChange: setSessionActionsOpenId,
            onStartRename,
            onDeleteSession,
          })}
        />
      )
    }

    render(<Harness />)

    fireEvent.change(screen.getByPlaceholderText('Search conversations…'), {
      target: { value: 'plan' },
    })

    const rowButton = screen.getByText('Launch plan').closest('button')
    const actionTrigger = rowButton?.querySelector('[role="button"]')
    expect(actionTrigger).toBeTruthy()

    fireEvent.click(actionTrigger as HTMLElement)
    fireEvent.click(screen.getByText('Rename'))
    expect(onStartRename).toHaveBeenCalledWith(
      expect.objectContaining({ id: launchConversation.id }),
    )

    const nextActionTrigger = screen
      .getByText('Launch plan')
      .closest('button')
      ?.querySelector('[role="button"]')
    expect(nextActionTrigger).toBeTruthy()

    fireEvent.click(nextActionTrigger as HTMLElement)
    fireEvent.click(screen.getByText('Delete'))
    expect(onDeleteSession).toHaveBeenCalledWith(launchConversation.id)
  })

  it('renders recent active conversations and delegates selection without render loops', () => {
    const onSelectActiveConversation = vi.fn()
    let commits = 0
    const activeLaunchConversation = buildConversation({
      id: 'conversation-active-launch',
      campaign_id: launchCampaign.id,
      title: 'Active launch',
      updated_at: '2026-06-24T00:20:00.000Z',
    })
    const activeBacklogConversation = buildConversation({
      id: 'conversation-active-backlog',
      agent_id: 'agent-beta',
      campaign_id: backlogCampaign.id,
      title: 'Active backlog',
      updated_at: '2026-06-24T00:30:00.000Z',
    })

    render(
      <Profiler id="team-conversations-sidebar" onRender={() => (commits += 1)}>
        <TeamConversationsSidebar
          {...buildSidebarProps({
            activeConversations: [activeLaunchConversation, activeBacklogConversation],
            onSelectActiveConversation,
          })}
        />
      </Profiler>,
    )

    expect(screen.getByText('Recent Conversations')).toBeTruthy()
    expect(screen.getByText('Active launch')).toBeTruthy()
    expect(screen.getByText('Active backlog')).toBeTruthy()

    fireEvent.click(screen.getByText('Active launch').closest('button') as HTMLButtonElement)
    expect(onSelectActiveConversation).toHaveBeenCalledWith(activeLaunchConversation.id)

    fireEvent.click(screen.getByText('Recent Conversations').closest('button') as HTMLButtonElement)
    expect(screen.queryByText('Active launch')).toBeNull()
    expect(commits).toBeLessThan(10)
  })

  it('opens assign confirmation from unassigned campaigns and delegates assignment', async () => {
    const onAssignAgentToCampaign = vi.fn().mockResolvedValue(undefined)

    renderSidebar({
      agentName: 'Agent Alpha',
      onAssignAgentToCampaign,
    })

    const backlogRow = screen.getByText('Backlog').closest('div')
    expect(backlogRow).toBeTruthy()

    fireEvent.click(within(backlogRow as HTMLElement).getByRole('button'))
    expect(screen.getByText('Assign to campaign?')).toBeTruthy()
    expect(screen.getByText('"Backlog"')).toBeTruthy()

    fireEvent.click(screen.getByText('Assign'))

    await waitFor(() =>
      expect(onAssignAgentToCampaign).toHaveBeenCalledWith(backlogCampaign.id),
    )
  })

  it('opens assigned campaign agent filter and delegates selection changes', () => {
    const onAgentFilterChange = vi.fn()

    renderSidebar({
      agentFilter: new Set(['agent-alpha']),
      onAgentFilterChange,
    })

    fireEvent.click(screen.getByLabelText('Filter by agent'))
    expect(screen.getByText('All agents')).toBeTruthy()

    fireEvent.click(screen.getByText('Agent Beta'))
    expect([...onAgentFilterChange.mock.calls.at(-1)?.[0]]).toEqual([
      'agent-alpha',
      'agent-beta',
    ])

    fireEvent.click(screen.getByText('All agents'))
    expect([...onAgentFilterChange.mock.calls.at(-1)?.[0]]).toEqual([])
  })

  it('expands campaign groups and delegates new chat and campaign menu actions', async () => {
    const onCampaignExpand = vi.fn()
    const onCampaignHeaderClick = vi.fn()
    const onNewConversationInCampaign = vi.fn()
    const launchConversation = buildConversation({
      id: 'conversation-launch',
      campaign_id: launchCampaign.id,
      title: 'Launch plan',
      updated_at: '2026-06-24T00:20:00.000Z',
    })

    renderSidebar({
      sessions: [launchConversation],
      onCampaignExpand,
      onCampaignHeaderClick,
      onNewConversationInCampaign,
    })

    const launchHeader = screen.getByText('Launch').closest('button')
    expect(launchHeader).toBeTruthy()

    fireEvent.click(launchHeader as HTMLButtonElement)
    expect(onCampaignExpand).toHaveBeenCalledWith(launchCampaign.id)
    expect(onCampaignHeaderClick).toHaveBeenCalledWith(launchCampaign.id)

    await waitFor(() => expect(screen.getByText('Launch plan')).toBeTruthy())
    const launchSection = launchHeader?.parentElement
    expect(launchSection).toBeTruthy()
    fireEvent.click(within(launchSection as HTMLElement).getByText('New Chat'))
    expect(onNewConversationInCampaign).toHaveBeenCalledWith(launchCampaign.id)

    const campaignMenuTrigger = launchHeader?.querySelector('[role="button"]')
    expect(campaignMenuTrigger).toBeTruthy()
    fireEvent.click(campaignMenuTrigger as HTMLElement)
    expect(screen.getByTestId('campaign-menu').textContent).toBe('Launch')
  })
})
