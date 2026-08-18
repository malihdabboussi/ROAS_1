import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchWorkRequestReview, type WorkRequestReviewResponse } from '@/lib/work-requests'
import { WorkRequestChatResumeCard } from './WorkRequestChatResumeCard'

const mocks = vi.hoisted(() => ({
  wr: null as string | null,
  forceOpenToken: null as string | null,
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key: string) => (key === 'wr' ? mocks.wr : null) }),
}))

vi.mock('./WorkRequestReviewForceOpenContext', () => ({
  useWorkRequestReviewForceOpenToken: () => mocks.forceOpenToken,
}))

vi.mock('@/lib/work-requests', async () => {
  const actual = await vi.importActual<typeof import('@/lib/work-requests')>('@/lib/work-requests')
  return {
    ...actual,
    fetchWorkRequestReview: vi.fn(),
    updateWorkRequestReview: vi.fn(),
    finalizeWorkRequestReview: vi.fn(),
  }
})

const token = 'aseJrZz1ZQeZs9sBv0Adc-AJBg5IcliECGOIO9A5xZc'

function draftReview(): WorkRequestReviewResponse {
  return {
    state: 'draft',
    draft: {
      id: 'draft-1',
      client_workspace_id: 'ws-1',
      campaign_space_id: null,
      request_type: 'funnel',
      assignee_name: null,
      title: 'Redesign post-webinar replay sales page',
      description: 'Polish speaklikeaceo.com',
      due_date: '2026-08-18',
      priority: 'high',
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
      resume_conversation_id: 'd407a9a4-92ca-42eb-9cd7-2bddee6da3e1',
      task_url: null,
      clickup_url: null,
    },
    options: {
      client_workspaces: [{ id: 'ws-1', name: 'Yasir Khan Coaching LTD' }],
      campaign_spaces: [
        {
          id: 'space-1',
          name: 'Speak Like a CEO Workshop 2026 Webinar',
          client_workspace_id: 'ws-1',
        },
        {
          id: 'space-2',
          name: 'Yasir Khan Coaching LTD · Cohort Retargeting',
          client_workspace_id: 'ws-1',
        },
      ],
      team_members: [],
    },
  }
}

describe('WorkRequestChatResumeCard', () => {
  beforeEach(() => {
    mocks.wr = null
    mocks.forceOpenToken = null
    vi.mocked(fetchWorkRequestReview).mockReset()
    vi.mocked(fetchWorkRequestReview).mockResolvedValue(draftReview())
  })
  afterEach(cleanup)

  it('auto-opens the finalize cards on the public review host', async () => {
    mocks.forceOpenToken = token
    render(
      <WorkRequestChatResumeCard
        title="Service Request ready"
        reviewUrl={`https://app.roas.io/request-review/${token}`}
      />,
    )

    expect(await screen.findByText('Already on this request')).toBeInTheDocument()
    expect(screen.getByText('Which Campaign Space should own this?')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Message Pixel…')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue in chat' })).not.toBeInTheDocument()
  })
})
