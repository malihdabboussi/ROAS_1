import type { SupabaseClient } from '@supabase/supabase-js'
import type { SpaceItemsRepository } from '../repositories/space-items.repository'

type Assignee = { type: 'human' | 'agent'; id: string }
type AssigneeType = 'human' | 'agent' | 'unassigned'

interface MutableAssigneeFields {
  assignees?: Assignee[]
  assignee_type?: AssigneeType
  assignee_id?: string | null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Strips human assignees whose `id` is not a UUID matching an active org_member
 * (org context) or the caller themselves (personal context).
 *
 * Used as a safety net so automations, API writes, and agent writes cannot
 * persist an email string or stale user id as `assignee_id`.
 *
 * Mutates the provided fields in place and keeps `assignee_type`/`assignee_id`
 * consistent with the resulting primary assignee.
 */
export async function sanitizeAssigneesForWrite(
  repository: Pick<SpaceItemsRepository, 'findActiveOrgMemberUserIds'>,
  supabase: SupabaseClient,
  userId: string,
  orgId: string | null | undefined,
  fields: MutableAssigneeFields,
): Promise<void> {
  const candidates: string[] = []
  if (Array.isArray(fields.assignees)) {
    for (const a of fields.assignees) if (a && a.type === 'human') candidates.push(a.id)
  }
  if (fields.assignee_type === 'human' && typeof fields.assignee_id === 'string') {
    candidates.push(fields.assignee_id)
  }
  if (candidates.length === 0) return

  const validIds = await resolveValidHumanIds(
    repository,
    supabase,
    userId,
    orgId ?? null,
    candidates,
  )

  if (Array.isArray(fields.assignees)) {
    const filtered = fields.assignees.filter((a) => !a || a.type !== 'human' || validIds.has(a.id))
    fields.assignees = filtered
    const primary = filtered[0] ?? null
    fields.assignee_type = primary?.type ?? 'unassigned'
    fields.assignee_id = primary?.id ?? null
    return
  }

  if (
    fields.assignee_type === 'human' &&
    typeof fields.assignee_id === 'string' &&
    !validIds.has(fields.assignee_id)
  ) {
    fields.assignee_type = 'unassigned'
    fields.assignee_id = null
  }
}

async function resolveValidHumanIds(
  repository: Pick<SpaceItemsRepository, 'findActiveOrgMemberUserIds'>,
  supabase: SupabaseClient,
  userId: string,
  orgId: string | null,
  ids: string[],
): Promise<Set<string>> {
  const wellFormed = [...new Set(ids.filter((id) => UUID_RE.test(id)))]
  if (wellFormed.length === 0) return new Set()
  if (orgId) {
    const activeUserIds = await repository.findActiveOrgMemberUserIds(supabase, orgId, wellFormed)
    return new Set(activeUserIds)
  }
  return new Set(wellFormed.filter((id) => id === userId))
}
