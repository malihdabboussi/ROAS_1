import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Profiler, createRef } from 'react'
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
  assignConversationCampaign: vi.fn(),
  assignConversationSpace: vi.fn(),
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
    assignConversationCampaign: mocks.assignConversationCampaign,
    assignConversationSpace: mocks.assignConversationSpace,
  }
})

const campaigns = [
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
    mocks.assignConversationCampaign.mockResolvedValue({
      ...conversation,
      campaign_id: 'campaign-1',
      metadata: { campaign: true },
    })
    mocks.assignConversationSpace.mockResolvedValue({
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

      fireEvent.click(screen.getByLabelText('Add to campaign + space'))
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
        expect(mocks.assignConversationCampaign).toHaveBeenCalledWith(
          'conversation-1',
          'campaign-1',
        )
        expect(mocks.assignConversationSpace).toHaveBeenCalledWith('conversation-1', 'space-1')
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
})
