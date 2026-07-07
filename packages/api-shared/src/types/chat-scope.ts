export const CHAT_SCOPE_KINDS = [
  'personal',
  'campaign',
  'shared_space',
  'channel',
  'mission',
  'unknown',
] as const

export type ChatScopeKind = (typeof CHAT_SCOPE_KINDS)[number]

export interface ChatScope {
  space_id: string | null
  campaign_id: string | null
  scope_kind: ChatScopeKind
  org_id: string | null
}

export function normalizeChatScopeKind(value: unknown): ChatScopeKind {
  return CHAT_SCOPE_KINDS.includes(value as ChatScopeKind) ? (value as ChatScopeKind) : 'unknown'
}

export function normalizeScopeId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function createChatScope(input: {
  space_id?: unknown
  campaign_id?: unknown
  scope_kind?: unknown
  org_id?: unknown
}): ChatScope {
  return {
    space_id: normalizeScopeId(input.space_id),
    campaign_id: normalizeScopeId(input.campaign_id),
    scope_kind: normalizeChatScopeKind(input.scope_kind),
    org_id: normalizeScopeId(input.org_id),
  }
}

export function scopesEqual(a: ChatScope | null | undefined, b: ChatScope | null | undefined) {
  if (!a || !b) return false
  return a.space_id === b.space_id && a.campaign_id === b.campaign_id && a.org_id === b.org_id
}

export function describeScope(scope: ChatScope): string {
  const label =
    scope.scope_kind === 'personal'
      ? 'personal space'
      : scope.scope_kind === 'campaign'
        ? 'campaign space'
        : scope.scope_kind === 'shared_space'
          ? 'shared space'
          : scope.scope_kind
  return `${label} (space_id=${scope.space_id ?? 'none'}, campaign_id=${scope.campaign_id ?? 'none'})`
}
