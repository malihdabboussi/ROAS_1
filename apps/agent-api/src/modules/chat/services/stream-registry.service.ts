import { Injectable, Logger } from '@nestjs/common'

export type StreamSendFn = (type: string, data: Record<string, unknown>) => Promise<void>

/**
 * Minimal in-memory registry of active chat streams.
 *
 * Tracks which conversations have an active generation and holds
 * abort controllers so the stop endpoint can cancel them.
 * All content/state is persisted to the database (2s flush) and
 * recovered from there on reconnect.
 */
@Injectable()
export class StreamRegistryService {
  private readonly logger = new Logger(StreamRegistryService.name)
  private readonly activeStreams = new Map<string, { messageId: string; startedAt: number }>()
  private readonly abortControllers = new Map<string, AbortController>()
  private readonly sendCallbacks = new Map<string, StreamSendFn>()

  register(conversationId: string, messageId: string): void {
    this.activeStreams.set(conversationId, { messageId, startedAt: Date.now() })
    this.logger.log(`[Registry] Stream started: ${conversationId}`)
  }

  registerSend(conversationId: string, send: StreamSendFn): void {
    this.sendCallbacks.set(conversationId, send)
  }

  complete(conversationId: string): void {
    this.activeStreams.delete(conversationId)
    this.sendCallbacks.delete(conversationId)
    this.logger.log(`[Registry] Stream completed: ${conversationId}`)
  }

  async emitEvent(
    conversationId: string,
    type: string,
    data: Record<string, unknown>,
  ): Promise<boolean> {
    const send = this.sendCallbacks.get(conversationId)
    if (!send) return false
    try {
      await send(type, data)
      return true
    } catch {
      return false
    }
  }

  isActive(conversationId: string): boolean {
    return this.activeStreams.has(conversationId)
  }

  getMessageId(conversationId: string): string | null {
    return this.activeStreams.get(conversationId)?.messageId ?? null
  }

  setAbortController(conversationId: string, controller: AbortController): void {
    const existing = this.abortControllers.get(conversationId)
    if (existing && existing !== controller && !existing.signal.aborted) {
      existing.abort()
    }
    this.abortControllers.set(conversationId, controller)
  }

  clearAbortController(conversationId: string, controller?: AbortController): void {
    const existing = this.abortControllers.get(conversationId)
    if (!existing) return
    if (controller && existing !== controller) return
    this.abortControllers.delete(conversationId)
  }

  abort(conversationId: string): boolean {
    const controller = this.abortControllers.get(conversationId)
    if (!controller || controller.signal.aborted) return false
    controller.abort()
    return true
  }

  abortIfMessageId(conversationId: string, messageId: string): boolean {
    if (this.getMessageId(conversationId) !== messageId) return false
    return this.abort(conversationId)
  }
}
