const TEXT_PREVIEW_LIMIT = 300

export interface ActivityInsert {
  item_id: string
  space_id: string
  user_id: string
  org_id: string | null
  event_type: string
  payload: Record<string, unknown>
  actor_kind?: 'user' | 'agent' | 'automation' | 'system'
  agent_message_id?: string | null
  tool_call_id?: string | null
  snapshot?: Record<string, unknown> | null
}

interface ActivityBase {
  item_id: string
  space_id: string
  user_id: string
  org_id: string | null
}

function truncateText(val: unknown): unknown {
  if (typeof val !== 'string' || val.length <= TEXT_PREVIEW_LIMIT) return val
  return val.slice(0, TEXT_PREVIEW_LIMIT)
}

/**
 * Computes activity rows for a PATCH on a space item.
 * One row per meaningful field change; returns an empty array when nothing changed.
 */
export function diffUpdateActivity(
  oldItem: Record<string, unknown>,
  dto: Record<string, unknown>,
  base: ActivityBase,
): ActivityInsert[] {
  const entries: ActivityInsert[] = []
  const push = (event_type: string, payload: Record<string, unknown>) =>
    entries.push({ ...base, event_type, payload })

  if (dto.status !== undefined && dto.status !== oldItem.status) {
    push('status_change', { from: String(oldItem.status ?? ''), to: String(dto.status) })
  }

  if (
    (dto.assignee_type !== undefined && dto.assignee_type !== oldItem.assignee_type) ||
    (dto.assignee_id !== undefined && dto.assignee_id !== oldItem.assignee_id) ||
    (dto.assignees !== undefined &&
      JSON.stringify(dto.assignees) !== JSON.stringify(oldItem.assignees ?? []))
  ) {
    push('assignee_change', {
      from: oldItem.assignees ?? [
        { type: oldItem.assignee_type ?? null, id: oldItem.assignee_id ?? null },
      ],
      to: {
        assignees: dto.assignees ?? oldItem.assignees ?? [],
        primary: {
          type: dto.assignee_type ?? oldItem.assignee_type ?? null,
          id: dto.assignee_id ?? oldItem.assignee_id ?? null,
        },
      },
    })
  }

  const scalarFields = [
    'title',
    'priority',
    'start_date',
    'due_date',
    'sort_order',
    'parent_item_id',
  ] as const
  for (const field of scalarFields) {
    if (dto[field] !== undefined && JSON.stringify(dto[field]) !== JSON.stringify(oldItem[field])) {
      push('field_change', { field, from: oldItem[field] ?? null, to: dto[field] ?? null })
    }
  }

  if (dto.notes !== undefined && dto.notes !== oldItem.notes) {
    push('field_change', {
      field: 'notes',
      from: truncateText(oldItem.notes),
      to: truncateText(dto.notes),
    })
  }

  if (dto.doc_body !== undefined && dto.doc_body !== oldItem.doc_body) {
    push('field_change', {
      field: 'doc_body',
      from: truncateText(oldItem.doc_body),
      to: truncateText(dto.doc_body),
    })
  }

  if (dto.description !== undefined && dto.description !== oldItem.description) {
    push('field_change', {
      field: 'description',
      from: truncateText(oldItem.description),
      to: truncateText(dto.description),
    })
  }

  if (
    dto.recurrence !== undefined &&
    JSON.stringify(dto.recurrence) !== JSON.stringify(oldItem.recurrence)
  ) {
    push('field_change', {
      field: 'recurrence',
      from: oldItem.recurrence ?? null,
      to: dto.recurrence ?? null,
    })
  }

  if (dto.custom_data !== undefined) {
    const oldCustom = (oldItem.custom_data ?? {}) as Record<string, unknown>
    for (const [key, val] of Object.entries((dto.custom_data ?? {}) as Record<string, unknown>)) {
      const oldVal = oldCustom[key]
      if (JSON.stringify(oldVal) !== JSON.stringify(val)) {
        push('field_change', { field: key, from: oldVal ?? null, to: val ?? null })
      }
    }
  }

  return entries
}
