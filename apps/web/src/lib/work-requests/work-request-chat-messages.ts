import type { Message } from '@/lib/conversations'
import type { WorkRequestReviewChatMessage } from './work-request-api'

export function mapWorkRequestReviewChatMessages(
  conversationId: string,
  rows: WorkRequestReviewChatMessage[],
): Message[] {
  return rows.map((row) => ({
    id: row.id,
    conversation_id: conversationId,
    role: row.role as Message['role'],
    content: row.content,
    content_blocks: null,
    created_at: row.created_at,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  }))
}
