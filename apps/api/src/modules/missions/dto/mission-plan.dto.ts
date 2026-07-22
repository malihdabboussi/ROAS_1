import { z } from 'zod'
import { AgentKeySchema, OrgIdSchema } from './mission-core.dto'

const INTENT_FIELD_MAX_LENGTH = 1000
const INTENT_ECOLOGY_MAX_LENGTH = 4000

export const IntentPacketSchema = z.object({
  why: z.string().min(1).max(INTENT_FIELD_MAX_LENGTH),
  story: z.string().min(1).max(INTENT_FIELD_MAX_LENGTH),
  sensory: z.string().min(1).max(INTENT_FIELD_MAX_LENGTH),
  endState: z.string().min(1).max(INTENT_FIELD_MAX_LENGTH),
  ecology: z.string().min(1).max(INTENT_ECOLOGY_MAX_LENGTH),
})

export const MissionOutputContractSchema = z.object({
  artifact_kind: z.enum([
    'agent_skill',
    'document_artifact',
    'presentation_artifact',
    'brain_ingestion',
    'ad_artifact',
    'funnel_artifact',
    'media_artifact',
  ]),
  required_action: z.string().min(1).max(120),
  required_artifact_type: z.string().min(1).max(120),
  expected: z.record(z.unknown()).optional(),
})

export const MissionHarnessSourceSchema = z
  .object({
    sourceType: z.string().min(1).max(120).optional(),
    source_type: z.string().min(1).max(120).optional(),
    sourceId: z.string().max(200).optional(),
    source_id: z.string().max(200).optional(),
    title: z.string().max(500).optional(),
    confidence: z.string().max(60).optional(),
    summary: z.string().max(2000).optional(),
  })
  .passthrough()

export const MissionHarnessContextSnapshotSchema = z
  .object({
    summary: z.string().max(4000).optional(),
    sources: z.array(MissionHarnessSourceSchema).max(40).optional().default([]),
    missing: z.array(z.string().max(500)).max(20).optional().default([]),
    sufficiency: z.record(z.unknown()).optional().default({}),
  })
  .passthrough()

export const MissionHarnessClarificationQuestionSchema = z
  .object({
    questionKey: z.string().min(1).max(80).optional(),
    question_key: z.string().min(1).max(80).optional(),
    question: z.string().min(1).max(1000),
    rationale: z.string().max(1000).optional(),
    impact: z.string().max(1000).optional(),
    required: z.boolean().optional().default(false),
    options: z.array(z.string().max(300)).max(12).optional().default([]),
  })
  .passthrough()

export const MissionHarnessAssumptionSchema = z
  .object({
    assumptionKey: z.string().min(1).max(80).optional(),
    assumption_key: z.string().min(1).max(80).optional(),
    statement: z.string().min(1).max(1000).optional(),
    assumption: z.string().min(1).max(1000).optional(),
    confidence: z.string().max(60).optional(),
    impact: z.string().max(1000).optional(),
  })
  .passthrough()

export const MissionHarnessAssertionSchema = z
  .object({
    assertionKey: z.string().min(1).max(80).optional(),
    assertion_key: z.string().min(1).max(80).optional(),
    category: z.string().min(1).max(120),
    statement: z.string().min(1).max(1500),
    priority: z.enum(['must', 'should', 'could']).optional().default('must'),
    sourceRefs: z.array(z.record(z.unknown())).max(20).optional().default([]),
    source_refs: z.array(z.record(z.unknown())).max(20).optional().default([]),
    validatorType: z.string().min(1).max(120).optional(),
    validator_type: z.string().min(1).max(120).optional(),
    evidenceRequirement: z.string().min(1).max(1500).optional(),
    evidence_requirement: z.string().min(1).max(1500).optional(),
    failureSeverity: z.enum(['blocker', 'major', 'minor']).optional().default('major'),
    failure_severity: z.enum(['blocker', 'major', 'minor']).optional().default('major'),
  })
  .passthrough()

export const MissionHarnessAssertionCoverageSchema = z
  .object({
    assertionKey: z.string().min(1).max(80).optional(),
    assertion_key: z.string().min(1).max(80).optional(),
    implementedBy: z.array(z.string().min(1).max(120)).max(20).optional().default([]),
    implemented_by: z.array(z.string().min(1).max(120)).max(20).optional().default([]),
    verifiedBy: z.array(z.string().min(1).max(120)).max(20).optional().default([]),
    verified_by: z.array(z.string().min(1).max(120)).max(20).optional().default([]),
    rationale: z.string().max(1500).optional(),
  })
  .passthrough()

export const MissionHarnessValidatorPlanSchema = z
  .object({
    validatorKey: z.string().min(1).max(120).optional(),
    validator_key: z.string().min(1).max(120).optional(),
    validatorType: z.string().min(1).max(120).optional(),
    validator_type: z.string().min(1).max(120).optional(),
    assertionKeys: z.array(z.string().min(1).max(80)).max(40).optional().default([]),
    assertion_keys: z.array(z.string().min(1).max(80)).max(40).optional().default([]),
    evidenceRequired: z.string().max(1500).optional(),
    evidence_required: z.string().max(1500).optional(),
  })
  .passthrough()

