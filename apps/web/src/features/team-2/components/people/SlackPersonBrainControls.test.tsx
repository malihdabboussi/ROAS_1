import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SlackDiscoveredPerson } from '../../services/slack-people.service'
import { SlackPersonBrainControls } from './SlackPersonBrainControls'
import { SlackPersonInfoPanel } from './SlackPersonInfoPanel'

const person: SlackDiscoveredPerson = {
  id: 'person-bryce',
  platform_id: 'U_BRYCE',
  display_name: 'Bryce - Unit Bravo',
  username: null,
  avatar_url: null,
  title: 'Client Success Lead',
  timezone: null,
  email: null,
  is_bot: false,
  vibey_user_id: null,
  suggested_vibey_user_id: null,
  contact_id: null,
  person_brain_id: 'brain-bryce',
  relationship_kind: 'internal',
  relationship_source: 'manual',
  identity_match_method: 'none',
  identity_match_confidence: 0,
  delivery_mode: 'shadow',
  last_seen_at: '2026-07-20T00:00:00.000Z',
  brain_id: 'brain-bryce',
  brain_name: 'Bryce Person Brain',
  brain_kind: 'managed_person',
  slack_channels: [],
}

describe('Slack person Brain controls', () => {
  it('replaces creation with the connected Person Brain at the bottom', () => {
    render(
      <SlackPersonBrainControls
        person={person}
        portalUsers={[]}
        onConfirmIdentity={vi.fn()}
        onMapIdentity={vi.fn()}
        onCreateBrain={vi.fn()}
      />,
    )

    expect(screen.getByText('Bryce Person Brain')).toBeInTheDocument()
    expect(screen.getByText('Brain on')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create new Person Brain' })).toBeNull()
    const headings = screen.getAllByRole('heading').map((heading) => heading.textContent)
    expect(headings).toEqual(['Portal identity', 'Person Brain'])
  })

  it('shows a working collapse control on the person info card', () => {
    const onRequestCollapse = vi.fn()
    render(
      <SlackPersonInfoPanel
        person={person}
        portalUsers={[]}
        messageCount={0}
        actions={[]}
        onUpdateDeliveryMode={vi.fn()}
        onUpdateRelationshipKind={vi.fn()}
        onConfirmIdentity={vi.fn()}
        onMapIdentity={vi.fn()}
        onCreateBrain={vi.fn()}
        onRequestCollapse={onRequestCollapse}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Collapse person info' }))
    expect(onRequestCollapse).toHaveBeenCalledOnce()
  })
})
