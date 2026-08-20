import type { Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function recordChatOrganizationDataAccess(input: {
  client: SupabaseClient
  logger: Logger
  orgId?: string
  orgMemberId?: string | null
  userId: string
  conversationId: string
  allowed: boolean
}): Promise<void> {
  if (!input.orgId || !input.allowed) return
  const { error } = await input.client.from('ai_data_access_audit').insert({
    org_id: input.orgId,
    org_member_id: input.orgMemberId ?? null,
    user_id: input.userId,
    surface: 'ai_chat',
    resource_type: 'conversation',
    resource_id: input.conversationId,
    outcome: 'allowed',
    reason: 'organization_wide_ai_data_access_enabled',
    metadata: {},
  })
  if (error) {
    input.logger.warn(`AI data access audit failed: ${error.message}`)
  }
}
