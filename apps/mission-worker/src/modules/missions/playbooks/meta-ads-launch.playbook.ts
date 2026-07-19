import type {
  MissionPlaybookExpandInput,
  MissionPlaybookPlanResult,
} from './mission-playbook.types'
import { docContract, intent, pickAgent } from './webinar-fulfillment.helpers'

export const META_ADS_LAUNCH_PLAYBOOK_ID = 'meta-ads-launch'
const WRITING =
  'CLIENT WRITING RULE: Load dylans-super-voice as the only voice authority. Do not load human-written-copy or dylans-voice. Use no em dashes.'

export function expandMetaAdsLaunchPlaybook(
  input: MissionPlaybookExpandInput,
): MissionPlaybookPlanResult {
  const blaze = pickAgent(['ads_manager', 'blaze'], input.workerAgentKeys, input.managerKey)
  const human = `human:${input.mission.user_id}`
  const raw =
    input.mission.input?.playbook_kickoff &&
    typeof input.mission.input.playbook_kickoff === 'object'
      ? JSON.stringify(input.mission.input.playbook_kickoff).slice(0, 700)
      : '(use approved Space assets)'
  const subtasks: MissionPlaybookPlanResult['subtasks'] = [
    task({
      id: 'st-launch-manifest',
      title: 'Task 1 - Reconcile Meta launch assets',
      assignTo: blaze,
      dependsOn: [],
      publishToTaskList: true,
      why: 'Give the media buyer one complete source of truth before any Meta mutation.',
      story: 'Blaze combines approved Space assets with supplied links and uploads.',
      sensory: 'Every ad maps copy, creative, destination, audience, budget, and source.',
      endState: 'ADS#1 - Meta Launch Manifest exists as a native editable Doc.',
      ecology: `Load roas-meta-ads-launch. Review Meta Ads, Media Plan, Docs, Funnels, and supplied assets. PageGrader context is read-only discovery data, never a credential. Do not write copy or design creative. Assign missing copy to Ivy and missing design to Lux. Save ADS#1 - Meta Launch Manifest as a native Doc. Never create a PDF. Kickoff: ${raw}. ${WRITING}`,
      outputContract: docContract('ADS#1 - Meta Launch Manifest'),
    }),
    task({
      id: 'st-gate-launch-approval',
      title: 'Gate 1 - Confirm Meta account and launch package',
      assignTo: human,
      dependsOn: ['st-launch-manifest'],
      why: 'A human approves the exact account and settings before Meta objects exist.',
      story: 'Review the manifest and confirm Meta is connected in Vibey.',
      sensory: 'Approval names account, Page, pixel, objective, budget, schedule, URL, and ads.',
      endState: 'Blaze is authorized to build PAUSED Meta objects only.',
      ecology:
        'Resolve any PageGrader and Vibey mismatch. Approval authorizes only a PAUSED build and does not authorize live delivery.',
    }),
    task({
      id: 'st-build-paused-meta',
      title: 'Task 2 - Build paused Meta campaign',
      assignTo: blaze,
      dependsOn: ['st-gate-launch-approval'],
      publishToTaskList: true,
      why: 'Create a reviewable Meta build without spending money.',
      story: 'Blaze builds campaigns, ad sets, and ads in PAUSED state and records every ID.',
      sensory: 'The report maps each asset to returned Meta IDs and PAUSED status.',
      endState: 'ADS#2 - Paused Meta Build Report exists as a native editable Doc.',
      ecology: `Load roas-meta-ads-launch. Use only Gate 1 approved settings. Create campaigns, ad sets, and ads through Vibey in PAUSED state. Never activate delivery. Verify returned IDs and save ADS#2 - Paused Meta Build Report with review links. Never create a PDF. ${WRITING}`,
      outputContract: docContract('ADS#2 - Paused Meta Build Report'),
    }),
    task({
      id: 'st-gate-activation',
      title: 'Gate 2 - Review paused build and activate',
      assignTo: human,
      dependsOn: ['st-build-paused-meta'],
      why: 'The live-delivery decision stays with a human.',
      story: 'Review the paused build, correct anything wrong, then activate it in Meta.',
      sensory: 'The reviewer checks copy, creative, URL, tracking, audience, budget, and schedule.',
      endState: 'The human records activation or an exact revision request.',
      ecology:
        'Compare the Meta build with ADS#1 and ADS#2. Activate manually only after every setting is correct. Vibey does not expose individual Meta ad activation yet.',
    }),
  ]
  const assertions = subtasks.map((item, index) => ({
    assertionKey: item.assertionKeys[0]!,
    category: index % 2 === 0 ? 'launch' : 'approval',
    statement: `${item.title} completed with reviewable evidence.`,
    priority: 'must' as const,
    validatorType: 'human_review',
    evidenceRequirement: `${item.title} evidence`,
    failureSeverity: 'blocker' as const,
  }))
  const keys = assertions.map((item) => item.assertionKey)
  return {
    kind: 'plan',
    title: 'Meta Ads Launch',
    summary:
      'Blaze reconciles assets, a human confirms settings, Blaze builds everything paused, and a human reviews and activates it.',
    approach:
      'PageGrader supplies read-only context. Vibey owns approvals, Meta mutations, Docs, and audit history.',
    capability_gap: { exists: false, note: '', suggested_hire: '' },
    harness: {
      contextSnapshot: {
        summary: 'Deterministic paused-build Meta launch flow.',
        sources: [
          {
            sourceType: 'playbook',
            title: META_ADS_LAUNCH_PLAYBOOK_ID,
            confidence: 'strong',
            summary: 'Approved gated launch flow.',
          },
        ],
        missing: [],
        sufficiency: {
          sufficientForPlan: true,
          sufficientForValidation: true,
          reason: 'Gate 1 collects missing account and launch decisions.',
        },
      },
      clarificationQuestions: [],
      assumptions: [
        {
          assumptionKey: 'AS-001',
          statement: 'Blaze or another Meta Ads Manager is assigned.',
          confidence: 'medium',
          impact: 'Launch work needs a media buyer.',
        },
      ],
      assertions,
      assertionCoverage: assertions.map((assertion, index) => ({
        assertionKey: assertion.assertionKey,
        implementedBy: [subtasks[index]!.id],
        verifiedBy: ['human-review'],
        rationale: 'Playbook-owned coverage',
      })),
      validatorPlan: [
        {
          validatorKey: 'human-review',
          validatorType: 'human_review',
          assertionKeys: keys,
          evidenceRequired: 'Gate approvals plus ADS#1 and ADS#2 Docs.',
        },
      ],
    },
    subtasks,
    outOfScope: [
      'Creative design or copywriting',
      'PageGrader publishing or credential sharing',
      'Automatic live activation',
      'PDF deliverables',
    ],
    assignTo: blaze,
  }
}

function task(input: {
  id: string
  title: string
  assignTo: string
  dependsOn: string[]
  publishToTaskList?: boolean
  why: string
  story: string
  sensory: string
  endState: string
  ecology: string
  outputContract?: MissionPlaybookPlanResult['subtasks'][number]['outputContract']
}): MissionPlaybookPlanResult['subtasks'][number] {
  return {
    ...input,
    assertionKeys: [`A-${input.id}`],
    scheduledAt: null,
    intent: intent(input),
  }
}
