import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SlackDiscoveredPerson, SlackShadowAction } from '../../services/slack-people.service'
import { SlackShadowConversationView } from './SlackShadowConversationView'

const person = {
  id: 'person-1',
  display_name: 'Carol Garcia',
  delivery_mode: 'shadow',
} as SlackDiscoveredPerson
const secondPerson = {
  id: 'person-2',
  display_name: 'Aaron Mckeague',
  delivery_mode: 'active',
} as SlackDiscoveredPerson

const action = (overrides: Partial<SlackShadowAction>): SlackShadowAction =>
  ({
    id: 'action-1',
    agent_key: 'pixel',
    target_member_id: 'person-1',
    action_kind: 'message',
    proposed_content: 'Please follow up with the client.',
    rationale: 'A client question needs an internal owner.',
    status: 'proposed',
    workflow_key: 'slack_team:all',
    source_channel_id: 'C1',
    source_message_ts: '123.456',
    sent_at: null,
    metadata: {},
    created_at: '2026-07-22T12:00:00.000Z',
    ...overrides,
  }) as SlackShadowAction

afterEach(cleanup)

describe('SlackShadowConversationView', () => {
  it('keeps team signals out of person conversations and routes them to Signals', () => {
    const onOpenSignals = vi.fn()

    render(
      <SlackShadowConversationView
        actions={[
          action({ id: 'person-action' }),
          action({
            id: 'team-signal',
            target_member_id: null,
            action_kind: 'workflow',
            proposed_content: 'A client asked for payment details.',
          }),
        ]}
        peopleById={new Map([[person.id, person]])}
        onBack={vi.fn()}
        onOpenPerson={vi.fn()}
        onOpenSignals={onOpenSignals}
        onReview={vi.fn()}
        onSend={vi.fn()}
      />,
    )

    expect(screen.queryByText('Unknown person')).not.toBeInTheDocument()
    expect(screen.queryByText('A client asked for payment details.')).not.toBeInTheDocument()
    expect(screen.getByText('1 team signal needs routing')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Review Signals' }))
    expect(onOpenSignals).toHaveBeenCalledTimes(1)
  })

  it('filters the proposal ledger by person and opens their full conversation', () => {
    const onOpenPerson = vi.fn()

    render(
      <SlackShadowConversationView
        actions={[
          action({ id: 'carol-action', proposed_content: 'Carol should review the client risk.' }),
          action({
            id: 'aaron-action',
            target_member_id: secondPerson.id,
            proposed_content: 'Aaron should review the campaign pacing.',
          }),
        ]}
        peopleById={
          new Map([
            [person.id, person],
            [secondPerson.id, secondPerson],
          ])
        }
        onBack={vi.fn()}
        onOpenPerson={onOpenPerson}
        onOpenSignals={vi.fn()}
        onReview={vi.fn()}
        onSend={vi.fn()}
      />,
    )

    expect(screen.getByText('Carol should review the client risk.')).toBeVisible()
    expect(screen.getByText('Aaron should review the campaign pacing.')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Carol Garcia, 1 proposal' }))

    expect(screen.getByText('Carol should review the client risk.')).toBeVisible()
    expect(screen.queryByText('Aaron should review the campaign pacing.')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open conversation' }))
    expect(onOpenPerson).toHaveBeenCalledWith(person)
  })
})
