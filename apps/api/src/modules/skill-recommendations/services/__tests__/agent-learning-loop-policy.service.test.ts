import { describe, expect, it } from 'vitest'
import { AgentLearningLoopPolicyService } from '../agent-learning-loop-policy.service'

describe('AgentLearningLoopPolicyService', () => {
  const policy = new AgentLearningLoopPolicyService()

  it('routes system-owned and platform-owned changes away from customer-visible recommendations', () => {
    const systemRoute = policy.classifyCandidate({
      orgId: 'org-1',
      targetAgentKey: 'hr',
      ownership: 'system',
      artifactKind: 'skill',
      artifactKey: 'skill-creator',
      evidenceKinds: ['missing_skill_examples'],
      suggestedSkillKey: 'skill-creator',
    })

    expect(systemRoute).toMatchObject({
      proposalKind: 'route_out',
      routeOutType: 'system_artifact_internal_review',
      customerVisible: false,
      targetAgentKey: 'hr',
      targetArtifactKind: 'skill',
      targetArtifactKey: 'skill-creator',
      artifactLockKey: 'system:hr:skill:skill-creator',
    })

    const platformRoute = policy.classifyCandidate({
      orgId: 'org-1',
      targetAgentKey: 'designer',
      ownership: 'platform',
      artifactKind: 'tool_schema',
      artifactKey: 'send_to_agent',
      evidenceKinds: ['tool_contract_problem'],
    })

    expect(platformRoute).toMatchObject({
      proposalKind: 'route_out',
      routeOutType: 'product_fix_proposal',
      customerVisible: false,
      targetArtifactKind: 'tool_schema',
      targetArtifactKey: 'send_to_agent',
      artifactLockKey: 'platform:designer:tool_schema:send_to_agent',
    })
  })

  it('selects only skills or agent files as Jaime-owned customer proposal targets', () => {
    expect(
      policy.classifyCandidate({
        orgId: 'org-1',
        targetAgentKey: 'designer',
        ownership: 'org',
        artifactKind: 'skill',
        artifactKey: null,
        suggestedSkillKey: 'proposal-doc-builder',
        evidenceKinds: ['repeatable_action'],
      }),
    ).toMatchObject({
      proposalKind: 'skill_create',
      customerVisible: true,
      targetArtifactKind: 'skill',
      targetArtifactKey: 'proposal-doc-builder',
      artifactLockKey: 'org-1:designer:skill:proposal-doc-builder',
    })

    expect(
      policy.classifyCandidate({
        orgId: 'org-1',
        targetAgentKey: 'designer',
        ownership: 'org',
        artifactKind: 'skill',
        artifactKey: 'proposal-doc-builder',
        evidenceKinds: ['repeatable_action', 'missing_skill_examples'],
      }),
    ).toMatchObject({
      proposalKind: 'skill_update',
      customerVisible: true,
      targetArtifactKind: 'skill',
      targetArtifactKey: 'proposal-doc-builder',
    })

    expect(
      policy.classifyCandidate({
        orgId: 'org-1',
        targetAgentKey: 'designer',
        ownership: 'org',
        artifactKind: 'agent_file',
        artifactKey: 'ROLE.md',
        evidenceKinds: ['role_boundary_violation'],
      }),
    ).toMatchObject({
      proposalKind: 'agent_file_update',
      customerVisible: true,
      targetArtifactKind: 'agent_file',
      targetArtifactKey: 'ROLE.md',
    })
  })

  it('uses scope fit as a hard gate before ranking candidate priority', () => {
    expect(
      policy.scoreCandidate({
        scopeFit: 1,
        userValue: 0.9,
        recurrence: 0.8,
        evidenceConfidence: 0.75,
        blastRadius: 0.6,
        freshness: 0.5,
      }),
    ).toEqual({
      score: 78,
      band: 'high',
      eligibleForProposal: true,
      blockedReason: null,
    })

    expect(
      policy.scoreCandidate({
        scopeFit: 0,
        userValue: 1,
        recurrence: 1,
        evidenceConfidence: 1,
        blastRadius: 1,
        freshness: 1,
      }),
    ).toEqual({
      score: 0,
      band: 'blocked',
      eligibleForProposal: false,
      blockedReason: 'scope_fit_failed',
    })
  })

  it('turns experiment metrics into keep, revise, revert, or inconclusive decisions', () => {
    expect(
      policy.evaluateExperiment({
        baseline: {
          primarySuccessRate: 0.5,
          toolErrorRate: 0.1,
          roleViolationRate: 0.02,
          negativeFeedbackRate: 0.08,
        },
        current: {
          primarySuccessRate: 0.68,
          toolErrorRate: 0.105,
          roleViolationRate: 0.02,
          negativeFeedbackRate: 0.06,
        },
        qualifyingEvents: 24,
        elapsedDays: 10,
      }),
    ).toMatchObject({
      decision: 'keep',
      primaryChangePct: 36,
      maxGuardrailWorseningPct: 5,
    })

    expect(
      policy.evaluateExperiment({
        baseline: {
          primarySuccessRate: 0.6,
          toolErrorRate: 0.1,
          roleViolationRate: 0.02,
          negativeFeedbackRate: 0.08,
        },
        current: {
          primarySuccessRate: 0.67,
          toolErrorRate: 0.115,
          roleViolationRate: 0.02,
          negativeFeedbackRate: 0.08,
        },
        qualifyingEvents: 20,
        elapsedDays: 8,
      }),
    ).toMatchObject({
      decision: 'revise',
      primaryChangePct: 12,
      maxGuardrailWorseningPct: 15,
    })

    expect(
      policy.evaluateExperiment({
        baseline: {
          primarySuccessRate: 0.7,
          toolErrorRate: 0.1,
          roleViolationRate: 0.02,
          negativeFeedbackRate: 0.08,
        },
        current: {
          primarySuccessRate: 0.66,
          toolErrorRate: 0.13,
          roleViolationRate: 0.025,
          negativeFeedbackRate: 0.12,
        },
        qualifyingEvents: 18,
        elapsedDays: 14,
      }),
    ).toMatchObject({
      decision: 'revert',
    })

    expect(
      policy.evaluateExperiment({
        baseline: {
          primarySuccessRate: 0.5,
          toolErrorRate: 0.1,
          roleViolationRate: 0.02,
          negativeFeedbackRate: 0.08,
        },
        current: {
          primarySuccessRate: 0.75,
          toolErrorRate: 0.08,
          roleViolationRate: 0.02,
          negativeFeedbackRate: 0.06,
        },
        qualifyingEvents: 4,
        elapsedDays: 20,
      }),
    ).toMatchObject({
      decision: 'inconclusive',
      reasons: ['not_enough_minimum_events'],
    })
  })

  it('patches pending proposals and locks artifacts with running experiments', () => {
    const artifactLockKey = 'org-1:designer:skill:proposal-doc-builder'

    expect(
      policy.resolveProposalConflict({
        artifactLockKey,
        pendingProposals: [
          {
            id: 'proposal-1',
            artifactLockKey,
            status: 'pending',
          },
        ],
        runningExperiments: [],
      }),
    ).toEqual({
      action: 'patch_existing_pending_proposal',
      proposalId: 'proposal-1',
      experimentId: null,
    })

    expect(
      policy.resolveProposalConflict({
        artifactLockKey,
        pendingProposals: [],
        runningExperiments: [
          {
            id: 'experiment-1',
            artifactLockKey,
            status: 'running',
          },
        ],
      }),
    ).toEqual({
      action: 'wait_for_running_experiment',
      proposalId: null,
      experimentId: 'experiment-1',
    })

    expect(
      policy.resolveProposalConflict({
        artifactLockKey,
        pendingProposals: [],
        runningExperiments: [],
      }),
    ).toEqual({
      action: 'create_new_proposal',
      proposalId: null,
      experimentId: null,
    })
  })

  it('requires context-engineered proposal output before Jaime can propose a change', () => {
    expect(
      policy.evaluateProposalQuality({
        proposalKind: 'skill_update',
        evidenceEventIds: ['event-1', 'event-2', 'event-3'],
        hasWhy: true,
        hasTrigger: true,
        hasDecisionRules: true,
        hasConcreteExamples: false,
        hasExpectedOutput: true,
        privateDataRisk: 'none',
      }),
    ).toEqual({
      ok: false,
      failures: ['concrete_examples_required'],
    })

    expect(
      policy.evaluateProposalQuality({
        proposalKind: 'agent_file_update',
        evidenceEventIds: ['event-1', 'event-2', 'event-3', 'event-4', 'event-5'],
        hasWhy: true,
        hasTrigger: true,
        hasDecisionRules: true,
        hasConcreteExamples: true,
        hasExpectedOutput: true,
        privateDataRisk: 'none',
      }),
    ).toEqual({
      ok: true,
      failures: [],
    })
  })
})
