import { createRef, Profiler } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Campaign } from '@/lib/campaigns'
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
  fetchSpaceById: vi.fn(),
  fetchCampaigns: vi.fn(),
  fetchCampaign: vi.fn(async (_id: string): Promise<Campaign | null> => null),
  fetchPrograms: vi.fn(
    async (): Promise<Array<{ id: string; name: string; system_kind?: string | null }>> => [],
  ),
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

function stubPickerCampaigns(
  rows: Array<(typeof campaigns)[number] & { program_id?: string }> = campaigns,
) {
  mocks.useOrgStore.mockImplementation((selector: (state: { activeOrgId: string }) => unknown) =>
    selector({ activeOrgId: 'org-1' }),
  )
  mocks.useCampaignCacheVersion.mockReturnValue(0)
  mocks.getCachedCampaigns.mockReturnValue(rows)
  mocks.prefetchOrgCampaigns.mockResolvedValue(rows)
  mocks.fetchCampaign.mockImplementation(
    async (id: string) => rows.find((row) => row.id === id) ?? null,
  )
}

describe('ConversationScopePicker', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mocks.fetchPrograms.mockResolvedValue([])
  })

  it('loads campaign spaces, assigns scope, and settles without render loops', async () => {
    stubPickerCampaigns()
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
      fireEvent.click(await screen.findByRole('button', { name: 'Show spaces in Launch campaign' }))

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

  it('assigns a campaign without requiring a nested space', async () => {
    stubPickerCampaigns()
    mocks.assignConversationScope.mockResolvedValue({
      ...conversation,
      campaign_id: 'campaign-1',
      metadata: { space_id: null },
    })
    mocks.positionFloatingMenuFromAnchorRect.mockReturnValue({ top: 100, left: 120 })
    const onConversationUpdated = vi.fn()
    const onScopeChanged = vi.fn()

    render(
      <ConversationScopePicker
        conversation={conversation}
        onConversationUpdated={onConversationUpdated}
        onScopeChanged={onScopeChanged}
      />,
    )

    fireEvent.click(screen.getByLabelText('General'))
    fireEvent.click(await screen.findByRole('button', { name: 'Launch campaign' }))

    await waitFor(() => {
      expect(mocks.assignConversationScope).toHaveBeenCalledWith(
        'conversation-1',
        'campaign-1',
        null,
      )
    })
    expect(onScopeChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: 'campaign-1',
        spaceId: null,
        campaignName: 'Launch campaign',
      }),
    )
    expect(onConversationUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ campaign_id: 'campaign-1' }),
    )
  })

  it('clears a scoped conversation into the General campaign', async () => {
    stubPickerCampaigns()
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

  it('resolves a campaign-less space title by direct lookup', async () => {
    stubPickerCampaigns()
    mocks.fetchSpaceById.mockResolvedValue({ id: 'space-meetings', title: 'Meetings' })

    render(
      <ConversationScopePicker
        conversation={{
          ...conversation,
          campaign_id: null,
          metadata: { space_id: 'space-meetings' },
        }}
        onConversationUpdated={vi.fn()}
        showLabel
      />,
    )

    expect(await screen.findByLabelText('Meetings')).toBeInTheDocument()
    expect(mocks.fetchSpaceById).toHaveBeenCalledWith('space-meetings', { orgId: 'org-1' })
  })

  it('shows only the Space name in the compact chat header', async () => {
    stubPickerCampaigns()
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

  it('opens the linked campaign from the pop-out control', async () => {
    stubPickerCampaigns()
    mocks.fetchSpaces.mockResolvedValue([{ id: 'space-1', title: 'Roadmap' }])
    const onOpenCampaign = vi.fn()

    render(
      <ConversationScopePicker
        conversation={{
          ...conversation,
          campaign_id: 'campaign-1',
          metadata: { space_id: 'space-1' },
        }}
        showLabel
        onOpenCampaign={onOpenCampaign}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Open campaign' }))
    expect(onOpenCampaign).toHaveBeenCalledWith('campaign-1')
  })

  it('groups campaigns under program headings in the click-stable picker', async () => {
    mocks.fetchPrograms.mockResolvedValue([{ id: 'program-1', name: 'Growth' }])
    stubPickerCampaigns(
      campaigns.map((campaign) =>
        campaign.id === 'campaign-1' ? { ...campaign, program_id: 'program-1' } : campaign,
      ),
    )
    mocks.positionFloatingMenuFromAnchorRect.mockReturnValue({ top: 100, left: 120 })

    render(<ConversationScopePicker conversation={conversation} />)

    fireEvent.click(screen.getByLabelText('General'))
    expect(await screen.findByText('Programs')).toBeInTheDocument()
    const growth = await screen.findByRole('button', { name: 'Growth' })
    fireEvent.mouseEnter(growth.parentElement ?? growth)
    expect(await screen.findByRole('button', { name: 'Launch campaign' })).toBeInTheDocument()
  })

  it('searches clients and pins General first in a client campaign list', async () => {
    mocks.fetchPrograms.mockResolvedValue([
      { id: 'clients', name: 'Clients', system_kind: 'clients' },
    ])
    const generalCampaign = campaigns[0]
    const launchCampaign = campaigns[1]
    if (!generalCampaign || !launchCampaign) throw new Error('campaign fixtures required')
    stubPickerCampaigns([
      generalCampaign,
      { ...launchCampaign, id: 'client-yasir', name: 'Yasir Khan', program_id: 'clients' },
      { ...launchCampaign, id: 'client-above', name: 'Above It', program_id: 'clients' },
    ])
    mocks.positionFloatingMenuFromAnchorRect.mockReturnValue({ top: 100, left: 120 })
    mocks.fetchSpaces.mockResolvedValue([
      { id: 'space-webinar', title: 'Webinar' },
      { id: 'space-general', title: 'General' },
    ])

    render(<ConversationScopePicker conversation={conversation} />)

    fireEvent.click(screen.getByLabelText('General'))
    const search = await screen.findByLabelText('Search')
    fireEvent.change(search, { target: { value: 'yasir' } })
    expect(await screen.findByRole('button', { name: 'Yasir Khan' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Above It' })).toBeNull()

    fireEvent.mouseEnter(
      screen.getByRole('button', { name: 'Yasir Khan' }).parentElement ??
        screen.getByRole('button', { name: 'Yasir Khan' }),
    )
    await waitFor(() => expect(mocks.fetchSpaces).toHaveBeenCalled())
    const menus = document.querySelectorAll('[data-conversation-scope-menu]')
    const flyout = menus[1]
    expect(flyout).toBeTruthy()
    expect(
      within(flyout as HTMLElement)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['General', 'Webinar'])
  })
})
