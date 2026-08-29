import type { ToolStep } from './openclaw-proxy.service'

const MAX_FOCUS_TASKS = 10
const MAX_REVIEW_TASKS = 3
const MAX_MEETINGS = 8

export function formatOperationalAgenda(toolSteps: ToolStep[], now = new Date()): string {
  const sections: string[] = []
  const taskStep = toolSteps.find((step) => step.name === 'list_tasks')
  const calendarStep = toolSteps.find((step) => step.name === 'list_calendar_events')

  if (calendarStep) sections.push(formatCalendarSection(calendarStep))
  if (taskStep) sections.push(formatTaskSection(taskStep, now))
  return sections.filter(Boolean).join('\n\n') || 'No task or meeting records were requested.'
}

function formatTaskSection(step: ToolStep, now: Date): string {
  if (step.status === 'failed') return `## Open tasks\n\n${step.error ?? 'Task retrieval failed.'}`
  const result = record(step.result)
  const tasks = records(result.tasks)
  if (tasks.length === 0) return '## Open tasks\n\nYou have no open tasks assigned to you.'
  const total = number(result.total_count) ?? tasks.length
  const reviewTasks = tasks.filter((task) => needsReview(task, now))
  const focusTasks = tasks.filter((task) => !needsReview(task, now))
  const visibleFocus = focusTasks.slice(0, MAX_FOCUS_TASKS)
  const visibleReview = reviewTasks.slice(0, MAX_REVIEW_TASKS)
  const sections: string[] = []

  if (focusTasks.length === 0) {
    sections.push('## Open tasks — focus now\n\nNo current task is ready to prioritize.')
  } else {
    const heading =
      total <= MAX_FOCUS_TASKS && reviewTasks.length === 0
        ? `## Open tasks (${total})`
        : `## Open tasks — focus now (${visibleFocus.length} of ${total})`
    sections.push(`${heading}\n\n${visibleFocus.map(formatTaskLine).join('\n')}`)
  }

  if (reviewTasks.length > 0) {
    sections.push(
      [
        `## Needs review (${reviewTasks.length})`,
        visibleReview.map(formatTaskLine).join('\n'),
        "These older or overdue commitments stay out of today's focus. Confirm **Done** or **Keep open** in My Tasks.",
      ].join('\n\n'),
    )
  }

  const hiddenCurrent = Math.max(0, focusTasks.length - visibleFocus.length)
  if (hiddenCurrent > 0) {
    sections.push(`${hiddenCurrent} more open tasks are available in My Tasks.`)
  }
  return sections.join('\n\n')
}

function formatCalendarSection(step: ToolStep): string {
  const heading = step.label.includes('upcoming')
    ? '## Upcoming meetings'
    : step.label.includes('tomorrow')
      ? "## Tomorrow's meetings"
      : "## Today's meetings"
  if (step.status === 'failed') return `${heading}\n\n${step.error ?? 'Calendar retrieval failed.'}`
  const result = record(step.result)
  const events = records(result.events)
  if (events.length === 0) return `${heading}\n\nNo meetings are scheduled in this window.`
  const visibleEvents = events.slice(0, MAX_MEETINGS)
  const lines = visibleEvents.map((event) => {
    const title = text(event.title) || 'Untitled meeting'
    const timing =
      event.all_day === true
        ? 'All day'
        : [formatDate(text(event.start)), formatDate(text(event.end))].filter(Boolean).join(' – ')
    return `- **${escapeMarkdown(title)}**${timing ? ` — ${timing}` : ''}`
  })
  const boundedHeading =
    events.length > MAX_MEETINGS
      ? `${heading} (next ${visibleEvents.length} of ${events.length})`
      : heading
  const remainder = events.length - visibleEvents.length
  return [
    `${boundedHeading}\n\n${lines.join('\n')}`,
    ...(remainder > 0 ? [`${remainder} more meetings are in this window.`] : []),
  ].join('\n\n')
}

function formatTaskLine(task: Record<string, unknown>): string {
  const title = text(task.title) || 'Untitled task'
  const details = [
    text(task.priority_label) || text(task.priority),
    text(task.status_label),
    text(task.due_date) ? `due ${formatDate(text(task.due_date))}` : '',
    text(task.space_title),
  ].filter(Boolean)
  return `- **${escapeMarkdown(title)}**${details.length ? ` — ${details.join(' · ')}` : ''}`
}

function needsReview(task: Record<string, unknown>, now: Date): boolean {
  const lifecycle = record(record(task.custom_data).action_lifecycle)
  if (text(lifecycle.review_state) === 'needs_review') return true
  const dueAt = date(task.due_date)
  return Boolean(dueAt && dueAt.getTime() < now.getTime())
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(record) : []
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function date(value: unknown): Date | null {
  const valueText = text(value)
  if (!valueText) return null
  const parsed = new Date(valueText)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDate(value: string): string {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toISOString().replace('.000Z', 'Z')
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}\[\]()#+.!|>-])/g, '\\$1')
}
