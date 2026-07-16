import type {
  MissionPlaybookExpandInput,
  MissionPlaybookKickoff,
  MissionPlaybookPlanResult,
  MissionPlaybookStartAt,
} from './mission-playbook.types'

export const WEBINAR_FULFILLMENT_PLAYBOOK_ID = 'webinar-fulfillment'

const SKILL_1 = 'auto-skill-1-roas-precall-strategy'
const SKILL_2 = 'auto-skill-2-roas-strategy-adjust'
const SKILL_3 = 'auto-skill-3-roas-launch-brief'

function pickStrategistAgent(workerAgentKeys: string[], managerKey: string): string {
  const preferred = ['strategist', 'atlas', 'vibey']
  for (const key of preferred) {
    if (workerAgentKeys.includes(key)) return key
  }
  if (workerAgentKeys.length > 0) return workerAgentKeys[0]!
  return managerKey || 'vibey'
}

function normalizeStartAt(value: unknown): MissionPlaybookStartAt {
  if (value === 'post_call' || value === 'launch_brief' || value === 'pre_call') return value
  return 'pre_call'
}

function readKickoff(input: Record<string, unknown> | null | undefined): MissionPlaybookKickoff {
  const kickoff =
    input?.playbook_kickoff && typeof input.playbook_kickoff === 'object'
      ? (input.playbook_kickoff as Record<string, unknown>)
      : {}
  return {
    start_at: normalizeStartAt(kickoff.start_at ?? input?.start_at),
    notes: typeof kickoff.notes === 'string' ? kickoff.notes : undefined,
    transcript_url:
      typeof kickoff.transcript_url === 'string' ? kickoff.transcript_url : undefined,
    drive_links: typeof kickoff.drive_links === 'string' ? kickoff.drive_links : undefined,
    client_context:
      typeof kickoff.client_context === 'string' ? kickoff.client_context : undefined,
  }
}

function intent(parts: {
  why: string
  story: string
  sensory: string
  endState: string
  ecology: string
}) {
  return parts
}

function docContract(title: string) {
  return {
    artifact_kind: 'document_artifact' as const,
    required_action: 'save_document',
    required_artifact_type: 'doc',
    expected: { title },
  }
}

/**
 * Deterministic Phase A + Gate 1 for webinar fulfillment.
 * Phase B/C (copy + creative) are intentionally omitted until skills land.
 */
