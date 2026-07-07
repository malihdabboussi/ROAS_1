import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { ChannelChatContainer } from './ChannelChatContainer'

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  cachedFetch: vi.fn(),
  fetchTeamRoster: vi.fn(),
  markChannelRead: vi.fn(),
  updateChannel: vi.fn(),
  reloadMembers: vi.fn(),
  reloadMessages: vi.fn(),
  registerSpaceChannelBrainstormHandlers: vi.fn(),
  unregisterSpaceChannelBrainstormHandlers: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mocks.authGetUser,
    },
  }),
}))

vi.mock('@/lib/cache/keyed-fetch-cache', () => ({
  cachedFetch: mocks.cachedFetch,
}))

vi.mock('@/lib/team/team-roster-api', () => ({
  fetchTeamRoster: mocks.fetchTeamRoster,
}))

vi.mock('@/lib/org', () => ({
  useOrgStore: (selector: (state: { getActiveOrg: () => unknown }) => unknown) =>
    selector({
      getActiveOrg: () => ({
        organizations: {
          name: 'Olympus',
        },
      }),
    }),
}))

vi.mock('@/lib/channels', () => ({
  addRosterEntriesToChannel: vi.fn(),
  channelsService: {
    markChannelRead: mocks.markChannelRead,
    startBrainstorm: vi.fn(),
    renameThread: vi.fn(),
  },
}))

vi.mock('../hooks/use-channels', () => ({
  useChannels: () => ({
    channels: [
      {
        id: 'channel-a',
        name: 'alpha',
        description: null,
        is_private: false,
        metadata: null,
      },
    ],
    loading: false,
    updateChannel: mocks.updateChannel,
  }),
}))

vi.mock('../hooks/use-channel-members', () => ({
  useChannelMembers: () => ({
    members: [],
    reload: mocks.reloadMembers,
  }),
}))

vi.mock('../hooks/use-channel-messages', () => ({
  useChannelMessages: () => ({
    messages: [],
    pinnedMessages: [],
    sendMessage: vi.fn(),
    editMessage: vi.fn(),
    deleteMessage: vi.fn(),
    reload: mocks.reloadMessages,
  }),
}))

vi.mock('../lib/pending-add-people', () => ({
  consumePendingChannelAddPeople: () => null,
}))

vi.mock('../lib/channel-space-brainstorm-toolbar', () => ({
  registerSpaceChannelBrainstormHandlers: mocks.registerSpaceChannelBrainstormHandlers,
  unregisterSpaceChannelBrainstormHandlers: mocks.unregisterSpaceChannelBrainstormHandlers,
}))

vi.mock('@/components/channels/AddPeopleToChannelModal', () => ({
  channelMembersToRosterKeys: () => new Set<string>(),
  AddPeopleToChannelModal: () => null,
}))

vi.mock('../components/ChannelChat', () => ({
  ChannelChat: ({ rosterAvatars }: { rosterAvatars: Map<string, string> }) => (
    <div data-testid="channel-chat" data-atlas-avatar={rosterAvatars.get('atlas') ?? ''} />
  ),
}))

vi.mock('../components/ChannelThreadPanel', () => ({
  ChannelThreadPanel: () => null,
}))

vi.mock('@/components/channels/StartBrainstormModal', () => ({
  StartBrainstormModal: () => null,
}))

vi.mock('@/components/deliverables/DeliverablePreviewModal', () => ({
  DeliverablePreviewModal: () => null,
}))

function rosterEntry(overrides: Partial<TeamRosterEntry>): TeamRosterEntry {
  return {
    participant_id: 'agent:atlas',
    kind: 'agent',
    org_id: 'org-1',
    user_id: null,
    agent_key: 'atlas',
    display_name: 'Atlas',
    avatar_url: 'https://cdn.example.test/atlas.png',
    role_label: null,
    specialties: [],
    accepts_assignments: true,
    delegation_notes: null,
    timezone: null,
    working_hours: null,
    out_of_office_until: null,
    current_load: 0,
    is_ready: true,
    agent_level: null,
    org_role: null,
    email: null,
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: null,
    ...overrides,
  }
}

describe('ChannelChatContainer', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads roster through shared team API and settles without refetch churn', async () => {
    const roster = [rosterEntry({})]
    let cachedRosterPromise: Promise<TeamRosterEntry[]> | null = null
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mocks.fetchTeamRoster.mockResolvedValue(roster)
    mocks.markChannelRead.mockResolvedValue(undefined)
    mocks.cachedFetch.mockImplementation(
      (_key: string, fetcher: () => Promise<TeamRosterEntry[]>) => {
        cachedRosterPromise ??= fetcher()
        return cachedRosterPromise
      },
    )

    const { rerender } = render(<ChannelChatContainer channelId="channel-a" />)

    await waitFor(() => {
      expect(mocks.fetchTeamRoster).toHaveBeenCalledWith({ kind: 'all' })
    })
    expect(mocks.fetchTeamRoster).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      expect(screen.getByTestId('channel-chat').getAttribute('data-atlas-avatar')).toBe(
        'https://cdn.example.test/atlas.png',
      )
    })
    await waitFor(() => {
      expect(mocks.markChannelRead).toHaveBeenCalledWith('channel-a')
    })

    rerender(<ChannelChatContainer channelId="channel-a" />)
    expect(mocks.fetchTeamRoster).toHaveBeenCalledTimes(1)
  })
})
