export type SkillRecommendationJobStatus =
  | 'queued'
  | 'processing'
  | 'retry'
  | 'succeeded'
  | 'failed'

export type SkillRecommendationCandidateStatus =
  | 'open'
  | 'analysis_queued'
  | 'analysis_processing'
  | 'recommended'
  | 'routed_out'
  | 'skipped'
  | 'dismissed'
  | 'converted'

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

export type AgentLearningExperimentStatus = 'running' | 'completed' | 'reverted'

export type AgentLearningExperimentDecision =
  | 'keep'
  | 'revise'
  | 'revert'
  | 'inconclusive'

export interface SkillRecommendationSettings {
  enabled: boolean
}

export interface SkillRecommendationResource {
  file_path: string
  content_type: string
  content: string
  storage_url?: string | null
}

export interface SkillRecommendationEventRow {
  id: string
  user_id: string
  org_id: string
  agent_key: string
  conversation_id: string | null
  trace_id: string | null
  channel: string | null
  prompt_fingerprint: string
  prompt_excerpt: string | null
  tool_signature: string
  tool_names: string[]
  skill_keys_used: string[]
  workflow_keys_used: string[]
  status: 'completed' | 'failed'
  created_at: string
}

export interface SkillRecommendationTraceEvidence {
  event_id: string
  trace_id: string
  user_message: string | null
  agent_response: string | null
  tool_steps_excerpt: string | null
  messages_input_excerpt: string | null
  messages_output_excerpt: string | null
  system_prompt_excerpt: string | null
  model: string | null
  status: string | null
  total_tokens: number | null
  duration_ms: number | null
  completed_at: string | null
}

export interface AgentTurnFeedbackSummary {
  total_count: number
  positive_count: number
  negative_count: number
  trusted_negative_count: number
  top_tags: string[]
}

export interface SkillRecommendationCandidateRow {
  id: string
  org_id: string
  agent_key: string
  prompt_fingerprint: string
  tool_signature: string
  tool_names: string[]
  run_count: number
  evidence_event_ids: string[]
  first_event_at: string | null
  last_event_at: string | null
  status: SkillRecommendationCandidateStatus
  skip_reason: string | null
  created_at: string
  updated_at: string
}

export interface SkillRecommendationJobRow {
  id: string
  user_id: string
  org_id: string
  candidate_id: string
  dedupe_key: string
  payload: Record<string, unknown>
  status: SkillRecommendationJobStatus
  attempts: number
  max_attempts: number
  next_attempt_at: string
  last_error: string | null
  result: Record<string, unknown> | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface SkillRecommendationRow {
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

export interface AgentLearningExperimentRow {
  id: string
  org_id: string
  recommendation_id: string
  target_agent_key: string
  artifact_lock_key: string
  status: AgentLearningExperimentStatus
  baseline_metrics: Record<string, unknown>
  current_metrics: Record<string, unknown>
  qualifying_events: number
  decision: AgentLearningExperimentDecision | null
  decision_reasons: string[]
  started_at: string
  ends_at: string | null
  decided_at: string | null
  created_at: string
  updated_at: string
}

export interface SkillRecommendationHomePending {
  id: string
  candidate_id: string
  target_agent_key: string
  run_count: number
  status: SkillRecommendationCandidateStatus | SkillRecommendationJobStatus
  last_seen_at: string | null
  tool_names: string[]
}

export interface SkillRecommendationHomeResponse {
  settings: SkillRecommendationSettings
  recommendations: SkillRecommendationRow[]
  pending: SkillRecommendationHomePending[]
}
