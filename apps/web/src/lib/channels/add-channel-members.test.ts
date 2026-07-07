import { describe, expect, it, vi } from 'vitest'
import type { TeamRosterEntry } from '@/lib/team'
import { addRosterEntriesToChannel } from './add-channel-members'

const mocks = vi.hoisted(() => ({
  addMember: vi.fn(),
}))

vi.mock('./channels-api', () => ({
  channelsService: {
    addMember: mocks.addMember,
  },
}))

function rosterEntry(overrides: Partial<TeamRosterEntry>): TeamRosterEntry {
  return {
    participant_id: 'agent:atlas',
    kind: 'agent',
    org_id: 'org-1',
    user_id: null,
    agent_key: 'atlas',
    display_name: 'Atlas',
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
    email: null,
    created_at: '2026-06-24T00:00:00.000Z',
    updated_at: null,
    ...overrides,
  }
}

describe('addRosterEntriesToChannel', () => {
  it('adds human and agent roster entries with edit access', async () => {
    mocks.addMember.mockResolvedValue({ member: { id: 'member-1' } })

    await addRosterEntriesToChannel('channel-a', [
      rosterEntry({
        participant_id: 'human:user-3',
        kind: 'human',
        user_id: 'user-3',
        agent_key: null,
        display_name: 'Ada Lovelace',
      }),
      rosterEntry({}),
      rosterEntry({
        participant_id: 'agent:missing',
        kind: 'agent',
        agent_key: null,
        display_name: 'Missing Agent Key',
      }),
    ])

    expect(mocks.addMember).toHaveBeenCalledTimes(2)
    expect(mocks.addMember).toHaveBeenNthCalledWith(1, 'channel-a', {
      member_type: 'user',
      user_id: 'user-3',
      role: 'edit',
    })
    expect(mocks.addMember).toHaveBeenNthCalledWith(2, 'channel-a', {
      member_type: 'agent',
      agent_key: 'atlas',
      role: 'edit',
    })
  })
})
