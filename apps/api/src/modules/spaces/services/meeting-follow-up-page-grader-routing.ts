import type { PageGraderClientScopeEntry } from '../../integrations/page-grader/services/page-grader-api.helpers'

export type PageGraderRoutingClient = { id: string; name: string }
export type PageGraderRoutingAssignee = { id: string; name: string; email: string | null }

const CLIENT_STOPWORDS = new Set([
  'agency',
  'client',
  'company',
  'group',
  'platform',
  'project',
  'strategy',
  'team',
  'the',
])

export function resolvePageGraderClientForFollowUp(input: {
  item: Record<string, unknown>
  clients: PageGraderRoutingClient[]
  scopeMap: Record<string, PageGraderClientScopeEntry>
  spaceId: string
  campaignId?: string | null
}): PageGraderRoutingClient | null {
  const explicitId = readExplicitPageGraderClientId(input.item)
  if (explicitId) {
    return input.clients.find((client) => client.id === explicitId) ?? null
  }

  const text = normalize(
    `${String(input.item.title ?? '')} ${String(input.item.description ?? '')} ${String(
      input.item.notes ?? '',
    )}`,
  )
  const textMatch = resolveUniqueClientTextMatch(text, input.clients)
  if (textMatch) return textMatch

  const mappedId = Object.entries(input.scopeMap).find(([, scope]) => {
    if (scope.space_id && scope.space_id === input.spaceId) return true
    return Boolean(input.campaignId && scope.campaign_id === input.campaignId)
  })?.[0]
  return mappedId ? (input.clients.find((client) => client.id === mappedId) ?? null) : null
}

export function resolvePageGraderAssigneeForFollowUp(
  ownerName: string | null,
  assignees: PageGraderRoutingAssignee[],
): PageGraderRoutingAssignee | null {
  const owner = normalize(ownerName ?? '')
  if (!owner) return null

  const exact = assignees.filter((assignee) => normalize(assignee.name) === owner)
  if (exact.length === 1) return exact[0] ?? null

  const ownerTokens = tokens(owner)
  const candidates = assignees.filter((assignee) => {
    const candidate = tokens(normalize(assignee.name))
    return ownerTokens.every((token) => candidate.includes(token))
  })
  if (candidates.length === 1) return candidates[0] ?? null

  const first = ownerTokens[0]
  if (!first) return null
  const firstNameMatches = assignees.filter(
    (assignee) => tokens(normalize(assignee.name))[0] === first,
  )
  return firstNameMatches.length === 1 ? (firstNameMatches[0] ?? null) : null
}

function resolveUniqueClientTextMatch(
  normalizedText: string,
  clients: PageGraderRoutingClient[],
): PageGraderRoutingClient | null {
  if (!normalizedText) return null

  const fullMatches = clients.filter((client) => {
    const name = normalize(client.name)
    return name.length >= 4 && normalizedText.includes(name)
  })
  if (fullMatches.length === 1) return fullMatches[0] ?? null

  const tokenFrequency = new Map<string, number>()
  const indexed = clients.map((client) => {
    const clientTokens = [
      ...new Set(tokens(normalize(client.name)).filter(isDistinctiveClientToken)),
    ]
    for (const token of clientTokens)
      tokenFrequency.set(token, (tokenFrequency.get(token) ?? 0) + 1)
    return { client, clientTokens }
  })
  const textTokens = new Set(tokens(normalizedText))
  const scored = indexed
    .map(({ client, clientTokens }) => ({
      client,
      score: clientTokens.filter(
        (token) => textTokens.has(token) && tokenFrequency.get(token) === 1,
      ).length,
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) return null
  if (scored.length > 1 && scored[0]?.score === scored[1]?.score) return null
  return scored[0]?.client ?? null
}

function readExplicitPageGraderClientId(item: Record<string, unknown>): string | null {
  const customData = asRecord(item.custom_data)
  const pageGrader = asRecord(customData.page_grader)
  const id = String(pageGrader.client_id ?? '').trim()
  return id || null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokens(value: string): string[] {
  return value.split(/\s+/).filter(Boolean)
}

function isDistinctiveClientToken(token: string): boolean {
  return token.length >= 4 && !CLIENT_STOPWORDS.has(token)
}
