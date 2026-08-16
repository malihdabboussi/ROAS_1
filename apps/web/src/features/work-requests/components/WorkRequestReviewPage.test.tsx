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
})
