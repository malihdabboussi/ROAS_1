import { describe, expect, it } from 'vitest'
import { planProviderFollowUpUpserts } from './upsert-provider-follow-ups'

const action = (text: string, key = 'fathom:1:action:0') => ({
  sourceKey: key,
  sourceText: text,
  assigneeName: 'Nate',
  assigneeEmail: 'nate@roas.co',
  recordingTimestamp: '00:12',
  recordingPlaybackUrl: 'https://fathom.example/1',
  completed: false,
  userGenerated: false,
  raw: {},
})

describe('planProviderFollowUpUpserts', () => {
  it('inserts follow_ups for new provider actions', () => {
    expect(
      planProviderFollowUpUpserts({
        meetingItemId: 'meeting-1',
        meetingTitle: 'Weekly',
        actions: [action('Send recap')],
        existingFollowUps: [],
      }),
    ).toEqual([
      expect.objectContaining({
        kind: 'insert',
        title: 'Send recap',
        status: 'logged',
        customData: expect.objectContaining({
          entry_type: 'follow_up',
          provider_source_key: 'fathom:1:action:0',
          suggested_assignee_email: 'nate@roas.co',
          provider_evidence: expect.objectContaining({ completed_in_provider: false }),
        }),
      }),
    ])
  })

  it('merges into a manual follow_up with the same title', () => {
    const plans = planProviderFollowUpUpserts({
      meetingItemId: 'meeting-1',
      meetingTitle: 'Weekly',
      actions: [action('Send Recap!')],
      existingFollowUps: [
        {
          id: 'fu-1',
          title: 'send recap',
          status: 'logged',
          source: 'manual',
          custom_data: {
            entry_type: 'follow_up',
            source_call_item_id: 'meeting-1',
          },
        },
      ],
    })
    expect(plans).toEqual([
      expect.objectContaining({
        kind: 'update',
        itemId: 'fu-1',
        customData: expect.objectContaining({
          provider_source_key: 'fathom:1:action:0',
          entry_type: 'follow_up',
        }),
      }),
    ])
  })

  it('returns empty when Fathom sent no actions', () => {
    expect(
      planProviderFollowUpUpserts({
        meetingItemId: 'meeting-1',
        meetingTitle: null,
        actions: [],
        existingFollowUps: [],
      }),
    ).toEqual([])
  })
})
