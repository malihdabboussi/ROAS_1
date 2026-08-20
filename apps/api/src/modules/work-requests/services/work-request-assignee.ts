export type WorkRequestTeamMember = {
  id: string
  name: string
  email?: string | null
  source?: 'portal' | 'org'
}

export type WorkRequestAssigneeIdentity = {
  name: string | null
  email: string | null
  pageGraderUserId: string | null
  orgUserId: string | null
  source: 'portal' | 'org' | 'free_text' | null
}

export type WorkRequestAssigneeInput = {
  assignee_name?: string | null
  assignee_id?: string | null
  assignee_email?: string | null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isAssigneeEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

export type OrgAssigneeProfile = { id: string; full_name: string | null; email?: string | null }

function normalize(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, ' ').toLowerCase() ?? ''
}

function nameTokens(value: string | null | undefined): string[] {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function namesShareIdentityTokens(query: string[], candidate: string[]): boolean {
  if (query.length === 0 || candidate.length === 0) return false
  return query.every((token) => candidate.includes(token)) || candidate.every((token) => query.includes(token))
}

/** Unique roster match: exact name, or tokens are a unique subset either way. */
export function findUniqueWorkRequestTeamMemberByName(
  teamMembers: WorkRequestTeamMember[],
  name: string,
): WorkRequestTeamMember | undefined {
  const requested = name.trim()
  if (!requested || isAssigneeEmail(requested)) return undefined
  const exact = teamMembers.filter((member) => normalize(member.name) === normalize(requested))
  if (exact.length === 1) return exact[0]
  const tokens = nameTokens(requested)
  if (tokens.length === 0) return undefined
  const compatible = teamMembers.filter((member) => namesShareIdentityTokens(tokens, nameTokens(member.name)))
  return compatible.length === 1 ? compatible[0] : undefined
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function memberEmail(member: WorkRequestTeamMember): string {
  return normalize(member.email ?? '')
}

function identityFromMember(member: WorkRequestTeamMember): WorkRequestAssigneeIdentity {
  const source = member.source === 'org' ? 'org' : 'portal'
  return {
    name: member.name.trim() || null,
    email: stringOrNull(member.email),
    pageGraderUserId: source === 'portal' ? member.id : null,
    orgUserId: source === 'org' ? member.id : null,
    source,
  }
}

export function resolveUniqueAssigneeProfileId(
  profiles: OrgAssigneeProfile[],
  requestedName: string,
  requestedEmail?: string | null,
) {
  const email = normalize(requestedEmail)
  if (email) {
    const emailMatches = profiles.filter((profile) => normalize(profile.email) === email)
    if (emailMatches.length === 1) return emailMatches[0]?.id ?? null
    if (emailMatches.length > 1) return null
  }
  const requested = normalize(requestedName)
  if (!requested) return null
  const exact = profiles.filter((profile) => normalize(profile.full_name) === requested)
  if (exact.length === 1) return exact[0]?.id ?? null
  if (exact.length > 1) return null
  if (requested.includes('@')) return null

  const tokens = nameTokens(requested)
  if (tokens.length === 0) return null
  const compatible = profiles.filter((profile) =>
    namesShareIdentityTokens(tokens, nameTokens(profile.full_name)),
  )
  return compatible.length === 1 ? (compatible[0]?.id ?? null) : null
}

export function bindWorkRequestAssignee(
  input: WorkRequestAssigneeInput,
  teamMembers: WorkRequestTeamMember[],
): WorkRequestAssigneeIdentity {
  const id = input.assignee_id?.trim() || ''
  const name = input.assignee_name?.trim() || ''
  const emailHint = (
    input.assignee_email?.trim() || (isAssigneeEmail(name) ? name : '')
  ).toLowerCase()
  if (!id && !name && !emailHint) {
    return { name: null, email: null, pageGraderUserId: null, orgUserId: null, source: null }
  }

  const byId = id ? teamMembers.find((member) => member.id === id) : undefined
  const emailMatches = emailHint
    ? teamMembers.filter((member) => memberEmail(member) === emailHint)
    : []
  const uniqueEmail = emailMatches.length === 1 ? emailMatches[0] : undefined
  const uniqueName = name ? findUniqueWorkRequestTeamMemberByName(teamMembers, name) : undefined
  const member = byId ?? uniqueEmail ?? uniqueName
  if (member) return identityFromMember(member)

  if (UUID_RE.test(id)) {
    return {
      name: name || null,
      email: emailHint || null,
      pageGraderUserId: id,
      orgUserId: null,
      source: 'portal',
    }
  }

  return {
    name: name || null,
    email: emailHint || null,
    pageGraderUserId: null,
    orgUserId: null,
    source: name || emailHint ? 'free_text' : null,
  }
}

export function readWorkRequestAssignee(
  routing: unknown,
  fallbackName?: string | null,
): WorkRequestAssigneeIdentity {
  const raw = asRecord(asRecord(routing).assignee)
  const source =
    raw.source === 'portal' || raw.source === 'org' || raw.source === 'free_text'
      ? raw.source
      : null
  const name = stringOrNull(raw.name) ?? stringOrNull(fallbackName)
  const email = stringOrNull(raw.email)
  const pageGraderUserId = stringOrNull(raw.page_grader_user_id)
  const orgUserId = stringOrNull(raw.org_user_id)
  if (!name && !email && !pageGraderUserId && !orgUserId) {
    return bindWorkRequestAssignee({ assignee_name: fallbackName ?? null }, [])
  }
  return {
    name,
    email,
    pageGraderUserId,
    orgUserId,
    source: source ?? (pageGraderUserId ? 'portal' : orgUserId ? 'org' : name ? 'free_text' : null),
  }
}

export function resolveWorkRequestAssigneeIdentity(
  routing: unknown,
  fallbackName: string | null | undefined,
  teamMembers: WorkRequestTeamMember[],
): WorkRequestAssigneeIdentity {
  const stored = readWorkRequestAssignee(routing, fallbackName)
  if (stored.pageGraderUserId || stored.orgUserId) return stored
  const bound = bindWorkRequestAssignee(
    {
      assignee_name: stored.name ?? fallbackName ?? null,
      assignee_email: stored.email,
      assignee_id: stored.pageGraderUserId ?? stored.orgUserId,
    },
    teamMembers,
  )
  if (bound.pageGraderUserId || bound.orgUserId || bound.email) return bound
  return stored
}

export function stampWorkRequestAssignee(
  routing: Record<string, unknown>,
  identity: WorkRequestAssigneeIdentity,
): Record<string, unknown> {
  return {
    ...routing,
    assignee: identity.name
      ? {
          name: identity.name,
          email: identity.email,
          source: identity.source,
          page_grader_user_id: identity.pageGraderUserId,
          org_user_id: identity.orgUserId,
        }
      : null,
  }
}

export function pageGraderSendAssignee(identity: WorkRequestAssigneeIdentity): {
  page_grader_user_id?: string
  email?: string
  name?: string
} | null {
  if (!identity.pageGraderUserId && !identity.email && !identity.name) return null
  return {
    ...(identity.pageGraderUserId ? { page_grader_user_id: identity.pageGraderUserId } : {}),
    ...(identity.email ? { email: identity.email } : {}),
    ...(identity.name ? { name: identity.name } : {}),
  }
}

export async function bindCreatedWorkRequestAssignee(params: {
  draft: {
    id: string
    assignee_name: string | null
    routing: Record<string, unknown>
  }
  teamMembers: WorkRequestTeamMember[]
  updateDraft: (
    id: string,
    values: { routing: Record<string, unknown>; assignee_name: string | null },
  ) => Promise<{
    id: string
    assignee_name: string | null
    routing: Record<string, unknown>
  }>
}) {
  const { draft, teamMembers } = params
  if (!draft.assignee_name) return draft
  const identity = bindWorkRequestAssignee({ assignee_name: draft.assignee_name }, teamMembers)
  const routing = stampWorkRequestAssignee(asRecord(draft.routing), identity)
  const updated = await params.updateDraft(draft.id, {
    routing,
    assignee_name: identity.name,
  })
  draft.routing = updated?.routing ?? routing
  draft.assignee_name = updated?.assignee_name ?? identity.name
  return updated ?? draft
}

export async function assignWorkRequestFinalTask(params: {
  draft: {
    id: string
    owner_org_id: string | null
    assignee_name: string | null
    routing: Record<string, unknown>
    final_space_item_id: string | null
  }
  task: Record<string, unknown>
  teamMembers: WorkRequestTeamMember[]
  resolveOrgAssigneeByName: (
    orgId: string,
    name: string,
    email?: string | null,
  ) => Promise<string | null>
  assignTask: (taskId: string, userId: string) => Promise<Record<string, unknown>>
  updateDraft: (
    id: string,
    values: { routing: Record<string, unknown>; assignee_name: string | null },
  ) => Promise<unknown>
}): Promise<Record<string, unknown>> {
  const { draft, task, teamMembers } = params
  if (!draft.final_space_item_id) return task
  if (!draft.assignee_name && !asRecord(draft.routing).assignee) return task
  const identity = resolveWorkRequestAssigneeIdentity(
    draft.routing,
    draft.assignee_name,
    teamMembers,
  )
  draft.routing = stampWorkRequestAssignee(asRecord(draft.routing), identity)
  draft.assignee_name = identity.name
  await params.updateDraft(draft.id, {
    routing: draft.routing,
    assignee_name: identity.name,
  })
  if (!draft.owner_org_id || (!identity.name && !identity.email && !identity.orgUserId)) {
    return task
  }
  try {
    const assigneeId =
      identity.orgUserId ??
      (await params.resolveOrgAssigneeByName(
        draft.owner_org_id,
        identity.name ?? '',
        identity.email,
      ))
    if (!assigneeId || String(task.assignee_id ?? '') === assigneeId) return task
    return await params.assignTask(draft.final_space_item_id, assigneeId)
  } catch {
    return task
  }
}
