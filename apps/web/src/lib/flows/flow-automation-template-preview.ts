/**
 * Client-side preview of automation prompt templates (mirrors backend space-automation-template.ts).
 */

export interface FlowTemplateContext {
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

export function renderFlowAutomationTemplate(
  template: string,
  ctx: FlowTemplateContext,
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, rawKey: string) => {
    const key = rawKey.trim()
    const resolved = resolveVariable(key, ctx)
    return resolved ?? `{{${key}}}`
  })
}

function resolveVariable(key: string, ctx: FlowTemplateContext): string | null {
  if (key.startsWith('task.')) return resolveTaskVar(key.slice(5), ctx)
  if (key.startsWith('space.')) return resolveSpaceVar(key.slice(6), ctx)
  if (key.startsWith('mission.')) return resolveMissionVar(key.slice(8), ctx)
  if (key.startsWith('trigger.')) return resolveRecordPath(ctx.event, key.slice(8))
  if (key.startsWith('steps.')) return resolveStepVar(key.slice(6), ctx)
  if (key.startsWith('run.')) return resolveRecordPath(ctx.run, key.slice(4))
  return null
}

function resolveStepVar(path: string, ctx: FlowTemplateContext): string | null {
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

function resolveTaskVar(field: string, ctx: FlowTemplateContext): string | null {
  const item = ctx.item
  if (field === 'description') {
    const custom = (item.custom_data ?? {}) as Record<string, unknown>
    const val = item.description ?? (custom._view_type === 'doc' ? item.doc_body : item.notes)
    if (val == null) return null
    return String(val)
  }
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
  return String(val)
}

function resolveSpaceVar(field: string, ctx: FlowTemplateContext): string | null {
  const val = ctx.space[field]
  return val != null ? String(val) : null
}

function resolveMissionVar(field: string, ctx: FlowTemplateContext): string | null {
  if (!ctx.mission) return null
  const val = ctx.mission[field]
  if (val == null) return null
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}
