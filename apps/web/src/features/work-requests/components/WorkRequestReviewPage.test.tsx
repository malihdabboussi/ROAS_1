import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchWorkRequestReview, requestWorkRequestRefresh } from '@/lib/work-requests'
import { WorkRequestReviewPage } from './WorkRequestReviewPage'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  }),
}))

vi.mock('@/lib/work-requests', () => ({
  fetchWorkRequestReview: vi.fn(),
  updateWorkRequestReview: vi.fn(),
  finalizeWorkRequestReview: vi.fn(),
  requestWorkRequestRefresh: vi.fn(),
}))

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: () => <span>Loading request</span>,
}))

vi.mock('@/components/calendar/MonthCalendar', () => ({
  MonthCalendar: ({ onSelectDate }: { onSelectDate: (date: Date) => void }) => (
    <button type="button" onClick={() => onSelectDate(new Date(2026, 7, 22))}>
      Pick date
    </button>
  ),
}))

describe('WorkRequestReviewPage', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(cleanup)

  it('renders expired links without exposing draft data', async () => {
    vi.mocked(fetchWorkRequestReview).mockResolvedValue({ state: 'expired' })

    render(<WorkRequestReviewPage token="safe-token" />)

    expect(await screen.findByText('REVIEW LINK EXPIRED')).toBeInTheDocument()
    expect(screen.queryByText('Build launch funnel')).not.toBeInTheDocument()
  })

  it('moves revoked links into the safe refresh-required state', async () => {
    vi.mocked(fetchWorkRequestReview).mockResolvedValue({ state: 'revoked' })
    vi.mocked(requestWorkRequestRefresh).mockResolvedValue({
      state: 'refresh_required',
      message: 'Ask in the original thread.',
    })

    render(<WorkRequestReviewPage token="safe-token" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Request a fresh link' }))

    expect(await screen.findByText('FRESH LINK NEEDED')).toBeInTheDocument()
    expect(screen.getByText('Ask in the original thread.')).toBeInTheDocument()
  })

  it('preserves the native task message when the ClickUp mirror is pending', async () => {
    vi.mocked(fetchWorkRequestReview).mockResolvedValue({
      state: 'finalized',
      final_task_id: 'task-1',
      sync_status: 'sync_failed',
    })

    render(<WorkRequestReviewPage token="safe-token" />)

    expect(await screen.findByText('SERVICE REQUEST SUBMITTED')).toBeInTheDocument()
    expect(
      screen.getByText('The ROAS task is saved. The ClickUp mirror still needs another try.'),
    ).toBeInTheDocument()
  })

  it('opens the chat-native review flow for drafts', async () => {
    vi.mocked(fetchWorkRequestReview).mockResolvedValue({
      state: 'draft',
      draft: {
        id: 'draft-1',
        client_workspace_id: 'ws-1',
        campaign_space_id: null,
        request_type: 'general',
        assignee_name: null,
        title: 'Production review smoke test',
        description: 'Controlled smoke test',
        due_date: '2026-08-22',
        priority: 'medium',
        structured_fields: {},
        links: [],
        required_fields: ['title'],
        missing_fields: [],
        assets: [],
        dependencies: [],
        requester: { name: null },
        status: 'draft',
        expires_at: '2026-08-17T00:00:00.000Z',
        final_task_id: null,
        sync_status: 'not_started',
        resume_conversation_id: null,
        task_url: null,
        clickup_url: null,
      },
      options: {
        client_workspaces: [{ id: 'ws-1', name: 'Test webinar' }],
        campaign_spaces: [],
        team_members: [{ id: 'u-1', name: 'Sam Editor' }],
      },
    })

    render(<WorkRequestReviewPage token="safe-token" />)

    expect(await screen.findByPlaceholderText('Message Pixel…')).toBeInTheDocument()
    expect(screen.getAllByText('Production review smoke test').length).toBeGreaterThan(0)
    expect(screen.getByText('Already on this request')).toBeInTheDocument()
    expect(screen.getByText('Which Campaign Space should own this?')).toBeInTheDocument()
    expect(screen.queryByText('CONTINUE IN CHAT')).not.toBeInTheDocument()
    expect(screen.queryByText('ROAS SERVICE REQUEST')).not.toBeInTheDocument()
    expect(screen.queryByText('SERVICE REQUEST CHAT')).not.toBeInTheDocument()
    expect(screen.queryByText('Review & Submit')).not.toBeInTheDocument()
    expect(screen.queryByText('Any dependencies?')).not.toBeInTheDocument()
  })
})
