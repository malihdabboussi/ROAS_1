import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SlackPeopleView } from './SlackPeopleView'

const hookMocks = vi.hoisted(() => ({
  createTestProposal: vi.fn().mockResolvedValue(undefined),
  reviewAction: vi.fn().mockResolvedValue(undefined),
  sendAction: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../hooks/use-slack-people', () => ({
  useSlackPeople: () => ({
    connected: true,
    people: [
      {
        id: 'person-1',
        platform_id: 'U1',
        display_name: 'Ada Lovelace',
        username: 'ada',
        avatar_url: null,
        title: 'Operations',
        timezone: null,
        email: 'ada@example.com',
        is_bot: false,
        vibey_user_id: 'user-1',
        contact_id: null,
        relationship_kind: 'team_member',
        delivery_mode: 'shadow',
        last_seen_at: '2026-07-19T00:00:00.000Z',
      },
    ],
    actions: [
      {
        id: 'action-1',
        agent_key: 'vibey',
        target_member_id: 'person-1',
        action_kind: 'message',
        proposed_content: 'Quick check-in — anything blocking you today?',
        rationale: 'Testing the review flow.',
        status: 'proposed',
        workflow_key: null,
        created_at: '2026-07-19T00:00:00.000Z',
      },
    ],
    loading: false,
    error: null,
    updateDeliveryMode: vi.fn(),
    createTestProposal: hookMocks.createTestProposal,
    reviewAction: hookMocks.reviewAction,
    sendAction: hookMocks.sendAction,
    reload: vi.fn(),
  }),
}))

describe('SlackPeopleView', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows resolved teammates and the review-first Shadow inbox', () => {
    render(<SlackPeopleView />)

    expect(screen.getAllByText('Ada Lovelace')).toHaveLength(2)
    expect(screen.getAllByText(/Platform teammate/)).toHaveLength(2)
    expect(screen.getByText('Shadow inbox')).toBeInTheDocument()
    expect(screen.getByText(/creating or reviewing a proposal never sends it/i)).toBeInTheDocument()
  })

  it('exposes explicit proposal and review actions', () => {
    render(<SlackPeopleView />)

    fireEvent.click(screen.getByRole('button', { name: 'Create test proposal for Ada Lovelace' }))
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(hookMocks.createTestProposal).toHaveBeenCalledWith('person-1')
    expect(hookMocks.reviewAction).toHaveBeenCalledWith('action-1', 'approved')
    expect(hookMocks.reviewAction).toHaveBeenCalledWith('action-1', 'dismissed')
  })
})
