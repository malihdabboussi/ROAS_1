import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Campaign } from '@/lib/campaigns'
import type { Conversation } from '@/lib/conversations'
import { ConversationScopePicker } from './ConversationScopePicker'

const mocks = vi.hoisted(() => ({
  getCachedCampaigns: vi.fn(),
  prefetchOrgCampaigns: vi.fn(),
  useCampaignCacheVersion: vi.fn(),
  useOrgStore: vi.fn(),
  fetchSpaces: vi.fn(),
  fetchSpaceById: vi.fn(),
  fetchCampaigns: vi.fn(),
  fetchCampaign: vi.fn(async (_id: string): Promise<Campaign | null> => null),
  fetchPrograms: vi.fn(
    async (): Promise<Array<{ id: string; name: string; system_kind?: string | null }>> => [],
  ),
  assignConversationScope: vi.fn(),
  addConversationConnection: vi.fn(),
  positionFloatingMenuFromAnchorRect: vi.fn(),
}))

vi.mock('@/lib/home', () => ({
  getCachedCampaigns: mocks.getCachedCampaigns,
  prefetchOrgCampaigns: mocks.prefetchOrgCampaigns,
  useCampaignCacheVersion: mocks.useCampaignCacheVersion,
}))

vi.mock('@/lib/org', () => ({
  useOrgStore: mocks.useOrgStore,
}))

vi.mock('@/lib/spaces', () => ({
  fetchSpaces: mocks.fetchSpaces,
  fetchSpaceById: mocks.fetchSpaceById,
}))

vi.mock('@/lib/programs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/programs')>()
  return {
    ...actual,
    fetchPrograms: mocks.fetchPrograms,
  }
})

vi.mock('@/lib/campaigns', () => ({
  fetchCampaigns: mocks.fetchCampaigns,
  fetchCampaign: mocks.fetchCampaign,
}))

vi.mock('@/lib/ui', () => ({
  positionFloatingMenuFromAnchorRect: mocks.positionFloatingMenuFromAnchorRect,
}))

vi.mock('@/lib/conversations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/conversations')>()
  return {
    ...actual,
    assignConversationScope: mocks.assignConversationScope,
    addConversationConnection: mocks.addConversationConnection,
  }
})

const campaigns = [
  {
    id: 'campaign-general',
    user_id: 'user-1',
    name: 'General',
    campaign_type: 'general',
    status: 'active',
    config: { system_kind: 'general' },
    metrics: {},
    created_at: '2026-06-23T12:00:00.000Z',
    updated_at: '2026-06-23T12:00:00.000Z',
  },
  {
    id: 'campaign-1',
    user_id: 'user-1',
    name: 'Launch campaign',
    campaign_type: 'launch',
    status: 'active',
    config: {},
    metrics: {},
    created_at: '2026-06-23T12:00:00.000Z',
    updated_at: '2026-06-23T12:00:00.000Z',
  },
  {
    id: 'campaign-2',
    user_id: 'user-1',
    name: 'Multifamily Strategy',
    campaign_type: 'launch',
    status: 'active',
    config: {},
    metrics: {},
    created_at: '2026-06-23T12:00:00.000Z',
    updated_at: '2026-06-23T12:00:00.000Z',
  },
]

const conversation: Conversation = {
  id: 'conversation-1',
  user_id: 'user-1',
  campaign_id: 'campaign-1',
  title: 'Team thread',
  agent_id: 'agent-1',
  status: 'active',
  metadata: {},
  created_at: '2026-06-23T12:00:00.000Z',
  updated_at: '2026-06-23T12:00:00.000Z',
}

describe('ConversationScopePicker add mode', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mocks.fetchPrograms.mockResolvedValue([])
  })

  it('adds a second campaign without replacing the primary scope', async () => {
    mocks.useOrgStore.mockImplementation((selector: (state: { activeOrgId: string }) => unknown) =>
      selector({ activeOrgId: 'org-1' }),
    )
    mocks.useCampaignCacheVersion.mockReturnValue(0)
    mocks.getCachedCampaigns.mockReturnValue(campaigns)
    mocks.prefetchOrgCampaigns.mockResolvedValue(campaigns)
    mocks.fetchCampaign.mockImplementation(
      async (id: string) => campaigns.find((row) => row.id === id) ?? null,
    )
    mocks.positionFloatingMenuFromAnchorRect.mockReturnValue({ top: 100, left: 120 })
    mocks.addConversationConnection.mockResolvedValue({
      promoted_primary: false,
      conversation,
      connection: { entity_id: 'campaign-2' },
    })
    const onScopeChanged = vi.fn()
    const onConversationUpdated = vi.fn()

    render(
      <ConversationScopePicker
        conversation={conversation}
        selectionMode="add"
        onScopeChanged={onScopeChanged}
        onConversationUpdated={onConversationUpdated}
      />,
    )

    fireEvent.click(await screen.findByLabelText('Launch campaign'))
    fireEvent.click(await screen.findByRole('button', { name: 'Multifamily Strategy' }))

    await waitFor(() =>
      expect(mocks.addConversationConnection).toHaveBeenCalledWith('conversation-1', {
        entity_type: 'campaign',
        entity_id: 'campaign-2',
      }),
    )
    expect(mocks.assignConversationScope).not.toHaveBeenCalled()
    expect(onScopeChanged).not.toHaveBeenCalled()
  })
})
