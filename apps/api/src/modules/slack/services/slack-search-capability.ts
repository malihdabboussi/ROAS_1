export type SlackSearchCapability = {
  mode: 'full_search' | 'historical_fallback' | 'reconnect_required'
  reconnectRecommended: boolean
}

export function getSlackSearchCapability(metadata: Record<string, unknown>): SlackSearchCapability {
  const userToken =
    typeof metadata.user_access_token === 'string' && metadata.user_access_token.trim()
  const scopes = typeof metadata.authed_user_scope === 'string' ? metadata.authed_user_scope : ''
  if (!userToken) return { mode: 'historical_fallback', reconnectRecommended: true }
  if (
    !scopes
      .split(',')
      .map((scope) => scope.trim())
      .includes('search:read')
  ) {
    return { mode: 'reconnect_required', reconnectRecommended: true }
  }
  return { mode: 'full_search', reconnectRecommended: false }
}
