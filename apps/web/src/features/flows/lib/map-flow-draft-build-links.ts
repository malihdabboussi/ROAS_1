import type { FlowAutomationSummary } from '../types/flow-automation.types'
import type { FlowBuildSessionLink, FlowDraftBuildLink } from '../types/flow-build-session-link.types'

function draftIdentityKeys(draft: FlowAutomationSummary): string[] {
  return [draft.id, draft.automation_id].filter((value): value is string => Boolean(value))
}

function sessionPointsToDraft(session: FlowBuildSessionLink, draft: FlowAutomationSummary) {
  const keys = new Set(draftIdentityKeys(draft))
  return (
    (session.automation_id != null && keys.has(session.automation_id)) ||
    (session.target_automation_id != null && keys.has(session.target_automation_id))
  )
}

function normalizeFlowLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^update\s+/i, '')
}

function labelsMatch(a: string, b: string) {
  const left = normalizeFlowLabel(a)
  const right = normalizeFlowLabel(b)
  if (!left || !right) return false
  if (left === right) return true
  return left.includes(right) || right.includes(left)
}

function sessionTargetBlocksDraft(
  session: FlowBuildSessionLink,
  draft: FlowAutomationSummary,
  drafts: FlowAutomationSummary[],
) {
  if (!session.target_automation_id) return false
  if (draftIdentityKeys(draft).includes(session.target_automation_id)) return false
  return drafts.some(
    (candidate) =>
      candidate.id !== draft.id &&
      draftIdentityKeys(candidate).includes(session.target_automation_id!),
  )
}

function sessionAutomationBlocksDraft(
  session: FlowBuildSessionLink,
  draft: FlowAutomationSummary,
  drafts: FlowAutomationSummary[],
) {
  if (!session.automation_id) return false
  if (draftIdentityKeys(draft).includes(session.automation_id)) return false
  return drafts.some(
    (candidate) =>
      candidate.id !== draft.id && draftIdentityKeys(candidate).includes(session.automation_id!),
  )
}

function sessionMatchesDraftName(
  session: FlowBuildSessionLink,
  draft: FlowAutomationSummary,
  drafts: FlowAutomationSummary[],
) {
  if (sessionAutomationBlocksDraft(session, draft, drafts)) return false
  if (sessionTargetBlocksDraft(session, draft, drafts)) return false

  const planName = session.plan_name?.trim()
  if (!planName) return false
  return labelsMatch(planName, draft.name)
}

function sessionsForDraft(
  draft: FlowAutomationSummary,
  sessions: FlowBuildSessionLink[],
  drafts: FlowAutomationSummary[],
) {
  return sessions.filter(
    (session) =>
      sessionPointsToDraft(session, draft) || sessionMatchesDraftName(session, draft, drafts),
  )
}

function pickPreferredBuildSession(sessions: FlowBuildSessionLink[]) {
  if (sessions.length === 0) return null

  const score = (session: FlowBuildSessionLink) => {
    let value = 0
    if (session.conversation_id) value += 4
    if (session.automation_id || session.target_automation_id) value += 2
    if (session.status !== 'intake') value += 1
    return value
  }

  return [...sessions].sort((left, right) => {
    const scoreDelta = score(right) - score(left)
    if (scoreDelta !== 0) return scoreDelta

    const leftUpdated = left.updated_at ? Date.parse(left.updated_at) : 0
    const rightUpdated = right.updated_at ? Date.parse(right.updated_at) : 0
    return rightUpdated - leftUpdated
  })[0]
}

export function resolveFlowDraftBuildLink(
  draft: FlowAutomationSummary,
  sessions: FlowBuildSessionLink[],
  drafts: FlowAutomationSummary[] = [],
): FlowDraftBuildLink {
  const session = pickPreferredBuildSession(sessionsForDraft(draft, sessions, drafts))

  return {
    sessionId: session?.id ?? null,
    conversationId: session?.conversation_id ?? null,
    draftFlowId: draft.id,
  }
}

export function findDraftForBuildSession(
  session: FlowBuildSessionLink,
  drafts: FlowAutomationSummary[],
): FlowAutomationSummary | null {
  return (
    drafts.find((draft) => sessionPointsToDraft(session, draft)) ??
    drafts.find((draft) => sessionMatchesDraftName(session, draft, drafts)) ??
    null
  )
}

export function mapFlowDraftBuildLinks(
  drafts: FlowAutomationSummary[],
  sessions: FlowBuildSessionLink[],
): Map<string, FlowDraftBuildLink> {
  const map = new Map<string, FlowDraftBuildLink>()

  for (const draft of drafts) {
    map.set(draft.id, resolveFlowDraftBuildLink(draft, sessions, drafts))
  }

  return map
}

