import { Injectable } from '@nestjs/common'

const SETUP_STATUS_BUCKETS: Record<string, string> = {
  working: 'Working',
  loading_conversation: 'Getting oriented',
  preparing_context: 'Connecting the dots',
  checking_access: 'Checking the next step',
  starting_response: 'Moving to the next step',
  planning_response: 'Planning next moves',
}

export type CompletedPlatformTool = {
  block: Record<string, unknown>
  startPayload: Record<string, unknown>
  endPayload: Record<string, unknown>
}

@Injectable()
export class ChatSetupEventsService {
  bucketSetupStatusMessage(message: string): string {
    const lower = message.toLowerCase()
    if (lower.includes('load') && lower.includes('conversation')) {
      return SETUP_STATUS_BUCKETS.loading_conversation
    }
    if (lower.includes('access') || lower.includes('policy')) {
      return SETUP_STATUS_BUCKETS.checking_access
    }
    if (lower.includes('start') && lower.includes('response')) {
      return SETUP_STATUS_BUCKETS.starting_response
    }
    if (lower.includes('plan') && lower.includes('response')) {
      return SETUP_STATUS_BUCKETS.planning_response
    }
    if (
      lower.includes('context') ||
      lower.includes('attachment') ||
      lower.includes('artifact') ||
      lower.includes('reference') ||
      lower.includes('skill') ||
      lower.includes('request') ||
      lower.includes('model') ||
      lower.includes('agent')
    ) {
      return SETUP_STATUS_BUCKETS.preparing_context
    }
    return SETUP_STATUS_BUCKETS.working
  }

  pickDeterministicLabel(labels: readonly string[], seed: string): string {
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
    }
    return labels[hash % labels.length] ?? 'Working'
  }

  async runPlatformTool<T>(input: {
    name: string
    action: string
    labels: readonly string[]
    seed: string
    id: string
    completedPlatformTools: CompletedPlatformTool[]
    sendPreRunEvent: (
      type: string,
      payload: Record<string, unknown>,
    ) => Promise<void>
    operation: () => Promise<T>
  }): Promise<T> {
    const label = this.pickDeterministicLabel(input.labels, input.seed)
    const startedAt = Date.now()
    const startPayload = {
      name: input.name,
      label,
      action: input.action,
      tool_call_id: input.id,
    }
    await input.sendPreRunEvent('status', { phase: 'executing', message: label })
    await input.sendPreRunEvent('tool_start', startPayload)
    try {
      const result = await input.operation()
      const endedAt = Date.now()
      const endPayload = {
        name: input.name,
        label,
        status: 'completed',
        tool_call_id: input.id,
      }
      await input.sendPreRunEvent('tool_end', endPayload)
      input.completedPlatformTools.push({
        block: {
          type: 'tool',
          id: input.id,
          name: input.name,
          label,
          action: input.action,
          toolCallId: input.id,
          state: 'complete',
          startedAt,
          endedAt,
        },
        startPayload,
        endPayload,
      })
      return result
    } catch (err) {
      const endedAt = Date.now()
      const endPayload = {
        name: input.name,
        label,
        status: 'failed',
        tool_call_id: input.id,
        error: err instanceof Error ? err.message : String(err),
      }
      await input.sendPreRunEvent('tool_end', endPayload)
      input.completedPlatformTools.push({
        block: {
          type: 'tool',
          id: input.id,
          name: input.name,
          label,
          action: input.action,
          toolCallId: input.id,
          state: 'failed',
          startedAt,
          endedAt,
        },
        startPayload,
        endPayload,
      })
      throw err
    }
  }
}
