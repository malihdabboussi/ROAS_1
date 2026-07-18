import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HomeDashboardV4Composer } from './HomeDashboardV4Composer'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  seedComposer: vi.fn(),
  setActiveConversationId: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('@/components/global-chat/store/use-global-chat-store', () => ({
  useGlobalChatStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ seedComposer: mocks.seedComposer, activeAgentKey: 'vibey' }),
}))

vi.mock('@/features/studio/store/use-chat-store', () => ({
  useChatStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ setActiveConversationId: mocks.setActiveConversationId }),
}))

vi.mock('@/features/studio/components/ChatInput', () => ({
  ChatInput: ({ onSend }: { onSend: (content: string) => Promise<void> }) => (
    <button type="button" onClick={() => void onSend('Build the launch plan')}>
      Send test message
    </button>
  ),
}))

vi.mock('@/components/home-dashboard-v4/HomeDashboardTemplateChip', () => ({
  HomeDashboardTemplateChip: () => null,
}))

vi.mock('@/features/home/config/home-dashboard-v4.config', () => ({
  homeDashboardTemplate: () => null,
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
  ensureGeneralSpace: vi.fn(),
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
    render(<HomeDashboardV4Composer selectedTemplate={null} onSelectTemplate={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Send test message' }))

    await waitFor(() => {
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
})
