import { describe, expect, it } from 'vitest'

import {
  buildAdMenuTarget,
  buildAvatarMenuTarget,
  buildEmailMenuTarget,
  buildFormMenuTarget,
  buildOfferMenuTarget,
  buildPresentationMenuTarget,
  buildSequenceMenuTarget,
  buildSocialPostMenuTarget,
} from './artifact-card-menu-targets'

describe('artifact card menu targets', () => {
  it('builds simple artifact menu targets', () => {
    expect(buildOfferMenuTarget({ id: 'offer-1', name: 'Offer', campaign_id: 'campaign-1' })).toEqual(
      {
        id: 'offer-1',
        name: 'Offer',
        campaign_id: 'campaign-1',
      },
    )
    expect(buildSequenceMenuTarget({ id: 'sequence-1', name: null, campaign_id: null })).toEqual({
      id: 'sequence-1',
      name: null,
      campaign_id: null,
    })
    expect(buildPresentationMenuTarget({ id: 'presentation-1', name: 'Deck', campaign_id: null })).toEqual(
      {
        id: 'presentation-1',
        name: 'Deck',
        campaign_id: null,
      },
    )
    expect(buildEmailMenuTarget({ id: 'email-1', subject: 'Subject', campaign_id: null })).toEqual({
      id: 'email-1',
      subject: 'Subject',
      campaign_id: null,
    })
  })

  it('normalizes optional social and ad fields', () => {
    expect(
      buildSocialPostMenuTarget({
        id: 'post-1',
        caption: undefined,
        headline: 'Headline',
        status: 'draft',
        scheduled_at: undefined,
        campaign_id: undefined,
        platform: undefined,
      }),
    ).toEqual({
      id: 'post-1',
      caption: null,
      headline: 'Headline',
      status: 'draft',
      scheduled_at: null,
      campaign_id: null,
      platform: null,
    })

    expect(
      buildAdMenuTarget({
        id: 'ad-1',
        headline: null,
        primary_text: undefined,
        campaign_id: undefined,
        ad_set_id: null,
      }),
    ).toEqual({
      id: 'ad-1',
      headline: '',
      primary_text: '',
      campaign_id: null,
      ad_set_id: null,
    })
  })

  it('falls back avatar campaign ids and form target space ids', () => {
    expect(buildAvatarMenuTarget({ id: 'avatar-1', name: null, campaign_id: null }, 'parent-campaign')).toEqual(
      {
        id: 'avatar-1',
        name: null,
        campaign_id: 'parent-campaign',
      },
    )

    expect(
      buildFormMenuTarget({
        id: 'form-1',
        name: 'Lead form',
        status: 'published',
        share_token: 'share-token',
        visibility: 'public',
        published_url: undefined,
        campaign_id: undefined,
        space_id: undefined,
        settings: { target_space_id: 'target-space' },
      }),
    ).toEqual({
      id: 'form-1',
      name: 'Lead form',
      status: 'published',
      share_token: 'share-token',
      visibility: 'public',
      published_url: null,
      campaign_id: null,
      space_id: null,
      target_space_id: 'target-space',
    })
  })
})
