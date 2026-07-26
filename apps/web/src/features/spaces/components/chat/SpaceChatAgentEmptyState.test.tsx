import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { SpaceChatAgentEmptyState } from './SpaceChatAgentEmptyState'

vi.mock('@/components/shell/ShellEmptyChatCapabilityScroller', () => ({
  ShellEmptyChatCapabilityScroller: ({
    onSelect,
  }: {
    onSelect: (quickStart: { id: string; prompt: string; systemContext: string }) => void
  }) => (
    <button
      type="button"
      onClick={() =>
        onSelect({
          id: 'image',
          prompt: 'Generate an image of ',
          systemContext: 'QUICK ACTION: Generate with generate_image.',
        })
      }
    >
      Image
    </button>
  ),
}))

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

  it('renders capability scroller when enabled', () => {
    const onSelectCapability = vi.fn()
    render(
      <SpaceChatAgentEmptyState
        agent={agent}
        showCapabilities
        onSelectCapability={onSelectCapability}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Image' }))
    expect(onSelectCapability).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'image',
        prompt: 'Generate an image of ',
        systemContext: expect.stringContaining('generate_image'),
      }),
    )
  })
})