function sessionsForFlow(
  flow: FlowAutomationSummary,
  sessions: FlowBuildSessionLink[],
  flows: FlowAutomationSummary[],
) {
  return sessions.filter(
    (session) =>
      sessionPointsToDraft(session, flow) || sessionMatchesDraftName(session, flow, flows),
  )
}

export function listOrphanFlowBuildSessions(
  drafts: FlowAutomationSummary[],
  sessions: FlowBuildSessionLink[],
  allFlows: FlowAutomationSummary[] = drafts,
): FlowBuildSessionLink[] {
  const linkedSessionIds = new Set<string>()
  for (const draft of drafts) {
    for (const session of sessionsForDraft(draft, sessions, drafts)) {
      linkedSessionIds.add(session.id)
    }
  }

  for (const flow of allFlows) {
    if (flow.is_draft) continue
    for (const session of sessionsForFlow(flow, sessions, allFlows)) {
      linkedSessionIds.add(session.id)
    }
  }

  return sessions.filter((session) => !linkedSessionIds.has(session.id))
}

export function findBuildSessionForConversation(
  conversationId: string | null | undefined,
  sessions: FlowBuildSessionLink[],
): FlowBuildSessionLink | null {
  if (!conversationId) return null
  return (
    pickPreferredBuildSession(
      sessions.filter((session) => session.conversation_id === conversationId),
    ) ?? null
  )
}

export type LoopChatLinkedFlow = {
  sessionId: string
  conversationId: string
  flowId: string | null
  flowName: string
  spaceId: string | null
}

export type LoopChatLinkUiState =
  | { kind: 'hidden' }
  | { kind: 'no-loop' }
  | { kind: 'open'; link: LoopChatLinkedFlow }

export function resolveLoopChatLinkUiState(input: {
  conversationId: string | null | undefined
  sessions: FlowBuildSessionLink[]
  drafts: FlowAutomationSummary[]
  flows: Array<{ id: string; name: string; automation_id?: string | null; space_id?: string }>
  planAutomationId?: string | null
  planName?: string | null
  preferredSessionId?: string | null
}): LoopChatLinkUiState {
  if (!input.conversationId) return { kind: 'hidden' }

  const session =
    input.preferredSessionId != null
      ? (input.sessions.find(
          (row) =>
            row.id === input.preferredSessionId && row.conversation_id === input.conversationId,
        ) ?? null)
      : null
  const resolvedSession = session ?? findBuildSessionForConversation(input.conversationId, input.sessions)
  if (!resolvedSession) return { kind: 'no-loop' }

  const link = resolveLoopChatLinkedFlow(input)
  if (!link?.flowId) return { kind: 'no-loop' }

  return { kind: 'open', link }
}

export function resolveLoopChatLinkedFlow(input: {
  conversationId: string | null | undefined
  sessions: FlowBuildSessionLink[]
  drafts: FlowAutomationSummary[]
  flows: Array<{ id: string; name: string; automation_id?: string | null }>
  planAutomationId?: string | null
  planName?: string | null
  preferredSessionId?: string | null
}): LoopChatLinkedFlow | null {
  const { conversationId, sessions, drafts, flows, planAutomationId, planName, preferredSessionId } =
    input
  if (!conversationId) return null

  let session =
    preferredSessionId != null
      ? (sessions.find(
          (row) => row.id === preferredSessionId && row.conversation_id === conversationId,
        ) ?? null)
      : null
  session ??= findBuildSessionForConversation(conversationId, sessions)
  if (!session) return null

  const matchedDraft = findDraftForBuildSession(session, drafts)
  const planMatchedDraft =
    planName != null
      ? drafts.find((draft) => labelsMatch(planName, draft.name))
      : null
  const flowId =
    session.automation_id ??
    session.target_automation_id ??
    matchedDraft?.id ??
    planMatchedDraft?.id ??
    planAutomationId ??
    null
  const flow =
    flowId != null
      ? (flows.find((row) => row.id === flowId || row.automation_id === flowId) ?? null)
      : null

  const flowName =
    flow?.name?.trim() ||
    matchedDraft?.name?.trim() ||
    planName?.trim() ||
    session.plan_name?.trim() ||
    'Linked flow'

  return {
    sessionId: session.id,
    conversationId,
    flowId,
    flowName,
    spaceId:
      flow && 'space_id' in flow && typeof flow.space_id === 'string'
        ? flow.space_id
        : (session.space_id ?? matchedDraft?.space_id ?? null),
  }
}
