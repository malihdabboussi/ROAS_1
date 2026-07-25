import type {
  MissionPlaybookExpandInput,
  MissionPlaybookPlanResult,
} from './mission-playbook.types'
import { intent, pickAgent } from './webinar-fulfillment.helpers'

export const IG_ORGANIC_VIDEO_AD_PLAYBOOK_ID = 'ig-organic-video-ad'

export function expandIgOrganicVideoAdPlaybook(
  input: MissionPlaybookExpandInput,
): MissionPlaybookPlanResult {
  const raw =
    input.mission.input?.playbook_kickoff &&
    typeof input.mission.input.playbook_kickoff === 'object'
      ? (input.mission.input.playbook_kickoff as Record<string, unknown>)
      : {}
  const sceneIds = Array.isArray(raw.selected_scene_ids)
    ? raw.selected_scene_ids.filter((item): item is string => typeof item === 'string')
    : []
  const count = Math.max(1, sceneIds.length)
  const designer = pickAgent(['designer', 'lux'], input.workerAgentKeys, input.managerKey)
  const scope = JSON.stringify(raw)
  const hasPreapprovedCopy = raw.copy_mode === 'use_my_copy' && raw.copy_approved === true
  const copyInstruction = hasPreapprovedCopy
    ? 'The kickoff has copy_approved true with use_my_copy, so proceed without another copy confirmation.'
    : 'Complete the skill copy approval before footage or rendering; write_for_me cannot bypass approval.'
  const assertionKey = 'A-ig-organic-video-production'
  const subtask: MissionPlaybookPlanResult['subtasks'][number] = {
    id: 'st-ig-organic-video-production',
    title: `Produce ${count} IG organic video ad${count === 1 ? '' : 's'}`,
    assignTo: designer,
    dependsOn: [],
    assertionKeys: [assertionKey],
    scheduledAt: null,
    publishToTaskList: true,
    intent: intent({
      why: 'Turn selected organic scenes and approved sticker copy into finished Story videos.',
      story: 'Lux approves copy, reuses clean footage where possible, and renders exact stickers.',
      sensory: `Exactly ${count} readable 9:16 videos are visible in campaign Space Media.`,
      endState: 'Every selected scene exists as a visually verified native video Deliverable.',
      ecology: `Load ig-organic-video-ad and follow it as the production authority. Use this kickoff exactly: ${scope}. ${copyInstruction} Produce exactly ${count} videos, one per selected scene. Complete footage resolution, Pillow sticker rendering, Apple-style emoji, audio, full-frame visual QA, and Media registration requirements. Never route Higgsfield through Composio and never publish to Meta.`,
    }),
    outputContract: {
      artifact_kind: 'media_artifact',
      required_action: 'generate_video',
      required_artifact_type: 'video',
      expected: {
        exact_count: count,
        aspect_ratio: '9:16',
        selected_scene_ids: sceneIds,
      },
    },
  }

  return {
    kind: 'plan',
    title: 'IG Organic Video Ad Production',
    summary: `Lux produces ${count} native-looking Instagram Story video ad${count === 1 ? '' : 's'}.`,
    approach:
      'Use one deterministic production task for copy approval, footage, exact stickers, audio, QA, and Media registration.',
    capability_gap: { exists: false, note: '', suggested_hire: '' },
    harness: {
      contextSnapshot: {
        summary: `Playbook ${IG_ORGANIC_VIDEO_AD_PLAYBOOK_ID}; ${scope}`,
        sources: [
          {
            sourceType: 'playbook',
            title: IG_ORGANIC_VIDEO_AD_PLAYBOOK_ID,
            confidence: 'strong',
            summary: 'Guided IG organic video production flow.',
          },
        ],
        missing: [],
        sufficiency: {
          sufficientForPlan: sceneIds.length > 0,
          sufficientForValidation: true,
          reason: 'The kickoff records scenes, copy mode, source strategy, and sticker settings.',
        },
      },
      clarificationQuestions: [],
      assumptions: [],
      assertions: [
        {
          assertionKey,
          category: 'creative',
          statement: `Exactly ${count} visually verified IG organic videos were registered.`,
          priority: 'must',
          validatorType: 'artifact_contract',
          evidenceRequirement: `${count} native video Deliverables`,
          failureSeverity: 'blocker',
        },
      ],
      assertionCoverage: [
        {
          assertionKey,
          implementedBy: [subtask.id],
          verifiedBy: ['ig-video-artifact-contract'],
          rationale: 'The video production task owns the exact output count.',
        },
      ],
      validatorPlan: [
        {
          validatorKey: 'ig-video-artifact-contract',
          validatorType: 'artifact_contract',
          assertionKeys: [assertionKey],
          evidenceRequired: `${count} native 9:16 video Deliverables`,
        },
      ],
    },
    subtasks: [subtask],
    outOfScope: ['Meta publishing or activation'],
    assignTo: designer,
  }
}
