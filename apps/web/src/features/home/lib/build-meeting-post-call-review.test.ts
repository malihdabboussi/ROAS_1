import { describe, expect, it } from 'vitest'
import type { MeetingWorkspaceBundle } from '../services/meeting-workspace-api'
import { buildMeetingPostCallReview } from './build-meeting-post-call-review'

describe('buildMeetingPostCallReview', () => {
  it('preserves Slack copy while listing the current non-dismissed follow-ups', () => {
    const review = buildMeetingPostCallReview(
      {
        meeting: {
          id: 'meeting-1',
          title: 'Yasir webinar review',
          description: 'Fallback summary',
          custom_data: {
            client_workspace_name: 'Yasir Khan',
            slack_follow_up_confirm: {
              review_summary: 'The same summary shown in Slack.',
              space_item_ids: ['follow-up-1', 'follow-up-2', 'follow-up-3'],
              draft_message: 'Client-ready follow-up.',
            },
          },
        },
        workspace: null,
        recordings: [],
        actions: [
          { id: 'follow-up-1', title: 'First task', status: 'proposed' },
          { id: 'follow-up-2', title: 'Second task', status: 'confirmed' },
          { id: 'follow-up-3', title: 'Dismissed task', status: 'dismissed' },
        ] as MeetingWorkspaceBundle['actions'],
        snippets: [],
        deliverables: [],
        context_links: [],
        continuity: { prior_meeting_item_id: null, unresolved_commitments: [] },
      },
      'space-1',
      'conversation-1',
      'meeting-1',
      'Yasir webinar review',
      'Yasir, Dylan, Nate',
    )

    expect(review).toMatchObject({
      summary: 'The same summary shown in Slack.',
      clientWorkspace: 'Yasir Khan',
      clientCampaign: null,
      followUpCount: 2,
      followUps: [
        { id: 'follow-up-1', title: 'First task', status: 'proposed' },
        { id: 'follow-up-2', title: 'Second task', status: 'confirmed' },
      ],
      followUpMessage: 'Client-ready follow-up.',
    })
  })

  it('resolves attendee labels and prepares a fallback follow-up message', () => {
    const review = buildMeetingPostCallReview(
      {
        meeting: {
          id: 'meeting-1',
          title: 'Yasir webinar review',
          description: null,
          custom_data: {
            meeting_summary: 'We aligned on the webinar plan.',
            client_campaign: {
              client_id: 'client-1',
              client_name: 'Yasir Khan Coaching LTD',
              campaign_id: 'campaign-1',
              campaign_name: 'Webinar',
            },
          },
        },
        workspace: null,
        recordings: [],
        actions: [
          { id: 'follow-up-1', title: 'Build the VSL funnel', status: 'confirmed' },
        ] as MeetingWorkspaceBundle['actions'],
        snippets: [],
        deliverables: [],
        context_links: [],
        continuity: { prior_meeting_item_id: null, unresolved_commitments: [] },
        attendee_labels: ['Yasir Khan', 'Dylan Vanas'],
      },
      'space-1',
      'conversation-1',
      'meeting-1',
      'Yasir webinar review',
      '',
    )

    expect(review.attendees).toBe('Yasir Khan, Dylan Vanas')
    expect(review.clientCampaign?.client_id).toBe('client-1')
    expect(review.followUpMessage).toContain('(TO-DO) Build the VSL funnel')
  })
})
