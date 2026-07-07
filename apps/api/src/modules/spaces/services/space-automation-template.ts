/**
 * Prompt template renderer for Space Automations.
 * Resolves {{variable}} tokens against task, space, and mission context.
 */

export interface TemplateContext {
  item: Record<string, unknown>
  space: Record<string, unknown>
  event?: Record<string, unknown>
  steps?: Record<string, unknown>[]
  subtasks?: Record<string, unknown>[]
  deliverables?: Record<string, unknown>[]
  activity?: Record<string, unknown>[]
  mission?: Record<string, unknown> | null
  roster?: { id: string; display_name?: string; email?: string }[]
  run?: Record<string, unknown>
}

export function renderTemplate(template: string, ctx: TemplateContext): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, rawKey: string) => {
    const key = rawKey.trim()
    const resolved = resolveVariable(key, ctx)
    return resolved ?? `{{${key}}}`
  })
}

function resolveVariable(key: string, ctx: TemplateContext): string | null {
  if (key.startsWith('task.')) return resolveTaskVar(key.slice(5), ctx)
  if (key.startsWith('space.')) return resolveSpaceVar(key.slice(6), ctx)
  if (key.startsWith('mission.')) return resolveMissionVar(key.slice(8), ctx)
  if (key.startsWith('trigger.')) return resolveRecordPath(ctx.event, key.slice(8))
  if (key.startsWith('steps.')) return resolveStepVar(key.slice(6), ctx)
  if (key.startsWith('run.')) {
    const field = key.slice(4)
    if (field === 'review_feedback') {
      const val = resolveRecordPath(ctx.run, field)
      return val ?? ''
    }
    return resolveRecordPath(ctx.run, field)
  }
  return null
}

function resolveStepVar(path: string, ctx: TemplateContext): string | null {
  const [idxRaw, ...rest] = path.split('.')
  const index = Number(idxRaw)
  if (!Number.isInteger(index) || index < 0) return null
  const stepIndex = index === 0 ? 0 : index - 1
  const step = ctx.steps?.[stepIndex]
  if (!step) return null
  const fieldPath = rest.join('.')
  if (fieldPath === 'output') {
    const fromStep = resolveRecordPath(step, 'output')
    if (fromStep) return fromStep
    if (step.type === 'send_to_agent') return resolveMissionVar('output', ctx)
  }
  return resolveRecordPath(step, fieldPath)
}

function resolveRecordPath(record: unknown, path: string): string | null {
  if (!record || typeof record !== 'object' || !path) return null
  let current: unknown = record
  for (const part of path.split('.')) {
    if (!current || typeof current !== 'object') return null
    current = (current as Record<string, unknown>)[part]
  }
  if (current == null) return null
  if (typeof current === 'object') return JSON.stringify(current)
  return String(current)
}

function resolveTaskVar(field: string, ctx: TemplateContext): string | null {
  const item = ctx.item
  if (field === 'description') {
    const custom = (item.custom_data ?? {}) as Record<string, unknown>
    const val = item.description ?? (custom._view_type === 'doc' ? item.doc_body : item.notes)
    if (val == null) return null
    return String(val)
  }
  if (field === 'subtasks') return formatSubtasks(ctx.subtasks)
  if (field === 'deliverables') return formatDeliverables(ctx.deliverables)
  if (field === 'activity') return formatActivity(ctx.activity)

  if (field === 'assignee') {
    const assignees = Array.isArray(item.assignees) ? item.assignees : []
    if (assignees.length > 0) {
      return assignees
        .map((assignee) => {
          if (!assignee || typeof assignee !== 'object') return null
          const id = (assignee as Record<string, unknown>).id
          if (typeof id !== 'string' || !id) return null
          const member = ctx.roster?.find((r) => r.id === id)
          return member?.display_name ?? member?.email ?? id
        })
        .filter(Boolean)
        .join(', ')
    }
    const id = item.assignee_id as string | null
    if (!id) return 'Unassigned'
    const member = ctx.roster?.find((r) => r.id === id)
    return member?.display_name ?? member?.email ?? id
  }

  if (field.startsWith('custom.')) {
    const customField = field.slice(7)
    const customData = (item.custom_data ?? {}) as Record<string, unknown>
    const val = customData[customField]
    return val != null ? String(val) : null
  }

  const val = item[field]
  if (val == null) return null
  if (val instanceof Date) return val.toISOString()
  return String(val)
}

function resolveSpaceVar(field: string, ctx: TemplateContext): string | null {
  const val = ctx.space[field]
  return val != null ? String(val) : null
}

function resolveMissionVar(field: string, ctx: TemplateContext): string | null {
  if (!ctx.mission) return null

  if (field === 'deliverables') return formatDeliverables(ctx.deliverables)

  const val = ctx.mission[field]
  if (val == null) return null
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function formatSubtasks(subtasks?: Record<string, unknown>[]): string {
  if (!subtasks?.length) return '(none)'
  return subtasks
    .map((s, i) => `${i + 1}. [${s.status ?? 'todo'}] ${s.title ?? '(untitled)'}`)
    .join('\n')
}

function formatDeliverables(deliverables?: Record<string, unknown>[]): string {
  if (!deliverables?.length) return '(none)'
  return deliverables
    .map((d) => {
      const title = d.title ?? d.file_name ?? '(untitled)'
      const url = d.file_url ?? ''
      return url ? `- ${title}: ${url}` : `- ${title}`
    })
    .join('\n')
}

function formatActivity(activity?: Record<string, unknown>[]): string {
  if (!activity?.length) return '(none)'
  return activity
    .slice(-20)
    .map((a) => {
      const payload = (a.payload ?? {}) as Record<string, unknown>
      return `[${a.event_type}] ${payload.message ?? JSON.stringify(payload)}`
    })
    .join('\n')
}
