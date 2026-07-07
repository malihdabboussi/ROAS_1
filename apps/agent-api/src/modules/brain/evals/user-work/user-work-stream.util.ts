import type { UserWorkAgentRun, UserWorkStreamEvent } from './user-work-eval.types'

export function contentDeltaText(data: Record<string, unknown>): string {
  if (typeof data.content === 'string') return data.content
  if (typeof data.text === 'string') return data.text
  return ''
}

export function assembleFinalAnswer(agentRun: UserWorkAgentRun): string {
  const direct = agentRun.finalAnswer.trim()
  if (direct) return direct
  return agentRun.events
    .filter((event): event is UserWorkStreamEvent => event.type === 'content_delta')
    .map((event) => contentDeltaText(event.data))
    .join('')
    .trim()
}
