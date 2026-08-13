import type {
  MissionPlaybookExpandInput,
  MissionPlaybookKickoff,
  MissionPlaybookPlanResult,
} from './mission-playbook.types'
import { docContract, intent, pickAgent } from './webinar-fulfillment.helpers'

export const CLIENT_STRATEGY_PLAYBOOK_ID = 'client-strategy'
const OUTPUT_TITLE = 'Client Strategy Map'
const CLIENT_WRITING_RULE =
  'CLIENT WRITING RULE: For client-facing text, load dylans-super-voice as the only voice authority.'

function readKickoff(input: Record<string, unknown> | null | undefined): MissionPlaybookKickoff {
  const raw =
    input?.playbook_kickoff && typeof input.playbook_kickoff === 'object'
      ? (input.playbook_kickoff as Record<string, unknown>)
      : {}
  return {
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    transcript_url: typeof raw.transcript_url === 'string' ? raw.transcript_url : undefined,
    drive_links: typeof raw.drive_links === 'string' ? raw.drive_links : undefined,
    client_context: typeof raw.client_context === 'string' ? raw.client_context : undefined,
  }
}

export function expandClientStrategyPlaybook(
  input: MissionPlaybookExpandInput,
): MissionPlaybookPlanResult {
  const kickoff = readKickoff(input.mission.input)
  const strategist = pickAgent(['strategist', 'reed'], input.workerAgentKeys, input.managerKey)
  const kickoffBits = [
    kickoff.client_context ? `Client context: ${kickoff.client_context}` : null,
    kickoff.transcript_url ? `Existing transcript: ${kickoff.transcript_url}` : null,
    kickoff.drive_links ? `Drive/links: ${kickoff.drive_links}` : null,
    kickoff.notes ? `Notes: ${kickoff.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')
  const assertions = [
    {
      assertionKey: 'A-001',
      category: 'context',
      statement: 'Atlas prepared campaign and Brain context.',
      priority: 'must' as const,
      validatorType: 'human_review',
      evidenceRequirement: 'Grounded context summary with source links.',
      failureSeverity: 'blocker' as const,
    },
    {
      assertionKey: 'A-002',
      category: 'strategy',
      statement: 'A client-specific strategy map exists.',
      priority: 'must' as const,
      validatorType: 'human_review',
      evidenceRequirement: `${OUTPUT_TITLE} exists as a native editable document.`,
      failureSeverity: 'blocker' as const,
    },
  ]
  const subtasks: MissionPlaybookPlanResult['subtasks'] = [
    {
      id: 'st-atlas-context',
      title: 'Task 1 — Atlas context preparation',
      assignTo: 'atlas',
      dependsOn: [],
      assertionKeys: ['A-001'],
      scheduledAt: null,
      intent: intent({
        why: 'Give the strategist the client, company, campaign, and Space context first.',
        story: 'Atlas prepares one grounded context layer before strategic decisions are made.',
        sensory: 'The context names the client, offer, proof, constraints, and sources.',
        endState: 'Relevant Brain, campaign, and Space context is attached without invented gaps.',
        ecology: `Read the campaign, Space, Customer Brain, Company Brain, and linked files. Summarize durable facts and explicitly list missing inputs. Kickoff:\n${kickoffBits || '(none)'}`,
      }),
    },
    {
      id: 'st-precall',
      title: 'Task 2 — Client strategy map',
      assignTo: strategist,
      dependsOn: ['st-atlas-context'],
      assertionKeys: ['A-002'],
      scheduledAt: null,
      intent: intent({
        why: 'Walk into the next client call with a proposed strategy to confirm or correct.',
        story: 'The strategist prepares the call around decisions instead of blank-page discovery.',
        sensory: `"${OUTPUT_TITLE}" is specific to the campaign and includes the offer-stack hypothesis.`,
        endState: 'A native strategy map exists with decisions, proof gaps, and open questions.',
        ecology: `Load skill auto-skill-1-roas-precall-strategy. Include suggested offer, complete offer-stack hypothesis, avatars, proof gaps, constraints, and a confirm-or-correct agenda. Save exactly "${OUTPUT_TITLE}" as a native editable Space Doc. ${CLIENT_WRITING_RULE}`,
      }),
      outputContract: docContract(OUTPUT_TITLE),
    },
  ]
  return {
    kind: 'plan',
    title: 'Client Strategy',
    summary:
      'Atlas gathers campaign context, then the strategist produces a client-ready strategy map.',
    approach:
      'Reuse the validated pre-call strategy stage without webinar production or lifecycle gates.',
    capability_gap: { exists: false, note: '', suggested_hire: '' },
    harness: {
      contextSnapshot: {
        summary: `Playbook ${CLIENT_STRATEGY_PLAYBOOK_ID}. ${kickoffBits || 'No extra kickoff links.'}`,
        sources: [
          {
            sourceType: 'playbook',
            title: CLIENT_STRATEGY_PLAYBOOK_ID,
            confidence: 'strong',
            summary: 'Approved deterministic client-strategy flow.',
          },
        ],
        missing: [],
        sufficiency: {
          sufficientForPlan: true,
          sufficientForValidation: true,
          reason: 'The playbook discovers campaign context and records missing facts.',
        },
      },
      clarificationQuestions: [],
      assumptions: [],
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
          assertionKeys: assertions.map((assertion) => assertion.assertionKey),
          evidenceRequired: 'Native strategy document and grounded source context.',
        },
      ],
    },
    subtasks,
    outOfScope: ['Webinar production', 'Post-call transcript matching', 'Advertising activation'],
    assignTo: strategist,
  }
}
