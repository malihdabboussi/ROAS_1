import type {
  MissionPlaybookExpandInput,
  MissionPlaybookPlanResult,
} from './mission-playbook.types'
import { imageContract, intent, pickAgent } from './webinar-fulfillment.helpers'

export const STATIC_AD_PRODUCTION_PLAYBOOK_ID = 'static-ad-production'

type Kickoff = {
  selectedFormatIds: string[]
  quantity: number
  aspectRatio: '4:5' | '9:16'
  copyMode: 'write_for_me' | 'use_my_copy'
  exactCopy?: string
  offerContext?: string
  personStrategy: 'use_uploaded' | 'generate'
  referenceAssets: Array<Record<string, unknown>>
  sourceMissionId?: string
  sourceDeliverableIds: string[]
}

function readKickoff(input: Record<string, unknown> | null | undefined): Kickoff {
  const raw =
    input?.playbook_kickoff && typeof input.playbook_kickoff === 'object'
      ? (input.playbook_kickoff as Record<string, unknown>)
      : {}
  const strings = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  const referenceAssets = Array.isArray(raw.reference_assets)
    ? raw.reference_assets.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === 'object' && !Array.isArray(item),
      )
    : []
  const requestedQuantity =
    typeof raw.quantity === 'number' && Number.isFinite(raw.quantity) ? raw.quantity : 1

  return {
    selectedFormatIds: strings(raw.selected_format_ids),
    quantity: Math.min(10, Math.max(1, Math.round(requestedQuantity))),
    aspectRatio: raw.aspect_ratio === '9:16' ? '9:16' : '4:5',
    copyMode: raw.copy_mode === 'use_my_copy' ? 'use_my_copy' : 'write_for_me',
    exactCopy: typeof raw.exact_copy === 'string' ? raw.exact_copy : undefined,
    offerContext: typeof raw.offer_context === 'string' ? raw.offer_context : undefined,
    personStrategy: raw.person_strategy === 'use_uploaded' ? 'use_uploaded' : 'generate',
    referenceAssets,
    sourceMissionId: typeof raw.source_mission_id === 'string' ? raw.source_mission_id : undefined,
    sourceDeliverableIds: strings(raw.source_deliverable_ids),
  }
}

export function expandStaticAdProductionPlaybook(
  input: MissionPlaybookExpandInput,
): MissionPlaybookPlanResult {
  const kickoff = readKickoff(input.mission.input)
  const designer = pickAgent(['designer', 'lux'], input.workerAgentKeys, input.managerKey)
  const scope = JSON.stringify(kickoff)
  const assertionKey = 'A-static-ad-production'
  const outputContract = imageContract({ minimumCount: kickoff.quantity })
  outputContract.expected = {
    ...outputContract.expected,
    exact_count: kickoff.quantity,
    aspect_ratio: kickoff.aspectRatio,
    selected_format_ids: kickoff.selectedFormatIds,
  }
  const subtask: MissionPlaybookPlanResult['subtasks'][number] = {
    id: 'st-static-ad-production',
    title: `Produce ${kickoff.quantity} static ad${kickoff.quantity === 1 ? '' : 's'}`,
    assignTo: designer,
    dependsOn: [],
    assertionKeys: [assertionKey],
    scheduledAt: null,
    publishToTaskList: true,
    intent: intent({
      why: 'Turn approved campaign strategy and copy into finished, client-ready static ads.',
      story:
        'Lux writes or verifies the copy, resolves approved imagery, and renders every selected format.',
      sensory: `Exactly ${kickoff.quantity} finished ${kickoff.aspectRatio} images are visible in Space Media, each labeled by format and variant.`,
      endState:
        'Every requested ad is a visually verified native image Deliverable attached to this mission.',
      ecology: `Load static-ad-book and follow it as the production authority. Use the kickoff exactly: ${scope}. Produce exactly ${kickoff.quantity} outputs across only these formats: ${kickoff.selectedFormatIds.join(', ') || '(none supplied)'}. For write_for_me, use source Ads Research deliverables and dylans-super-voice before rendering. For use_my_copy, preserve supplied copy verbatim. Use only substantiated claims, real testimonials, and approved identities. If a selected person-led format uses use_uploaded, use the supplied person/reference asset; if it uses generate, create a clearly synthetic person with Higgsfield and never imply it is the client. Drive the bundled deterministic renderer for all typography. Visually inspect every final image at full size. Register each PNG immediately in campaign Space Media and return exactly ${kickoff.quantity} image Deliverables. Do not publish ads to Meta.`,
    }),
    outputContract,
  }

  return {
    kind: 'plan',
    title: 'Static Ad Production',
    summary: `Lux produces ${kickoff.quantity} static ad image${kickoff.quantity === 1 ? '' : 's'} from the selected format library.`,
    approach:
      'Use one deterministic production task for copy, approved imagery, exact rendering, visual QA, and Media registration.',
    capability_gap: { exists: false, note: '', suggested_hire: '' },
    harness: {
      contextSnapshot: {
        summary: `Playbook ${STATIC_AD_PRODUCTION_PLAYBOOK_ID}; ${scope}`,
        sources: [
          {
            sourceType: 'playbook',
            title: STATIC_AD_PRODUCTION_PLAYBOOK_ID,
            confidence: 'strong',
            summary: 'Deterministic static-ad production flow.',
          },
        ],
        missing: [],
        sufficiency: {
          sufficientForPlan: kickoff.selectedFormatIds.length > 0,
          sufficientForValidation: true,
          reason:
            'The kickoff records format, count, copy source, imagery choice, and output ratio.',
        },
      },
      clarificationQuestions: [],
      assumptions: [],
      assertions: [
        {
          assertionKey,
          category: 'creative',
          statement: `Exactly ${kickoff.quantity} visually verified static ad images were registered.`,
          priority: 'must',
          validatorType: 'artifact_contract',
          evidenceRequirement: `${kickoff.quantity} native image Deliverables`,
          failureSeverity: 'blocker',
        },
      ],
      assertionCoverage: [
        {
          assertionKey,
          implementedBy: [subtask.id],
          verifiedBy: ['static-ad-artifact-contract'],
          rationale: 'The production task and exact-count output contract own the deliverables.',
        },
      ],
      validatorPlan: [
        {
          validatorKey: 'static-ad-artifact-contract',
          validatorType: 'artifact_contract',
          assertionKeys: [assertionKey],
          evidenceRequired: `${kickoff.quantity} image Deliverables at ${kickoff.aspectRatio}`,
        },
      ],
    },
    subtasks: [subtask],
    outOfScope: ['Meta publishing or activation', 'Invented testimonials or proof'],
    assignTo: designer,
  }
}
