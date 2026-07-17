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
    if (relatedSubtask.deliverable_id) ids.add(relatedSubtask.deliverable_id)
    const manifest = relatedSubtask.output?.artifact_manifest
    if (Array.isArray(manifest)) {
      for (const artifact of manifest) {
        if (!artifact || typeof artifact !== 'object') continue
        const row = artifact as Record<string, unknown>
        for (const key of ['deliverable_id', 'deliverableId']) {
          if (typeof row[key] === 'string') ids.add(row[key])
        }
      }
    }
  }

  return deliverables.filter((deliverable) => {
    const explicitlyLinked =
      ids.has(deliverable.id) ||
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

function normalizeWorkTitle(value: string): string {
  return value
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim()
    .toLocaleLowerCase()
}

export function getSubtaskLiveOutput(subtask: MissionSubtask): string | null {
  if (subtask.status !== 'in_progress') return null
  const output = subtask.execution_state?.partial_output
  return typeof output === 'string' && output.trim() ? output.trim() : null
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
