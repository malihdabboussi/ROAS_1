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
            production_mode: 'static_ad_book',
            selected_format_ids: ['hero_framing', 'offer_stack'],
            format_variations: { hero_framing: 2, offer_stack: 4 },
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

  it('routes Validate Messaging through deterministic copy and design rendering', () => {
    const plan = expandMissionPlaybook({
      playbookId: STATIC_AD_PRODUCTION_PLAYBOOK_ID,
      mission: {
        id: 'mission-validate',
        title: 'Validate Messaging Ads',
        user_id: 'user-1',
        input: {
          playbook_kickoff: {
            production_mode: 'validate_messaging',
            selected_format_ids: [],
            quantity: 3,
            aspect_ratio: '9:16',
            copy_mode: 'write_for_me',
            offer_context: 'A training for agency owners',
          },
        },
      },
      workerAgentKeys: ['lux'],
      managerKey: 'vibey',
    })

    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/validate-messaging\.md/)
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/roas-ad-design/)
    expect(plan?.subtasks[0]?.outputContract).toMatchObject({
      required_action: 'process_media',
      expected: {
        exact_count: 3,
        production_mode: 'validate_messaging',
        width: 1080,
        height: 1920,
      },
    })
  })

  it('routes image-brief production through qualified briefs and final image generation', () => {
    const plan = expandMissionPlaybook({
      playbookId: STATIC_AD_PRODUCTION_PLAYBOOK_ID,
      mission: {
        id: 'mission-image-brief',
        title: 'Image Brief Ads',
        user_id: 'user-1',
        input: {
          playbook_kickoff: {
            production_mode: 'image_brief',
            selected_format_ids: [],
            quantity: 2,
            aspect_ratio: '4:5',
            copy_mode: 'use_my_copy',
            exact_copy_by_selection: { image_brief: ['First ad', 'Second ad'] },
          },
        },
      },
      workerAgentKeys: ['lux'],
      managerKey: 'vibey',
    })

    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/roas-image-brief/)
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/call generate_image for each final/i)
    expect(plan?.subtasks[0]?.outputContract).toMatchObject({
      required_action: 'generate_image',
      expected: { exact_count: 2, production_mode: 'image_brief' },
    })
  })
})
