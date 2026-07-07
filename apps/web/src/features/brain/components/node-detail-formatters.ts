import type { BrainMemory } from '../types'

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function sourceHrefFromRetrieveVia(
  retrieveVia: BrainMemory['retrieve_via'],
): string | null {
  const action = retrieveVia?.action
  const data = retrieveVia?.data ?? {}
  if (action === 'read_space_document') {
    const spaceId = typeof data.space_id === 'string' ? data.space_id : null
    const documentId = typeof data.document_id === 'string' ? data.document_id : null
    return spaceId && documentId ? `/spaces/${spaceId}/${documentId}` : null
  }
  if (action === 'get_task') {
    const spaceId = typeof data.space_id === 'string' ? data.space_id : null
    const taskId = typeof data.task_id === 'string' ? data.task_id : null
    return spaceId && taskId ? `/spaces/${spaceId}/${taskId}` : null
  }
  if (action === 'get_mission') {
    const missionId = typeof data.mission_id === 'string' ? data.mission_id : null
    return missionId ? `/home?mission=${encodeURIComponent(missionId)}` : null
  }
  if (action === 'get_mission_deliverables') {
    const missionId = typeof data.mission_id === 'string' ? data.mission_id : null
    return missionId ? `/home?mission=${encodeURIComponent(missionId)}` : null
  }
  return null
}

export function formatOptionalDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const timestamp = new Date(iso).getTime()
  if (Number.isNaN(timestamp)) return null
  return formatDate(iso)
}

function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  const formattedStart = formatOptionalDate(start)
  const formattedEnd = formatOptionalDate(end)
  if (formattedStart && formattedEnd && formattedStart !== formattedEnd) {
    return `${formattedStart} - ${formattedEnd}`
  }
  return formattedStart ?? formattedEnd
}

export function temporalRows(node: BrainMemory): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = []
  const happened = formatDateRange(
    node.occurred_at ?? node.evidence_started_at,
    node.occurred_until ?? node.evidence_ended_at,
  )
  const learned = formatOptionalDate(node.asserted_at ?? node.created_at)
  const valid = formatDateRange(
    node.valid_from ?? node.effective_from,
    node.valid_until ?? node.effective_until,
  )
  if (happened) rows.push({ label: 'Happened', value: happened })
  if (learned) rows.push({ label: 'Learned', value: learned })
  if (valid) rows.push({ label: 'Valid', value: valid })
  else if (node.temporal_status) rows.push({ label: 'Status', value: node.temporal_status })
  return rows
}

export function shortHash(hash: string | null | undefined): string | null {
  if (!hash) return null
  return hash.length > 12 ? `${hash.slice(0, 12)}...` : hash
}

export function parentLabel(
  parentType: string | null | undefined,
  parentId: string | null | undefined,
): string | null {
  if (!parentType && !parentId) return null
  if (!parentId) return parentType ?? null
  if (!parentType) return parentId
  return `${parentType} · ${parentId}`
}
