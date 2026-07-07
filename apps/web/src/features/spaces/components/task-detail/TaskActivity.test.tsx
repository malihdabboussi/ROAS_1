import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TaskActivity } from './TaskActivity'

const spacesStoreState = {
  spaces: [
    {
      id: 'space-1',
      user_id: 'user-1',
      title: 'Launch Space',
      visibility: 'private',
      effective_level: 'edit',
    },
  ],
  currentUserId: 'user-1',
}

const servicesMocks = vi.hoisted(() => ({
  addItemComment: vi.fn(),
  cancelTaskAgent: vi.fn(),
  fetchItemActivity: vi.fn(async () => []),
  updateSpaceItem: vi.fn(),
}))

vi.mock('@/components/channels/ChannelComposerAdapter', () => ({
  ChannelComposer: () => <div data-testid="task-channel-composer" />,
}))

vi.mock('@/components/vibey/vibey-chat-orb', () => ({
  VibeyChatOrb: () => <div data-testid="vibey-chat-orb" />,
}))

vi.mock('@/components/vibey/vibey-hero-depth-orb', () => ({
  VibeyHeroDepthOrbEmbed: () => <div data-testid="vibey-hero-depth-orb" />,
}))

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: () => <div data-testid="vibey-loading-orb" />,
}))

vi.mock('@/lib/campaigns', () => ({
  fetchCampaignTeam: vi.fn(async () => []),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: {
          user: {
            email: 'jordan@example.com',
            user_metadata: { full_name: 'Jordan Lee', avatar_url: null },
          },
        },
      })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  }),
}))

vi.mock('../../services/spaces.service', () => servicesMocks)

vi.mock('../../store/use-spaces-store', () => ({
  useSpacesStore: (selector: (state: typeof spacesStoreState) => unknown) =>
    selector(spacesStoreState),
}))

vi.mock('@/lib/org/org-context-store', () => ({
  useOrgStore: (selector: (state: { activeOrgId: null; myRole: null }) => unknown) =>
    selector({ activeOrgId: null, myRole: null }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('TaskActivity', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('mounts the task activity timeline and composer without render-loop errors', async () => {
    render(
      <TaskActivity
        spaceId="space-1"
        itemId="task-1"
        missionLogs={[]}
        createdAt="2026-06-24T10:00:00.000Z"
        allFields={[]}
        campaignId={null}
        roster={[]}
        currentUserId="user-1"
      />,
    )

    expect(await screen.findByText('Activity')).not.toBeNull()
    await waitFor(() => expect(servicesMocks.fetchItemActivity).toHaveBeenCalledWith('space-1', 'task-1'))
    expect(screen.getByText('Task created')).not.toBeNull()
    expect(screen.getByTestId('task-channel-composer')).not.toBeNull()
    expect(
      consoleErrorSpy.mock.calls.some((args) =>
        args.some((arg) => String(arg).includes('Maximum update depth')),
      ),
    ).toBe(false)
  })
})
