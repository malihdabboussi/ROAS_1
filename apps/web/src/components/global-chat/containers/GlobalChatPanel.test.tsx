import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GlobalChatPanel } from './GlobalChatPanel'

vi.mock('next/navigation', () => ({
  usePathname: () => '/home',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/features/spaces/components/chat/SpaceVibeyChatPanel', () => ({
  SpaceVibeyChatPanel: () => <div>Chat surface</div>,
}))

vi.mock('@/features/spaces/store/use-spaces-store', () => ({
  useSpacesStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ activeSpaceId: null, spaces: [] }),
}))

vi.mock('@/features/studio/store/use-chat-store', () => ({
  useChatStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ activeConversationId: null, conversations: [] }),
}))

vi.mock('../store/use-global-chat-store', () => ({
  useGlobalChatStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      workContext: { surface: 'general' },
      meetingContext: null,
      setCollapsed: vi.fn(),
      clearMeetingContext: vi.fn(),
    }),
}))

vi.mock('../components/ChatSurfaceRecommendation', () => ({
  ChatSurfaceRecommendation: () => null,
}))
vi.mock('../components/ChatCampaignBrainNudge', () => ({ ChatCampaignBrainNudge: () => null }))
vi.mock('../components/QuickMissionsHubHost', () => ({
  QuickMissionsHubHost: () => <div data-testid="active-chat-quick-missions-host" />,
}))
vi.mock('../hooks/useWorkRequestHomeChatSeed', () => ({
  useWorkRequestHomeChatSeed: () => undefined,
}))

describe('GlobalChatPanel', () => {
  it('owns the Mission host beside the mounted active chat surface', () => {
    render(<GlobalChatPanel />)

    expect(screen.getByText('Chat surface')).toBeInTheDocument()
    expect(screen.getByTestId('active-chat-quick-missions-host')).toBeInTheDocument()
  })
})
