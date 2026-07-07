import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'

const mocks = vi.hoisted(() => ({
  fetchTeamRoster: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock('@/lib/team/team-roster-api', () => ({
  fetchTeamRoster: mocks.fetchTeamRoster,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mocks.getUser,
    },
  }),
}))

import {
  persistActiveConversationId,
  readStoredAgentConversationId,
  readStoredConversationId,
  useSpacesStore,
} from './use-spaces-store'

describe('spaces active conversation storage', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.fetchTeamRoster.mockReset()
    mocks.getUser.mockReset()
    useSpacesStore.setState({
      roster: [],
      rosterLoaded: false,
      currentUserId: null,
    })
  })

  it('stores separate active conversations per agent in the same space', () => {
    persistActiveConversationId('space-1', 'conversation-vibey', 'vibey')
    persistActiveConversationId('space-1', 'conversation-hr', 'hr')

    expect(readStoredAgentConversationId('space-1', 'vibey')).toBe('conversation-vibey')
    expect(readStoredAgentConversationId('space-1', 'hr')).toBe('conversation-hr')
  })

  it('clears only the selected agent conversation', () => {
    persistActiveConversationId('space-1', 'conversation-vibey', 'vibey')
    persistActiveConversationId('space-1', 'conversation-hr', 'hr')

    persistActiveConversationId('space-1', null, 'hr')

    expect(readStoredAgentConversationId('space-1', 'vibey')).toBe('conversation-vibey')
    expect(readStoredAgentConversationId('space-1', 'hr')).toBeNull()
  })

  it('keeps legacy Vibey storage compatible', () => {
    persistActiveConversationId('space-1', 'conversation-vibey', 'vibey')

    expect(readStoredConversationId('space-1')).toBe('conversation-vibey')
    expect(readStoredAgentConversationId('space-1', 'vibey')).toBe('conversation-vibey')
  })

  it('loads roster through the shared team roster API', async () => {
    const roster: TeamRosterEntry[] = [
      {
        participant_id: 'human:user-1',
        kind: 'human',
        org_id: 'org-1',
        user_id: 'user-1',
        agent_key: null,
        display_name: 'User One',
        avatar_url: null,
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
        email: 'user@example.com',
        created_at: '2026-06-21T00:00:00.000Z',
        updated_at: null,
      },
    ]
    mocks.fetchTeamRoster.mockResolvedValue(roster)
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    await useSpacesStore.getState().loadRoster()

    expect(mocks.fetchTeamRoster).toHaveBeenCalledWith({ kind: 'all' })
    expect(useSpacesStore.getState().roster).toEqual(roster)
    expect(useSpacesStore.getState().currentUserId).toBe('user-1')
    expect(useSpacesStore.getState().rosterLoaded).toBe(true)
  })
})
