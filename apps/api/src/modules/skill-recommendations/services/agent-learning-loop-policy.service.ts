import { Injectable } from '@nestjs/common'

export type AgentLearningEvidenceKind =
  | 'repeatable_action'
  | 'missing_skill_examples'
  | 'missing_skill_reference'
  | 'role_boundary_violation'
  | 'identity_confusion'
  | 'tone_or_values_mismatch'
  | 'tool_contract_problem'

export type AgentLearningArtifactOwnership = 'org' | 'system' | 'platform'

export type AgentLearningArtifactKind = 'skill' | 'skill_resource' | 'agent_file' | 'tool_schema'

export type AgentLearningProposalKind =
  | 'skill_create'
  | 'skill_update'
  | 'skill_resource_update'
  | 'agent_file_update'
  | 'route_out'

export type AgentLearningRouteOutType =
  | 'system_artifact_internal_review'
  | 'product_fix_proposal'
  | 'unsupported_scope'

export type AgentLearningScoreBand = 'high' | 'medium' | 'low' | 'blocked'

export type AgentLearningExperimentDecision = 'keep' | 'revise' | 'revert' | 'inconclusive'

export interface AgentLearningCandidateInput {
  orgId: string
  targetAgentKey: string
  ownership: AgentLearningArtifactOwnership
  artifactKind: AgentLearningArtifactKind
  artifactKey: string | null
  evidenceKinds: AgentLearningEvidenceKind[]
  suggestedSkillKey?: string | null
}

export interface AgentLearningClassification {
  proposalKind: AgentLearningProposalKind
  routeOutType: AgentLearningRouteOutType | null
  customerVisible: boolean
  targetAgentKey: string
  targetArtifactKind: AgentLearningArtifactKind
  targetArtifactKey: string
  artifactLockKey: string
  reason: string
}

export interface AgentLearningScoreInput {
  scopeFit: number
  userValue: number
  recurrence: number
  evidenceConfidence: number
  blastRadius: number
  freshness: number
}

export interface AgentLearningScoreResult {
  score: number
  band: AgentLearningScoreBand
  eligibleForProposal: boolean
  blockedReason: string | null
}

export interface AgentLearningExperimentMetrics {
  primarySuccessRate: number
  toolErrorRate: number
  roleViolationRate: number
  negativeFeedbackRate: number
}

export interface AgentLearningExperimentInput {
  baseline: AgentLearningExperimentMetrics
  current: AgentLearningExperimentMetrics
  qualifyingEvents: number
  elapsedDays: number
  minimumQualifyingEvents?: number
  enoughEvents?: number
  enoughDays?: number
  trustedNegativeFeedbackCount?: number
}

export interface AgentLearningExperimentResult {
  decision: AgentLearningExperimentDecision
  primaryChangePct: number
  maxGuardrailWorseningPct: number
  reasons: string[]
}

export interface AgentLearningProposalReference {
  id: string
  artifactLockKey: string
  status: 'pending' | 'approved' | 'rejected' | 'superseded'
}

export interface AgentLearningExperimentReference {
  id: string
  artifactLockKey: string
  status: 'running' | 'completed' | 'reverted'
}

export interface AgentLearningConflictInput {
  artifactLockKey: string
  pendingProposals: AgentLearningProposalReference[]
  runningExperiments: AgentLearningExperimentReference[]
}

export interface AgentLearningConflictResult {
  action:
    | 'patch_existing_pending_proposal'
    | 'wait_for_running_experiment'
    | 'create_new_proposal'
  proposalId: string | null
  experimentId: string | null
}

export interface AgentLearningProposalQualityInput {
  proposalKind: Exclude<AgentLearningProposalKind, 'route_out'>
  evidenceEventIds: string[]
  hasWhy: boolean
  hasTrigger: boolean
  hasDecisionRules: boolean
  hasConcreteExamples: boolean
  hasExpectedOutput: boolean
  privateDataRisk: 'none' | 'possible' | 'confirmed'
}

export interface AgentLearningProposalQualityResult {
  ok: boolean
  failures: string[]
}

