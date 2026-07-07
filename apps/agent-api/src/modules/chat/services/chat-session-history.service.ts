import { Injectable, type Logger } from '@nestjs/common'

export interface SessionHistoryConfidence {
  dbMessageCount: number
  verifiedAt: number
}

@Injectable()
export class ChatSessionHistoryService {
  private readonly SESSION_HISTORY_CONFIDENCE_TTL_MS = 15 * 60 * 1000
  private readonly SESSION_HISTORY_GAP_REPAIR_THRESHOLD = 4
  readonly sessionHistoryConfidence = new Map<string, SessionHistoryConfidence>()

  buildRepairContext(input: {
    history: Record<string, unknown>[]
    sessionKey: string
    conversationId: string
    logger: Pick<Logger, 'warn'>
  }): {
    sessionContextGap: boolean
    conversationHistoryBlock: string
  } {
    const sessionContextGap = this.detectSessionContextGap(input.history, input.sessionKey)
    let conversationHistoryBlock = ''
    if (!sessionContextGap) {
      return { sessionContextGap, conversationHistoryBlock }
    }

    const cached = this.sessionHistoryConfidence.get(input.sessionKey)
    const cachedCount = cached?.dbMessageCount ?? 0
    const confidenceAgeMs = cached ? Date.now() - cached.verifiedAt : null
    const dbMsgCount = this.countConversationMessages(input.history)
    input.logger.warn(
      `[SessionIntegrity] context_gap conversationId=${input.conversationId} dbMessages=${dbMsgCount} verifiedMessages=${cachedCount} delta=${dbMsgCount - cachedCount} confidenceAgeMs=${confidenceAgeMs ?? 'none'}`,
    )
    conversationHistoryBlock = this.buildConversationHistoryContext(input.history)
    if (conversationHistoryBlock) {
      input.logger.warn(
        `[SessionIntegrity] reconstruction_injected conversationId=${input.conversationId} historyChars=${conversationHistoryBlock.length} messageCount=${dbMsgCount}`,
      )
    }

    return { sessionContextGap, conversationHistoryBlock }
  }

  recordGatewayTrace(input: {
    history: Record<string, unknown>[]
    sessionKey: string
    conversationId: string
    llmMessages: Array<{ role?: string }>
    logger: Pick<Logger, 'warn' | 'debug'>
  }): void {
    const tracedSessionUserAssistantCount = input.llmMessages.filter(
      (m) => m.role === 'user' || m.role === 'assistant',
    ).length
    const durableSessionUserAssistantCount = this.countConversationMessages(input.history) + 1
    if (tracedSessionUserAssistantCount > 0) {
      this.sessionHistoryConfidence.set(input.sessionKey, {
        dbMessageCount: durableSessionUserAssistantCount,
        verifiedAt: Date.now(),
      })
      if (process.env.CHAT_DEBUG_FLOW === '1') {
        input.logger.debug(
          `[SessionIntegrity] session_confidence_updated conversationId=${input.conversationId} verifiedDbMessages=${durableSessionUserAssistantCount} tracedMessages=${tracedSessionUserAssistantCount}`,
        )
      }
      return
    }

    const hadConfidence = this.sessionHistoryConfidence.delete(input.sessionKey)
    const hasPriorAssistantReply = input.history.some((m) => m.role === 'assistant')
    if (hadConfidence || hasPriorAssistantReply) {
      input.logger.warn(
        `[SessionIntegrity] session_confidence_cleared conversationId=${input.conversationId} reason=empty_llm_trace dbMessages=${durableSessionUserAssistantCount}`,
      )
    }
  }

  private detectSessionContextGap(
    dbMessages: Record<string, unknown>[],
    sessionKey: string,
  ): boolean {
    const dbConversationMsgCount = this.countConversationMessages(dbMessages)
    const hasAssistantReply = dbMessages.some((m) => m.role === 'assistant')
    if (!hasAssistantReply) return false

    const confidence = this.sessionHistoryConfidence.get(sessionKey)
    if (!confidence) return true
    if (Date.now() - confidence.verifiedAt >= this.SESSION_HISTORY_CONFIDENCE_TTL_MS) return true

    const gap = dbConversationMsgCount - confidence.dbMessageCount
    return gap >= this.SESSION_HISTORY_GAP_REPAIR_THRESHOLD
  }

  private countConversationMessages(dbMessages: Record<string, unknown>[]): number {
    return dbMessages.filter((m) => m.role === 'user' || m.role === 'assistant').length
  }

  private buildConversationHistoryContext(dbMessages: Record<string, unknown>[]): string {
    const MAX_HISTORY_CHARS = 20_000
    const MAX_ASSISTANT_PREVIEW = 300
    const lines: string[] = [
      '[CONVERSATION_HISTORY]',
      'The following is a summary of earlier conversation turns that may be missing from the active session. Use this to maintain continuity.',
      '',
    ]
    let totalChars = lines.join('\n').length

    const conversationMsgs = dbMessages.filter((m) => m.role === 'user' || m.role === 'assistant')
    const entries: string[] = []

    for (const msg of conversationMsgs) {
      const role = String(msg.role ?? '')
      const content = String(msg.content ?? '')
      const roleLabel = role === 'user' ? 'User' : 'Assistant'
      let entry: string

      if (role === 'user') {
        entry = `**${roleLabel}:** ${content}`
      } else {
        const preview =
          content.length > MAX_ASSISTANT_PREVIEW
            ? content.slice(0, MAX_ASSISTANT_PREVIEW) + '...'
            : content
        const meta = msg.metadata as Record<string, unknown> | null
        const toolSteps = Array.isArray(meta?.tool_steps)
          ? (meta.tool_steps as Array<{ label?: string; name?: string; status?: string }>)
          : []
        const toolLabels = toolSteps
          .filter((s) => s.status === 'completed' && s.label)
          .map((s) => s.label)
          .slice(0, 5)
        const toolLine = toolLabels.length > 0 ? `\n  Tools used: ${toolLabels.join('; ')}` : ''
        entry = `**${roleLabel}:** ${preview}${toolLine}`
      }

      if (totalChars + entry.length + 1 > MAX_HISTORY_CHARS) break
      entries.push(entry)
      totalChars += entry.length + 1
    }

    if (entries.length === 0) return ''
    return lines.join('\n') + entries.join('\n\n')
  }
}
