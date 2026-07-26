import { describe, expect, it } from 'vitest'
import { IG_ORGANIC_VIDEO_AD_PLAYBOOK_ID } from '../ig-organic-video-ad.playbook'
import { expandMissionPlaybook } from '../mission-playbook.registry'

describe('ig-organic-video-ad playbook', () => {
  it('registers the existing video production launcher as an executable designer playbook', () => {
    const plan = expandMissionPlaybook({
      playbookId: IG_ORGANIC_VIDEO_AD_PLAYBOOK_ID,
      mission: {
        id: 'mission-1',
        title: 'IG Organic Video Ads',
        user_id: 'user-1',
        input: {
          playbook_kickoff: {
            selected_scene_ids: ['golf-course', 'beach-laptop'],
            source_strategy: 'reuse_when_available',
            copy_mode: 'write_for_me',
          },
        },
      },
      workerAgentKeys: ['lux'],
      managerKey: 'vibey',
    })

    expect(plan?.assignTo).toBe('lux')
    expect(plan?.subtasks).toHaveLength(1)
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/ig-organic-video-ad/)
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/exactly 2/)
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/write_for_me cannot bypass approval/i)
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/preset.*reuse/i)
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/direct Higgsfield MCP/i)
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/never.*Google.*Veo/i)
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/process_media.*operation.*render_ig_story/i)
    expect(plan?.subtasks[0]?.intent.ecology).toMatch(/only.*returned.*MP4.*final.*Deliverable/i)
    expect(plan?.subtasks[0]?.outputContract).toMatchObject({
      artifact_kind: 'media_artifact',
      required_action: 'process_media',
      required_artifact_type: 'video',
      expected: {
        exact_count: 2,
        aspect_ratio: '9:16',
        width: 1080,
        height: 1920,
        duration_seconds: 10,
        operation: 'render_ig_story',
      },
    })
  })

  it('carries explicit exact-copy approval into unattended production instructions', () => {
    const plan = expandMissionPlaybook({
      playbookId: IG_ORGANIC_VIDEO_AD_PLAYBOOK_ID,
      mission: {
        id: 'mission-2',
        title: 'IG Organic Video Ads',
        user_id: 'user-1',
        input: {
          playbook_kickoff: {
            selected_scene_ids: ['private-jet-cabin'],
            source_strategy: 'generate_new',
            copy_mode: 'use_my_copy',
            copy_approved: true,
            headline: 'Build a pipeline',
          },
        },
      },
      workerAgentKeys: ['lux'],
      managerKey: 'vibey',
    })

    expect(plan?.subtasks[0]?.intent.ecology).toMatch(
      /copy_approved.*proceed without another copy confirmation/i,
    )
  })
})
