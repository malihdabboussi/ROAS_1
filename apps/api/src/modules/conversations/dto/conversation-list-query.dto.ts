import { z } from 'zod'

export const ConversationFeedScopeSchema = z.enum(['workspace', 'personal', 'all', 'org'])

export const ConversationListQuerySchema = z.object({
  campaign_id: z.string().uuid().optional(),
  // Single agent key or a comma-separated list (lets clients fetch several
  // agents' conversations in one request instead of one request per agent).
  agent_id: z.string().min(1).max(2000).optional(),
  space_id: z.string().uuid().optional(),
  channel_id: z.string().uuid().optional(),
  feed_scope: ConversationFeedScopeSchema.optional(),
  feed_org_id: z.string().uuid().optional(),
})

export type ConversationListQuery = z.infer<typeof ConversationListQuerySchema>
