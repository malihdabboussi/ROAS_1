import type {
  UserWorkBrainAction,
  UserWorkBrainActionCall,
  UserWorkStreamEvent,
} from './user-work-eval.types'

const BRAIN_ACTIONS = new Set<UserWorkBrainAction>([
  'search_user_brain',
  'search_agent_brain',
  'search_customer_brain',
  'search_company_brain',
  'search_brain_context',
])

export type UserWorkToolCallSummary = {
  totalToolCalls: number
  brainToolCalls: number
  byToolName: Record<string, number>
  byBrainAction: Record<string, number>
}

function isBrainAction(value: unknown): value is UserWorkBrainAction {
  return typeof value === 'string' && BRAIN_ACTIONS.has(value as UserWorkBrainAction)
}

function summarizeToolResult(data: Record<string, unknown>): string | undefined {
  const candidates = [data.result, data.output, data.preview, data.content, data.detail]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim().slice(0, 4000)
    if (candidate && typeof candidate === 'object') return JSON.stringify(candidate).slice(0, 4000)
  }
  return undefined
}

export function collectBrainActionCalls(events: UserWorkStreamEvent[]): UserWorkBrainActionCall[] {
  const calls: UserWorkBrainActionCall[] = []
  for (const event of events) {
    const action = event.data.action ?? event.data.name
    if (!isBrainAction(action)) continue
    const toolCallId =
      typeof event.data.tool_call_id === 'string' ? event.data.tool_call_id : undefined
    if (event.type === 'tool_start') {
      calls.push({
        action,
        name: String(event.data.name ?? action),
        label: typeof event.data.label === 'string' ? event.data.label : undefined,
        payload: event.data,
        status: 'started',
      })
      continue
    }
    const existing =
      toolCallId !== undefined
        ? calls.find((call) => call.payload.tool_call_id === toolCallId)
        : [...calls].reverse().find((call) => call.action === action)
    if (!existing) {
      calls.push({
        action,
        name: String(event.data.name ?? action),
        payload: event.data,
        status: event.type === 'tool_end' ? 'completed' : 'started',
        resultPreview: summarizeToolResult(event.data),
      })
      continue
    }
    if (event.type === 'tool_end') {
      existing.status = event.data.status === 'failed' ? 'failed' : 'completed'
      existing.resultPreview = summarizeToolResult(event.data) ?? existing.resultPreview
    }
  }
  return calls
}

export function extractToolCallSummary(events: UserWorkStreamEvent[]): UserWorkToolCallSummary {
  const byToolName: Record<string, number> = {}
  const byBrainAction: Record<string, number> = {}
  const seenToolCallIds = new Set<string>()
  let totalToolCalls = 0
  let brainToolCalls = 0

  for (const event of events) {
    if (event.type !== 'tool_start') continue
    const toolCallId =
      typeof event.data.tool_call_id === 'string' ? event.data.tool_call_id : undefined
    if (toolCallId) {
      if (seenToolCallIds.has(toolCallId)) continue
      seenToolCallIds.add(toolCallId)
    }

    totalToolCalls += 1
    const name = String(event.data.name ?? 'unknown')
    byToolName[name] = (byToolName[name] ?? 0) + 1

    const action = event.data.action ?? event.data.name
    if (isBrainAction(action)) {
      brainToolCalls += 1
      byBrainAction[action] = (byBrainAction[action] ?? 0) + 1
    }
  }

  return {
    totalToolCalls,
    brainToolCalls,
    byToolName,
    byBrainAction,
  }
}

export function aggregateToolCallSummaries(
  summaries: UserWorkToolCallSummary[],
): UserWorkToolCallSummary & { avgToolCalls: number; avgBrainToolCalls: number } {
  if (summaries.length === 0) {
    return {
      totalToolCalls: 0,
      brainToolCalls: 0,
      byToolName: {},
      byBrainAction: {},
      avgToolCalls: 0,
      avgBrainToolCalls: 0,
    }
  }

  const byToolName: Record<string, number> = {}
  const byBrainAction: Record<string, number> = {}
  let totalToolCalls = 0
  let brainToolCalls = 0

  for (const summary of summaries) {
    totalToolCalls += summary.totalToolCalls
    brainToolCalls += summary.brainToolCalls
    for (const [name, count] of Object.entries(summary.byToolName)) {
      byToolName[name] = (byToolName[name] ?? 0) + count
    }
    for (const [action, count] of Object.entries(summary.byBrainAction)) {
      byBrainAction[action] = (byBrainAction[action] ?? 0) + count
    }
  }

  const count = summaries.length
  return {
    totalToolCalls,
    brainToolCalls,
    byToolName,
    byBrainAction,
    avgToolCalls: totalToolCalls / count,
    avgBrainToolCalls: brainToolCalls / count,
  }
}
