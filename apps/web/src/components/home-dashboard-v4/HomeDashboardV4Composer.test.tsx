import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HomeDashboardV4Composer } from './HomeDashboardV4Composer'

const mocks = vi.hoisted(() => ({
  chatInputProps: {} as Record<string, unknown>,
  openAddMenu: vi.fn(),
  openScopePicker: vi.fn(),
  setText: vi.fn(),
  push: vi.fn(),
  seedComposer: vi.fn(),
  clearMeetingContext: vi.fn(),
  requestNewChat: vi.fn(),
  setActiveAgentKey: vi.fn(),
  isOrgOnly: true,
  campaignRows: [] as Array<Record<string, unknown>>,
  spaceRows: [{ id: 'space-1', title: 'Workspace', campaign_id: 'campaign-1' }] as Array<
    Record<string, unknown>
  >,
  ensureGeneralSpace: vi.fn(),
  toastError: vi.fn(),
  clientScope: null as null | {
    clientId: string
    clientName: string
    campaignId: string | null
    spaceIds: string[]
  },
}))

vi.mock('sonner', () => ({ toast: { error: mocks.toastError } }))

vi.mock('@/components/conversations', async () => {
  const { forwardRef, useImperativeHandle } = await import('react')
  return {
    ConversationScopePicker: forwardRef(function MockConversationScopePicker(
      props: {
        onScopeChanged?: (scope: {
          campaignId: string | null
          spaceId: string | null
          campaignName?: string | null
          spaceTitle?: string | null
        }) => void
      },
      ref,
    ) {
      useImperativeHandle(ref, () => ({ openMenuFromBanner: mocks.openScopePicker }))
      return (
        <div data-testid="choose-space-picker">
          <button
            type="button"
            onClick={() =>
              props.onScopeChanged?.({
                campaignId: 'campaign-1',
                spaceId: null,
                campaignName: 'Yasir Khan Coaching LTD',
                spaceTitle: null,
              })
            }
          >
            Select campaign only
          </button>
        </div>
      )
    }),
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('@/components/shell/use-shell-store', () => ({
  useShellStore: {
    getState: () => ({ requestNewChat: mocks.requestNewChat }),
  },
}))

vi.mock('@/components/global-chat/store/use-global-chat-store', () => ({
  useGlobalChatStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      seedComposer: mocks.seedComposer,
      clearMeetingContext: mocks.clearMeetingContext,
      activeAgentKey: 'vibey',
      setActiveAgentKey: mocks.setActiveAgentKey,
      roster: [
        {
          kind: 'agent',
          agent_key: 'vibey',
          display_name: 'Pixel',
          role_label: 'Assistant',
          avatar_url: null,
        },
      ],
      loadRoster: vi.fn().mockResolvedValue(undefined),
    }),
}))

vi.mock('@/components/global-chat/components/QuickMissionsHubHost', () => ({
  QuickMissionsHubHost: ({ open }: { open?: boolean }) => (
    <div data-testid="home-quick-missions-host">{String(open)}</div>
  ),
}))

vi.mock('@/features/studio/store/use-chat-store', () => ({
  useChatStore: vi.fn(),
}))

vi.mock('@/features/studio/components/ChatInput', () => ({
  ChatInput: (props: {
    onSend: (
      content: string,
      documents?: unknown,
      artifacts?: unknown,
      model?: string,
      references?: Array<{ kind: string; id: string; label: string }>,
    ) => Promise<void>
    openAddMenuRef?: { current: ((submenu?: string, anchor?: HTMLElement) => void) | null }
    setTextRef?: { current: ((text: string) => void) | null }
  }) => {
    mocks.chatInputProps = props
    if (props.openAddMenuRef) props.openAddMenuRef.current = mocks.openAddMenu
    if (props.setTextRef) props.setTextRef.current = mocks.setText
    return (
      <>
        <button type="button" onClick={() => void props.onSend('Build the launch plan')}>
          Send test message
        </button>
        <button
          type="button"
          onClick={() =>
            void props.onSend('Talk about 1DS Collective', undefined, undefined, undefined, [
              { kind: 'campaign', id: '1ds', label: '1DS Collective' },
            ])
          }
        >
          Send with campaign mention
        </button>
      </>
    )
  },
}))

vi.mock('@/features/org/store/use-org-store', () => ({
  useOrgStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ isOrgOnly: mocks.isOrgOnly }),
}))

vi.mock('@/features/spaces/hooks/use-cached-spaces', () => ({
  cachedSpaces: { mutate: vi.fn() },
  useCachedSpaces: () => ({
    data: mocks.spaceRows,
  }),
}))

