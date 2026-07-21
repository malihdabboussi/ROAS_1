import { describe, expect, it } from 'vitest'
import {
  buildMeetingFollowUpActionLedger,
  classifyFollowUpRoute,
} from '../meeting-follow-up-action-ledger'

describe('meeting follow-up action ledger', () => {
  it('keeps a page preview handoff as an internal follow-up', () => {
    expect(classifyFollowUpRoute('Send Rafay webinar page preview link')).toMatchObject({
      route: 'am_follow_up',
      taskType: null,
    })
  })

  it('holds compound prerequisite work for clarification instead of delegating it early', () => {
    expect(
      classifyFollowUpRoute('Confirm Christian weekly budget with Nate, then have James launch'),
    ).toMatchObject({
      route: 'needs_clarification',
      taskType: null,
    })
  })

  it('keeps media buying handoffs internal when the wording is a send/share', () => {
    expect(
      classifyFollowUpRoute('Send Assure Group LinkedIn targeting to James via Media Buying Ops'),
    ).toMatchObject({
      route: 'am_follow_up',
      taskType: null,
    })
  })

  it('builds a durable action ledger payload for existing space items', () => {
    expect(
      buildMeetingFollowUpActionLedger({
        item: {
          id: 'fu-1',
          title: 'Reformat webinar page',
          custom_data: { suggested_assignee_name: 'Nefi Blanco' },
        },
        callItemId: 'call-1',
        status: 'confirmed',
        now: '2026-07-20T12:00:00.000Z',
      }),
    ).toMatchObject({
      kind: 'post_call_action',
      status: 'confirmed',
      route: 'page_grader_candidate',
      owner_name: 'Nefi Blanco',
      source_call_item_id: 'call-1',
      page_grader: {
        candidate: true,
        task_type: 'funnel',
        task_subtype: 'Webinar Registration Funnel',
        delegation_status: 'ready',
      },
    })
  })
})
