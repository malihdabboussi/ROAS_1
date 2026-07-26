import { describe, expect, it } from 'vitest'
import type { ChannelMention } from '@/lib/channels'
import type { TeamRosterEntry } from '@/lib/team'
import { getMissingMentionRosterEntries } from './mention-membership'

const vibey: TeamRosterEntry = {
  participant_id: 'agent:vibey',
  kind: 'agent',
  org_id: 'org-1',
  user_id: null,
  agent_key: 'vibey',
  display_name: 'Vibey',
  avatar_url: null,
  role_label: 'CEO',
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
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: null,
}

describe('getMissingMentionRosterEntries', () => {
  it('returns mentioned addable agents only when they are not channel members', () => {
    const mentions: ChannelMention[] = [
      { type: 'agent', agent_key: 'vibey', label: 'Vibey' },
      { type: 'agent', agent_key: 'vibey', label: 'Vibey' },
    ]

    expect(getMissingMentionRosterEntries(mentions, [vibey], new Set())).toEqual([vibey])
    expect(getMissingMentionRosterEntries(mentions, [vibey], new Set(['agent:vibey']))).toEqual([])
  })
})