@Injectable()
export class AgentLearningLoopPolicyService {
  classifyCandidate(input: AgentLearningCandidateInput): AgentLearningClassification {
    const platformOwned =
      input.ownership === 'platform' ||
      input.artifactKind === 'tool_schema' ||
      input.evidenceKinds.includes('tool_contract_problem')

    if (platformOwned) {
      return this.routeOut(input, 'product_fix_proposal')
    }

    if (input.ownership === 'system') {
      return this.routeOut(input, 'system_artifact_internal_review')
    }

    const agentFileKey = this.resolveAgentFileTarget(input.evidenceKinds)
    if (agentFileKey) {
      return this.customerProposal(input, 'agent_file_update', 'agent_file', agentFileKey)
    }

    if (
      input.artifactKind === 'skill_resource' ||
      input.evidenceKinds.includes('missing_skill_reference')
    ) {
      const skillKey = input.artifactKey ?? input.suggestedSkillKey ?? 'skill-reference'
      return this.customerProposal(input, 'skill_resource_update', 'skill_resource', skillKey)
    }

    if (input.artifactKind === 'skill') {
      const skillKey = input.artifactKey ?? input.suggestedSkillKey ?? 'new-skill'
      const proposalKind = input.artifactKey ? 'skill_update' : 'skill_create'
      return this.customerProposal(input, proposalKind, 'skill', skillKey)
    }

    return this.routeOut(input, 'unsupported_scope')
  }

  scoreCandidate(input: AgentLearningScoreInput): AgentLearningScoreResult {
    const scopeFit = this.clamp(input.scopeFit)
    if (scopeFit <= 0) {
      return {
        score: 0,
        band: 'blocked',
        eligibleForProposal: false,
        blockedReason: 'scope_fit_failed',
      }
    }

    const weightedScore =
      0.35 * this.clamp(input.userValue) +
      0.25 * this.clamp(input.recurrence) +
      0.2 * this.clamp(input.evidenceConfidence) +
      0.1 * this.clamp(input.blastRadius) +
      0.1 * this.clamp(input.freshness)
    const score = Math.round(weightedScore * scopeFit * 100)
    const band = this.scoreBand(score)

    return {
      score,
      band,
      eligibleForProposal: score >= 55,
      blockedReason: null,
    }
  }

  evaluateExperiment(input: AgentLearningExperimentInput): AgentLearningExperimentResult {
    const minimumEvents = input.minimumQualifyingEvents ?? 5
    const enoughEvents = input.enoughEvents ?? 20
    const enoughDays = input.enoughDays ?? 14
    const primaryChangePct = this.percentChange(
      input.baseline.primarySuccessRate,
      input.current.primarySuccessRate,
    )
    const toolErrorWorseningPct = this.worseningPercent(
      input.baseline.toolErrorRate,
      input.current.toolErrorRate,
    )
    const roleViolationWorseningPct = this.worseningPercent(
      input.baseline.roleViolationRate,
      input.current.roleViolationRate,
    )
    const negativeFeedbackWorseningPct = this.worseningPercent(
      input.baseline.negativeFeedbackRate,
      input.current.negativeFeedbackRate,
    )
    const maxGuardrailWorseningPct = Math.max(
      toolErrorWorseningPct,
      roleViolationWorseningPct,
      negativeFeedbackWorseningPct,
    )

    if (input.qualifyingEvents < minimumEvents) {
      return {
        decision: 'inconclusive',
        primaryChangePct,
        maxGuardrailWorseningPct,
        reasons: ['not_enough_minimum_events'],
      }
    }

    if (input.qualifyingEvents < enoughEvents && input.elapsedDays < enoughDays) {
      return {
        decision: 'inconclusive',
        primaryChangePct,
        maxGuardrailWorseningPct,
        reasons: ['evidence_window_open'],
      }
    }

    if (
      primaryChangePct < 0 ||
      maxGuardrailWorseningPct > 20 ||
      roleViolationWorseningPct > 0 ||
      (input.trustedNegativeFeedbackCount ?? 0) > 0
    ) {
      return {
        decision: 'revert',
        primaryChangePct,
        maxGuardrailWorseningPct,
        reasons: ['regression_detected'],
      }
    }

    if (primaryChangePct >= 30 && maxGuardrailWorseningPct <= 10) {
      return {
        decision: 'keep',
        primaryChangePct,
        maxGuardrailWorseningPct,
        reasons: ['strong_primary_improvement'],
      }
    }

    if (primaryChangePct >= 10 || maxGuardrailWorseningPct >= 10) {
      return {
        decision: 'revise',
        primaryChangePct,
        maxGuardrailWorseningPct,
        reasons: ['partial_or_noisy_improvement'],
      }
    }

    return {
      decision: 'inconclusive',
      primaryChangePct,
      maxGuardrailWorseningPct,
      reasons: ['low_signal_change'],
    }
  }