vi.mock('@/features/spaces/store/use-spaces-store', () => ({
  useSpacesStore: { setState: vi.fn() },
}))

vi.mock('@/features/spaces/services/spaces.service', () => ({
  createSpace: vi.fn(),
  ensureGeneralSpace: mocks.ensureGeneralSpace,
}))

vi.mock('@/features/spaces/components/CreateSpaceModal', () => ({
  CreateSpaceModal: () => null,
}))

vi.mock('@/features/home/components/SuggestedNextMoves', () => ({
  SuggestedNextMoves: ({ onSelectPrompt }: { onSelectPrompt: (prompt: string) => void }) => (
    <button type="button" onClick={() => onSelectPrompt('Prepare the client brief')}>
      Suggested move
    </button>
  ),
}))

vi.mock('@/features/spaces/lib/view-customization-merge', () => ({
  normalizeSpaceLegacyViews: (space: unknown) => space,
}))

vi.mock('@/features/studio/services/campaign.service', () => ({
  campaignListCacheKey: () => 'campaigns',
  fetchCampaigns: vi.fn(() => Promise.resolve(mocks.campaignRows)),
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: vi.fn((_key: string, loader: () => Promise<unknown>) => loader()),
}))

vi.mock('@/lib/flows/flows-scope-storage', () => ({
  matchesFlowsConceptSpace: () => false,
}))

vi.mock('@/lib/client-scope', () => ({
  useClientScope: () => ({ scope: mocks.clientScope }),
}))

vi.mock('@/lib/programs', () => ({
  fetchPrograms: vi.fn(() => Promise.resolve([])),
}))

