import { Injectable, Logger } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { ChatRuntimeRepository } from '../repositories/chat-runtime.repository'

export type ChatRunCheckpointKind =
  | 'tool_batch'
  | 'context_compaction'
  | 'failure'
  | 'continuation'
  | 'final'

export interface RecordChatRunCheckpointInput {
  runId: string
  conversationId: string
  messageId: string
  userId: string
  orgId?: string | null
  attemptIndex?: number
  kind: ChatRunCheckpointKind
  summary: string
  remainingWork?: string | null
  lastCursor?: string | null
  toolCount?: number
  contentLength?: number
  contextWindowTokens?: number | null
  lastCallInputTokens?: number | null
  compactionCount?: number | null
  rawSnapshot?: Record<string, unknown>
}

const MAX_SUMMARY_LENGTH = 4000
const MAX_REMAINING_WORK_LENGTH = 4000

@Injectable()
export class ChatRunCheckpointService {
  private readonly logger = new Logger(ChatRunCheckpointService.name)

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly repository: ChatRuntimeRepository = new ChatRuntimeRepository(),
  ) {}

  isEnabled(): boolean {
    return ['1', 'true', 'on', 'yes'].includes(
      (process.env.CHAT_RUN_CHECKPOINTS_ENABLED ?? '').toLowerCase(),
    )
  }

  async record(input: RecordChatRunCheckpointInput): Promise<void> {
    if (!this.isEnabled()) return

    const error = await this.repository.insertRuntimeRunCheckpoint(this.svc.client, {
      run_id: input.runId,
      conversation_id: input.conversationId,
      message_id: input.messageId,
      user_id: input.userId,
      org_id: input.orgId ?? null,
      attempt_index: input.attemptIndex ?? 0,
      kind: input.kind,
      summary: this.truncate(input.summary, MAX_SUMMARY_LENGTH),
      remaining_work: input.remainingWork
        ? this.truncate(input.remainingWork, MAX_REMAINING_WORK_LENGTH)
        : null,
      last_cursor: input.lastCursor ?? null,
      tool_count: input.toolCount ?? 0,
      content_length: input.contentLength ?? 0,
      context_window_tokens: input.contextWindowTokens ?? null,
      last_call_input_tokens: input.lastCallInputTokens ?? null,
      compaction_count: input.compactionCount ?? null,
      raw_snapshot: input.rawSnapshot ?? {},
    })

    if (error) {
      this.logger.warn(
        `[ChatRunCheckpoint] insert failed run=${input.runId} kind=${input.kind}: ${error.message}`,
      )
    }
  }

  private truncate(value: string, maxLength: number): string {
    return value.length > maxLength ? value.slice(0, maxLength) : value
  }
}
