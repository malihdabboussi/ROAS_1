import type { WorkRequestReviewChatMessage } from './work-request-api'

export function mapWorkRequestReviewChatMessages(
  conversationId: string,
  rows: WorkRequestReviewChatMessage[],
) {
  return rows.map((row) => ({
    id: row.id,
    conversation_id: conversationId,
    role: row.role as 'user' | 'assistant' | 'system',
    content: row.content,
    content_blocks: null,
    created_at: row.created_at,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  }))
}
