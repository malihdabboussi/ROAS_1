import type { ToolStep } from './openclaw-proxy.service'

export function formatOperationalAgenda(toolSteps: ToolStep[]): string {
  const sections: string[] = []
  const taskStep = toolSteps.find((step) => step.name === 'list_tasks')
  const calendarStep = toolSteps.find((step) => step.name === 'list_calendar_events')

  if (calendarStep) sections.push(formatCalendarSection(calendarStep))
  if (taskStep) sections.push(formatTaskSection(taskStep))
  return sections.filter(Boolean).join('\n\n') || 'No task or meeting records were requested.'
}

function formatTaskSection(step: ToolStep): string {
  if (step.status === 'failed') return `## Open tasks\n\n${step.error ?? 'Task retrieval failed.'}`
  const result = record(step.result)
  const tasks = records(result.tasks)
  if (tasks.length === 0) return '## Open tasks\n\nYou have no open tasks assigned to you.'
  const lines = tasks.map((task) => {
    const title = text(task.title) || 'Untitled task'
    const details = [
      text(task.priority_label) || text(task.priority),
      text(task.status_label),
      text(task.due_date) ? `due ${formatDate(text(task.due_date))}` : '',
      text(task.space_title),
    ].filter(Boolean)
    return `- **${escapeMarkdown(title)}**${details.length ? ` — ${details.join(' · ')}` : ''}`
  })
  const total = number(result.total_count) ?? tasks.length
  return `## Open tasks (${total})\n\n${lines.join('\n')}`
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
  const lines = events.map((event) => {
    const title = text(event.title) || 'Untitled meeting'
    const timing = event.all_day === true
      ? 'All day'
      : [formatDate(text(event.start)), formatDate(text(event.end))].filter(Boolean).join(' – ')
    return `- **${escapeMarkdown(title)}**${timing ? ` — ${timing}` : ''}`
  })
  return `${heading}\n\n${lines.join('\n')}`
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

function formatDate(value: string): string {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toISOString().replace('.000Z', 'Z')
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}\[\]()#+.!|>-])/g, '\\$1')
}
