import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { ChatRuntimeRepository } from '../repositories/chat-runtime.repository'

export interface AppendTimelineEventInput {
  userId: string
  conversationId: string
  messageId: string
  type: string
  payload: Record<string, unknown>
}

export interface TimelineEventRecord {
  id: string
  seq: number
  type: string
  payload: Record<string, unknown>
  created_at: string
}

/**
 * MessageTimelineService (Layer 3-ish)
 *
 * Writes append-only timeline events for a single assistant message ("turn").
 * This is intentionally separate from message metadata updates to keep ordering deterministic.
 */
@Injectable()
export class MessageTimelineService {
  private readonly logger = new Logger(MessageTimelineService.name)
  private readonly supabase: SupabaseClient

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly repository: ChatRuntimeRepository = new ChatRuntimeRepository(),
  ) {
    this.supabase = svc.client
  }

  async appendEvent(input: AppendTimelineEventInput): Promise<void> {
    const error = await this.repository.insertTimelineEvent(this.supabase, {
      user_id: input.userId,
      conversation_id: input.conversationId,
      message_id: input.messageId,
      type: input.type,
      payload: input.payload,
    })

    if (error) {
      this.logger.error(`Timeline insert failed: ${error.message}`)
      throw new Error(`Timeline insert failed: ${error.message}`)
    }
  }

  async listEventsForMessage(input: {
    userId: string
    conversationId: string
    messageId: string
  }): Promise<TimelineEventRecord[]> {
    const { rows, error } = await this.repository.listTimelineEvents(this.supabase, input)

    if (error) {
      this.logger.error(`Timeline read failed: ${error.message}`)
      throw new Error(`Timeline read failed: ${error.message}`)
    }

    return rows
  }
}
