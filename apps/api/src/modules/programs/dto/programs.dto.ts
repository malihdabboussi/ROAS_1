import { z } from 'zod'

export const ProgramIdParamSchema = z.object({
  id: z.string().uuid('Invalid program ID'),
})
export type ProgramIdParam = z.infer<typeof ProgramIdParamSchema>

export const ProgramShareIdParamSchema = z.object({
  id: z.string().uuid('Invalid program ID'),
  shareId: z.string().uuid('Invalid share ID'),
})
export type ProgramShareIdParam = z.infer<typeof ProgramShareIdParamSchema>

export const ProgramVisibilitySchema = z.enum(['workspace', 'private', 'selected'])
export type ProgramVisibility = z.infer<typeof ProgramVisibilitySchema>

export const ProgramShareLevelSchema = z.enum(['view', 'edit'])
export type ProgramShareLevel = z.infer<typeof ProgramShareLevelSchema>

export const UpsertProgramShareSchema = z.object({
  entity_type: z.literal('user'),
  entity_id: z.string().uuid('Invalid member user ID'),
  level: ProgramShareLevelSchema,
})
export type UpsertProgramShareInput = z.infer<typeof UpsertProgramShareSchema>

export const CreateProgramSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case')
    .optional(),
  icon: z.string().trim().max(80).nullable().optional(),
  icon_color: z.string().trim().max(40).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  visibility: ProgramVisibilitySchema.optional(),
})
export type CreateProgramInput = z.infer<typeof CreateProgramSchema>

export const UpdateProgramSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  icon: z.string().trim().max(80).nullable().optional(),
  icon_color: z.string().trim().max(40).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  visibility: ProgramVisibilitySchema.optional(),
})
export type UpdateProgramInput = z.infer<typeof UpdateProgramSchema>

export type ProgramSystemKind = 'clients' | 'roas_ops' | 'personal'

export type ProgramRow = {
  id: string
  org_id: string | null
  user_id: string | null
  name: string
  slug: string
  system_kind: ProgramSystemKind | null
  icon: string | null
  icon_color: string | null
  sort_order: number
  config: Record<string, unknown>
  visibility: ProgramVisibility
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  campaign_count?: number
  effective_level?: ProgramShareLevel | null
}

export type ProgramShareRow = {
  id: string
  program_id: string
  org_id: string | null
  entity_type: 'user'
  entity_id: string
  level: ProgramShareLevel
  created_by: string
  created_at: string
}
