import { z } from 'zod'

export const YourTurnKindSchema = z.enum([
  'mission_subtask',
  'space_item',
  'suggestion',
  'plan_approval',
])
export type YourTurnKind = z.infer<typeof YourTurnKindSchema>

export const YourTurnQuerySchema = z.object({
  kind: YourTurnKindSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
  since: z.string().datetime().optional(),
  feed_scope: z.enum(['workspace', 'personal', 'all', 'org']).optional(),
  feed_org_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional(),
})
export type YourTurnQuery = z.infer<typeof YourTurnQuerySchema>

export interface YourTurnItem {
  kind: YourTurnKind
  id: string
  title: string
  status: string
  assignee_user_id: string | null
  org_id: string | null
  mission_id: string | null
  space_id: string | null
  suggestion_state: 'pending' | 'accepted' | 'dismissed' | null
  due_at: string | null
  source_url: string | null
  preview: string | null
  created_at: string
  updated_at: string | null
}
