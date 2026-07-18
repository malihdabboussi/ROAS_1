import { createRef, Profiler } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Conversation } from '@/lib/conversations'
import {
  ConversationScopePicker,
  type ConversationScopePickerHandle,
} from './ConversationScopePicker'

const mocks = vi.hoisted(() => ({
  getCachedCampaigns: vi.fn(),
  prefetchOrgCampaigns: vi.fn(),
  useCampaignCacheVersion: vi.fn(),
  useOrgStore: vi.fn(),
  fetchSpaces: vi.fn(),
  fetchCampaigns: vi.fn(),
  assignConversationScope: vi.fn(),
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
}))

vi.mock('@/lib/campaigns', () => ({
  fetchCampaigns: mocks.fetchCampaigns,
}))

vi.mock('@/lib/ui', () => ({
  positionFloatingMenuFromAnchorRect: mocks.positionFloatingMenuFromAnchorRect,
}))

vi.mock('@/lib/conversations', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/conversations')>()
  return {
    ...actual,
    assignConversationScope: mocks.assignConversationScope,
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
]

const conversation: Conversation = {
  id: 'conversation-1',
  user_id: 'user-1',
  campaign_id: null,
  title: 'Team thread',
  agent_id: 'agent-1',
  status: 'active',
  metadata: {},
  created_at: '2026-06-23T12:00:00.000Z',
  updated_at: '2026-06-23T12:00:00.000Z',
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('ConversationScopePicker', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads campaign spaces, assigns scope, and settles without render loops', async () => {
    mocks.useOrgStore.mockImplementation((selector: (state: { activeOrgId: string }) => unknown) =>
      selector({ activeOrgId: 'org-1' }),
    )
    mocks.useCampaignCacheVersion.mockReturnValue(0)
    mocks.getCachedCampaigns.mockReturnValue(campaigns)
    mocks.prefetchOrgCampaigns.mockResolvedValue(campaigns)
    mocks.fetchSpaces.mockResolvedValue([{ id: 'space-1', title: 'Roadmap' }])
    mocks.assignConversationScope.mockResolvedValue({
      ...conversation,
      campaign_id: 'campaign-1',
      metadata: { space_id: 'space-1' },
    })
    mocks.positionFloatingMenuFromAnchorRect.mockReturnValue({ top: 100, left: 120 })
    const onConversationUpdated = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const ref = createRef<ConversationScopePickerHandle>()
    let commits = 0

    try {
      render(
        <Profiler id="conversation-scope-picker" onRender={() => commits++}>
          <ConversationScopePicker
            ref={ref}
            conversation={conversation}
            onConversationUpdated={onConversationUpdated}
          />
        </Profiler>,
      )

      fireEvent.click(screen.getByLabelText('General'))
      const campaignRow = await screen.findByText('Launch campaign')
      fireEvent.mouseEnter(campaignRow)

      await waitFor(() =>
        expect(mocks.fetchSpaces).toHaveBeenCalledWith(
          { campaign_id: 'campaign-1', limit: 50 },
          { orgId: 'org-1' },
        ),
      )
      fireEvent.click(await screen.findByText('Roadmap'))

      await waitFor(() => {
        expect(mocks.assignConversationScope).toHaveBeenCalledWith(
          'conversation-1',
          'campaign-1',
          'space-1',
        )
      })
      expect(onConversationUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'conversation-1',
          campaign_id: 'campaign-1',
          metadata: expect.objectContaining({ space_id: 'space-1' }),
        }),
      )
      await flushAsyncWork()

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(commits).toBeLessThan(25)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('clears a scoped conversation into the General campaign', async () => {
    mocks.useOrgStore.mockImplementation((selector: (state: { activeOrgId: string }) => unknown) =>
      selector({ activeOrgId: 'org-1' }),
    )
    mocks.useCampaignCacheVersion.mockReturnValue(0)
    mocks.getCachedCampaigns.mockReturnValue(campaigns)
    mocks.prefetchOrgCampaigns.mockResolvedValue(campaigns)
    mocks.fetchSpaces.mockResolvedValue([{ id: 'space-1', title: 'Roadmap' }])
    const scopedConversation = {
      ...conversation,
      campaign_id: 'campaign-1',
      metadata: { space_id: 'space-1' },
    }
    mocks.assignConversationScope.mockResolvedValue({
      ...scopedConversation,
      campaign_id: 'campaign-general',
      metadata: { space_id: null },
    })

    render(
      <ConversationScopePicker
        conversation={scopedConversation}
        onConversationUpdated={vi.fn()}
        showLabel
      />,
    )

    fireEvent.click(await screen.findByLabelText('Launch campaign / Roadmap'))
    fireEvent.click(await screen.findByRole('button', { name: 'General' }))

    await waitFor(() => {
      expect(mocks.assignConversationScope).toHaveBeenCalledWith(
        'conversation-1',
        'campaign-general',
        null,
      )
    })
  })

  it('shows only the Space name in the compact chat header', async () => {
    mocks.useOrgStore.mockImplementation((selector: (state: { activeOrgId: string }) => unknown) =>
      selector({ activeOrgId: 'org-1' }),
    )
    mocks.useCampaignCacheVersion.mockReturnValue(0)
    mocks.getCachedCampaigns.mockReturnValue(campaigns)
    mocks.prefetchOrgCampaigns.mockResolvedValue(campaigns)
    mocks.fetchSpaces.mockResolvedValue([{ id: 'space-1', title: 'Roadmap' }])

    render(
      <ConversationScopePicker
        conversation={{
          ...conversation,
          campaign_id: 'campaign-1',
          metadata: { space_id: 'space-1' },
        }}
        compact
        showLabel
      />,
    )

    expect(await screen.findByLabelText('Roadmap')).toBeTruthy()
    expect(screen.queryByLabelText('Launch campaign / Roadmap')).toBeNull()
  })
})
