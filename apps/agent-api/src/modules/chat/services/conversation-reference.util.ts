import type { SupabaseClient } from '@supabase/supabase-js'
import { ChatRuntimeRepository } from '../repositories/chat-runtime.repository'

export const CONVERSATION_REF_LIMITS = {
  /** Max conversation references resolved per message (bounds prompt size). */
  maxRefs: 2,
  /** Last N user/assistant messages included per conversation. */
  messages: 30,
  /** Per-message content cap. */
  charsPerMessage: 600,
  /** Whole-transcript cap; oldest lines are dropped first. */
  transcriptChars: 8_000,
} as const

export interface ConversationReferenceInput {
  id: string
  label: string
}

/**
 * Resolves dropped customer conversations into transcript context lines for the
 * agent. Ownership-checked per conversation (same user, or same org); silently
 * skips anything not owned by the caller.
 */
export async function buildConversationReferenceLines(
  serviceClient: SupabaseClient,
  refs: ConversationReferenceInput[],
  userId: string,
  orgId?: string | null,
  repository: ChatRuntimeRepository = new ChatRuntimeRepository(),
): Promise<string[]> {
  const lines: string[] = []

  for (const ref of refs.slice(0, CONVERSATION_REF_LIMITS.maxRefs)) {
    const conversation = await repository.findConversationReference(serviceClient, ref.id)
    const conv = conversation as {
      id: string
      user_id: string
      org_id: string | null
      title: string | null
      agent_id: string | null
    } | null
    if (!conv) continue
    const owned = conv.user_id === userId || (orgId != null && conv.org_id === orgId)
    if (!owned) continue

    const messageRows = await repository.listConversationReferenceMessages(serviceClient, {
      conversationId: conv.id,
      limit: CONVERSATION_REF_LIMITS.messages,
    })
    const ascending = messageRows
      .slice()
      .reverse()

    const transcriptLines = ascending.map((m) => {
      const content = (m.content ?? '').trim()
      const capped =
        content.length > CONVERSATION_REF_LIMITS.charsPerMessage
          ? `${content.slice(0, CONVERSATION_REF_LIMITS.charsPerMessage)}…`
          : content
      return `${m.role}: ${capped}`
    })

    let totalChars = transcriptLines.reduce((sum, l) => sum + l.length + 1, 0)
    let truncated = false
    while (totalChars > CONVERSATION_REF_LIMITS.transcriptChars && transcriptLines.length > 1) {
      const dropped = transcriptLines.shift()!
      totalChars -= dropped.length + 1
      truncated = true
    }
    if (truncated) transcriptLines.unshift('[transcript truncated]')

    const title = conv.title?.trim() || ref.label || 'Customer conversation'
    lines.push(
      `- [Customer conversation] ${title} (id: ${conv.id}${conv.agent_id ? `, agent: ${conv.agent_id}` : ''}) — analyze this transcript:`,
    )
    for (const line of transcriptLines) {
      lines.push(`  ${line}`)
    }
  }

  return lines
}
