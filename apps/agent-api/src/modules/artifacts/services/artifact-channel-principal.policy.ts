import { PERSONAL_BRAIN_POLICY_ACTIONS } from './artifact-access-policy-actions'

export function authorizeChannelPrincipalAction(input: {
  target: Record<string, any>
  action: string
  data: Record<string, unknown>
  sessionKey?: string
}): { allowed: boolean; reason?: string } {
  if (!targetsPersonalBrain(input.action, input.data) || !input.sessionKey) {
    return { allowed: true }
  }
  const conversationId = input.target.parseConversationId(input.sessionKey)
  const requestContext = conversationId ? input.target.requestContext?.get(conversationId) : null
  if (
    requestContext?.channel === 'slack' &&
    requestContext.channelMember?.personal_brain_access !== true
  ) {
    return {
      allowed: false,
      reason: 'Personal Brain access is unavailable for this Slack user.',
    }
  }
  return { allowed: true }
}

function targetsPersonalBrain(action: string, data: Record<string, unknown>): boolean {
  if (PERSONAL_BRAIN_POLICY_ACTIONS.has(action)) return true
  if (action === 'atlas_save_brain_context') {
    return (
      String(data.target_brain ?? data.targetBrain ?? '')
        .trim()
        .toLowerCase() === 'user'
    )
  }
  if (action === 'search_brain_context') {
    const families = data.families
    return (
      !Array.isArray(families) ||
      families.some((family) => String(family).trim().toLowerCase() === 'user')
    )
  }
  if (action === 'get_brain_stats') {
    return (
      String(data.scope ?? 'user')
        .trim()
        .toLowerCase() !== 'agent'
    )
  }
  const brainType = String(data.brain_type ?? '')
    .trim()
    .toLowerCase()
  if (brainType === 'user' || brainType === 'user_default' || brainType === 'personal') {
    return true
  }
  return [data.source_scope, data.target_scope].some(
    (scope) =>
      scope !== null &&
      typeof scope === 'object' &&
      String((scope as Record<string, unknown>).type ?? '')
        .trim()
        .toLowerCase() === 'user',
  )
}
