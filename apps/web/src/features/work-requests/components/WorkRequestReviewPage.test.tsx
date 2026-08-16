import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchWorkRequestReview, requestWorkRequestRefresh } from '@/lib/work-requests'
import { WorkRequestReviewPage } from './WorkRequestReviewPage'

vi.mock('@/lib/work-requests', () => ({
  fetchWorkRequestReview: vi.fn(),
  updateWorkRequestReview: vi.fn(),
  finalizeWorkRequestReview: vi.fn(),
  requestWorkRequestRefresh: vi.fn(),
}))

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: () => <span>Loading request</span>,
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
        task_url: null,
        clickup_url: null,
      },
      options: {
        client_workspaces: [{ id: 'ws-1', name: 'Test webinar' }],
        campaign_spaces: [],
      },
    })

    render(<WorkRequestReviewPage token="safe-token" />)

    expect(await screen.findByText('CONTINUE IN CHAT')).toBeInTheDocument()
    expect(screen.getByText('SERVICE REQUEST CHAT')).toBeInTheDocument()
    expect(screen.getByText('Which client workspace is this for?')).toBeInTheDocument()
    expect(screen.queryByText('Review & Submit')).not.toBeInTheDocument()
  })
})
