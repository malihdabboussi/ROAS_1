import { z } from 'zod'

export const UpdateTeamProfileSchema = z
  .object({
    functional_role: z.string().trim().min(1).max(120).nullable().optional(),
    specialties: z.array(z.string().trim().min(1).max(60)).max(25).optional(),
    accepts_agent_assignments: z.boolean().optional(),
    delegation_notes: z.string().max(2000).nullable().optional(),
    timezone: z.string().max(64).nullable().optional(),
    working_hours: z
      .record(
        z.string(),
        z.object({
          start: z.string().regex(/^\d{2}:\d{2}$/),
          end: z.string().regex(/^\d{2}:\d{2}$/),
        }),
      )
      .nullable()
      .optional(),
    out_of_office_until: z.string().datetime().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one profile field is required',
  })
export type UpdateTeamProfileDto = z.infer<typeof UpdateTeamProfileSchema>

export const TeamRosterUserIdParamSchema = z.object({
  userId: z.string().uuid(),
})
export type TeamRosterUserIdParam = z.infer<typeof TeamRosterUserIdParamSchema>

export const TeamRosterQuerySchema = z.object({
  kind: z.enum(['agent', 'human', 'all']).optional().default('all'),
  ready_only: z.coerce.boolean().optional().default(false),
})
export type TeamRosterQuery = z.infer<typeof TeamRosterQuerySchema>

const ConfidenceSchema = z.coerce.number().min(0).max(1)

export const LearnFromSlackModelOutputSchema = z.object({
  functional_role: z.object({
    value: z.string().trim().max(120).nullable(),
    confidence: ConfidenceSchema,
    evidence: z.string().max(500).default(''),
  }),
  specialties: z.object({
    value: z.array(z.string().trim().min(1).max(60)).max(8).default([]),
    confidence: ConfidenceSchema,
    evidence: z.string().max(500).default(''),
  }),
  delegation_notes: z.object({
    value: z.string().trim().max(2000).nullable(),
    confidence: ConfidenceSchema,
    evidence: z.string().max(500).default(''),
  }),
  timezone: z.object({
    value: z.string().trim().max(64).nullable(),
    confidence: ConfidenceSchema,
  }),
})
export type LearnFromSlackModelOutput = z.infer<typeof LearnFromSlackModelOutputSchema>

export interface LearnFromSlackResponse {
  source: 'slack'
  slack_user_id: string
  slack_profile: {
    real_name: string | null
    title: string | null
    timezone: string | null
  } | null
  messages_sampled: number
  suggestions: LearnFromSlackModelOutput
  credits_used: number
  credits_remaining: number
  model_name: string
}
