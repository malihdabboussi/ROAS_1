import { Injectable } from '@nestjs/common'

interface ActiveTaskAgentRun {
  activityId: string
  controller: AbortController
  cancelled: boolean
}

@Injectable()
export class TaskAgentCancelRegistry {
  private readonly activeByTask = new Map<string, ActiveTaskAgentRun>()

  register(input: {
    spaceId: string
    itemId: string
    activityId: string
    controller: AbortController
  }): () => void {
    const key = this.taskKey(input.spaceId, input.itemId)
    const run: ActiveTaskAgentRun = {
      activityId: input.activityId,
      controller: input.controller,
      cancelled: false,
    }
    this.activeByTask.set(key, run)
    return () => {
      if (this.activeByTask.get(key) === run) this.activeByTask.delete(key)
    }
  }

  cancel(spaceId: string, itemId: string): { cancelled: boolean; activityId?: string } {
    const run = this.activeByTask.get(this.taskKey(spaceId, itemId))
    if (!run) return { cancelled: false }
    run.cancelled = true
    run.controller.abort(new Error('Task agent stopped by user'))
    return { cancelled: true, activityId: run.activityId }
  }

  isCancelled(spaceId: string, itemId: string, activityId?: string | null): boolean {
    const run = this.activeByTask.get(this.taskKey(spaceId, itemId))
    if (!run?.cancelled) return false
    return !activityId || run.activityId === activityId
  }

  private taskKey(spaceId: string, itemId: string): string {
    return `${spaceId}:${itemId}`
  }
}
