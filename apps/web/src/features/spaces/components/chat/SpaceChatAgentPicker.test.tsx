import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

  it('uses the centered hero trigger for an empty chat', () => {
    render(
      <SpaceChatAgentPicker agents={[agent]} value="vibey" onChange={vi.fn()} variant="hero" />,
    )

    const trigger = screen.getByRole('button', {
      name: 'Talking with Vibey · CEO. Change agent.',
    })
    expect(trigger).toHaveClass('flex-col')
    expect(trigger.querySelector('.rounded-full')).toBeInTheDocument()
  })

  it('pins Pixel above a labeled list of other agents', () => {
    const reed = {
      ...agent,
      participant_id: 'agent:reed',
      agent_key: 'reed',
      display_name: 'Reed',
      role_label: 'Agency Strategist',
    }
    const pixel = { ...agent, display_name: 'Pixel' }

    render(<SpaceChatAgentPicker agents={[reed, pixel]} value="vibey" onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Talking with Pixel. Change agent.' }))

    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveTextContent('Pixel')
    expect(screen.getByText('Other agents')).toBeInTheDocument()
    expect(options[1]).toHaveTextContent('Reed')
  })
})
