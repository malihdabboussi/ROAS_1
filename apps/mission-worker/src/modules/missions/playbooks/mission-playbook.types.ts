export type MissionPlaybookStartAt = 'pre_call' | 'post_call' | 'launch_brief'

export type MissionPlaybookKickoff = {
  start_at?: MissionPlaybookStartAt | string
  notes?: string
  transcript_url?: string
  drive_links?: string
  client_context?: string
}

export type MissionPlaybookExpandInput = {
  playbookId: string
  mission: {
    id: string
    title: string
    brief?: string | null
    user_id: string
    org_id?: string | null
    input?: Record<string, unknown> | null
  }
  /** Preferred agent keys available on the campaign/org team. */
  workerAgentKeys: string[]
  managerKey: string
}

export type MissionPlaybookPlanResult = {
  kind: 'plan'
  title: string
  summary: string
  approach: string
  capability_gap: { exists: boolean; note: string; suggested_hire: string }
  harness: {
    contextSnapshot: {
      summary: string
      sources: Array<{ sourceType: string; title: string; confidence: string; summary: string }>
      missing: string[]
      sufficiency: { sufficientForPlan: boolean; sufficientForValidation: boolean; reason: string }
    }
    clarificationQuestions: unknown[]
    assumptions: Array<{
      assumptionKey: string
      statement: string
      confidence: string
      impact: string
    }>
    assertions: Array<{
      assertionKey: string
      category: string
      statement: string
      priority: 'must' | 'should' | 'could'
      validatorType: string
      evidenceRequirement: string
      failureSeverity: 'blocker' | 'major' | 'minor'
    }>
    assertionCoverage: Array<{
      assertionKey: string
      implementedBy: string[]
      verifiedBy: string[]
      rationale: string
    }>
    validatorPlan: Array<{
      validatorKey: string
      validatorType: string
      assertionKeys: string[]
      evidenceRequired: string
    }>
  }
  subtasks: Array<{
    id: string
    title: string
    assignTo: string
    dependsOn: string[]
    assertionKeys: string[]
    scheduledAt: null
    intent: {
      why: string
      story: string
      sensory: string
      endState: string
      ecology: string
    }
    outputContract?: {
      artifact_kind: 'document_artifact'
      required_action: string
      required_artifact_type: string
      expected?: Record<string, unknown>
    }
  }>
  outOfScope: string[]
  assignTo: string
}
