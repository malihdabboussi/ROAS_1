import { describe, expect, it } from 'vitest'
import { buildIgOrganicVideoMissionPayload } from './ig-organic-video'

describe('buildIgOrganicVideoMissionPayload', () => {
  it('keeps copy approval and source strategy explicit', () => {
    const payload = buildIgOrganicVideoMissionPayload({
      copyMode: 'write_for_me',
      sourceStrategy: 'reuse_when_available',
      selectedSceneIds: ['golf-course'],
      pillLine: ' Free Training ',
      headline: '',
      highlightPhrase: '',
      ctaLine: ' Tap below ',
      emoji: '👇',
      offerContext: 'Lender lead-generation training',
    })

    expect(payload.input.playbook_id).toBe('ig-organic-video-ad')
    expect(payload.input.playbook_kickoff).toMatchObject({
      copy_mode: 'write_for_me',
      copy_approved: false,
      source_strategy: 'reuse_when_available',
      selected_scene_ids: ['golf-course'],
      pill_line: 'Free Training',
      cta_line: 'Tap below',
      music_strategy: 'match_scene',
    })
  })

  it('marks exact-copy submissions as approved by the initiating user action', () => {
    const payload = buildIgOrganicVideoMissionPayload({
      copyMode: 'use_my_copy',
      sourceStrategy: 'generate_new',
      selectedSceneIds: ['private-jet-cabin'],
      pillLine: 'Free Training',
      headline: 'Build a pipeline',
      highlightPhrase: 'without cold calling',
      ctaLine: 'Tap below',
      emoji: '🚨',
      offerContext: '',
    })

    expect(payload.input.playbook_kickoff).toMatchObject({
      copy_mode: 'use_my_copy',
      copy_approved: true,
      headline: 'Build a pipeline',
      highlight_phrase: 'without cold calling',
    })
  })
})
