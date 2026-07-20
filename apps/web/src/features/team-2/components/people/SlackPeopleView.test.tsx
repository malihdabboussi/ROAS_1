import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SlackPeopleView } from './SlackPeopleView'

const hookMocks = vi.hoisted(() => ({
  createTestProposal: vi.fn().mockResolvedValue(undefined),
  reviewAction: vi.fn().mockResolvedValue(undefined),
  sendAction: vi.fn().mockResolvedValue(undefined),
  updateRelationshipKind: vi.fn().mockResolvedValue(undefined),
  confirmSuggestedIdentity: vi.fn().mockResolvedValue(undefined),
  loadPersonActivity: vi.fn().mockResolvedValue({
    channel_id: 'D1',
    messages: [
      {
        ts: '123.500',
        text: 'I can pull that together.',
        direction: 'outbound',
      },
    ],
    actions: [],
  }),
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
        suggested_vibey_user_id: null,
        contact_id: null,
        relationship_kind: 'internal',
        relationship_source: 'inferred',
        identity_match_method: 'email',
        identity_match_confidence: 1,
        delivery_mode: 'shadow',
        brain_id: 'brain-1',
        brain_name: 'Ada Brain',
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
    updateRelationshipKind: hookMocks.updateRelationshipKind,
    confirmSuggestedIdentity: hookMocks.confirmSuggestedIdentity,
    loadPersonActivity: hookMocks.loadPersonActivity,
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

  it('shows the Shadow inbox before the Slack roster', () => {
    render(<SlackPeopleView />)

    expect(screen.getAllByText('Ada Lovelace')).toHaveLength(2)
    expect(screen.getByText('Internal')).toBeInTheDocument()
    expect(screen.getByText(/Internal · Portal user/)).toBeInTheDocument()
    const shadowInbox = screen.getByText('Shadow inbox')
    const slackPeople = screen.getByText('Slack people')
    expect(
      shadowInbox.compareDocumentPosition(slackPeople) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.getByText(/creating or reviewing a proposal never sends it/i)).toBeInTheDocument()
  })

  it('opens a person activity view with their User Brain and Slack timeline', async () => {
    render(<SlackPeopleView />)

    fireEvent.click(screen.getByRole('button', { name: 'Open Ada Lovelace' }))

    await waitFor(() => expect(hookMocks.loadPersonActivity).toHaveBeenCalledWith('person-1'))
    expect(screen.getByText('Ada Brain')).toBeInTheDocument()
    expect(screen.getByText('I can pull that together.')).toBeInTheDocument()
    expect(screen.getByText('Portal user')).toBeInTheDocument()
  })

  it('lets an admin classify a person without changing delivery mode', () => {
    render(<SlackPeopleView />)

    fireEvent.click(screen.getByRole('button', { name: 'Mark Ada Lovelace external' }))

    expect(hookMocks.updateRelationshipKind).toHaveBeenCalledWith('person-1', 'external')
  })

  it('brings the Shadow inbox into view after creating a test proposal', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    render(<SlackPeopleView />)

    fireEvent.click(screen.getByRole('button', { name: 'Create test proposal for Ada Lovelace' }))

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
    expect(hookMocks.createTestProposal).toHaveBeenCalledWith('person-1')
  })

  it('exposes explicit proposal review actions', () => {
    render(<SlackPeopleView />)

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(hookMocks.reviewAction).toHaveBeenCalledWith('action-1', 'approved')
    expect(hookMocks.reviewAction).toHaveBeenCalledWith('action-1', 'dismissed')
  })
})
