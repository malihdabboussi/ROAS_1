export type MissionOutputContract = {
  artifact_kind:
    | 'agent_skill'
    | 'document_artifact'
    | 'presentation_artifact'
    | 'brain_ingestion'
    | 'ad_artifact'
    | 'funnel_artifact'
    | 'media_artifact'
  required_action: string
  required_artifact_type: string
  expected?: Record<string, unknown>
}

export type MissionContractVerificationResult = {
  ok: boolean
  reason?: string
  expected_action: string
  expected_artifact_type: string
  found_artifact_id?: string
  recovery: 'corrective_run' | 'vibey_replan' | 'block_user'
}
