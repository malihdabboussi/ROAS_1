import { z } from 'zod'

export const SpaceShareLevelSchema = z.enum(['admin', 'edit', 'view'])
export type SpaceShareLevel = z.infer<typeof SpaceShareLevelSchema>

export const SpaceShareEntityTypeSchema = z.enum(['user', 'org'])
export type SpaceShareEntityType = z.infer<typeof SpaceShareEntityTypeSchema>

export const SpaceShareIdParamSchema = z.object({ shareId: z.string().uuid() })
export type SpaceShareIdParam = z.infer<typeof SpaceShareIdParamSchema>

export const SpaceShareTokenParamSchema = z.object({ token: z.string().uuid() })
export type SpaceShareTokenParam = z.infer<typeof SpaceShareTokenParamSchema>

export const UpsertSpaceItemShareSchema = z.object({
  entity_type: SpaceShareEntityTypeSchema,
  entity_id: z.string().uuid(),
  level: SpaceShareLevelSchema,
  inherit_to_children: z.boolean().optional(),
})
export type UpsertSpaceItemShareDto = z.infer<typeof UpsertSpaceItemShareSchema>

export const UpsertSpaceShareSchema = z.object({
  entity_type: SpaceShareEntityTypeSchema,
  entity_id: z.string().uuid(),
  level: SpaceShareLevelSchema,
  allowed_view_ids: z.array(z.string().min(1).max(200)).max(50).nullable().optional(),
})
export type UpsertSpaceShareDto = z.infer<typeof UpsertSpaceShareSchema>

export const InviteSpaceItemByEmailSchema = z.object({
  email: z.string().email(),
  level: SpaceShareLevelSchema,
})
export type InviteSpaceItemByEmailDto = z.infer<typeof InviteSpaceItemByEmailSchema>

// Per-view shares (space_view_shares)
export const SpaceViewIdParamSchema = z.object({
  id: z.string().uuid(),
  viewId: z.string().min(1).max(200),
})
export type SpaceViewIdParam = z.infer<typeof SpaceViewIdParamSchema>

export const UpsertSpaceViewShareSchema = z.object({
  entity_type: SpaceShareEntityTypeSchema,
  entity_id: z.string().uuid(),
  level: SpaceShareLevelSchema,
})
export type UpsertSpaceViewShareDto = z.infer<typeof UpsertSpaceViewShareSchema>
