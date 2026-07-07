import { z } from 'zod'

export const FlowBuildSessionIdParamSchema = z.object({
  sessionId: z.string().uuid(),
})
export type FlowBuildSessionIdParam = z.infer<typeof FlowBuildSessionIdParamSchema>

export const FlowBlueprintIdParamSchema = z.object({
  blueprintId: z.string().uuid(),
})
export type FlowBlueprintIdParam = z.infer<typeof FlowBlueprintIdParamSchema>

export const FlowCreatePlanSchema = z
  .object({
    intent: z.string().min(1).max(4000),
    name: z.string().min(1).max(200).optional(),
    mode: z.enum(['create', 'update']).optional(),
    target_automation_id: z.string().uuid().optional(),
    defer_drafting: z.boolean().optional(),
    trigger: z.record(z.string(), z.unknown()).optional(),
    actions: z.array(z.record(z.string(), z.unknown())).max(20).optional(),
    prefer_custom: z.boolean().optional(),
  })
  .strict()
export type FlowCreatePlanDto = z.infer<typeof FlowCreatePlanSchema>

export const FlowCreateBuildSessionSchema = z
  .object({
    intent: z.string().min(1).max(4000),
    name: z.string().min(1).max(200).optional(),
    mode: z.enum(['create', 'update']).optional(),
    target_automation_id: z.string().uuid().optional(),
    conversation_id: z.string().uuid().optional(),
  })
  .strict()
export type FlowCreateBuildSessionDto = z.infer<typeof FlowCreateBuildSessionSchema>

const FlowClarificationOptionSchema = z
  .object({
    id: z.string().min(1).max(120),
    label: z.string().min(1).max(300),
    description: z.string().max(1000).optional(),
  })
  .strict()

export const FlowClarificationQuestionSchema = z
  .object({
    id: z.string().min(1).max(120),
    text: z.string().min(1).max(1000),
    type: z.enum(['single_choice', 'multiple_choice']),
    options: z.array(FlowClarificationOptionSchema).min(1).max(5),
    required: z.boolean().optional().default(true),
    target: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()

export const FlowCreateClarificationsSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    intro_message: z.string().max(1000).optional(),
    questions: z.array(FlowClarificationQuestionSchema).min(1).max(10),
  })
  .strict()
export type FlowCreateClarificationsDto = z.infer<typeof FlowCreateClarificationsSchema>

export const FlowUpdatePlanSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    trigger: z.record(z.string(), z.unknown()).nullable().optional(),
    actions: z.array(z.record(z.string(), z.unknown())).max(20).optional(),
    status: z.enum(['planned', 'validated', 'compiled', 'blocked']).optional(),
  })
  .strict()
export type FlowUpdatePlanDto = z.infer<typeof FlowUpdatePlanSchema>

export const FlowClarificationAnswerSchema = z
  .object({
    answers: z.record(z.string(), z.unknown()),
  })
  .strict()
export type FlowClarificationAnswerDto = z.infer<typeof FlowClarificationAnswerSchema>

export const FlowCompilePlanSchema = z
  .object({
    allow_invalid_draft: z.boolean().optional(),
  })
  .strict()
export type FlowCompilePlanDto = z.infer<typeof FlowCompilePlanSchema>

export const FlowBlueprintSearchSchema = z
  .object({
    query: z.string().optional(),
    status: z.enum(['draft', 'active', 'archived']).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict()
export type FlowBlueprintSearchDto = z.infer<typeof FlowBlueprintSearchSchema>

export const FlowCreateBlueprintSchema = z
  .object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    category: z.string().min(1).max(120).optional(),
    input_schema: z.record(z.string(), z.unknown()).optional(),
    action_template: z.record(z.string(), z.unknown()),
    required_contexts: z.array(z.string().min(1).max(80)).max(20).optional(),
    output_contexts: z.array(z.string().min(1).max(80)).max(20).optional(),
  })
  .strict()
export type FlowCreateBlueprintDto = z.infer<typeof FlowCreateBlueprintSchema>

export const FlowEvaluatePlanSchema = z
  .object({
    scenario_key: z.string().max(120).optional(),
    prompt: z.string().max(4000).optional(),
  })
  .strict()
export type FlowEvaluatePlanDto = z.infer<typeof FlowEvaluatePlanSchema>
