import { describe, expect, it } from 'vitest'
import type { TeamRosterEntry } from '@/features/org/services/org.service'
import {
  extractAssigneesFromActivitySide,
  formatAssigneeChangeActivityLabel,
} from '../format-assignee-change-activity'

const ROSTER: TeamRosterEntry[] = [
  {
    participant_id: 'user-2',
    kind: 'human',
    org_id: null,
    user_id: 'user-2',
    agent_key: null,
    display_name: 'Dylan ROAS',
    email: null,
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
    created_at: '',
    updated_at: null,
  },
]

describe('extractAssigneesFromActivitySide', () => {
  it('reads nested API to.primary', () => {
    expect(
      extractAssigneesFromActivitySide({
        assignees: [{ type: 'human', id: 'user-2' }],
        primary: { type: 'human', id: 'user-2' },
      }),
    ).toEqual([{ type: 'human', id: 'user-2' }])
  })

  it('reads from array', () => {
    expect(extractAssigneesFromActivitySide([{ type: 'human', id: 'user-2' }])).toEqual([
      { type: 'human', id: 'user-2' },
    ])
  })

  it('returns empty for unassigned primary', () => {
    expect(
      extractAssigneesFromActivitySide({
        assignees: [],
        primary: { type: 'unassigned', id: null },
      }),
    ).toEqual([])
  })
})

describe('formatAssigneeChangeActivityLabel', () => {
  it('shows assigned name for nested API payload', () => {
    expect(
      formatAssigneeChangeActivityLabel(
        {
          from: [{ type: 'unassigned', id: null }],
          to: {
            assignees: [{ type: 'human', id: 'user-2' }],
            primary: { type: 'human', id: 'user-2' },
          },
        },
        ROSTER,
      ),
    ).toBe('assigned')
  })

  it('shows unassigned when to has no assignee', () => {
    expect(
      formatAssigneeChangeActivityLabel(
        {
          from: [{ type: 'human', id: 'user-2' }],
          to: { assignees: [], primary: { type: null, id: null } },
        },
        ROSTER,
      ),
    ).toBe('unassigned')
  })

  it('supports legacy string to label', () => {
    expect(formatAssigneeChangeActivityLabel({ from: null, to: 'Dylan ROAS' }, ROSTER)).toBe(
      'assigned',
    )
  })
})
