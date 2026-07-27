import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AllChatsPage } from './AllChatsPage'

const mocks = vi.hoisted(() => ({
  openChatDrawer: vi.fn(),
  openFreshChatDrawer: vi.fn(),
  setWorkAreaOpen: vi.fn(),
  setActiveConversationId: vi.fn(),
  loadRoster: vi.fn().mockResolvedValue(undefined),
  listProps: vi.fn(),
}))

vi.mock('@/components/conversations/SpaceConversationsListAdapter', () => ({
  SpaceConversationsList: ({
    onSelectConversation,
    onNewConversation,
    showUpdatedAt,
    dividedRows,
  }: {
    onSelectConversation: (id: string) => void
    onNewConversation: () => void
    showUpdatedAt?: boolean
    dividedRows?: boolean
  }) => {
    mocks.listProps({ showUpdatedAt, dividedRows })
    return (
      <>
        <button type="button" onClick={() => onSelectConversation('conversation-1')}>
          Open conversation
        </button>
        <button type="button" onClick={onNewConversation}>
          Start conversation
        </button>
      </>
    )
  },
}))

vi.mock('@/components/global-chat/store/use-global-chat-store', () => ({
  useGlobalChatStore: (
    selector: (state: {
      activeAgentKey: string
      roster: []
      loadRoster: typeof mocks.loadRoster
    }) => unknown,
  ) =>
    selector({
      activeAgentKey: 'vibey',
      roster: [],
      loadRoster: mocks.loadRoster,
    }),
}))

vi.mock('@/components/shell/use-shell-store', () => ({
  useShellStore: (
    selector: (state: {
      openChatDrawer: typeof mocks.openChatDrawer
      openFreshChatDrawer: typeof mocks.openFreshChatDrawer
      setWorkAreaOpen: typeof mocks.setWorkAreaOpen
    }) => unknown,
  ) =>
    selector({
      openChatDrawer: mocks.openChatDrawer,
      openFreshChatDrawer: mocks.openFreshChatDrawer,
      setWorkAreaOpen: mocks.setWorkAreaOpen,
    }),
}))

vi.mock('@/features/studio/store/use-chat-store', () => ({
  useChatStore: Object.assign(
    (
      selector: (state: {
        setActiveConversationId: typeof mocks.setActiveConversationId
      }) => unknown,
    ) => selector({ setActiveConversationId: mocks.setActiveConversationId }),
    { getState: () => ({ removeConversation: vi.fn() }) },
  ),
}))

vi.mock('@/lib/org', () => ({
  useOrgStore: (selector: (state: { activeOrgId: string }) => unknown) =>
    selector({ activeOrgId: 'org-1' }),
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: vi.fn().mockResolvedValue([]),
  invalidateCachedFetch: vi.fn(),
  peekCachedFetch: vi.fn().mockReturnValue([]),
}))

vi.mock('@/lib/campaigns', () => ({
  fetchCampaigns: vi.fn().mockResolvedValue([]),
}))

describe('AllChatsPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('keeps Chats and Tasks open while loading a selected conversation into AI chat', () => {
    render(<AllChatsPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Open conversation' }))

    expect(mocks.openChatDrawer).toHaveBeenCalledWith('conversation-1')
    expect(mocks.setWorkAreaOpen).toHaveBeenCalledWith(true)
    expect(screen.getByRole('heading', { name: 'CHATS AND TASKS' })).toBeInTheDocument()
  })

  it('keeps Chats and Tasks open while starting a conversation', () => {
    render(<AllChatsPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Start conversation' }))

    expect(mocks.setActiveConversationId).toHaveBeenCalledWith(null)
    expect(mocks.openFreshChatDrawer).toHaveBeenCalled()
    expect(mocks.setWorkAreaOpen).toHaveBeenCalledWith(true)
  })

  it('uses the dated, divided full-page conversation treatment', () => {
    render(<AllChatsPage />)

    expect(mocks.listProps).toHaveBeenCalledWith({
      showUpdatedAt: true,
      dividedRows: true,
    })
    expect(screen.getByRole('heading', { name: 'CHATS AND TASKS' })).toHaveClass('title-h6')
  })
})