  resolveProposalConflict(input: AgentLearningConflictInput): AgentLearningConflictResult {
    const runningExperiment = input.runningExperiments.find(
      (experiment) =>
        experiment.artifactLockKey === input.artifactLockKey && experiment.status === 'running',
    )
    if (runningExperiment) {
      return {
        action: 'wait_for_running_experiment',
        proposalId: null,
        experimentId: runningExperiment.id,
      }
    }

    const pendingProposal = input.pendingProposals.find(
      (proposal) =>
        proposal.artifactLockKey === input.artifactLockKey && proposal.status === 'pending',
    )
    if (pendingProposal) {
      return {
        action: 'patch_existing_pending_proposal',
        proposalId: pendingProposal.id,
        experimentId: null,
      }
    }

    return {
      action: 'create_new_proposal',
      proposalId: null,
      experimentId: null,
    }
  }

  evaluateProposalQuality(
    input: AgentLearningProposalQualityInput,
  ): AgentLearningProposalQualityResult {
    const failures: string[] = []

    if (input.evidenceEventIds.length < 3) failures.push('minimum_evidence_required')
    if (!input.hasWhy) failures.push('why_required')
    if (!input.hasTrigger) failures.push('trigger_required')
    if (!input.hasDecisionRules) failures.push('decision_rules_required')
    if (!input.hasConcreteExamples) failures.push('concrete_examples_required')
    if (!input.hasExpectedOutput) failures.push('expected_output_required')
    if (input.privateDataRisk !== 'none') failures.push('private_data_risk')

    return {
      ok: failures.length === 0,
      failures,
    }
  }

  private customerProposal(
    input: AgentLearningCandidateInput,
    proposalKind: Exclude<AgentLearningProposalKind, 'route_out'>,
    artifactKind: AgentLearningArtifactKind,
    artifactKey: string,
  ): AgentLearningClassification {
    return {
      proposalKind,
      routeOutType: null,
      customerVisible: true,
      targetAgentKey: input.targetAgentKey,
      targetArtifactKind: artifactKind,
      targetArtifactKey: artifactKey,
      artifactLockKey: this.artifactLockKey(input.orgId, input.targetAgentKey, artifactKind, artifactKey),
      reason: 'Jaime can propose this org-owned agent or skill change.',
    }
  }

  private routeOut(
    input: AgentLearningCandidateInput,
    routeOutType: AgentLearningRouteOutType,
  ): AgentLearningClassification {
    const artifactKey = input.artifactKey ?? input.suggestedSkillKey ?? 'unknown'
    return {
      proposalKind: 'route_out',
      routeOutType,
      customerVisible: false,
      targetAgentKey: input.targetAgentKey,
      targetArtifactKind: input.artifactKind,
      targetArtifactKey: artifactKey,
      artifactLockKey: this.artifactLockKey(
        input.ownership === 'org' ? input.orgId : input.ownership,
        input.targetAgentKey,
        input.artifactKind,
        artifactKey,
      ),
      reason:
        routeOutType === 'product_fix_proposal'
          ? 'Platform-owned tool or schema issues require an internal product fix proposal.'
          : 'System-owned artifacts require internal Vibey review, not a customer-visible recommendation.',
    }
  }

  private artifactLockKey(
    scopeKey: string,
    targetAgentKey: string,
    artifactKind: AgentLearningArtifactKind,
    artifactKey: string,
  ): string {
    return [scopeKey, targetAgentKey, artifactKind, artifactKey].join(':')
  }

  private resolveAgentFileTarget(
    evidenceKinds: AgentLearningEvidenceKind[],
  ): 'ROLE.md' | 'IDENTITY.md' | 'SOUL.md' | null {
    if (evidenceKinds.includes('role_boundary_violation')) return 'ROLE.md'
    if (evidenceKinds.includes('identity_confusion')) return 'IDENTITY.md'
    if (evidenceKinds.includes('tone_or_values_mismatch')) return 'SOUL.md'
    return null
  }

  private scoreBand(score: number): AgentLearningScoreBand {
    if (score >= 75) return 'high'
    if (score >= 55) return 'medium'
    return 'low'
  }

  private percentChange(baseline: number, current: number): number {
    if (baseline === 0) return current > 0 ? 100 : 0
    return Math.round(((current - baseline) / baseline) * 100)
  }

  private worseningPercent(baseline: number, current: number): number {
    return Math.max(0, this.percentChange(baseline, current))
  }

  private clamp(value: number): number {
    if (!Number.isFinite(value)) return 0
    return Math.min(Math.max(value, 0), 1)
  }
}