export function expandWebinarFulfillmentPlaybook(
  input: MissionPlaybookExpandInput,
): MissionPlaybookPlanResult {
  const kickoff = readKickoff(input.mission.input)
  const startAt = normalizeStartAt(kickoff.start_at)
  const agentKey = pickStrategistAgent(input.workerAgentKeys, input.managerKey)
  const canAssignHuman = Boolean(input.mission.org_id)
  const humanAssign = `human:${input.mission.user_id}`

  const kickoffBits = [
    kickoff.client_context ? `Client context: ${kickoff.client_context}` : null,
    kickoff.transcript_url ? `Transcript: ${kickoff.transcript_url}` : null,
    kickoff.drive_links ? `Drive/links: ${kickoff.drive_links}` : null,
    kickoff.notes ? `Notes: ${kickoff.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  type PhaseStep = {
    id: string
    title: string
    skillKey: string
    docTitle: string
    why: string
    endState: string
  }

  const allSteps: PhaseStep[] = [
    {
      id: 'st-precall',
      title: `Pre-call strategy map (${SKILL_1})`,
      skillKey: SKILL_1,
      docTitle: 'Pre-Call Strategy Map',
      why: 'Walk into the client call already mapped so the call confirms strategy instead of discovering it.',
      endState:
        'A Pre-Call Strategy Map doc exists in this Space with suggested offers, avatars, and call agenda.',
    },
    {
      id: 'st-strategy-v2',
      title: `Strategy v2 after call (${SKILL_2})`,
      skillKey: SKILL_2,
      docTitle: 'Strategy v2',
      why: 'Lock the corrected strategy after the onboarding call before production starts.',
      endState: 'A Strategy v2 doc exists reflecting call corrections and locked offer/avatar.',
    },
    {
      id: 'st-launch-brief',
      title: `THE PLAN launch brief (${SKILL_3})`,
      skillKey: SKILL_3,
      docTitle: 'THE PLAN — Launch Brief',
      why: 'Hand production a clear launch brief before copy and creative fan out.',
      endState: 'THE PLAN launch brief doc exists with webinar promise, funnel path, and asset list.',
    },
  ]

  const selected =
    startAt === 'launch_brief'
      ? allSteps.filter((s) => s.id === 'st-launch-brief')
      : startAt === 'post_call'
        ? allSteps.filter((s) => s.id !== 'st-precall')
        : allSteps

  const assertionKeys = selected.map((_, i) => `A-${String(i + 1).padStart(3, '0')}`)
  const gateAssertion = `A-${String(selected.length + 1).padStart(3, '0')}`

  const subtasks: MissionPlaybookPlanResult['subtasks'] = selected.map((step, index) => {
    const assertionKey = assertionKeys[index]!
    const dependsOn = index === 0 ? [] : [selected[index - 1]!.id]
    return {
      id: step.id,
      title: step.title,
      assignTo: agentKey,
      dependsOn,
      assertionKeys: [assertionKey],
      scheduledAt: null,
      intent: intent({
        why: step.why,
        story: `The agency team and client feel the strategy is already owned before production starts.`,
        sensory: `The Space doc "${step.docTitle}" reads specific to this client — not a generic template.`,
        endState: step.endState,
        ecology: `Load skill ${step.skillKey}. Save the durable doc into this Space/campaign Docs. Kickoff:\n${kickoffBits || '(none beyond mission brief)'}`,
      }),
      outputContract: docContract(step.docTitle),
    }
  })

  const lastPhaseId = selected[selected.length - 1]?.id
  if (canAssignHuman) {
    subtasks.push({
      id: 'st-gate-1',
      title: 'Gate 1 — approve strategy package',
      assignTo: humanAssign,
      dependsOn: lastPhaseId ? [lastPhaseId] : [],
      assertionKeys: [gateAssertion],
      scheduledAt: null,
      intent: intent({
        why: 'Human must approve the strategy package before copy/creative production.',
        story:
          'You review the docs, leave mission comments if something is wrong, then complete this gate.',
        sensory: 'Strategy docs feel client-specific and ready for production handoff.',
        endState: 'Gate 1 completed; Phase B copy package can start when those skills are wired.',
        ecology:
          'Use mission comments for revision feedback. Do not mark done until Pre-Call/Strategy v2/THE PLAN (as started) are good.',
      }),
    })
  }

  const assertions: MissionPlaybookPlanResult['harness']['assertions'] = [
    ...selected.map((step, index) => ({
      assertionKey: assertionKeys[index]!,
      category: 'strategy' as const,
      statement: `${step.docTitle} exists in Space Docs and reflects this client.`,
      priority: 'must' as const,
      validatorType: 'human_review',
      evidenceRequirement: `Document artifact titled like "${step.docTitle}" saved to the Space.`,
      failureSeverity: 'blocker' as const,
    })),
  ]
  if (canAssignHuman) {
    assertions.push({
      assertionKey: gateAssertion,
      category: 'compliance',
      statement: 'Human approved the Phase A strategy package before production.',
      priority: 'must',
      validatorType: 'human_review',
      evidenceRequirement: 'Gate 1 human subtask completed.',
      failureSeverity: 'blocker',
    })
  }

  return {
    kind: 'plan',
    title: 'Webinar Fulfillment — Phase A Strategy',
    summary:
      'Run guided strategy skills (1→2→3 as selected by kickoff), then pause at Gate 1 for human approval. Copy and creative phases land when those skills are ready.',
    approach: `Follow playbook ${WEBINAR_FULFILLMENT_PLAYBOOK_ID} starting at ${startAt}. Do not invent a different lifecycle. Assign strategy work to ${agentKey}.`,
    capability_gap: { exists: false, note: '', suggested_hire: '' },
    harness: {
      contextSnapshot: {
        summary: `Playbook ${WEBINAR_FULFILLMENT_PLAYBOOK_ID}; start_at=${startAt}. ${kickoffBits || 'Kickoff had no extra links.'}`,
        sources: [
          {
            sourceType: 'playbook',
            title: WEBINAR_FULFILLMENT_PLAYBOOK_ID,
            confidence: 'strong',
            summary: 'Deterministic Phase A + Gate 1 framework',
          },
        ],
        missing: [],
        sufficiency: {
          sufficientForPlan: true,
          sufficientForValidation: true,
          reason: 'Playbook skeleton is fixed; kickoff supplies client context.',
        },
      },
      clarificationQuestions: [],
      assumptions: [
        {
          assumptionKey: 'AS-001',
          statement: 'Campaign team includes a strategist-capable worker for Phase A skills.',
          confidence: 'medium',
          impact: 'Wrong assignee weakens skill execution quality.',
        },
      ],
      assertions,
      assertionCoverage: assertions.map((a) => ({
        assertionKey: a.assertionKey,
        implementedBy:
          a.assertionKey === gateAssertion && canAssignHuman
            ? ['st-gate-1']
            : [selected[assertionKeys.indexOf(a.assertionKey)]!.id],
        verifiedBy: ['human-review'],
        rationale: 'Playbook-owned coverage',
      })),
      validatorPlan: [
        {
          validatorKey: 'human-review',
          validatorType: 'human_review',
          assertionKeys: canAssignHuman ? [...assertionKeys, gateAssertion] : assertionKeys,
          evidenceRequired: 'Human gate completion plus Space docs.',
        },
      ],
    },
    subtasks,
    outOfScope: [
      'Phase B copy package (skills TBD)',
      'Phase C creative pack (skills TBD)',
      'Freeform mission invent outside this playbook',
      ...(canAssignHuman ? [] : ['Gate 1 human assignee (requires org_id on mission)']),
    ],
    assignTo: agentKey,
  }
}

export function expandMissionPlaybook(
  input: MissionPlaybookExpandInput,
): MissionPlaybookPlanResult | null {
  if (input.playbookId === WEBINAR_FULFILLMENT_PLAYBOOK_ID) {
    return expandWebinarFulfillmentPlaybook(input)
  }
  return null
}
