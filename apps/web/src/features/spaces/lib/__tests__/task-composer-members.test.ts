import { describe, expect, it } from 'vitest'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { buildTaskComposerMembersFromRoster } from '../task-composer-members'

function rosterEntry(patch: Partial<TeamRosterEntry> & Pick<TeamRosterEntry, 'participant_id'>) {
  return {
    participant_id: patch.participant_id,
    kind: patch.kind ?? 'human',
    org_id: patch.org_id ?? null,
    user_id: patch.user_id ?? null,
    agent_key: patch.agent_key ?? null,
    display_name: patch.display_name ?? 'Member',
    avatar_url: patch.avatar_url ?? null,
    role_label: patch.role_label ?? null,
    specialties: patch.specialties ?? [],
    accepts_assignments: patch.accepts_assignments ?? true,
    delegation_notes: patch.delegation_notes ?? null,
    timezone: patch.timezone ?? null,
    working_hours: patch.working_hours ?? null,
    out_of_office_until: patch.out_of_office_until ?? null,
    current_load: patch.current_load ?? 0,
    is_ready: patch.is_ready ?? true,
    agent_level: patch.agent_level ?? null,
    org_role: patch.org_role ?? null,
    email: patch.email ?? null,
    created_at: patch.created_at ?? '2026-06-21T00:00:00.000Z',
    updated_at: patch.updated_at ?? null,
  } satisfies TeamRosterEntry
}

describe('buildTaskComposerMembersFromRoster', () => {
  it('adds the current user when absent and maps roster humans and agents', () => {
    const members = buildTaskComposerMembersFromRoster(
      [
        rosterEntry({
          participant_id: 'human-1',
          user_id: 'user-1',
          display_name: 'Alex',
          avatar_url: 'https://example.com/alex.png',
        }),
        rosterEntry({
          participant_id: 'agent-1',
          kind: 'agent',
          agent_key: 'atlas',
          display_name: 'Atlas',
        }),
      ],
      'current-user',
    )

    expect(members).toMatchObject([
      {
        id: 'task-auth-user-current-user',
        member_type: 'user',
        user_id: 'current-user',
        agent_key: null,
        profile: { id: 'current-user', full_name: 'Me', avatar_url: null },
      },
      {
        id: 'task-roster-user-user-1',
        member_type: 'user',
        user_id: 'user-1',
        agent_key: null,
        profile: { id: 'user-1', full_name: 'Alex', avatar_url: 'https://example.com/alex.png' },
      },
      {
        id: 'task-roster-agent-atlas',
        member_type: 'agent',
        user_id: null,
        agent_key: 'atlas',
        profile: { id: 'atlas', full_name: 'Atlas', avatar_url: null },
      },
    ])
  })

  it('uses the provided self profile when adding the current user', () => {
    const members = buildTaskComposerMembersFromRoster([], 'current-user', {
      selfDisplayName: 'Dana',
      selfAvatarUrl: 'https://example.com/dana.png',
    })

    expect(members[0]).toMatchObject({
      id: 'task-auth-user-current-user',
      profile: {
        id: 'current-user',
        full_name: 'Dana',
        avatar_url: 'https://example.com/dana.png',
      },
    })
  })

  it('does not duplicate the current user when the roster already includes them', () => {
    const members = buildTaskComposerMembersFromRoster(
      [
        rosterEntry({
          participant_id: 'current-human',
          user_id: 'current-user',
          display_name: 'Current User',
        }),
      ],
      'current-user',
    )

    expect(members).toHaveLength(1)
    expect(members[0]).toMatchObject({
      id: 'task-roster-user-current-user',
      member_type: 'user',
      user_id: 'current-user',
      profile: { id: 'current-user', full_name: 'Current User' },
    })
  })
})