export const MissionHarnessSpecSchema = z
  .object({
    contextSnapshot: MissionHarnessContextSnapshotSchema.optional(),
    context_snapshot: MissionHarnessContextSnapshotSchema.optional(),
    clarificationQuestions: z
      .array(MissionHarnessClarificationQuestionSchema)
      .max(12)
      .optional()
      .default([]),
    clarification_questions: z
      .array(MissionHarnessClarificationQuestionSchema)
      .max(12)
      .optional()
      .default([]),
    assumptions: z.array(MissionHarnessAssumptionSchema).max(20).optional().default([]),
    assertions: z.array(MissionHarnessAssertionSchema).max(80).optional().default([]),
    assertionCoverage: z
      .array(MissionHarnessAssertionCoverageSchema)
      .max(120)
      .optional()
      .default([]),
    assertion_coverage: z
      .array(MissionHarnessAssertionCoverageSchema)
      .max(120)
      .optional()
      .default([]),
    validatorPlan: z.array(MissionHarnessValidatorPlanSchema).max(20).optional().default([]),
    validator_plan: z.array(MissionHarnessValidatorPlanSchema).max(20).optional().default([]),
  })
  .passthrough()

export const PlanSubtaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  assignTo: AgentKeySchema,
  dependsOn: z.array(z.string()).optional().default([]),
  assertionKeys: z.array(z.string().min(1).max(80)).max(40).optional().default([]),
  intent: IntentPacketSchema,
  scheduledAt: z.string().datetime().nullable().optional(),
  publishToTaskList: z.boolean().optional().default(false),
  outputContract: MissionOutputContractSchema.optional(),
})

export const CreateMissionPlanDtoSchema = z.object({
  mission_id: z.string().uuid(),
  user_id: z.string().uuid(),
  org_id: OrgIdSchema,
  title: z.string().min(1).max(500),
  summary: z.string().max(2000),
  approach: z.string().max(2000),
  harness: MissionHarnessSpecSchema.optional(),
  contextSnapshot: MissionHarnessContextSnapshotSchema.optional(),
  clarificationQuestions: z
    .array(MissionHarnessClarificationQuestionSchema)
    .max(12)
    .optional()
    .default([]),
  assumptions: z.array(MissionHarnessAssumptionSchema).max(20).optional().default([]),
  assertions: z.array(MissionHarnessAssertionSchema).max(80).optional().default([]),
  assertionCoverage: z.array(MissionHarnessAssertionCoverageSchema).max(120).optional().default([]),
  validatorPlan: z.array(MissionHarnessValidatorPlanSchema).max(20).optional().default([]),
  subtasks: z.array(PlanSubtaskSchema).min(1),
  outOfScope: z.array(z.string()).optional().default([]),
  assignTo: AgentKeySchema,
})

export const SubtaskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'awaiting_human',
  'done',
  'revision',
  'blocked',
  'cancelled',
])

export const AssigneeTypeSchema = z.enum(['agent', 'human'])
export type AssigneeType = z.infer<typeof AssigneeTypeSchema>

// `human:<uuid>` prefix marks a human assignee; bare string is treated as agent_key.
const HUMAN_ASSIGN_PREFIX = 'human:'
export const HUMAN_ASSIGN_PREFIX_VALUE = HUMAN_ASSIGN_PREFIX

export function parseAssignTo(assignTo: string): {
  type: AssigneeType
  agent_key: string | null
  user_id: string | null
} {
  if (assignTo.startsWith(HUMAN_ASSIGN_PREFIX)) {
    const userId = assignTo.slice(HUMAN_ASSIGN_PREFIX.length).trim()
    return { type: 'human', agent_key: null, user_id: userId }
  }
  return { type: 'agent', agent_key: assignTo, user_id: null }
}

export const CompleteHumanSubtaskDtoSchema = z.object({
  summary: z.string().trim().min(1).max(10000),
  files: z
    .array(
      z.object({
        url: z.string().url(),
        name: z.string().min(1).max(500),
        size: z.number().int().nonnegative().optional(),
        mime_type: z.string().min(1).max(200).optional(),
        path: z.string().max(1000).optional(),
      }),
    )
    .max(20)
    .optional()
    .default([]),
  links: z
    .array(
      z.object({
        url: z.string().url(),
        label: z.string().max(200).optional(),
      }),
    )
    .max(20)
    .optional()
    .default([]),
})
export type CompleteHumanSubtaskDto = z.infer<typeof CompleteHumanSubtaskDtoSchema>

export const BounceSubtaskToAgentDtoSchema = z.object({
  agent_key: z.string().min(1).max(100),
  reason: z.string().trim().min(1).max(2000),
})
export type BounceSubtaskToAgentDto = z.infer<typeof BounceSubtaskToAgentDtoSchema>

export const ReassignHumanSubtaskDtoSchema = z.object({
  user_id: z.string().uuid(),
  reason: z.string().trim().max(2000).optional(),
})
export type ReassignHumanSubtaskDto = z.infer<typeof ReassignHumanSubtaskDtoSchema>

export const BlockHumanSubtaskDtoSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
})
export type BlockHumanSubtaskDto = z.infer<typeof BlockHumanSubtaskDtoSchema>

export const UpdateSubtaskDtoSchema = z.object({
  status: SubtaskStatusSchema.optional(),
  assigned_agent_key: AgentKeySchema.optional(),
  feedback: z.string().max(4000).nullable().optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
})

export type UpdateSubtaskDto = z.infer<typeof UpdateSubtaskDtoSchema>

export type CreateMissionPlanDto = z.infer<typeof CreateMissionPlanDtoSchema>
