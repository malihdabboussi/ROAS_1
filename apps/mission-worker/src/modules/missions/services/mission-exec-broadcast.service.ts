import { Injectable, Logger } from '@nestjs/common'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { DatabaseService } from '../../../lib/services/database.service'

@Injectable()
export class MissionExecBroadcastService {
  private readonly logger = new Logger(MissionExecBroadcastService.name)
  private readonly channels = new Map<string, RealtimeChannel>()

  constructor(private readonly db: DatabaseService) {}

  async init(subtaskId: string): Promise<void> {
    if (this.channels.has(subtaskId)) {
      await this.dispose(subtaskId)
    }
    const supabase = this.db.getClient()
    const channel = supabase.channel(`mission-exec:${subtaskId}`)
    try {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(
          () => reject(new Error('mission-exec channel subscribe timeout')),
          15_000,
        )
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(t)
            resolve()
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(t)
            reject(new Error(`mission-exec channel ${status}`))
          }
        })
      })
      this.channels.set(subtaskId, channel)
    } catch (err) {
      this.logger.warn(`[mission-exec] init failed subtask=${subtaskId} ${(err as Error).message}`)
      void supabase.removeChannel(channel).catch(() => {})
    }
  }

  private async safeSend(
    subtaskId: string,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const channel = this.channels.get(subtaskId)
    if (!channel) return
    try {
      const res = await channel.send({
        type: 'broadcast',
        event,
        payload,
      })
      const status = (res as { status?: string }).status
      if (status && status !== 'ok') {
        this.logger.warn(`[mission-exec] send subtask=${subtaskId} event=${event} status=${status}`)
      }
    } catch (err) {
      this.logger.warn(
        `[mission-exec] send failed subtask=${subtaskId} event=${event} ${(err as Error).message}`,
      )
    }
  }

  emitToolStart(
    subtaskId: string,
    data: { name: string; label: string; action?: string; tool_call_id?: string },
  ): void {
    void this.safeSend(subtaskId, 'tool_start', {
      name: data.name,
      label: data.label,
      ...(data.action ? { action: data.action } : {}),
      ...(data.tool_call_id ? { tool_call_id: data.tool_call_id } : {}),
    })
  }

  emitToolUpdate(
    subtaskId: string,
    data: { name: string; detail: string; tool_call_id?: string },
  ): void {
    void this.safeSend(subtaskId, 'tool_update', {
      name: data.name,
      detail: data.detail,
      ...(data.tool_call_id ? { tool_call_id: data.tool_call_id } : {}),
    })
  }

  emitToolDone(
    subtaskId: string,
    data: {
      name: string
      label: string
      action?: string
      status: 'completed' | 'failed'
      tool_call_id?: string
    },
  ): void {
    void this.safeSend(subtaskId, 'tool_done', {
      name: data.name,
      label: data.label,
      ...(data.action ? { action: data.action } : {}),
      status: data.status,
      ...(data.tool_call_id ? { tool_call_id: data.tool_call_id } : {}),
    })
  }

  emitThinkingDelta(subtaskId: string, data: { delta: string; text: string }): void {
    void this.safeSend(subtaskId, 'thinking_delta', {
      delta: data.delta,
      text: data.text,
    })
  }

  emitAssistantDelta(subtaskId: string, data: { delta: string }): void {
    void this.safeSend(subtaskId, 'assistant_delta', {
      delta: data.delta,
    })
  }

  async emitExecComplete(subtaskId: string): Promise<void> {
    await this.safeSend(subtaskId, 'exec_complete', {})
  }

  async emitExecFailed(subtaskId: string, data: { error?: string }): Promise<void> {
    await this.safeSend(subtaskId, 'exec_failed', {
      ...(data.error ? { error: data.error } : {}),
    })
  }

  async dispose(subtaskId: string): Promise<void> {
    const channel = this.channels.get(subtaskId)
    if (!channel) return
    this.channels.delete(subtaskId)
    const supabase = this.db.getClient()
    try {
      await supabase.removeChannel(channel)
    } catch {
      // noop: @supabase/phoenix may throw during teardown in Node runtime
    }
  }
}
