import { describe, expect, it } from 'vitest'
import { buildDescription, resolvePageGraderCampaignId } from './page-grader-api.helpers'

describe('buildDescription', () => {
  it('does not repeat notes when they are an exact copy of description', () => {
    const brief =
      'Edit the 12 videos.\n\nSource folder: https://drive.google.com/x\n\nContext: ASAP.'
    expect(buildDescription({ description: brief, notes: brief }, {})).toBe(brief)
  })

  it('keeps distinct notes and meeting context once each', () => {
    expect(
      buildDescription(
        { description: 'Primary brief', notes: 'Extra delivery note' },
        { parent_meeting_title: 'Weekly sync' },
      ),
    ).toBe('Primary brief\n\nExtra delivery note\n\nFrom meeting: Weekly sync')
  })
})

describe('resolvePageGraderCampaignId', () => {
  const campaignId = '99999999-9999-9999-9999-999999999999'

  it('prefers the explicit send argument', () => {
    expect(
      resolvePageGraderCampaignId({
        dtoCampaignId: campaignId,
        item: {
          custom_data: {
            work_request: {
              page_grader_external_campaign_id: '11111111-1111-1111-1111-111111111111',
            },
          },
        },
        space: {
          schema: {
            custom_data: { page_grader_campaign_id: '22222222-2222-2222-2222-222222222222' },
          },
        },
      }),
    ).toBe(campaignId)
  })

  it('uses the Service Request stamp when no send argument is present', () => {
    expect(
      resolvePageGraderCampaignId({
        item: {
          custom_data: { work_request: { page_grader_external_campaign_id: campaignId } },
        },
        space: {
          schema: {
            custom_data: { page_grader_campaign_id: '22222222-2222-2222-2222-222222222222' },
          },
        },
      }),
    ).toBe(campaignId)
  })

  it('falls back to the Space Page Grader campaign id', () => {
    expect(
      resolvePageGraderCampaignId({
        space: { schema: { custom_data: { page_grader_campaign_id: campaignId } } },
      }),
    ).toBe(campaignId)
  })

  it('returns null when no campaign is stamped', () => {
    expect(resolvePageGraderCampaignId({ item: { custom_data: {} }, space: {} })).toBeNull()
  })
})
