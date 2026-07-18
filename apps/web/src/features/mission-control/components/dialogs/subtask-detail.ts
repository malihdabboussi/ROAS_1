import type { MissionDeliverable, MissionLog, MissionSubtask } from '../../types'

export interface SubtaskResourceLink {
  url: string
  label: string
}

export function buildSubtaskScopedMessage(subtask: MissionSubtask, message: string): string {
  return [`Guidance for subtask "${subtask.title}" (${subtask.id}):`, message.trim()].join('\n')
}

export function filterSubtaskLogs(logs: MissionLog[], subtask: MissionSubtask): MissionLog[] {
  return logs.filter((log) => {
    const payload = (log.payload ?? {}) as Record<string, unknown>
    if (payload.subtask_id === subtask.id) return true
    if (log.event_type !== 'user.comment') return false
    const message = typeof payload.message === 'string' ? payload.message : ''
    return message.includes(subtask.id) || message.includes(subtask.title)
  })
}

export function filterSubtaskDeliverables(
  deliverables: MissionDeliverable[],
  subtask: MissionSubtask,
  subtasks: MissionSubtask[] = [],
): MissionDeliverable[] {
  const relatedSubtasks =
    subtask.assignee_type === 'human'
      ? [subtask, ...collectDependencySubtasks(subtask, subtasks)]
      : [subtask]
  const ids = new Set<string>()
  const subtaskIds = new Set(relatedSubtasks.map((item) => item.id))

  for (const relatedSubtask of relatedSubtasks) {
    for (const id of collectSubtaskDeliverableIds(relatedSubtask)) ids.add(id)
  }

  return deliverables.filter((deliverable) => {
    if (isHumanApprovalReceipt(deliverable)) return false

    const explicitlyLinked =
      ids.has(deliverable.id) ||
      (typeof deliverable.entity_id === 'string' && ids.has(deliverable.entity_id)) ||
      (typeof deliverable.metadata?.subtask_id === 'string' &&
        subtaskIds.has(deliverable.metadata.subtask_id))
    if (explicitlyLinked) return true

    // Agent tools can create the document before the completion payload links it.
    // During that short finalization window, exact title + agent ownership is the safe live match.
    if (subtask.status !== 'in_progress' || subtask.assignee_type === 'human') return false
    if (!subtask.assigned_agent_key || deliverable.agent_key !== subtask.assigned_agent_key) {
      return false
    }
    return normalizeWorkTitle(deliverable.title) === normalizeWorkTitle(subtask.title)
  })
}

export function numberDeliverablesByTask(
  deliverables: MissionDeliverable[],
  subtasks: MissionSubtask[],
): MissionDeliverable[] {
  const orderedAgentTasks = subtasks
    .filter((subtask) => subtask.assignee_type !== 'human')
    .sort((a, b) => a.sort_order - b.sort_order)
  const taskNumberBySubtaskId = new Map(
    orderedAgentTasks.map((subtask, index) => [subtask.id, index + 1]),
  )
  const taskNumberByDeliverableId = new Map<string, number>()

  for (const subtask of orderedAgentTasks) {
    const taskNumber = taskNumberBySubtaskId.get(subtask.id)
    if (!taskNumber) continue
    for (const deliverableId of collectSubtaskDeliverableIds(subtask)) {
      taskNumberByDeliverableId.set(deliverableId, taskNumber)
    }
  }

  return deliverables.map((deliverable) => {
    const metadataSubtaskId =
      typeof deliverable.metadata?.subtask_id === 'string' ? deliverable.metadata.subtask_id : null
    const taskNumber =
      (metadataSubtaskId ? taskNumberBySubtaskId.get(metadataSubtaskId) : undefined) ??
      taskNumberByDeliverableId.get(deliverable.id)
    if (!taskNumber) return deliverable

    const title = (deliverable.title || 'Untitled').replace(/^Task\s*\d+\s*[—–-]\s*/i, '').trim()
    return { ...deliverable, title: `Task ${taskNumber} — ${title}` }
  })
}

function collectSubtaskDeliverableIds(subtask: MissionSubtask): Set<string> {
  const ids = new Set<string>()
  if (subtask.deliverable_id) ids.add(subtask.deliverable_id)

  const rows = [subtask.output?.artifact_manifest, subtask.execution_state?.completed_actions]
  for (const candidates of rows) {
    if (!Array.isArray(candidates)) continue
    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== 'object') continue
      const row = candidate as Record<string, unknown>
      for (const key of ['deliverable_id', 'deliverableId']) {
        if (typeof row[key] === 'string' && row[key]) ids.add(row[key])
      }
      collectDeliverableIdsFromToolResult(row.result_summary, ids)
    }
  }
  return ids
}

