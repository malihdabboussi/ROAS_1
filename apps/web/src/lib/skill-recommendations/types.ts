export type SkillRecommendationStatus =
  | 'ready'
  | 'dismissed'
  | 'converted'
  | 'routed_out'
  | 'experiment_running'
  | 'kept'
  | 'revising'
  | 'reverted'
  | 'inconclusive'

export type SkillRecommendationProposalKind =
  | 'skill_create'
  | 'skill_update'
  | 'skill_resource_update'
  | 'agent_file_update'
  | 'route_out'

export type SkillRecommendationTargetArtifactKind =
  | 'skill'
  | 'skill_resource'
  | 'agent_file'
  | 'tool_schema'

export type SkillRecommendationRouteOutType =
  | 'system_artifact_internal_review'
  | 'product_fix_proposal'
  | 'unsupported_scope'

export type AgentLearningExperimentDecision = 'keep' | 'revise' | 'revert' | 'inconclusive'

export interface SkillRecommendationSettings {
  enabled: boolean
}

export interface SkillRecommendationResource {
  file_path: string
  content_type: string
  content: string
  storage_url?: string | null
}

export interface SkillRecommendation {
  id: string
  org_id: string
  candidate_id: string
  job_id: string | null
  target_agent_key: string
  skill_key: string
  name: string
  description: string
  markdown_content: string
  resources: SkillRecommendationResource[]
  evidence_event_ids: string[]
  workflow_summary: string
  recommended_actions: string[]
  confidence: number
  status: SkillRecommendationStatus
  proposal_kind: SkillRecommendationProposalKind
  route_out_type: SkillRecommendationRouteOutType | null
  customer_visible: boolean
  target_artifact_kind: SkillRecommendationTargetArtifactKind
  target_artifact_key: string | null
  artifact_lock_key: string | null
  priority_score: number
  proposed_patch: Record<string, unknown>
  quality_failures: string[]
  applied_checkpoint_id: string | null
  applied_experiment_id: string | null
  applied_at: string | null
  applied_by: string | null
  created_at: string
  updated_at: string
}

export interface SkillRecommendationApplyResponse {
  recommendation: SkillRecommendation
  checkpoint_id: string
  experiment_id: string
}

export interface SkillRecommendationExperimentEvaluation {
  decision: AgentLearningExperimentDecision
  primary_change_pct: number
  max_guardrail_worsening_pct: number
  reasons: string[]
}

export interface SkillRecommendationPending {
  id: string
  candidate_id: string
  target_agent_key: string
  run_count: number
  status: string
  last_seen_at: string | null
  tool_names: string[]
}

export interface SkillRecommendationHomeResponse {
  settings: SkillRecommendationSettings
  recommendations: SkillRecommendation[]
  pending: SkillRecommendationPending[]
}
