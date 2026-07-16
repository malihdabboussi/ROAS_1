import { Injectable } from '@nestjs/common'

/**
 * In-memory registry so comment-directive cancel/reassign can abort the active
 * OpenClaw HTTP stream for a subtask immediately (same process as mission-worker).
 */
@Injectable()
export class SubtaskAbortRegistry {
  private readonly bySubtaskId = new Map<string, AbortController>()

  register(subtaskId: string, controller: AbortController) {
    const id = String(subtaskId)
    const previous = this.bySubtaskId.get(id)
    if (previous && previous !== controller) {
      previous.abort()
    }
    this.bySubtaskId.set(id, controller)
  }

  abort(subtaskId: string) {
    const id = String(subtaskId)
    const c = this.bySubtaskId.get(id)
    if (!c) return
    this.bySubtaskId.delete(id)
    c.abort()
  }

  unregister(subtaskId: string) {
    this.bySubtaskId.delete(String(subtaskId))
  }
}