function collectDeliverableIdsFromToolResult(value: unknown, ids: Set<string>, depth = 0): void {
  if (depth > 8 || value == null) return
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return
    try {
      collectDeliverableIdsFromToolResult(JSON.parse(trimmed), ids, depth + 1)
    } catch {
      return
    }
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectDeliverableIdsFromToolResult(item, ids, depth + 1)
    return
  }
  if (typeof value !== 'object') return

  const record = value as Record<string, unknown>
  for (const key of ['deliverable_id', 'deliverableId']) {
    if (typeof record[key] === 'string' && record[key]) ids.add(record[key])
  }
  for (const key of ['content', 'text', 'details', 'data', 'result']) {
    collectDeliverableIdsFromToolResult(record[key], ids, depth + 1)
  }
}

/** Gate approve-with-summary receipts — not user-facing docs. */
export function isHumanApprovalReceipt(deliverable: MissionDeliverable): boolean {
  if (deliverable.metadata?.source !== 'human') return false
  if (deliverable.type !== 'doc' && deliverable.type !== 'text') return false
  if (deliverable.file_url) return false
  const files = deliverable.metadata?.files
  if (Array.isArray(files) && files.length > 0) return false
  const links = deliverable.metadata?.links
  if (Array.isArray(links) && links.length > 0) return false
  return true
}

export function filterMissionDeliverables(
  deliverables: MissionDeliverable[],
): MissionDeliverable[] {
  return deliverables.filter((deliverable) => !isHumanApprovalReceipt(deliverable))
}

function normalizeWorkTitle(value: string): string {
  return value
    .replace(/^task\s*\d+\s*[—–-]\s*/i, '')
    .replace(/^web#\s*\d+\s*[—–-]\s*/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim()
    .toLocaleLowerCase()
}

export function getSubtaskLiveOutput(subtask: MissionSubtask): string | null {
  if (subtask.status !== 'in_progress') return null
  const output = subtask.execution_state?.partial_output
  return typeof output === 'string' && output.trim() ? output.trim() : null
}

export type SubtaskOutputDisplay = {
  titleKey: 'agent' | 'human'
  body: string
}

/**
 * User-facing text from a finished subtask `output` blob.
 * Never surfaces internal keys (deliverable_id, artifact_manifest, etc.) as JSON.
 */
export function resolveSubtaskOutputDisplay(
  output: Record<string, unknown> | null | undefined,
): SubtaskOutputDisplay | null {
  if (!output || typeof output !== 'object') return null

  const content = typeof output.content === 'string' ? output.content.trim() : ''
  const summary = typeof output.summary === 'string' ? output.summary.trim() : ''
  const body = content || summary
  if (!body) return null

  return {
    titleKey: output.completed_by_human === true ? 'human' : 'agent',
    body,
  }
}

export function getSubtaskLiveStatusLabel(
  subtask: MissionSubtask,
  hasVisibleDeliverables: boolean,
): string {
  if (
    subtask.status === 'in_progress' &&
    subtask.execution_state?.execution_status === 'streaming' &&
    hasVisibleDeliverables
  ) {
    return 'Finalizing'
  }
  return subtask.status === 'in_progress' ? 'Working' : subtask.status
}

export function collectDependencySubtasks(
  subtask: MissionSubtask,
  subtasks: MissionSubtask[],
): MissionSubtask[] {
  const byId = new Map(subtasks.map((item) => [item.id, item]))
  const collected = new Set<string>()
  const visit = (id: string) => {
    if (collected.has(id)) return
    const dependency = byId.get(id)
    if (!dependency) return
    collected.add(id)
    for (const parentId of dependency.depends_on ?? []) visit(parentId)
  }
  for (const id of subtask.depends_on ?? []) visit(id)
  return subtasks.filter((item) => collected.has(item.id))
}

export function collectSubtaskResourceLinks(
  subtask: MissionSubtask,
  subtasks: MissionSubtask[],
  deliverables: MissionDeliverable[],
): SubtaskResourceLink[] {
  const links = new Map<string, string>()
  const addTextLinks = (value: unknown, label: string) => {
    if (typeof value === 'string') {
      for (const match of value.matchAll(/https?:\/\/[^\s<>()\]]+/g)) {
        const url = match[0].replace(/[.,;:!?]+$/, '')
        if (!links.has(url)) links.set(url, label)
      }
      return
    }
    if (Array.isArray(value)) {
      for (const item of value) addTextLinks(item, label)
      return
    }
    if (value && typeof value === 'object') {
      for (const child of Object.values(value as Record<string, unknown>)) {
        addTextLinks(child, label)
      }
    }
  }

  for (const item of [subtask, ...collectDependencySubtasks(subtask, subtasks)]) {
    addTextLinks(item.intent, item.title)
    addTextLinks(item.output, item.title)
  }
  for (const deliverable of deliverables) {
    if (deliverable.file_url && !links.has(deliverable.file_url)) {
      links.set(deliverable.file_url, deliverable.title)
    }
  }
  return [...links].map(([url, label]) => ({ url, label }))
}
