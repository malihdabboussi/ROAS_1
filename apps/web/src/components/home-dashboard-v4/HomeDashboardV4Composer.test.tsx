import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HomeDashboardV4Composer } from './HomeDashboardV4Composer'

const mocks = vi.hoisted(() => ({
  chatInputProps: {} as Record<string, unknown>,
  openAddMenu: vi.fn(),
  setText: vi.fn(),
  push: vi.fn(),
  seedComposer: vi.fn(),
  clearMeetingContext: vi.fn(),
  setActiveAgentKey: vi.fn(),
  setActiveConversationId: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
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

vi.mock('@/features/studio/store/use-chat-store', () => ({
  useChatStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ setActiveConversationId: mocks.setActiveConversationId }),
}))

vi.mock('@/features/studio/components/ChatInput', () => ({
  ChatInput: (props: {
    onSend: (content: string) => Promise<void>
    openAddMenuRef?: { current: ((submenu?: string) => void) | null }
    setTextRef?: { current: ((text: string) => void) | null }
  }) => {
    mocks.chatInputProps = props
    if (props.openAddMenuRef) props.openAddMenuRef.current = mocks.openAddMenu
    if (props.setTextRef) props.setTextRef.current = mocks.setText
    return (
      <button type="button" onClick={() => void props.onSend('Build the launch plan')}>
        Send test message
      </button>
    )
  },
}))

vi.mock('@/features/org/store/use-org-store', () => ({
  useOrgStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ isOrgOnly: true }),
}))

vi.mock('@/features/spaces/hooks/use-cached-spaces', () => ({
  cachedSpaces: { mutate: vi.fn() },
  useCachedSpaces: () => ({
    data: [{ id: 'space-1', title: 'Workspace', campaign_id: 'campaign-1' }],
  }),
}))

vi.mock('@/features/spaces/store/use-spaces-store', () => ({
  useSpacesStore: { setState: vi.fn() },
}))

vi.mock('@/features/spaces/services/spaces.service', () => ({
  createSpace: vi.fn(),
  ensureGeneralSpace: vi.fn(),
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
  fetchCampaigns: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/flows/flows-scope-storage', () => ({
  matchesFlowsConceptSpace: () => false,
}))

describe('HomeDashboardV4Composer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('opens a fresh chat surface immediately after queuing the Home message', async () => {
    render(<HomeDashboardV4Composer />)

    fireEvent.click(screen.getByRole('button', { name: 'Send test message' }))

    await waitFor(() => {
      expect(mocks.clearMeetingContext).toHaveBeenCalledTimes(1)
      expect(mocks.setActiveConversationId).toHaveBeenCalledWith(null)
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

  it('uses the standard chat composer chrome and shared empty-chat quick starts', () => {
    render(<HomeDashboardV4Composer />)

    const quickStarts = screen.getByRole('group', { name: 'Quick starts' })
    const chooseSpace = screen.getByRole('button', { name: 'Choose Space' })
    const plugins = screen.getByRole('button', { name: 'Plugins and integrations' })
    const shelf = chooseSpace.closest('.surface-card')
    expect(shelf).toContainElement(plugins)
    expect(shelf).toContainElement(quickStarts)
    expect(screen.getByRole('button', { name: 'Send test message' }).compareDocumentPosition(shelf!))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(mocks.chatInputProps.placeholder).toBe('Ask, create, search, @ to mention…')
    expect(mocks.chatInputProps.plusMenuAgentPicker).toEqual(
      expect.objectContaining({ selectedAgentKey: 'vibey' }),
    )
    expect(mocks.chatInputProps.wrapperClass).toBeUndefined()
    expect(mocks.chatInputProps.footerWrapperClassName).toBeUndefined()
  })

  it('opens the shared Space and integrations menus from the composer shelf', () => {
    render(<HomeDashboardV4Composer />)

    fireEvent.click(screen.getByRole('button', { name: 'Choose Space' }))
    fireEvent.click(screen.getByRole('button', { name: 'Plugins and integrations' }))

    expect(mocks.openAddMenu).toHaveBeenNthCalledWith(1, 'space')
    expect(mocks.openAddMenu).toHaveBeenNthCalledWith(2, 'integrations')
  })

  it('fills the shared composer when a suggested move is selected', () => {
    render(<HomeDashboardV4Composer />)

    fireEvent.click(screen.getByRole('button', { name: 'Suggested move' }))

    expect(mocks.setText).toHaveBeenCalledWith('Prepare the client brief')
  })
})
