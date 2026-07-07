import { z } from 'zod'

export const AgentFeedbackTargetKindSchema = z.enum([
  'conversation_message',
  'space_item_activity',
  'mission_log',
])

export const AgentFeedbackTagSchema = z.enum([
  'helpful',
  'clear',
  'wrong',
  'missed_context',
  'tool_problem',
  'too_slow',
  'tone_issue',
])

export const SaveAgentFeedbackSchema = z.object({
  target_kind: AgentFeedbackTargetKindSchema,
  target_id: z.string().uuid(),
  thumbs_up: z.boolean(),
  tags: z.array(AgentFeedbackTagSchema).max(8).optional().default([]),
  feedback_text: z.string().max(2000).nullable().optional(),
  source_surface: z.string().trim().min(1).max(80),
})

export const LookupAgentFeedbackSchema = z.object({
  targets: z
    .array(
      z.object({
        target_kind: AgentFeedbackTargetKindSchema,
        target_id: z.string().uuid(),
      }),
    )
    .min(1)
    .max(100),
})

export type AgentFeedbackTargetKind = z.infer<typeof AgentFeedbackTargetKindSchema>
export type AgentFeedbackTag = z.infer<typeof AgentFeedbackTagSchema>
export type SaveAgentFeedbackDto = z.infer<typeof SaveAgentFeedbackSchema>
export type LookupAgentFeedbackDto = z.infer<typeof LookupAgentFeedbackSchema>
export type AgentFeedbackLookupTarget = LookupAgentFeedbackDto['targets'][number]
