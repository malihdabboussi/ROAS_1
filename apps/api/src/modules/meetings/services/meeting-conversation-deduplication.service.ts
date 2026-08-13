import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ConversationsRepository } from '../../conversations/repositories/conversations.repository'

type DeduplicationInput = {
  userId: string
  meetingItemId: string
  keepConversationId: string
  /** Sibling duplicate call items (same space + natural key) whose chats also merge. */
  duplicateMeetingItemIds?: string[]
}

@Injectable()
export class MeetingConversationDeduplicationService {
  constructor(private readonly conversations: ConversationsRepository) {}

  async archiveDuplicates(supabase: SupabaseClient, input: DeduplicationInput): Promise<number> {
    const meetingItemIds = [
      ...new Set([input.meetingItemId, ...(input.duplicateMeetingItemIds ?? [])]),
    ]
    const duplicates = await this.conversations.findDuplicateMeetingConversations(supabase, {
      userId: input.userId,
      meetingItemIds,
      keepConversationId: input.keepConversationId,
    })
    await Promise.all(
      duplicates.map((conversation: Record<string, unknown>) =>
        this.conversations.update(supabase, String(conversation.id), {
          status: 'archived',
          metadata: {
            ...asRecord(conversation.metadata),
            deduplicated_meeting_conversation_id: input.keepConversationId,
            deduplicated_at: new Date().toISOString(),
          },
        }),
      ),
    )
    return duplicates.length
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
