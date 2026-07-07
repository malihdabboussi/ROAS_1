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
})
export type UpsertConversationShareDto = z.infer<typeof UpsertConversationShareSchema>

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
