import { z } from 'zod'

export const ProgramIdParamSchema = z.object({
  id: z.string().uuid('Invalid program ID'),
})
export type ProgramIdParam = z.infer<typeof ProgramIdParamSchema>

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
})
export type CreateProgramInput = z.infer<typeof CreateProgramSchema>

export const UpdateProgramSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  icon: z.string().trim().max(80).nullable().optional(),
  icon_color: z.string().trim().max(40).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
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
  created_at: string
  updated_at: string
  deleted_at: string | null
  campaign_count?: number
}
