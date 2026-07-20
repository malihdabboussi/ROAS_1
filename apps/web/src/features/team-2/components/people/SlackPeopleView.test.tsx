import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SlackPeopleView } from './SlackPeopleView'

const hookMocks = vi.hoisted(() => ({
  createTestProposal: vi.fn().mockResolvedValue(undefined),
  createProposal: vi.fn().mockResolvedValue(undefined),
  mapIdentity: vi.fn().mockResolvedValue(undefined),
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

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigationMocks.push }),
  useSearchParams: () => navigationMocks.searchParams,
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
    portalUsers: [
      {
        user_id: 'user-1',
        display_name: 'Ada Lovelace',
        email: 'ada@example.com',
        avatar_url: null,
        role: 'admin',
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
    mapIdentity: hookMocks.mapIdentity,
    loadPersonActivity: hookMocks.loadPersonActivity,
    createTestProposal: hookMocks.createTestProposal,
    createProposal: hookMocks.createProposal,
    reviewAction: hookMocks.reviewAction,
    sendAction: hookMocks.sendAction,
    reload: vi.fn(),
  }),
}))

describe('SlackPeopleView', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    navigationMocks.searchParams = new URLSearchParams()
  })

  it('shows the Shadow conversation summary before the Slack roster', () => {
    render(<SlackPeopleView />)

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText(/Internal · shadow/i)).toBeInTheDocument()
    const shadowInbox = screen.getByText('Shadow conversations')
    const slackPeople = screen.getByRole('heading', { name: 'People' })
    expect(
      shadowInbox.compareDocumentPosition(slackPeople) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('navigates to a dedicated person screen instead of opening inline', () => {
    render(<SlackPeopleView />)

    fireEvent.click(screen.getByRole('button', { name: 'Open Ada Lovelace' }))

    expect(navigationMocks.push).toHaveBeenCalledWith('/team?section=people&person=person-1', {
      scroll: false,
    })
    expect(hookMocks.loadPersonActivity).not.toHaveBeenCalled()
  })

  it('loads the User Brain and Slack timeline on the dedicated person screen', async () => {
    navigationMocks.searchParams = new URLSearchParams('section=people&person=person-1')
    render(<SlackPeopleView />)

    await waitFor(() => expect(hookMocks.loadPersonActivity).toHaveBeenCalledWith('person-1'))
    expect(await screen.findByText('I can pull that together.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /brain/i }))
    expect(screen.getByText('Ada Brain')).toBeInTheDocument()
    expect(screen.getByText('Portal identity')).toBeInTheDocument()
  })

  it('lets an admin classify a person without changing delivery mode', () => {
    navigationMocks.searchParams = new URLSearchParams('section=people&person=person-1')
    render(<SlackPeopleView />)

    fireEvent.click(screen.getByRole('button', { name: 'External' }))

    expect(hookMocks.updateRelationshipKind).toHaveBeenCalledWith('person-1', 'external')
  })

  it('adds an agent draft to Shadow review without navigating or sending', async () => {
    navigationMocks.searchParams = new URLSearchParams('section=people&person=person-1')
    render(<SlackPeopleView />)

    fireEvent.change(screen.getByPlaceholderText('Draft what the agent would say...'), {
      target: { value: 'Anything blocking the launch today?' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add message to Shadow review' }))

    await waitFor(() =>
      expect(hookMocks.createProposal).toHaveBeenCalledWith(
        'person-1',
        'Anything blocking the launch today?',
      ),
    )
    expect(navigationMocks.push).not.toHaveBeenCalled()
  })

  it('opens a dedicated Shadow conversations screen with review actions', () => {
    navigationMocks.searchParams = new URLSearchParams('section=people&peopleView=shadow')
    render(<SlackPeopleView />)

    expect(screen.getByRole('heading', { name: 'SHADOW CONVERSATIONS' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(hookMocks.reviewAction).toHaveBeenCalledWith('action-1', 'approved')
    expect(hookMocks.reviewAction).toHaveBeenCalledWith('action-1', 'dismissed')
  })
})
