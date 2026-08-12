import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactConversationSearchRepository } from '../repositories/artifact-conversation-search.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'

const EXCERPT_LENGTH = 500

@Injectable()
export class ArtifactConversationSearchService {
  constructor(
    private readonly repository: ArtifactConversationSearchRepository = new ArtifactConversationSearchRepository(),
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      search_conversations: (data, sessionKey) => this.search(target, data, sessionKey),
    }
  }

  private async search(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<Record<string, unknown>> {
    const query = String(input.query ?? '').trim()
    if (!query) return { success: false, error: 'query is required' }

    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) ?? null
    const supabase = (await target.getUserClient(userId, sessionKey)) as SupabaseClient
    const limit = this.limit(input.limit)
    const result = await this.repository.search(supabase, { userId, orgId, query, limit })
    const messagesByConversation = new Map<string, Array<Record<string, unknown>>>()

    for (const message of result.messages) {
      const list = messagesByConversation.get(message.conversation_id) ?? []
      if (list.length >= 6) continue
      list.push({
        role: message.role,
        content: String(message.content ?? '').slice(0, EXCERPT_LENGTH),
        created_at: message.created_at,
      })
      messagesByConversation.set(message.conversation_id, list)
    }

    return {
      success: true,
      query,
      conversations: result.conversations.map((conversation) => ({
        conversation_id: conversation.id,
        title: conversation.title?.trim() || 'Untitled conversation',
        agent_id: conversation.agent_id,
        campaign_id: conversation.campaign_id,
        updated_at: conversation.updated_at,
        summary: conversation.summary,
        recent_messages: (messagesByConversation.get(conversation.id) ?? []).reverse(),
      })),
      count: result.conversations.length,
    }
  }

  private limit(value: unknown): number {
    const numeric = Number(value ?? 10)
    return Number.isFinite(numeric) ? Math.min(Math.max(Math.floor(numeric), 1), 20) : 10
  }
}
