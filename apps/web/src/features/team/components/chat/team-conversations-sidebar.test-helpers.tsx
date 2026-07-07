import type { ComponentProps } from 'react'
import { render, type RenderResult } from '@testing-library/react'
import { vi } from 'vitest'
import type { Campaign } from '@/lib/campaigns'
import type { Conversation } from '@/lib/conversations'
import { TeamConversationsSidebar } from './TeamConversationsSidebar'

type TeamConversationsSidebarTestProps = ComponentProps<typeof TeamConversationsSidebar>

export function buildCampaign(overrides: Partial<Campaign>): Campaign {
  return {
    id: 'campaign-1',
    user_id: 'user-1',
    org_id: null,
    name: 'Campaign',
    description: null,
    status: 'active',
    config: {},
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: '2026-06-24T00:00:00.000Z',
    ...overrides,
  } as Campaign
}

export function buildConversation(overrides: Partial<Conversation>): Conversation {
  return {
    id: 'conversation-1',
    user_id: 'user-1',
    campaign_id: null,
    title: 'Conversation',
    agent_id: 'agent-alpha',
    status: 'active',
    metadata: {},
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: '2026-06-24T00:00:00.000Z',
    ...overrides,
  }
}

export const generalCampaign = buildCampaign({
  id: 'campaign-general',
  name: 'General',
  config: { system_kind: 'general', icon: 'folder-kanban' },
})

export const launchCampaign = buildCampaign({
  id: 'campaign-launch',
  name: 'Launch',
  config: { icon: 'rocket', isPinned: true },
})

export const backlogCampaign = buildCampaign({
  id: 'campaign-backlog',
  name: 'Backlog',
  config: { icon: 'folder' },
})

export function buildSidebarProps(
  overrides: Partial<TeamConversationsSidebarTestProps> = {},
): TeamConversationsSidebarTestProps {
  return {
    expanded: true,
    onExpandedChange: vi.fn(),
    sessions: [],
    selectedSessionId: null,
    sessionsLoading: false,
    creatingSession: false,
    onSelectConversation: vi.fn(),
    onNewConversation: vi.fn(),
    renamingSessionId: null,
    renameValue: '',
    onRenameValueChange: vi.fn(),
    onSubmitRename: vi.fn(),
    onCancelRename: vi.fn(),
    onStartRename: vi.fn(),
    deletingSessionId: null,
    sessionActionsOpenId: null,
    onSessionActionsOpenIdChange: vi.fn(),
    onDeleteSession: vi.fn(),
    campaigns: [launchCampaign, backlogCampaign],
    assignedCampaigns: [launchCampaign],
    allCampaigns: [generalCampaign, launchCampaign, backlogCampaign],
    generalCampaignId: generalCampaign.id,
    currentUserId: 'user-1',
    teamAgents: [
      { agent_key: 'agent-alpha', name: 'Agent Alpha', image_url: null },
      { agent_key: 'agent-beta', name: 'Agent Beta', image_url: null },
    ],
    ...overrides,
  }
}

export function renderSidebar(
  overrides: Partial<TeamConversationsSidebarTestProps> = {},
): RenderResult & { props: TeamConversationsSidebarTestProps } {
  const props = buildSidebarProps(overrides)
  return { ...render(<TeamConversationsSidebar {...props} />), props }
}
