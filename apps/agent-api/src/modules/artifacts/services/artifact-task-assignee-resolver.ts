import type { SupabaseClient } from '@supabase/supabase-js'
import type { ArtifactTasksRepository } from '../repositories/artifact-tasks.repository'

const ASSIGNEE_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ASSIGNEE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type OrgHumanAssignee = {
  userId: string
  fullName: string | null
  email: string | null
}

function stringFromAssigneeHint(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function normalizeAssigneeLookup(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function profileFromMemberRow(row: Record<string, unknown>): Record<string, unknown> {
  const profile = row.profiles
  if (Array.isArray(profile)) {
    return (profile[0] && typeof profile[0] === 'object' ? profile[0] : {}) as Record<
      string,
      unknown
    >
  }
  return profile && typeof profile === 'object' ? (profile as Record<string, unknown>) : {}
}

function orgHumanAssigneeFromMemberRow(row: Record<string, unknown>): OrgHumanAssignee | null {
  const userId = stringFromAssigneeHint(row.user_id)
  if (!userId) return null
  const profile = profileFromMemberRow(row)
  return {
    userId,
    fullName: stringFromAssigneeHint(profile.full_name),
    email: stringFromAssigneeHint(profile.email),
  }
}

function uniqueHumanAssignees(rows: OrgHumanAssignee[]): OrgHumanAssignee[] {
  const byUserId = new Map<string, OrgHumanAssignee>()
  for (const row of rows) {
    if (!byUserId.has(row.userId)) byUserId.set(row.userId, row)
  }
  return [...byUserId.values()]
}

function matchingHumanAssignees(
  rows: OrgHumanAssignee[],
  lookup: string,
  mode: 'email' | 'name',
): OrgHumanAssignee[] {
  const normalizedLookup = normalizeAssigneeLookup(lookup)
  const exact = rows.filter((row) => {
    if (mode === 'email') return normalizeAssigneeLookup(row.email ?? '') === normalizedLookup
    return normalizeAssigneeLookup(row.fullName ?? '') === normalizedLookup
  })
  if (exact.length > 0 || mode === 'email') return uniqueHumanAssignees(exact)

  return uniqueHumanAssignees(
    rows.filter((row) => {
      const normalizedName = normalizeAssigneeLookup(row.fullName ?? '')
      if (!normalizedName) return false
      return (
        normalizedName.startsWith(`${normalizedLookup} `) ||
        normalizedName.split(' ').includes(normalizedLookup)
      )
    }),
  )
}

async function loadActiveOrgHumanAssignees(
  tasksRepository: ArtifactTasksRepository,
  supabase: SupabaseClient,
  orgId: string,
): Promise<OrgHumanAssignee[]> {
  const { data, error } = await tasksRepository.listActiveOrgMemberProfiles(supabase, orgId)
  if (error) throw error
  return ((data ?? []) as Record<string, unknown>[])
    .map((row) => orgHumanAssigneeFromMemberRow(row))
    .filter((row): row is OrgHumanAssignee => Boolean(row))
}

async function loadCurrentUserAssignee(
  tasksRepository: ArtifactTasksRepository,
  supabase: SupabaseClient,
  userId: string,
): Promise<OrgHumanAssignee> {
  const { data } = await tasksRepository.findProfile(supabase, userId)
  const profile = (data ?? {}) as Record<string, unknown>
  return {
    userId,
    fullName: stringFromAssigneeHint(profile.full_name),
    email: stringFromAssigneeHint(profile.email),
  }
}

async function resolveHumanAssigneeFromHints(
  tasksRepository: ArtifactTasksRepository,
  supabase: SupabaseClient,
  userId: string,
  orgId: string | null,
  lookup: { id?: string | null; email?: string | null; name?: string | null },
): Promise<{ userId?: string; error?: string }> {
  if (lookup.id) {
    if (!ASSIGNEE_UUID_RE.test(lookup.id)) {
      return {
        error:
          'Human assignee_id must be a user UUID. Use assignee_name or assignee_email when assigning by name.',
      }
    }
    if (!orgId) {
      return lookup.id === userId
        ? { userId }
        : { error: 'Personal task assignees can only be the current user.' }
    }
    const { data } = await tasksRepository.findActiveOrgMember(supabase, {
      orgId,
      userId: lookup.id,
    })
    return data
      ? { userId: lookup.id }
      : {
          error:
            'Human assignee_id does not match an active organization member. Use an active organization member name, email, or user ID.',
        }
  }

  const assigneeLabel = lookup.email ?? lookup.name ?? ''
  if (!assigneeLabel) {
    return {
      error: 'Human assignee requires assignee_id, assignee_name, or assignee_email.',
    }
  }

  const mode = lookup.email ? 'email' : 'name'
  const candidates = orgId
    ? await loadActiveOrgHumanAssignees(tasksRepository, supabase, orgId)
    : [await loadCurrentUserAssignee(tasksRepository, supabase, userId)]
  const matches = matchingHumanAssignees(candidates, assigneeLabel, mode)
  if (matches.length === 1) return { userId: matches[0].userId }
  if (matches.length > 1) {
    return {
      error: `Multiple active organization members matched assignee "${assigneeLabel}". Use assignee_email or assignee_id.`,
    }
  }
  return orgId
    ? {
        error: `No active organization member matched assignee "${assigneeLabel}". Use an active organization member name, email, or user ID.`,
      }
    : {
        error:
          'Personal task assignees can only resolve to the current user. Use an organization workspace to assign another person.',
      }
}

export async function resolveAgentAssigneePayload(
  tasksRepository: ArtifactTasksRepository,
  supabase: SupabaseClient,
  userId: string,
  orgId: string | null,
  input: Record<string, unknown>,
  payload: Record<string, unknown>,
): Promise<string | null> {
  if (payload.assignee_type === 'unassigned') {
    payload.assignee_id = null
    return null
  }
  if (payload.assignee_type === 'agent') return null

  const providedType = stringFromAssigneeHint(input.assignee_type)?.toLowerCase() ?? null
  const explicitlyHuman = payload.assignee_type === 'human' || providedType === 'human'
  let assigneeId =
    stringFromAssigneeHint(input.assignee_id) ?? stringFromAssigneeHint(input.assignee_user_id)
  let assigneeEmail = stringFromAssigneeHint(input.assignee_email)
  let assigneeName = stringFromAssigneeHint(input.assignee_name)
  const genericAssignee = stringFromAssigneeHint(input.assignee)

  if (genericAssignee && !assigneeId && !assigneeEmail && !assigneeName) {
    if (ASSIGNEE_UUID_RE.test(genericAssignee)) assigneeId = genericAssignee
    else if (ASSIGNEE_EMAIL_RE.test(genericAssignee)) assigneeEmail = genericAssignee
    else assigneeName = genericAssignee
  }

  if (
    explicitlyHuman &&
    assigneeId &&
    !ASSIGNEE_UUID_RE.test(assigneeId) &&
    !assigneeEmail &&
    !assigneeName
  ) {
    if (ASSIGNEE_EMAIL_RE.test(assigneeId)) assigneeEmail = assigneeId
    else assigneeName = assigneeId
    assigneeId = null
  }

  const wantsHuman =
    explicitlyHuman ||
    Boolean(assigneeEmail || assigneeName) ||
    Boolean(assigneeId && ASSIGNEE_UUID_RE.test(assigneeId))
  if (!wantsHuman) return null

  const resolved = await resolveHumanAssigneeFromHints(tasksRepository, supabase, userId, orgId, {
    id: assigneeId,
    email: assigneeEmail,
    name: assigneeName,
  })
  if (resolved.error) return resolved.error

  payload.assignee_type = 'human'
  payload.assignee_id = resolved.userId ?? null
  return null
}
