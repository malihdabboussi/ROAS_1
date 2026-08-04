import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { SpaceChatAgentEmptyState } from './SpaceChatAgentEmptyState'

const agent = {
  participant_id: 'agent:vibey',
  kind: 'agent',
  org_id: null,
  user_id: null,
  agent_key: 'vibey',
  display_name: 'Pixel',
  role_label: 'Marketing OS',
  avatar_url: '/pixel-avatar.png',
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
  created_at: '2026-07-24T00:00:00.000Z',
  updated_at: null,
} satisfies TeamRosterEntry

describe('SpaceChatAgentEmptyState', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows the active agent identity as the hero', () => {
    const { container } = render(<SpaceChatAgentEmptyState agent={agent} />)
    expect(screen.getByText('Pixel')).toBeInTheDocument()
    expect(screen.queryByText('Marketing OS')).not.toBeInTheDocument()
    expect(container.querySelector('img')).toHaveAttribute('src', '/pixel-avatar.png')
  })

  it('does not use the org name as the hero title', () => {
    render(<SpaceChatAgentEmptyState agent={agent} />)
    expect(screen.queryByText('ROAS')).not.toBeInTheDocument()
  })

  it('replaces the static identity when an agent picker is provided', () => {
    const { container } = render(
      <SpaceChatAgentEmptyState
        agent={agent}
        agentPicker={<button type="button">Choose Pixel</button>}
      />,
    )

    expect(screen.getByRole('button', { name: 'Choose Pixel' })).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('does not render quick starts under the hero', () => {
    render(<SpaceChatAgentEmptyState agent={agent} />)
    expect(screen.queryByRole('group', { name: 'Quick starts' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Deep Search' })).not.toBeInTheDocument()
  })
})
