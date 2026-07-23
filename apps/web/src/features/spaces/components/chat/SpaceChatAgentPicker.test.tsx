import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { SpaceChatAgentPicker } from './SpaceChatAgentPicker'

const agent: TeamRosterEntry = {
  participant_id: 'agent:vibey',
  kind: 'agent',
  org_id: null,
  user_id: null,
  agent_key: 'vibey',
  display_name: 'Vibey · CEO',
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
  created_at: '',
  updated_at: null,
}

describe('SpaceChatAgentPicker', () => {
  afterEach(() => cleanup())

  it('uses the standard agent trigger in space chat', () => {
    render(<SpaceChatAgentPicker agents={[agent]} value="vibey" onChange={vi.fn()} />)

    const trigger = screen.getByRole('button', { name: 'Talking with Vibey · CEO. Change agent.' })
    expect(trigger).toBeTruthy()
  })
})
