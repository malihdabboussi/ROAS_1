import type {
  MissionPlaybookExpandInput,
  MissionPlaybookPlanResult,
} from './mission-playbook.types'
import { imageContract, intent, pickAgent } from './webinar-fulfillment.helpers'

export const STATIC_AD_PRODUCTION_PLAYBOOK_ID = 'static-ad-production'

type ProductionMode = 'validate_messaging' | 'image_brief' | 'static_ad_book'

type Kickoff = {
  productionMode: ProductionMode
  selectedFormatIds: string[]
  formatVariations: Record<string, number>
  quantity: number
  aspectRatio: '4:5' | '9:16'
  copyMode: 'write_for_me' | 'use_my_copy'
  exactCopy?: string
  exactCopyBySelection: Record<string, string[]>
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
  const productionMode: ProductionMode =
    raw.production_mode === 'validate_messaging' || raw.production_mode === 'image_brief'
      ? raw.production_mode
      : 'static_ad_book'
  const formatVariations =
    raw.format_variations && typeof raw.format_variations === 'object'
      ? Object.fromEntries(
          Object.entries(raw.format_variations as Record<string, unknown>)
            .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
            .map(([key, value]) => [key, clampCount(value)]),
        )
      : {}
  const exactCopyBySelection =
    raw.exact_copy_by_selection && typeof raw.exact_copy_by_selection === 'object'
      ? Object.fromEntries(
          Object.entries(raw.exact_copy_by_selection as Record<string, unknown>).map(
            ([key, value]) => [key, strings(value)],
          ),
        )
      : {}

  return {
    productionMode,
    selectedFormatIds: strings(raw.selected_format_ids),
    formatVariations,
    quantity: clampCount(requestedQuantity),
    aspectRatio: raw.aspect_ratio === '9:16' ? '9:16' : '4:5',
    copyMode: raw.copy_mode === 'use_my_copy' ? 'use_my_copy' : 'write_for_me',
    exactCopy: typeof raw.exact_copy === 'string' ? raw.exact_copy : undefined,
    exactCopyBySelection,
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
  outputContract.required_action =
    kickoff.productionMode === 'image_brief' ? 'generate_image' : 'process_media'
  outputContract.expected = {
    ...outputContract.expected,
    exact_count: kickoff.quantity,
    aspect_ratio: kickoff.aspectRatio,
    width: 1080,
    height: kickoff.aspectRatio === '4:5' ? 1350 : 1920,
    production_mode: kickoff.productionMode,
    selected_format_ids: kickoff.selectedFormatIds,
    format_variations: kickoff.formatVariations,
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
        'Lux writes or verifies the copy, resolves approved imagery, and renders every requested variation.',
      sensory: `Exactly ${kickoff.quantity} finished ${kickoff.aspectRatio} images are visible in Space Media, each labeled by format and variant.`,
      endState:
        'Every requested ad is a visually verified native image Deliverable attached to this mission.',
      ecology: buildProductionEcology(kickoff, scope),
    }),
    outputContract,
  }

  return {
    kind: 'plan',
    title: 'Static Ad Production',
    summary: `Lux produces ${kickoff.quantity} static ad image${kickoff.quantity === 1 ? '' : 's'} through the selected production lane.`,
    approach:
      'Use one production task for copy, approved imagery, rendering, visual QA, and Media registration.',
    capability_gap: { exists: false, note: '', suggested_hire: '' },
    harness: {
      contextSnapshot: {
        summary: `Playbook ${STATIC_AD_PRODUCTION_PLAYBOOK_ID}; ${scope}`,
        sources: [
          {
            sourceType: 'playbook',
            title: STATIC_AD_PRODUCTION_PLAYBOOK_ID,
            confidence: 'strong',
            summary: 'Static-ad production flow with explicit production lane and output count.',
          },
        ],
        missing: [],
        sufficiency: {
          sufficientForPlan:
            kickoff.productionMode !== 'static_ad_book' || kickoff.selectedFormatIds.length > 0,
          sufficientForValidation: true,
          reason:
            'The kickoff records production lane, format counts, copy source, imagery choice, and output ratio.',
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

function buildProductionEcology(kickoff: Kickoff, scope: string): string {
  const shared = `Use the kickoff exactly: ${scope}. Produce exactly ${kickoff.quantity} ${kickoff.aspectRatio} outputs. For write_for_me, use source Ads Research deliverables and dylans-super-voice before rendering. For use_my_copy, preserve every supplied per-ad line verbatim. Use only substantiated claims, real testimonials, and approved identities. Visually inspect every final image at full size. Register each final immediately in campaign Space Media and return exactly ${kickoff.quantity} native image Deliverables. Do not publish ads to Meta.`

  if (kickoff.productionMode === 'validate_messaging') {
    return `Load roas-ad-copy/references/validate-messaging.md and roas-ad-design as the production authorities. ${shared} Write one distinct audience-qualified identity callout per requested output when copy_mode is write_for_me. For each final, call process_media with the roas-ad-design Validate Messaging renderer and the exact aspect ratio. Never substitute a generic image generator or a document for the deterministic PNG.`
  }
  if (kickoff.productionMode === 'image_brief') {
    return `Load roas-image-brief and follow its qualification gates as the production authority. ${shared} Create a qualified brief for each requested output, locking audience, offer, funnel stage, approved assets, exclusions, and two independent audience cues. Then call generate_image for each final using the qualified brief and requested aspect ratio. Do not finish with briefs alone; only the returned image files are Deliverables.`
  }
  return `Load static-ad-book and follow it as the production authority. ${shared} Produce only the selected formats and counts: ${JSON.stringify(kickoff.formatVariations)}. If a selected person-led format uses use_uploaded, use the supplied person/reference asset; if it uses generate, create a clearly synthetic person with Higgsfield and never imply it is the client. For each final, call process_media with operation render_static_ad, the selected template_id, aspect_ratio, and exact template spec. Never call generate_image for the final; only a returned deterministic PNG is a mission Deliverable.`
}

function clampCount(value: number): number {
  return Math.min(10, Math.max(1, Math.round(value)))
}
