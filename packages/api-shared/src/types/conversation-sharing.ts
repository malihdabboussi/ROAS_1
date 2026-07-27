import { z } from 'zod'

export const ConversationShareLevelSchema = z.enum(['view', 'edit', 'admin'])
export type ConversationShareLevel = z.infer<typeof ConversationShareLevelSchema>

export const ConversationShareEntityTypeSchema = z.enum(['user', 'org'])
export type ConversationShareEntityType = z.infer<typeof ConversationShareEntityTypeSchema>

export const ConversationShareIdParamSchema = z.object({ shareId: z.string().uuid() })
export type ConversationShareIdParam = z.infer<typeof ConversationShareIdParamSchema>

export const ConversationIdParamSchema = z.object({ id: z.string().uuid() })
export type ConversationIdParam = z.infer<typeof ConversationIdParamSchema>

export const UpsertConversationShareSchema = z.object({
  entity_type: ConversationShareEntityTypeSchema,
  entity_id: z.string().uuid(),
  level: ConversationShareLevelSchema,
  /** When true and entity_type is user, notify the teammate with a handoff link. */
  notify: z.boolean().optional(),
  note: z.string().max(500).optional(),
})
export type UpsertConversationShareDto = z.infer<typeof UpsertConversationShareSchema>

export const PassOffConversationShareSchema = z.object({
  user_id: z.string().uuid(),
  level: ConversationShareLevelSchema.default('edit'),
  note: z.string().max(500).optional(),
  notify: z.boolean().default(true),
})
export type PassOffConversationShareDto = z.infer<typeof PassOffConversationShareSchema>

export interface ConversationShareRecord {
  id: string
  conversation_id: string
  org_id: string | null
  entity_type: ConversationShareEntityType
  entity_id: string
  level: ConversationShareLevel
  created_by: string
  created_at: string
}