describe('HomeDashboardV4Composer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isOrgOnly = true
    mocks.campaignRows = []
    mocks.spaceRows = [{ id: 'space-1', title: 'Workspace', campaign_id: 'campaign-1' }]
    mocks.clientScope = null
    mocks.ensureGeneralSpace.mockResolvedValue({
      id: 'general-space',
      title: 'General',
      campaign_id: 'general-campaign',
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('opens a fresh chat surface immediately after queuing the Home message', async () => {
    render(<HomeDashboardV4Composer />)

    fireEvent.click(screen.getByRole('button', { name: 'Send test message' }))

    await waitFor(() => {
      expect(mocks.clearMeetingContext).toHaveBeenCalledTimes(1)
      expect(mocks.requestNewChat).toHaveBeenCalledTimes(1)
      expect(mocks.seedComposer).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Build the launch plan',
          agentKey: 'vibey',
          railIntent: 'new',
        }),
      )
      expect(mocks.push).toHaveBeenCalledWith('/home?chat=starting')
    })
  })

  it('does not invent an org Meetings/General space when seeding a Home message', async () => {
    mocks.isOrgOnly = false
    mocks.campaignRows = [{ id: 'campaign-1', name: 'General', config: { system_kind: 'general' } }]
    mocks.spaceRows = [
      { id: 'meetings', title: 'Meetings', campaign_id: 'campaign-1' },
      { id: 'space-1', title: 'Workspace', campaign_id: 'campaign-1' },
    ]
    render(<HomeDashboardV4Composer />)

    fireEvent.click(screen.getByRole('button', { name: 'Send test message' }))

    await waitFor(() => {
      expect(mocks.ensureGeneralSpace).not.toHaveBeenCalled()
      expect(mocks.toastError).not.toHaveBeenCalled()
      expect(mocks.seedComposer).toHaveBeenCalledWith(
        expect.objectContaining({
          workContext: { surface: 'general' },
        }),
      )
    })
  })

  it('uses an @ campaign mention as the Connection instead of Meetings', async () => {
    mocks.isOrgOnly = false
    mocks.campaignRows = [
      { id: 'general-camp', name: 'General', config: { system_kind: 'general' } },
      { id: '1ds', name: '1DS Collective' },
    ]
    mocks.spaceRows = [
      { id: 'meetings', title: 'Meetings', campaign_id: 'general-camp' },
      { id: '1ds-general', title: 'General', campaign_id: '1ds' },
    ]
    render(<HomeDashboardV4Composer />)

    fireEvent.click(screen.getByRole('button', { name: 'Send with campaign mention' }))

    await waitFor(() => {
      expect(mocks.seedComposer).toHaveBeenCalledWith(
        expect.objectContaining({
          references: [{ kind: 'campaign', id: '1ds', label: '1DS Collective' }],
          workContext: {
            surface: 'spaces',
            campaignId: '1ds',
            spaceId: '1ds-general',
          },
        }),
      )
    })
  })

  it('uses the standard chat composer chrome without home-screen tips or create chips', () => {
    render(<HomeDashboardV4Composer />)

    expect(screen.getByTestId('home-quick-missions-host')).toBeInTheDocument()
    expect(screen.queryByTestId('composer-try-tip')).toBeNull()
    expect(screen.queryByRole('group', { name: 'Quick starts' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Mission' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Offer' })).toBeNull()
    const chooseSpace = screen.getByRole('button', { name: 'Choose Space' })
    const plugins = screen.getByRole('button', { name: 'Plugins and integrations' })
    const shelf = chooseSpace.closest('.surface-card')
    expect(shelf).toContainElement(plugins)
    expect(
      screen.getByRole('button', { name: 'Send test message' }).compareDocumentPosition(shelf!),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(mocks.chatInputProps.placeholder).toBe('Ask, create, search, @ to mention…')
    expect(mocks.chatInputProps.plusMenuAgentPicker).toEqual(
      expect.objectContaining({ selectedAgentKey: 'vibey' }),
    )
    expect(mocks.chatInputProps.wrapperClass).toBeUndefined()
    expect(mocks.chatInputProps.footerWrapperClassName).toBeUndefined()
  })

  it('opens the click-stable Space picker from Choose Space, not the hover plus menu', () => {
    render(<HomeDashboardV4Composer />)

    fireEvent.click(screen.getByRole('button', { name: 'Choose Space' }))
    fireEvent.click(screen.getByRole('button', { name: 'Plugins and integrations' }))

    expect(mocks.openScopePicker).toHaveBeenCalledTimes(1)
    expect(mocks.openAddMenu).not.toHaveBeenCalledWith('space', expect.any(HTMLButtonElement))
    expect(mocks.openAddMenu).toHaveBeenCalledWith('integrations', expect.any(HTMLButtonElement))
  })

  it('replaces Choose Space with the selected campaign name', async () => {
    mocks.campaignRows = [{ id: 'campaign-1', name: 'Yasir Khan Coaching LTD' }]
    render(<HomeDashboardV4Composer />)

    fireEvent.click(screen.getByRole('button', { name: 'Select campaign only' }))

    expect(
      await screen.findByRole('button', { name: 'Yasir Khan Coaching LTD' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Choose Space' })).toBeNull()
  })

  it('defaults a new chat to the globally selected client workspace', async () => {
    mocks.campaignRows = [{ id: 'client-campaign', name: 'Prospecting On Demand' }]
    mocks.spaceRows = [
      { id: 'client-launch', title: 'Launch', campaign_id: 'client-campaign' },
      { id: 'client-general', title: 'General', campaign_id: 'client-campaign' },
    ]
    mocks.clientScope = {
      clientId: 'client-1',
      clientName: 'Prospecting On Demand',
      campaignId: 'client-campaign',
      spaceIds: ['client-launch', 'client-general'],
    }
    render(<HomeDashboardV4Composer />)

    expect(
      await screen.findByRole('button', { name: 'Prospecting On Demand General' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Send test message' }))

    await waitFor(() => {
      expect(mocks.seedComposer).toHaveBeenCalledWith(
        expect.objectContaining({
          workContext: {
            surface: 'spaces',
            campaignId: 'client-campaign',
            spaceId: 'client-general',
          },
        }),
      )
    })
  })

  it('seeds campaign scope with an explicit spaceId field so stale spaces clear', async () => {
    mocks.isOrgOnly = false
    mocks.campaignRows = [{ id: 'campaign-1', name: 'Yasir Khan Coaching LTD' }]
    render(<HomeDashboardV4Composer />)

    fireEvent.click(screen.getByRole('button', { name: 'Select campaign only' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send test message' }))

    await waitFor(() => {
      expect(mocks.seedComposer).toHaveBeenCalledWith(
        expect.objectContaining({
          workContext: {
            surface: 'spaces',
            // Cached mock space is titled Workspace, not General — still pass
            // spaceId: null explicitly so merge clears any prior attach.
            spaceId: null,
            campaignId: 'campaign-1',
          },
        }),
      )
    })
  })

  it('fills the shared composer when a suggested move is selected', () => {
    render(<HomeDashboardV4Composer />)

    fireEvent.click(screen.getByRole('button', { name: 'Suggested move' }))

    expect(mocks.setText).toHaveBeenCalledWith('Prepare the client brief')
  })
})
