import { describe, expect, it } from 'vitest'
import { buildStaticAdProductionMissionPayload } from './static-ad-production'

describe('buildStaticAdProductionMissionPayload', () => {
  it('preserves formats, quantity, copy mode, source research, and reference assets', () => {
    const payload = buildStaticAdProductionMissionPayload({
      selectedFormatIds: ['hero_framing', 'tweet_receipt'],
      quantity: 6,
      aspectRatio: '4:5',
      copyMode: 'write_for_me',
      offerContext: 'A webinar for agency owners',
      personStrategy: 'use_uploaded',
      referenceAssets: [
        {
          id: 'asset-1',
          name: 'founder.png',
          url: 'https://example.com/founder.png',
          mimeType: 'image/png',
        },
      ],
      sourceMissionId: 'mission-research',
      sourceDeliverableIds: ['deliverable-1'],
    })

    expect(payload.input.playbook_id).toBe('static-ad-production')
    expect(payload.input.playbook_kickoff).toMatchObject({
      selected_format_ids: ['hero_framing', 'tweet_receipt'],
      quantity: 6,
      aspect_ratio: '4:5',
      copy_mode: 'write_for_me',
      offer_context: 'A webinar for agency owners',
      person_strategy: 'use_uploaded',
      source_mission_id: 'mission-research',
      source_deliverable_ids: ['deliverable-1'],
      reference_assets: [
        {
          id: 'asset-1',
          name: 'founder.png',
          url: 'https://example.com/founder.png',
          mime_type: 'image/png',
        },
      ],
    })
  })

  it('clamps the requested output count to the supported one-to-ten range', () => {
    expect(
      buildStaticAdProductionMissionPayload({
        selectedFormatIds: ['offer_stack'],
        quantity: 99,
        aspectRatio: '9:16',
        copyMode: 'use_my_copy',
        exactCopy: 'Use this exact copy.',
        offerContext: '',
        personStrategy: 'generate',
        referenceAssets: [],
      }).input.playbook_kickoff.quantity,
    ).toBe(10)
  })
})
