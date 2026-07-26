import { describe, expect, it } from 'vitest'
import { expandMissionPlaybook } from '../mission-playbook.registry'
import { STATIC_AD_PRODUCTION_PLAYBOOK_ID } from '../static-ad-production.playbook'

describe('static-ad-production playbook', () => {
  it('assigns one deterministic production task to the designer with exact kickoff constraints', () => {
    const plan = expandMissionPlaybook({
      playbookId: STATIC_AD_PRODUCTION_PLAYBOOK_ID,
      mission: {
        id: 'mission-1',
        title: 'Static Ad Production',
        user_id: 'user-1',
        input: {
          playbook_kickoff: {
            selected_format_ids: ['hero_framing', 'offer_stack'],
            quantity: 6,
            aspect_ratio: '4:5',
            copy_mode: 'write_for_me',
            person_strategy: 'use_uploaded',
            reference_assets: [{ id: 'asset-1', url: 'https://example.com/person.png' }],
          },
        },
      },
      workerAgentKeys: ['lux'],
      managerKey: 'vibey',
    })

    expect(plan?.assignTo).toBe('lux')
    expect(plan?.subtasks).toHaveLength(1)
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/static-ad-book/)
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/exactly 6/)
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/hero_framing/)
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/offer_stack/)
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/visual(?:ly)? inspect/i)
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/process_media.*render_static_ad/i)
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/never call generate_image for the final/i)
    expect(plan?.subtasks[0]?.outputContract).toMatchObject({
      artifact_kind: 'media_artifact',
      required_artifact_type: 'image',
      required_action: 'process_media',
      expected: { minimum_count: 6, width: 1080, height: 1350 },
    })
  })
})
